const { Activity } = require('../models');

// @desc    Get activity by ID
// @route   GET /api/activities/:id
// @access  Public / Child
const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findOne({ _id: id, status: 'ACTIVE' })
      .populate('lesson', 'title topic ageGroupCode status')
      .populate('questions.vocabulary', 'english vietnamese pronunciation');

    if (!activity || !activity.lesson || activity.lesson.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Activity not found.' });
    }

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityById
};
