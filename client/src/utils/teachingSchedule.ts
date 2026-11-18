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

export function getLessonUnitInfo(
  lesson: any,
  fallbackUnitNumber?: number | null,
  fallbackLessonInUnit?: number | null
): { unitNumber: number | null; lessonInUnit: number | null; label: string } {
  if (!lesson && !fallbackUnitNumber && !fallbackLessonInUnit) {
    return { unitNumber: null, lessonInUnit: null, label: '' };
  }
  const keyMatch = typeof lesson?.key === 'string' ? lesson.key.match(/_U(\d+)_L(\d+)/i) : null;
  const populatedUnit = Array.isArray(lesson?.curriculumUnits)
    ? lesson.curriculumUnits.find((u: any) => typeof u === 'object' && u?.unitNumber !== undefined)
    : null;
  const unitNumber: number | null =
    (typeof lesson?.unitNumber === 'number' && lesson.unitNumber > 0 ? lesson.unitNumber : null) ??
    (typeof populatedUnit?.unitNumber === 'number' && populatedUnit.unitNumber > 0 ? populatedUnit.unitNumber : null) ??
    (keyMatch ? Number(keyMatch[1]) : null) ??
    (typeof fallbackUnitNumber === 'number' && fallbackUnitNumber > 0 ? fallbackUnitNumber : null);

  const lessonInUnit: number | null =
    (typeof lesson?.unitOrder === 'number' && lesson.unitOrder > 0 ? lesson.unitOrder : null) ??
    (keyMatch ? Number(keyMatch[2]) : null) ??
    (typeof lesson?.displayOrder === 'number' && lesson.displayOrder > 0 ? lesson.displayOrder : null) ??
    (typeof fallbackLessonInUnit === 'number' && fallbackLessonInUnit > 0 ? fallbackLessonInUnit : null);

  const label = unitNumber && lessonInUnit
    ? `Unit ${unitNumber} · Lesson ${lessonInUnit}`
    : lessonInUnit
    ? `Lesson ${lessonInUnit}`
    : unitNumber
    ? `Unit ${unitNumber}`
    : '';

  return { unitNumber, lessonInUnit, label };
}

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
export function forecastLessons(
  schedules: Schedule[],
  lessons: Lesson[],
  today: string,
  until: string,
  now = new Date(),
  cancelledDates: Set<string> = new Set()
) {
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
      if (cancelledDates.has(day) || cancelledDates.has(slotKey(schedule._id, day, slot.startTime))) {
        // Cancelled slot holds the current front of the queue without consuming it
        forecast.set(slotKey(schedule._id, day, slot.startTime), queue[0] || remaining[0] || lessons[0] || null);
        continue;
      }
      const fixedId = typeof slot.lesson === 'object' ? slot.lesson?._id : slot.lesson;
      let lesson: Lesson | null = null;
      if (fixedId && lessons.some(item => item._id === fixedId && item.isCompleted)) {
        lesson = lessons.find(item => item._id === fixedId) || null;
      } else {
        lesson = queue.shift() || null;
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

/**
 * Shared Dynamic Conveyor-Belt Queue (Băng chuyền bài học) used by both Admin and Teacher timetables.
 * - Past dates with COMPLETED/LIVE sessions always return the actual taught lesson.
 * - Present & future dates pull sequentially from untaught curriculum lessons.
 * - Cancelled dates hold the current lesson without advancing the queue (automatic roll-over).
 * - Adding/modifying weekly slots never scrambles past or future lesson order.
 */
export function resolveDynamicSlotLesson(
  schedule: Schedule,
  slot: Slot,
  dateStr: string,
  lessons: Lesson[],
  sessions: Array<any> = [],
  todayStr?: string
): {
  lesson: Lesson | null;
  lessonNumber: number;
  unitNumber?: number | null;
  unitLessonNumber?: number | null;
  title: string;
  vietnameseTitle?: string;
  isTaught?: boolean;
  isCancelled?: boolean;
  isUnheld?: boolean;
} {
  const cId = String(typeof schedule.classroom === 'object' ? schedule.classroom?._id : (schedule.classroom || ''));
  const classSessions = (sessions || []).filter((s: any) => {
    if (!cId) return true;
    const sClassId = String(typeof s.classroom === 'object' ? s.classroom?._id : (s.classroom || ''));
    return !sClassId || sClassId === cId;
  });

  const sessionDateOf = (s: any) => {
    const raw = s.startedAt || s.date || s.createdAt;
    if (!raw) return '';
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return new Date(raw).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  const sessionTimeOf = (s: any) => {
    const raw = s.startedAt || s.createdAt;
    if (!raw) return '';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '';
    const vn = new Date(d.getTime() + 7 * 3600000);
    return `${String(vn.getUTCHours()).padStart(2, '0')}:${String(vn.getUTCMinutes()).padStart(2, '0')}`;
  };

  // 1. Check if there is an actual COMPLETED or LIVE session on this exact date (and slot time if multiple slots)
  const sameDaySlots = (schedule.weeklySlots || []).filter((s: any) => s.dayOfWeek === slot.dayOfWeek);
  const taughtSessionOnDate = classSessions.find((s: any) => {
    if (s.status !== 'COMPLETED' && s.status !== 'LIVE') return false;
    if (sessionDateOf(s) !== dateStr) return false;
    if (sameDaySlots.length <= 1) return true;
    const t = sessionTimeOf(s);
    return !t || t === slot.startTime;
  });
  if (taughtSessionOnDate) {
    const taughtLessonId = String(typeof taughtSessionOnDate.lesson === 'object' ? taughtSessionOnDate.lesson?._id : (taughtSessionOnDate.lesson || ''));
    const matchedLesson = (lessons || []).find(l => String(l._id) === taughtLessonId)
      || (typeof taughtSessionOnDate.lesson === 'object' ? taughtSessionOnDate.lesson : null);
    if (matchedLesson) {
      const idx = (lessons || []).findIndex(l => String(l._id) === String(matchedLesson._id));
      const num = matchedLesson.bookOrderIndex || matchedLesson.syllabusOrder || (idx >= 0 ? idx + 1 : 1);
      const uInfo = getLessonUnitInfo(matchedLesson, undefined, num);
      return {
        lesson: matchedLesson,
        lessonNumber: num,
        unitNumber: uInfo.unitNumber,
        unitLessonNumber: uInfo.lessonInUnit,
        title: matchedLesson.title || taughtSessionOnDate.title || `Lesson ${num}`,
        vietnameseTitle: matchedLesson.vietnameseTitle,
        isTaught: true
      };
    }
  }

  // 2. Build the set of completed lesson IDs (from lesson flags + completed curriculum sessions)
  const completedIds = new Set<string>();
  lessons.forEach(l => {
    if (l.isCompleted) completedIds.add(String(l._id));
  });
  classSessions.forEach((s: any) => {
    if (countsTowardCurriculum(s)) {
      const lId = typeof s.lesson === 'object' ? s.lesson?._id : s.lesson;
      if (lId) completedIds.add(String(lId));
    }
  });

  const cancelledDates = new Set<string>();
  const cancelledSlotKeys = new Set<string>();
  const cancelledSessions = new Map<string, any>();
  classSessions.forEach((s: any) => {
    if (s.status === 'CANCELLED') {
      const d = sessionDateOf(s);
      const t = sessionTimeOf(s);
      if (d) {
        cancelledDates.add(d);
        cancelledSessions.set(d, s);
        if (t) {
          cancelledSlotKeys.add(`${d}|${t}`);
          cancelledSessions.set(`${d}|${t}`, s);
        }
      }
    }
  });

  const currentToday = todayStr || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Remaining untaught lessons in strict 1 -> 2 -> 3 syllabus order (never skip Lesson 1)
  const remaining = lessons.filter(l => !completedIds.has(String(l._id)));
  const queueBase = remaining.length > 0 ? [...remaining] : [...lessons];

  // 3. For past dates (dateStr < currentToday) where no session was held:
  if (dateStr < currentToday) {
    if (cancelledDates.has(dateStr)) {
      const cs = cancelledSessions.get(dateStr);
      const held = queueBase[0] || lessons[0];
      const idx = lessons.findIndex(l => String(l._id) === String(held?._id));
      const num = held?.bookOrderIndex || held?.syllabusOrder || (idx >= 0 ? idx + 1 : 1);
      return {
        lesson: held || null,
        lessonNumber: num,
        title: 'Đã báo nghỉ',
        vietnameseTitle: cs?.cancellationReason || 'Đã báo nghỉ',
        isCancelled: true
      };
    }
    // Past slot where no actual teaching took place: mark as unheld and do NOT consume any lesson!
    return {
      lesson: null,
      lessonNumber: 0,
      title: 'Chưa tổ chức',
      vietnameseTitle: 'Chưa tổ chức buổi dạy',
      isUnheld: true
    };
  }

  if (!lessons || lessons.length === 0) {
    const fallback = getSequentialLessonForSlot(schedule, slot, dateStr, lessons, 'sequential');
    return { ...fallback };
  }

  // 4. Dynamic Conveyor Belt: starts directly from currentToday using untaught lessons queue
  const queue = [...queueBase];
  const cursor = new Date(`${currentToday}T12:00:00Z`);
  const sortedSlots = [...(schedule.weeklySlots || [])].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  for (let step = 0; step < 730; step++) {
    const dStr = cursor.toISOString().slice(0, 10);
    if (dStr > dateStr) break;
    const dayOfWeek = cursor.getUTCDay();
    const daySlots = sortedSlots.filter(s => s.dayOfWeek === dayOfWeek && scheduleSlotAppliesOn(schedule, s, dStr));

    for (const s of daySlots) {
      const isTarget = dStr === dateStr && s.dayOfWeek === slot.dayOfWeek && s.startTime === slot.startTime;
      const isCancelledSlot = daySlots.length > 1
        ? cancelledSlotKeys.has(`${dStr}|${s.startTime}`)
        : (cancelledSlotKeys.has(`${dStr}|${s.startTime}`) || cancelledDates.has(dStr));

      if (isCancelledSlot) {
        if (isTarget) {
          const held = queue[0] || queueBase[0] || lessons[0];
          const idx = lessons.findIndex(l => String(l._id) === String(held?._id));
          const num = held?.bookOrderIndex || held?.syllabusOrder || (idx >= 0 ? idx + 1 : 1);
          const uInfo = getLessonUnitInfo(held, undefined, num);
          return {
            lesson: held || null,
            lessonNumber: num,
            unitNumber: uInfo.unitNumber,
            unitLessonNumber: uInfo.lessonInUnit,
            title: held?.title || `Lesson ${num}`,
            vietnameseTitle: held?.vietnameseTitle,
            isCancelled: true
          };
        }
        // Cancelled slot does NOT dequeue! Lesson rolls over to next slot.
        continue;
      }

      // Check if a session on dStr (matching this slot time when >1 slots) already completed a specific lesson
      const taughtOnSlot = classSessions.find((sess: any) => {
        if (sess.status !== 'COMPLETED' && sess.status !== 'LIVE') return false;
        if (sessionDateOf(sess) !== dStr) return false;
        if (daySlots.length <= 1) return true;
        const t = sessionTimeOf(sess);
        return !t || t === s.startTime;
      });
      if (taughtOnSlot) {
        const tId = String(typeof taughtOnSlot.lesson === 'object' ? taughtOnSlot.lesson?._id : (taughtOnSlot.lesson || ''));
        const qIdx = queue.findIndex(l => String(l._id) === tId);
        if (qIdx >= 0) queue.splice(qIdx, 1);
        continue;
      }

      const nextLesson = queue.length > 0 ? queue.shift()! : lessons[step % lessons.length];
      if (isTarget) {
        const idx = lessons.findIndex(l => String(l._id) === String(nextLesson?._id));
        const num = nextLesson?.bookOrderIndex || nextLesson?.syllabusOrder || (idx >= 0 ? idx + 1 : 1);
        const uInfo = getLessonUnitInfo(nextLesson, undefined, num);
        return {
          lesson: nextLesson || null,
          lessonNumber: num,
          unitNumber: uInfo.unitNumber,
          unitLessonNumber: uInfo.lessonInUnit,
          title: nextLesson?.title || `Lesson ${num}`,
          vietnameseTitle: nextLesson?.vietnameseTitle
        };
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const fallbackLesson = queue[0] || queueBase[0] || lessons[0];
  const fIdx = lessons.findIndex(l => String(l._id) === String(fallbackLesson?._id));
  const fNum = fallbackLesson?.bookOrderIndex || fallbackLesson?.syllabusOrder || (fIdx >= 0 ? fIdx + 1 : 1);
  const fUnitInfo = getLessonUnitInfo(fallbackLesson, undefined, fNum);
  return {
    lesson: fallbackLesson || null,
    lessonNumber: fNum,
    unitNumber: fUnitInfo.unitNumber,
    unitLessonNumber: fUnitInfo.lessonInUnit,
    title: fallbackLesson?.title || `Lesson ${fNum}`,
    vietnameseTitle: fallbackLesson?.vietnameseTitle
  };
}
