import { describe, expect, it } from 'vitest';
import { practiceMetrics, studyTimeLabel } from './learningMetrics';
describe('learning evidence presentation', () => {
  it('does not round a measured short session to zero or invent old durations', () => {
    expect(studyTimeLabel(20, true)).toBe('Dưới 1 phút');
    expect(studyTimeLabel(0, false)).toBe('Chưa ghi nhận thời lượng');
    expect(studyTimeLabel(1800, true)).toBe('30 phút');
  });
  it('classroom 100% cannot become independent-practice 100%', () => {
    expect(practiceMetrics({ averageScore: 100, classroomAccuracy: 100 }).accuracy).toBeNull();
    expect(practiceMetrics({ practiceAnsweredCount: 4, practiceCorrectAnswers: 3 }).accuracy).toBe(75);
  });
});
