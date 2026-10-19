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
  ArrowRight
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';
import type { ClassroomSession, ClassSchedule } from '../../types';

interface ClassOption {
  _id: string;
  name: string;
  ageGroupCode: string;
  studentCount?: number;
}

const COLOR_THEMES: { [key: string]: { bg: string; border: string; text: string; badge: string; dot: string; lightBg: string } } = {
  indigo: {
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    text: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    lightBg: '#6366f1'
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    lightBg: '#10b981'
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    dot: 'bg-amber-500',
    lightBg: '#f59e0b'
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/60',
    text: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    dot: 'bg-rose-500',
    lightBg: '#f43f5e'
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800/60',
    text: 'text-purple-900 dark:text-purple-200',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    dot: 'bg-purple-500',
    lightBg: '#a855f7'
  },
  sky: {
    bg: 'bg-sky-50/70 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800/60',
    text: 'text-sky-900 dark:text-sky-200',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    dot: 'bg-sky-500',
    lightBg: '#0ea5e9'
  },
  teal: {
    bg: 'bg-teal-50/70 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800/60',
    text: 'text-teal-900 dark:text-teal-200',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    dot: 'bg-teal-500',
    lightBg: '#14b8a6'
  },
  orange: {
    bg: 'bg-orange-50/70 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800/60',
    text: 'text-orange-900 dark:text-orange-200',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    dot: 'bg-orange-500',
    lightBg: '#f97316'
  }
};

const DAY_LABELS: { [key: number]: string } = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  0: 'Chủ Nhật'
};

export const TeacherTeachingSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlClassId = searchParams.get('classroomId') || '';

  // State
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(urlClassId || 'ALL');
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [mySchedules, setMySchedules] = useState<ClassSchedule[]>([]);
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active Main Tab: 'calendar' (Thời khóa biểu tuần) | 'roadmap' (Lộ trình giáo trình)
  const [activeTab, setActiveTab] = useState<'calendar' | 'roadmap'>('calendar');

  // Week navigation (offset 0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

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
        }

        const sList = Array.isArray(sessRes) ? sessRes : (sessRes?.data || sessRes?.sessions || []);
        setSessions(sList);

        const curr = currRes?.data || currRes;
        setCurriculumData(curr);

        const mySchedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
        setMySchedules(mySchedList);
      } catch (err) {
        console.error('Lỗi tải lịch giảng dạy:', err);
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

  // Target class for Roadmap (Each class has its own curriculum progress!)
  const roadmapClass = useMemo(() => {
    if (selectedClassId !== 'ALL') {
      return classes.find((c) => String(c._id) === String(selectedClassId)) || classes[0] || null;
    }
    return classes[0] || null;
  }, [classes, selectedClassId]);

  const roadmapClassId = roadmapClass?._id || '';

  // Filtered sessions strictly for this class in Roadmap
  const roadmapSessions = useMemo(() => {
    if (!roadmapClassId) return [];
    return sessions.filter((s: any) => {
      const cId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      return cId === String(roadmapClassId);
    });
  }, [sessions, roadmapClassId]);

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

  // Target book number based on roadmapClass ageGroupCode
  const targetBookNumber = useMemo(() => {
    const target = roadmapClass || activeClass;
    if (!target?.ageGroupCode) return 1;
    if (target.ageGroupCode === '3-4') return 1;
    if (target.ageGroupCode === '4-5') return 2;
    if (target.ageGroupCode === '5-6') return 3;
    return 1;
  }, [roadmapClass, activeClass]);

  // Calendar dates computation (Monday to Sunday for current weekOffset)
  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);

    // Find Monday (1)
    const currentDayOfWeek = targetDate.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    // Day of week numbers: 1 (Mon) to 6 (Sat), 0 (Sun)
    const dayNums = [1, 2, 3, 4, 5, 6, 0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const lastWeekSameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);

      days.push({
        dayIndex: i,
        dayNum: dayNums[i],
        dayName: dayNames[i],
        date: d,
        dateString: d.toISOString().split('T')[0],
        formattedDate: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday,
        lastWeekSameDay,
        lastWeekDateString: lastWeekSameDay.toISOString().split('T')[0]
      });
    }

    return days;
  }, [weekOffset]);

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

    // Sort by startTime
    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
      map[d].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    return map;
  }, [filteredMySchedules]);

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

    const lessonsWithStatus = filteredLessons.map((l: any, idx: number) => {
      const stats = taughtLessonMap[l._id];
      const isCompleted = !!stats && stats.count > 0;
      if (isCompleted) completedCount++;

      let isNext = false;
      if (!isCompleted && !foundNextToTeach) {
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
  }, [curriculumData, targetBookNumber, roadmapSessions]);

  const nextLessonToTeach = useMemo(() => {
    return bookRoadmap.lessons.find((l: any) => l.isNext) || bookRoadmap.lessons.find((l: any) => !l.isCompleted) || null;
  }, [bookRoadmap]);

  const lastLessonTaught = useMemo(() => {
    const taught = bookRoadmap.lessons.filter((l: any) => l.isCompleted);
    return taught.length > 0 ? taught[taught.length - 1] : null;
  }, [bookRoadmap]);

  const effectiveClassId = roadmapClassId || (selectedClassId !== 'ALL' ? selectedClassId : (classes[0]?._id || ''));

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        Đang tải lịch giảng dạy và lộ trình học...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header Controls & Class Selector ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-200">
              <Calendar size={14} className="text-teal-600" /> Sổ Lịch Giảng Dạy & Lộ Trình
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Thời Khóa Biểu & Tiến Độ Giảng Dạy
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi thời khóa biểu do Nhà trường phân công và tiến độ giáo trình theo từng lớp học.
          </p>
        </div>

        {/* Filter Classroom */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <GraduationCap size={18} className="text-teal-600 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="ALL">🏫 Tất cả các lớp giảng dạy ({classes.length})</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi)
                </option>
              ))}
            </select>
          </div>

          {effectiveClassId && (
            <button
              type="button"
              onClick={() => {
                if (nextLessonToTeach) {
                  navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${nextLessonToTeach._id}`);
                } else {
                  navigate(`/teacher/classes/${effectiveClassId}/sessions/new`);
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-teal-700 transition-all shadow-sm cursor-pointer"
            >
              <Play size={16} /> Bắt đầu buổi dạy
            </button>
          )}
        </div>
      </div>

      {/* ── Main Navigation Tabs (Clean & Separated View) ───────────────────── */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-3 pt-2 shadow-xs">
        <button
          type="button"
          id="tab-btn-calendar"
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <CalendarDays size={18} />
          <span>Thời Khóa Biểu & Lịch Dạy Tuần</span>
          {mySchedules.length > 0 && (
            <span className="ml-1 rounded-full bg-teal-100 text-teal-800 px-2 py-0.5 text-xs font-black">
              {mySchedules.reduce((acc, s) => acc + (s.weeklySlots?.length || 0), 0)} buổi/tuần
            </span>
          )}
        </button>

        <button
          type="button"
          id="tab-btn-roadmap"
          onClick={() => setActiveTab('roadmap')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'roadmap'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <BookOpen size={18} />
          <span>Lộ Trình & Tiến Độ Giáo Trình</span>
          {activeClass && (
            <span className="ml-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-black">
              {bookRoadmap.progress.percent}% Sách {targetBookNumber}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: WEEKLY CALENDAR & ADMIN TIMETABLE ─────────────────────────── */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {/* Admin Timetable Fixed Slots Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/50 p-5 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white font-black shadow-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Thời Khóa Biểu Cố Định (Do Ban Quản Trị Phân Bổ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Các ca dạy đã được lên lịch hàng tuần cho giáo viên. Bấm vào ca để bắt đầu buổi dạy nhanh.
                  </p>
                </div>
              </div>

              {filteredMySchedules.length === 0 && (
                <div className="text-xs font-semibold text-slate-400 italic">
                  Chưa có lịch phân công cố định từ Admin cho lớp này
                </div>
              )}
            </div>

            {/* List of scheduled slots */}
            {filteredMySchedules.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {filteredMySchedules.map((sch) => {
                  const theme = COLOR_THEMES[sch.colorTag] || COLOR_THEMES.indigo;
                  const cName = typeof sch.classroom === 'object' ? sch.classroom?.name : 'Lớp học';
                  const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;

                  return sch.weeklySlots?.map((slot, sIdx) => (
                    <div
                      key={`${sch._id}-${sIdx}`}
                      onClick={() => navigate(`/teacher/classes/${cId}/sessions/new`)}
                      className={`group flex items-center gap-2.5 rounded-xl border p-2.5 transition-all cursor-pointer hover:shadow-md active:scale-95 ${theme.bg} ${theme.border}`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${theme.dot}`} />
                          <span className="text-xs font-black text-slate-900">{DAY_LABELS[slot.dayOfWeek]}</span>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${theme.badge}`}>
                            {slot.startTime} - {slot.endTime}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <span>{cName}</span>
                          {slot.room && <span className="text-[10px] text-slate-500">({slot.room})</span>}
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white rounded-lg p-1.5">
                        <Play size={12} />
                      </div>
                    </div>
                  ));
                })}
              </div>
            )}
          </div>

          {/* Week Navigation Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ChevronLeft size={16} /> Tuần trước
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  weekOffset === 0
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Tuần hiện tại
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tuần sau <ChevronRight size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Calendar size={16} className="text-teal-600" />
              <span>
                Tuần từ {currentWeekDays[0].formattedDate} đến {currentWeekDays[6].formattedDate}
              </span>
              {weekOffset !== 0 && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {weekOffset < 0 ? `Đang xem ${Math.abs(weekOffset)} tuần trước` : `Đang xem ${weekOffset} tuần tới`}
                </span>
              )}
            </div>
          </div>

          {/* 7-Days Timetable Grid (Optimized, no overlap) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {currentWeekDays.map((day) => {
              const daySessions = calendarDaySessions[day.dateString] || [];
              const dayFixedSlots = fixedTimetableByDay[day.dayNum] || [];

              return (
                <div
                  key={day.dayIndex}
                  className={`flex flex-col rounded-2xl border p-3.5 transition-all min-h-[360px] ${
                    day.isToday
                      ? 'border-teal-500 bg-teal-50/20 shadow-md ring-2 ring-teal-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Day Header */}
                  <div className="mb-3 border-b border-slate-100 pb-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-500">{day.dayName}</p>
                      <h4 className="text-base font-black text-slate-900">{day.formattedDate}</h4>
                    </div>
                    {day.isToday && (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white uppercase tracking-wider">
                        Hôm nay
                      </span>
                    )}
                  </div>

                  {/* Scheduled Fixed Slots for this day */}
                  {dayFixedSlots.length > 0 && (
                    <div className="mb-3 space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Lịch Admin xếp:
                      </div>
                      {dayFixedSlots.map(({ schedule, slot }, fIdx) => {
                        const theme = COLOR_THEMES[schedule.colorTag] || COLOR_THEMES.indigo;
                        const cName = typeof schedule.classroom === 'object' ? schedule.classroom?.name : 'Lớp';
                        return (
                          <div
                            key={fIdx}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-bold ${theme.bg} ${theme.text} ${theme.border} flex items-center justify-between`}
                          >
                            <span className="truncate">{cName}</span>
                            <span>{slot.startTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Actual sessions conducted */}
                  <div className="flex-1 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Buổi dạy thực tế ({daySessions.length}):
                    </div>

                    {daySessions.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center text-center p-2 text-slate-300">
                        <Calendar size={18} className="mb-1 opacity-40" />
                        <span className="text-xs italic">Chưa mở buổi dạy</span>
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
                            className="rounded-xl border border-teal-100 bg-white p-2.5 shadow-xs hover:border-teal-300 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                {roomName}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {s.startedAt ? new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dạy'}
                              </span>
                            </div>
                            <h5 className="text-xs font-black text-slate-900 line-clamp-1" title={lessonTitle}>
                              {lessonTitle}
                            </h5>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-600 border-t border-slate-50 pt-1">
                              <span>👥 {scoreCount} bé</span>
                              {avg !== undefined && (
                                <span className="font-bold text-amber-600">⭐ {avg}đ</span>
                              )}
                            </div>
                            <Link
                              to={`/teacher/classroom-sessions/${s._id}/summary`}
                              className="mt-1.5 block text-center rounded-lg bg-teal-50 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100 transition-colors"
                            >
                              Xem tổng kết
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
          <div className="rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-white p-6 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Overall Book Progress */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-teal-200/60 pb-5 lg:pb-0 lg:pr-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-700 uppercase tracking-wider">
                    <BookOpen size={15} /> Giáo trình chuẩn • Quyển Sách {targetBookNumber}
                    {roadmapClass && <span className="font-extrabold text-teal-900">• Lớp {roadmapClass.name}</span>}
                  </div>
                  {classes.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-white border border-teal-300 rounded-xl px-2.5 py-1 shadow-xs">
                      <GraduationCap size={14} className="text-teal-600" />
                      <span className="text-[11px] font-bold text-slate-500">Xem lớp:</span>
                      <select
                        value={roadmapClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="bg-transparent text-xs font-black text-teal-900 outline-none cursor-pointer"
                      >
                        {classes.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.name} ({c.ageGroupCode} tuổi)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Đã hoàn thành {bookRoadmap.progress.completed} / {bookRoadmap.progress.total} bài học
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tiến độ tuần tự theo cấu trúc giáo trình từ Unit 1 đến Unit 9 dành cho trẻ {roadmapClass?.ageGroupCode || activeClass?.ageGroupCode || 'mầm non'} tuổi.
                </p>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-black mb-1.5">
                    <span className="text-slate-600">Mức độ hoàn thành sách</span>
                    <span className="text-teal-700 text-sm font-black">{bookRoadmap.progress.percent}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-200/70 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${bookRoadmap.progress.percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Last Taught & Next Lesson Guidance */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Last Taught Lesson */}
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-xs">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    <History size={13} className="text-slate-400" /> Buổi vừa dạy gần nhất
                  </span>
                  {lastLessonTaught ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black">
                          Bài {lastLessonTaught.bookOrderIndex}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          Unit {lastLessonTaught.unitNumber}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1 line-clamp-1" title={lastLessonTaught.title}>
                        {lastLessonTaught.title}
                      </h4>
                      {lastLessonTaught.vietnameseTitle && (
                        <p className="text-xs text-slate-500 italic line-clamp-1">{lastLessonTaught.vietnameseTitle}</p>
                      )}
                      {lastLessonTaught.taughtStats && (
                        <div className="mt-2.5 flex flex-col gap-1.5">
                          <p className="text-[11px] text-emerald-700 font-bold">
                            ✓ Đã dạy ngày {new Date(lastLessonTaught.taughtStats.lastDate).toLocaleDateString('vi-VN')}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (lastLessonTaught.taughtStats?.lastSessionId) {
                                navigate(`/teacher/classroom-sessions/${lastLessonTaught.taughtStats.lastSessionId}/summary`);
                              } else {
                                navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(lastLessonTaught.title)}&classroomId=${roadmapClassId}`);
                              }
                            }}
                            className="mt-1 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-1.5 px-3 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
                          >
                            <History size={13} />
                            <span>Xem nhật ký buổi dạy này</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-3">Chưa có bài nào được dạy cho lớp này</p>
                  )}
                </div>

                {/* Next Lesson To Teach */}
                <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/70 p-4 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between gap-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-900 uppercase tracking-wide">
                      <Flame size={14} className="text-amber-600 animate-pulse" /> Bài tiếp theo cần dạy
                    </span>
                    <span className="rounded-full bg-amber-400 text-amber-950 px-2 py-0.5 text-[10px] font-black">
                      Đề xuất chuẩn
                    </span>
                  </div>

                  {nextLessonToTeach ? (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-200 text-amber-950 px-2 py-0.5 text-[10px] font-black">
                          Bài {nextLessonToTeach.bookOrderIndex}
                        </span>
                        <span className="text-xs font-bold text-amber-800">
                          Unit {nextLessonToTeach.unitNumber}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mt-1 line-clamp-1" title={nextLessonToTeach.title}>
                        {nextLessonToTeach.title}
                      </h4>
                      {nextLessonToTeach.vietnameseTitle && (
                        <p className="text-xs text-slate-600 italic line-clamp-1">{nextLessonToTeach.vietnameseTitle}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          if (effectiveClassId) {
                            navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${nextLessonToTeach._id}`);
                          } else {
                            navigate('/teacher/classroom-sessions');
                          }
                        }}
                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2 px-3 text-xs font-black text-white hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                      >
                        <Play size={13} /> Dạy bài này ngay
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-700 font-bold mt-3">🎉 Đã hoàn thành tất cả bài trong sách!</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Units & Lessons Roadmap List */}
          <div className="space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers size={18} className="text-teal-600" />
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
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-teal-200"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-teal-100 text-teal-800 px-2 py-0.5 text-xs font-black">
                            Unit {unit.unitNumber}
                          </span>
                          <h4 className="font-bold text-base text-slate-900">
                            {unit.title || unit.vietnameseTitle || `Unit ${unit.unitNumber}`}
                          </h4>
                        </div>
                        {unit.bigQuestion && (
                          <p className="text-xs text-slate-500 mt-0.5">❓ Câu hỏi lớn: {unit.bigQuestion}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">
                          {unitCompletedCount}/{unitLessons.length} bài đã học
                        </span>
                        <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${unitPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Lessons Grid within Unit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {unitLessons.map((lesson: any) => (
                        <div
                          key={`${unit._id}-${lesson._id}`}
                          className={`rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                            lesson.isCompleted
                              ? 'border-emerald-200 bg-emerald-50/40 text-emerald-950'
                              : lesson.isNext
                              ? 'border-amber-400 bg-amber-50/60 shadow-sm ring-1 ring-amber-400/30'
                              : 'border-slate-200 bg-slate-50/50 text-slate-600'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[10px] font-black uppercase text-slate-400">
                                Bài {lesson.bookOrderIndex}
                              </span>
                              {lesson.isCompleted ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                  <Check size={10} /> Đã dạy
                                </span>
                              ) : lesson.isNext ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded-full">
                                  ⚡ Tiếp theo
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">Chưa dạy</span>
                              )}
                            </div>

                            <h5 className="font-extrabold text-xs text-slate-900 line-clamp-1" title={lesson.title}>
                              {lesson.title}
                            </h5>
                            {lesson.vietnameseTitle && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">{lesson.vietnameseTitle}</p>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between">
                            {effectiveClassId && (
                              lesson.isCompleted ? (
                                <div className="flex items-center justify-between w-full gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (lesson.taughtStats?.lastSessionId) {
                                        navigate(`/teacher/classroom-sessions/${lesson.taughtStats.lastSessionId}/summary`);
                                      } else {
                                        navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(lesson.title)}&classroomId=${roadmapClassId}`);
                                      }
                                    }}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                    title="Mở xem lại nhật ký buổi dạy đã học"
                                  >
                                    <History size={12} />
                                    <span>Xem nhật ký</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${lesson._id}`)}
                                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                                    title="Tạo thêm một buổi dạy mới cho bài học này"
                                  >
                                    Dạy lại
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/teacher/classes/${effectiveClassId}/sessions/new?lessonId=${lesson._id}`)}
                                  className={`inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer transition ${
                                    lesson.isNext ? 'text-amber-700 hover:text-amber-800' : 'text-teal-700 hover:text-teal-800'
                                  }`}
                                >
                                  <span>Mở buổi dạy</span>
                                  <ArrowRight size={11} />
                                </button>
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
