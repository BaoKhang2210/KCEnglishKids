const express = require('express');
const router = express.Router();
const {
  getStudentCompetency,
  resetStaffPassword,
  getDashboardStats,
  getCurriculum,
  getUsers,
  createTeacher,
  createChild,
  bulkImportChildren,
  updateUser,
  resetChildPin,
  deleteUser,
  toggleUserStatus,
  getAuditLogs,
  toggleTopicStatus,
  getClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  assignStudentsToClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  assignTeacherToClassroom,
  importStudentsFromExcel,
  exportClassroomExcel,
  getClassroomCurriculumProgress,
  updateClassroomCurriculumProgress,
  exportSystemBackup,
  getUnassignedStudents,
  getDeepCurriculum,
  toggleLessonStatus,
  getAdminAnalytics,
  getSystemSettings,
  updateSystemSettings,
  createUnit,
  updateUnit,
  deleteUnit,
  createLesson,
  updateLesson,
  deleteLesson,
  createVocabulary,
  updateVocabulary,
  deleteVocabulary,
  getSentencePatterns,
  createSentencePattern,
  updateSentencePattern,
  deleteSentencePattern,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getTeacherSchedule,
  // Activities & Games
  getAdminActivities,
  getAdminActivityById,
  createAdminActivity,
  updateAdminActivity,
  deleteAdminActivity,
  toggleActivityStatus
} = require('../controllers/adminController');
const { getRewardsSummary } = require('../controllers/rewardController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const { audit } = require('../services/adminIntegrity');
const auditActions = {
  'PUT /curriculum/units/:id': 'UPDATE_UNIT', 'DELETE /curriculum/units/:id': 'DELETE_UNIT',
  'PUT /curriculum/lessons/:id': 'UPDATE_LESSON', 'DELETE /curriculum/lessons/:id': 'DELETE_LESSON',
  'POST /curriculum/vocabularies': 'CREATE_VOCABULARY', 'PUT /curriculum/vocabularies/:id': 'UPDATE_VOCABULARY',
  'DELETE /curriculum/vocabularies/:id': 'DELETE_VOCABULARY', 'PUT /sentences/:id': 'UPDATE_SENTENCE_PATTERN', 'DELETE /sentences/:id': 'DELETE_SENTENCE_PATTERN'
};
router.use((req, res, next) => {
  res.on('finish', () => {
    const action = auditActions[`${req.method} ${req.route?.path}`];
    if (action && res.statusCode < 300) void audit(req, action, req.route.path.includes('vocabularies') ? 'Vocabulary' : req.route.path.includes('sentences') ? 'LanguageContent' : 'Curriculum', req.params.id,
      { name: req.body?.title || req.body?.english || req.body?.bigQuestion || action });
  });
  next();
});

router.get('/dashboard', protect, authorize('ADMIN'), getDashboardStats);
router.get('/curriculum', protect, authorize('ADMIN'), getCurriculum);
router.get('/curriculum/deep', protect, authorize('ADMIN'), getDeepCurriculum);

// Activity & Games Management (Kho Trò chơi & Hoạt động)
router.get('/activities', protect, authorize('ADMIN'), getAdminActivities);
router.get('/activities/:id', protect, authorize('ADMIN'), getAdminActivityById);
router.post('/activities', protect, authorize('ADMIN'), createAdminActivity);
router.put('/activities/:id', protect, authorize('ADMIN'), updateAdminActivity);
router.delete('/activities/:id', protect, authorize('ADMIN'), deleteAdminActivity);
router.patch('/activities/:id/status', protect, authorize('ADMIN'), toggleActivityStatus);

// Curriculum Management (CRUD Units, Lessons, Vocabularies)
router.post('/curriculum/units', protect, authorize('ADMIN'), createUnit);
router.put('/curriculum/units/:id', protect, authorize('ADMIN'), updateUnit);
router.delete('/curriculum/units/:id', protect, authorize('ADMIN'), deleteUnit);
router.post('/curriculum/lessons', protect, authorize('ADMIN'), createLesson);
router.put('/curriculum/lessons/:id', protect, authorize('ADMIN'), updateLesson);
router.delete('/curriculum/lessons/:id', protect, authorize('ADMIN'), deleteLesson);
router.post('/curriculum/vocabularies', protect, authorize('ADMIN'), createVocabulary);
router.put('/curriculum/vocabularies/:id', protect, authorize('ADMIN'), updateVocabulary);
router.delete('/curriculum/vocabularies/:id', protect, authorize('ADMIN'), deleteVocabulary);

// Sentence Patterns Management (CRUD Mẫu câu)
router.get('/sentences', protect, authorize('ADMIN'), getSentencePatterns);
router.post('/sentences', protect, authorize('ADMIN'), createSentencePattern);
router.put('/sentences/:id', protect, authorize('ADMIN'), updateSentencePattern);
router.delete('/sentences/:id', protect, authorize('ADMIN'), deleteSentencePattern);

// System Backup (Bảo lưu toàn bộ dữ liệu hệ thống)
router.get('/system/backup', protect, authorize('ADMIN'), exportSystemBackup);

// Classroom Management (Phân chia lớp & gán giáo viên & quản lý học sinh theo lớp)
router.get('/classrooms', protect, authorize('ADMIN'), getClassrooms);
router.get('/classrooms/:id', protect, authorize('ADMIN'), getClassroomById);
router.post('/classrooms', protect, authorize('ADMIN'), createClassroom);
router.put('/classrooms/:id', protect, authorize('ADMIN'), updateClassroom);
router.delete('/classrooms/:id', protect, authorize('ADMIN'), deleteClassroom);
router.get('/classrooms/:id/curriculum-progress', protect, authorize('ADMIN'), getClassroomCurriculumProgress);
router.put('/classrooms/:id/curriculum-progress', protect, authorize('ADMIN'), updateClassroomCurriculumProgress);
router.post('/classrooms/:id/assign-students', protect, authorize('ADMIN'), assignStudentsToClassroom);
router.post('/classrooms/:id/students', protect, authorize('ADMIN'), addStudentToClassroom);
router.post('/classrooms/:id/import-students-excel', protect, authorize('ADMIN'), importStudentsFromExcel);
router.get('/classrooms/:id/export-excel', protect, authorize('ADMIN'), exportClassroomExcel);
router.delete('/classrooms/:id/students/:studentId', protect, authorize('ADMIN'), removeStudentFromClassroom);
router.put('/classrooms/:id/teacher', protect, authorize('ADMIN'), assignTeacherToClassroom);
router.get('/students/unassigned', protect, authorize('ADMIN'), getUnassignedStudents);

// Schedule Management (Thời Khóa Biểu)
router.get('/schedules', protect, authorize('ADMIN'), getSchedules);
router.post('/schedules', protect, authorize('ADMIN'), createSchedule);
router.put('/schedules/:id', protect, authorize('ADMIN'), updateSchedule);
router.delete('/schedules/:id', protect, authorize('ADMIN'), deleteSchedule);
router.get('/schedules/by-teacher/:teacherId', protect, authorize('ADMIN', 'TEACHER'), getTeacherSchedule);

// User Management
router.get('/users', protect, authorize('ADMIN'), getUsers);
router.get('/users/:id/competency', protect, authorize('ADMIN'), getStudentCompetency);
router.post('/users/:id/reset-password', protect, authorize('ADMIN'), resetStaffPassword);
router.post('/teachers', protect, authorize('ADMIN'), createTeacher);
router.post('/children', protect, authorize('ADMIN'), createChild);
router.post('/children/bulk-import', protect, authorize('ADMIN'), bulkImportChildren);
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
router.get('/public-stats', protect, authorize('ADMIN'), getDashboardStats);

module.exports = router;
