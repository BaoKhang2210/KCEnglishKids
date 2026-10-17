import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Play,
  History,
  Check,
  Layers,
  GraduationCap,
  CalendarDays,
  Flame
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';
import type { ClassroomSession } from '../../types';

interface ClassOption {
  _id: string;
  name: string;
  ageGroupCode: string;
  studentCount?: number;
}

export const TeacherTeachingSchedule: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'roadmap'>('calendar');

  // Week navigation (offset 0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clsRes, sessRes, currRes] = await Promise.all([
          teacherApi.getClasses(),
          classroomSessionApi.getSessions(),
          teacherApi.getContent()
        ]);

        if (clsRes.data) {
          const clsList = Array.isArray(clsRes.data) ? clsRes.data : clsRes.data.classes || [];
          setClasses(clsList);
          if (clsList.length > 0 && selectedClassId === 'ALL') {
            // Default select first class for roadmap convenience
          }
        }

        if (sessRes.data) {
          const sList = Array.isArray(sessRes.data) ? sessRes.data : sessRes.data.data || [];
          setSessions(sList);
        }

        if (currRes.data) {
          setCurriculumData(currRes.data.data || currRes.data);
        }
      } catch (err) {
        console.error('Lỗi tải lịch giảng dạy:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtered sessions based on selected classroom
  const filteredSessions = useMemo(() => {
    if (selectedClassId === 'ALL') return sessions;
    return sessions.filter((s: any) => {
      const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
      return cId === selectedClassId;
    });
  }, [sessions, selectedClassId]);

  // Selected class object
  const activeClass = useMemo(() => {
    return classes.find((c) => c._id === selectedClassId);
  }, [classes, selectedClassId]);

  // Target book number based on ageGroupCode
  const targetBookNumber = useMemo(() => {
    if (!activeClass?.ageGroupCode) return 1;
    if (activeClass.ageGroupCode === '3-4') return 1;
    if (activeClass.ageGroupCode === '4-5') return 2;
    if (activeClass.ageGroupCode === '5-6') return 3;
    return 1;
  }, [activeClass]);

  // Calendar dates computation (Monday to Sunday for current weekOffset)
  const currentWeekDays = useMemo(() => {
    const now = new Date();
    // Adjust by weekOffset
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);

    // Find Monday (1)
    const currentDayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      // Find same day in previous week (-7 days)
      const lastWeekSameDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7);

      days.push({
        dayIndex: i,
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

  // Map sessions to calendar days
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

  // Roadmap ordering: strict sequence according to book (Unit 1..9, Lesson displayOrder)
  const bookRoadmap = useMemo(() => {
    if (!curriculumData) return { units: [], lessons: [], progress: { total: 0, completed: 0, percent: 0 } };

    const { units = [], lessons = [] } = curriculumData;

    // Filter units matching targetBookNumber
    const filteredUnits = units
      .filter((u: any) => u.bookNumber === targetBookNumber)
      .sort((a: any, b: any) => a.unitNumber - b.unitNumber);

    const unitIds = new Set(filteredUnits.map((u: any) => u._id));

    // Filter lessons belonging to these units and sort strictly
    const filteredLessons = lessons
      .filter((l: any) =>
        Array.isArray(l.curriculumUnits) && l.curriculumUnits.some((uid: any) => unitIds.has(typeof uid === 'object' ? uid._id : uid))
      )
      .sort((a: any, b: any) => {
        // Find unit of a and b
        const uAId = Array.isArray(a.curriculumUnits) ? (typeof a.curriculumUnits[0] === 'object' ? a.curriculumUnits[0]._id : a.curriculumUnits[0]) : '';
        const uBId = Array.isArray(b.curriculumUnits) ? (typeof b.curriculumUnits[0] === 'object' ? b.curriculumUnits[0]._id : b.curriculumUnits[0]) : '';
        const unitA = filteredUnits.find((u: any) => u._id === uAId);
        const unitB = filteredUnits.find((u: any) => u._id === uBId);

        const uNumA = unitA?.unitNumber ?? 0;
        const uNumB = unitB?.unitNumber ?? 0;

        if (uNumA !== uNumB) return uNumA - uNumB;
        return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
      });

    // Check completion status of each lesson
    const taughtLessonMap: Record<string, { count: number; lastDate: string; avgScore: number }> = {};

    filteredSessions.forEach((s) => {
      const lessonId = typeof s.lesson === 'object' ? s.lesson?._id : s.lesson;
      if (lessonId) {
        if (!taughtLessonMap[lessonId]) {
          taughtLessonMap[lessonId] = {
            count: 0,
            lastDate: s.startedAt || s.createdAt || '',
            avgScore: (s.summary as any)?.averageScore ?? s.summary?.averageAccuracy ?? 0
          };
        }
        taughtLessonMap[lessonId].count += 1;
        const sDate = s.startedAt || s.createdAt || '';
        if (new Date(sDate) > new Date(taughtLessonMap[lessonId].lastDate)) {
          taughtLessonMap[lessonId].lastDate = sDate;
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

      // Find unit info
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
  }, [curriculumData, targetBookNumber, filteredSessions]);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
        Đang tải lịch giảng dạy và tiến độ giáo trình…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header Controls ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 border border-teal-200">
              <Calendar size={14} className="text-teal-600" /> Sổ Lịch Giảng Dạy & Tiến Độ Giáo Trình
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Theo dõi tiến trình & Ôn luyện bài cũ
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Dễ dàng quan sát tuần trước ngày đó đã dạy bài gì và lộ trình bài học theo đúng thứ tự sách.
          </p>
        </div>

        {/* Filter Classroom & View Toggle */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200">
            <GraduationCap size={16} className="text-teal-600 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">🏫 Tất cả các lớp của tôi</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi - Sách {c.ageGroupCode === '3-4' ? 1 : c.ageGroupCode === '4-5' ? 2 : 3})
                </option>
              ))}
            </select>
          </div>

          {/* View mode toggle tabs */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={16} /> Lịch Tuần
            </button>
            <button
              type="button"
              onClick={() => setViewMode('roadmap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === 'roadmap'
                  ? 'bg-white text-teal-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers size={16} /> Bản Đồ Sách (Thứ tự chuẩn)
            </button>
          </div>
        </div>
      </div>

      {/* ── Age Group & Book Badge Notice ───────────────────────────────────── */}
      {activeClass && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent p-4 border border-teal-200">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white font-black text-sm shadow-sm">
              B{targetBookNumber}
            </div>
            <div>
              <p className="text-xs font-bold text-teal-700 uppercase tracking-wide">
                Lớp {activeClass.name} • {activeClass.ageGroupCode} tuổi
              </p>
              <h4 className="text-base font-extrabold text-slate-900">
                Chỉ áp dụng giáo trình: Quyển Sách {targetBookNumber} (Preschool {targetBookNumber})
              </h4>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
            🔒 Nội dung lớp học được khóa chuẩn theo lứa tuổi
          </span>
        </div>
      )}

      {/* ── VIEW 1: WEEKLY TEACHING CALENDAR ─────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Week Navigation Bar */}
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

          {/* 7 Days Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {currentWeekDays.map((day) => {
              const daySessions = calendarDaySessions[day.dateString] || [];
              const lastWeekSessions = calendarDaySessions[day.lastWeekDateString] || [];

              return (
                <div
                  key={day.dayIndex}
                  className={`flex flex-col rounded-2xl border p-3.5 transition-all min-h-[290px] ${
                    day.isToday
                      ? 'border-teal-500 bg-teal-50/30 shadow-md ring-2 ring-teal-500/20'
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

                  {/* Sessions on this day */}
                  <div className="flex-1 space-y-2">
                    {daySessions.length === 0 ? (
                      <div className="h-24 flex flex-col items-center justify-center text-center p-2 text-slate-300">
                        <Calendar size={20} className="mb-1 opacity-50" />
                        <span className="text-xs italic">Không có buổi dạy</span>
                      </div>
                    ) : (
                      daySessions.map((s: any) => {
                        const lessonTitle = s.lesson?.title || s.title || 'Buổi học tiếng Anh';
                        const lessonVn = s.lesson?.vietnameseTitle;
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
                            {lessonVn && (
                              <p className="text-[11px] text-slate-500 line-clamp-1 italic">{lessonVn}</p>
                            )}
                            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-600 border-t border-slate-50 pt-1.5">
                              <span>👥 {scoreCount} bé</span>
                              {avg !== undefined && (
                                <span className="font-bold text-amber-600">⭐ {avg}đ</span>
                              )}
                            </div>
                            <Link
                              to={`/teacher/classroom-sessions/${s._id}/summary`}
                              className="mt-2 block text-center rounded-lg bg-teal-50 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100 transition-colors"
                            >
                              Xem tổng kết
                            </Link>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* ── Feature: Tuần trước vào ngày này đã dạy bài gì ────────── */}
                  <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-2 text-xs">
                    <div className="flex items-center gap-1 font-bold text-amber-800 text-[11px] mb-1">
                      <History size={12} className="text-amber-600 shrink-0" />
                      <span>Thứ {day.dayIndex + 2 === 8 ? 'CN' : day.dayIndex + 2} tuần trước:</span>
                    </div>

                    {lastWeekSessions.length === 0 ? (
                      <p className="text-[10px] text-amber-700/70 italic">Chưa có lịch dạy ngày này</p>
                    ) : (
                      <div className="space-y-1">
                        {lastWeekSessions.map((lw: any) => (
                          <div key={lw._id} className="text-[11px] font-bold text-amber-950">
                            • {lw.lesson?.title || lw.title}
                            <span className="text-[10px] font-normal text-amber-700 block ml-2">
                              Lớp {lw.classroom?.name || 'Mầm non'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: SYLLABUS ROADMAP (STRICT BOOK ORDER) ─────────────────────── */}
      {viewMode === 'roadmap' && (
        <div className="space-y-6">
          {/* Progress Overview Card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                  Tiến độ giáo trình chuẩn
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Quyển Sách {targetBookNumber} — Đã dạy {bookRoadmap.progress.completed} / {bookRoadmap.progress.total} bài học
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Các bài học được hiển thị tuần tự theo đúng cấu trúc trang sách từ Unit 1 đến Unit 9.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-3xl font-black text-teal-600">{bookRoadmap.progress.percent}%</span>
                  <p className="text-xs font-semibold text-slate-500">Hoàn thành giáo trình</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${bookRoadmap.progress.percent}%` }}
              />
            </div>
          </div>

          {/* Sequential Lessons List according to book */}
          {bookRoadmap.lessons.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              <BookOpen size={36} className="mx-auto mb-3 text-slate-400" />
              <p className="font-bold">Đang tải cấu trúc bài học cho Sách {targetBookNumber}…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {bookRoadmap.lessons.map((lesson: any) => {
                const isTaught = lesson.isCompleted;
                const isNext = lesson.isNext;

                return (
                  <div
                    key={lesson._id}
                    className={`flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                      isNext
                        ? 'border-amber-400 bg-amber-50/40 shadow-md ring-2 ring-amber-400/30'
                        : isTaught
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-200 bg-white opacity-85'
                    }`}
                  >
                    <div>
                      {/* Badge Unit & Book Order */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800">
                          Bài {lesson.bookOrderIndex} trong sách
                        </span>

                        {isTaught ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            <Check size={12} /> Đã dạy ({lesson.taughtStats.count} lần)
                          </span>
                        ) : isNext ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black text-amber-950 animate-pulse">
                            <Flame size={12} /> Bài tiếp theo cần dạy
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                            Chưa dạy
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-teal-700">
                        Unit {lesson.unitNumber}: {lesson.unitTitle}
                      </p>

                      <h4 className="text-base font-black text-slate-900 mt-1">
                        {lesson.title}
                      </h4>
                      {lesson.vietnameseTitle && (
                        <p className="text-xs font-medium text-slate-500 italic mt-0.5">
                          {lesson.vietnameseTitle}
                        </p>
                      )}

                      {/* Stats if taught */}
                      {isTaught && lesson.taughtStats && (
                        <div className="mt-3 rounded-xl bg-white/80 p-2.5 border border-emerald-100 text-xs text-slate-600">
                          <p className="font-semibold text-emerald-800">
                            🕒 Dạy gần nhất: {new Date(lesson.taughtStats.lastDate).toLocaleDateString('vi-VN')}
                          </p>
                          {lesson.taughtStats.avgScore > 0 && (
                            <p className="font-bold text-amber-700 mt-0.5">
                              ⭐ Điểm trung bình cả lớp: {lesson.taughtStats.avgScore}đ
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          const targetClassId = selectedClassId !== 'ALL' ? selectedClassId : (classes[0]?._id || '');
                          if (targetClassId) {
                            navigate(`/teacher/classes/${targetClassId}/sessions/new?lessonId=${lesson._id}`);
                          } else {
                            navigate('/teacher/classroom-sessions');
                          }
                        }}
                        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all shadow-xs ${
                          isNext
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : isTaught
                            ? 'border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100'
                            : 'bg-teal-600 text-white hover:bg-teal-700'
                        }`}
                      >
                        <Play size={14} /> {isTaught ? 'Dạy lại bài này' : 'Dạy bài này ngay'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
