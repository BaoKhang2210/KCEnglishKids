const { ChildClientState, LearningEvent, User } = require('../models');

function deriveSessionsAndStatsFromEvents(childId, events = [], existingSessions = [], existingStats = {}) {
  const sessionMap = new Map();
  for (const s of existingSessions) {
    if (s && s.sessionId) sessionMap.set(String(s.sessionId), s);
  }

  const mergedStats = { ...(existingStats || {}) };

  // Process oldest to newest when deriving missing word stats
  const chronological = [...events].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const ev of chronological) {
    const subId = ev.submissionId || String(ev._id);
    const lessonId = String(ev.lesson);
    const completedAt = ev.createdAt ? new Date(ev.createdAt).getTime() : Date.now();
    const answers = Array.isArray(ev.answers) ? ev.answers : [];

    if (!sessionMap.has(subId) && answers.length > 0) {
      const wordMap = new Map();
      let firstTryCorrectTotal = 0;
      let totalWrongAttempts = 0;

      for (const ans of answers) {
        const wId = String(ans.wordId || '');
        if (!wId) continue;
        const wrongAtt = Number.isFinite(Number(ans.wrongAttemptCount))
          ? Number(ans.wrongAttemptCount)
          : ans.isCorrect
          ? 0
          : 1;
        const isFirstTry = Boolean(ans.isCorrect && wrongAtt === 0 && !ans.usedHint);
        if (isFirstTry) firstTryCorrectTotal += 1;
        totalWrongAttempts += wrongAtt;

        const prev = wordMap.get(wId) || {
          wordId: wId,
          english: ans.english || '',
          vietnamese: ans.vietnamese || '',
          imageUrl: ans.imageUrl || '',
          firstTryCorrect: 0,
          wrongCount: 0,
          isConfident: true
        };
        if (isFirstTry) prev.firstTryCorrect += 1;
        prev.wrongCount += wrongAtt;
        prev.isConfident = prev.firstTryCorrect > 0 && prev.wrongCount === 0;
        wordMap.set(wId, prev);
      }

      sessionMap.set(subId, {
        sessionId: subId,
        childId: String(childId),
        lessonId,
        startedAt: completedAt - 60000,
        completedAt,
        totalQuestions: answers.length,
        firstTryCorrectTotal,
        totalWrongAttempts,
        words: [...wordMap.values()]
      });
    }

    // Backfill vocabStats for words that aren't in mergedStats yet
    for (const ans of answers) {
      const wId = String(ans.wordId || '');
      if (!wId || existingStats?.[wId]) continue;
      const cur = mergedStats[wId] || {
        attempts: 0,
        firstTryCorrect: 0,
        wrong: 0,
        hints: 0,
        last6: [],
        confusions: {},
        typesCorrect: ['LT', 'LOOK_WORD'],
        updatedAt: completedAt,
        sessionDaysCount: 1,
        mastery: 'learning',
        trouble: false
      };
      const wrongAtt = Number.isFinite(Number(ans.wrongAttemptCount))
        ? Number(ans.wrongAttemptCount)
        : ans.isCorrect
        ? 0
        : 1;
      const isFirstTry = Boolean(ans.isCorrect && wrongAtt === 0 && !ans.usedHint);
      cur.attempts += 1;
      if (isFirstTry) cur.firstTryCorrect += 1;
      cur.wrong += wrongAtt;
      if (ans.usedHint) cur.hints += 1;
      if (!ans.isCorrect && ans.selectedId && String(ans.selectedId) !== wId) {
        const dId = String(ans.selectedId);
        cur.confusions[dId] = (cur.confusions[dId] || 0) + 1;
      }
      cur.last6 = [
        ...(cur.last6 || []).slice(-5),
        {
          ok: Boolean(ans.isCorrect),
          independent: isFirstTry,
          wrongAttempts: wrongAtt,
          submissionId: subId,
          type: 'LT',
          round: ans.round || 1,
          ts: completedAt
        }
      ];
      const last4 = cur.last6.slice(-4);
      const wrongsInLast4 = last4.reduce((s, a) => s + (a.wrongAttempts ?? (a.ok ? 0 : 1)), 0);
      cur.trouble = wrongsInLast4 >= 2;
      cur.mastery = cur.trouble
        ? 'learning'
        : cur.last6.length >= 3 && cur.last6.slice(-3).every(a => a.ok && a.independent !== false)
        ? 'known'
        : 'learning';
      cur.updatedAt = completedAt;
      mergedStats[wId] = cur;
    }
  }

  const allSessions = [...sessionMap.values()]
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 50);

  return { stage2Sessions: allSessions, vocabStats: mergedStats };
}

// @desc    Get child client state synced in MongoDB
// @route   GET /api/children/:childId/client-state
// @access  Private (own child / teacher / admin)
const getClientState = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const child = await User.findById(childId).select('_id role');
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const [doc, stage2Events] = await Promise.all([
      ChildClientState.findOne({ child: childId }).lean(),
      LearningEvent.find({ child: childId, stage: 2 }).sort({ createdAt: -1 }).limit(30).lean()
    ]);

    const { stage2Sessions, vocabStats } = deriveSessionsAndStatsFromEvents(
      childId,
      stage2Events,
      doc?.stage2Sessions || [],
      doc?.vocabStats || {}
    );

    res.status(200).json({
      success: true,
      data: {
        child: String(childId),
        vocabStats,
        vocabSelfMarks: doc?.vocabSelfMarks || {},
        lessonStates: doc?.lessonStates || {},
        stage2Sessions,
        preferences: {
          videoAutoNext: doc?.preferences?.videoAutoNext ?? true,
          flashcardFlipGuided: doc?.preferences?.flashcardFlipGuided ?? false,
          enableSpeakCoach: doc?.preferences?.enableSpeakCoach ?? true
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upsert/merge child client state in MongoDB
// @route   PUT /api/children/:childId/client-state
// @access  Private (own child)
const updateClientState = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const body = req.body || {};

    let doc = await ChildClientState.findOne({ child: childId });
    if (!doc) {
      doc = new ChildClientState({
        child: childId,
        vocabStats: {},
        vocabSelfMarks: {},
        lessonStates: {},
        stage2Sessions: [],
        preferences: {
          videoAutoNext: true,
          flashcardFlipGuided: false,
          enableSpeakCoach: true
        }
      });
    }

    if (body.vocabStats && typeof body.vocabStats === 'object') {
      doc.vocabStats = { ...(doc.vocabStats || {}), ...body.vocabStats };
      doc.markModified('vocabStats');
    }

    if (body.vocabSelfMarks && typeof body.vocabSelfMarks === 'object') {
      doc.vocabSelfMarks = { ...(doc.vocabSelfMarks || {}), ...body.vocabSelfMarks };
      doc.markModified('vocabSelfMarks');
    }

    if (body.lessonId && body.lessonState && typeof body.lessonState === 'object') {
      const lid = String(body.lessonId);
      const currentLessonStates = { ...(doc.lessonStates || {}) };
      currentLessonStates[lid] = {
        ...(currentLessonStates[lid] || {}),
        ...body.lessonState,
        updatedAt: Date.now()
      };
      doc.lessonStates = currentLessonStates;
      doc.markModified('lessonStates');
    }

    if (body.stage2Session && typeof body.stage2Session === 'object' && body.stage2Session.sessionId) {
      const existing = Array.isArray(doc.stage2Sessions) ? doc.stage2Sessions : [];
      doc.stage2Sessions = [
        body.stage2Session,
        ...existing.filter(s => s && s.sessionId !== body.stage2Session.sessionId)
      ].slice(0, 50);
      doc.markModified('stage2Sessions');
    }

    if (body.preferences && typeof body.preferences === 'object') {
      if (typeof body.preferences.videoAutoNext === 'boolean') {
        doc.preferences.videoAutoNext = body.preferences.videoAutoNext;
      }
      if (typeof body.preferences.flashcardFlipGuided === 'boolean') {
        doc.preferences.flashcardFlipGuided = body.preferences.flashcardFlipGuided;
      }
      if (typeof body.preferences.enableSpeakCoach === 'boolean') {
        doc.preferences.enableSpeakCoach = body.preferences.enableSpeakCoach;
      }
    }

    await doc.save();

    res.status(200).json({
      success: true,
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear child practice vocabStats in MongoDB
// @route   DELETE /api/children/:childId/client-state/vocab-stats
// @access  Private (own child)
const clearVocabStats = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const doc = await ChildClientState.findOneAndUpdate(
      { child: childId },
      { $set: { vocabStats: {} }, $setOnInsert: { child: childId } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClientState,
  updateClientState,
  clearVocabStats
};

