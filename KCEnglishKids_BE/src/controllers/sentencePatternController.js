/**
 * Sentence-pattern teaching controller (teacher-facing, read-only).
 *
 * Serves the `languagecontents` collection (PATTERN / SENTENCE / QUESTION /
 * ANSWER / ORACY / DIALOGUE docs) so teachers can teach sentence patterns
 * on the classroom screen. Previously this collection was orphaned — no API.
 */
const mongoose = require('mongoose');
const { LanguageContent, CurriculumUnit, Lesson } = require('../models');

// Types worth teaching out loud on the class screen (WORDS/SENTENCES are skipped)
const TEACHING_TYPES = ['PATTERN', 'SENTENCE', 'QUESTION', 'ANSWER', 'ORACY', 'DIALOGUE'];
// Teaching order on screen: pattern → sentence → question → answer → oracy
const TYPE_ORDER = { PATTERN: 0, SENTENCE: 1, QUESTION: 2, ANSWER: 3, ORACY: 4, DIALOGUE: 5 };
const validId = id => mongoose.isValidObjectId(id);
const invalid = (res, message) => res.status(400).json({ success: false, message });
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Deterministic classroom order: book → unit → lesson → content type → difficulty
const byTeachingOrder = (a, b) => {
  const ua = a.sourceUnit || {}, ub = b.sourceUnit || {};
  return (
    (ua.bookNumber || 0) - (ub.bookNumber || 0) ||
    (ua.unitNumber || 0) - (ub.unitNumber || 0) ||
    ((a.lesson?.displayOrder || 0) - (b.lesson?.displayOrder || 0)) ||
    ((TYPE_ORDER[a.contentType] ?? 9) - (TYPE_ORDER[b.contentType] ?? 9)) ||
    ((a.difficulty || 1) - (b.difficulty || 1)) ||
    String(a.english || '').localeCompare(String(b.english || ''), 'en', { sensitivity: 'base' })
  );
};

/**
 * GET /api/teacher/sentence-patterns
 * Query: ageGroupCode, unitId, lessonId, topicId, contentType (csv), search
 * Returns teaching-ready rows: english, vietnamese, pronunciation, topic,
 * lesson, sourceUnit, vocabulary, audioUrl / imageUrl resolved from Media.
 */
exports.list = async (req, res, next) => {
  try {
    const { ageGroupCode, unitId, lessonId, topicId, contentType, search } = req.query;
    const q = { status: 'ACTIVE' };

    if (ageGroupCode) q.ageGroupCode = ageGroupCode;
    if (unitId) { if (!validId(unitId)) return invalid(res, 'Invalid unit id.'); q.sourceUnit = unitId; }
    if (topicId) { if (!validId(topicId)) return invalid(res, 'Invalid topic id.'); q.topic = topicId; }

    // Lesson relation is stored on the lesson side (lesson.languageContents) —
    // support both directions so either seeding style keeps working.
    if (lessonId) {
      if (!validId(lessonId)) return invalid(res, 'Invalid lesson id.');
      const lessonDoc = await Lesson.findById(lessonId).select('languageContents').lean();
      if (!lessonDoc) return invalid(res, 'Lesson not found.');
      (q.$and = q.$and || []).push({ $or: [{ lesson: lessonId }, { _id: { $in: lessonDoc.languageContents || [] } }] });
    }

    // contentType filter — csv of enum values, defaults to all teaching types
    const requested = String(contentType || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    const types = requested.length ? requested.filter(x => TEACHING_TYPES.includes(x)) : TEACHING_TYPES;
    if (requested.length && !types.length) return invalid(res, 'No valid content type requested.');
    q.contentType = { $in: types };

    if (search && String(search).trim()) {
      const rx = { $regex: esc(String(search).trim()), $options: 'i' };
      (q.$and = q.$and || []).push({ $or: [{ english: rx }, { vietnamese: rx }, { pronunciation: rx }] });
    }

    const rows = await LanguageContent.find(q)
      .populate('topic', 'englishName vietnameseName')
      .populate('lesson', 'title vietnameseTitle displayOrder')
      .populate('sourceUnit', 'unitNumber bookNumber bigQuestion ageGroupCode')
      .populate('vocabulary', 'english vietnamese imageUrl audioUrl')
      .populate('audioMedia', 'url mimeType duration')
      .populate('imageMedia', 'url thumbnail')
      .sort({ difficulty: 1 })
      .lean();

    // Natural curriculum order: book → unit → lesson → MongoDB insertion sequence (_id)
    const byCurriculumSequence = (a, b) => {
      const ua = a.sourceUnit || {}, ub = b.sourceUnit || {};
      const diffBook = (ua.bookNumber || 0) - (ub.bookNumber || 0);
      if (diffBook !== 0) return diffBook;
      const diffUnit = (ua.unitNumber || 0) - (ub.unitNumber || 0);
      if (diffUnit !== 0) return diffUnit;
      const diffLesson = (a.lesson?.displayOrder || 0) - (b.lesson?.displayOrder || 0);
      if (diffLesson !== 0) return diffLesson;
      return String(a._id).localeCompare(String(b._id));
    };

    rows.sort(byCurriculumSequence);

    // Reverse lesson lookup — lesson.languageContents is the authoritative link
    const lessons = await Lesson.find({ languageContents: { $in: rows.map(r => r._id) } })
      .select('title vietnameseTitle displayOrder languageContents')
      .lean();
    const lessonByContent = new Map();
    lessons.forEach(l => (l.languageContents || []).forEach(cid => lessonByContent.set(String(cid), l)));

    // Build paired teaching items
    const byType = {};
    const absorbedAnswerIds = new Set();
    const pairedItems = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      byType[r.contentType] = (byType[r.contentType] || 0) + 1;

      const itemAnswers = [];

      if (r.contentType === 'QUESTION') {
        // Collect following consecutive answers in the same unit
        let j = i + 1;
        while (
          j < rows.length &&
          rows[j].contentType === 'ANSWER' &&
          String(rows[j].sourceUnit?._id || '') === String(r.sourceUnit?._id || '')
        ) {
          const ans = rows[j];
          absorbedAnswerIds.add(String(ans._id));
          itemAnswers.push({
            _id: ans._id,
            english: ans.english,
            vietnamese: ans.vietnamese || '',
            pronunciation: ans.pronunciation || '',
            audioUrl: ans.audioMedia?.url || null,
            imageUrl: ans.imageMedia?.url || ans.imageMedia?.thumbnail || null
          });
          j++;
        }
      } else if (r.contentType === 'PATTERN') {
        // Patterns like "Is she happy? Yes, she is."
        if (r.english && r.english.includes('?')) {
          const parts = r.english.split('?');
          const aPart = parts.slice(1).join('?').trim();
          let viAPart = '';
          if (r.vietnamese && r.vietnamese.includes('?')) {
            viAPart = r.vietnamese.split('?').slice(1).join('?').trim();
          }
          if (aPart) {
            itemAnswers.push({
              _id: `${r._id}_ans`,
              english: aPart,
              vietnamese: viAPart,
              pronunciation: '',
              audioUrl: null
            });
          }
        }
      } else if (r.contentType === 'ORACY' || r.contentType === 'DIALOGUE') {
        // Check if pattern contains ? or consecutive dialogue
        if (r.english && r.english.includes('?')) {
          const parts = r.english.split('?');
          const turn2 = parts.slice(1).join('?').trim();
          let viTurn2 = '';
          if (r.vietnamese && r.vietnamese.includes('?')) {
            viTurn2 = r.vietnamese.split('?').slice(1).join('?').trim();
          }
          if (turn2) {
            itemAnswers.push({
              _id: `${r._id}_turn2`,
              english: turn2,
              vietnamese: viTurn2,
              pronunciation: '',
              audioUrl: null
            });
          }
        }
      }

      pairedItems.push({
        _id: r._id,
        contentType: r.contentType,
        english: r.english,
        vietnamese: r.vietnamese || '',
        pronunciation: r.pronunciation || '',
        ageGroupCode: r.ageGroupCode || '',
        difficulty: r.difficulty || 1,
        topic: r.topic || null,
        lesson: r.lesson || lessonByContent.get(String(r._id)) || null,
        sourceUnit: r.sourceUnit || null,
        vocabulary: r.vocabulary || [],
        audioUrl: r.audioMedia?.url || null,
        imageUrl: r.imageMedia?.url || r.imageMedia?.thumbnail || null,
        answers: itemAnswers,
        hasAnswers: itemAnswers.length > 0
      });
    }

    // If paired mode is requested or by default in classroom teaching:
    // If the teacher didn't specifically filter by 'ANSWER', exclude absorbed answers from the top-level cards
    const shouldFilterAbsorbed = req.query.paired === 'true' || (!requested.includes('ANSWER') && requested.length === 0);
    const data = shouldFilterAbsorbed
      ? pairedItems.filter(item => !absorbedAnswerIds.has(String(item._id)))
      : pairedItems;

    res.json({
      success: true,
      count: data.length,
      totalRawCount: rows.length,
      meta: { types, byType, pairedCount: data.filter(d => d.hasAnswers).length },
      data
    });
  } catch (e) { next(e); }
};

/**
 * GET /api/teacher/sentence-patterns/units-overview
 * Query: ageGroupCode, contentType
 * Aggregated counts per curriculum unit — drives the unit picker so teachers
 * only see units that actually have teachable sentence content.
 */
exports.unitsOverview = async (req, res, next) => {
  try {
    const { ageGroupCode, contentType } = req.query;
    const requested = String(contentType || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean);
    const types = requested.length ? requested.filter(x => TEACHING_TYPES.includes(x)) : TEACHING_TYPES;
    if (requested.length && !types.length) return invalid(res, 'No valid content type requested.');

    const match = { status: 'ACTIVE', sourceUnit: { $ne: null }, contentType: { $in: types } };
    if (ageGroupCode) match.ageGroupCode = ageGroupCode;

    const groups = await LanguageContent.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$sourceUnit',
          sentenceCount: { $sum: 1 },
          ageGroupCodes: { $addToSet: '$ageGroupCode' },
          contentIds: { $push: '$_id' },
          byType: { $push: '$contentType' }
        }
      }
    ]);

    // Reverse lesson count: lesson.languageContents is the authoritative link
    const contentToUnit = new Map();
    groups.forEach(g => g.contentIds.forEach(cid => contentToUnit.set(String(cid), String(g._id))));
    const lessons = await Lesson.find({ languageContents: { $in: groups.flatMap(g => g.contentIds) } })
      .select('languageContents')
      .lean();
    const lessonsByUnit = new Map();
    lessons.forEach(l => {
      new Set((l.languageContents || []).map(cid => contentToUnit.get(String(cid))).filter(Boolean))
        .forEach(u => lessonsByUnit.set(u, (lessonsByUnit.get(u) || 0) + 1));
    });

    const units = await CurriculumUnit.find({ _id: { $in: groups.map(g => g._id) } })
      .populate('book', 'title bookNumber ageGroupCode')
      .lean();
    const unitMap = new Map(units.map(u => [String(u._id), u]));

    const data = groups
      .map(g => {
        const u = unitMap.get(String(g._id));
        if (!u) return null;
        const byType = {};
        g.byType.forEach(t => { byType[t] = (byType[t] || 0) + 1; });
        return {
          unitId: u._id,
          unitNumber: u.unitNumber,
          bookNumber: u.bookNumber || u.book?.bookNumber || 0,
          bookTitle: u.book?.title || '',
          bigQuestion: u.bigQuestion || '',
          ageGroupCode: u.ageGroupCode || g.ageGroupCodes.find(Boolean) || '',
          sentenceCount: g.sentenceCount,
          lessonCount: lessonsByUnit.get(String(g._id)) || 0,
          byType
        };
      })
      .filter(Boolean)
      .sort((a, b) => (a.bookNumber - b.bookNumber) || (a.unitNumber - b.unitNumber));

    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
};
