import { describe, expect, it } from 'vitest';
import { forecastLessons, scheduleSlotAppliesOn, slotKey, countsTowardCurriculum } from './teachingSchedule';
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
});
