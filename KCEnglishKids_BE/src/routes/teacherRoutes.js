const express = require('express');
const c = require('../controllers/teacherController');
const vm = require('../controllers/vocabMasteryController');
const pn = require('../controllers/parentNotificationController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

router.use(protect, authorize('TEACHER', 'ADMIN'));
router.get('/dashboard', c.getDashboard);
router.get('/classes', c.getTeacherClasses);
router.get('/classes/:id', c.getClassDetail);
router.put('/classes/:id', c.updateClass);
router.get('/classes/:id/eligible-students', c.getEligibleStudents);
router.get('/classes/:id/students', c.getClassDetail);
router.post('/classes/:id/students', c.addStudents);
router.delete('/classes/:id/students/:studentId', c.removeStudent);

router.get('/content', c.getContent);
router.get('/curriculum-options', c.getCurriculumOptions);
router.get('/lessons/:id', c.getLesson);
router.get('/activities/:id', c.getActivity);

router.get('/assignments', c.getAssignments);
router.post('/assignments', c.createAssignment);
router.get('/assignments/:id', c.getAssignment);
router.put('/assignments/:id', c.updateAssignment);
router.patch('/assignments/:id/status', c.updateAssignmentStatus);

router.get('/students', c.getStudents);
router.get('/students/:studentId/overview', c.getStudentOverview);
router.get('/students/:studentId/progress', c.getStudentOverview);
router.get('/students/:studentId/history', c.getStudentHistory);
router.get('/students/:studentId/notes', c.getStudentNotes);
router.post('/students/:studentId/notes', (req, res, next) => { req.body.studentId = req.params.studentId; c.createTeacherNote(req, res, next); });
router.post('/notes', c.createTeacherNote);
router.put('/notes/:id', c.updateNote);
router.delete('/notes/:id', c.deleteNote);

// Vocabulary mastery — teacher view of student mastery
router.get('/students/:studentId/vocabulary-mastery', vm.getStudentMastery);

// Parent notifications
router.get('/parent-notifications', pn.getNotifications);
router.post('/parent-notifications', pn.sendNotification);
router.post('/parent-notifications/bulk', pn.sendBulkNotifications);
router.get('/parent-notifications/child/:childId', pn.getChildNotifications);

module.exports = router;

