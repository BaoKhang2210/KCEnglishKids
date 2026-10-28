import { vietnamDate, vietnamWallClock } from '../../utils/vietnamTime';
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Play,
  CheckSquare,
  Square,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Search,
  Flame,
  Sparkles,
  History,
  Lock,
  AlertTriangle
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';
import type { ClassSchedule } from '../../types';

const Loader = () => (
  <div className="flex h-72 flex-col items-center justify-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    <span className="text-base font-bold text-slate-700">Đang tải dữ liệu lớp học và giáo trình…</span>
  </div>
);

const DAY_LABELS: Record<number, string> = {
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

export const ClassroomSessionSetup: React.FC = () => {
  const { classId: routeClassId = '' } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preparedPlan = useLocation().state?.lessonPlan;

  const [activeClassId, setActiveClassId] = useState<string>(
    routeClassId || searchParams.get('classroomId') || ''
  );
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classroom, setClassroom] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  // Selection states
  const [selectedLessonId, setSelectedLessonId] = useState(
    searchParams.get('lessonId') || ''
  );
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [lessonActivities, setLessonActivities] = useState<any[]>([]);

  // Session metadata
  const [sessionNumber, setSessionNumber] = useState(1);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [duration, setDuration] = useState(45);
  const [title, setTitle] = useState('');

  // Pre-Session Attendance Check-in State
  const [attendanceDate, setAttendanceDate] = useState(() => vietnamDate());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Filters & Schedule Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Live timer for timetable check
  const [currentVnTime, setCurrentVnTime] = useState<Date>(getVietnamNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVnTime(getVietnamNow());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    teacherApi
      .getClasses()
      .then((res) => {
        const list = res.data || [];
        setAllClasses(list);
        if (!activeClassId && list.length > 0) {
          setActiveClassId(String(list[0]._id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeClassId) return;
    let cancelled = false;
    const todayStr = attendanceDate || vietnamDate();
    setLoadingAttendance(true);

    Promise.all([
      teacherApi.getClassDetail(activeClassId),
      teacherApi.getContent(),
      classroomSessionApi.getSessions({ classroomId: activeClassId }),
      teacherApi.getClassAttendance(activeClassId, todayStr),
      teacherApi.getMySchedule()
    ])
      .then(([cls, cnt, prevSess, attRes, schedRes]) => {
        if (cancelled) return;
        const classData = cls.data;
        setClassroom(classData);
        setContent(cnt.data);
        const list = (prevSess.data || []) as any[];
        setPreviousSessions(list.filter(item => item.status === 'COMPLETED'));
        const maxPrev = list.reduce((m: number, s: any) => Math.max(m, Number(s.sessionNumber) || 0), 0);
        const nextNum = maxPrev > 0 ? maxPrev + 1 : (list.length + 1);
        setSessionNumber(nextNum);

        const schedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
        setSchedules(schedList);

        // Auto pre-select attached lesson from timetable slot or Admin-designated current lesson if not provided in URL
        if (!selectedLessonId) {
          const activeClassScheds = schedList.filter((s: any) => {
            const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
            return String(cId) === String(activeClassId);
          });
          let slotLessonId: string | null = null;
          const currentDay = getVietnamNow().getDay();
          const currentMinutes = getVietnamNow().getHours() * 60 + getVietnamNow().getMinutes();
          for (const s of activeClassScheds) {
            for (const slot of s.weeklySlots || []) {
              const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
              const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
              if (slot.dayOfWeek === currentDay && currentMinutes >= (sH * 60 + sM - 15) && currentMinutes <= (eH * 60 + eM + 30)) {
                if (slot.lesson) {
                  slotLessonId = typeof slot.lesson === 'object' ? slot.lesson._id : slot.lesson;
                  break;
                }
              }
            }
          }

          if (slotLessonId) {
            setSelectedLessonId(String(slotLessonId));
          } else if (classData?.currentLesson) {
            const cId = typeof classData.currentLesson === 'object' ? classData.currentLesson._id : classData.currentLesson;
            if (cId) setSelectedLessonId(String(cId));
          }
        }

        // Populate attendance records from today's saved records or initialize with PRESENT
        const classroomStudents = classData?.students || [];
        const existingRecords = attRes?.data?.records || [];
        const existingMap = new Map(existingRecords.map((r: any) => [String(r.student?._id || r.student), r]));

        const merged = classroomStudents.map((st: any) => {
          const sId = String(st._id || st);
          const found = existingMap.get(sId) as any;
          return {
            student: st,
            status: found?.status || 'PRESENT',
            note: found?.note || ''
          };
        });
        setAttendanceRecords(merged);
        if (attRes?.data?.note) setAttendanceNote(attRes.data.note);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingAttendance(false); });
    return () => { cancelled = true; };
  }, [activeClassId, attendanceDate]);

  // ── Requirement 10: Strict Timetable Timing Evaluation ─────────────────────
  const scheduleLiveTiming = useMemo(() => {
    const currentDay = currentVnTime.getDay();
    const currentMinutes = currentVnTime.getHours() * 60 + currentVnTime.getMinutes();

    const classSchedules = schedules.filter((s: any) => {
      const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
      return String(cId) === String(activeClassId);
    });

    if (classSchedules.length === 0) {
      return {
        canTeachNow: false,
        activeSlot: null,
        nextSlotText: null,
        hasSchedule: false,
        reason: 'Lớp học chưa có lịch xếp thời khóa biểu từ Ban Quản Trị.'
      };
    }

    let activeSlot: any = null;
    const upcomingList: Array<{ slot: any; distance: number; dateStr: string }> = [];

    for (const sch of classSchedules) {
      for (const slot of sch.weeklySlots || []) {
        const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        // Active slot window: 15 minutes before start up to 30 minutes after end
        if (slot.dayOfWeek === currentDay && currentMinutes >= (startMin - 15) && currentMinutes <= (endMin + 30)) {
          activeSlot = slot;
        }

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
          distance,
          dateStr
        });
      }
    }

    if (activeSlot) {
      return {
        canTeachNow: true,
        activeSlot,
        nextSlotText: null,
        hasSchedule: true,
        reason: `Đang trong khung giờ dạy: ${DAY_LABELS[activeSlot.dayOfWeek]} (${activeSlot.startTime} - ${activeSlot.endTime})`
      };
    }

    upcomingList.sort((a, b) => a.distance - b.distance);
    const nextItem = upcomingList[0] || null;

    let nextSlotText = null;
    if (nextItem) {
      const hours = Math.floor(nextItem.distance / 60);
      const mins = nextItem.distance % 60;
      const timeRemaining = hours > 24
        ? `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`
        : `${hours} giờ ${mins} phút`;
      nextSlotText = `${DAY_LABELS[nextItem.slot.dayOfWeek]} (ngày ${nextItem.dateStr}) lúc ${nextItem.slot.startTime} - ${nextItem.slot.endTime} (còn ${timeRemaining})`;
    }

    return {
      canTeachNow: false,
      activeSlot: null,
      nextSlotText,
      hasSchedule: true,
      reason: nextSlotText
        ? `Chưa đến giờ dạy theo thời khóa biểu. Buổi học kế tiếp: ${nextSlotText}`
        : 'Chưa có ca dạy phù hợp trong tuần.'
    };
  }, [currentVnTime, schedules, activeClassId]);

  // When a lesson is chosen, update title and fetch activities
  useEffect(() => {
    if (!selectedLessonId || !content) return;
    const lesson = content.lessons.find((l: any) => l._id === selectedLessonId);
    setSelectedLesson(lesson || null);

    if (lesson) {
      setTitle(`Buổi ${sessionNumber}: ${lesson.title} - ${lesson.vietnameseTitle || ''}`);
    }

    const acts = content.activities.filter(
      (a: any) => String(a.lesson) === selectedLessonId
    );
    setLessonActivities(acts);
    if (selectedActivityIds.length === 0) {
      setSelectedActivityIds(acts.map((a: any) => a._id));
    }
  }, [selectedLessonId, content, sessionNumber]);

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE') => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        const sId = String(r.student?._id || r.student);
        return sId === String(studentId) ? { ...r, status } : r;
      })
    );
  };

  const setStudentNote = (studentId: string, note: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        const sId = String(r.student?._id || r.student);
        return sId === String(studentId) ? { ...r, note } : r;
      })
    );
  };

  const markAllStatus = (status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE') => {
    setAttendanceRecords((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleCreate = async () => {
    if (!activeClassId || loadingAttendance || creating) return;

    // Strict timetable verification
    if (!scheduleLiveTiming.canTeachNow) {
      setError('Quy định: Chưa đến giờ dạy theo thời khóa biểu của lớp học này. Vui lòng quay lại đúng ngày và giờ quy định!');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const res = await classroomSessionApi.createSession({
        classroomId: activeClassId,
        lessonId: selectedLessonId || undefined,
        title: title || `Buổi ${sessionNumber}: ${selectedLesson?.title || 'Buổi dạy trên lớp'}`,
        activityIds: selectedActivityIds,
        plannedDuration: duration,
        sessionNumber: Number(sessionNumber) || 1,
        includeWarmup: includeWarmup,
        lessonPlan: preparedPlan,
        attendanceRecords,
        attendanceDate,
        attendanceNote
      });
      const sessionId = res.data._id;
      // Start session immediately
      await classroomSessionApi.startSession(sessionId);
      navigate(`/teacher/classroom-sessions/${sessionId}/live`);
    } catch (e: any) {
      setError(e.message || 'Không thể tạo buổi dạy');
      setCreating(false);
    }
  };

  const targetBookNumber =
    classroom?.ageGroupCode === '3-4' ? 1 : classroom?.ageGroupCode === '4-5' ? 2 : 3;

  const targetBookTitle =
    classroom?.ageGroupCode === '3-4'
      ? 'Sách 1 (Mầm 3–4 tuổi)'
      : classroom?.ageGroupCode === '4-5'
      ? 'Sách 2 (Chồi 4–5 tuổi)'
      : 'Sách 3 (Lá 5–6 tuổi)';

  // Build lesson schedule items strictly sorted by BOOK SEQUENTIAL ORDER
  const scheduleItems = useMemo(() => {
    if (!content || !content.lessons || !classroom) return [];

    const targetBook = classroom.ageGroupCode === '3-4' ? 1 : classroom.ageGroupCode === '4-5' ? 2 : 3;
    const unitsMap = new Map<string, any>((content.units || []).map((u: any) => [String(u._id), u]));
    const booksMap = new Map<any, any>((content.books || []).map((b: any) => [b.bookNumber, b]));

    const taughtSessionMap = new Map<string, string>();
    previousSessions.forEach((s) => {
      const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      if (activeClassId && sClassId && sClassId !== String(activeClassId)) {
        return;
      }
      const lId = String(typeof s.lesson === 'object' ? s.lesson?._id : s.lesson);
      if (lId && s._id) {
        taughtSessionMap.set(lId, String(s._id));
      }
    });

    const taughtLessonIds = new Set(
      previousSessions
        .filter((s) => {
          const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
          return !sClassId || !activeClassId || sClassId === String(activeClassId);
        })
        .map((s) => (typeof s.lesson === 'object' ? s.lesson?._id : s.lesson))
        .filter(Boolean)
        .map(String)
    );

    (classroom.completedLessons || []).forEach((id: any) => taughtLessonIds.add(String(id?._id || id)));

    // Identify last taught session
    const pastSessionsWithLesson = [...previousSessions]
      .filter((s: any) => {
        if (!s.lesson) return false;
        const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
        return !sClassId || !activeClassId || sClassId === String(activeClassId);
      })
      .sort((a: any, b: any) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime());
    const lastSession = pastSessionsWithLesson[0];
    const lastTaughtLessonId = lastSession ? String(typeof lastSession.lesson === 'object' ? lastSession.lesson._id : lastSession.lesson) : null;
    const lastTaughtSessionNum = lastSession?.sessionNumber || null;

    // Filter relevant lessons
    const relevantLessons = content.lessons.filter((l: any) => {
      const uId = Array.isArray(l.curriculumUnits) ? String(l.curriculumUnits[0]) : String(l.curriculumUnits || '');
      const u = unitsMap.get(uId);
      const bNum = u?.bookNumber || (l.ageGroupCode === '3-4' ? 1 : l.ageGroupCode === '4-5' ? 2 : 3);
      return bNum === targetBook || l.ageGroupCode === classroom.ageGroupCode;
    });

    // Sort according to Book sequence: Unit 1..9 -> Lesson displayOrder
    const sorted = [...relevantLessons].sort((a: any, b: any) => {
      const uIdA = Array.isArray(a.curriculumUnits) ? String(a.curriculumUnits[0]) : String(a.curriculumUnits || '');
      const uIdB = Array.isArray(b.curriculumUnits) ? String(b.curriculumUnits[0]) : String(b.curriculumUnits || '');
      const unitA = unitsMap.get(uIdA);
      const unitB = unitsMap.get(uIdB);

      const unitNumA = unitA?.unitNumber || 0;
      const unitNumB = unitB?.unitNumber || 0;
      if (unitNumA !== unitNumB) return unitNumA - unitNumB;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    // Admin designated lesson
    const adminCurrentId = classroom?.currentLesson ? String(typeof classroom.currentLesson === 'object' ? classroom.currentLesson._id : classroom.currentLesson) : null;

    // Find the next lesson in book order that hasn't been taught
    const nextUntaughtLesson = sorted.find((l: any) => !taughtLessonIds.has(String(l._id))) || sorted[0];
    const nextLessonId = (adminCurrentId && !taughtLessonIds.has(adminCurrentId) ? adminCurrentId : null) || (nextUntaughtLesson ? String(nextUntaughtLesson._id) : null);

    return sorted.map((lesson: any, index: number) => {
      const unitId = Array.isArray(lesson.curriculumUnits)
        ? String(lesson.curriculumUnits[0])
        : String(lesson.curriculumUnits || '');
      const unit = unitsMap.get(unitId);
      const bookNumber = targetBook;
      const book = booksMap.get(bookNumber) || (unit?.book as any);

      const acts = (content.activities || []).filter(
        (a: any) => String(a.lesson) === String(lesson._id)
      );

      const isTaught = taughtLessonIds.has(String(lesson._id));
      const isLastTaught = String(lesson._id) === lastTaughtLessonId;
      const isAdminAssigned = !isTaught && adminCurrentId && String(lesson._id) === adminCurrentId;
      const isNextToTeach = String(lesson._id) === nextLessonId;
      const lastSessionId = taughtSessionMap.get(String(lesson._id));

      return {
        ...lesson,
        unit,
        book,
        bookNumber,
        activityCount: acts.length,
        vocabCount: lesson.vocabularyItems?.length || 0,
        isTaught,
        isLastTaught,
        isAdminAssigned,
        isNextToTeach,
        lastTaughtSessionNum,
        lastSessionId,
        bookOrderIndex: index + 1
      };
    });
  }, [content, previousSessions, classroom, activeClassId]);

  // Pre-select recommended next lesson
  useEffect(() => {
    if (!selectedLessonId && scheduleItems.length > 0) {
      const adminAssigned = scheduleItems.find((item: any) => item.isAdminAssigned);
      const nextItem = adminAssigned || scheduleItems.find((item: any) => item.isNextToTeach) || scheduleItems[0];
      if (nextItem?._id) {
        setSelectedLessonId(String(nextItem._id));
      }
    }
  }, [scheduleItems, selectedLessonId]);

  // Filter lessons
  const filteredSchedule = useMemo(() => {
    return scheduleItems.filter((item: any) => {
      if (selectedUnitFilter !== 'ALL' && String(item.unit?._id) !== selectedUnitFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tMatch = (item.title || '').toLowerCase().includes(q);
        const vnMatch = (item.vietnameseTitle || '').toLowerCase().includes(q);
        const uMatch = (item.unit?.title || '').toLowerCase().includes(q);
        const topMatch = (item.topic?.englishName || '').toLowerCase().includes(q);
        if (!tMatch && !vnMatch && !uMatch && !topMatch) return false;
      }

      return true;
    });
  }, [scheduleItems, selectedUnitFilter, searchQuery]);

  if (error && (!classroom || !content)) return <div className="p-8"><div className="teacher-error" role="alert">{error}<button onClick={() => window.location.reload()}>Thử lại</button></div><button className="teacher-button mt-4" onClick={() => navigate('/teacher/classes')}>Về lớp phụ trách</button></div>;
  if (!classroom || !content) return <Loader />;

  const ageLabel: Record<string, string> = {
    '3-4': 'Mầm (3–4 tuổi)',
    '4-5': 'Chồi (4–5 tuổi)',
    '5-6': 'Lá (5–6 tuổi)'
  };

  const selectedUnit = content.units?.find((u: any) =>
    selectedLesson?.curriculumUnits?.some((cu: any) => String(cu) === String(u._id))
  );

  return (
    <div className="staff-workspace min-h-screen py-8 bg-[#f8fafc] text-slate-900">
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate(activeClassId ? `/teacher/classes/${activeClassId}` : '/teacher/classes')}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} /> Quay lại {classroom?.name ? `lớp ${classroom.name}` : 'danh sách lớp'}
        </button>

        {/* Main Page Title with Teacher Name and Class Age */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-7 rounded-3xl border border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-teal-100 px-3.5 py-1 text-xs font-black text-teal-800">
                {ageLabel[classroom.ageGroupCode] || classroom.ageGroupCode}
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs font-bold text-slate-600">
                {classroom.students?.length || 0} học sinh
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs font-black text-indigo-800 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                👩‍🏫 Giáo viên: {classroom.teacher?.name || 'Giáo viên phụ trách'}
              </span>
              <span className="text-xs text-slate-600">•</span>
              <span className="text-xs font-black text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                Đã dạy {previousSessions.length} buổi
              </span>
              {allClasses.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-teal-200 rounded-xl px-3 py-1 ml-1">
                  <span className="text-xs font-bold text-teal-800">Đổi lớp:</span>
                  <select
                    value={activeClassId}
                    onChange={(e) => {
                      setActiveClassId(e.target.value);
                      setSelectedLessonId('');
                      setSelectedLesson(null);
                      setSelectedActivityIds([]);
                    }}
                    className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                  >
                    {allClasses.map((ac) => (
                      <option key={ac._id} value={ac._id}>
                        {ac.name} ({ac.ageGroupCode || '3-4'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <h1 className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tạo Buổi Dạy Mới Theo Giáo Trình
            </h1>
            <p className="mt-1 text-sm sm:text-base text-slate-600 font-medium">
              Lớp <strong>{classroom.name}</strong> theo chuẩn <strong>{targetBookTitle}</strong>. Bài học được sắp xếp theo đúng thứ tự trang sách.
            </p>
          </div>

          {/* Quick Schedule Status Tag */}
          <div className="shrink-0">
            {scheduleLiveTiming.canTeachNow ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-900 border border-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 animate-ping" />
                Đang trong ca dạy
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-950 border border-amber-300">
                <Lock size={14} className="text-amber-800" />
                Chưa đến ca dạy
              </span>
            )}
          </div>
        </div>

        {/* ── Requirement 10 Alert Banner: Timetable Schedule Lock Warning ──────── */}
        {!scheduleLiveTiming.canTeachNow && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-700 text-white shrink-0 mt-0.5">
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-200 text-amber-950 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                  Khóa giờ dạy
                </span>
                <h4 className="text-base font-black text-amber-950">
                  Lớp học chỉ mở khi đến đúng ngày đúng giờ theo Thời Khóa Biểu
                </h4>
              </div>
              <p className="text-sm text-slate-700 mt-1 font-medium">
                {scheduleLiveTiming.nextSlotText ? (
                  <span>
                    Ca dạy tiếp theo của lớp: <strong className="text-amber-950">{scheduleLiveTiming.nextSlotText}</strong>. Giáo viên chỉ có thể nhấn nút "Bắt đầu buổi dạy" khi bước vào khung giờ này (hệ thống tự động mở sớm 15 phút).
                  </span>
                ) : (
                  <span>{scheduleLiveTiming.reason}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
          {[
            { num: 1, label: 'Chọn bài học theo lộ trình' },
            { num: 2, label: 'Cấu hình trò chơi & tùy chọn' },
            { num: 3, label: 'Điểm danh & Bắt đầu buổi dạy' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  if (s.num === 1 || selectedLessonId) {
                    setStep(s.num as any);
                  }
                }}
                className="flex items-center gap-2.5 cursor-pointer transition-transform hover:scale-102"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-black transition-all ${
                    step >= s.num
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {s.num}
                </div>
                <span
                  className={`hidden sm:inline text-sm font-extrabold ${
                    step >= s.num ? 'text-teal-900' : 'text-slate-600'
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < 2 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded-full transition-colors ${
                    step > s.num ? 'bg-teal-700' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 border-2 border-rose-200 flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-800 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Step 1: Syllabus Schedule & Choose Lesson ────────────────────────── */}
        {step === 1 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            {/* Header of Step 1 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-100 text-teal-800">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Bước 1 — Bảng Phân Phối Buổi Học Theo Giáo Trình
                  </h2>
                  <p className="text-sm text-slate-600 font-medium mt-0.5">
                    Chọn bài học theo lộ trình chuẩn. Hệ thống tự động đánh dấu bài kế tiếp theo phân công của Ban Quản Trị.
                  </p>
                </div>
              </div>

              {/* Roadmap Progress Badge */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl text-xs font-black text-slate-700">
                <span className="text-teal-800">Lộ trình Sách {targetBookNumber}:</span>
                <span className="text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-300">
                  Đã dạy {scheduleItems.filter((i: any) => i.isTaught).length}/{scheduleItems.length} bài
                </span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="relative sm:col-span-5">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học, chủ đề, từ vựng…"
                  className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Book Badge */}
              <div className="sm:col-span-4 flex items-center gap-2.5 rounded-2xl bg-teal-50 border border-teal-200 px-4 py-2.5">
                <BookOpen size={20} className="text-teal-800 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black text-teal-800 uppercase tracking-wider">Giáo trình chuẩn của lớp</p>
                  <p className="text-sm font-black text-teal-950 truncate">
                    {targetBookTitle}
                  </p>
                </div>
              </div>

              {/* Unit Filter */}
              <div className="sm:col-span-3">
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-sm font-black text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white cursor-pointer"
                >
                  <option value="ALL">📖 Tất cả Unit ({targetBookTitle})</option>
                  {(content.units || [])
                    .filter((u: any) => u.bookNumber === targetBookNumber || u.ageGroupCode === classroom.ageGroupCode)
                    .sort((a: any, b: any) => (a.unitNumber || 0) - (b.unitNumber || 0))
                    .map((u: any) => (
                      <option key={u._id} value={String(u._id)}>
                        Unit {u.unitNumber}: {u.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Schedule Table View */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Thứ tự Sách</th>
                      <th className="py-3.5 px-4">Chủ đề & Unit</th>
                      <th className="py-3.5 px-4">Bài học (Lesson)</th>
                      <th className="py-3.5 px-3 text-center">Từ vựng</th>
                      <th className="py-3.5 px-3 text-center">Hoạt động</th>
                      <th className="py-3.5 px-4 text-center">Trạng thái lộ trình</th>
                      <th className="py-3.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-600 text-sm font-semibold">
                          Không tìm thấy bài học nào phù hợp với bộ lọc trong {targetBookTitle}.
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item: any, idx: number) => {
                        const isSelected = selectedLessonId === item._id;
                        return (
                          <tr
                            key={`${item._id}-${idx}`}
                            onClick={() => setSelectedLessonId(item._id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-teal-50 font-bold ring-2 ring-inset ring-teal-500'
                                : item.isAdminAssigned
                                ? 'bg-amber-100/40 hover:bg-amber-100/70'
                                : item.isNextToTeach
                                ? 'bg-amber-50/50 hover:bg-amber-50/90'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Sequential Book Order */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-xs font-black ${
                                item.isAdminAssigned
                                  ? 'bg-amber-300 text-amber-950 border border-amber-400'
                                  : item.isNextToTeach
                                  ? 'bg-amber-200 text-amber-950 border border-amber-300'
                                  : 'bg-teal-100 text-teal-900'
                              }`}>
                                Bài {item.bookOrderIndex || idx + 1}
                              </span>
                            </td>

                            {/* Book & Unit */}
                            <td className="py-4 px-4 text-xs">
                              <div className="font-extrabold text-slate-900 text-sm">
                                Unit {item.unit?.unitNumber || 1}
                              </div>
                              <div className="text-slate-600 font-medium">
                                {item.unit?.title || 'Chủ đề mầm non'}
                              </div>
                            </td>

                            {/* Lesson Title */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <p className="font-extrabold text-slate-900 text-base">{item.title}</p>
                                {item.isAdminAssigned && (
                                  <span className="rounded-full bg-amber-700 text-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                                    🎯 Kế hoạch Admin
                                  </span>
                                )}
                                {!item.isAdminAssigned && item.isNextToTeach && (
                                  <span className="rounded-full bg-amber-200 text-amber-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                    Đề xuất dạy
                                  </span>
                                )}
                              </div>
                              {item.vietnameseTitle && (
                                <p className="text-xs text-slate-600 italic mt-0.5">{item.vietnameseTitle}</p>
                              )}
                            </td>

                            {/* Vocab count */}
                            <td className="py-4 px-3 text-center">
                              <span className="rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 border border-amber-200">
                                {item.vocabCount} từ
                              </span>
                            </td>

                            {/* Activity count */}
                            <td className="py-4 px-3 text-center">
                              <span className="rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-900 border border-purple-200">
                                {item.activityCount} game
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4 text-center">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white">
                                  Đang chọn
                                </span>
                              ) : item.isAdminAssigned ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">
                                  🎯 Phân công hiện tại
                                </span>
                              ) : item.isNextToTeach ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 border border-amber-300">
                                  ⭐ Bài tiếp theo
                                </span>
                              ) : item.isLastTaught ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 size={13} className="text-emerald-800" /> Vừa dạy gần nhất
                                </span>
                              ) : item.isTaught ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                  <CheckCircle2 size={13} className="text-slate-600" /> Đã dạy
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                                  Chưa dạy
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-4 px-4 text-right">
                              {item.isTaught ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (item.lastSessionId) {
                                        navigate(`/teacher/classroom-sessions/${item.lastSessionId}/summary`);
                                      } else {
                                        navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(item.title)}&classroomId=${activeClassId}`);
                                      }
                                    }}
                                    className="rounded-xl px-3 py-1.5 text-xs font-black bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <History size={13} />
                                    <span>Xem nhật ký</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedLessonId(item._id);
                                    }}
                                    className={`rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-teal-700 text-white'
                                        : 'text-inherit hover:text-slate-800 underline'
                                    }`}
                                  >
                                    {isSelected ? 'Đã chọn' : 'Dạy lại'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLessonId(item._id);
                                  }}
                                  className={`rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-teal-700 text-white'
                                      : item.isAdminAssigned || item.isNextToTeach
                                      ? 'bg-amber-700 text-white hover:bg-amber-700'
                                      : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-800'
                                  }`}
                                >
                                  {isSelected ? 'Đã chọn ✓' : item.isAdminAssigned ? 'Chọn bài này 🎯' : 'Chọn bài'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Lesson Bar & Continue */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <div className="text-sm">
                {selectedLesson ? (
                  <div className="flex items-center gap-2.5 text-slate-800">
                    <CheckCircle2 size={20} className="text-teal-800 shrink-0" />
                    <span>
                      Đang chọn bài:{' '}
                      <strong className="text-slate-900 font-black text-base">{selectedLesson.title}</strong>{' '}
                      ({selectedLesson.vocabularyItems?.length || 0} từ vựng, {lessonActivities.length} game)
                    </span>
                  </div>
                ) : (
                  <p className="text-amber-800 font-bold">⚠️ Vui lòng nhấp chọn 1 bài học ở trên để tiếp tục</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {selectedLessonId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/teacher/lesson-planner?classroomId=${activeClassId}&lessonId=${selectedLessonId}`)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-black text-amber-950 hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    <Sparkles size={16} className="text-amber-800" />
                    Xem gợi ý giáo án AI
                  </button>
                )}

                <button
                  disabled={!selectedLessonId}
                  onClick={() => setStep(2)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-7 py-3 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Tiếp tục bước 2 <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Choose Activities & Session Options ───────────────────────── */}
        {step === 2 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-800">
                <CheckSquare size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Bước 2 — Cấu Hình Buổi Học & Trò Chơi Tương Tác
                </h2>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Thiết lập tiến độ buổi học, kích hoạt Ôn Cũ Học Mới và chọn trò chơi tương tác
                </p>
              </div>
            </div>

            {/* Configuration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Auto-Assigned Session Number Card */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-teal-800 uppercase tracking-wider block">
                    Tiến độ buổi dạy (Tự động gán)
                  </span>
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <span className="text-2xl font-black text-slate-900">
                      BUỔI HỌC SỐ {sessionNumber}
                    </span>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-teal-700 text-white uppercase">
                      Tự động tiếp nối
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    {sessionNumber > 1
                      ? `Hệ thống tự động nối tiếp sau Buổi ${sessionNumber - 1} (Lớp đã hoàn thành ${sessionNumber - 1} buổi)`
                      : 'Buổi học đầu tiên của lớp học'}
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-700 font-black text-white text-xl">
                  #{sessionNumber}
                </div>
              </div>

              {/* Warm-up Toggle */}
              <div
                onClick={() => setIncludeWarmup(!includeWarmup)}
                className={`rounded-2xl border-2 p-5 cursor-pointer transition-all ${
                  includeWarmup
                    ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/40'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">
                    {includeWarmup ? (
                      <CheckSquare size={22} className="text-amber-800" />
                    ) : (
                      <Square size={22} className="text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-slate-900 text-base">
                      <Flame size={18} className="text-amber-800 fill-amber-500" />
                      Kích hoạt pha &quot;Ôn Cũ Học Mới&quot; (Warm-up)
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
                      Dành 5-10 phút đầu buổi để ôn tập lại toàn bộ từ vựng và mẫu câu đã học ở bài học ngay trước đó của lớp.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activities list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Trò chơi tương tác ({selectedActivityIds.length}/{lessonActivities.length})
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedActivityIds(
                      selectedActivityIds.length === lessonActivities.length
                        ? []
                        : lessonActivities.map((a: any) => a._id)
                    )
                  }
                  className="text-xs font-bold text-teal-800 hover:underline cursor-pointer"
                >
                  {selectedActivityIds.length === lessonActivities.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button>
              </div>

              {lessonActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 font-medium">
                  Bài học này chưa cấu hình trò chơi tương tác riêng. Buổi học vẫn diễn ra đầy đủ với phần thẻ từ vựng trực quan, dạy phát âm và ôn cũ học mới.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3  pr-1">
                  {lessonActivities.map((a: any) => {
                    const checked = selectedActivityIds.includes(a._id);
                    return (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => toggleActivity(a._id)}
                        className={`flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${
                          checked
                            ? 'border-violet-500 bg-violet-50'
                            : 'border-slate-200 hover:border-violet-300 bg-white'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare size={20} className="text-violet-800 shrink-0" />
                        ) : (
                          <Square size={20} className="text-slate-600 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-900 text-sm truncate">{a.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Dạng: {a.activityType?.replace(/_/g, ' ')} · {a.questionCount || 5} câu hỏi
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Duration Selector */}
            <div className="border-t border-slate-100 pt-5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                Thời lượng dự kiến buổi học
              </label>
              <div className="flex flex-wrap gap-3">
                {[20, 30, 45, 60].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`rounded-2xl px-5 py-2.5 text-sm font-black transition-all cursor-pointer ${
                      duration === d
                        ? 'bg-teal-700 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {d} phút
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft size={16} /> Quay lại bước 1
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-2xl bg-teal-700 px-7 py-3 text-sm font-black text-white hover:bg-teal-700 transition-all cursor-pointer"
              >
                Tiếp tục bước 3 (Điểm danh) <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Attendance Check & Start Session ─────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Attendance Check-in Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Bước 3 — Điểm Danh Sĩ Số Lớp Học
                    </h2>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      Điểm danh trước khi bắt đầu dạy. Dữ liệu sẽ lưu vào sổ nhật ký và đồng bộ vào báo cáo của phụ huynh.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-600">Ngày dạy:</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-black text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Mark All Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-700">
                  <span>Sĩ số: {attendanceRecords.length} học sinh</span>
                  <span>•</span>
                  <span className="text-emerald-800">
                    {attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length} có mặt
                  </span>
                  <span>•</span>
                  <span className="text-rose-800">
                    {attendanceRecords.filter((r) => r.status === 'ABSENT' || r.status === 'EXCUSED').length} vắng
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllStatus('PRESENT')}
                    className="rounded-xl bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black hover:bg-emerald-700 transition cursor-pointer"
                  >
                    ✓ Cả lớp có mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('ABSENT')}
                    className="rounded-xl border border-slate-200 bg-white text-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Student Attendance List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5  pr-1">
                {attendanceRecords.map((r) => {
                  const st = r.student || {};
                  const sId = String(st._id || st);
                  const sName = st.name || 'Học sinh';

                  return (
                    <div
                      key={sId}
                      className={`rounded-2xl border-2 p-4 transition-all ${
                        r.status === 'PRESENT'
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : r.status === 'LATE'
                          ? 'border-amber-300 bg-amber-50/50'
                          : r.status === 'EXCUSED'
                          ? 'border-sky-300 bg-sky-50/50'
                          : 'border-rose-300 bg-rose-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-base shrink-0">
                          {sName[0] || 'B'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-base text-slate-900 truncate">{sName}</h4>
                          <span className="text-xs font-semibold text-slate-600">
                            {st.username ? `@${st.username}` : `Mã: ${sId.slice(-4)}`}
                          </span>
                        </div>
                      </div>

                      {/* 4 Status Pill Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'PRESENT')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                          }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'LATE')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            r.status === 'LATE'
                              ? 'bg-amber-700 text-white'
                              : 'bg-white text-slate-700 hover:bg-amber-50 border border-slate-200'
                          }`}
                        >
                          Muộn
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'EXCUSED')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            r.status === 'EXCUSED'
                              ? 'bg-sky-700 text-white'
                              : 'bg-white text-slate-700 hover:bg-sky-50 border border-slate-200'
                          }`}
                        >
                          Phép
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'ABSENT')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            r.status === 'ABSENT'
                              ? 'bg-rose-700 text-white'
                              : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                          }`}
                        >
                          Vắng
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Ghi chú (ốm, đón sớm…)"
                        value={r.note || ''}
                        onChange={(e) => setStudentNote(sId, e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Note for whole class */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Ghi chú sư phạm cho buổi học hôm nay (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={attendanceNote}
                  onChange={(e) => setAttendanceNote(e.target.value)}
                  placeholder="Ví dụ: Ôn tập phát âm từ vựng bài trước; các bé phản xạ hào hứng…"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Session Summary & Launch Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-800" />
                <span>Xác Nhận Thông Tin & Khởi Tạo Buổi Dạy Trực Tiếp</span>
              </h3>

              {/* Session Title Input */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Tên hiển thị buổi học (Có thể chỉnh sửa)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-base font-bold text-slate-900 focus:border-teal-500 focus:outline-none"
                  placeholder="Tên buổi dạy…"
                />
              </div>

              {/* Summary Details */}
              <div className="space-y-3 rounded-2xl bg-slate-50 p-6 border border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Lớp học:</span>
                  <span className="font-black text-slate-900 text-base">{classroom.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Tiến độ buổi dạy:</span>
                  <span className="font-black text-teal-800 text-base">Buổi số #{sessionNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Bài học giáo trình:</span>
                  <span className="font-black text-slate-900">{selectedLesson?.title || '(Chưa chọn)'} - {selectedLesson?.vietnameseTitle || ''}</span>
                </div>
                {selectedUnit && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-semibold">Chủ đề & Unit:</span>
                    <span className="font-extrabold text-slate-800">Unit {selectedUnit.unitNumber}: {selectedUnit.title} (Sách {selectedUnit.bookNumber})</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Kích hoạt Ôn Cũ Học Mới:</span>
                  <span className="font-bold text-amber-900">
                    {includeWarmup ? '🔥 Có (Ôn lại từ vựng bài trước)' : 'Không'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Trò chơi tương tác:</span>
                  <span className="font-bold text-violet-800">{selectedActivityIds.length} trò chơi</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Sĩ số có mặt hôm nay:</span>
                  <span className="font-black text-emerald-800 text-base">
                    {attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length} / {attendanceRecords.length} học sinh
                  </span>
                </div>
              </div>

              {/* Requirement 10: Timetable Lock Status Notification before Launch */}
              {!scheduleLiveTiming.canTeachNow && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 flex items-center gap-3">
                  <Lock size={20} className="text-amber-800 shrink-0" />
                  <div>
                    <p className="font-black text-amber-900">Nút "Bắt đầu buổi dạy" hiện đang tạm khóa:</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {scheduleLiveTiming.nextSlotText || scheduleLiveTiming.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Launch Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Quay lại bước 2
                </button>

                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || loadingAttendance || !scheduleLiveTiming.canTeachNow}
                  className={`w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-9 py-4 text-base font-black transition-all ${
                    scheduleLiveTiming.canTeachNow
                      ? 'bg-emerald-700 hover:bg-emerald-700 text-white  active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-200 text-inherit cursor-not-allowed border border-slate-300'
                  }`}
                >
                  {creating ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                      <span>Đang lưu điểm danh & khởi tạo phòng học…</span>
                    </>
                  ) : !scheduleLiveTiming.canTeachNow ? (
                    <>
                      <Lock size={20} />
                      <span>🔒 Chưa đến giờ dạy theo thời khóa biểu</span>
                    </>
                  ) : (
                    <>
                      <Play size={20} className="fill-white" />
                      <span>
                        Bắt đầu buổi dạy trực tiếp 🎯 (
                        {attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length}/
                        {attendanceRecords.length} bé có mặt)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomSessionSetup;
