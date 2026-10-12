const { LearningSession, ActivityResult, Activity, Lesson, Progress } = require('../models');
const { checkAndGrantUnitCompletion } = require('./rewardService');

/**
 * Calculates star rating based on score percentage
 */
const calculateStars = (score, maxScore = 100, starConfig = { threeStarsMin: 90, twoStarsMin: 70, oneStarMin: 50 }) => {
  if (maxScore <= 0) return 0;
  const percentage = Math.round((score / maxScore) * 100);

  if (percentage >= (starConfig.threeStarsMin || 90)) return 3;
  if (percentage >= (starConfig.twoStarsMin || 70)) return 2;
  if (percentage >= (starConfig.oneStarMin || 50)) return 1;
  return 0;
};

const normalizeText = (value) => (value == null ? '' : value.toString().trim().toLowerCase());

/**
 * §3.2.1 — Canonical server-side grading.
 * Recomputes correctness from `selectedOptionId` against DB options; the
 * client-sent `isCorrect` flag is NEVER trusted for scoring.
 * Special case: MEMORY_CARD is a completion-based game (all pairs matched
 * = every answer counts as correct).
 */
const gradeActivityAnswers = (activity, answers = []) => {
  const questions = activity.questions || [];

  return answers.map((ans, fallbackIdx) => {
    const questionIndex = Number.isInteger(ans.questionIndex) ? ans.questionIndex : fallbackIdx;
    const question = questions[questionIndex];

    if (!question) {
      return {
        questionIndex,
        selectedOptionId: ans.selectedOptionId ?? null,
        isCorrect: false,
        vocabularyId: ans.vocabularyId ?? null,
        responseTimeMs: ans.responseTimeMs ?? 0,
        unverifiable: true
      };
    }

    const vocabularyId = question.vocabulary || ans.vocabularyId || null;
    const base = {
      questionIndex,
      selectedOptionId: ans.selectedOptionId ?? null,
      vocabularyId,
      responseTimeMs: ans.responseTimeMs ?? 0,
      correctAnswer: question.correctAnswer
    };

    // Completion-based game — matching all pairs counts as correct.
    if (activity.activityType === 'MEMORY_CARD') {
      return { ...base, isCorrect: true };
    }

    // 1) Canonical path: match the selected option id against server options.
    if (ans.selectedOptionId) {
      const option = (question.options || []).find((o) => o.id === ans.selectedOptionId);
      if (option) {
        return { ...base, isCorrect: !!option.isCorrect };
      }

      // TRUE_FALSE synthetic ids (only used when seed data omits options).
      if (ans.selectedOptionId === 'opt_true' || ans.selectedOptionId === 'opt_false') {
        const expected = normalizeText(question.correctAnswer);
        const wantsTrue = ans.selectedOptionId === 'opt_true';
        const isCorrect = wantsTrue
          ? ['true', 'yes', 'đúng', 'dung'].includes(expected)
          : ['false', 'no', 'sai'].includes(expected);
        return { ...base, isCorrect };
      }
    }

    // 2) Text answers (typing / sentence building).
    const text = ans.answerText ?? ans.selectedText;
    if (typeof text === 'string' && text.trim() && question.correctAnswer) {
      return { ...base, isCorrect: normalizeText(text) === normalizeText(question.correctAnswer) };
    }

    // 3) No verifiable payload — score as wrong (never trust client flags).
    return { ...base, isCorrect: false, unverifiable: true };
  });
};

/**
 * Start or resume a learning session for child and lesson
 */
const getOrCreateSession = async (childId, lessonId) => {
  let session = await LearningSession.findOne({
    child: childId,
    lesson: lessonId,
    status: 'IN_PROGRESS'
  });

  if (!session) {
    session = await LearningSession.create({
      child: childId,
      lesson: lessonId,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      lastActivityAt: new Date()
    });
  } else {
    session.lastActivityAt = new Date();
    await session.save();
  }

  return session;
};

/**
 * Submit activity result, update session, and persist child progress.
 * §1.2.9 — after Progress is saved, check whether the lesson's unit is now
 * fully complete and auto-grant rewards (idempotent).
 */
const processActivityResult = async ({
  childId,
  activityId,
  lessonId,
  sessionId,
  answers = [],
  duration = 0
}) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }

  let session;
  if (sessionId) {
    session = await LearningSession.findById(sessionId);
  }
  if (!session) {
    session = await getOrCreateSession(childId, lessonId);
  }

  // Evaluate answers — server-side grading (§3.2.1)
  const gradedAnswers = gradeActivityAnswers(activity, answers);
  let correctCount = 0;
  let incorrectCount = 0;

  for (const ans of gradedAnswers) {
    if (ans.isCorrect) correctCount++;
    else incorrectCount++;
  }

  const totalQuestions = activity.questions.length || gradedAnswers.length || 1;
  // §4.16 — single source of truth for points (model default is 10)
  const pointsPerQuestion = activity.pointsPerQuestion || 10;
  const maxScore = totalQuestions * pointsPerQuestion;
  const totalScore = correctCount * pointsPerQuestion;
  const starsEarned = calculateStars(totalScore, maxScore, activity.starConfig);

  // 1. Create ActivityResult
  const activityResult = await ActivityResult.create({
    child: childId,
    activity: activityId,
    lesson: lessonId,
    session: session._id,
    score: totalScore,
    stars: starsEarned,
    correctCount,
    incorrectCount,
    attempts: 1,
    duration,
    completed: true,
    answers: gradedAnswers
  });

  // 2. Update Session (dedupe hardened: ObjectId vs string compare)
  session.lastActivityAt = new Date();
  session.currentActivity = activityId;
  const alreadyDone = (session.completedActivities || []).some(
    (id) => id.toString() === activityId.toString()
  );
  if (!alreadyDone) {
    session.completedActivities.push(activityId);
  }
  session.totalScore = (session.totalScore || 0) + totalScore;
  session.stars = Math.max(session.stars || 0, starsEarned);

  // Check if all activities of this lesson are completed
  const totalLessonActivities = await Activity.countDocuments({ lesson: lessonId, status: 'ACTIVE' });
  if (session.completedActivities.length >= totalLessonActivities && totalLessonActivities > 0) {
    session.status = 'COMPLETED';
    session.completedAt = new Date();
  }
  await session.save();

  // 3. Update or create Progress (§1.2.20 — upsert, no E11000 race)
  const lesson = await Lesson.findById(lessonId);
  const topicId = lesson ? lesson.topic : null;

  let unitCompletionsGranted = [];

  if (topicId) {
    const progress = await Progress.findOneAndUpdate(
      { child: childId, lesson: lessonId },
      {
        $setOnInsert: { topic: topicId, completed: false, weakVocabulary: [] },
        $max: { stars: starsEarned, highestScore: totalScore },
        $inc: { attempts: 1 },
        $set: { lastActivityAt: new Date() }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // "Lesson complete" is owned by Progress.completed (§4.11) — set once ALL
    // activities of the lesson are done (session.status === 'COMPLETED').
    if (session.status === 'COMPLETED' && !progress.completed) {
      progress.completed = true;
    }

    // §4.10 — weakVocabulary must be able to shrink: correct answers accumulate
    // streaks; after 2 consecutive correct answers the mistakeCount decreases,
    // and the entry is removed once it reaches 0.
    const weakMap = new Map();
    for (const entry of progress.weakVocabulary || []) {
      if (entry.vocabulary) weakMap.set(entry.vocabulary.toString(), entry);
    }

    for (const ans of gradedAnswers) {
      if (!ans.vocabularyId) continue;
      const key = ans.vocabularyId.toString();

      if (ans.isCorrect) {
        const entry = weakMap.get(key);
        if (!entry) continue;
        entry.consecutiveCorrect = (entry.consecutiveCorrect || 0) + 1;
        if (entry.consecutiveCorrect >= 2) {
          entry.consecutiveCorrect = 0;
          entry.mistakeCount = (entry.mistakeCount || 1) - 1;
        }
      } else {
        const entry = weakMap.get(key);
        if (entry) {
          entry.mistakeCount = (entry.mistakeCount || 0) + 1;
          entry.consecutiveCorrect = 0;
        } else {
          progress.weakVocabulary.push({ vocabulary: ans.vocabularyId, mistakeCount: 1, consecutiveCorrect: 0 });
        }
      }
    }

    // Drop entries that dropped to 0 mistakes
    progress.weakVocabulary = progress.weakVocabulary.filter((entry) => (entry.mistakeCount || 0) > 0);

    await progress.save();

    // §1.2.9 — unit completion hook (idempotent)
    if (progress.completed) {
      unitCompletionsGranted = await checkAndGrantUnitCompletion(childId, lessonId);
    }
  }

  // Find next activity in this lesson
  const allLessonActivities = await Activity.find({ lesson: lessonId, status: 'ACTIVE' }).sort({ order: 1 });
  const currentActIdx = allLessonActivities.findIndex(a => a._id.toString() === activityId.toString());
  const nextAct = (currentActIdx >= 0 && currentActIdx + 1 < allLessonActivities.length)
    ? allLessonActivities[currentActIdx + 1]
    : null;

  return {
    result: activityResult,
    session,
    score: totalScore,
    maxScore,
    stars: starsEarned,
    correctCount,
    incorrectCount,
    gradedAnswers,
    isPassed: starsEarned > 0,
    lessonCompleted: session.status === 'COMPLETED',
    nextActivityId: nextAct ? nextAct._id : null,
    nextActivityTitle: nextAct ? nextAct.title : null,
    unitCompletionsGranted: unitCompletionsGranted.map((doc) => ({
      unitId: doc.unit,
      unitCode: doc.unitCode,
      rewards: doc.rewards
    }))
  };
};

module.exports = {
  calculateStars,
  gradeActivityAnswers,
  getOrCreateSession,
  processActivityResult
};
