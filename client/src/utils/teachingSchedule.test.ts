import { describe, expect, it } from 'vitest';
import { forecastLessons, scheduleSlotAppliesOn, slotKey, countsTowardCurriculum, getSequentialLessonForSlot, resolveDynamicSlotLesson } from './teachingSchedule';
const schedule = { _id: 's', isActive: true, effectiveFrom: '2026-10-01T00:00:00+07:00', effectiveTo: '2026-11-30T23:59:59+07:00', weeklySlots: [
  { dayOfWeek: 1, startTime: '08:00', endTime: '08:45' }, { dayOfWeek: 3, startTime: '09:00', endTime: '09:45' }
] };
describe('teaching timetable', () => {
  it('advances the admin three-session timetable even when its template stores lessons 1, 2, 3', () => {
    const lessons = Array.from({ length: 18 }, (_, index) => ({
      _id: `lesson-${index + 1}`, title: `Lesson ${index + 1}`, syllabusOrder: index + 1
    }));
    const threeDaySchedule = {
      _id: 'class-3-4', effectiveFrom: '2026-11-02T00:00:00+07:00',
      weeklySlots: [1, 3, 5].map((dayOfWeek, index) => ({
        dayOfWeek, startTime: '08:30', endTime: '09:15',
        lesson: lessons[index], lessonNumber: index + 1, lessonTitle: lessons[index].title
      }))
    };
    const weeks = [
      ['2026-11-02', '2026-11-04', '2026-11-06'],
      ['2026-11-09', '2026-11-11', '2026-11-13'],
      ['2026-11-16', '2026-11-18', '2026-11-20']
    ];
    for (const weekIndex of [0, 1, 2, 1, 0]) {
      threeDaySchedule.weeklySlots.forEach((slot, index) => {
        for (const lesson of [slot.lesson, slot.lesson._id]) {
          const result = getSequentialLessonForSlot(threeDaySchedule, { ...slot, lesson }, weeks[weekIndex][index], lessons, 'sequential');
          expect(result.lessonNumber).toBe(weekIndex * 3 + index + 1);
          expect(result.lesson?._id).toBe(lessons[weekIndex * 3 + index]._id);
          expect(result.title).toBe(lessons[weekIndex * 3 + index].title);
        }
      });
    }
  });
  it('uses the assigned People at School lesson ahead of the recurring forecast', () => {
    const lessons = [{ _id: 'l1', title: 'Things at School' }, { _id: 'l2', title: 'People at School' }, { _id: 'l3', title: 'Colors' }];
    const slot = { dayOfWeek: 2, startTime: '08:30', endTime: '09:15', lesson: 'l2', lessonNumber: 2 };
    const result = getSequentialLessonForSlot({ ...schedule, weeklySlots: [slot] }, slot, '2026-11-03', lessons);
    expect(result.lesson?._id).toBe('l2');
    expect(result.title).toBe('People at School');
    expect(result.lessonNumber).toBe(2);
  });
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

  it('dynamic queue rolls over untaught lessons when a session is CANCELLED and stays consistent when adding a 3rd weekly slot', () => {
    const lessons = [
      { _id: 'l1', title: 'Unit 1 - Lesson 1: Hello', isCompleted: true, bookOrderIndex: 1 },
      { _id: 'l2', title: 'Unit 1 - Lesson 2: My Name', isCompleted: true, bookOrderIndex: 2 },
      { _id: 'l3', title: 'Unit 1 - Lesson 3: Story Time', isCompleted: false, isNext: true, bookOrderIndex: 3 },
      { _id: 'l4', title: 'Unit 1 - Lesson 4: Review Game', isCompleted: false, bookOrderIndex: 4 },
      { _id: 'l5', title: 'Unit 2 - Lesson 1: Farm Animals', isCompleted: false, bookOrderIndex: 5 }
    ];

    const expandedSchedule = {
      _id: 'sch-dynamic',
      classroom: 'class-1',
      isActive: true,
      effectiveFrom: '2026-10-01T00:00:00+07:00',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45' }, // Mon
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45' }, // Wed
        { dayOfWeek: 5, startTime: '08:00', endTime: '08:45' }  // Fri (newly added slot)
      ]
    };

    const sessions = [
      { _id: 's1', classroom: 'class-1', status: 'COMPLETED', lesson: 'l1', startedAt: '2026-11-09T08:00:00+07:00' },
      { _id: 's2', classroom: 'class-1', status: 'COMPLETED', lesson: 'l2', startedAt: '2026-11-11T08:00:00+07:00' },
      { _id: 's3', classroom: 'class-1', status: 'CANCELLED', cancellationReason: 'Nghỉ lễ nhà trường', startedAt: '2026-11-16T08:00:00+07:00' }
    ];

    // Past taught session on 2026-11-11 remains immutable (Lesson 2) even after adding Friday slot
    const pastWed = resolveDynamicSlotLesson(expandedSchedule, expandedSchedule.weeklySlots[1], '2026-11-11', lessons, sessions, '2026-11-16');
    expect(pastWed.lesson?._id).toBe('l2');
    expect(pastWed.isTaught).toBe(true);

    // Cancelled Monday (2026-11-16) holds Lesson 3 without consuming it
    const cancelledMon = resolveDynamicSlotLesson(expandedSchedule, expandedSchedule.weeklySlots[0], '2026-11-16', lessons, sessions, '2026-11-16');
    expect(cancelledMon.lesson?._id).toBe('l3');
    expect(cancelledMon.isCancelled).toBe(true);

    // Next slot on Wednesday (2026-11-18) automatically rolls over and teaches Lesson 3!
    const nextWed = resolveDynamicSlotLesson(expandedSchedule, expandedSchedule.weeklySlots[1], '2026-11-18', lessons, sessions, '2026-11-16');
    expect(nextWed.lesson?._id).toBe('l3');
    expect(nextWed.title).toBe('Unit 1 - Lesson 3: Story Time');

    // Newly added Friday slot (2026-11-20) seamlessly receives Lesson 4!
    const nextFri = resolveDynamicSlotLesson(expandedSchedule, expandedSchedule.weeklySlots[2], '2026-11-20', lessons, sessions, '2026-11-16');
    expect(nextFri.lesson?._id).toBe('l4');

    // Following Monday (2026-11-23) receives Lesson 5!
    const followingMon = resolveDynamicSlotLesson(expandedSchedule, expandedSchedule.weeklySlots[0], '2026-11-23', lessons, sessions, '2026-11-16');
    expect(followingMon.lesson?._id).toBe('l5');
  });

  it('Past unheld slot (e.g. 2026-11-16 without session) is marked unheld and rolls Lesson 1 to today (2026-11-18)', () => {
    const lessons: any[] = [
      { _id: 'l1', syllabusOrder: 1, title: 'Things at School', vietnameseTitle: 'Đồ dùng ở trường' },
      { _id: 'l2', syllabusOrder: 2, title: 'People at School', vietnameseTitle: 'Mọi người ở trường' },
      { _id: 'l3', syllabusOrder: 3, title: 'What Can You See?', vietnameseTitle: 'Bé nhìn thấy gì nào?' }
    ];

    const schedule: any = {
      _id: 'sch-1',
      classroom: 'class-preschool',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45' }, // Mon
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45' }, // Wed
        { dayOfWeek: 5, startTime: '08:00', endTime: '08:45' }  // Fri
      ]
    };

    // No sessions took place at all
    const sessions: any[] = [];
    const today = '2026-11-18'; // Wednesday

    // 1. Monday 2026-11-16 was in the past and had no session -> marked unheld
    const pastMon = resolveDynamicSlotLesson(schedule, schedule.weeklySlots[0], '2026-11-16', lessons, sessions, today);
    expect(pastMon.isUnheld).toBe(true);
    expect(pastMon.title).toBe('Chưa tổ chức');

    // 2. Wednesday 2026-11-18 (today) must be Lesson 1 (Things at School) because Lesson 1 was not taught!
    const todayWed = resolveDynamicSlotLesson(schedule, schedule.weeklySlots[1], '2026-11-18', lessons, sessions, today);
    expect(todayWed.lesson?._id).toBe('l1');
    expect(todayWed.lessonNumber).toBe(1);
    expect(todayWed.title).toBe('Things at School');

    // 3. Friday 2026-11-20 (next slot) rolls forward to Lesson 2
    const nextFri = resolveDynamicSlotLesson(schedule, schedule.weeklySlots[2], '2026-11-20', lessons, sessions, today);
    expect(nextFri.lesson?._id).toBe('l2');
    expect(nextFri.lessonNumber).toBe(2);
    expect(nextFri.title).toBe('People at School');
  });

  it('Make-up slot added on Saturday (Day 6) seamlessly takes the next curriculum lesson and pushes future slots', () => {
    const lessons: any[] = [
      { _id: 'l1', syllabusOrder: 1, title: 'Lesson 1: Greetings' },
      { _id: 'l2', syllabusOrder: 2, title: 'Lesson 2: Colors' },
      { _id: 'l3', syllabusOrder: 3, title: 'Lesson 3: Numbers' },
      { _id: 'l4', syllabusOrder: 4, title: 'Lesson 4: Animals' }
    ];

    // Standard schedule: Mon (Day 1) & Wed (Day 3). Plus a make-up slot on Saturday (Day 6)
    const makeupSchedule: any = {
      _id: 'sch-makeup',
      classroom: 'class-1',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45' }, // Mon
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45' }, // Wed
        { dayOfWeek: 6, startTime: '09:00', endTime: '09:45' }  // Sat (Lịch bù)
      ]
    };

    const sessions: any[] = [];
    const today = '2026-11-18'; // Wednesday

    // Wed 18/11 takes Lesson 1 (since Mon 16/11 was unheld)
    const wedSlot = resolveDynamicSlotLesson(makeupSchedule, makeupSchedule.weeklySlots[1], '2026-11-18', lessons, sessions, today);
    expect(wedSlot.lesson?._id).toBe('l1');
    expect(wedSlot.lessonNumber).toBe(1);

    // Make-up slot on Saturday 2026-11-21 automatically receives Lesson 2!
    const satMakeup = resolveDynamicSlotLesson(makeupSchedule, makeupSchedule.weeklySlots[2], '2026-11-21', lessons, sessions, today);
    expect(satMakeup.lesson?._id).toBe('l2');
    expect(satMakeup.lessonNumber).toBe(2);
    expect(satMakeup.title).toBe('Lesson 2: Colors');

    // Following Monday 2026-11-23 receives Lesson 3!
    const nextMon = resolveDynamicSlotLesson(makeupSchedule, makeupSchedule.weeklySlots[0], '2026-11-23', lessons, sessions, today);
    expect(nextMon.lesson?._id).toBe('l3');
    expect(nextMon.lessonNumber).toBe(3);
    expect(nextMon.title).toBe('Lesson 3: Numbers');
  });

  it('when a day has 2 slots and slot 1 is CANCELLED, slot 2 still consumes Lesson 3 and next day gets Lesson 4', () => {
    const lessons = [
      { _id: 'l1', title: 'Lesson 1', isCompleted: true, bookOrderIndex: 1 },
      { _id: 'l2', title: 'Lesson 2', isCompleted: true, bookOrderIndex: 2 },
      { _id: 'l3', title: 'Lesson 3', isCompleted: false, bookOrderIndex: 3 },
      { _id: 'l4', title: 'Lesson 4', isCompleted: false, bookOrderIndex: 4 }
    ];
    const multiSlotSchedule = {
      _id: 'sch-multi',
      classroom: 'class-1',
      isActive: true,
      effectiveFrom: '2026-11-01T00:00:00+07:00',
      weeklySlots: [
        { dayOfWeek: 4, startTime: '07:00', endTime: '21:00' },
        { dayOfWeek: 4, startTime: '22:00', endTime: '22:45' },
        { dayOfWeek: 5, startTime: '07:00', endTime: '21:00' }
      ]
    };
    const sessions = [
      {
        classroom: 'class-1',
        status: 'CANCELLED',
        startedAt: '2026-11-19T07:00:00+07:00'
      }
    ];
    const slot1 = resolveDynamicSlotLesson(multiSlotSchedule, multiSlotSchedule.weeklySlots[0], '2026-11-19', lessons, sessions, '2026-11-19');
    const slot2 = resolveDynamicSlotLesson(multiSlotSchedule, multiSlotSchedule.weeklySlots[1], '2026-11-19', lessons, sessions, '2026-11-19');
    const fri = resolveDynamicSlotLesson(multiSlotSchedule, multiSlotSchedule.weeklySlots[2], '2026-11-20', lessons, sessions, '2026-11-19');
    expect(slot1.isCancelled).toBe(true);
    expect(slot1.lesson?._id).toBe('l3');
    expect(slot2.isCancelled).toBeUndefined();
    expect(slot2.lesson?._id).toBe('l3');
    expect(fri.lesson?._id).toBe('l4');
  });
});
