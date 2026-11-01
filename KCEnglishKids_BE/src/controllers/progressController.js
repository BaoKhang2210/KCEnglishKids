const { Progress, User, ActivityResult } = require('../models');

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
      .populate('weakVocabulary.vocabulary', 'english vietnamese imageUrl audioUrl'),
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
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

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
        recentActivityResults: await require('../services/learningHistory').recentHistory(id,recentResults,5)
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
    res.status(200).json({ success: true, data: progress });
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
