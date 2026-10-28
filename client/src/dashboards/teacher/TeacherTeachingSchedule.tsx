import { vietnamWallClock, localCalendarDate } from '../../utils/vietnamTime';
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
  Clock,
  Layers,
  ArrowRight,
  Lock
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
        if (urlClassId) {
          setSelectedClassId(urlClassId);
        } else if (clsList.length === 1) {
          // 1-1 teacher-to-class rule: auto-select their single assigned class
          setSelectedClassId(String(clsList[0]._id));
        }

        const sList = Array.isArray(sessRes) ? sessRes : (sessRes?.data || []);
        setSessions(sList);

        const curr = currRes?.data || currRes;
        setCurriculumData(curr);

        const mySchedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
        setMySchedules(mySchedList);
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
      const dateKey = (s.startedAt || s.createdAt || '').split('T')[0];
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

    const relevantSchedules = selectedClassId && selectedClassId !== 'ALL'
      ? mySchedules.filter((s: any) => {
          const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
          return String(cId) === String(selectedClassId);
        })
      : mySchedules;

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
    let activeClassroom: any = null;
    const upcomingList: Array<{ slot: any; schedule: any; distanceMinutes: number; dateStr: string }> = [];

    for (const sch of relevantSchedules) {
      for (const slot of sch.weeklySlots || []) {
        const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        // Active slot window: 15 minutes before start up to 30 minutes after end
        if (slot.dayOfWeek === currentDay && currentMinutes >= (startMin - 15) && currentMinutes <= (endMin + 30)) {
          activeSlot = slot;
          activeClassroom = sch.classroom;
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

    if (activeSlot) {
      return {
        canTeachNow: true,
        activeSlot,
        activeClassroom,
        nextSlotText: null,
        hasSchedule: true,
        reason: `Đang trong khung giờ dạy (${activeSlot.startTime} - ${activeSlot.endTime})`
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
  }, [currentVnTime, selectedClassId, mySchedules]);

  // Roadmap ordering: strict sequence according to book (Unit 1..9, Lesson displayOrder)
  const bookRoadmap = useMemo(() => {
    if (!curriculumData) return { units: [], lessons: [], progress: { total: 0, completed: 0, percent: 0 } };

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
                  {c.name} ({c.ageGroupCode} tuổi) {classes.length === 1 ? '• Lớp chủ nhiệm của tôi' : ''}
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
                  <strong className="text-emerald-950 ml-1">
                    • 🎯 {scheduleLiveTiming.activeSlot?.lessonNumber ? `Bài ${scheduleLiveTiming.activeSlot?.lessonNumber}: ` : ''}
                    {scheduleLiveTiming.activeSlot?.lessonTitle || (typeof scheduleLiveTiming.activeSlot?.lesson === 'object' ? scheduleLiveTiming.activeSlot?.lesson?.title : '')}
                  </strong>
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


      {/* ── TAB 1: WEEKLY CALENDAR & ADMIN TIMETABLE ─────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Admin Timetable Fixed Slots Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white font-black">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Thời Khóa Biểu Cố Định (Do Nhà Trường Phân Bổ)
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Các ca dạy hàng tuần của lớp. Khi đến giờ dạy, giáo viên có thể mở trực tiếp buổi học tại đây.
                  </p>
                </div>
              </div>

              {filteredMySchedules.length === 0 && (
                <div className="text-sm font-semibold text-slate-600 italic">
                  Chưa có lịch phân công cố định từ Admin cho lớp này
                </div>
              )}
            </div>

            {/* List of scheduled slots */}
            {filteredMySchedules.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-3">
                {filteredMySchedules.map((sch) => {
                  const theme = COLOR_THEMES[sch.colorTag] || COLOR_THEMES.indigo;
                  const cName = typeof sch.classroom === 'object' ? sch.classroom?.name : 'Lớp học';
                  const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;

                  return sch.weeklySlots?.map((slot, sIdx) => {
                    const isSlotNow = scheduleLiveTiming.canTeachNow && scheduleLiveTiming.activeSlot?.startTime === slot.startTime && scheduleLiveTiming.activeSlot?.dayOfWeek === slot.dayOfWeek;

                    return (
                      <div
                        key={`${sch._id}-${sIdx}`}
                        onClick={() => {
                          if (isSlotNow) {
                            const slotLes = slot.lesson;
                            const slotLessonId = typeof slotLes === 'object' && slotLes ? slotLes._id : (typeof slotLes === 'string' ? slotLes : '');
                            const activeLes = scheduleLiveTiming.activeSlot?.lesson;
                            const activeLessonId = typeof activeLes === 'object' && activeLes ? activeLes._id : (typeof activeLes === 'string' ? activeLes : '');
                            const targetLessonId = slotLessonId || activeLessonId || nextLessonToTeach?._id;
                            navigate(`/teacher/classes/${cId}/sessions/new${targetLessonId ? `?lessonId=${targetLessonId}` : ''}`);
                          }
                        }}
                        className={`group flex items-center gap-3 rounded-2xl border-2 p-3.5 transition-all ${theme.bg} ${theme.border} ${
                          isSlotNow
                            ? 'ring-2 ring-emerald-500 cursor-pointer hover:scale-102'
                            : 'cursor-default'
                        }`}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${isSlotNow ? 'bg-emerald-700 animate-ping' : theme.dot}`} />
                            <span className="text-sm font-black text-slate-900">{DAY_LABELS[slot.dayOfWeek]}</span>
                            <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${theme.badge}`}>
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {isSlotNow && (
                              <span className="rounded-md bg-emerald-700 text-white text-[10px] font-black px-1.5 py-0.5 uppercase tracking-wide">
                                Đang diễn ra
                              </span>
                            )}
                          </div>

                          <div className="text-xs font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                            <span>{cName}</span>
                            {slot.room && <span className="text-slate-600 font-semibold">• {slot.room}</span>}
                          </div>

                          {/* Attached Lesson Badge (Bài mấy) */}
                          {(slot.lessonNumber || slot.lessonTitle || slot.lesson) && (
                            <div className="mt-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-indigo-900 border border-indigo-200/80 font-black text-[11px] flex items-center gap-1">
                              <span className="text-indigo-800 font-black">
                                🎯 {slot.lessonNumber ? `Bài ${slot.lessonNumber}` : 'Bài'}:
                              </span>
                              <span className="truncate max-w-[170px]" title={slot.lessonTitle || (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}>
                                {slot.lessonTitle
                                  ? slot.lessonTitle.replace(/^Bài\s*\d+\s*[:\-]\s*/i, '')
                                  : (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}
                              </span>
                            </div>
                          )}
                        </div>

                        {isSlotNow && (
                          <div className="bg-emerald-700 text-white rounded-xl p-2 group-hover:scale-110 transition-transform">
                            <Play size={14} className="fill-white" />
                          </div>
                        )}
                      </div>
                    );
                  });
                })}
              </div>
            )}
          </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
            {currentWeekDays.map((day) => {
              const daySessions = calendarDaySessions[day.dateString] || [];
              const dayFixedSlots = fixedTimetableByDay[day.dayNum] || [];

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
                        const cName = typeof schedule.classroom === 'object' ? schedule.classroom?.name : 'Lớp';
                        return (
                          <div
                            key={fIdx}
                            className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold ${theme.bg} ${theme.text} ${theme.border} flex items-center justify-between`}
                          >
                            <span className="truncate">{cName}</span>
                            <span className="font-black text-slate-900">{slot.startTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actual sessions conducted */}
                  <div className="flex-1 space-y-2.5">
                    <div className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Buổi dạy thực tế ({daySessions.length}):
                    </div>

                    {daySessions.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-700">
                        <Calendar size={22} className="mb-1.5 opacity-40" />
                        <span className="text-xs font-medium italic">Chưa mở buổi dạy</span>
                      </div>
                    ) : (
                      daySessions.map((s: any) => {
                        const lessonTitle = s.lesson?.title || s.title || 'Buổi học tiếng Anh';
                        const roomName = s.classroom?.name || 'Lớp';
                        const scoreCount = s.summary?.studentsScored ?? (Array.isArray(s.scores) ? s.scores.length : 0);
                        const avg = s.summary?.averageScore;

                        return (
                          <div
                            key={s._id}
                            className="rounded-xl border border-teal-100 bg-white p-3 hover:border-teal-300 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                                {roomName}
                              </span>
                              <span className="text-xs font-bold text-slate-600">
                                {s.startedAt ? new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dạy'}
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900 line-clamp-1" title={lessonTitle}>
                              {lessonTitle}
                            </h5>
                            <div className="mt-2 flex items-center justify-between text-xs font-semibold text-slate-600 border-t border-slate-50 pt-1.5">
                              <span>👥 {scoreCount} bé</span>
                              {avg !== undefined && (
                                <span className="font-bold text-amber-800">⭐ {avg}đ</span>
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
    </div>
  );
};

export default TeacherTeachingSchedule;
