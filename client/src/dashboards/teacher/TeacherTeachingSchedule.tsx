import { scheduleEffectiveAt, scheduleSlotAppliesOn, countsTowardCurriculum, getSequentialLessonForSlot } from '../../utils/teachingSchedule';
import { vietnamDate, vietnamWallClock, localCalendarDate } from '../../utils/vietnamTime';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Play,
  History,
  Check,
  GraduationCap,
  CalendarDays,
  Flame,
  Layers,
  ArrowRight,
  Lock,
  X,
  AlertCircle
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';
import type { ClassroomSession, ClassSchedule } from '../../types';

interface ClassOption {
  _id: string;
  name: string;
  ageGroupCode: string;
  studentCount?: number;
  currentLesson?: any;
  completedLessons?: any[];
}

const COLOR_THEMES: { [key: string]: { bg: string; border: string; text: string; badge: string; dot: string; lightBg: string } } = {
  indigo: {
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-800',
    dot: 'bg-indigo-700',
    lightBg: '#6366f1'
  },
  emerald: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-700',
    lightBg: '#10b981'
  },
  amber: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-900',
    dot: 'bg-amber-700',
    lightBg: '#f59e0b'
  },
  rose: {
    bg: 'bg-rose-50/80',
    border: 'border-rose-200',
    text: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-700',
    lightBg: '#f43f5e'
  },
  purple: {
    bg: 'bg-purple-50/80',
    border: 'border-purple-200',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-700',
    lightBg: '#a855f7'
  },
  sky: {
    bg: 'bg-sky-50/80',
    border: 'border-sky-200',
    text: 'text-sky-900',
    badge: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-700',
    lightBg: '#0ea5e9'
  },
  teal: {
    bg: 'bg-teal-50/80',
    border: 'border-teal-200',
    text: 'text-teal-900',
    badge: 'bg-teal-100 text-teal-800',
    dot: 'bg-teal-700',
    lightBg: '#14b8a6'
  },
  orange: {
    bg: 'bg-orange-50/80',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-900',
    dot: 'bg-orange-700',
    lightBg: '#f97316'
  }
};

const DAY_LABELS: { [key: number]: string } = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  0: 'Chủ Nhật'
};

// Helper: Vietnam timezone time (UTC+7)
const getVietnamNow = vietnamWallClock;

export const TeacherTeachingSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlClassId = searchParams.get('classroomId') || '';
  const urlTab = (searchParams.get('tab') as 'calendar' | 'roadmap') || 'calendar';

  // State
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId || 'ALL');
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [mySchedules, setMySchedules] = useState<ClassSchedule[]>([]);
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Main Tab: 'calendar' (Thời khóa biểu tuần) | 'roadmap' (Lộ trình giáo trình)
  const [activeTab, setActiveTab] = useState<'calendar' | 'roadmap'>(urlTab);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'calendar' || t === 'roadmap') {
      setActiveTab(t);
    }
  }, [searchParams]);

  // Week navigation (offset 0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Live timer tick for real-time schedule gating
  const [currentVnTime, setCurrentVnTime] = useState<Date>(getVietnamNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVnTime(getVietnamNow());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const [reportOffModal, setReportOffModal] = useState<{
    isOpen: boolean;
    classroomId: string;
    className: string;
    dateString: string;
    timeSlot?: { startTime: string; endTime: string };
    sessionId?: string;
    reason: string;
    note: string;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    classroomId: '',
    className: '',
    dateString: '',
    reason: 'Nghỉ lễ theo lịch nhà trường',
    note: '',
    loading: false,
    error: null
  });

  const handleOpenReportOff = (classroomId: string, className: string, dateString: string, timeSlot?: { startTime: string; endTime: string }, sessionId?: string) => {
    setReportOffModal({
      isOpen: true,
      classroomId,
      className,
      dateString,
      timeSlot,
      sessionId,
      reason: 'Nghỉ lễ theo lịch nhà trường',
      note: '',
      loading: false,
      error: null
    });
  };

  const handleSubmitReportOff = async () => {
    if (!reportOffModal.classroomId) return;
    try {
      setReportOffModal(prev => ({ ...prev, loading: true, error: null }));
      if (reportOffModal.sessionId) {
        await classroomSessionApi.cancelSession(reportOffModal.sessionId, {
          reason: reportOffModal.reason,
          note: reportOffModal.note
        });
      } else {
        await classroomSessionApi.reportOff({
          classroomId: reportOffModal.classroomId,
          date: reportOffModal.dateString,
          reason: reportOffModal.reason,
          note: reportOffModal.note,
          timeSlot: reportOffModal.timeSlot
        });
      }
      setReportOffModal(prev => ({ ...prev, isOpen: false, loading: false }));
      const sessRes = await classroomSessionApi.getSessions();
      setSessions(sessRes.data || []);
    } catch (err: any) {
      setReportOffModal(prev => ({ ...prev, loading: false, error: err?.message || 'Không thể gửi báo nghỉ' }));
    }
  };

  const handleRestoreSession = async (sessionId: string) => {
    if (!window.confirm('Bạn có chắc muốn hủy báo nghỉ và mở lại lịch học bình thường cho ca này?')) return;
    try {
      await classroomSessionApi.restoreCancelledSession(sessionId);
      const sessRes = await classroomSessionApi.getSessions();
      setSessions(sessRes.data || []);
    } catch (err: any) {
      alert(err?.message || 'Không thể hủy báo nghỉ');
    }
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clsRes, sessRes, currRes, schedRes] = await Promise.all([
          teacherApi.getClasses(),
          classroomSessionApi.getSessions(),
          teacherApi.getContent(),
          teacherApi.getMySchedule()
        ]);

        const clsList = Array.isArray(clsRes) ? clsRes : (clsRes?.data || clsRes?.classes || []);
        setClasses(clsList);
        if (urlClassId && clsList.some((room: ClassOption) => room._id === urlClassId)) {
          setSelectedClassId(urlClassId);
        } else if (urlClassId) {
          setSelectedClassId('ALL');
          setError('Lớp trong liên kết không thuộc phân công hiện tại. Đang hiển thị các lớp của bạn.');
        } else if (clsList.length === 1) {
          // 1-1 teacher-to-class rule: auto-select their single assigned class
          setSelectedClassId(String(clsList[0]._id));
        }

        const sList = Array.isArray(sessRes) ? sessRes : (sessRes?.data || []);
        const assigned = new Set(clsList.map((room: ClassOption) => room._id));
        setSessions(sList.filter((session: ClassroomSession) => assigned.has(typeof session.classroom === 'object' ? session.classroom?._id : session.classroom)));

        const curr = currRes?.data || currRes;
        setCurriculumData(curr);

        const mySchedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
        setMySchedules(mySchedList.filter((schedule: ClassSchedule) => assigned.has(typeof schedule.classroom === 'object' ? schedule.classroom?._id : schedule.classroom)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Không thể tải lịch giảng dạy.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [urlClassId]);

  // Selected class object
  const activeClass = useMemo(() => {
    if (selectedClassId === 'ALL') return classes[0] || null;
    return classes.find((c) => String(c._id) === String(selectedClassId)) || classes[0] || null;
  }, [classes, selectedClassId]);

  const effectiveClassId = activeClass?._id || '';

  // Filtered sessions strictly for this class in Roadmap
  const roadmapSessions = useMemo(() => {
    if (!effectiveClassId) return sessions.filter(s => s.status === 'COMPLETED');
    return sessions.filter((s: any) => {
      const cId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      return cId === String(effectiveClassId) && s.status === 'COMPLETED';
    });
  }, [sessions, effectiveClassId]);

  // Filtered sessions based on selected classroom
  const filteredSessions = useMemo(() => {
    if (selectedClassId === 'ALL') return sessions;
    return sessions.filter((s: any) => {
      const cId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      return cId === String(selectedClassId);
    });
  }, [sessions, selectedClassId]);

  // Filtered scheduled fixed slots from Admin based on selected classroom
  const filteredMySchedules = useMemo(() => {
    if (selectedClassId === 'ALL') return mySchedules;
    return mySchedules.filter((s: any) => {
      const cId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      return cId === String(selectedClassId);
    });
  }, [mySchedules, selectedClassId]);

  // Target book number based on activeClass ageGroupCode
  const targetBookNumber = useMemo(() => {
    if (!activeClass?.ageGroupCode) return 1;
    if (activeClass.ageGroupCode === '3-4') return 1;
    if (activeClass.ageGroupCode === '4-5') return 2;
    if (activeClass.ageGroupCode === '5-6') return 3;
    return 1;
  }, [activeClass]);

  // Calendar dates computation (Monday to Sunday for current weekOffset)
  const currentWeekDays = useMemo(() => {
    const now = currentVnTime;
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);

    // Find Monday (1)
    const currentDayOfWeek = targetDate.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    const dayNums = [1, 2, 3, 4, 5, 6, 0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      days.push({
        dayIndex: i,
        dayNum: dayNums[i],
        dayName: dayNames[i],
        date: d,
        dateString: localCalendarDate(d),
        formattedDate: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday
      });
    }

    return days;
  }, [weekOffset, currentVnTime]);

  // Map sessions to calendar dates
  const calendarDaySessions = useMemo(() => {
    const map: Record<string, ClassroomSession[]> = {};

    filteredSessions.forEach((s) => {
      const timestamp = s.startedAt || s.createdAt;
      const dateKey = timestamp ? vietnamDate(new Date(timestamp)) : '';
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = [];
        map[dateKey].push(s);
      }
    });

    return map;
  }, [filteredSessions]);

  // Map scheduled fixed timetable slots by dayNum (1..6, 0)
  const fixedTimetableByDay = useMemo(() => {
    const map: Record<number, Array<{ schedule: ClassSchedule; slot: any }>> = {};
    [1, 2, 3, 4, 5, 6, 0].forEach(d => { map[d] = []; });

    filteredMySchedules.forEach(sch => {
      sch.weeklySlots?.forEach(slot => {
        if (map[slot.dayOfWeek] !== undefined) {
          map[slot.dayOfWeek].push({ schedule: sch, slot });
        }
      });
    });

    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
      map[d].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    return map;
  }, [filteredMySchedules]);

  // ── Requirement 10: Strict Timetable Timing Evaluation ─────────────────────
  const scheduleLiveTiming = useMemo(() => {
    const currentDay = currentVnTime.getDay(); // 0 is Sun, 1 is Mon
    const currentMinutes = currentVnTime.getHours() * 60 + currentVnTime.getMinutes();

    const activeSchedules = mySchedules.filter(schedule => scheduleEffectiveAt(schedule));
    const relevantSchedules = selectedClassId && selectedClassId !== 'ALL'
      ? activeSchedules.filter((s: any) => {
          const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
          return String(cId) === String(selectedClassId);
        })
      : activeSchedules;

    if (relevantSchedules.length === 0) {
      return {
        canTeachNow: false,
        activeSlot: null,
        activeClassroom: null,
        nextSlotText: null,
        hasSchedule: false,
        reason: 'Lớp học chưa có thời khóa biểu phân công từ Ban Quản Trị.'
      };
    }

    let activeSlot: any = null;
    let todaySlot: any = null;
    let activeClassroom: any = null;
    const upcomingList: Array<{ slot: any; schedule: any; distanceMinutes: number; dateStr: string }> = [];

    for (const sch of relevantSchedules) {
      for (const slot of sch.weeklySlots || []) {
        const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        if (slot.dayOfWeek === currentDay) {
          if (!todaySlot) {
            todaySlot = slot;
            if (!activeClassroom) activeClassroom = sch.classroom;
          }
          // Active slot window: 15 minutes before start up to 30 minutes after end
          if (currentMinutes >= (startMin - 15) && currentMinutes <= (endMin + 30)) {
            activeSlot = slot;
            activeClassroom = sch.classroom;
          }
        }

        // Distance in future
        let dayDiff = slot.dayOfWeek - currentDay;
        if (dayDiff < 0 || (dayDiff === 0 && startMin < currentMinutes)) {
          dayDiff += 7;
        }
        const distance = dayDiff * 24 * 60 + (startMin - currentMinutes);
        const targetDate = new Date(currentVnTime);
        targetDate.setDate(targetDate.getDate() + dayDiff);
        const dateStr = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;

        upcomingList.push({
          slot,
          schedule: sch,
          distanceMinutes: distance,
          dateStr
        });
      }
    }

    const todayStr = vietnamDate();
    const cancelledTodayForClass = sessions.find((s: any) => {
      const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
      const sDate = s.startedAt ? s.startedAt.slice(0, 10) : (s.createdAt ? s.createdAt.slice(0, 10) : '');
      return String(cId) === String(selectedClassId) && s.status === 'CANCELLED' && sDate === todayStr;
    });

    if (cancelledTodayForClass) {
      return {
        canTeachNow: false,
        activeSlot: null,
        activeClassroom: null,
        nextSlotText: null,
        hasSchedule: true,
        reason: `Lớp đã báo nghỉ ca dạy hôm nay (${cancelledTodayForClass.cancellationReason || 'Nghỉ theo kế hoạch'}). Tiến độ bài học được tự động bảo lưu cho buổi học tiếp theo.`
      };
    }

    const effectiveSlot = activeSlot || todaySlot;
    if (effectiveSlot) {
      const isExactWindow = !!activeSlot;
      return {
        canTeachNow: true,
        activeSlot: effectiveSlot,
        activeClassroom: activeClassroom || effectiveSlot.classroom,
        nextSlotText: null,
        hasSchedule: true,
        reason: isExactWindow
          ? `Đang trong khung giờ dạy (${effectiveSlot.startTime} - ${effectiveSlot.endTime})`
          : `Lịch dạy hôm nay: ${DAY_LABELS[effectiveSlot.dayOfWeek]} (${effectiveSlot.startTime} - ${effectiveSlot.endTime}) - Đã sẵn sàng mở lớp`
      };
    }

    upcomingList.sort((a, b) => a.distanceMinutes - b.distanceMinutes);
    const nextItem = upcomingList[0] || null;

    let nextSlotText = null;
    if (nextItem) {
      const hours = Math.floor(nextItem.distanceMinutes / 60);
      const mins = nextItem.distanceMinutes % 60;
      const timeRemaining = hours > 24
        ? `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`
        : `${hours} giờ ${mins} phút`;

      nextSlotText = `${DAY_LABELS[nextItem.slot.dayOfWeek]} (ngày ${nextItem.dateStr}) lúc ${nextItem.slot.startTime} - ${nextItem.slot.endTime} (còn ${timeRemaining})`;
    }

    return {
      canTeachNow: false,
      activeSlot: null,
      activeClassroom: null,
      nextSlotText,
      hasSchedule: true,
      reason: nextSlotText
        ? `Chưa đến giờ dạy theo thời khóa biểu. Buổi học kế tiếp: ${nextSlotText}`
        : 'Không tìm thấy ca dạy tiếp theo.'
    };
  }, [currentVnTime, selectedClassId, mySchedules, sessions]);

  // Roadmap ordering: strict sequence according to book (Unit 1..9, Lesson displayOrder)
  const bookRoadmap = useMemo(() => {
    if (!curriculumData || !activeClass) return { units: [], lessons: [], progress: { total: 0, completed: 0, percent: 0 } };

    const { units = [], lessons = [] } = curriculumData;

    const filteredUnits = units
      .filter((u: any) => u.bookNumber === targetBookNumber)
      .sort((a: any, b: any) => a.unitNumber - b.unitNumber);

    const unitIds = new Set(filteredUnits.map((u: any) => u._id));

    const filteredLessons = lessons
      .filter((l: any) =>
        Array.isArray(l.curriculumUnits) && l.curriculumUnits.some((uid: any) => unitIds.has(typeof uid === 'object' ? uid._id : uid))
      )
      .sort((a: any, b: any) => {
        const uAId = Array.isArray(a.curriculumUnits) ? (typeof a.curriculumUnits[0] === 'object' ? a.curriculumUnits[0]._id : a.curriculumUnits[0]) : '';
        const uBId = Array.isArray(b.curriculumUnits) ? (typeof b.curriculumUnits[0] === 'object' ? b.curriculumUnits[0]._id : b.curriculumUnits[0]) : '';
        const unitA = filteredUnits.find((u: any) => u._id === uAId);
        const unitB = filteredUnits.find((u: any) => u._id === uBId);

        const uNumA = unitA?.unitNumber ?? 0;
        const uNumB = unitB?.unitNumber ?? 0;

        if (uNumA !== uNumB) return uNumA - uNumB;
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });

    const taughtLessonMap: Record<string, { count: number; lastDate: string; avgScore: number; lastSessionId: string }> = {};

    roadmapSessions.forEach((s) => {
      if (!countsTowardCurriculum(s)) return;
      const lessonId = typeof s.lesson === 'object' ? s.lesson?._id : s.lesson;
      if (lessonId) {
        if (!taughtLessonMap[lessonId]) {
          taughtLessonMap[lessonId] = {
            count: 0,
            lastDate: s.startedAt || s.createdAt || '',
            avgScore: (s.summary as any)?.averageScore ?? s.summary?.averageAccuracy ?? 0,
            lastSessionId: s._id
          };
        }
        taughtLessonMap[lessonId].count += 1;
        const sDate = s.startedAt || s.createdAt || '';
        if (new Date(sDate) > new Date(taughtLessonMap[lessonId].lastDate)) {
          taughtLessonMap[lessonId].lastDate = sDate;
          taughtLessonMap[lessonId].lastSessionId = s._id;
        }
      }
    });

    let completedCount = 0;
    let foundNextToTeach = false;

    // Check if Admin assigned a specific currentLesson to activeClass
    const designated = activeClass?.currentLesson?._id || activeClass?.currentLesson;
    const alreadyTaught = designated && (taughtLessonMap[String(designated)] || (activeClass?.completedLessons || []).some((id: any) => String(id?._id || id) === String(designated)));
    const adminCurrentLessonId = alreadyTaught ? null : designated;

    const lessonsWithStatus = filteredLessons.map((l: any, idx: number) => {
      const stats = taughtLessonMap[l._id];
      const isCompleted = (!!stats && stats.count > 0) || (activeClass?.completedLessons || []).some((id: any) => String(id?._id || id) === String(l._id));
      if (isCompleted) completedCount++;

      let isNext = false;
      if (adminCurrentLessonId && String(l._id) === String(adminCurrentLessonId)) {
        isNext = true;
      } else if (!adminCurrentLessonId && !isCompleted && !foundNextToTeach) {
        isNext = true;
        foundNextToTeach = true;
      }

      const uId = Array.isArray(l.curriculumUnits) ? (typeof l.curriculumUnits[0] === 'object' ? l.curriculumUnits[0]._id : l.curriculumUnits[0]) : '';
      const unitObj = filteredUnits.find((u: any) => u._id === uId);

      return {
        ...l,
        bookOrderIndex: idx + 1,
        unitNumber: unitObj?.unitNumber ?? 1,
        unitTitle: unitObj?.title || unitObj?.vietnameseTitle || `Unit ${unitObj?.unitNumber}`,
        isCompleted,
        isNext,
        taughtStats: stats
      };
    });

    const total = lessonsWithStatus.length;
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      units: filteredUnits,
      lessons: lessonsWithStatus,
      progress: {
        total,
        completed: completedCount,
        percent
      }
    };
  }, [curriculumData, targetBookNumber, roadmapSessions, activeClass]);

  const nextLessonToTeach = useMemo(() => {
    return bookRoadmap.lessons.find((l: any) => l.isNext) || bookRoadmap.lessons.find((l: any) => !l.isCompleted) || null;
  }, [bookRoadmap]);

  const lastLessonTaught = useMemo(() => {
    const taught = bookRoadmap.lessons.filter((l: any) => l.isCompleted);
    return taught.length > 0 ? taught[taught.length - 1] : null;
  }, [bookRoadmap]);

  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => window.location.reload()}>Thử lại</button></div>;
  if (loading) {
    return (
      <div className="py-28 text-center text-slate-600">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        <p className="text-base font-bold text-slate-700">Đang tải lịch giảng dạy và lộ trình học…</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* ── Top Header Controls & Class Selector ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-3xl bg-white p-7 border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-black text-teal-800 border border-teal-200">
              <Calendar size={15} className="text-teal-800" /> Sổ Lịch Giảng Dạy & Thời Khóa Biểu
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
            Thời Khóa Biểu & Tiến Độ Giảng Dạy
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1 font-medium">
            Theo dõi ca dạy cố định theo thời khóa biểu của trường và tiến độ bài học theo đúng giáo trình.
          </p>
        </div>

        {/* Filter Classroom & Teaching Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200">
            <GraduationCap size={20} className="text-teal-800 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-sm sm:text-base font-extrabold text-slate-800 outline-none cursor-pointer"
            >
              {classes.length > 1 && (
                <option value="ALL">🏫 Tất cả các lớp ({classes.length} lớp)</option>
              )}
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi) {classes.length === 1 ? '• Lớp giảng dạy của tôi' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Teach Button with Schedule Gate */}
          {effectiveClassId && (
            scheduleLiveTiming.canTeachNow ? (
              <button
                type="button"
                onClick={() => {
                  const activeLes = scheduleLiveTiming.activeSlot?.lesson;
                  const targetLessonId =
                    (typeof activeLes === 'object' && activeLes ? activeLes._id : (typeof activeLes === 'string' ? activeLes : '')) ||
                    nextLessonToTeach?._id;
                  if (targetLessonId) {
                    navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${targetLessonId}`);
                  } else {
                    navigate(`/teacher/classes/${effectiveClassId}/sessions/new`);
                  }
                }}
                className="inline-flex items-center gap-2.5 rounded-2xl bg-emerald-700 px-6 py-3.5 text-sm sm:text-base font-black text-white hover:bg-emerald-700 transition-all  active:scale-95 cursor-pointer animate-pulse"
              >
                <Play size={18} className="fill-white" />
                <span>Vào Lớp Dạy Ngay (Đang mở)</span>
              </button>
            ) : (
              <div
                title={scheduleLiveTiming.reason}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 cursor-not-allowed select-none"
              >
                <Lock size={16} />
                <span>Chưa đến giờ dạy</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Requirement 10: Real-Time Schedule Gate Alert Banner ──────────────── */}
      {scheduleLiveTiming.canTeachNow ? (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white font-black">
              <Play size={22} className="fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-700 animate-ping" />
                <h3 className="text-base sm:text-lg font-black text-emerald-950">
                  ĐANG TRONG KHUNG GIỜ GIẢNG DẠY THEO THỜI KHÓA BIỂU
                </h3>
              </div>
              <p className="text-sm font-semibold text-emerald-800 mt-0.5">
                Ca học: <strong>{DAY_LABELS[scheduleLiveTiming.activeSlot?.dayOfWeek]} ({scheduleLiveTiming.activeSlot?.startTime} - {scheduleLiveTiming.activeSlot?.endTime})</strong>
                {scheduleLiveTiming.activeSlot?.room && ` • Phòng: ${scheduleLiveTiming.activeSlot.room}`}
                {(scheduleLiveTiming.activeSlot?.lessonTitle || scheduleLiveTiming.activeSlot?.lessonNumber) && (
                  (() => {
                    const num = scheduleLiveTiming.activeSlot?.lessonNumber;
                    let title = scheduleLiveTiming.activeSlot?.lessonTitle || (typeof scheduleLiveTiming.activeSlot?.lesson === 'object' ? scheduleLiveTiming.activeSlot?.lesson?.title : '') || '';
                    if (num && title.toLowerCase().startsWith(`bài ${num}:`)) {
                      title = title.substring(`bài ${num}:`.length).trim();
                    }
                    return title ? (
                      <strong className="text-emerald-950 ml-1">
                        • 🎯 {num ? `Bài ${num}: ` : ''}{title}
                      </strong>
                    ) : null;
                  })()
                )}
                {' — '}Giáo viên có thể mở phòng học và điểm danh học sinh ngay bây giờ!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (effectiveClassId) {
                const activeLes = scheduleLiveTiming.activeSlot?.lesson;
                const targetLessonId =
                  (typeof activeLes === 'object' && activeLes ? activeLes._id : (typeof activeLes === 'string' ? activeLes : '')) ||
                  nextLessonToTeach?._id;
                navigate(`/teacher/classes/${effectiveClassId}/sessions/new${targetLessonId ? `?lessonId=${targetLessonId}` : ''}`);
              }
            }}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-700 text-white font-black text-sm px-6 py-3 transition-all cursor-pointer"
          >
            <Play size={16} className="fill-white" /> Mở lớp dạy ngay
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-700 text-white font-black">
            <Lock size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-200 text-amber-950 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                Quy định giờ dạy
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Phòng học sẽ mở đúng ngày và giờ theo Thời Khóa Biểu
              </h3>
            </div>
            <p className="text-sm text-slate-700 mt-1">
              {scheduleLiveTiming.nextSlotText ? (
                <span>
                  Buổi dạy tiếp theo: <strong className="text-amber-900">{scheduleLiveTiming.nextSlotText}</strong>. Hệ thống tự động mở trước 15 phút để giáo viên chuẩn bị học cụ và điểm danh.
                </span>
              ) : (
                <span>{scheduleLiveTiming.reason}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Main Navigation Tabs (Clean & Separated View) ───────────────────── */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-4 pt-3">
        <button
          type="button"
          id="tab-btn-calendar"
          onClick={() => {
            setActiveTab('calendar');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'calendar');
              return next;
            });
          }}
          className={`flex items-center gap-2 px-6 py-3.5 text-base font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <CalendarDays size={20} />
          <span>Thời Khóa Biểu Tuần</span>
          {mySchedules.length > 0 && (
            <span className="ml-1.5 rounded-full bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-black">
              {mySchedules.reduce((acc, s) => acc + (s.weeklySlots?.length || 0), 0)} ca/tuần
            </span>
          )}
        </button>

        <button
          type="button"
          id="tab-btn-roadmap"
          onClick={() => {
            setActiveTab('roadmap');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('tab', 'roadmap');
              return next;
            });
          }}
          className={`flex items-center gap-2 px-6 py-3.5 text-base font-extrabold border-b-2 transition-all cursor-pointer ${
            activeTab === 'roadmap'
              ? 'border-teal-600 text-teal-800'
              : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BookOpen size={20} />
          <span>Lộ Trình & Thứ Tự Giáo Trình</span>
          {activeClass && (
            <span className="ml-1.5 rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-black">
              {bookRoadmap.progress.percent}% Sách {targetBookNumber}
            </span>
          )}
        </button>
      </div>


      {/* ── TAB 1: WEEKLY CALENDAR ─────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Week Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 border border-slate-200">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} /> Tuần trước
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-colors cursor-pointer ${
                  weekOffset === 0
                    ? 'bg-teal-700 text-white'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Tuần hiện tại
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tuần sau <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2.5 text-base font-black text-slate-900">
              <Calendar size={18} className="text-teal-800" />
              <span>
                Tuần từ ngày {currentWeekDays[0].formattedDate} đến {currentWeekDays[6].formattedDate}
              </span>
              {weekOffset !== 0 && (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  {weekOffset < 0 ? `Đang xem ${Math.abs(weekOffset)} tuần trước` : `Đang xem ${weekOffset} tuần tới`}
                </span>
              )}
            </div>
          </div>

          {/* 7-Days Timetable Grid (Optimized, no overlap) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {currentWeekDays.map((day) => {
              const daySessions = calendarDaySessions[day.dateString] || [];
              const dayFixedSlots = (fixedTimetableByDay[day.dayNum] || []).filter(({ schedule, slot }) => scheduleSlotAppliesOn(schedule, slot, day.dateString));

              return (
                <div
                  key={day.dayIndex}
                  className={`flex flex-col rounded-2xl border p-4 transition-all min-h-[380px] ${
                    day.isToday
                      ? 'border-teal-500 bg-teal-50/30 ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className="mb-3.5 border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{day.dayName}</p>
                      <h4 className="text-lg font-black text-slate-900">{day.formattedDate}</h4>
                    </div>
                    {day.isToday && (
                      <span className="rounded-full bg-teal-700 px-2.5 py-0.5 text-[11px] font-black text-white uppercase tracking-wider">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* Scheduled Fixed Slots for this day */}
                  {dayFixedSlots.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                        Ca xếp thời khóa biểu:
                      </div>
                      {dayFixedSlots.map(({ schedule, slot }, fIdx) => {
                        const theme = COLOR_THEMES[schedule.colorTag] || COLOR_THEMES.indigo;
                        const cObj = typeof schedule.classroom === 'object' ? schedule.classroom : null;
                        const cId = String(cObj?._id || schedule.classroom || selectedClassId || '');
                        const cName = cObj?.name || 'Lớp';
                        const seqLesson = getSequentialLessonForSlot(schedule, slot, day.dateString, bookRoadmap.lessons);
                        const effectiveLesson =
                          day.isToday && nextLessonToTeach && (!slot.lesson || seqLesson.lesson?.isCompleted)
                            ? {
                                lesson: nextLessonToTeach,
                                lessonNumber: nextLessonToTeach.bookOrderIndex || seqLesson.lessonNumber || 1,
                                title: nextLessonToTeach.title,
                                vietnameseTitle: nextLessonToTeach.vietnameseTitle
                              }
                            : seqLesson;
                        const lessonDisplayTitle = (effectiveLesson.title ? `${effectiveLesson.title}${effectiveLesson.vietnameseTitle ? ` (${effectiveLesson.vietnameseTitle})` : ''}` : '') || 'Buổi học tiếng Anh';

                        const matchedSession = daySessions.find(
                          (s: any) => String(s.classroom?._id || s.classroom) === cId
                        );
                        const isCancelled = matchedSession?.status === 'CANCELLED';

                        return (
                          <div
                            key={fIdx}
                            className={`rounded-xl border px-3 py-2 text-xs font-bold ${theme.bg} ${theme.text} ${theme.border} space-y-1.5`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <p className="text-sm font-black break-words">{cName}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                {isCancelled && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-300">
                                    🚫 Báo nghỉ
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white/80 border border-current">
                                  Bài #{effectiveLesson.lessonNumber}
                                </span>
                              </div>
                            </div>
                            <p className="font-black text-slate-900">{slot.startTime} – {slot.endTime}</p>
                            {slot.room && <p className="text-[11px]">🏫 Phòng: {slot.room}</p>}
                            <div className="mt-1 pt-1.5 border-t border-black/10">
                              <p className="text-[10px] uppercase tracking-wider opacity-75 font-black">
                                🎯 {day.dateString < vietnamDate() ? 'Bài theo lịch:' : 'Bài học dự kiến:'}
                              </p>
                              <p className="font-black text-slate-900 text-xs mt-0.5 break-words" title={lessonDisplayTitle}>
                                Bài {effectiveLesson.lessonNumber}: {lessonDisplayTitle}
                              </p>
                            </div>

                            {/* Actions for this slot */}
                            {cId && (
                              <div className="pt-1.5 space-y-1.5">
                                {isCancelled && matchedSession ? (
                                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between gap-1 flex-wrap text-[11px]">
                                      <span className="font-extrabold text-amber-900">
                                        Lý do: <span className="font-black underline">{matchedSession.cancellationReason || 'Nghỉ theo kế hoạch'}</span>
                                      </span>
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200">
                                        Bảo lưu bài #{effectiveLesson.lessonNumber}
                                      </span>
                                    </div>
                                    {matchedSession.cancellationNote && (
                                      <p className="text-[10px] text-amber-800 italic leading-snug">"{matchedSession.cancellationNote}"</p>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreSession(matchedSession._id)}
                                      className="w-full text-center rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 border border-amber-400 py-1 text-xs font-black transition-colors cursor-pointer mt-0.5 flex items-center justify-center gap-1 active:scale-95"
                                    >
                                      <span>↩ Hủy báo nghỉ</span>
                                    </button>
                                  </div>
                                ) : day.dateString >= vietnamDate() ? (
                                  <div className="space-y-1">
                                    <Link
                                      to={`/teacher/classes/${cId}/sessions/new${effectiveLesson.lesson?._id ? `?lessonId=${effectiveLesson.lesson._id}` : ''}`}
                                      className="block w-full text-center rounded-lg bg-white/90 hover:bg-white text-slate-900 border border-black/15 py-1.5 text-xs font-black transition-colors"
                                    >
                                      {day.isToday ? 'Bắt đầu / Chuẩn bị ca dạy ➔' : 'Soạn kế hoạch dạy trước'}
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReportOff(cId, cName, day.dateString, { startTime: slot.startTime, endTime: slot.endTime })}
                                      className="block w-full text-center rounded-lg bg-white/70 hover:bg-rose-50 hover:text-rose-900 text-slate-700 border border-black/10 py-1 text-[11px] font-bold transition-colors cursor-pointer"
                                    >
                                      Báo nghỉ ca này
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actual sessions conducted */}
                  {(() => {
                    const activeSessions = daySessions.filter((s: any) => s.status !== 'CANCELLED');
                    const cancelledSessions = daySessions.filter((s: any) => s.status === 'CANCELLED');

                    return (
                      <div className="flex-1 space-y-2">
                        <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center justify-between">
                          <span>Buổi dạy thực tế ({activeSessions.length}):</span>
                        </div>

                        {activeSessions.length === 0 ? (
                          <div className="py-2.5 px-3 text-center rounded-xl bg-slate-50/80 border border-dashed border-slate-200">
                            <span className="text-xs font-medium italic text-slate-500">
                              {cancelledSessions.length > 0
                                ? 'Ca học đã báo nghỉ (tiến độ được bảo lưu)'
                                : dayFixedSlots.length > 0
                                ? 'Chưa có buổi dạy thực tế'
                                : 'Chưa ghi nhận buổi dạy'}
                            </span>
                          </div>
                        ) : (
                          activeSessions.map((s: any) => {
                            const lessonTitle = s.lesson?.title || s.title || 'Buổi học tiếng Anh';
                            const roomName = s.classroom?.name || 'Lớp';
                            const scoreCount = (s.studentScores || []).filter((row: any) => !['ABSENT', 'EXCUSED'].includes(row.attendance)).length;
                            const stars = s.summary?.totalStars;

                            return (
                              <div
                                key={s._id}
                                className="rounded-xl border p-3 transition-all border-teal-100 bg-white hover:border-teal-300"
                              >
                                <div className="flex items-center justify-between gap-1 mb-1.5">
                                  <span className="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                                    {roomName}
                                  </span>
                                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-slate-600">
                                    {s.startedAt
                                      ? new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                      : 'Dạy'}
                                  </span>
                                </div>
                                <h5 className="text-sm font-black text-slate-900 break-words" title={lessonTitle}>
                                  {lessonTitle}
                                </h5>
                                <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-600 border-t border-slate-50 pt-1.5">
                                  <span>👥 {scoreCount} bé</span>
                                  {stars !== undefined && (
                                    <span className="font-bold text-amber-800">⭐ {stars} sao</span>
                                  )}
                                </div>
                                <Link
                                  to={`/teacher/classroom-sessions/${s._id}/summary`}
                                  className="mt-2 block text-center rounded-lg bg-teal-50 py-1.5 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors"
                                >
                                  Xem nhật ký buổi dạy
                                </Link>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: CURRICULUM ROADMAP ACCORDING TO BOOK ─────────────────────── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6">
          {/* Unified Roadmap & Next Lesson Hero Card */}
          <div className="rounded-3xl border border-teal-200/90 bg-teal-500/10 p-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-center">
              {/* Left: Overall Book Progress */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-teal-200/60 pb-6 lg:pb-0 lg:pr-7">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-black text-teal-800 uppercase tracking-wider">
                    <BookOpen size={16} /> Giáo trình chuẩn • Quyển Sách {targetBookNumber}
                    {activeClass && <span className="text-teal-900">• Lớp {activeClass.name}</span>}
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Đã hoàn thành {bookRoadmap.progress.completed} / {bookRoadmap.progress.total} bài học
                </h2>
                <p className="text-sm text-slate-600 mt-1 font-medium">
                  Tiến độ tuần tự theo cấu trúc giáo trình từ Unit 1 đến Unit 9 dành cho trẻ {activeClass?.ageGroupCode || 'mầm non'} tuổi.
                </p>

                <div className="mt-5">
                  <div className="flex items-center justify-between text-sm font-black mb-1.5">
                    <span className="text-slate-700">Mức độ hoàn thành sách</span>
                    <span className="text-teal-800 text-base font-black">{bookRoadmap.progress.percent}%</span>
                  </div>
                  <div className="h-3.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-700 transition-all duration-500"
                      style={{ width: `${bookRoadmap.progress.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Last Taught & Next Lesson Guidance */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Last Taught Lesson */}
                <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-600 uppercase tracking-wide">
                    <History size={14} className="text-slate-600" /> Buổi vừa dạy gần nhất
                  </span>
                  {lastLessonTaught ? (
                    <div className="mt-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-100 text-emerald-900 px-2 py-0.5 text-xs font-black">
                          Bài {lastLessonTaught.bookOrderIndex}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          Unit {lastLessonTaught.unitNumber}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-1.5 line-clamp-1" title={lastLessonTaught.title}>
                        {lastLessonTaught.title}
                      </h4>
                      {lastLessonTaught.vietnameseTitle && (
                        <p className="text-xs text-slate-600 italic line-clamp-1 mt-0.5">{lastLessonTaught.vietnameseTitle}</p>
                      )}
                      {lastLessonTaught.taughtStats && (
                        <div className="mt-3 flex flex-col gap-2">
                          <p className="text-xs text-emerald-800 font-extrabold flex items-center gap-1">
                            <Check size={14} /> Đã dạy ngày {new Date(lastLessonTaught.taughtStats.lastDate).toLocaleDateString('vi-VN')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (lastLessonTaught.taughtStats?.lastSessionId) {
                                navigate(`/teacher/classroom-sessions/${lastLessonTaught.taughtStats.lastSessionId}/summary`);
                              } else {
                                navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(lastLessonTaught.title)}&classroomId=${effectiveClassId}`);
                              }
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-700 py-2 px-3 text-xs font-black text-white transition-colors cursor-pointer"
                          >
                            <History size={14} />
                            <span>Xem nhật ký buổi dạy này</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 italic mt-3">Chưa có bài nào được dạy cho lớp này</p>
                  )}
                </div>

                {/* Next Lesson To Teach */}
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wide">
                      <Flame size={15} className="text-amber-800 animate-pulse" /> Bài tiếp theo cần dạy
                    </span>
                    <span className="rounded-full bg-amber-700 text-white px-2.5 py-0.5 text-xs font-black">
                      Đề xuất chuẩn
                    </span>
                  </div>

                  {nextLessonToTeach ? (
                    <div className="mt-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-200 text-amber-950 px-2 py-0.5 text-xs font-black">
                          Bài {nextLessonToTeach.bookOrderIndex}
                        </span>
                        <span className="text-xs font-bold text-amber-900">
                          Unit {nextLessonToTeach.unitNumber}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-1.5 line-clamp-1" title={nextLessonToTeach.title}>
                        {nextLessonToTeach.title}
                      </h4>
                      {nextLessonToTeach.vietnameseTitle && (
                        <p className="text-xs text-slate-600 italic line-clamp-1 mt-0.5">{nextLessonToTeach.vietnameseTitle}</p>
                      )}

                      {scheduleLiveTiming.canTeachNow ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (effectiveClassId) {
                              navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${nextLessonToTeach._id}`);
                            }
                          }}
                          className="mt-3.5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 py-2.5 px-3 text-sm font-black text-white hover:bg-amber-700 transition-colors cursor-pointer"
                        >
                          <Play size={15} className="fill-white" /> Dạy bài này ngay
                        </button>
                      ) : (
                        <div className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl bg-amber-100 border border-amber-200 py-2 px-3 text-xs font-bold text-amber-900">
                          <Lock size={13} />
                          <span>Mở dạy khi đến ca học</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-emerald-800 font-bold mt-4">🎉 Đã hoàn thành tất cả bài trong sách!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Units & Lessons Roadmap List */}
          <div className="space-y-5">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Layers size={20} className="text-teal-800" />
              Chi Tiết Các Đơn Vị Bài Học Theo Sách {targetBookNumber}
            </h3>

            <div className="space-y-4">
              {bookRoadmap.units.map((unit: any) => {
                const unitLessons = bookRoadmap.lessons.filter((l: any) => l.unitNumber === unit.unitNumber);
                const unitCompletedCount = unitLessons.filter((l: any) => l.isCompleted).length;
                const unitPercent = unitLessons.length > 0 ? Math.round((unitCompletedCount / unitLessons.length) * 100) : 0;

                return (
                  <div
                    key={unit._id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-teal-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3.5 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg bg-teal-100 text-teal-800 px-2.5 py-0.5 text-xs font-black">
                            Unit {unit.unitNumber}
                          </span>
                          <h4 className="font-black text-lg text-slate-900">
                            {unit.title || unit.vietnameseTitle || `Unit ${unit.unitNumber}`}
                          </h4>
                        </div>
                        {unit.bigQuestion && (
                          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">❓ Câu hỏi lớn: {unit.bigQuestion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs sm:text-sm font-bold text-slate-600">
                          {unitCompletedCount}/{unitLessons.length} bài đã học
                        </span>
                        <div className="w-28 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-teal-700 rounded-full"
                            style={{ width: `${unitPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lessons Grid within Unit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                      {unitLessons.map((lesson: any) => (
                        <div
                          key={`${unit._id}-${lesson._id}`}
                          className={`rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                            lesson.isCompleted
                              ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950'
                              : lesson.isNext
                              ? 'border-amber-400 bg-amber-50/70 ring-1 ring-amber-400/40'
                              : 'border-slate-200 bg-slate-50/60 text-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-2">
                              <span className="text-xs font-black uppercase text-slate-600">
                                Bài {lesson.bookOrderIndex}
                              </span>
                              {lesson.isCompleted ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <Check size={12} /> Đã dạy
                                </span>
                              ) : lesson.isNext ? (
                                <span className="inline-flex items-center gap-1 text-xs font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                                  ⚡ Tiếp theo
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-slate-600">Chưa dạy</span>
                              )}
                            </div>

                            <h5 className="font-extrabold text-sm text-slate-900 line-clamp-1" title={lesson.title}>
                              {lesson.title}
                            </h5>
                            {lesson.vietnameseTitle && (
                              <p className="text-xs text-slate-600 line-clamp-1 italic mt-0.5">{lesson.vietnameseTitle}</p>
                            )}
                          </div>

                          <div className="mt-3.5 pt-2.5 border-t border-black/5 flex items-center justify-between">
                            {effectiveClassId && (
                              lesson.isCompleted ? (
                                <div className="flex items-center justify-between w-full gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (lesson.taughtStats?.lastSessionId) {
                                        navigate(`/teacher/classroom-sessions/${lesson.taughtStats.lastSessionId}/summary`);
                                      } else {
                                        navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(lesson.title)}&classroomId=${effectiveClassId}`);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <History size={13} />
                                    <span>Xem nhật ký</span>
                                  </button>

                                  {scheduleLiveTiming.canTeachNow && (
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${lesson._id}`)}
                                      className="text-xs font-bold text-slate-600 hover:text-slate-700 underline cursor-pointer"
                                    >
                                      Dạy lại
                                    </button>
                                  )}
                                </div>
                              ) : (
                                scheduleLiveTiming.canTeachNow ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${lesson._id}`)}
                                    className={`inline-flex items-center gap-1 text-xs font-extrabold cursor-pointer transition ${
                                      lesson.isNext ? 'text-amber-800 hover:text-amber-950' : 'text-teal-800 hover:text-teal-900'
                                    }`}
                                  >
                                    <span>Mở buổi dạy</span>
                                    <ArrowRight size={13} />
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                                    <Lock size={11} /> Theo lịch
                                  </span>
                                )
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Báo Nghỉ Buổi Học (Auto-shift Guaranteed) ────────────────────── */}
      {reportOffModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in zoom-in-95">
            {/* Header with rich pastel styling */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50/60 to-amber-50/40 p-6 sm:p-7 border-b border-amber-100 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="p-3 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/25 shrink-0">
                  <CalendarDays size={26} />
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2.5 py-0.5 rounded-full border border-amber-300">
                      Quản lý lịch giảng dạy
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Báo Nghỉ Buổi Học
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-white/95 border border-amber-200 px-3 py-1 text-xs font-black text-slate-900 shadow-2xs">
                      🏫 {reportOffModal.className}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-white/95 border border-amber-200 px-3 py-1 text-xs font-black text-indigo-950 shadow-2xs">
                      📅 Ngày: {reportOffModal.dateString}
                    </span>
                    {reportOffModal.timeSlot && (
                      <span className="inline-flex items-center gap-1 rounded-xl bg-white/95 border border-amber-200 px-3 py-1 text-xs font-black text-emerald-950 shadow-2xs">
                        ⏰ Khung giờ: {reportOffModal.timeSlot.startTime} – {reportOffModal.timeSlot.endTime}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportOffModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-2xl p-2 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 sm:p-7 space-y-6 max-h-[70vh] overflow-y-auto">
              {reportOffModal.error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm font-bold text-rose-800 flex items-center gap-2.5">
                  <AlertCircle size={20} className="shrink-0 text-rose-600" />
                  <span>{reportOffModal.error}</span>
                </div>
              )}

              {/* Cam kết tiến độ giáo trình (Auto-shift Guarantee Card) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-teal-50/90 border border-teal-200 text-teal-950 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-teal-700 text-white text-xs flex items-center justify-center font-bold">✓</span>
                  <h4 className="text-sm font-black text-teal-950">
                    Cơ chế bảo lưu giáo trình tự động (Auto-shift)
                  </h4>
                </div>
                <p className="text-xs text-teal-900 font-medium leading-relaxed">
                  Buổi nghỉ này sẽ được ghi nhận minh bạch cho lớp. <span className="font-bold underline">Bài học chưa dạy sẽ không bị mất</span>: ca học tiếp theo theo thời khóa biểu sẽ tự động giảng dạy bài này theo đúng lộ trình giáo trình của trường.
                </p>
              </div>

              {/* Chọn lý do nghỉ */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Lý do báo nghỉ <span className="text-rose-500">*</span></span>
                  <span className="text-[11px] font-semibold text-slate-500 lowercase">chọn theo danh mục</span>
                </label>

                {/* Quick selector cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { label: 'Nghỉ lễ theo lịch nhà trường', icon: '🏛️' },
                    { label: 'Giáo viên có việc đột xuất / Báo ốm', icon: '👩‍🏫' },
                    { label: 'Hoạt động ngoại khóa / Dã ngoại của trường', icon: '🚌' },
                    { label: 'Thời tiết bất lợi (Mưa bão)', icon: '🌧️' },
                    { label: 'Học sinh nghỉ sinh hoạt hè / Nghỉ chuyên đề', icon: '🏖️' },
                    { label: 'Lý do khác', icon: '📝' }
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setReportOffModal(prev => ({ ...prev, reason: item.label }))}
                      className={`p-3.5 rounded-2xl text-left border text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                        reportOffModal.reason === item.label
                          ? 'border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/30'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ghi chú thêm */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Ghi chú dặn dò (Hiển thị cho Admin & Phụ huynh)
                </label>
                <textarea
                  rows={3}
                  value={reportOffModal.note}
                  onChange={(e) => setReportOffModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Ví dụ: Lớp nghỉ theo lịch chung của trường; dặn phụ huynh cho bé mở app Koko luyện tập từ vựng ở nhà..."
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs sm:text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={reportOffModal.loading}
                onClick={() => setReportOffModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={reportOffModal.loading}
                onClick={handleSubmitReportOff}
                className="rounded-2xl bg-amber-600 hover:bg-amber-700 px-6 sm:px-7 py-3 text-xs sm:text-sm font-black text-white shadow-md shadow-amber-600/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {reportOffModal.loading ? 'Đang gửi...' : 'Xác nhận Báo Nghỉ Buổi Học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherTeachingSchedule;
