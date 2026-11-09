const express = require('express');
const router = express.Router();
const cs = require('../controllers/classroomSessionController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All classroom session routes require authentication
router.use(protect, authorize('TEACHER', 'ADMIN'));
router.delete('/:id', cs.deleteDraft);

// List / Create / Report Off
router.get('/', cs.getSessions);
router.post('/', cs.createSession);
router.post('/report-off', cs.reportOff);

// Single session CRUD & Status actions
router.get('/:id', cs.getSession);
router.post('/:id/start', cs.startSession);
router.post('/:id/end', cs.endSession);
router.post('/:id/cancel', cs.cancelSession);
router.post('/:id/restore', cs.restoreCancelledSession);

// In-session scoring and question tracking
router.post('/:id/score-student', cs.scoreStudent);
router.post('/:id/score-bulk', cs.scoreBulk);
router.post('/:id/question-result', cs.recordQuestionResult);
router.patch('/:id/activity-index', cs.updateActivityIndex);
router.patch('/:id/students/:studentId/attendance', cs.updateStudentAttendance);

// Summary is available once the teacher has ended the session.
router.get('/:id/summary', cs.getSessionSummary);

module.exports = router;
