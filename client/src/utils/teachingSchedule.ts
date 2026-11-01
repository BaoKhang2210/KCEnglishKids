type Slot = { dayOfWeek: number; startTime: string; endTime: string; lesson?: string | { _id: string; title?: string; vietnameseTitle?: string } | null };
type Schedule = { _id: string; isActive?: boolean; effectiveFrom?: string; effectiveTo?: string | null; weeklySlots: Slot[] };
type Lesson = { _id: string; title: string; vietnameseTitle?: string; isCompleted?: boolean; isNext?: boolean };
export const slotKey = (scheduleId: string, date: string, startTime: string) => `${scheduleId}|${date}|${startTime}`;
export function countsTowardCurriculum(session: {status?:string;teachingOutcome?:{coverage?:string}}) {
  return session.status === 'COMPLETED' && (!session.teachingOutcome?.coverage || session.teachingOutcome.coverage === 'COMPLETE');
}
export function scheduleEffectiveAt(schedule: Schedule, at = new Date()) {
  return schedule.isActive !== false && (!schedule.effectiveFrom || new Date(schedule.effectiveFrom) <= at) && (!schedule.effectiveTo || new Date(schedule.effectiveTo) >= at);
}
export function scheduleSlotAppliesOn(schedule: Schedule, slot: Slot, date: string) {
  return scheduleEffectiveAt(schedule, new Date(`${date}T${slot.startTime}:00+07:00`));
}
/** A forecast is a suggestion only. Completion comes exclusively from ended sessions. */
export function forecastLessons(schedules: Schedule[], lessons: Lesson[], today: string, until: string, now = new Date()) {
  const forecast = new Map<string, Lesson | null>();
  const remaining = lessons.filter(lesson => !lesson.isCompleted);
  const priority = remaining.find(lesson => lesson.isNext);
  const queue = priority ? [priority, ...remaining.filter(lesson => lesson._id !== priority._id)] : [...remaining];
  const date = new Date(today + 'T12:00:00Z');
  // Calendar navigation stays bounded; never loop indefinitely on an invalid range.
  for (let i = 0; i < 3660 && date.toISOString().slice(0, 10) <= until; i++, date.setUTCDate(date.getUTCDate() + 1)) {
    const day = date.toISOString().slice(0, 10);
    const occurrences = schedules.flatMap(schedule => schedule.weeklySlots.filter(slot => slot.dayOfWeek === date.getUTCDay() && scheduleSlotAppliesOn(schedule, slot, day)).map(slot => ({ schedule, slot })))
      .sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    for (const { schedule, slot } of occurrences) {
      if (new Date(`${day}T${slot.endTime}:00+07:00`) < now) continue;
      const fixedId = typeof slot.lesson === 'object' ? slot.lesson?._id : slot.lesson;
      const lesson = fixedId ? lessons.find(item => item._id === fixedId) || null : queue[0] || null;
      if (lesson) { const position = queue.findIndex(item => item._id === lesson._id); if (position >= 0) queue.splice(position, 1); }
      forecast.set(slotKey(schedule._id, day, slot.startTime), lesson);
    }
  }
  return forecast;
}
