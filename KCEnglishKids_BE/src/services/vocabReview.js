/**
 * vocabReview.js
 * ==============
 * Single server-side owner of the Leitner review schedule for vocabulary.
 *
 * Stage 2 reports and quick-review answers both enter through this module, so
 * the notebook, the stage report and the due list always read one schedule.
 *
 * Calendar days are resolved in the app timezone configured in
 * shared/vocabReviewConfig.json (default Asia/Ho_Chi_Minh, UTC+7). The server
 * clock owns "today"; clients never send levels or due dates.
 */

const mongoose = require('mongoose');
const CONFIG = require('../../../shared/vocabReviewConfig.json');
const { VocabularyMastery, Vocabulary, Lesson, CurriculumUnit, Progress, User } = require('../models');

const DAY_MS = 86400000;
const TZ_OFFSET_MINUTES = Number(CONFIG.timezoneOffsetMinutes) || 0;
const OUTCOMES = Object.freeze(['SECURE', 'PRACTICE', 'REVIEW']);

const isId = (value) => mongoose.isValidObjectId(value);

function dayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return dayKey(new Date());
  return new Date(date.getTime() + TZ_OFFSET_MINUTES * 60000).toISOString().slice(0, 10);
}

function dayStartUtc(day) {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) - TZ_OFFSET_MINUTES * 60000);
}

function addDays(day, amount) {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + Number(amount) * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(fromDay, toDay) {
  return Math.round((Date.parse(`${toDay}T00:00:00.000Z`) - Date.parse(`${fromDay}T00:00:00.000Z`)) / DAY_MS);
}

function intervalsFor(ageGroup) {
  return CONFIG.ageIntervals[ageGroup] || CONFIG.ageIntervals['4-5'];
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number.isFinite(Number(value)) ? Number(value) : min, min), max);
}

function masteryLevelFor(level, maxLevel) {
  if (level >= maxLevel) return 3;
  if (level >= 2) return 2;
  if (level >= 1) return 1;
  return 0;
}

function statusFor(level, maxLevel, outcome) {
  if (level >= maxLevel) return 'MASTERED';
  if (outcome === 'REVIEW') return 'REVIEW';
  if (outcome === 'PRACTICE') return 'PRACTICE';
  return 'LEARNING';
}

function normalizeOutcome(value) {
  return OUTCOMES.includes(value) ? value : 'PRACTICE';
}

// Same thresholds as the Stage 2 report: one slip or a hint stays PRACTICE,
// repeated mistakes become REVIEW.
function outcomeFromAnswer({ isCorrect, wrongAttempts = 0, independent = true } = {}) {
  const wrong = Math.max(0, Number(wrongAttempts) || 0);
  if (wrong > 1) return 'REVIEW';
  if (!isCorrect || !independent || wrong > 0) return 'PRACTICE';
  return 'SECURE';
}

/**
 * Pure transition used by live writes, the backfill and tests.
 * Returns the next Leitner state without touching the database.
 */
function applyOutcome(current = {}, outcome, options = {}) {
  const ageGroup = options.ageGroup || '4-5';
  const today = options.today || dayKey();
  const submissionId = options.submissionId || null;
  const intervals = intervalsFor(ageGroup);
  const maxLevel = intervals.length;
  const rating = normalizeOutcome(outcome);

  let level = clamp(current.reviewLevel, 0, maxLevel);
  let dueOn = current.reviewDueOn || null;
  let demotionCount = Number(current.demotionCount) || 0;
  let lastPromotionOn = current.lastPromotionOn || null;
  const beforeDue = Boolean(dueOn && today < dueOn);

  if (rating === 'SECURE') {
    // Practising ahead of schedule records the effort but never promotes or
    // pushes the due date out; a bad answer still demotes below.
    if (!beforeDue) {
      const canPromote = !CONFIG.rules.SECURE.promoteOncePerDay || lastPromotionOn !== today;
      if (canPromote && level < maxLevel) {
        level += 1;
        lastPromotionOn = today;
      }
      dueOn = level >= maxLevel
        ? addDays(today, CONFIG.mastered.maintenanceDays)
        : addDays(today, intervals[Math.min(level, intervals.length - 1)]);
    }
  } else if (rating === 'PRACTICE') {
    const previousLevel = Math.max(0, level - 1);
    dueOn = addDays(today, Math.max(CONFIG.rules.PRACTICE.minDays, intervals[previousLevel] || 1));
  } else {
    const nextLevel = Math.max(0, level - CONFIG.rules.REVIEW.demoteBy);
    demotionCount += level - nextLevel;
    level = nextLevel;
    dueOn = addDays(today, CONFIG.rules.REVIEW.dueInDays);
  }

  return {
    reviewAlgorithmVersion: 1,
    reviewLevel: level,
    reviewMaxLevel: maxLevel,
    reviewDueOn: dueOn,
    reviewStatus: statusFor(level, maxLevel, rating),
    lastReviewOutcome: rating,
    lastPromotionOn,
    demotionCount,
    lastPracticedOn: today,
    lastReviewSubmissionId: submissionId
  };
}

function snapshot(record, ageGroup) {
  if (!record) return null;
  const maxLevel = intervalsFor(ageGroup).length;
  const level = clamp(record.reviewLevel, 0, maxLevel);
  const dueOn = record.reviewDueOn || null;
  return {
    level,
    maxLevel,
    dueOn,
    dueAt: dueOn ? dayStartUtc(dueOn).toISOString() : null,
    status: record.reviewStatus || statusFor(level, maxLevel, record.lastReviewOutcome),
    mastered: level >= maxLevel,
    lastOutcome: record.lastReviewOutcome || null,
    lastPromotionOn: record.lastPromotionOn || null,
    demotionCount: Number(record.demotionCount) || 0
  };
}

function roundMarks(rounds = []) {
  return rounds.map((round) => ({
    code: round.code ?? null,
    key: round.key || null,
    name: round.name || '',
    rating: round.rating || null,
    isCorrect: Boolean(round.isCorrect),
    wrongAttemptCount: Number.isSafeInteger(round.wrongAttemptCount) ? round.wrongAttemptCount : null,
    usedHint: typeof round.usedHint === 'boolean' ? round.usedHint : null
  }));
}

// ─── Serialised writes per child ─────────────────────────────────────────────
// Stage completion and quick review can arrive together on flaky networks.
// One in-process queue per child keeps read-modify-write transitions ordered.
const locks = new Map();
function withChildLock(childId, task) {
  const key = String(childId);
  const previous = locks.get(key) || Promise.resolve();
  const run = previous.then(task, task);
  locks.set(key, run.catch(() => undefined));
  return run;
}

async function applyStage2Report({ childId, report, ageGroup = '4-5', submissionId, now = new Date() }) {
  if (!report || !Array.isArray(report.words) || !report.words.length) return {};
  const today = dayKey(now);
  const wordIds = report.words.map((word) => word.wordId).filter(isId);
  if (!wordIds.length) return {};

  return withChildLock(childId, async () => {
    const existing = await VocabularyMastery.find({ student: childId, vocabulary: { $in: wordIds } }).lean();
    const byWord = new Map(existing.map((record) => [String(record.vocabulary), record]));
    const snapshots = {};
    const operations = [];

    for (const word of report.words) {
      if (!isId(word.wordId)) continue;
      const record = byWord.get(String(word.wordId));
      if (record?.lastReviewSubmissionId && record.lastReviewSubmissionId === submissionId) {
        snapshots[word.wordId] = snapshot(record, ageGroup);
        continue;
      }
      if (!word.rating) {
        snapshots[word.wordId] = snapshot(record, ageGroup);
        continue;
      }
      const next = applyOutcome(record, word.rating, { ageGroup, today, submissionId });
      const mastered = next.reviewLevel >= next.reviewMaxLevel;
      operations.push({
        updateOne: {
          filter: { student: childId, vocabulary: word.wordId },
          update: {
            $set: {
              ...next,
              masteryLevel: masteryLevelFor(next.reviewLevel, next.reviewMaxLevel),
              needsReview: !mastered,
              nextReviewAt: dayStartUtc(next.reviewDueOn),
              lastRoundMarks: roundMarks(word.rounds),
              lastReviewedAt: now
            }
          },
          upsert: true
        }
      });
      snapshots[word.wordId] = snapshot(next, ageGroup);
    }

    if (operations.length) await VocabularyMastery.bulkWrite(operations, { ordered: false });
    return snapshots;
  });
}

async function recordReviewOutcome({ childId, vocabId, outcome, submissionId, now = new Date(), isCorrect, wrongAttempts = 0 }) {
  if (!isId(childId) || !isId(vocabId)) {
    throw Object.assign(new Error('Invalid child or vocabulary.'), { statusCode: 400 });
  }
  const today = dayKey(now);
  return withChildLock(childId, async () => {
    const record = await VocabularyMastery.findOne({ student: childId, vocabulary: vocabId });
    const ageGroup = await ageGroupForChild(childId);
    if (record?.lastReviewSubmissionId && record.lastReviewSubmissionId === submissionId) {
      return snapshot(record, ageGroup);
    }
    const next = applyOutcome(record || {}, outcome, { ageGroup, today, submissionId });
    const mastered = next.reviewLevel >= next.reviewMaxLevel;
    const update = {
      $set: {
        ...next,
        masteryLevel: masteryLevelFor(next.reviewLevel, next.reviewMaxLevel),
        needsReview: !mastered,
        nextReviewAt: dayStartUtc(next.reviewDueOn),
        lastReviewedAt: now
      },
      $inc: {
        attemptCount: 1,
        correctCount: isCorrect === false ? 0 : 1,
        wrongCount: Math.max(0, Number(wrongAttempts) || 0)
      }
    };
    const updated = await VocabularyMastery.findOneAndUpdate(
      { student: childId, vocabulary: vocabId },
      update,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    ).lean();
    return snapshot(updated, ageGroup);
  });
}

function attachReview(report, snapshots = {}) {
  if (!report || !Array.isArray(report.words)) return report;
  return {
    ...report,
    words: report.words.map((word) => ({
      ...word,
      review: snapshots[String(word.wordId)] || null
    }))
  };
}

async function getReviewSnapshots(childId, wordIds, ageGroup = '4-5') {
  const ids = (wordIds || []).filter(isId);
  if (!ids.length) return {};
  const records = await VocabularyMastery.find({ student: childId, vocabulary: { $in: ids } }).lean();
  const byWord = new Map(records.map((record) => [String(record.vocabulary), record]));
  const snapshots = {};
  ids.forEach((id) => { snapshots[String(id)] = snapshot(byWord.get(String(id)), ageGroup); });
  return snapshots;
}

async function ageGroupForChild(childId) {
  const child = await User.findById(childId).select('ageGroupCode').lean();
  return child?.ageGroupCode || '4-5';
}

function dueOnForRecord(record) {
  if (record.reviewDueOn) return record.reviewDueOn;
  if (record.nextReviewAt) return dayKey(new Date(record.nextReviewAt));
  return null;
}

async function getDueReview(childId, { now = new Date(), limit } = {}) {
  const today = dayKey(now);
  const ageGroup = await ageGroupForChild(childId);
  const maxItems = clamp(limit || CONFIG.limits.sessionLimit, 1, CONFIG.limits.dailyDueLimit);
  const records = await VocabularyMastery.find({ student: childId })
    .populate('vocabulary', 'english vietnamese pronunciation imageUrl audioUrl category exampleSentence exampleSentenceVietnamese')
    .lean();
  const due = records
    .filter((record) => {
      if (!record.vocabulary) return false;
      const dueOn = dueOnForRecord(record);
      if (!dueOn) return false;
      return dueOn <= today;
    })
    .sort((a, b) => {
      const aDue = dueOnForRecord(a) || '9999-12-31';
      const bDue = dueOnForRecord(b) || '9999-12-31';
      if (aDue !== bDue) return aDue < bDue ? -1 : 1;
      return String(a.lastPracticedOn || '').localeCompare(String(b.lastPracticedOn || ''));
    });
  return {
    ageGroup,
    today,
    total: due.length,
    limit: maxItems,
    data: due.slice(0, maxItems).map((record) => toWordView(record, ageGroup))
  };
}

function toWordView(record, ageGroup) {
  const vocab = record.vocabulary || {};
  const info = snapshot(record, ageGroup);
  const dueOn = info?.dueOn || dueOnForRecord(record);
  return {
    vocabId: String(vocab._id || record.vocabulary),
    english: vocab.english || '',
    vietnamese: vocab.vietnamese || '',
    pronunciation: vocab.pronunciation || '',
    imageUrl: vocab.imageUrl || '',
    audioUrl: vocab.audioUrl || '',
    category: vocab.category || '',
    exampleSentence: vocab.exampleSentence || '',
    exampleSentenceVietnamese: vocab.exampleSentenceVietnamese || '',
    level: info?.level || 0,
    maxLevel: info?.maxLevel || intervalsFor(ageGroup).length,
    mastered: Boolean(info?.mastered),
    dueOn,
    dueAt: dueOn ? dayStartUtc(dueOn).toISOString() : null,
    status: info?.status || 'LEARNING',
    lastOutcome: record.lastReviewOutcome || null,
    lastRounds: record.lastRoundMarks || [],
    demotionCount: Number(record.demotionCount) || 0,
    lastPracticedOn: record.lastPracticedOn || null
  };
}

async function getNotebook(childId, { now = new Date() } = {}) {
  const today = dayKey(now);
  const ageGroup = await ageGroupForChild(childId);
  const [records, lessons, units, progress] = await Promise.all([
    VocabularyMastery.find({ student: childId })
      .populate('vocabulary', 'english vietnamese pronunciation imageUrl audioUrl category exampleSentence exampleSentenceVietnamese')
      .lean(),
    Lesson.find({ ageGroupCode: ageGroup, status: 'ACTIVE' })
      .select('title vietnameseTitle displayOrder curriculumUnits vocabularyItems topic')
      .populate('topic', 'icon englishName vietnameseName colorCode')
      .populate('curriculumUnits', 'unitNumber storyTitle')
      .sort({ displayOrder: 1 })
      .lean(),
    CurriculumUnit.find({ ageGroupCode: ageGroup, status: 'ACTIVE' })
      .select('unitNumber bigQuestion storyTitle displayOrder')
      .sort({ unitNumber: 1 })
      .lean(),
    Progress.find({ child: childId }).select('lesson').lean()
  ]);

  const recordByWord = new Map();
  records.forEach((record) => {
    if (record.vocabulary?._id) recordByWord.set(String(record.vocabulary._id), record);
  });
  const startedLessons = new Set(progress.filter((row) => row.lesson).map((row) => String(row.lesson)));
  const placedWords = new Set();

  const unitMap = new Map(units.map((unit) => [String(unit._id), {
    _id: unit._id,
    unitNumber: unit.unitNumber,
    title: `Unit ${unit.unitNumber}`,
    subtitle: unit.storyTitle || unit.bigQuestion || '',
    icon: '🎒',
    color: '#F59E0B',
    lessons: [],
    learnedWordIds: new Set(),
    masteredWordIds: new Set(),
    dueWordIds: new Set(),
    totalWordIds: new Set(),
    started: false
  }]));

  for (const lesson of lessons) {
    const lessonWords = [];
    const seen = new Set();
    for (const vocabId of lesson.vocabularyItems || []) {
      const id = String(vocabId);
      if (seen.has(id)) continue;
      seen.add(id);
      placedWords.add(id);
      const record = recordByWord.get(id);
      if (record) lessonWords.push(toWordView(record, ageGroup));
    }
    const lessonDue = lessonWords.filter((word) => word.dueOn && word.dueOn <= today).length;
    const lessonMastered = lessonWords.filter((word) => word.mastered).length;

    for (const unitRef of lesson.curriculumUnits || []) {
      const unitId = String(unitRef._id || unitRef);
      const unit = unitMap.get(unitId);
      if (!unit) continue;
      const topic = lesson.topic || {};
      if (unit.icon === '🎒' && topic.icon) unit.icon = topic.icon;
      if (topic.colorCode) unit.color = topic.colorCode;
      unit.lessons.push({
        _id: lesson._id,
        title: lesson.title,
        vietnameseTitle: lesson.vietnameseTitle || '',
        displayOrder: Number(lesson.displayOrder) || 0,
        totalWords: (lesson.vocabularyItems || []).length,
        learnedWords: lessonWords.length,
        masteredWords: lessonMastered,
        dueWords: lessonDue,
        words: lessonWords
      });
      (lesson.vocabularyItems || []).forEach((id) => unit.totalWordIds.add(String(id)));
      lessonWords.forEach((word) => {
        unit.learnedWordIds.add(word.vocabId);
        if (word.mastered) unit.masteredWordIds.add(word.vocabId);
        if (word.dueOn && word.dueOn <= today) unit.dueWordIds.add(word.vocabId);
      });
      if (startedLessons.has(String(lesson._id))) unit.started = true;
    }
  }

  const unitViews = units.map((unit) => {
    const entry = unitMap.get(String(unit._id));
    const learned = entry.learnedWordIds.size;
    const locked = !entry.started && learned === 0 && Number(unit.unitNumber) > 1;
    return {
      _id: entry._id,
      unitNumber: entry.unitNumber,
      title: entry.title,
      subtitle: entry.subtitle,
      icon: entry.icon,
      color: entry.color,
      locked,
      totalWords: entry.totalWordIds.size,
      learnedWords: learned,
      masteredWords: entry.masteredWordIds.size,
      dueWords: entry.dueWordIds.size,
      lessons: locked ? [] : entry.lessons.sort((a, b) => a.displayOrder - b.displayOrder)
    };
  });

  const orphanWords = records
    .filter((record) => record.vocabulary && !placedWords.has(String(record.vocabulary._id)))
    .map((record) => toWordView(record, ageGroup));
  if (orphanWords.length) {
    unitViews.push({
      _id: 'explore',
      unitNumber: 0,
      title: 'Từ đã khám phá',
      subtitle: 'Chủ đề và trò chơi',
      icon: '✨',
      color: '#0EA5E9',
      locked: false,
      totalWords: orphanWords.length,
      learnedWords: orphanWords.length,
      masteredWords: orphanWords.filter((word) => word.mastered).length,
      dueWords: orphanWords.filter((word) => word.dueOn && word.dueOn <= today).length,
      lessons: [{
        _id: 'explore',
        title: 'Từ đã khám phá',
        vietnameseTitle: '',
        displayOrder: 0,
        totalWords: orphanWords.length,
        learnedWords: orphanWords.length,
        masteredWords: orphanWords.filter((word) => word.mastered).length,
        dueWords: orphanWords.filter((word) => word.dueOn && word.dueOn <= today).length,
        words: orphanWords
      }]
    });
  }

  const allWords = records.filter((record) => record.vocabulary).map((record) => toWordView(record, ageGroup));
  const dueWords = allWords
    .filter((word) => word.dueOn && word.dueOn <= today)
    .sort((a, b) => (a.dueOn < b.dueOn ? -1 : a.dueOn > b.dueOn ? 1 : 0));

  return {
    ageGroup,
    today,
    summary: {
      total: allWords.length,
      mastered: allWords.filter((word) => word.mastered).length,
      learning: allWords.filter((word) => !word.mastered).length,
      dueToday: dueWords.length
    },
    dueToday: dueWords.slice(0, CONFIG.limits.dailyDueLimit),
    limits: { dailyDueLimit: CONFIG.limits.dailyDueLimit, sessionLimit: CONFIG.limits.sessionLimit },
    units: unitViews
  };
}

module.exports = {
  CONFIG,
  OUTCOMES,
  dayKey,
  dayStartUtc,
  addDays,
  daysBetween,
  intervalsFor,
  applyOutcome,
  outcomeFromAnswer,
  snapshot,
  attachReview,
  getReviewSnapshots,
  applyStage2Report,
  recordReviewOutcome,
  getDueReview,
  getNotebook,
  toWordView,
  dueOnForRecord
};
