const STAR_THRESHOLDS = Object.freeze({ one: 50, two: 70, three: 90 });

const calculateStars = (score, maxScore) => {
  if (!Number.isFinite(maxScore) || maxScore <= 0) return 0;
  const percentage = (Math.max(0, Number(score) || 0) / maxScore) * 100;
  if (percentage >= STAR_THRESHOLDS.three) return 3;
  if (percentage >= STAR_THRESHOLDS.two) return 2;
  if (percentage >= STAR_THRESHOLDS.one) return 1;
  return 0;
};

/**
 * Rate a Lesson from the best recorded result for each active activity.
 * Activities are weighted by their possible points; retries can improve but
 * never reduce a child's Lesson result. A Lesson receives stars only after
 * every active activity has at least one result.
 */
const calculateLessonStars = (activities, results) => {
  if (!activities.length) {
    return { completed: false, stars: 0, score: 0, maxScore: 0, percentage: 0 };
  }

  const activityIds = new Set(activities.map((activity) => String(activity._id)));
  const bestScores = new Map();
  for (const result of results) {
    const activityId = String(result.activity);
    if (!activityIds.has(activityId)) continue;
    const score = Math.max(0, Number(result.score) || 0);
    bestScores.set(activityId, Math.max(bestScores.get(activityId) || 0, score));
  }

  let score = 0;
  let maxScore = 0;
  for (const activity of activities) {
    const activityId = String(activity._id);
    const questions = Array.isArray(activity.questions) ? activity.questions.length : 0;
    const questionCount = questions || Number(activity.questionCount) || 1;
    const pointsPerQuestion = Number(activity.pointsPerQuestion) || 10;
    maxScore += questionCount * pointsPerQuestion;
    if (bestScores.has(activityId)) score += Math.min(bestScores.get(activityId), questionCount * pointsPerQuestion);
  }

  const completed = activities.every((activity) => bestScores.has(String(activity._id)));
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  return {
    completed,
    stars: completed ? calculateStars(score, maxScore) : 0,
    score,
    maxScore,
    percentage
  };
};

module.exports = { STAR_THRESHOLDS, calculateStars, calculateLessonStars };
