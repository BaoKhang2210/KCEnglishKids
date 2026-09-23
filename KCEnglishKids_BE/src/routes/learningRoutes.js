const express = require('express');
const router = express.Router();
const {
  startSession,
  getSession,
  submitActivityResult
} = require('../controllers/learningController');
const { optionalProtect } = require('../middlewares/authMiddleware');

router.post('/sessions', optionalProtect, startSession);
router.get('/sessions/:id', optionalProtect, getSession);
router.post('/activity-results', optionalProtect, submitActivityResult);

module.exports = router;
