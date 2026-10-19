import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  Clock,
  Play,
  CheckSquare,
  Square,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Search,
  Flame,
  Sparkles,
  History
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';

const Loader = () => (
  <div className="flex h-64 flex-col items-center justify-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    <span className="text-sm font-semibold text-slate-600">Đang tải dữ liệu lớp học và giáo trình…</span>
  </div>
);

export const ClassroomSessionSetup: React.FC = () => {
  const { classId: routeClassId = '' } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeClassId, setActiveClassId] = useState<string>(
    routeClassId || searchParams.get('classroomId') || ''
  );
  const [allClasses, setAllClasses] = useState<any[]>([]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classroom, setClassroom] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);

  // Selection states
  const [selectedLessonId, setSelectedLessonId] = useState(
    searchParams.get('lessonId') || ''
  );
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [lessonActivities, setLessonActivities] = useState<any[]>([]);

  // Session metadata (GV-01, GV-02, GV-03)
  const [sessionNumber, setSessionNumber] = useState(1);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [duration, setDuration] = useState(45);
  const [title, setTitle] = useState('');

  // Pre-Session Attendance Check-in State (Request 1)
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [_loadingAttendance, setLoadingAttendance] = useState(false);

  // Filters & Schedule Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

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
    const todayStr = attendanceDate || new Date().toISOString().split('T')[0];
    setLoadingAttendance(true);

    Promise.all([
      teacherApi.getClassDetail(activeClassId),
      teacherApi.getContent(),
      classroomSessionApi.getSessions({ classroomId: activeClassId }),
      teacherApi.getClassAttendance(activeClassId, todayStr).catch(() => ({ data: null }))
    ])
      .then(([cls, cnt, prevSess, attRes]) => {
        const classData = cls.data;
        setClassroom(classData);
        setContent(cnt.data);
        const list = (prevSess.data || []) as any[];
        setPreviousSessions(list);
        const maxPrev = list.reduce((m: number, s: any) => Math.max(m, Number(s.sessionNumber) || 0), 0);
        const nextNum = maxPrev > 0 ? maxPrev + 1 : (list.length + 1);
        setSessionNumber(nextNum);

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
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAttendance(false));
  }, [activeClassId, attendanceDate]);

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
    if (!activeClassId) return;
    setCreating(true);
    setError('');
    try {
      // 1. Sync attendance to server Attendance collection
      if (attendanceRecords.length > 0) {
        try {
          await teacherApi.saveClassAttendance(activeClassId, {
            date: attendanceDate,
            records: attendanceRecords,
            note: attendanceNote
          });
        } catch (attErr) {
          console.warn('Auto-save attendance check warning:', attErr);
        }
      }

      // 2. Create session with initialized attendance records
      const res = await classroomSessionApi.createSession({
        classroomId: activeClassId,
        lessonId: selectedLessonId || undefined,
        title: title || `Buổi ${sessionNumber}: ${selectedLesson?.title || 'Buổi dạy trên lớp'}`,
        activityIds: selectedActivityIds,
        plannedDuration: duration,
        sessionNumber: Number(sessionNumber) || 1,
        includeWarmup: includeWarmup,
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

  // Target Book according to classroom age group (GV-01 & User Request)
  const targetBookNumber =
    classroom?.ageGroupCode === '3-4' ? 1 : classroom?.ageGroupCode === '4-5' ? 2 : 3;

  const targetBookTitle =
    classroom?.ageGroupCode === '3-4'
      ? 'Sách 1 (Mầm 3–4 tuổi)'
      : classroom?.ageGroupCode === '4-5'
      ? 'Sách 2 (Chồi 4–5 tuổi)'
      : 'Sách 3 (Lá 5–6 tuổi)';

  // Build lesson schedule items enriched with unit, book, and taught status
  // STRICTLY filtered to this classroom's age group & book, sorted by BOOK SEQUENTIAL ORDER!
  const scheduleItems = useMemo(() => {
    if (!content || !content.lessons || !classroom) return [];

    const targetBook = classroom.ageGroupCode === '3-4' ? 1 : classroom.ageGroupCode === '4-5' ? 2 : 3;
    const unitsMap = new Map<string, any>((content.units || []).map((u: any) => [String(u._id), u]));
    const booksMap = new Map<any, any>((content.books || []).map((b: any) => [b.bookNumber, b]));

    // Check which lessons have already been taught in THIS classroom and their session IDs
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

    // Identify last taught session and lesson strictly for THIS classroom
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

    // 1. Filter only lessons matching this age group / book
    const relevantLessons = content.lessons.filter((l: any) => {
      const uId = Array.isArray(l.curriculumUnits) ? String(l.curriculumUnits[0]) : String(l.curriculumUnits || '');
      const u = unitsMap.get(uId);
      const bNum = u?.bookNumber || (l.ageGroupCode === '3-4' ? 1 : l.ageGroupCode === '4-5' ? 2 : 3);
      return bNum === targetBook || l.ageGroupCode === classroom.ageGroupCode;
    });

    // 2. Sort strictly according to the Book's sequence: Unit 1..9 -> Lesson displayOrder
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

    // Find the NEXT lesson in book order that hasn't been taught yet (Request 2)
    const nextUntaughtLesson = sorted.find((l: any) => !taughtLessonIds.has(String(l._id))) || sorted[0];
    const nextLessonId = nextUntaughtLesson ? String(nextUntaughtLesson._id) : null;

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
        isNextToTeach,
        lastTaughtSessionNum,
        lastSessionId,
        bookOrderIndex: index + 1
      };
    });
  }, [content, previousSessions, classroom, activeClassId]);

  // Auto pre-select the recommended next lesson if no lesson is explicitly chosen yet
  useEffect(() => {
    if (!selectedLessonId && scheduleItems.length > 0) {
      const nextItem = scheduleItems.find((item: any) => item.isNextToTeach) || scheduleItems[0];
      if (nextItem?._id) {
        setSelectedLessonId(String(nextItem._id));
      }
    }
  }, [scheduleItems, selectedLessonId]);

  // Filter lessons according to search and unit within this book
  const filteredSchedule = useMemo(() => {
    return scheduleItems.filter((item: any) => {
      // Unit filter
      if (selectedUnitFilter !== 'ALL' && String(item.unit?._id) !== selectedUnitFilter) {
        return false;
      }

      // Search query
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
    <div className="min-h-screen py-8 teacher-dark dark bg-[#0c1222] text-slate-100">
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl px-4 sm:px-6">
      {/* Back button */}
      <button
        onClick={() => navigate(activeClassId ? `/teacher/classes/${activeClassId}` : '/teacher/classes')}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Quay lại {classroom?.name ? `lớp ${classroom.name}` : 'danh sách lớp'}
      </button>

      {/* Main Page Title with Teacher Name and Class Age */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
              {ageLabel[classroom.ageGroupCode] || classroom.ageGroupCode}
            </span>
            <span className="text-xs font-medium text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {classroom.students?.length || 0} học sinh
            </span>
            <span className="text-xs font-medium text-slate-400">•</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
              👩‍🏫 Cô giáo phụ trách: {classroom.teacher?.name || 'Giáo viên phụ trách'}
            </span>
            <span className="text-xs font-medium text-slate-400">•</span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Đã dạy {previousSessions.length} buổi
            </span>
            {allClasses.length > 1 && (
              <div className="flex items-center gap-1.5 bg-white border border-teal-200 rounded-lg px-2.5 py-1 shadow-2xs ml-1">
                <span className="text-[11px] font-bold text-teal-800">Đổi lớp:</span>
                <select
                  value={activeClassId}
                  onChange={(e) => {
                    setActiveClassId(e.target.value);
                    setSelectedLessonId('');
                    setSelectedLesson(null);
                    setSelectedActivityIds([]);
                  }}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
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
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Tạo buổi dạy mới theo giáo trình
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lớp học theo chuẩn <strong>{targetBookTitle}</strong>. Bài học được sắp xếp theo đúng thứ tự trang sách.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-0">
        {[
          { num: 1, label: 'Bảng khóa biểu & Chọn bài' },
          { num: 2, label: 'Hoạt động & Tùy chọn' },
          { num: 3, label: 'Điểm danh & Bắt đầu' }
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <button
              type="button"
              onClick={() => {
                if (s.num === 1 || selectedLessonId) {
                  setStep(s.num as any);
                }
              }}
              className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-102"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                  step >= s.num
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {s.num}
              </div>
              <span
                className={`hidden sm:inline text-xs font-bold ${
                  step >= s.num ? 'text-teal-900' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </button>
            {i < 2 && (
              <div
                className={`mx-3 h-1 flex-1 rounded-full transition-colors ${
                  step > s.num ? 'bg-teal-600' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 border border-rose-200">
          ⚠️ {error}
        </div>
      )}

      {/* ── Step 1: Syllabus Schedule & Choose Lesson (GV-01 & GV-02) ────────── */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          {/* Header of Step 1 */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-100 text-teal-700 shadow-sm">
                <Calendar size={22} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Bước 1 — Bảng khóa biểu phân phối buổi học
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Chọn bài học theo lộ trình chuẩn. Dễ dàng nhận biết bài đã dạy, bài đang chọn và bài kế tiếp.
                </p>
              </div>
            </div>

            {/* Roadmap Progress Badge */}
            <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700">
              <span className="text-teal-700 font-extrabold">Lộ trình Sách {targetBookNumber}:</span>
              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                Đã dạy {scheduleItems.filter((i: any) => i.isTaught).length}/{scheduleItems.length} bài
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="mb-5 grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Search */}
            <div className="relative sm:col-span-5">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bài học, chủ đề, từ khóa…"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Book Lock Badge (GV-01 & User Request: mỗi lớp 1 sách tương ứng độ tuổi) */}
            <div className="sm:col-span-4 flex items-center gap-2.5 rounded-xl bg-teal-50 border border-teal-200 px-3.5 py-2">
              <BookOpen size={18} className="text-teal-700 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Giáo trình chuẩn của lớp</p>
                <p className="text-xs font-black text-teal-900 truncate">
                  {targetBookTitle}
                </p>
              </div>
            </div>

            {/* Unit Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedUnitFilter}
                onChange={(e) => setSelectedUnitFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm font-medium text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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

          {/* Schedule Table View (Pure list layout, no card view) */}
          <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
            <div className="max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Thứ tự Sách</th>
                    <th className="py-3 px-4">Chủ đề & Unit</th>
                    <th className="py-3 px-4">Bài học (Lesson)</th>
                    <th className="py-3 px-3 text-center">Từ vựng</th>
                    <th className="py-3 px-3 text-center">Hoạt động</th>
                    <th className="py-3 px-4 text-center">Trạng thái lộ trình</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
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
                              ? 'bg-teal-50/90 font-medium ring-1 ring-inset ring-teal-400'
                              : item.isNextToTeach
                              ? 'bg-amber-50/40 hover:bg-amber-50/80'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Sequential Book Order */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                              item.isNextToTeach
                                ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                : 'bg-teal-100 text-teal-800'
                            }`}>
                              Bài {item.bookOrderIndex || idx + 1}
                            </span>
                          </td>

                          {/* Book & Unit */}
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-semibold text-slate-800">
                              Unit {item.unit?.unitNumber || 1}
                            </div>
                            <div className="text-slate-500">
                              {item.unit?.title || 'Chủ đề mầm non'}
                            </div>
                          </td>

                          {/* Lesson Title */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{item.title}</p>
                              {item.isNextToTeach && (
                                <span className="rounded-full bg-amber-500/15 text-amber-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                                  Đề xuất dạy
                                </span>
                              )}
                            </div>
                            {item.vietnameseTitle && (
                              <p className="text-xs text-slate-500">{item.vietnameseTitle}</p>
                            )}
                          </td>

                          {/* Vocab count */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                              {item.vocabCount} từ
                            </span>
                          </td>

                          {/* Activity count */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                              {item.activityCount} game
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                                Đang chọn
                              </span>
                            ) : item.isNextToTeach ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900 border border-amber-300">
                                ⭐ Bài tiếp theo
                              </span>
                            ) : item.isLastTaught ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={12} className="text-emerald-600" /> Vừa dạy gần nhất
                              </span>
                            ) : item.isTaught ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                <CheckCircle2 size={12} className="text-slate-400" /> Đã dạy
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
                                Chưa dạy
                              </span>
                            )}
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-right">
                            {item.isTaught ? (
                              <div className="flex items-center justify-end gap-1.5">
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
                                  className="rounded-lg px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                  title="Xem lại nhật ký buổi dạy đã hoàn thành"
                                >
                                  <History size={12} />
                                  <span>Xem nhật ký</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLessonId(item._id);
                                  }}
                                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-teal-600 text-white font-bold'
                                      : 'text-slate-500 hover:text-slate-700 underline'
                                  }`}
                                  title="Chọn để dạy lại bài học này"
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
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : item.isNextToTeach
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-600'
                                }`}
                              >
                                {isSelected ? 'Đã chọn ✓' : item.isNextToTeach ? 'Chọn bài này ★' : 'Chọn bài'}
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

          {/* If selected lesson is already taught, show prominent warning & jump to journal button */}
          {selectedLesson && scheduleItems.some((it: any) => it._id === selectedLesson._id && it.isTaught) && (() => {
            const currentItem = scheduleItems.find((it: any) => it._id === selectedLesson._id);
            return (
              <div className="mt-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-fade-in">
                <div className="flex items-center gap-2.5 text-emerald-950">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <History size={16} />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-emerald-900">
                      Bài học này đã được dạy trước đó trong lớp!
                    </p>
                    <p className="text-emerald-700 text-xs mt-0.5">
                      Bạn có thể mở xem lại nhật ký hoặc bấm "Tiếp tục" bên dưới nếu muốn dạy lại bài này.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentItem?.lastSessionId) {
                      navigate(`/teacher/classroom-sessions/${currentItem.lastSessionId}/summary`);
                    } else {
                      navigate(`/teacher/classroom-sessions?search=${encodeURIComponent(selectedLesson.title)}&classroomId=${activeClassId}`);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                >
                  <BookOpen size={14} />
                  <span>Mở Nhật Ký Buổi Dạy</span>
                </button>
              </div>
            );
          })()}

          {/* Selected Lesson Bar & Continue */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="text-sm">
              {selectedLesson ? (
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 size={18} className="text-teal-600 flex-shrink-0" />
                  <span>
                    Đang chọn:{' '}
                    <strong className="text-slate-900 font-bold">{selectedLesson.title}</strong>{' '}
                    ({selectedLesson.vocabularyItems?.length || 0} từ vựng, {lessonActivities.length} hoạt động)
                  </span>
                </div>
              ) : (
                <p className="text-amber-600 font-medium">⚠️ Vui lòng nhấp chọn 1 bài học ở trên để tiếp tục</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {selectedLessonId && (
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/lesson-planner?classroomId=${activeClassId}&lessonId=${selectedLessonId}`)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition-all shadow-xs cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-600" />
                  Xem gợi ý giáo án AI
                </button>
              )}

              <button
                disabled={!selectedLessonId}
                onClick={() => setStep(2)}
                className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-40 transition-all cursor-pointer"
              >
                Tiếp tục bước 2 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Choose Activities & Session Options (GV-03 Warmup) ───────── */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-100 text-violet-700 shadow-sm">
              <CheckSquare size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Bước 2 — Cấu hình buổi học & Chọn hoạt động
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Thiết lập số thứ tự buổi học, kích hoạt Ôn Cũ Học Mới và chọn trò chơi tương tác
              </p>
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-Assigned Session Number Card */}
            <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50/60 p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black text-teal-700 uppercase tracking-wider block">
                  Tiến độ buổi dạy (Tự động gán)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xl font-black text-slate-900">
                    BUỔI HỌC SỐ {sessionNumber}
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-xs uppercase">
                    Tự động tiếp nối
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {sessionNumber > 1
                    ? `Hệ thống tự động gán tiếp theo sau Buổi ${sessionNumber - 1} (Lớp đã học ${sessionNumber - 1} buổi)`
                    : 'Buổi học đầu tiên của lớp học'}
                </p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 font-black text-white text-lg shadow-sm">
                #{sessionNumber}
              </div>
            </div>

            {/* Warm-up Toggle (GV-03) */}
            <div
              onClick={() => setIncludeWarmup(!includeWarmup)}
              className={`rounded-xl border p-4 cursor-pointer transition-all ${
                includeWarmup
                  ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-400'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {includeWarmup ? (
                    <CheckSquare size={20} className="text-amber-600" />
                  ) : (
                    <Square size={20} className="text-slate-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                    <Flame size={16} className="text-amber-500 fill-amber-500" />
                    Kích hoạt pha &quot;Ôn Cũ Học Mới&quot; (Warm-up)
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Dành 5-10 phút đầu buổi để ôn tập lại toàn bộ từ vựng và mẫu câu đã học ở bài học ngay trước đó của lớp.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Activities list */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>2. Chọn hoạt động & trò chơi tương tác ({selectedActivityIds.length}/{lessonActivities.length})</span>
              <button
                type="button"
                onClick={() =>
                  setSelectedActivityIds(
                    selectedActivityIds.length === lessonActivities.length
                      ? []
                      : lessonActivities.map((a: any) => a._id)
                  )
                }
                className="text-xs font-semibold text-teal-600 hover:underline"
              >
                {selectedActivityIds.length === lessonActivities.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </h3>

            {lessonActivities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500">
                Bài học này chưa cấu hình trò chơi tương tác riêng. Buổi học vẫn diễn ra đầy đủ với phần giảng từ vựng, dạy mẫu câu và ôn cũ học mới.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {lessonActivities.map((a: any) => {
                  const checked = selectedActivityIds.includes(a._id);
                  return (
                    <button
                      key={a._id}
                      type="button"
                      onClick={() => toggleActivity(a._id)}
                      className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all ${
                        checked
                          ? 'border-violet-400 bg-violet-50/80 ring-1 ring-violet-400'
                          : 'border-slate-200 hover:border-violet-200 bg-white'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare size={18} className="text-violet-600 flex-shrink-0" />
                      ) : (
                        <Square size={18} className="text-slate-400 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-900 text-sm">{a.title}</p>
                        <p className="text-xs text-slate-500">
                          Loại: {a.activityType?.replace(/_/g, ' ')} · {a.questionCount || 5} câu hỏi
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Duration Selector */}
          <div className="mb-6 border-t border-slate-100 pt-5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              3. Thời lượng dự kiến buổi học
            </label>
            <div className="flex flex-wrap gap-2.5">
              {[20, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold border transition-all ${
                    duration === d
                      ? 'border-teal-500 bg-teal-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'
                  }`}
                >
                  {d} phút
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between border-t border-slate-100 pt-5">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft size={16} /> Quay lại
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-teal-700 transition-all cursor-pointer"
            >
              Tiếp tục bước 3 <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Attendance Check-in & Confirm & Start ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Main Attendance Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-100 text-teal-700 shadow-sm text-2xl font-black">
                  📋
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-teal-100 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                      Điểm danh trước giờ học
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-500">
                      {classroom?.name} ({classroom?.students?.length || 0} học sinh)
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-0.5">
                    Điểm danh sĩ số lớp hôm nay
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Xác nhận trẻ có mặt để hệ thống đưa vào danh sách tương tác, gọi tên và chấm sao trong buổi dạy
                  </p>
                </div>
              </div>

              {/* Fast Attendance Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAllStatus('PRESENT')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Đánh dấu tất cả bé đều có mặt"
                >
                  <CheckCircle2 size={15} /> Tất cả có mặt ✨
                </button>
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600">
                  <Calendar size={14} className="text-slate-400" />
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="bg-transparent text-slate-800 outline-none cursor-pointer text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                <span className="text-xs font-bold text-emerald-700 block">🟢 Có mặt</span>
                <span className="text-2xl font-black text-emerald-800">
                  {attendanceRecords.filter((r) => r.status === 'PRESENT').length}
                </span>
                <span className="text-[10px] text-emerald-600 block">Tham gia học</span>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center">
                <span className="text-xs font-bold text-amber-700 block">🟡 Đi muộn</span>
                <span className="text-2xl font-black text-amber-800">
                  {attendanceRecords.filter((r) => r.status === 'LATE').length}
                </span>
                <span className="text-[10px] text-amber-600 block">Vào lớp trễ</span>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-center">
                <span className="text-xs font-bold text-sky-700 block">🔵 Có phép</span>
                <span className="text-2xl font-black text-sky-800">
                  {attendanceRecords.filter((r) => r.status === 'EXCUSED').length}
                </span>
                <span className="text-[10px] text-sky-600 block">Gia đình xin phép</span>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-center">
                <span className="text-xs font-bold text-rose-700 block">🔴 Vắng mặt</span>
                <span className="text-2xl font-black text-rose-800">
                  {attendanceRecords.filter((r) => r.status === 'ABSENT').length}
                </span>
                <span className="text-[10px] text-rose-600 block">Không tham gia</span>
              </div>
            </div>

            {/* Student Attendance Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-6 max-h-[460px] overflow-y-auto pr-1">
              {attendanceRecords.map((r, idx) => {
                const st = r.student || {};
                const sId = String(st._id || st);
                const sName = st.name || `Học sinh ${idx + 1}`;
                const avatarIcon =
                  st.avatar === 'lion'
                    ? '🦁'
                    : st.avatar === 'panda'
                    ? '🐼'
                    : st.avatar === 'rabbit'
                    ? '🐰'
                    : st.avatar === 'fox'
                    ? '🦊'
                    : st.avatar === 'bear'
                    ? '🐻'
                    : st.avatar === 'cat'
                    ? '🐱'
                    : st.avatar === 'dog'
                    ? '🐶'
                    : '🦁';

                const statusColor =
                  r.status === 'PRESENT'
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : r.status === 'LATE'
                    ? 'border-amber-300 bg-amber-50/30'
                    : r.status === 'EXCUSED'
                    ? 'border-sky-300 bg-sky-50/30'
                    : 'border-rose-300 bg-rose-50/30 opacity-75';

                return (
                  <div
                    key={sId}
                    className={`rounded-2xl border p-3.5 transition-all flex flex-col justify-between shadow-2xs ${statusColor}`}
                  >
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-3xl select-none">{avatarIcon}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-sm text-slate-900 truncate">{sName}</h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {st.username ? `@${st.username}` : `Mã: ${sId.slice(-4)}`}
                        </span>
                      </div>
                    </div>

                    {/* 4 Status Pill Buttons */}
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      <button
                        type="button"
                        onClick={() => setStudentStatus(sId, 'PRESENT')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
                        }`}
                      >
                        Có mặt
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatus(sId, 'LATE')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          r.status === 'LATE'
                            ? 'bg-amber-500 text-white font-extrabold shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 border border-slate-200'
                        }`}
                      >
                        Muộn
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatus(sId, 'EXCUSED')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          r.status === 'EXCUSED'
                            ? 'bg-sky-500 text-white font-extrabold shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-sky-700 border border-slate-200'
                        }`}
                      >
                        Phép
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatus(sId, 'ABSENT')}
                        className={`py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          r.status === 'ABSENT'
                            ? 'bg-rose-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 border border-slate-200'
                        }`}
                      >
                        Vắng
                      </button>
                    </div>

                    {/* Quick note input */}
                    <input
                      type="text"
                      placeholder="Ghi chú (ốm, đón sớm…)"
                      value={r.note || ''}
                      onChange={(e) => setStudentNote(sId, e.target.value)}
                      className="w-full text-[11px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Note for whole class */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú sư phạm cho buổi học hôm nay (Tùy chọn)
              </label>
              <input
                type="text"
                value={attendanceNote}
                onChange={(e) => setAttendanceNote(e.target.value)}
                placeholder="Ví dụ: Tiết học tập trung ôn phát âm nguyên âm; Thời tiết mát mẻ các bé hăng hái…"
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Session Summary & Launch Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <span>Xác nhận thông tin & Khởi tạo phòng học</span>
            </h3>

            {/* Session Title Input */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên hiển thị buổi học (Có thể chỉnh sửa)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Tên buổi dạy…"
              />
            </div>

            {/* Session Summary Card */}
            <div className="space-y-3 rounded-2xl bg-slate-50/90 p-5 border border-slate-200/80 mb-6">
              <Row label="Lớp học" value={classroom.name} />
              <Row
                label="Tiến độ buổi học"
                value={`Buổi số ${sessionNumber} (Tự động gán tiếp theo sau Buổi ${sessionNumber - 1 > 0 ? sessionNumber - 1 : 0})`}
                highlight
              />
              <Row
                label="Giáo trình & Bài học"
                value={`${selectedLesson?.title || '(Chưa chọn bài)'} - ${selectedLesson?.vietnameseTitle || ''}`}
              />
              {selectedUnit && (
                <Row
                  label="Chủ đề & Unit"
                  value={`Unit ${selectedUnit.unitNumber}: ${selectedUnit.title} (Book ${selectedUnit.bookNumber})`}
                />
              )}
              <Row
                label="Pha Ôn Cũ Học Mới"
                value={
                  includeWarmup
                    ? '🔥 Có kích hoạt (Ôn lại từ vựng & mẫu câu bài học trước)'
                    : 'Không kích hoạt'
                }
              />
              <Row label="Hoạt động tương tác" value={`Đã chọn ${selectedActivityIds.length} trò chơi`} />
              <Row
                label="Sĩ số có mặt hôm nay"
                value={`${attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length} / ${attendanceRecords.length} học sinh`}
                highlight
              />
              <Row
                label="Thời lượng dự kiến"
                value={`~${duration} phút`}
                icon={<Clock size={14} className="text-slate-400" />}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft size={16} /> Quay lại bước 2
              </button>

              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {creating ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang lưu điểm danh & khởi tạo phòng học…
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

const Row = ({
  label,
  value,
  icon,
  highlight
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  highlight?: boolean;
}) => (
  <div className="flex items-center justify-between text-sm py-0.5">
    <span className="text-slate-500 font-medium">{label}</span>
    <span
      className={`flex items-center gap-1.5 font-bold ${
        highlight ? 'text-teal-700 font-extrabold' : 'text-slate-900'
      }`}
    >
      {icon} {value}
    </span>
  </div>
);

export default ClassroomSessionSetup;
