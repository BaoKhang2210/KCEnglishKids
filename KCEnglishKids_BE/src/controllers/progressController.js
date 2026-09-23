const { Progress, User, ActivityResult } = require('../models');

// @desc    Get child learning progress summary and weak words
// @route   GET /api/children/:id/progress
// @access  Private
const getChildProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

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

module.exports = {
  getChildProgress
};
