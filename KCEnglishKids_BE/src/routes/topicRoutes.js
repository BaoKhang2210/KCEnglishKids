const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middlewares/authMiddleware');
const {
  getTopics,
  getTopicById,
  getLessonsByTopic
} = require('../controllers/topicController');

router.get('/', getTopics);
router.get('/:id', getTopicById);
router.get('/:id/lessons', optionalProtect, getLessonsByTopic);

module.exports = router;
