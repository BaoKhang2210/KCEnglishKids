const express = require('express');
const router = express.Router();
const {
  startSession,
  getSession,
  submitActivityResult
} = require('../controllers/learningController');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');

// §3.1.3/§3.1.4 — writes require a valid token; a child can only write their
// own results (controller resolves childId from req.user for CHILD role).
router.post('/sessions', protect, startSession);
router.get('/sessions/:id', optionalProtect, getSession);
router.post('/activity-results', protect, submitActivityResult);

module.exports = router;
