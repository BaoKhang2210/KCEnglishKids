const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const c = require('../controllers/recognitionController');
const router = express.Router();

router.use(protect);
router.get('/mine', authorize('CHILD'), c.childInbox);
router.patch('/mine/:id/read', authorize('CHILD'), c.read);
router.get('/classes', authorize('TEACHER', 'ADMIN'), c.classes);
router.get('/classes/:classId', authorize('TEACHER', 'ADMIN'), c.preview);
router.post('/classes/:classId/publish', authorize('TEACHER', 'ADMIN'), c.publish);
module.exports = router;
