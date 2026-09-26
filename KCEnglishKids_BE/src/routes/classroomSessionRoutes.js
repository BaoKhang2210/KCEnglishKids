const express = require('express');
const router = express.Router();
const cs = require('../controllers/classroomSessionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All classroom session routes require authentication
router.use(protect, authorize('TEACHER', 'ADMIN'));

// List / Create
router.get('/', cs.getSessions);
router.post('/', cs.createSession);

// Single session CRUD
router.get('/:id', cs.getSession);
router.post('/:id/start', cs.startSession);
router.post('/:id/end', cs.endSession);

// In-session scoring and question tracking
router.post('/:id/score-student', cs.scoreStudent);
router.post('/:id/score-bulk', cs.scoreBulk);
router.post('/:id/question-result', cs.recordQuestionResult);
router.patch('/:id/activity-index', cs.updateActivityIndex);

// Summary (can be fetched at any time after session starts)
router.get('/:id/summary', cs.getSessionSummary);

module.exports = router;
