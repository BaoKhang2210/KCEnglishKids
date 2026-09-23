const express = require('express');
const router = express.Router();
const {
  getTopics,
  getTopicById,
  getLessonsByTopic
} = require('../controllers/topicController');

router.get('/', getTopics);
router.get('/:id', getTopicById);
router.get('/:id/lessons', getLessonsByTopic);

module.exports = router;
