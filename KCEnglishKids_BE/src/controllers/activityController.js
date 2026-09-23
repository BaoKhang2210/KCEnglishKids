const { Activity } = require('../models');

// @desc    Get activity by ID
// @route   GET /api/activities/:id
// @access  Public / Child
const getActivityById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findById(id)
      .populate('lesson', 'title topic ageGroupCode')
      .populate('questions.vocabulary', 'english vietnamese pronunciation');

    if (!activity) {
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
