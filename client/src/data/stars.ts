export const STAR_THRESHOLDS = { one: 50, two: 70, three: 90 } as const;

export const calculateStars = (score: number, maxScore: number): number => {
  if (!Number.isFinite(maxScore) || maxScore <= 0) return 0;
  const percentage = (Math.max(0, score || 0) / maxScore) * 100;
  if (percentage >= STAR_THRESHOLDS.three) return 3;
  if (percentage >= STAR_THRESHOLDS.two) return 2;
  if (percentage >= STAR_THRESHOLDS.one) return 1;
  return 0;
};
