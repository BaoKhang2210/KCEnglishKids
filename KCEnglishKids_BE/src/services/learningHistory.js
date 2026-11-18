const Event = require('../models/LearningEvent');
const HomePracticeCompletion = require('../models/HomePracticeCompletion');
const { calculateStars } = require('./starService');

async function recentHistory(child, legacy, limit = 30) {
  const [stages, homePractices] = await Promise.all([
    Event.find({ child, stage: { $in: [1, 2, 3] } }).populate('lesson', 'title vietnameseTitle').sort({ createdAt: -1 }).limit(limit).lean(),
    HomePracticeCompletion ? HomePracticeCompletion.find({ child }).populate('lesson', 'title vietnameseTitle').sort({ completedAt: -1, createdAt: -1 }).limit(10).lean() : Promise.resolve([])
  ]);

  const rows = legacy.map(value => {
    const row = value.toObject ? value.toObject() : value;
    const count = (row.correctCount || 0) + (row.incorrectCount || 0);
    return { ...row, rawScore: row.score, score: count ? Math.round(100 * row.correctCount / count) : null };
  });

  // Deduplicate rapid repeated submissions for the same stage/lesson within the same minute
  const dedupedStages = [];
  const seenStageKeys = new Set();
  for (const event of stages) {
    const minuteKey = event.createdAt ? new Date(event.createdAt).toISOString().slice(0, 16) : '';
    const key = `${event.lesson?._id || event.lesson}:${event.stage}:${minuteKey}`;
    if (!seenStageKeys.has(key)) {
      seenStageKeys.add(key);
      dedupedStages.push(event);
    }
  }

  for (const event of dedupedStages) {
    const answers = event.answers || [];
    const activityTitle = event.stage === 1
      ? 'Chặng 1: Khám phá từ vựng'
      : event.stage === 3
      ? `Chặng 3: Minigame${event.gameId ? ' (' + event.gameId + ')' : ''}`
      : 'Luyện tập ba vòng';
    const activityType = event.stage === 1 ? 'STAGE_1' : event.stage === 3 ? 'MINIGAME' : 'PRACTICE';
    rows.push({
      ...event,
      source: 'STAGES',
      completed: true,
      activity: { title: activityTitle, activityType, gameId: event.gameId || null },
      stars: event.stage === 1 ? 1 : calculateStars(event.score ?? 100, 100),
      correctCount: answers.filter(a => a.isCorrect).length,
      incorrectCount: answers.filter(a => !a.isCorrect).length
    });
  }

  // Include 5-minute Home Practice completions so teachers see all star-granting activities
  for (const hp of (homePractices || [])) {
    rows.push({
      _id: hp._id,
      child: hp.child,
      lesson: hp.lesson,
      source: 'HOME_PRACTICE',
      completed: true,
      score: 100,
      stars: hp.stars || 3,
      createdAt: hp.completedAt || hp.createdAt,
      activity: {
        title: '5 Phút ôn tập tại nhà cùng ba mẹ',
        activityType: 'HOME_PRACTICE'
      }
    });
  }

  return rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
}

module.exports = { recentHistory };
