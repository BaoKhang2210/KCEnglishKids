const { LearningSession, ActivityResult, Activity, Lesson, Progress } = require('../models');
const { checkAndGrantUnitCompletion } = require('./rewardService');
const { calculateStars, calculateLessonStars } = require('./starService');

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

  if (!Array.isArray(answers) || !questions.length || answers.length !== questions.length ||
    answers.some(a => !a || !Number.isInteger(a.questionIndex) || a.questionIndex < 0 || a.questionIndex >= questions.length || !Number.isFinite(a.responseTimeMs ?? 0) || (a.responseTimeMs ?? 0) < 0) ||
    new Set(answers.map(a => a.questionIndex)).size !== questions.length) throw Object.assign(new Error('Answer every question exactly once.'), { statusCode: 400 });
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

    const vocabularyId = question.vocabulary || null;
    const base = {
      questionIndex,
      selectedOptionId: ans.selectedOptionId ?? null,
      vocabularyId,
      responseTimeMs: ans.responseTimeMs ?? 0,
      correctAnswer: question.correctAnswer
    };

    // Completion-based game — matching all pairs counts as correct.
    if (activity.activityType === 'MEMORY_CARD') {
      return { ...base, isCorrect: String(ans.selectedOptionId || '') === String(question.vocabulary || question.correctAnswer || '') };
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
  const { User } = require('../models');
  if (!await User.exists({ _id: childId, role: 'CHILD', status: 'ACTIVE' }) || !await Lesson.exists({ _id: lessonId, status: 'ACTIVE' })) throw Object.assign(new Error('Học sinh hoặc bài học không hoạt động.'), { statusCode: 400 });
  await require('./childAccess').activeLesson(childId, lessonId);
  const filter={child:childId,lesson:lessonId,status:'IN_PROGRESS'};
  let session;
  try{session=await LearningSession.findOneAndUpdate(filter,{$set:{lastActivityAt:new Date()},$setOnInsert:{startedAt:new Date()}},{upsert:true,returnDocument:'after',setDefaultsOnInsert:true});}
  catch(error){if(error.code!==11000)throw error;session=await LearningSession.findOne(filter);if(!session)throw error;}

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
  duration = 0,
  submissionId
}) => {
  const { User } = require('../models');
  if (!await User.exists({ _id: childId, role: 'CHILD', status: 'ACTIVE' })) throw Object.assign(new Error('Chỉ được lưu kết quả cho học sinh đang hoạt động.'), { statusCode: 400 });
  if (!await Lesson.exists({ _id: lessonId, status: 'ACTIVE' })) throw Object.assign(new Error('Bài học không còn hoạt động.'), { statusCode: 400 });
  const activity = await Activity.findOne({ _id: activityId, lesson: lessonId, status: 'ACTIVE' });
  if (!activity) {
    throw new Error('Activity not found');
  }

  await require('./childAccess').activeLesson(childId, lessonId);
  if (typeof submissionId !== 'string' || !/^[a-zA-Z0-9_-]{8,120}$/.test(submissionId) || !Number.isFinite(duration) || duration < 0 || duration > 86400) throw Object.assign(new Error('Valid submissionId and duration required.'), {statusCode:400});
  // Validate before any session/result write.
  const gradedAnswers = gradeActivityAnswers(activity, answers);
  const payloadHash = require('node:crypto').createHash('sha256').update(JSON.stringify({activityId,lessonId,answers,duration})).digest('hex');
  const existing=await ActivityResult.findOne({child:childId,submissionId});
  if(existing&&existing.payloadHash!==payloadHash)throw Object.assign(new Error('Submission ID already used for different answers.'),{statusCode:409});
  let session;
  if(existing)session=await LearningSession.findOne({_id:existing.session,child:childId,lesson:lessonId});
  if (!existing && sessionId) {
    session = await LearningSession.findOne({ _id: sessionId, child: childId, lesson: lessonId });
    if (!session) throw Object.assign(new Error('Session does not belong to this child and lesson.'), {statusCode:403});
  }
  if (!session) {
    session = await getOrCreateSession(childId, lessonId);
  }

  // Evaluate answers — server-side grading (§3.2.1)
  let correctCount = 0;
  let incorrectCount = 0;

  for (const ans of gradedAnswers) {
    if (ans.isCorrect) correctCount++;
    else incorrectCount++;
  }

  const totalQuestions = activity.questions.length || Number(activity.questionCount) || gradedAnswers.length || 1;
  // §4.16 — single source of truth for points (model default is 10)
  const pointsPerQuestion = activity.pointsPerQuestion || 10;
  const maxScore = totalQuestions * pointsPerQuestion;
  const totalScore = correctCount * pointsPerQuestion;
  // Per-game result uses the same fixed 50/70/90% scale as the final Lesson.
  const starsEarned = calculateStars(totalScore, maxScore);

  // 1. Create ActivityResult

  let activityResult;
  const document = {
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
    answers: gradedAnswers, submissionId, payloadHash
  };
  try { activityResult = await ActivityResult.findOneAndUpdate({child:childId,submissionId}, {$setOnInsert:document}, {upsert:true,returnDocument: 'after',setDefaultsOnInsert:true}); }
  catch(error) { if(error.code!==11000) throw error; activityResult=await ActivityResult.findOne({child:childId,submissionId}); }
  if(String(activityResult.session)!==String(session._id))session=await LearningSession.findOne({_id:activityResult.session,child:childId,lesson:lessonId});
  if(!session)throw Object.assign(new Error('Result session missing.'),{statusCode:409});
  if(activityResult.payloadHash!==payloadHash) throw Object.assign(new Error('Submission ID already used for different answers.'),{statusCode:409});

  // 2. Update Session (dedupe hardened: ObjectId vs string compare)
  session.lastActivityAt = new Date();
  session.currentActivity = activityId;
  const alreadyDone = (session.completedActivities || []).some(
    (id) => id.toString() === activityId.toString()
  );
  if (!alreadyDone) {
    session.completedActivities.push(activityId);
  }
  // Recomputed below from persisted best results; retry never increments totals.
  session.stars = Math.max(session.stars || 0, starsEarned);

  // A Lesson's stars are based on its best result for every active activity.
  // Replays may improve an activity score, but cannot lower the Lesson score.
  const lessonActivities = await Activity.find({ lesson: lessonId, status: 'ACTIVE' })
    .select('_id questions questionCount pointsPerQuestion')
    .lean();
  const lessonActivityResults = lessonActivities.length
    ? await ActivityResult.find({ child: childId, lesson: lessonId, activity: { $in: lessonActivities.map((item) => item._id) } })
      .select('activity score answers createdAt')
      .lean()
    : [];
  const lessonRating = calculateLessonStars(lessonActivities, lessonActivityResults);
  session.totalScore = lessonRating.score || 0;

  if (lessonRating.completed) {
    session.status = 'COMPLETED';
    session.completedAt = new Date();
  }
  session.stars = lessonRating.completed ? lessonRating.stars : 0;
  await LearningSession.updateOne({_id:session._id},{$max:{totalScore:session.totalScore,stars:session.stars},$addToSet:{completedActivities:activityId},$set:{lastActivityAt:new Date(),currentActivity:activityId,...(lessonRating.completed?{status:'COMPLETED',completedAt:new Date()}:{})}});

  // 3. Update or create Progress (§1.2.20 — upsert, no E11000 race)
  const lesson = await Lesson.findById(lessonId);
  const topicId = lesson ? lesson.topic : null;

  let unitCompletionsGranted = [];
  let lessonCompleted = false;

  if (topicId) {
    const progress = await Progress.findOneAndUpdate(
      { child: childId, lesson: lessonId },
      {
        $setOnInsert: { topic: topicId, completed: false, weakVocabulary: [] },
        $max: { highestScore: totalScore },

        $set: { lastActivityAt: new Date() }
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    progress.attempts = lessonActivityResults.length;
    // "Lesson complete" is owned by Progress.completed (§4.11) — set once ALL
    // activities of the lesson are done (session.status === 'COMPLETED').
    if (lessonRating.completed && !progress.completed) {
      progress.completed = true;
    }
    if (lessonRating.completed && progress.completionSnapshot?.source !== 'STAGES') {
      progress.stars = lessonRating.stars;
      progress.completionSnapshot = { source: 'CURRENT_ACTIVITIES', recordedAt: new Date(), activityIds: lessonActivities.map(a => a._id) };
    } else if (!progress.completed) {
      progress.stars = 0;
    }

    // Rebuild from distinct persisted submissions, so retry and late responses
    // cannot count mistakes twice. This also repairs a partially saved request.
    const weak = new Map();
    for (const row of [...lessonActivityResults].sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt))) {
      for (const ans of row.answers || []) {
        if(!ans.vocabularyId) continue;
        const key=String(ans.vocabularyId), value=weak.get(key)||{vocabulary:ans.vocabularyId,mistakeCount:0,consecutiveCorrect:0};
        if(ans.isCorrect) { value.consecutiveCorrect++; if(value.consecutiveCorrect>=2){value.mistakeCount=Math.max(0,value.mistakeCount-1);value.consecutiveCorrect=0;} }
        else {value.mistakeCount++;value.consecutiveCorrect=0;}
        weak.set(key,value);
      }
    }
    progress.weakVocabulary=[...weak.values()].filter(v=>v.mistakeCount>0);
    await Progress.updateOne({_id:progress._id},{$max:{stars:progress.stars,highestScore:progress.highestScore,attempts:progress.attempts},$set:{weakVocabulary:progress.weakVocabulary,...(progress.completed?{completed:true,completionSnapshot:progress.completionSnapshot}:{})}});
    lessonCompleted = Boolean(progress.completed);

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
    lessonStars: lessonRating.completed ? lessonRating.stars : null,
    lessonScore: lessonRating.completed
      ? { score: lessonRating.score, maxScore: lessonRating.maxScore, percentage: Math.round(lessonRating.percentage) }
      : null,
    correctCount,
    incorrectCount,
    gradedAnswers,
    isPassed: starsEarned > 0,
    lessonCompleted,
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
  calculateLessonStars,
  gradeActivityAnswers,
  getOrCreateSession,
  processActivityResult
};
