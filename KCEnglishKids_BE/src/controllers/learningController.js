const { LearningSession, ActivityResult } = require('../models');
const { getOrCreateSession, processActivityResult } = require('../services/learningService');

// @desc    Start or resume learning session
// @route   POST /api/learning/sessions
// @access  Private / Child
const startSession = async (req, res, next) => {
  try {
    const { childId, lessonId } = req.body;
    const effectiveChildId = req.user && req.user.role === 'CHILD' ? req.user._id : childId;

    if (!effectiveChildId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'childId and lessonId are required.'
      });
    }

    const session = await getOrCreateSession(effectiveChildId, lessonId);

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session details
// @route   GET /api/learning/sessions/:id
// @access  Private / Child
const getSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await LearningSession.findById(id)
      .populate('lesson', 'title topic ageGroupCode')
      .populate('completedActivities', 'title activityType');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Learning session not found.' });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit Activity Result & Calculate Stars/Progress
// @route   POST /api/learning/activity-results
// @access  Private / Child
const submitActivityResult = async (req, res, next) => {
  try {
    const { activityId, lessonId, sessionId, answers, duration } = req.body;
    const childId = req.user && req.user.role === 'CHILD' ? req.user._id : req.body.childId;

    if (!childId || !activityId || !lessonId) {
      return res.status(400).json({
        success: false,
        message: 'childId, activityId, and lessonId are required.'
      });
    }

    const result = await processActivityResult({
      childId,
      activityId,
      lessonId,
      sessionId,
      answers,
      duration
    });

    res.status(201).json({
      success: true,
      message: 'Activity result recorded successfully!',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startSession,
  getSession,
  submitActivityResult
};
