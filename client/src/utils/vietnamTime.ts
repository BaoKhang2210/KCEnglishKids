/** Calendar values for school operations are always in Asia/Ho_Chi_Minh. */
export const vietnamDate = (value = new Date()): string => new Date(value.getTime() + 7 * 3600000).toISOString().slice(0, 10);
export const vietnamClock = (value = new Date()) => {
  const d = new Date(value.getTime() + 7 * 3600000);
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
};
/** Existing timetable views use local Date getters; return the Vietnam wall clock. */
export const vietnamWallClock = (value = new Date()): Date => {
  const d = new Date(value.getTime() + 7 * 3600000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
};
export const localCalendarDate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
