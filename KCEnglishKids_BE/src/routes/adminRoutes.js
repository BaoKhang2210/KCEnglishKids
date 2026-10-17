const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  updateUser,
  resetChildPin,
  deleteUser,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus,
  getClassrooms,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentsToClassroom,
  getDeepCurriculum,
  toggleLessonStatus,
  getAdminAnalytics,
  getSystemSettings,
  updateSystemSettings
} = require('../controllers/adminController');
const { getRewardsSummary } = require('../controllers/rewardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/dashboard', protect, authorize('ADMIN'), getDashboardStats);
router.get('/curriculum', protect, authorize('ADMIN'), getCurriculum);
router.get('/curriculum/deep', protect, authorize('ADMIN'), getDeepCurriculum);

// Classroom Management (Phân chia lớp & gán giáo viên)
router.get('/classrooms', protect, authorize('ADMIN'), getClassrooms);
router.post('/classrooms', protect, authorize('ADMIN'), createClassroom);
router.put('/classrooms/:id', protect, authorize('ADMIN'), updateClassroom);
router.delete('/classrooms/:id', protect, authorize('ADMIN'), deleteClassroom);
router.post('/classrooms/:id/assign-students', protect, authorize('ADMIN'), assignStudentsToClassroom);

// User Management
router.get('/users', protect, authorize('ADMIN'), getUsers);
router.post('/teachers', protect, authorize('ADMIN'), createTeacher);
router.post('/children', protect, authorize('ADMIN'), createChild);
router.put('/users/:id', protect, authorize('ADMIN'), updateUser);
router.post('/users/:id/reset-pin', protect, authorize('ADMIN'), resetChildPin);
router.delete('/users/:id', protect, authorize('ADMIN'), deleteUser);
router.patch('/users/:id/status', protect, authorize('ADMIN'), toggleUserStatus);

// Audit Logs
router.get('/audit-logs', protect, authorize('ADMIN'), getAuditLogs);

// Analytics
router.get('/analytics/overview', protect, authorize('ADMIN'), getAdminAnalytics);

// System Settings
router.get('/settings', protect, authorize('ADMIN'), getSystemSettings);
router.put('/settings', protect, authorize('ADMIN'), updateSystemSettings);

// §1.2 — reward system overview
router.get('/rewards/summary', protect, authorize('ADMIN'), getRewardsSummary);

// Topic & Lesson Status Controls
router.patch('/topics/:id/status', protect, authorize('ADMIN'), toggleTopicStatus);
router.patch('/lessons/:id/status', protect, authorize('ADMIN'), toggleLessonStatus);

// Public / demo preview stats
router.get('/public-stats', getDashboardStats);

module.exports = router;
