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
  promoteStudentsToClassroom,
  rolloverClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  assignTeacherToClassroom,
  importStudentsFromExcel,
  exportClassroomExcel,
  getClassroomCurriculumProgress,
  updateClassroomCurriculumProgress,
  getClassroomSessions,
  exportSystemBackup,
  getBackupRestoreOverview,
  validateSystemBackup,
  restoreSystemBackup,
  createServerSnapshot,
  downloadServerSnapshot,
  deleteServerSnapshot,
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
    const { topic, ageGroup, mode, unitId } = req.body || {};
    if (!topic || !String(topic).trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập chủ đề bài học.' });
    }
    const cleanTopic = String(topic).trim();
    const { CurriculumUnit, Lesson } = require('../models');

    if (mode === 'lesson' || unitId) {
      let unitDoc = null;
      let existingLessonCount = 0;
      let existingWords = [];
      if (unitId) {
        unitDoc = await CurriculumUnit.findById(unitId);
        if (unitDoc) {
          const lessons = await Lesson.find({
            curriculumUnits: unitDoc._id,
            status: { $ne: 'INACTIVE' }
          }).populate('vocabularyItems', 'english').lean();
          existingLessonCount = req.body.existingLessonCount !== undefined && req.body.existingLessonCount !== null
            ? Math.max(0, Number(req.body.existingLessonCount) || 0)
            : lessons.length;
          existingWords = lessons.flatMap(l => (l.vocabularyItems || []).map(v => v.english)).filter(Boolean);
        }
      }
      const draft = await require('../services/aiService').generateLessonDraftWithAI({
        topic: cleanTopic,
        ageGroup: unitDoc?.ageGroupCode || ageGroup || '3-4',
        unitId,
        unitNumber: unitDoc?.unitNumber,
        unitBigQuestion: unitDoc?.bigQuestion,
        existingLessonCount,
        existingWords
      });
      return res.json({ success: true, data: draft });
    }

    const draft = await require('../services/aiService').generateCurriculumDraftWithAI({
      topic: cleanTopic,
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
      createNewUnit,
      bookNumber: requestedBookNumber,
      ageGroupCode = '3-4',
      bigQuestion,
      storyTitle,
      values,
      unitLessons = [],
      suggestedLessonTitle,
      suggestedVietnameseTitle,
      category = 'General',
      vocabularies = [],
      sentencePairs = []
    } = req.body || {};

    const { Lesson, CurriculumBook, CurriculumUnit, AgeGroup, Topic, Vocabulary, LanguageContent } = require('../models');
    const readiness = require('../services/contentReadiness');
    const vocabularyMedia = require('../services/vocabularyMedia');

    // Mode 1: AI Full Unit Creator (creates a new Unit at the end of the book + 4 structured Lessons)
    if (createNewUnit || (!lessonId && !unitId)) {
      const finalAge = ['3-4', '4-5', '5-6'].includes(ageGroupCode) ? ageGroupCode : '3-4';
      const bNum = Number(requestedBookNumber) || (finalAge === '3-4' ? 1 : finalAge === '4-5' ? 2 : 3);
      const bookDoc = await CurriculumBook.findOne({ bookNumber: bNum });
      const ageGroupDoc = await AgeGroup.findOne({ code: finalAge });
      const firstTopic = await Topic.findOne({ status: 'ACTIVE' });

      const maxActiveUnit = await CurriculumUnit.findOne({ bookNumber: bNum, status: { $ne: 'INACTIVE' } }).sort({ unitNumber: -1 }).lean();
      const newUnitNum = (maxActiveUnit?.unitNumber || 0) + 1;

      // Remove any INACTIVE unit occupying this number so unique index succeeds
      await CurriculumUnit.deleteMany({ bookNumber: bNum, unitNumber: newUnitNum, status: 'INACTIVE' });

      const enTitle = (suggestedLessonTitle || category || `Unit ${newUnitNum} Topic`).trim();
      const viTitle = (suggestedVietnameseTitle || enTitle).trim();
      const finalBigQuestion = (bigQuestion || `What can we discover about ${enTitle}?`).trim();
      const finalStoryTitle = (storyTitle || `The Little ${vocabularies[0]?.english || 'Friend'}'s Adventure`).trim();

      const createdUnit = await CurriculumUnit.create({
        book: bookDoc ? bookDoc._id : undefined,
        bookNumber: bNum,
        unitNumber: newUnitNum,
        ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
        ageGroupCode: finalAge,
        bigQuestion: finalBigQuestion,
        storyTitle: finalStoryTitle,
        values: values || 'Curiosity, sharing with friends, and kindness',
        vocabularyReferences: vocabularies.map(v => v.english).filter(Boolean),
        languagePatterns: sentencePairs.flatMap(p => [p.questionEnglish, p.answerEnglish]).filter(Boolean),
        sourceType: 'GENERATED_CONTENT',
        displayOrder: newUnitNum,
        status: 'ACTIVE'
      });

      if (bookDoc) {
        const activeCount = await CurriculumUnit.countDocuments({ bookNumber: bNum, status: { $ne: 'INACTIVE' } });
        await CurriculumBook.updateOne({ _id: bookDoc._id }, { $set: { totalUnits: Math.max(bookDoc.totalUnits || 9, activeCount, newUnitNum) } });
      }

      const defaultFourLessons = Array.isArray(unitLessons) && unitLessons.length === 4
        ? unitLessons
        : [
            { lessonOrder: 1, title: `Unit ${newUnitNum} - Lesson 1: ${enTitle} (Vocabulary & Phonics)`, vietnameseTitle: `${viTitle} - Bài 1: Từ vựng & Phát âm`, description: `Làm quen từ vựng cốt lõi và phát âm chủ đề ${viTitle}` },
            { lessonOrder: 2, title: `Unit ${newUnitNum} - Lesson 2: ${enTitle} (Sentence Patterns & Speaking)`, vietnameseTitle: `${viTitle} - Bài 2: Mẫu câu & Giao tiếp`, description: `Thực hành mẫu câu hỏi đáp ngắn chủ đề ${viTitle}` },
            { lessonOrder: 3, title: `Unit ${newUnitNum} - Lesson 3: ${enTitle} (Story, Song & Good Values)`, vietnameseTitle: `${viTitle} - Bài 3: Câu chuyện, Bài hát & Lễ giáo`, description: `Kể chuyện "${finalStoryTitle}", hát vận động và lễ giáo mầm non` },
            { lessonOrder: 4, title: `Unit ${newUnitNum} - Lesson 4: ${enTitle} (Fun Mini Games & Review)`, vietnameseTitle: `${viTitle} - Bài 4: Ôn tập & Trò chơi củng cố`, description: `Ôn tập tổng hợp kiến thức Unit ${newUnitNum} qua trò chơi tương tác` }
          ];

      const maxLessonDoc = await Lesson.findOne({ ageGroupCode: finalAge }).sort({ displayOrder: -1 }).lean();
      const baseDisplayOrder = Math.max((newUnitNum - 1) * 4, maxLessonDoc?.displayOrder || 0);

      const createdLessons = [];
      for (let i = 0; i < defaultFourLessons.length; i++) {
        const lItem = defaultFourLessons[i];
        const lDoc = await Lesson.create({
          key: `B${bNum}_U${newUnitNum}_L${i + 1}_${Date.now()}`,
          title: String(lItem.title || `Unit ${newUnitNum} - Lesson ${i + 1}`).trim(),
          vietnameseTitle: String(lItem.vietnameseTitle || `Bài ${i + 1}`).trim(),
          description: String(lItem.description || `Bài học thuộc Unit ${newUnitNum} (${finalAge} tuổi)`).trim(),
          topic: firstTopic ? firstTopic._id : undefined,
          ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
          ageGroupCode: finalAge,
          curriculumUnits: [createdUnit._id],
          displayOrder: baseDisplayOrder + i + 1,
          difficulty: 1,
          status: 'ACTIVE'
        });
        createdLessons.push(lDoc);
      }

      const allCreatedVocabWords = [];
      const allCreatedSentencePatterns = [];
      let totalCreatedVocabs = 0;
      let totalCreatedSentences = 0;

      for (let i = 0; i < createdLessons.length; i++) {
        const lDoc = createdLessons[i];
        const lItem = defaultFourLessons[i];

        // 1. Determine distinct vocabularies for this specific lesson
        const lessonVocabs = Array.isArray(lItem?.vocabularies) && lItem.vocabularies.length > 0
          ? lItem.vocabularies
          : (Array.isArray(vocabularies) && vocabularies.length > 0
              ? vocabularies.slice(i * 2, i * 2 + 2)
              : []);

        const lessonVocabIds = [];
        for (const item of lessonVocabs) {
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
            ageGroupCodes: [finalAge],
            sourceUnits: [createdUnit._id],
            lesson: lDoc._id,
            status: 'ACTIVE'
          });
          await vocab.validate();
          await vocabularyMedia(vocab);
          await vocab.save();
          lessonVocabIds.push(vocab._id);
          allCreatedVocabWords.push(vocab.english);
          totalCreatedVocabs++;
        }

        // 2. Determine distinct sentence pairs for this specific lesson
        const lessonSentencePairs = Array.isArray(lItem?.sentencePairs) && lItem.sentencePairs.length > 0
          ? lItem.sentencePairs
          : (Array.isArray(sentencePairs) && sentencePairs.length > 0
              ? [sentencePairs[i % sentencePairs.length]]
              : []);

        const lessonSentenceIds = [];
        for (const pair of lessonSentencePairs) {
          if (!pair?.questionEnglish) continue;
          const pairId = `pair_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const qDoc = await LanguageContent.create({
            contentType: 'QUESTION',
            english: String(pair.questionEnglish).trim(),
            vietnamese: pair.questionVietnamese ? String(pair.questionVietnamese).trim() : '',
            pronunciation: pair.questionPronunciation ? String(pair.questionPronunciation).trim() : '',
            ageGroupCode: finalAge,
            sourceUnit: createdUnit._id,
            lesson: lDoc._id,
            difficulty: 1,
            pairId,
            status: 'ACTIVE',
            sourceType: 'GENERATED_CONTENT'
          });
          lessonSentenceIds.push(qDoc._id);
          allCreatedSentencePatterns.push(qDoc.english);
          totalCreatedSentences++;

          if (pair.answerEnglish && String(pair.answerEnglish).trim()) {
            const aDoc = await LanguageContent.create({
              contentType: 'ANSWER',
              english: String(pair.answerEnglish).trim(),
              vietnamese: pair.answerVietnamese ? String(pair.answerVietnamese).trim() : '',
              pronunciation: pair.answerPronunciation ? String(pair.answerPronunciation).trim() : '',
              ageGroupCode: finalAge,
              sourceUnit: createdUnit._id,
              lesson: lDoc._id,
              difficulty: 1,
              pairId,
              relatedQuestion: qDoc._id,
              status: 'ACTIVE',
              sourceType: 'GENERATED_CONTENT'
            });
            lessonSentenceIds.push(aDoc._id);
            allCreatedSentencePatterns.push(aDoc.english);
            totalCreatedSentences++;
          }
        }

        // Link ONLY this lesson's distinct items into this lesson
        await Lesson.updateOne(
          { _id: lDoc._id },
          {
            $set: {
              vocabularyItems: lessonVocabIds,
              languageContents: lessonSentenceIds
            }
          }
        );
      }

      // Update unit references with all distinct vocabularies & patterns across the 4 lessons
      await CurriculumUnit.updateOne(
        { _id: createdUnit._id },
        {
          $set: {
            vocabularyReferences: Array.from(new Set(allCreatedVocabWords)),
            languagePatterns: Array.from(new Set(allCreatedSentencePatterns))
          }
        }
      );

      const primaryLesson = createdLessons[0] || null;

      return res.status(201).json({
        success: true,
        message: `Đã khởi tạo thành công Unit ${newUnitNum} ("${finalBigQuestion}") kèm 4 bài học với từ vựng và mẫu câu riêng biệt (tổng cộng ${totalCreatedVocabs} từ vựng và ${totalCreatedSentences} câu)!`,
        data: {
          unitId: createdUnit._id,
          unitNumber: newUnitNum,
          bookNumber: bNum,
          lessonsCount: createdLessons.length,
          lessonIds: createdLessons.map(l => l._id),
          lessonId: primaryLesson?._id || null,
          lessonTitle: primaryLesson?.title || '',
          vocabularyCount: totalCreatedVocabs,
          sentenceCount: totalCreatedSentences
        }
      });
    }

    let targetLesson = lessonId ? await Lesson.findById(lessonId) : null;
    let unitDoc = null;
    if (unitId) {
      unitDoc = await CurriculumUnit.findById(unitId);
    }
    if (!targetLesson) {
      if (!unitDoc) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn bài học hoặc Unit để lưu nội dung AI.' });
      }
      const finalAge = unitDoc.ageGroupCode || ageGroupCode || '3-4';
      const ageGroupDoc = await AgeGroup.findOne({ code: finalAge });
      const firstTopic = await Topic.findOne({ status: 'ACTIVE' });
      const countInUnit = await Lesson.countDocuments({
        curriculumUnits: unitDoc._id,
        status: { $ne: 'INACTIVE' }
      });
      const newLessonOrder = req.body.existingLessonCount !== undefined && req.body.existingLessonCount !== null
        ? Math.max(1, Number(req.body.existingLessonCount) + 1)
        : (countInUnit + 1);
      const bNum = unitDoc.bookNumber || (finalAge === '3-4' ? 1 : finalAge === '4-5' ? 2 : 3);

      targetLesson = await Lesson.create({
        key: `B${bNum}_U${unitDoc.unitNumber}_L${newLessonOrder}_${Date.now()}`,
        title: (suggestedLessonTitle || `Unit ${unitDoc.unitNumber} - Lesson ${newLessonOrder}`).trim(),
        vietnameseTitle: (suggestedVietnameseTitle || `Bài ${newLessonOrder}`).trim(),
        description: (req.body.description || `Bài học số ${newLessonOrder} thuộc Unit ${unitDoc.unitNumber} (${finalAge} tuổi)`).trim(),
        topic: firstTopic ? firstTopic._id : undefined,
        ageGroup: ageGroupDoc ? ageGroupDoc._id : undefined,
        ageGroupCode: finalAge,
        curriculumUnits: [unitDoc._id],
        displayOrder: newLessonOrder,
        difficulty: 1,
        status: 'ACTIVE'
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

    if (unitDoc) {
      const allVocabWords = vocabularies.map(v => v.english).filter(Boolean);
      const allPatterns = sentencePairs.flatMap(p => [p.questionEnglish, p.answerEnglish]).filter(Boolean);
      await CurriculumUnit.updateOne(
        { _id: unitDoc._id },
        {
          $addToSet: {
            vocabularyReferences: { $each: allVocabWords },
            languagePatterns: { $each: allPatterns }
          }
        }
      );
    }

    const { AuditLog } = require('../models');
    if (req.user && AuditLog) {
      AuditLog.create({
        user: req.user._id,
        action: 'CREATE_LESSON_AI',
        targetType: 'Lesson',
        targetId: targetLesson._id,
        details: {
          title: targetLesson.title,
          unitId: unitDoc?._id,
          unitNumber: unitDoc?.unitNumber,
          vocabularyCount: createdVocabIds.length,
          sentenceCount: createdSentenceIds.length
        }
      }).catch(err => console.error('[Audit log]', err.message));
    }

    res.status(201).json({
      success: true,
      message: `Đã khởi tạo thành công bài học "${targetLesson.title}" trong Unit ${unitDoc ? unitDoc.unitNumber : ''} với ${createdVocabIds.length} từ vựng và ${sentencePairs.length} cặp mẫu câu!`,
      data: {
        lessonId: targetLesson._id,
        lessonTitle: targetLesson.title,
        unitId: unitDoc?._id || unitId,
        unitNumber: unitDoc?.unitNumber,
        bookNumber: unitDoc?.bookNumber,
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
router.get('/game-catalog/analytics', protect, authorize('ADMIN'), require('../controllers/gameCatalogController').analytics);
router.get('/game-catalog/readiness', protect, authorize('ADMIN'), require('../controllers/gameCatalogController').readiness);
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

// System Backup & Restore (Sao lưu & Phục hồi dữ liệu hệ thống)
router.get('/system/backup', protect, authorize('ADMIN'), exportSystemBackup);
router.get('/system/backup/overview', protect, authorize('ADMIN'), getBackupRestoreOverview);
router.post('/system/restore/validate', protect, authorize('ADMIN'), validateSystemBackup);
router.post('/system/restore', protect, authorize('ADMIN'), restoreSystemBackup);
router.post('/system/snapshots', protect, authorize('ADMIN'), createServerSnapshot);
router.get('/system/snapshots/:filename', protect, authorize('ADMIN'), downloadServerSnapshot);
router.delete('/system/snapshots/:filename', protect, authorize('ADMIN'), deleteServerSnapshot);

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
router.post('/classrooms/:id/promote-students', protect, authorize('ADMIN'), promoteStudentsToClassroom);
router.post('/classrooms/:id/rollover', protect, authorize('ADMIN'), rolloverClassroom);
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
