const ROUND_CONFIG = require('../../../shared/stage2Rounds.json');
const RATING_CONFIG = Object.freeze({
  secure: { maxWrongAttempts: 0, requiresNoHint: true },
  practice: { maxWrongAttempts: 1 },
});

const REPORT_RATING = Object.freeze({
  SECURE: 'SECURE',
  PRACTICE: 'PRACTICE',
  REVIEW: 'REVIEW',
});

function getRoundRating(answer) {
  const wrongAttempts = answer.wrongAttemptCount || 0;
  if (wrongAttempts > RATING_CONFIG.practice.maxWrongAttempts) return REPORT_RATING.REVIEW;
  if (!answer.isCorrect || answer.usedHint || wrongAttempts > RATING_CONFIG.secure.maxWrongAttempts) return REPORT_RATING.PRACTICE;
  return REPORT_RATING.SECURE;
}

function buildStage2Report(answers = [], words = [], progress = {}, starsEarned = 0) {
  const byWord = new Map();
  for (const answer of answers) {
    if (!answer || !answer.wordId) continue;
    const rounds = byWord.get(String(answer.wordId)) || [];
    const roundConfig = ROUND_CONFIG.find((item) => item.code === Number(answer.round));
    rounds.push({
      ...(roundConfig ? { code: roundConfig.code, key: roundConfig.key, name: roundConfig.name } : {}),
      rating: getRoundRating(answer),
      isCorrect: Boolean(answer.isCorrect),
      wrongAttemptCount: Number.isSafeInteger(answer.wrongAttemptCount) ? answer.wrongAttemptCount : null,
      usedHint: typeof answer.usedHint === 'boolean' ? answer.usedHint : null,
    });
    byWord.set(String(answer.wordId), rounds);
  }

  const rows = words.map((word) => {
    const wordId = String(word._id || word.wordId || '');
    const rounds = (byWord.get(wordId) || []).sort((a, b) => (a.code || 0) - (b.code || 0));
    const rating = !rounds.length ? null
      : rounds.some((round) => round.rating === REPORT_RATING.REVIEW) || rounds.filter((round) => round.rating !== REPORT_RATING.SECURE).length >= 2
        ? REPORT_RATING.REVIEW
        : rounds.some((round) => round.rating !== REPORT_RATING.SECURE) ? REPORT_RATING.PRACTICE : REPORT_RATING.SECURE;
    const identifiableRounds = rounds.filter((round) => round.code != null);
    return {
      wordId,
      english: word.english || '',
      vietnamese: word.vietnamese || '',
      imageUrl: word.imageUrl || '',
      audioUrl: word.audioUrl || '',
      rating,
      rounds: identifiableRounds,
    };
  });
  return {
    version: 1,
    confirmed: true,
    starsEarned: Math.max(0, Number(starsEarned) || 0),
    starsBest: Math.max(0, Number(progress.stars) || 0),
    starsAdded: Math.max(0, Number(starsEarned) || 0),
    completedStage: 2,
    stageStars: {
      stage1: Number(Boolean(progress.stage1Completed)),
      stage2: Number(Boolean(progress.stage2Completed)),
      stage3: Number(Boolean(progress.stage3Completed || new Set(progress.stage3Games || []).size >= 2)),
    },
    words: rows,
  };
}

module.exports = { REPORT_RATING, RATING_CONFIG, getRoundRating, buildStage2Report };
