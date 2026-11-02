import { describe, expect, it } from 'vitest';
import { forecastLessons, scheduleSlotAppliesOn, slotKey, countsTowardCurriculum, getSequentialLessonForSlot } from './teachingSchedule';
const schedule = { _id: 's', isActive: true, effectiveFrom: '2026-10-01T00:00:00+07:00', effectiveTo: '2026-11-30T23:59:59+07:00', weeklySlots: [
  { dayOfWeek: 1, startTime: '08:00', endTime: '08:45' }, { dayOfWeek: 3, startTime: '09:00', endTime: '09:45' }
] };
describe('teaching timetable', () => {
  it('does not advance curriculum when an ended lesson needs continuation or was only a review', () => {
    expect(countsTowardCurriculum({status:'COMPLETED',teachingOutcome:{coverage:'CONTINUE'}})).toBe(false);
    expect(countsTowardCurriculum({status:'COMPLETED',teachingOutcome:{coverage:'REVIEW'}})).toBe(false);
    expect(countsTowardCurriculum({status:'COMPLETED',teachingOutcome:{coverage:'COMPLETE'}})).toBe(true);
    expect(countsTowardCurriculum({status:'LIVE',teachingOutcome:{coverage:'COMPLETE'}})).toBe(false);
    expect(countsTowardCurriculum({status:'COMPLETED'})).toBe(true);
  });
  it('forecasts the next untaught lessons across fixed weekly slots without completing any lesson', () => {
    const lessons = [{ _id: 'a', title: 'A', isCompleted: true }, { _id: 'b', title: 'B' }, { _id: 'c', title: 'C' }];
    const forecast = forecastLessons([schedule], lessons, '2026-11-02', '2026-11-08', new Date('2026-11-02T00:00:00+07:00'));
    expect(forecast.get(slotKey('s', '2026-11-02', '08:00'))?._id).toBe('b');
    expect(forecast.get(slotKey('s', '2026-11-04', '09:00'))?._id).toBe('c');
    expect(lessons[1].isCompleted).toBeUndefined();
  });
  it('respects effective periods, old slots and fixed review lessons', () => {
    expect(scheduleSlotAppliesOn(schedule, schedule.weeklySlots[0], '2026-12-07')).toBe(false);
    const fixed = { ...schedule, weeklySlots: [{ ...schedule.weeklySlots[0], lesson: 'a' }, schedule.weeklySlots[1]] };
    const forecast = forecastLessons([fixed], [{ _id: 'a', title: 'A', isCompleted: true }, { _id: 'b', title: 'B' }], '2026-11-02', '2026-11-08', new Date('2026-11-02T00:00:00+07:00'));
    expect(forecast.get(slotKey('s', '2026-11-02', '08:00'))?._id).toBe('a');
    expect(forecast.get(slotKey('s', '2026-11-04', '09:00'))?._id).toBe('b');
  });
  it('progresses lessons sequentially across weeks (Week 1 -> Lessons 1..5, Week 2 -> Lessons 6..10)', () => {
    const fiveDaySchedule = {
      _id: 's5',
      isActive: true,
      effectiveFrom: '2026-11-02T00:00:00+07:00',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:30', endTime: '09:15' },
        { dayOfWeek: 2, startTime: '08:30', endTime: '09:15' },
        { dayOfWeek: 3, startTime: '08:30', endTime: '09:15' },
        { dayOfWeek: 4, startTime: '08:30', endTime: '09:15' },
        { dayOfWeek: 5, startTime: '08:30', endTime: '09:15' }
      ]
    };
    const mockLessons = Array.from({ length: 36 }, (_, i) => ({
      _id: `l${i + 1}`,
      title: `Lesson ${i + 1}`,
      vietnameseTitle: `Bài ${i + 1}`,
      syllabusOrder: i + 1
    }));

    // Week 1 (2026-11-02 to 2026-11-06)
    const w1Mon = getSequentialLessonForSlot(fiveDaySchedule, fiveDaySchedule.weeklySlots[0], '2026-11-02', mockLessons);
    const w1Fri = getSequentialLessonForSlot(fiveDaySchedule, fiveDaySchedule.weeklySlots[4], '2026-11-06', mockLessons);
    expect(w1Mon.lessonNumber).toBe(1);
    expect(w1Mon.title).toBe('Lesson 1');
    expect(w1Fri.lessonNumber).toBe(5);
    expect(w1Fri.title).toBe('Lesson 5');

    // Week 2 (2026-11-09 to 2026-11-13)
    const w2Mon = getSequentialLessonForSlot(fiveDaySchedule, fiveDaySchedule.weeklySlots[0], '2026-11-09', mockLessons);
    const w2Fri = getSequentialLessonForSlot(fiveDaySchedule, fiveDaySchedule.weeklySlots[4], '2026-11-13', mockLessons);
    expect(w2Mon.lessonNumber).toBe(6);
    expect(w2Mon.title).toBe('Lesson 6');
    expect(w2Fri.lessonNumber).toBe(10);
    expect(w2Fri.title).toBe('Lesson 10');

    // Week 3 (2026-11-16 to 2026-11-20)
    const w3Mon = getSequentialLessonForSlot(fiveDaySchedule, fiveDaySchedule.weeklySlots[0], '2026-11-16', mockLessons);
    expect(w3Mon.lessonNumber).toBe(11);
    expect(w3Mon.title).toBe('Lesson 11');
  });
});
