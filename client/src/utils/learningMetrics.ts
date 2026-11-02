export function studyTimeLabel(seconds?: number, _measured?: boolean) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value <= 0) return 'Chưa ghi nhận thời lượng';
  if (value < 60) return 'Dưới 1 phút';
  return `${Math.floor(value / 60)} phút`;
}

export function practiceMetrics(stats: any) {
  const answered = Math.max(0, Number(stats?.practiceAnsweredCount) || 0);
  const correct = Math.min(answered, Math.max(0, Number(stats?.practiceCorrectAnswers) || 0));
  return { answered, correct, assessed: answered > 0, accuracy: answered ? Math.round(100 * correct / answered) : null };
}
