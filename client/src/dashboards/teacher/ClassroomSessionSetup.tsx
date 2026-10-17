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
  Layers
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
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [lessonActivities, setLessonActivities] = useState<any[]>([]);

  // Session metadata (GV-01, GV-02, GV-03)
  const [sessionNumber, setSessionNumber] = useState(1);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [duration, setDuration] = useState(45);
  const [title, setTitle] = useState('');

  // Filters & Schedule Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'schedule' | 'cards'>('schedule');

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
    Promise.all([
      teacherApi.getClassDetail(activeClassId),
      teacherApi.getContent(),
      classroomSessionApi.getSessions({ classroomId: activeClassId })
    ])
      .then(([cls, cnt, prevSess]) => {
        setClassroom(cls.data);
        setContent(cnt.data);
        const list = (prevSess.data || []) as any[];
        setPreviousSessions(list);
        const maxPrev = list.reduce((m: number, s: any) => Math.max(m, Number(s.sessionNumber) || 0), 0);
        const nextNum = maxPrev > 0 ? maxPrev + 1 : (list.length + 1);
        setSessionNumber(nextNum);
      })
      .catch((e) => setError(e.message));
  }, [activeClassId]);

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

  const handleCreate = async () => {
    if (!activeClassId) return;
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
        includeWarmup: includeWarmup
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

    // Check which lessons have already been taught
    const taughtLessonIds = new Set(
      previousSessions
        .map((s) => (typeof s.lesson === 'object' ? s.lesson?._id : s.lesson))
        .filter(Boolean)
        .map(String)
    );

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

      return {
        ...lesson,
        unit,
        book,
        bookNumber,
        activityCount: acts.length,
        vocabCount: lesson.vocabularyItems?.length || 0,
        isTaught,
        bookOrderIndex: index + 1
      };
    });
  }, [content, previousSessions, classroom]);

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
    <div className="mx-auto max-w-5xl px-4 py-8">
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
          { num: 3, label: 'Xác nhận & Bắt đầu' }
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
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
            </div>
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

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('schedule')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'schedule'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={14} /> Bảng khóa biểu
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-teal-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={14} /> Dạng thẻ
              </button>
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

          {/* Schedule Table View */}
          {viewMode === 'schedule' ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs">
              <div className="max-h-[440px] overflow-y-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Thứ tự Sách</th>
                      <th className="py-3 px-4">Chủ đề & Unit</th>
                      <th className="py-3 px-4">Bài học (Lesson)</th>
                      <th className="py-3 px-3 text-center">Từ vựng</th>
                      <th className="py-3 px-3 text-center">Hoạt động</th>
                      <th className="py-3 px-4 text-center">Trạng thái</th>
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
                            key={item._id}
                            onClick={() => setSelectedLessonId(item._id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-teal-50/90 font-medium'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            {/* Sequential Book Order */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center justify-center rounded-lg bg-teal-100 px-2.5 py-1 text-xs font-extrabold text-teal-800">
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
                              <p className="font-bold text-slate-900">{item.title}</p>
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
                              {item.isTaught ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                  <CheckCircle2 size={12} className="text-emerald-500" /> Đã dạy
                                </span>
                              ) : isSelected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-xs">
                                  Đang chọn
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                                  Sẵn sàng
                                </span>
                              )}
                            </td>

                            {/* Action Button */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedLessonId(item._id);
                                }}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-600'
                                }`}
                              >
                                {isSelected ? 'Đã chọn ✓' : 'Chọn bài'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[440px] overflow-y-auto pr-1">
              {filteredSchedule.map((item: any, idx: number) => {
                const isSelected = selectedLessonId === item._id;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => setSelectedLessonId(item._id)}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 ring-2 ring-teal-500'
                        : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-md bg-teal-100 px-2 py-0.5 text-xs font-extrabold text-teal-800">
                        Bài {item.bookOrderIndex || idx + 1}
                      </span>
                      {item.isTaught && (
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-500" /> Đã dạy
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500 mb-2">{item.vietnameseTitle || 'Bài học mầm non'}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>📖 {item.unit?.title ? `Unit ${item.unit.unitNumber}` : `Book ${item.bookNumber}`}</span>
                      <span>•</span>
                      <span>🔤 {item.vocabCount} từ</span>
                      <span>•</span>
                      <span>🎮 {item.activityCount} hoạt động</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

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

            <button
              disabled={!selectedLessonId}
              onClick={() => setStep(2)}
              className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-bold text-white shadow-sm hover:bg-teal-700 disabled:opacity-40 transition-all cursor-pointer"
            >
              Tiếp tục bước 2 <ChevronRight size={18} />
            </button>
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

      {/* ── Step 3: Confirm & Start ────────────────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
              <Play size={22} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Bước 3 — Sẵn sàng bắt đầu buổi dạy!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Kiểm tra lại thông tin tổng quát và tiến hành mở phòng học trực tiếp trên máy chiếu
              </p>
            </div>
          </div>

          {/* Session Title Input */}
          <div className="mb-5">
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
            <Row label="Sĩ số lớp" value={`${classroom.students?.length || 0} học sinh`} />
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
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <ArrowLeft size={16} /> Quay lại bước 2
            </button>

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-extrabold text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
            >
              {creating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang khởi tạo phòng học…
                </>
              ) : (
                <>
                  <Play size={20} className="fill-white" /> Bắt đầu buổi dạy trực tiếp 🎯
                </>
              )}
            </button>
          </div>
        </div>
      )}
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
