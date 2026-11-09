const { Progress, User, ActivityResult, Lesson, Vocabulary } = require('../models');

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

    const [progressList, starLedger] = await Promise.all([Progress.find({ child: id })
      .populate('topic', 'englishName vietnameseName icon colorCode')
      .populate('lesson', 'title vietnameseTitle difficulty')
      .populate('weakVocabulary.vocabulary', 'english vietnamese imageUrl audioUrl')
      .sort({ lastActivityAt: -1, updatedAt: -1 }),
    require('../services/starLedgerService').computeStarLedger(id)]);

    // Aggregate statistics
    const weakWordsMap = {};

    progressList.forEach(item => {
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
      .populate('lesson', 'title vietnameseTitle')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        child,
        totalStars: starLedger.totalStars,
        completedLessonsCount: starLedger.completedLessons,
        maxStars: starLedger.maxStars,
        starLedger,
        progressList,
        weakVocabulary: Object.values(weakWordsMap),
        recentActivityResults: await require('../services/learningHistory').recentHistory(id,recentResults,25)
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
      'completed stars highestScore attempts stage1Completed stage2Completed stage2Score stage3Completed stage3Stars stage3Games'
    );
    if (!progress) return res.status(200).json({ success: true, data: progress });
    let stage2Report = null;
    let lesson = null;
    if (progress.stage2Completed) {
      lesson = await Lesson.findById(lessonId).select('ageGroupCode vocabularyItems').lean();
      const LearningEvent = require('../models/LearningEvent');
      const event = await LearningEvent.findOne({ child: childId, lesson: lessonId, stage: 2 }).sort({ createdAt: -1, _id: -1 }).lean();
      if (event?.stage2Report) {
        stage2Report = {
          ...event.stage2Report,
          starsBest: Math.min(3, Number(progress.stars) || 0),
          stageStars: {
            stage1: Number(Boolean(progress.stage1Completed)),
            stage2: Number(Boolean(progress.stage2Completed)),
            stage3: Number(Boolean(progress.stage3Completed || new Set(progress.stage3Games || []).size >= 2)),
          },
        };
      } else if (event?.answers?.length) {
        const { buildStage2Report } = require('../config/stage2Report');
        const words = await Vocabulary.find({ _id: { $in: lesson?.vocabularyItems || [] }, status: 'ACTIVE' }).select('english vietnamese imageUrl audioUrl').lean();
        stage2Report = buildStage2Report(event.answers, words, progress, 0);
        stage2Report.legacy = true;
      }
      if (stage2Report) {
        const vocabReview = require('../services/vocabReview');
        const snapshots = await vocabReview.getReviewSnapshots(
          childId,
          stage2Report.words.map((word) => word.wordId),
          lesson?.ageGroupCode || '4-5'
        );
        stage2Report = vocabReview.attachReview(stage2Report, snapshots);
      }
    }
    res.status(200).json({ success: true, data: { ...progress.toObject(), stage2Report } });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify learning evidence and reconcile canonical stage progress.
// @route   PUT /api/children/:childId/progress/:lessonId/stage
// @access  Private (own child)
const updateStageProgress = async (req, res, next) => {
  try {
    const { childId, lessonId } = req.params;
    await require('../services/childAccess').assertChildAccess(req, childId, true);
    const progress = await require('../services/stageLearning').completeStage(childId, lessonId, req.body);
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
