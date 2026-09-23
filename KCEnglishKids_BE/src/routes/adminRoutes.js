const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/dashboard', protect, authorize('ADMIN'), getDashboardStats);
router.get('/curriculum', protect, authorize('ADMIN'), getCurriculum);

// User Management
router.get('/users', protect, authorize('ADMIN'), getUsers);
router.post('/teachers', protect, authorize('ADMIN'), createTeacher);
router.post('/children', protect, authorize('ADMIN'), createChild);
router.patch('/users/:id/status', protect, authorize('ADMIN'), toggleUserStatus);

// Audit Logs
router.get('/audit-logs', protect, authorize('ADMIN'), getAuditLogs);

// Topic Status Controls
router.patch('/topics/:id/status', protect, authorize('ADMIN'), toggleTopicStatus);

// Public / demo preview stats
router.get('/public-stats', getDashboardStats);

module.exports = router;
