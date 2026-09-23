const express = require('express');
const router = express.Router();
const {
  getCurriculumPath,
  getLessonById,
  getLessonActivities
} = require('../controllers/lessonController');
const { optionalProtect } = require('../middlewares/authMiddleware');

router.get('/curriculum-path', optionalProtect, getCurriculumPath);
router.get('/:id', optionalProtect, getLessonById);
router.get('/:id/activities', optionalProtect, getLessonActivities);

module.exports = router;
