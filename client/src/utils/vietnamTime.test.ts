import { describe, expect, it } from 'vitest';
import { vietnamClock, vietnamDate, vietnamWallClock, localCalendarDate } from './vietnamTime';
describe('school calendar', () => {
  it('rolls the day at Vietnam midnight', () => {
    const instant = new Date('2026-10-28T17:05:00Z');
    expect(vietnamDate(instant)).toBe('2026-10-29');
    expect(vietnamClock(instant)).toEqual({ day: 4, minutes: 5 });
    const wall = vietnamWallClock(instant);
    expect(localCalendarDate(wall)).toBe('2026-10-29');
    expect(wall.getHours()).toBe(0);
    expect(wall.getMinutes()).toBe(5);
  });
  it('does not turn a selected calendar day into the previous UTC day', () => {
    expect(localCalendarDate(new Date(2026, 9, 28))).toBe('2026-10-28');
  });
});
