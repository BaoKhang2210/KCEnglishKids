const { Progress, User, ActivityResult, Lesson, LearningSession } = require('../models');
const { getOrCreateSession } = require('../services/learningService');

// @desc    Get child learning progress summary and weak words
// @route   GET /api/children/:childId/progress
// @access  Private
const getChildProgress = async (req, res, next) => {
  try {
    // Route is mounted as /:childId/progress — accept legacy :id too
    const id = req.params.childId || req.params.id;

    const child = await User.findById(id).select('name avatar avatarUrl ageGroupCode');
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const progressList = await Progress.find({ child: id })
      .populate('topic', 'englishName vietnameseName icon colorCode')
      .populate('lesson', 'title vietnameseTitle difficulty')
      .populate('weakVocabulary.vocabulary', 'english vietnamese imageUrl audioUrl');

    // Aggregate statistics
    let totalStars = 0;
    let completedLessonsCount = 0;
    const weakWordsMap = {};

    progressList.forEach(item => {
      totalStars += item.stars || 0;
      if (item.completed) completedLessonsCount++;

      if (item.weakVocabulary && item.weakVocabulary.length > 0) {
        item.weakVocabulary.forEach(wv => {
          if (wv.vocabulary) {
            const vocabId = wv.vocabulary._id.toString();
            if (!weakWordsMap[vocabId]) {
              weakWordsMap[vocabId] = {
                vocabulary: wv.vocabulary,
                mistakeCount: wv.mistakeCount
              };
            } else {
              weakWordsMap[vocabId].mistakeCount += wv.mistakeCount;
            }
          }
        });
      }
    });

    const recentResults = await ActivityResult.find({ child: id })
      .populate('activity', 'title activityType')
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        child,
        totalStars,
        completedLessonsCount,
        progressList,
        weakVocabulary: Object.values(weakWordsMap),
        recentActivityResults: recentResults
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get one lesson's progress (3-stage pipeline state)
// @route   GET /api/children/:childId/progress/:lessonId
// @access  Private (own child)
const getLessonProgress = async (req, res, next) => {
  try {
    const { childId, lessonId } = req.params;
    const progress = await Progress.findOne({ child: childId, lesson: lessonId }).select(
      'completed stars highestScore attempts stage1Completed stage2Completed stage2Score stage2Stars'
    );
    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark Stage 1 (flashcards) or Stage 2 (practice studio) complete.
//          Stage 2 also pushes the real practice score into the active
//          LearningSession so points are never wasted (§1.3.1).
// @route   PUT /api/children/:childId/progress/:lessonId/stage
// @access  Private (own child)
const updateStageProgress = async (req, res, next) => {
  try {
    const { childId, lessonId } = req.params;
    const stage = Number(req.body.stage);
    if (![1, 2].includes(stage)) {
      return res.status(400).json({ success: false, message: 'stage must be 1 or 2.' });
    }

    const lesson = await Lesson.findById(lessonId).select('topic');
    if (!lesson) {
      return res.status(404).json({ success: false, message: 'Lesson not found.' });
    }

    const score = Math.max(0, Number(req.body.score) || 0);
    const stars = Math.min(3, Math.max(0, Number(req.body.stars) || 0));

    // Upsert on the unique {child, lesson} pair — Stage 2 keeps the best score
    const update = {
      $set: {
        child: childId,
        lesson: lessonId,
        topic: lesson.topic,
        lastActivityAt: new Date()
      }
    };
    if (stage === 1) {
      update.$set.stage1Completed = true;
    } else {
      update.$set.stage2Completed = true;
      update.$max = { stage2Score: score, stage2Stars: stars };
    }

    const progress = await Progress.findOneAndUpdate({ child: childId, lesson: lessonId }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    });

    // §1.3.1 — practice points must not be wasted: add them to the open session
    if (stage === 2 && (score > 0 || stars > 0)) {
      const session = await getOrCreateSession(childId, lessonId);
      session.totalScore = (session.totalScore || 0) + score;
      session.stars = Math.max(session.stars || 0, stars);
      await session.save();
    }

    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChildProgress,
  getLessonProgress,
  updateStageProgress
};
