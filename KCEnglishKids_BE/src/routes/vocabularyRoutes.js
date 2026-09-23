const express = require('express');
const router = express.Router();
const {
  getVocabularyList,
  getVocabularyById
} = require('../controllers/vocabularyController');

router.get('/', getVocabularyList);
router.get('/:id', getVocabularyById);

module.exports = router;
