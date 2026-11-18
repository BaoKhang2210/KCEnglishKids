type Slot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  lesson?: string | { _id: string; title?: string; vietnameseTitle?: string } | null;
  lessonNumber?: number | null;
  lessonTitle?: string;
  room?: string;
  subjectNote?: string;
};

type Schedule = {
  _id: string;
  isActive?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string | null;
  weeklySlots: Slot[];
  classroom?: any;
  colorTag?: string;
};

type Lesson = {
  _id: string;
  title: string;
  vietnameseTitle?: string;
  isCompleted?: boolean;
  isNext?: boolean;
  syllabusOrder?: number;
  bookOrderIndex?: number;
};

export function cleanReason(reason?: string): string {
  if (!reason) return 'Nghỉ theo kế hoạch';
  return reason
    .replace(/\s*\((.*?)\)/g, ' - $1')
    .replace(/[()]/g, '')
    .replace(/^[\s\-–—]+/, '')
    .trim();
}

export const slotKey = (scheduleId: string, date: string, startTime: string) => `${scheduleId}|${date}|${startTime}`;

export function countsTowardCurriculum(session: { status?: string; teachingOutcome?: { coverage?: string } }) {
  return session.status === 'COMPLETED' && (!session.teachingOutcome?.coverage || session.teachingOutcome.coverage === 'COMPLETE');
}

export function scheduleEffectiveAt(schedule: Schedule, at = new Date()) {
  return schedule.isActive !== false && (!schedule.effectiveFrom || new Date(schedule.effectiveFrom) <= at) && (!schedule.effectiveTo || new Date(schedule.effectiveTo) >= at);
}

export function scheduleSlotAppliesOn(schedule: Schedule, slot: Slot, date: string) {
  return scheduleEffectiveAt(schedule, new Date(`${date}T${slot.startTime}:00+07:00`));
}

/**
 * Calculates the sequential curriculum lesson for a recurring timetable slot on a specific date.
 * Week 0: slots 0..4 -> Lessons 1..5
 * Week 1: slots 0..4 -> Lessons 6..10
 * Week 2: slots 0..4 -> Lessons 11..15
 * and progresses sequentially through the syllabus across weeks.
 */
export function getSequentialLessonForSlot(
  schedule: Schedule,
  slot: Slot,
  dateStr: string,
  lessons: Lesson[],
  assignmentMode: 'fixed' | 'sequential' = 'fixed'
): { lesson: Lesson | null; lessonNumber: number; title: string; vietnameseTitle?: string } {
  const fixedId = typeof slot.lesson === 'string' ? slot.lesson : slot.lesson?._id;
  const fixed = (lessons || []).find(lesson => lesson._id === fixedId) || (typeof slot.lesson === 'object' ? slot.lesson : null);
  // Admin previews advance through the syllabus. Stored slot lessons describe
  // the initial recurring template, so they must not pin every future week once completed.
  const isFixedCompleted = Boolean(fixed && (fixed as Lesson).isCompleted);
  if (assignmentMode === 'fixed' && fixed && !isFixedCompleted) {
    return {
      lesson: fixed as Lesson,
      lessonNumber: slot.lessonNumber || (fixed as any).bookOrderIndex || (fixed as any).syllabusOrder || (fixed as any).displayOrder || 1,
      title: fixed.title || slot.lessonTitle || '',
      vietnameseTitle: fixed.vietnameseTitle
    };
  }
  if (!lessons || lessons.length === 0) {
    const fixedTitle = slot.lessonTitle || (typeof slot.lesson === 'object' ? slot.lesson?.title : '') || '';
    return {
      lesson: typeof slot.lesson === 'object' ? (slot.lesson as Lesson) : null,
      lessonNumber: slot.lessonNumber || 1,
      title: fixedTitle || 'Bài học tiếng Anh',
      vietnameseTitle: typeof slot.lesson === 'object' ? slot.lesson?.vietnameseTitle : undefined
    };
  }

  // Sorted weekly slots by day of week (Monday = 1..6, Sunday = 7) and startTime
  const sortedSlots = [...(schedule.weeklySlots || [])].sort((a, b) => {
    const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    if (dayA !== dayB) return dayA - dayB;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const slotsPerWeek = Math.max(1, sortedSlots.length);
  const slotIndex = sortedSlots.findIndex(
    s => s.dayOfWeek === slot.dayOfWeek && s.startTime === slot.startTime
  );
  const safeSlotIndex = slotIndex >= 0 ? slotIndex : 0;

  // Base Monday: anchor from schedule.effectiveFrom or current week Monday
  let baseDate = schedule.effectiveFrom ? new Date(schedule.effectiveFrom) : new Date('2026-11-02T00:00:00+07:00');
  if (isNaN(baseDate.getTime())) baseDate = new Date('2026-11-02T00:00:00+07:00');
  const baseDay = baseDate.getDay();
  const baseDistToMon = baseDay === 0 ? -6 : 1 - baseDay;
  const baseMonday = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + baseDistToMon);
  baseMonday.setHours(0, 0, 0, 0);

  // Target date Monday
  const targetDate = new Date(dateStr + 'T12:00:00+07:00');
  const targetDay = targetDate.getDay();
  const targetDistToMon = targetDay === 0 ? -6 : 1 - targetDay;
  const targetMonday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + targetDistToMon);
  targetMonday.setHours(0, 0, 0, 0);

  const diffMs = targetMonday.getTime() - baseMonday.getTime();
  const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

  const total = lessons.length;
  const overallIndex = diffWeeks * slotsPerWeek + safeSlotIndex;
  const normalizedIndex = ((overallIndex % total) + total) % total;

  const foundLesson = lessons[normalizedIndex];
  const lessonNumber = foundLesson?.syllabusOrder || foundLesson?.bookOrderIndex || (normalizedIndex + 1);
  const title = foundLesson?.title || `Bài ${lessonNumber}`;
  const vietnameseTitle = foundLesson?.vietnameseTitle;

  return {
    lesson: foundLesson || null,
    lessonNumber,
    title,
    vietnameseTitle
  };
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
      let lesson: Lesson | null = null;
      if (fixedId && lessons.some(item => item._id === fixedId && item.isCompleted)) {
        lesson = lessons.find(item => item._id === fixedId) || null;
      } else {
        const seq = getSequentialLessonForSlot(schedule, slot, day, lessons);
        lesson = seq.lesson || queue[0] || null;
      }
      if (lesson) {
        const position = queue.findIndex(item => item._id === lesson._id);
        if (position >= 0) queue.splice(position, 1);
      }
      forecast.set(slotKey(schedule._id, day, slot.startTime), lesson);
    }
  }
  return forecast;
}
