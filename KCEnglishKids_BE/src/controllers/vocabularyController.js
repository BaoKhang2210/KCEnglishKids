const { Vocabulary } = require('../models');

// @desc    Get vocabulary list with optional filtering
// @route   GET /api/vocabulary
// @access  Public
const getVocabularyList = async (req, res, next) => {
  try {
    const { topic, ageGroup, search } = req.query;

    const query = { status: 'ACTIVE' };
    if (topic) query.topics = topic;
    if (ageGroup) query.ageGroupCodes = ageGroup;
    if (search) {
      query.$or = [
        { english: { $regex: search, $options: 'i' } },
        { vietnamese: { $regex: search, $options: 'i' } }
      ];
    }

    const vocabList = await Vocabulary.find(query)
      .populate('primaryMedia')
      .populate('audioMedia')
      .sort({ english: 1 });

    res.status(200).json({
      success: true,
      count: vocabList.length,
      data: vocabList
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vocabulary item
// @route   GET /api/vocabulary/:id
// @access  Public
const getVocabularyById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vocab = await Vocabulary.findById(id)
      .populate('primaryMedia')
      .populate('audioMedia')
      .populate('sourceUnits')
      .populate('topics');

    if (!vocab) {
      return res.status(404).json({ success: false, message: 'Vocabulary item not found.' });
    }

    res.status(200).json({
      success: true,
      data: vocab
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVocabularyList,
  getVocabularyById
};
