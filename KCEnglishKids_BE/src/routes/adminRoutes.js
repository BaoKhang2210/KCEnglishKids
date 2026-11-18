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
  getClassroomFullDetail,
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
  getClassroomSessions,
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
  autoAssignCurriculumSchedules,
  clearScheduleLessons,
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
router.get('/curriculum/lessons/:id/pedagogy',protect,authorize('ADMIN'),require('../controllers/teachingProfileController').get);
router.put('/curriculum/lessons/:id/pedagogy',protect,authorize('ADMIN'),require('../controllers/teachingProfileController').save);
router.get('/curriculum', protect, authorize('ADMIN'), getCurriculum);
router.get('/curriculum/deep', protect, authorize('ADMIN'), getDeepCurriculum);
router.get('/curriculum/lessons/:id/readiness', protect, authorize('ADMIN'), async(req,res,next)=>{try{const lesson=await require('../models').Lesson.findById(req.params.id);if(!lesson)return res.status(404).json({success:false,message:'Lesson not found.'});res.json({success:true,data:await require('../services/contentReadiness').lessonReadiness(lesson)});}catch(error){next(error);}});
router.post('/curriculum/ai-generate', protect, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { topic, ageGroup } = req.body || {};
    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập chủ đề bài học.' });
    }
    const draft = await require('../services/aiService').generateCurriculumDraftWithAI({
      topic: String(topic).trim(),
      ageGroup: ageGroup || '3-4'
    });
    res.json({ success: true, data: draft });
  } catch (error) {
    next(error);
  }
});
router.post('/curriculum/ai-apply', protect, authorize('ADMIN'), async (req, res, next) => {
  try {
    const {
      lessonId,
      unitId,
      ageGroupCode = '3-4',
      suggestedLessonTitle,
      suggestedVietnameseTitle,
      category = 'General',
      vocabularies = [],
      sentencePairs = []
    } = req.body || {};

    const { Lesson, CurriculumUnit, AgeGroup, Topic, Vocabulary, LanguageContent } = require('../models');
    const readiness = require('../services/contentReadiness');
    const vocabularyMedia = require('../services/vocabularyMedia');

    let targetLesson = lessonId ? await Lesson.findById(lessonId) : null;
    if (!targetLesson) {
      if (!unitId) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn bài học hoặc Unit để lưu nội dung AI.' });
      }
      const unitDoc = await CurriculumUnit.findById(unitId);
      if (!unitDoc) {
        return res.status(404).json({ success: false, message: 'Unit không tồn tại.' });
      }
      const finalAge = unitDoc.ageGroupCode || ageGroupCode || '3-4';
      const ageGroupDoc = await AgeGroup.findOne({ code: finalAge });
      const firstTopic = await Topic.findOne({ status: 'ACTIVE' });
      const countInUnit = await Lesson.countDocuments({ curriculumUnits: unitDoc._id });

      targetLesson = await Lesson.create({
        title: (suggestedLessonTitle || 'AI Generated Lesson').trim(),
        vietnameseTitle: (suggestedVietnameseTitle || '').trim(),
        description: `Bài học tự động khởi tạo bằng AI (${finalAge} tuổi)`,
        topic: firstTopic ? firstTopic._id : undefined,
        ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
        ageGroupCode: finalAge,
        curriculumUnits: [unitDoc._id],
        displayOrder: countInUnit + 1,
        difficulty: 1,
        status: 'DRAFT'
      });
    }

    const finalAgeGroup = targetLesson.ageGroupCode || ageGroupCode || '3-4';
    const unitIds = Array.isArray(targetLesson.curriculumUnits) && targetLesson.curriculumUnits.length > 0
      ? targetLesson.curriculumUnits
      : (unitId ? [unitId] : []);

    const createdVocabIds = [];
    for (const item of vocabularies) {
      if (!item?.english || !item?.vietnamese) continue;
      const safeImageUrl = readiness.safeMedia(item.imageUrl) ? item.imageUrl : '/images/vocabulary/book-v1.svg';
      const vocab = new Vocabulary({
        english: String(item.english).trim(),
        vietnamese: String(item.vietnamese).trim(),
        pronunciation: item.pronunciation ? String(item.pronunciation).trim() : '',
        category: item.category || category || 'General',
        wordType: ['noun', 'verb', 'number', 'color', 'adjective'].includes(item.wordType) ? item.wordType : 'noun',
        visualType: 'concrete',
        isTransparent: true,
        imageUrl: safeImageUrl,
        mediaSource: item.imagePrompt ? `AI Flashcard Prompt: ${String(item.imagePrompt).slice(0, 420)}` : 'AI Curriculum Creator',
        mediaLicense: 'KCEnglishKids AI Generated',
        ageGroupCodes: [finalAgeGroup],
        sourceUnits: unitIds,
        lesson: targetLesson._id,
        status: 'ACTIVE'
      });
      await vocab.validate();
      await vocabularyMedia(vocab);
      await vocab.save();
      createdVocabIds.push(vocab._id);
    }

    const createdSentenceIds = [];
    const primaryUnitId = unitIds[0] || undefined;
    for (const pair of sentencePairs) {
      if (!pair?.questionEnglish) continue;
      const pairId = `pair_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const qDoc = await LanguageContent.create({
        contentType: 'QUESTION',
        english: String(pair.questionEnglish).trim(),
        vietnamese: pair.questionVietnamese ? String(pair.questionVietnamese).trim() : '',
        pronunciation: pair.questionPronunciation ? String(pair.questionPronunciation).trim() : '',
        ageGroupCode: finalAgeGroup,
        sourceUnit: primaryUnitId,
        lesson: targetLesson._id,
        difficulty: 1,
        pairId,
        status: 'ACTIVE',
        sourceType: 'GENERATED_CONTENT'
      });
      createdSentenceIds.push(qDoc._id);

      if (pair.answerEnglish && String(pair.answerEnglish).trim()) {
        const aDoc = await LanguageContent.create({
          contentType: 'ANSWER',
          english: String(pair.answerEnglish).trim(),
          vietnamese: pair.answerVietnamese ? String(pair.answerVietnamese).trim() : '',
          pronunciation: pair.answerPronunciation ? String(pair.answerPronunciation).trim() : '',
          ageGroupCode: finalAgeGroup,
          sourceUnit: primaryUnitId,
          lesson: targetLesson._id,
          difficulty: 1,
          pairId,
          relatedQuestion: qDoc._id,
          status: 'ACTIVE',
          sourceType: 'GENERATED_CONTENT'
        });
        createdSentenceIds.push(aDoc._id);
      }
    }

    await Lesson.findByIdAndUpdate(targetLesson._id, {
      $addToSet: {
        vocabularyItems: { $each: createdVocabIds },
        languageContents: { $each: createdSentenceIds }
      }
    });

    res.status(201).json({
      success: true,
      message: `Đã áp dụng ${createdVocabIds.length} từ vựng và ${sentencePairs.length} cặp mẫu câu Hỏi–Đáp vào bài "${targetLesson.title}"!`,
      data: {
        lessonId: targetLesson._id,
        lessonTitle: targetLesson.title,
        vocabularyCount: createdVocabIds.length,
        sentenceCount: createdSentenceIds.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Activity & Games Management (Kho Trò chơi & Hoạt động)
router.get('/game-catalog', protect, authorize('ADMIN'), require('../controllers/gameCatalogController').get);
router.get('/game-catalog/preview', protect, authorize('ADMIN'), require('../controllers/gameCatalogController').preview);
router.put('/game-catalog', protect, authorize('ADMIN'), require('../controllers/gameCatalogController').update);
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
router.get('/classrooms/:id/full-detail', protect, authorize('ADMIN'), getClassroomFullDetail);
router.get('/classrooms/:id', protect, authorize('ADMIN'), getClassroomById);
router.post('/classrooms', protect, authorize('ADMIN'), createClassroom);
router.put('/classrooms/:id', protect, authorize('ADMIN'), updateClassroom);
router.delete('/classrooms/:id', protect, authorize('ADMIN'), deleteClassroom);
router.get('/classrooms/:id/curriculum-progress', protect, authorize('ADMIN'), getClassroomCurriculumProgress);
router.put('/classrooms/:id/curriculum-progress', protect, authorize('ADMIN'), updateClassroomCurriculumProgress);
router.get('/classrooms/:id/sessions', protect, authorize('ADMIN'), getClassroomSessions);
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
router.post('/schedules/auto-assign-curriculum', protect, authorize('ADMIN'), autoAssignCurriculumSchedules);
router.post('/schedules/clear-lessons', protect, authorize('ADMIN'), clearScheduleLessons);
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
