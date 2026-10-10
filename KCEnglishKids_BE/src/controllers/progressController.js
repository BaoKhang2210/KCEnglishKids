const {
  Progress,
  User,
  ActivityResult,
  LearningSession,
  VocabularyMastery,
} = require('../models');

// ─── helpers ──────────────────────────────────────────────────────────────────

const csvCell = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const toCsv = (rows) => {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ];
  return lines.join('\r\n');
};

// ─── getChildProgress ─────────────────────────────────────────────────────────

// @desc    Get child learning progress summary and weak words
// @route   GET /api/children/:id/progress
// @access  Private
const getChildProgress = async (req, res, next) => {
  try {
    const { id } = req.params;

    const child = await User.findById(id).select('name avatar avatarUrl ageGroupCode');
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const progressList = await Progress.find({ child: id })
      .populate('topic', 'englishName vietnameseName icon colorCode')
      .populate('lesson', 'title vietnameseTitle difficulty')
      .populate('weakVocabulary.vocabulary', 'english vietnamese imageUrl audioUrl');

    let totalStars = 0;
    let completedLessonsCount = 0;
    const weakWordsMap = {};

    progressList.forEach((item) => {
      totalStars += item.stars || 0;
      if (item.completed) completedLessonsCount++;

      if (item.weakVocabulary && item.weakVocabulary.length > 0) {
        item.weakVocabulary.forEach((wv) => {
          if (wv.vocabulary) {
            const vocabId = wv.vocabulary._id.toString();
            if (!weakWordsMap[vocabId]) {
              weakWordsMap[vocabId] = {
                vocabulary: wv.vocabulary,
                mistakeCount: wv.mistakeCount,
              };
            } else {
              weakWordsMap[vocabId].mistakeCount += wv.mistakeCount;
            }
          }
        });
      }
    });

    const recentResults = await ActivityResult.find({ child: id })
      .populate('activity', 'title activityType')
      .populate('lesson', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        child,
        totalStars,
        completedLessonsCount,
        progressList,
        weakVocabulary: Object.values(weakWordsMap),
        recentActivityResults: recentResults,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── exportChildData ──────────────────────────────────────────────────────────

// @desc  Export all learning data for a child as JSON or CSV.
// @route GET /api/children/:id/export?format=json|csv
// @access Private — CHILD (own data only) | TEACHER | ADMIN
//
// Privacy: NEVER exports DOB, email, phone, parentContact, full legal name.
const exportChildData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const format = (req.query.format || 'json').toLowerCase();

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'format must be "json" or "csv".',
      });
    }

    // Child may only export their own data
    if (req.user.role === 'CHILD' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only export your own data.',
      });
    }

    // Safe fields only — no DOB / email / phone
    const child = await User.findById(id).select('name ageGroupCode role');
    if (!child || child.role === 'ADMIN' || child.role === 'TEACHER') {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const [progressList, activityResults, masteryRecords, sessions] = await Promise.all([
      Progress.find({ child: id })
        .populate('lesson', 'title ageGroupCode')
        .populate('topic', 'englishName')
        .lean(),
      ActivityResult.find({ child: id })
        .populate('activity', 'title activityType')
        .populate('lesson', 'title')
        .sort({ createdAt: -1 })
        .lean(),
      VocabularyMastery.find({ student: id })
        .populate('vocabulary', 'english vietnamese')
        .lean(),
      LearningSession.find({ child: id })
        .populate('lesson', 'title')
        .sort({ startedAt: -1 })
        .lean(),
    ]);

    const totalStars         = progressList.reduce((n, p) => n + (p.stars || 0), 0);
    const completedLessons   = progressList.filter((p) => p.completed).length;
    const totalActivities    = activityResults.length;
    const totalLearningTimeS = activityResults.reduce((n, r) => n + (r.duration || 0), 0);
    const masteredVocab      = masteryRecords.filter((m) => m.masteryLevel === 3).length;

    // ── JSON ──────────────────────────────────────────────────────────────────
    if (format === 'json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        exportVersion: '1.0',
        profile: {
          name: child.name,
          ageGroupCode: child.ageGroupCode,
          // email / DOB / phone intentionally omitted
        },
        summary: {
          totalStars,
          completedLessons,
          totalActivitiesPlayed: totalActivities,
          totalLearningTimeSeconds: totalLearningTimeS,
          masteredVocabularyCount: masteredVocab,
        },
        lessonProgress: progressList.map((p) => ({
          lessonTitle:    p.lesson?.title        || '',
          topicName:      p.topic?.englishName   || '',
          completed:      p.completed,
          stars:          p.stars,
          highestScore:   p.highestScore,
          attempts:       p.attempts,
          lastActivityAt: p.lastActivityAt || null,
        })),
        activityResults: activityResults.map((r) => ({
          date:            r.createdAt,
          lessonTitle:     r.lesson?.title          || '',
          activityTitle:   r.activity?.title        || '',
          activityType:    r.activity?.activityType || '',
          score:           r.score,
          stars:           r.stars,
          correctCount:    r.correctCount,
          incorrectCount:  r.incorrectCount,
          attempts:        r.attempts,
          durationSeconds: r.duration,
          completed:       r.completed,
        })),
        vocabularyMastery: masteryRecords.map((m) => ({
          word:           m.vocabulary?.english    || '',
          translation:    m.vocabulary?.vietnamese || '',
          masteryLevel:   m.masteryLevel,
          correctCount:   m.correctCount,
          wrongCount:     m.wrongCount,
          attemptCount:   m.attemptCount,
          streak:         m.streak,
          lastReviewedAt: m.lastReviewedAt || null,
        })),
        learningSessions: sessions.map((s) => ({
          lessonTitle:     s.lesson?.title || '',
          status:          s.status,
          totalScore:      s.totalScore,
          stars:           s.stars,
          startedAt:       s.startedAt   || null,
          completedAt:     s.completedAt || null,
          durationSeconds: s.completedAt && s.startedAt
            ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 1000)
            : null,
        })),
      };

      const safeName = child.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `kc_export_${safeName}_${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).json(payload);
    }

    // ── CSV ───────────────────────────────────────────────────────────────────
    const csvSections = [];

    csvSections.push('## Summary');
    csvSections.push(toCsv([{
      name:                     child.name,
      ageGroupCode:             child.ageGroupCode,
      exportedAt:               new Date().toISOString(),
      totalStars,
      completedLessons,
      totalActivitiesPlayed:    totalActivities,
      totalLearningTimeSeconds: totalLearningTimeS,
      masteredVocabularyCount:  masteredVocab,
    }]));

    csvSections.push('\r\n## Lesson Progress');
    csvSections.push(toCsv(progressList.map((p) => ({
      lessonTitle:    p.lesson?.title      || '',
      topicName:      p.topic?.englishName || '',
      completed:      p.completed,
      stars:          p.stars,
      highestScore:   p.highestScore,
      attempts:       p.attempts,
      lastActivityAt: p.lastActivityAt || '',
    }))) || 'No data');

    csvSections.push('\r\n## Activity Results');
    csvSections.push(toCsv(activityResults.map((r) => ({
      date:            r.createdAt || '',
      lessonTitle:     r.lesson?.title          || '',
      activityTitle:   r.activity?.title        || '',
      activityType:    r.activity?.activityType || '',
      score:           r.score,
      stars:           r.stars,
      correctCount:    r.correctCount,
      incorrectCount:  r.incorrectCount,
      attempts:        r.attempts,
      durationSeconds: r.duration,
      completed:       r.completed,
    }))) || 'No data');

    csvSections.push('\r\n## Vocabulary Mastery');
    csvSections.push(toCsv(masteryRecords.map((m) => ({
      word:           m.vocabulary?.english    || '',
      translation:    m.vocabulary?.vietnamese || '',
      masteryLevel:   m.masteryLevel,
      correctCount:   m.correctCount,
      wrongCount:     m.wrongCount,
      attemptCount:   m.attemptCount,
      streak:         m.streak,
      lastReviewedAt: m.lastReviewedAt || '',
    }))) || 'No data');

    csvSections.push('\r\n## Learning Sessions');
    csvSections.push(toCsv(sessions.map((s) => ({
      startedAt:       s.startedAt    || '',
      completedAt:     s.completedAt  || '',
      lessonTitle:     s.lesson?.title || '',
      status:          s.status,
      totalScore:      s.totalScore,
      stars:           s.stars,
      durationSeconds: s.completedAt && s.startedAt
        ? Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 1000)
        : '',
    }))) || 'No data');

    const csvBody  = csvSections.join('\r\n');
    const safeName = child.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `kc_export_${safeName}_${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // UTF-8 BOM so Excel opens the file correctly
    return res.status(200).send('\uFEFF' + csvBody);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChildProgress,
  exportChildData,
};
