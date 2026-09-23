const { LearningSession, ActivityResult, Activity, Lesson, Progress } = require('../models');

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
 * Submit activity result, update session, and persist child progress
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

  // Evaluate answers
  let correctCount = 0;
  let incorrectCount = 0;
  const incorrectVocabIds = [];

  answers.forEach(ans => {
    if (ans.isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
      if (ans.vocabularyId) {
        incorrectVocabIds.push(ans.vocabularyId);
      }
    }
  });

  const totalQuestions = activity.questions.length || answers.length || 1;
  const pointsPerQuestion = activity.pointsPerQuestion || 25;
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
    answers
  });

  // 2. Update Session
  session.lastActivityAt = new Date();
  session.currentActivity = activityId;
  if (!session.completedActivities.includes(activityId)) {
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

  // 3. Update or create Progress
  const lesson = await Lesson.findById(lessonId);
  const topicId = lesson ? lesson.topic : null;

  if (topicId) {
    let progress = await Progress.findOne({ child: childId, lesson: lessonId });
    if (!progress) {
      progress = new Progress({
        child: childId,
        topic: topicId,
        lesson: lessonId,
        completed: session.status === 'COMPLETED',
        stars: starsEarned,
        highestScore: totalScore,
        attempts: 1,
        weakVocabulary: [],
        lastActivityAt: new Date()
      });
    } else {
      progress.completed = progress.completed || session.status === 'COMPLETED';
      progress.stars = Math.max(progress.stars || 0, starsEarned);
      progress.highestScore = Math.max(progress.highestScore || 0, totalScore);
      progress.attempts = (progress.attempts || 0) + 1;
      progress.lastActivityAt = new Date();
    }

    // Record weak vocabulary for personalized learning
    for (const vocabId of incorrectVocabIds) {
      const existingWeak = progress.weakVocabulary.find(
        w => w.vocabulary && w.vocabulary.toString() === vocabId.toString()
      );
      if (existingWeak) {
        existingWeak.mistakeCount += 1;
      } else {
        progress.weakVocabulary.push({ vocabulary: vocabId, mistakeCount: 1 });
      }
    }

    await progress.save();
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
    isPassed: starsEarned > 0,
    nextActivityId: nextAct ? nextAct._id : null,
    nextActivityTitle: nextAct ? nextAct.title : null
  };
};

module.exports = {
  calculateStars,
  getOrCreateSession,
  processActivityResult
};
