export function studyTimeLabel(seconds?: number, _measured?: boolean) {
  const value = Math.max(0, Number(seconds) || 0);
  if (value <= 0) return 'Chưa ghi nhận thời lượng';
  if (value < 60) return 'Dưới 1 phút';

  const totalMinutes = Math.floor(value / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
  }
  return `${minutes} phút`;
}

export function practiceMetrics(stats: any) {
  const answered = Math.max(0, Number(stats?.practiceAnsweredCount) || 0);
  const correct = Math.min(answered, Math.max(0, Number(stats?.practiceCorrectAnswers) || 0));
  return { answered, correct, assessed: answered > 0, accuracy: answered ? Math.round(100 * correct / answered) : null };
}

export function needsObservation(stats: any) {
  const practice = practiceMetrics(stats);
  return !practice.assessed || practice.accuracy! < 60;
}
