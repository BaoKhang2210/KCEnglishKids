import { PrintLessonCards } from '../../components/teacher/PrintLessonCards';
import { studyTimeLabel } from '../../utils/learningMetrics';
import { LessonFlashcardPreview } from '../../components/teacher/LessonFlashcardPreview';
import { compareLessons, lessonPosition, bilingualLessonTitle } from '../../utils/curriculumLessons';
import React, { useEffect, useMemo, useState } from 'react';
import { ObservationPortfolio } from '../../components/teacher/ObservationPortfolio';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, MessageSquare, Search, Star, X, Mail, Calendar, ChevronRight, Clock, Sparkles, ArrowUpDown, Send, Brain, UserCheck, Users, Check, Phone } from 'lucide-react';
import { teacherApi, parentNotificationApi } from '../../services/api';
import { sortByNameVi } from '../../utils/sortStudents';
import { ParentNoteSuggestions } from './ParentNoteSuggestions';
import { SentenceTeachingPage } from './SentenceTeachingPage';
import { StudentCompetencyModal } from '../../components/teacher/StudentCompetencyModal';
import { StudentAvatar } from '../../components/common/StudentAvatar';

const Loader = () => <div className="py-20 text-center text-slate-600"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />Đang tải không gian giảng dạy…</div>;
const Empty = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">{children}</div>;
const date = (value?: string) => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

export { TeacherLayout } from './TeacherLayout';
export { TeacherDashboard } from './TeacherHome';

const Header = ({ title, text, action, avatar }: any) => (
  <header className="staff-page-header">
    <div className="flex items-center gap-4">
      {avatar}
      <div>
        <p className="text-sm font-bold text-teal-800">Không gian giảng dạy</p>
        <h1>{title}</h1>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
      </div>
    </div>
    {action}
  </header>
);

const SearchBox = ({ value, onChange }: any) => (
  <label className="flex max-w-md items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2">
    <Search size={17} className="text-slate-600 shrink-0" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tìm theo tên hoặc mã học sinh…"
      className="w-full outline-none text-sm font-medium"
    />
  </label>
);

const Avatar = ({ name, avatar, avatarUrl, student, className, size = 'md' }: any) => {
  const s = student || (typeof name === 'object' && name ? name : { name, avatar, avatarUrl });
  return (
    <StudentAvatar
      student={s}
      name={typeof name === 'string' ? name : undefined}
      avatar={avatar}
      avatarUrl={avatarUrl}
      size={size}
      className={className}
    />
  );
};

const Modal = ({ title, close, children, maxWidth = 'max-w-lg', className = '' }: any) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/65 p-2 sm:p-4 backdrop-blur-xs">
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'Modal'}
      className={`w-full ${maxWidth} rounded-3xl bg-white p-4 sm:p-6 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl ${className}`}
    >
      <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="font-bold text-slate-900 text-base sm:text-lg">{title}</div>
        <button
          onClick={close}
          className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1 pr-1">{children}</div>
    </div>
  </div>
);

export const TeacherContent = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'curriculum';
  const [data, setData] = useState<any>();
  const [age, setAge] = useState('');
  const [assignedAges, setAssignedAges] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [lesson, setLesson] = useState<any>();
  const requestedLessonId = searchParams.get('lessonId');
  useEffect(() => {
    if (currentTab !== 'curriculum') {
      setLesson(null);
    } else if (requestedLessonId && data?.lessons) {
      setLesson(data.lessons.find((item: any) => item._id === requestedLessonId));
    }
  }, [currentTab, data, requestedLessonId]);

  const load = (a = '') => teacherApi.getContent(a ? `ageGroupCode=${a}` : '').then((x) => { setData(x.data); setError(''); }).catch(e => setError(e.message));

  useEffect(() => {
    void load();
    teacherApi.getClasses().then(response => {
      setAssignedAges([...new Set((response.data || []).map((room: any) => room.ageGroupCode).filter(Boolean))] as string[]);
    }).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => void load(age)}>Thử lại</button></div>;
  return (
    <>
      <Header
        title={currentTab === 'sentences' ? 'Mẫu câu' : 'Giáo trình'}
        text={currentTab === 'sentences' ? 'Chọn Unit và bài học để xem, nghe hoặc trình chiếu mẫu câu.' : 'Xem sách và bài học theo lớp cô đang phụ trách.'}
        action={
          <div className="inline-flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'curriculum' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentTab === 'curriculum'
                  ? 'bg-white text-teal-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen size={16} /> Sách & Bài học
            </button>
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'sentences' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentTab === 'sentences'
                  ? 'bg-white text-teal-800'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare size={16} /> Thư viện Mẫu câu
            </button>
          </div>
        }
      />

      {currentTab === 'sentences' ? (
        <SentenceTeachingPage embedded />
      ) : !data ? (
        <Loader />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Lọc theo tuổi:</span>
            {['', ...assignedAges].map((a) => (
              <button
                key={a || 'all'}
                onClick={() => {
                  setAge(a);
                  void load(a);
                }}
                className={`rounded-full px-4 py-1.5 text-xs font-black transition-all cursor-pointer shadow-2xs ${
                  age === a
                    ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {a ? `Độ tuổi ${a} tuổi` : 'Tất cả lớp phụ trách'}
              </button>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <section className="space-y-4 min-w-0">
              {data.units.map((u: any) => {
                const unitLessons = data.lessons.filter((l: any) =>
                  l.curriculumUnits?.some((x: any) => String(x?._id || x) === String(u._id))
                ).sort((a: any, b: any) => compareLessons(a, b, data.units));

                const unitPalettes = [
                  {
                    card: 'border-teal-200/90 bg-gradient-to-br from-teal-50/50 via-white to-emerald-50/20',
                    tag: 'bg-teal-100/90 text-teal-950 border-teal-200',
                    lessonTag: 'bg-teal-100 text-teal-950',
                    accent: 'text-teal-700'
                  },
                  {
                    card: 'border-indigo-200/90 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/20',
                    tag: 'bg-indigo-100/90 text-indigo-950 border-indigo-200',
                    lessonTag: 'bg-indigo-100 text-indigo-950',
                    accent: 'text-indigo-700'
                  },
                  {
                    card: 'border-amber-200/90 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/20',
                    tag: 'bg-amber-100/90 text-amber-950 border-amber-200',
                    lessonTag: 'bg-amber-100 text-amber-950',
                    accent: 'text-amber-700'
                  },
                  {
                    card: 'border-purple-200/90 bg-gradient-to-br from-purple-50/50 via-white to-pink-50/20',
                    tag: 'bg-purple-100/90 text-purple-950 border-purple-200',
                    lessonTag: 'bg-purple-100 text-purple-950',
                    accent: 'text-purple-700'
                  }
                ];
                const palette = unitPalettes[(u.unitNumber || 1) % unitPalettes.length];

                return (
                  <div key={u._id} className={`rounded-3xl border ${palette.card} p-5 sm:p-6 shadow-xs space-y-3`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${palette.tag}`}>
                        <BookOpen size={13} className={palette.accent} />
                        Sách {u.bookNumber} · Độ tuổi {u.ageGroupCode} · Unit {u.unitNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                        {unitLessons.length} bài học
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{u.bigQuestion}</h3>
                    
                    {u.vocabularyReferences?.length ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 mr-1">Chủ đề từ vựng:</span>
                        {u.vocabularyReferences.map((ref: string) => (
                          <span key={ref} className="px-2 py-0.5 rounded-lg bg-white/90 border border-slate-200/90 text-[11px] font-bold text-slate-700 shadow-2xs">
                            {ref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 font-medium">
                        Chủ đề từ vựng và đàm thoại theo chuẩn giáo trình
                      </p>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2.5">
                      {unitLessons.map((l: any) => (
                        <button
                          key={l._id}
                          onClick={() => setLesson(l)}
                          className="group flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:border-teal-400 hover:bg-teal-50/60 hover:text-teal-950 hover:shadow-xs transition-all cursor-pointer"
                        >
                          <span className={`px-1.5 py-0.5 rounded-md font-black text-[11px] ${palette.lessonTag}`}>
                            L{lessonPosition(l, data.units).lesson}
                          </span>
                          <span className="text-slate-900 group-hover:text-teal-950 font-bold">
                            {l.title}
                          </span>
                          <span className="text-[11px] text-teal-700 opacity-60 group-hover:opacity-100 transition-opacity">
                            👁️
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>

            <section className="space-y-4">
              <div className="rounded-3xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-5 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700 font-bold">
                    <BookOpen size={18} />
                  </span>
                  <h3 className="font-black text-slate-900 text-base">Chương trình chuẩn</h3>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Nội dung theo độ tuổi các lớp cô đang phụ trách.
                </p>
                <div className="mt-4 space-y-2.5 border-t border-indigo-100/80 pt-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-teal-100 shadow-2xs">
                    <span className="font-bold text-slate-700">Bài học đã duyệt:</span>
                    <b className="px-2 py-0.5 rounded-lg bg-teal-100 text-teal-950 font-black">{data.lessons.length} bài</b>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/90 border border-indigo-100 shadow-2xs">
                    <span className="font-bold text-slate-700">Hoạt động tương tác:</span>
                    <b className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-950 font-black">{data.activities.length} hoạt động</b>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      )}

      {currentTab === 'curriculum' && lesson && (
        <Modal
          title={`Xem trước bài học: ${bilingualLessonTitle(lesson)}`}
          maxWidth="max-w-5xl xl:max-w-6xl"
          close={() => {
            setLesson(null);
            const next = new URLSearchParams(searchParams);
            next.delete('lessonId');
            setSearchParams(next, { replace: true });
          }}
        >
          <div className="space-y-3">
            {/* Top row: Description + Learning Objectives */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold shrink-0">Mô tả</span>
                <p className="text-slate-700 font-medium truncate">{lesson.description || 'Nội dung bài học chuẩn chương trình.'}</p>
              </div>

              {lesson.learningObjectives?.length > 0 && (
                <div className="flex items-center gap-2 shrink-0 max-w-full md:max-w-[55%]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold shrink-0">Mục tiêu</span>
                  <p className="text-slate-600 truncate">{lesson.learningObjectives.join(' · ')}</p>
                </div>
              )}
            </div>

            {/* Flashcard Preview & Audio: Xem thử & Nghe thử phát âm */}
            <LessonFlashcardPreview lesson={lesson} />

            {/* Bottom Actions Bar */}
            <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2.5">
              <PrintLessonCards lesson={lesson} />
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
                to={`/teacher/sentences?lessonId=${lesson._id}&mode=classroom`}
              >
                Dạy mẫu câu bài này
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export const TeacherStudents = () => {
  const [items, setItems] = useState<any[]>();
  const [classes, setClasses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'score' | 'stars' | 'lessons'>('name');

  // Quick parent note modal state
  const [quickStudent, setQuickStudent] = useState<any>(null);
  const [competencyStudent, setCompetencyStudent] = useState<any>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [quickSubject, setQuickSubject] = useState('Nhận xét học tập');
  const [sendingNote, setSendingNote] = useState(false);

  // Class attendance modal state
  const [classAttendanceModal, setClassAttendanceModal] = useState<any>(null);
  const [classAttendanceData, setClassAttendanceData] = useState<any>(null);
  const [loadingClassAttendance, setLoadingClassAttendance] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'ABSENT_ONLY' | 'PERFECT_ONLY'>('ALL');
  const [classAttendanceTab, setClassAttendanceTab] = useState<'students' | 'sessions'>('students');
  const [classAttendanceSearch, setClassAttendanceSearch] = useState('');

  const handleOpenClassAttendance = async (c: any) => {
    setClassAttendanceModal(c);
    setLoadingClassAttendance(true);
    setAttendanceFilter('ALL');
    setClassAttendanceTab('students');
    setClassAttendanceSearch('');
    try {
      const res = await teacherApi.getClassCurriculumProgress(c._id);
      setClassAttendanceData(res.data);
    } catch (e: any) {
      console.error('Error fetching class curriculum progress:', e);
    } finally {
      setLoadingClassAttendance(false);
    }
  };

  const quickReviewChips = [
    '🌟 Bé học rất chăm chỉ và hăng hái phát biểu.',
    '👏 Bé phát âm rất to, rõ ràng và chuẩn ngữ điệu.',
    '⚡ Phản xạ nghe chọn và trả lời câu hỏi rất nhanh.',
    '✨ Bé có sự tiến bộ vượt bậc so với tuần trước.',
    '📖 Bé cần ôn lại các từ vựng bài trước ở nhà nhé.'
  ];

  const load = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        teacherApi.getStudents(),
        teacherApi.getClasses()
      ]);
      setItems(sRes.data || []);
      setClasses(cRes.data || []);
      setError('');
    } catch (e: any) {
      setError(e.message);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Filter students by search
  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.username?.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // Sorting function
  const sortStudents = (list: any[]) => {
    return [...list].sort((a, b) => {
      if (sortKey === 'score') {
        return (b.stats?.averageScore || 0) - (a.stats?.averageScore || 0);
      }
      if (sortKey === 'stars') {
        return (
          (b.stats?.totalStars ?? b.stats?.stars ?? 0) -
          (a.stats?.totalStars ?? a.stats?.stars ?? 0)
        );
      }
      if (sortKey === 'lessons') {
        return (b.stats?.completedLessons || 0) - (a.stats?.completedLessons || 0);
      }
      return sortByNameVi([a, b])[0] === a ? -1 : 1;
    });
  };

  // Group filtered students by assignedClass
  const classGroups = useMemo(() => {
    const map = new Map<string, { classInfo: any; students: any[] }>();

    // Initialize with all teacher's classes
    classes.forEach((c) => {
      map.set(String(c._id), { classInfo: c, students: [] });
    });

    const unassigned: any[] = [];

    filtered.forEach((s) => {
      const cid = s.assignedClass?._id || s.assignedClass;
      if (cid && map.has(String(cid))) {
        map.get(String(cid))!.students.push(s);
      } else if (cid) {
        if (!map.has(String(cid))) {
          map.set(String(cid), { classInfo: s.assignedClass || { _id: cid, name: 'Lớp khác' }, students: [] });
        }
        map.get(String(cid))!.students.push(s);
      } else {
        unassigned.push(s);
      }
    });

    return {
      classes: Array.from(map.values()),
      unassigned
    };
  }, [classes, filtered]);

  const displayGroups = classGroups.classes;
  const showUnassigned = classGroups.unassigned.length > 0;

  const handleSendQuickNote = async () => {
    if (!quickStudent || !quickNoteText.trim()) return;
    try {
      setSendingNote(true);
      await parentNotificationApi.sendNotification({
        childId: quickStudent._id,
        subject: quickSubject,
        teacherNote: quickNoteText,
                templateType: 'PROGRESS_UPDATE'
      });
      alert(`Đã gửi nhận xét đến phụ huynh của bé ${quickStudent.name}!`);
      setQuickStudent(null);
      setQuickNoteText('');
    } catch (e: any) {
      alert(e?.message || 'Không thể gửi nhận xét.');
    } finally {
      setSendingNote(false);
    }
  };

  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => void load()}>Thử lại</button></div>;
  if (!items) return <Loader />;

  return (
    <>
      <Header
        title="Hồ sơ học sinh"
        text="Theo dõi việc học, năng lực và gửi nhận xét cho học sinh trong lớp."
      />

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <SearchBox value={search} onChange={setSearch} />

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 shrink-0 flex items-center gap-1">
            <ArrowUpDown size={14} className="text-slate-500" /> Sắp xếp:
          </span>
          <select
            value={sortKey}
            onChange={(e: any) => setSortKey(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer hover:bg-white transition-colors"
          >
            <option value="name">Tên A–Z (Tiếng Việt)</option>
            <option value="score">Độ đúng cao nhất</option>
            <option value="stars">Nhiều sao nhất ⭐</option>
            <option value="lessons">Hoàn thành nhiều bài nhất</option>
          </select>
        </div>
      </div>

      {/* Grouped Class Sections */}
      {displayGroups.length === 0 && !showUnassigned ? (
        <Empty>Không tìm thấy học sinh nào phù hợp tìm kiếm.</Empty>
      ) : (
        <div className="space-y-8">
          {displayGroups.map(({ classInfo, students: groupStudents }) => {
            const sortedStudents = sortStudents(groupStudents);
            const classStars = sortedStudents.reduce(
              (sum, s) => sum + (s.stats?.totalStars ?? s.stats?.stars ?? 0),
              0
            );
            const answered = sortedStudents.reduce((sum, student) => sum + (student.stats?.answeredCount || 0), 0);
            const correct = sortedStudents.reduce((sum, student) => sum + (student.stats?.correctAnswers || 0), 0);
            const classAvg = answered ? Math.round(100 * correct / answered) : null;

            const bookLabel =
              classInfo.ageGroupCode === '3-4'
                ? '📘 Sách Book 1 (3–4 tuổi)'
                : classInfo.ageGroupCode === '4-5'
                ? '📗 Sách Book 2 (4–5 tuổi)'
                : '📙 Sách Book 3 (5–6 tuổi)';

            return (
              <section
                key={classInfo._id}
                className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5 shadow-xs"
              >
                {/* Group Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 font-black text-2xl shadow-2xs">
                      🏫
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{classInfo.name}</h3>
                        <span className="rounded-full bg-teal-100/80 px-3 py-0.5 text-xs font-black text-teal-950 border border-teal-200">
                          {bookLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Sĩ số: {sortedStudents.length} bé · Niên khóa {classInfo.academicYear || '2025–2026'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-700">
                      <span>Độ đúng: <b className="text-teal-950 font-black">{classAvg == null ? 'Chưa có dữ liệu' : classAvg + '%'}</b></span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-amber-950 font-black">
                        <Star size={13} className="fill-amber-400 text-amber-600" />
                        <b>{classStars} sao</b>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenClassAttendance(classInfo)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3.5 py-2 text-xs font-bold text-purple-900 transition-all cursor-pointer"
                      title="Xem tổng hợp tỷ lệ chuyên cần và số buổi đi học của học sinh trong lớp"
                    >
                      <UserCheck size={13} className="text-purple-700" /> Chuyên cần lớp
                    </button>

                    <Link
                      to={`/teacher/schedule?classroomId=${classInfo._id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-800 transition-all cursor-pointer"
                    >
                      <Calendar size={13} /> Lịch & Lộ trình
                    </Link>
                  </div>
                </div>

                {/* Student Cards in this class */}
                {sortedStudents.length === 0 ? (
                  <p className="text-sm text-slate-600 italic py-4 text-center">
                    Không có học sinh nào trong lớp khớp với bộ lọc tìm kiếm.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sortedStudents.map((s) => {
                      const avg = Math.round(s.stats?.averageScore || 0);
                      const stars = s.stats?.totalStars ?? s.stats?.stars ?? 0;
                      const lessons = s.stats?.completedLessons ?? 0;

                      const rankBadge =
                        !s.stats?.hasAssessment ? { label: 'Chưa có dữ liệu', color: 'bg-slate-100 text-slate-700 border-slate-300' } : avg >= 85
                          ? { label: 'Phản hồi tốt', color: 'bg-emerald-100 text-emerald-950 border-emerald-300' }
                          : avg >= 70
                          ? { label: 'Đang củng cố', color: 'bg-teal-100 text-teal-950 border-teal-300' }
                          : { label: 'Cần quan sát thêm', color: 'bg-amber-100 text-amber-950 border-amber-300' };

                      return (
                        <div
                          key={s._id}
                          className="rounded-3xl border border-slate-200/90 bg-white p-4.5 hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Avatar & Name */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                <Avatar student={s} size="md" />
                                <div className="min-w-0">
                                  <Link
                                    to={`/teacher/students/${s._id}`}
                                    className="block font-black text-slate-900 truncate hover:text-teal-900 text-sm sm:text-base tracking-tight"
                                    title={s.name}
                                  >
                                    {s.name}
                                  </Link>
                                </div>
                              </div>
                            </div>

                            {/* Rank Badge */}
                            <div className="mt-3">
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black border ${rankBadge.color}`}
                              >
                                {rankBadge.label}
                              </span>
                            </div>

                            {/* 3 Metrics */}
                            <div className="mt-3.5 grid grid-cols-3 gap-1.5 text-center text-xs">
                              <div className="bg-teal-50/70 border border-teal-100/90 p-2 rounded-2xl">
                                <span className="block text-[10px] font-bold text-teal-900">Độ đúng</span>
                                <b className="text-teal-950 font-black text-sm">{s.stats?.hasAssessment ? avg + '%' : '—'}</b>
                              </div>
                              <div className="bg-amber-50/70 border border-amber-100/90 p-2 rounded-2xl">
                                <span className="block text-[10px] font-bold text-amber-900">Sao</span>
                                <b className="text-amber-950 font-black text-sm flex items-center justify-center gap-0.5">
                                  <Star size={12} className="fill-amber-400 text-amber-600" />
                                  {stars}
                                </b>
                              </div>
                              <div className="bg-indigo-50/70 border border-indigo-100/90 p-2 rounded-2xl">
                                <span className="block text-[10px] font-bold text-indigo-900">Bài xong</span>
                                <b className="text-indigo-950 font-black text-sm">{lessons}</b>
                              </div>
                            </div>

                            {/* Chuyên cần */}
                            {s.attendance && (
                              <div className="mt-2.5 flex items-center justify-between text-xs bg-slate-50 border border-slate-200/70 px-2.5 py-1.5 rounded-xl">
                                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                                  <UserCheck size={12} className={s.attendance.attendanceRate >= 90 ? 'text-emerald-600' : 'text-amber-600'} />
                                  <span>Chuyên cần:</span>
                                </span>
                                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                                  s.attendance.attendanceRate >= 90
                                    ? 'bg-emerald-100 text-emerald-950'
                                    : s.attendance.attendanceRate >= 80
                                    ? 'bg-teal-100 text-teal-950'
                                    : 'bg-rose-100 text-rose-950'
                                }`}>
                                  {s.attendance.attendanceRate}% ({s.attendance.present + s.attendance.late}/{s.attendance.totalSessions || (s.attendance.present + s.attendance.late + s.attendance.absent + s.attendance.excused)} buổi)
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="student-card-actions mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={async () => { try { const result = await teacherApi.getStudentOverview(s._id); setCompetencyStudent({ ...result.data.student, stats: result.data.stats, competencyReport: result.data.competencyReport }); } catch(e: any) { alert(e.message); } }}
                              className="text-xs font-bold text-teal-900 hover:text-teal-950 flex items-center gap-1 cursor-pointer bg-teal-50 hover:bg-teal-100/80 border border-teal-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                              title="Hồ sơ năng lực 3 trụ cột"
                            >
                              <Brain size={13} className="text-teal-700" /> Năng lực
                            </button>

                            <div className="student-card-actions-secondary flex items-center gap-1">
                              <Link
                                to={`/teacher/students/${s._id}`}
                                className="text-xs font-bold text-amber-950 hover:text-amber-900 flex items-center gap-0.5 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                              >
                                Chi tiết <ChevronRight size={13} className="text-amber-700" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickStudent(s);
                                  setQuickNoteText(
                                    s.stats?.hasAssessment ? `Bé ${s.name} đã hoàn thành ${lessons} bài học, độ đúng qua các câu trả lời đạt ${avg}% và tích lũy được ${stars} sao.` : `Gia đình cùng bé ${s.name} ôn lại nội dung đã học bằng một hoạt động ngắn, vui vẻ nhé.`
                                  );
                                }}
                                className="text-xs font-bold text-indigo-900 hover:text-indigo-950 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                                title="Gửi nhận xét phụ huynh"
                              >
                                <Send size={12} className="text-indigo-700" /> Nhận xét
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}

          {/* Unassigned Students Group if any */}
          {showUnassigned && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/30 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-black text-amber-900">Học sinh chưa phân vào lớp</h3>
                    <p className="text-xs font-bold text-amber-800">
                      Các bé này chưa được Admin gán vào lớp học nào.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
                  {classGroups.unassigned.length} bé
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
                {sortStudents(classGroups.unassigned).map((s) => (
                  <div
                    key={s._id}
                    className="rounded-2xl border border-amber-200 bg-white p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar student={s} size="sm" />
                      <div className="min-w-0">
                        <Link
                          to={`/teacher/students/${s._id}`}
                          className="block font-black text-slate-900 truncate hover:text-amber-800 text-sm"
                        >
                          {s.name}
                        </Link>
                        <span className="text-[11px] font-bold text-slate-600 block truncate">
                          Độ tuổi {s.ageGroupCode || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal: Gửi nhanh nhận xét phụ huynh */}
      {quickStudent && (
        <Modal
          title={`Gửi nhận xét đến phụ huynh bé ${quickStudent.name}`}
          maxWidth="max-w-3xl"
          close={() => setQuickStudent(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-teal-100 bg-teal-50 p-3 sm:grid-cols-4">
              <div><span className="block text-xs text-slate-600">Học sinh</span><strong className="text-sm text-slate-900">{quickStudent.name}</strong></div>
              <div><span className="block text-xs text-slate-600">Lớp</span><strong className="text-sm text-slate-900">{classes.find(c => String(c._id) === String(quickStudent.assignedClass?._id || quickStudent.assignedClass))?.name || 'Chưa phân lớp'}</strong></div>
              <div><span className="block text-xs text-slate-600">Bài hoàn thành</span><strong className="text-sm text-slate-900">{quickStudent.stats?.completedLessons ?? 0}</strong></div>
              <div><span className="block text-xs text-slate-600">Độ đúng</span><strong className="text-sm text-slate-900">{quickStudent.stats?.hasAssessment ? `${Math.round(quickStudent.stats.averageScore || 0)}%` : 'Chưa có dữ liệu'}</strong></div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Tiêu đề thông báo</label>
              <input
                type="text"
                value={quickSubject}
                onChange={(e) => setQuickSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Mẫu nhận xét chọn nhanh
              </label>
              <div className="flex flex-wrap gap-1.5">
                {quickReviewChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setQuickNoteText((prev) => (prev ? `${prev} ${chip}` : chip))
                    }
                    className="rounded-lg bg-teal-50 border border-teal-100 px-2 py-1 text-xs font-bold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer text-left"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Lời nhận xét của cô giáo
              </label>
              <ParentNoteSuggestions childId={quickStudent._id} disabled={sendingNote}
                onSelect={option => { setQuickNoteText(option.content);  }} />
              <textarea
                rows={4}
                value={quickNoteText}
                onChange={(e) => setQuickNoteText(e.target.value)}
                placeholder="Nhập nhận xét chi tiết..."
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>



            <button
              disabled={sendingNote || !quickNoteText.trim()}
              onClick={handleSendQuickNote}
              className="mt-2 w-full rounded-xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-700 disabled:opacity-50 cursor-pointer transition-all"
            >
              {sendingNote ? 'Đang gửi thông báo...' : 'Gửi phiếu nhận xét phụ huynh 📨'}
            </button>
          </div>
        </Modal>
      )}

      {competencyStudent && (
        <StudentCompetencyModal
          isOpen={!!competencyStudent}
          onClose={() => setCompetencyStudent(null)}
          student={competencyStudent}
          stats={competencyStudent.stats}
          competencyReport={competencyStudent.competencyReport}
        />
      )}

      {/* Modal: Bảng Chuyên Cần Lớp Học */}
      {classAttendanceModal && (
        <Modal
          title={
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-purple-100 text-purple-700 font-black text-2xl shrink-0 shadow-2xs">
                🏫
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl">
                    Bảng Chuyên Cần — Lớp {classAttendanceModal.name}
                  </h3>
                  <span className="rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-black text-teal-950 border border-teal-200">
                    {classAttendanceModal.ageGroupCode === '3-4'
                      ? '📘 Book 1 (3–4 tuổi)'
                      : classAttendanceModal.ageGroupCode === '4-5'
                      ? '📗 Book 2 (4–5 tuổi)'
                      : '📙 Book 3 (5–6 tuổi)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Thống kê tỷ lệ tham gia lớp học, số buổi đi học và chi tiết điểm danh từng bé
                </p>
              </div>
            </div>
          }
          maxWidth="w-[96vw] max-w-[1700px] h-[92vh] max-h-[92vh]"
          close={() => {
            setClassAttendanceModal(null);
            setClassAttendanceData(null);
          }}
        >
          <div className="space-y-5">
            {loadingClassAttendance ? (
              <div className="py-24 text-center text-slate-500">
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
                <p className="font-bold text-slate-700">Đang tổng hợp dữ liệu chuyên cần của lớp...</p>
                <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
              </div>
            ) : (() => {
              const studentsList = classAttendanceData?.studentAttendanceSummary || [];
              const recentSessions = classAttendanceData?.recentSessions || [];
              const totalSessions = classAttendanceData?.sessionCounts?.COMPLETED ?? recentSessions.filter((s: any) => s.status === 'COMPLETED').length ?? recentSessions.length;

              let totalPresent = 0;
              let totalLate = 0;
              let totalExcused = 0;
              let totalAbsent = 0;

              studentsList.forEach((item: any) => {
                totalPresent += item.present || 0;
                totalLate += item.late || 0;
                totalExcused += item.excused || 0;
                totalAbsent += item.absent || 0;
              });

              const totalSlots = totalPresent + totalLate + totalExcused + totalAbsent;
              const classAvgRate = totalSlots > 0 ? Math.round(((totalPresent + totalLate) / totalSlots) * 100) : 100;

              const perfectCount = studentsList.filter((s: any) => (s.attendanceRate || 100) >= 95).length;
              const hasAbsenceCount = studentsList.filter((s: any) => (s.absent || 0) > 0 || (s.excused || 0) > 0 || (s.late || 0) > 0).length;

              const filteredList = studentsList.filter((item: any) => {
                const st = item.student || {};
                const sName = (st.name || '').toLowerCase();
                const q = classAttendanceSearch.toLowerCase().trim();
                if (q && !sName.includes(q)) return false;

                if (attendanceFilter === 'ABSENT_ONLY') {
                  return (item.absent || 0) > 0 || (item.excused || 0) > 0 || (item.late || 0) > 0;
                }
                if (attendanceFilter === 'PERFECT_ONLY') {
                  return (item.attendanceRate || 100) >= 95;
                }
                return true;
              });

              return (
                <div className="space-y-5">
                  {/* Summary Metric Cards (5 Cards Across Top) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5">
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-purple-50/40 to-white p-3.5 sm:p-4 shadow-2xs">
                      <p className="text-[11px] font-black uppercase tracking-wider text-purple-700">Sĩ số lớp</p>
                      <p className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">{studentsList.length} bé</p>
                      <p className="text-xs font-semibold text-purple-700/80 mt-0.5">Trong danh sách lớp</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-white p-3.5 sm:p-4 shadow-2xs">
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Tỷ lệ chuyên cần TB</p>
                      <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">{classAvgRate}%</p>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">Mức độ tham gia lớp</p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-sky-50/40 to-white p-3.5 sm:p-4 shadow-2xs">
                      <p className="text-[11px] font-black uppercase tracking-wider text-sky-800">Buổi đã tổ chức</p>
                      <p className="text-2xl sm:text-3xl font-black text-sky-950 mt-1">{totalSessions} buổi</p>
                      <p className="text-xs font-semibold text-sky-700 mt-0.5">Đã hoàn thành trên lớp</p>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-teal-50/40 to-white p-3.5 sm:p-4 shadow-2xs">
                      <p className="text-[11px] font-black uppercase tracking-wider text-teal-800">Chuyên cần 100%</p>
                      <p className="text-2xl sm:text-3xl font-black text-teal-950 mt-1">{perfectCount} bé</p>
                      <p className="text-xs font-semibold text-teal-700 mt-0.5">Không nghỉ buổi nào</p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50/40 to-white p-3.5 sm:p-4 shadow-2xs col-span-2 sm:col-span-1">
                      <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">Có vắng / trễ / nghỉ</p>
                      <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">{hasAbsenceCount} bé</p>
                      <p className="text-xs font-semibold text-amber-800 mt-0.5">Cần nhắc nhở & động viên</p>
                    </div>
                  </div>

                  {/* View Tabs: Students List vs Session History */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setClassAttendanceTab('students')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 border ${
                          classAttendanceTab === 'students'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <Users size={16} />
                        <span>Thống kê từng bé ({studentsList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setClassAttendanceTab('sessions')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 border ${
                          classAttendanceTab === 'sessions'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        <Calendar size={16} />
                        <span>Lịch sử các buổi dạy ({recentSessions.length})</span>
                      </button>
                    </div>

                    {classAttendanceTab === 'students' && (
                      <span className="text-xs font-semibold text-slate-500">
                        Hiển thị {filteredList.length} / {studentsList.length} học sinh
                      </span>
                    )}
                  </div>

                  {/* TAB 1: THỐNG KÊ TỪNG BÉ */}
                  {classAttendanceTab === 'students' && (
                    <div className="space-y-3.5">
                      {/* Filter & Search Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-sm">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm theo tên học sinh..."
                            value={classAttendanceSearch}
                            onChange={(e) => setClassAttendanceSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-purple-500 bg-white shadow-2xs"
                          />
                          {classAttendanceSearch && (
                            <button
                              type="button"
                              onClick={() => setClassAttendanceSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>

                        {/* Status Filter Buttons */}
                        <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => setAttendanceFilter('ALL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                              attendanceFilter === 'ALL'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Tất cả ({studentsList.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceFilter('ABSENT_ONLY')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                              attendanceFilter === 'ABSENT_ONLY'
                                ? 'bg-amber-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Có vắng/nghỉ ({hasAbsenceCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setAttendanceFilter('PERFECT_ONLY')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                              attendanceFilter === 'PERFECT_ONLY'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Đi đủ 100% ({perfectCount})
                          </button>
                        </div>
                      </div>

                      {/* Attendance Table - Responsive, Full Width, No Horizontal Scroll Needed */}
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="py-3 px-4 w-[28%]">Học sinh</th>
                              <th className="py-3 px-2 text-center w-[10%]">Có mặt</th>
                              <th className="py-3 px-2 text-center w-[10%]">Đến trễ</th>
                              <th className="py-3 px-2 text-center w-[10%]">Nghỉ phép</th>
                              <th className="py-3 px-2 text-center w-[10%]">Vắng</th>
                              <th className="py-3 px-3 text-center w-[18%]">Tỷ lệ chuyên cần</th>
                              <th className="py-3 px-4 text-center w-[14%]">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredList.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                                  Không tìm thấy học sinh nào phù hợp bộ lọc đã chọn.
                                </td>
                              </tr>
                            ) : (
                              filteredList.map((item: any) => {
                                const st = item.student || {};
                                const rate = item.attendanceRate ?? 100;
                                const contactPhone = st.parentContact || st.contact;

                                return (
                                  <tr key={st._id || item.studentId} className="hover:bg-slate-50/80 transition-colors">
                                    {/* Student Name & Avatar */}
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-3">
                                        <Avatar student={st} size="md" />
                                        <div className="min-w-0">
                                          <p className="font-black text-slate-900 text-xs sm:text-sm truncate">
                                            {st.name}
                                          </p>
                                          {contactPhone && (
                                            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                                              <Phone size={10} className="text-slate-400" />
                                              <span>{contactPhone}</span>
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </td>

                                    {/* Present Count */}
                                    <td className="py-3 px-2 text-center">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                                        <Check size={12} className="text-emerald-600" />
                                        {item.present || 0}
                                      </span>
                                    </td>

                                    {/* Late Count */}
                                    <td className="py-3 px-2 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                          (item.late || 0) > 0
                                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                            : 'bg-slate-50 text-slate-400 border border-slate-200/60'
                                        }`}
                                      >
                                        <Clock size={12} className={(item.late || 0) > 0 ? 'text-amber-600' : 'text-slate-400'} />
                                        {item.late || 0}
                                      </span>
                                    </td>

                                    {/* Excused Count */}
                                    <td className="py-3 px-2 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                          (item.excused || 0) > 0
                                            ? 'bg-sky-50 text-sky-900 border border-sky-200'
                                            : 'bg-slate-50 text-slate-400 border border-slate-200/60'
                                        }`}
                                      >
                                        <Mail size={12} className={(item.excused || 0) > 0 ? 'text-sky-600' : 'text-slate-400'} />
                                        {item.excused || 0}
                                      </span>
                                    </td>

                                    {/* Absent Count */}
                                    <td className="py-3 px-2 text-center">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black ${
                                          (item.absent || 0) > 0
                                            ? 'bg-rose-50 text-rose-900 border border-rose-200 font-black'
                                            : 'bg-slate-50 text-slate-400 border border-slate-200/60'
                                        }`}
                                      >
                                        <X size={12} className={(item.absent || 0) > 0 ? 'text-rose-600' : 'text-slate-400'} />
                                        {item.absent || 0}
                                      </span>
                                    </td>

                                    {/* Attendance Rate with Mini Progress Bar */}
                                    <td className="py-3 px-3 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        <span
                                          className={`inline-block px-3 py-0.5 rounded-full text-xs font-black ${
                                            rate >= 90
                                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                              : rate >= 80
                                              ? 'bg-teal-100 text-teal-950 border border-teal-300'
                                              : 'bg-rose-100 text-rose-950 border border-rose-300'
                                          }`}
                                        >
                                          {rate}%
                                        </span>
                                        <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              rate >= 90 ? 'bg-emerald-500' : rate >= 80 ? 'bg-teal-500' : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(100, rate)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <Link
                                          to={`/teacher/students/${st._id}`}
                                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-800 text-xs font-bold transition-all shadow-2xs"
                                        >
                                          Hồ sơ bé →
                                        </Link>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setClassAttendanceModal(null);
                                            setQuickStudent(st);
                                            setQuickSubject(`Nhận xét chuyên cần — Bé ${st.name}`);
                                          }}
                                          className="p-1.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 hover:bg-purple-100 text-xs font-bold transition-all cursor-pointer"
                                          title="Gửi nhận xét tới phụ huynh"
                                        >
                                          <Mail size={14} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LỊCH SỬ CÁC BUỔI DẠY */}
                  {classAttendanceTab === 'sessions' && (
                    <div className="space-y-3">
                      {recentSessions.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
                          Chưa có buổi học nào được ghi nhận cho lớp này.
                        </div>
                      ) : (
                        recentSessions.map((session: any) => {
                          const isCancelled = session.status === 'CANCELLED';
                          const isLive = session.status === 'LIVE';
                          const scores = session.studentScores || [];
                          const presentCount = scores.filter((s: any) => !['ABSENT', 'EXCUSED'].includes(s.attendance)).length;
                          const absentStudents = scores.filter((s: any) => ['ABSENT', 'EXCUSED'].includes(s.attendance));

                          if (isCancelled) {
                            const reasonText = session.cancellationReason || 'Nghỉ theo kế hoạch';
                            return (
                              <div
                                key={session._id}
                                className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs"
                              >
                                <div className="space-y-1.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black bg-amber-200 text-amber-950 border border-amber-300">
                                      🚫 Buổi học đã báo nghỉ
                                    </span>
                                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                                      <Calendar size={13} className="text-slate-400" />
                                      {date(session.startedAt || session.createdAt)}
                                    </span>
                                  </div>
                                  <h4 className="font-black text-amber-950 text-sm sm:text-base truncate">
                                    Lý do: {reasonText}
                                  </h4>
                                  <div className="flex items-center gap-2 text-xs text-amber-900 flex-wrap">
                                    <span className="font-bold bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                                      Không tính chuyên cần (Nghỉ theo kế hoạch — Bảo lưu bài học)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={session._id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-purple-300 transition-all shadow-2xs"
                            >
                              <div className="space-y-1.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-black ${
                                      isLive
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isLive ? '● Đang dạy' : '✓ Đã kết thúc'}
                                  </span>
                                  <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                                    <Calendar size={13} className="text-slate-400" />
                                    {date(session.startedAt || session.createdAt)}
                                  </span>
                                </div>
                                <h4 className="font-black text-slate-900 text-sm sm:text-base truncate">
                                  {session.title || 'Buổi học'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    👥 {presentCount}/{scores.length} bé có mặt
                                  </span>
                                  {absentStudents.length > 0 ? (
                                    <div className="flex items-center gap-1.5 text-rose-700 flex-wrap">
                                      <span className="font-bold">Vắng ({absentStudents.length}):</span>
                                      {absentStudents.map((abs: any, idx: number) => {
                                        const stName = typeof abs.student === 'object' ? abs.student?.name : 'Bé';
                                        return (
                                          <span
                                            key={idx}
                                            className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-[11px] font-semibold"
                                          >
                                            {stName} ({abs.attendance === 'EXCUSED' ? 'Phép' : 'Vắng'})
                                          </span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-emerald-700 font-bold">✨ Đi đủ 100%</span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0">
                                <Link
                                  to={
                                    isLive
                                      ? `/teacher/classroom-sessions/${session._id}/live`
                                      : `/teacher/classroom-sessions/${session._id}/summary`
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 text-xs font-bold transition-all"
                                >
                                  <span>{isLive ? 'Vào lớp dạy' : 'Xem tổng kết buổi học'}</span>
                                  <ChevronRight size={14} />
                                </Link>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )}
    </>
  );
};

const EXPLORER_LEVEL_MEDIA: Record<number, { img: string; emoji: string; color: string; bg: string; border: string }> = {
  1: {
    img: '/images/rewards/fluent-3d/deciduous_tree_3d.png',
    emoji: '🌱',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  2: {
    img: '/images/rewards/fluent-3d/backpack_3d.png',
    emoji: '🎒',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200'
  },
  3: {
    img: '/images/rewards/fluent-3d/lion_3d.png',
    emoji: '🦁',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  4: {
    img: '/images/rewards/fluent-3d/crown_3d.png',
    emoji: '👑',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  }
};

export const TeacherStudentDetail = () => {
  const [observationParams]=useSearchParams();
  const { studentId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [parentNotifs, setParentNotifs] = useState<any[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCompetencyModal, setShowCompetencyModal] = useState(false);
  const [parentSubject, setParentSubject] = useState('Nhận xét học tập');
  const [parentNoteText, setParentNoteText] = useState('');
  const [showAllAttendance, setShowAllAttendance] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const studentNoteTemplates = [
    { label: '🌟 Phát âm to rõ', text: 'Bé phát âm rất to, rõ ràng và tự tin trước lớp.' },
    { label: '👏 Hăng hái tương tác', text: 'Bé rất hăng hái giơ tay phát biểu và tương tác sôi nổi.' },
    { label: '📖 Cần rèn luyện thêm', text: 'Bé cần ôn lại từ vựng và luyện tập thêm khả năng tập trung.' },
    { label: '🎯 Nhớ từ vựng tốt', text: 'Bé ghi nhớ từ vựng rất nhanh, trả lời chính xác các câu hỏi.' },
    { label: '✨ Tiến bộ rõ rệt', text: 'Bé có sự tiến bộ vượt bậc so với tuần trước.' },
    { label: '🔒 Lưu ý giáo viên', text: 'Ghi chú riêng giáo viên: Cần theo dõi thêm về sự tập trung và phản xạ của bé trong giờ học.' }
  ];

  const load = async () => {
    try { const [overview, messages] = await Promise.all([teacherApi.getStudentOverview(studentId), parentNotificationApi.getChildNotifications(studentId)]); setData(overview.data); setParentNotifs(messages.data || []); setError(''); }
    catch(e: any) { setError(e.message || 'Không thể tải hồ sơ học sinh.'); }
  };
  useEffect(() => { setData(undefined); void load(); }, [studentId]);
  if (error && !data) return <div className="teacher-error" role="alert">{error}<button onClick={() => void load()}>Thử lại</button></div>;
  if (!data) return <Loader />;
  const { student, stats } = data;
  const add = async (e: React.FormEvent) => {
    e.preventDefault(); if (!note.trim() || saving) return; setSaving(true);
    try { await teacherApi.createTeacherNote({ studentId, noteType: 'GENERAL', content: note.trim() }); setNote(''); await load(); }
    catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };
  const sendToParent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!parentNoteText.trim() || saving) return; setSaving(true);
    try { await parentNotificationApi.sendNotification({ childId: studentId, subject: parentSubject, teacherNote: parentNoteText.trim(), templateType: 'GENERAL' }); setParentNoteText(''); setShowSendModal(false); await load(); }
    catch(e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const explorerLevel = data?.competencyReport?.explorerLevel || {
    level: 1,
    title: 'Mầm Nhí Khám Phá',
    icon: '🌱'
  };
  const levelMedia = EXPLORER_LEVEL_MEDIA[explorerLevel.level] || EXPLORER_LEVEL_MEDIA[1];

  return (
    <>
      {error && <div className="teacher-error mb-4" role="alert">{error}</div>}
      <Header
        avatar={<StudentAvatar student={student} size="xl" />}
        title={student.name}
        text={`Độ tuổi ${student.ageGroupCode || '—'} · ${(typeof student.assignedClass === 'object' ? student.assignedClass?.name : student.assignedClass) || 'Chưa phân lớp'}`}
        action={
          <div
            onClick={() => setShowCompetencyModal(true)}
            className="cursor-pointer group p-2.5 px-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50/70 to-white border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all flex items-center gap-3 shrink-0"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 shadow-xs flex items-center justify-center shrink-0 p-1 group-hover:scale-105 transition-transform">
              <img
                src={levelMedia.img}
                alt={explorerLevel.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider">
                  Level {explorerLevel.level}
                </span>
                <span className="text-sm font-black text-slate-900">
                  {explorerLevel.title}
                </span>
              </div>
              <p className="text-[11px] text-teal-800 font-bold mt-0.5 flex items-center gap-1 group-hover:underline">
                <Brain size={12} /> Xem hồ sơ năng lực 3 trụ cột →
              </p>
            </div>
          </div>
        }
      />

      {observationParams.get('unitId')&&<Link className="teacher-button mt-5" to={`/teacher/analytics?unitId=${encodeURIComponent(observationParams.get('unitId')!)}&classroomId=${encodeURIComponent(observationParams.get('classroomId') || data.student?.assignedClass?._id || data.student?.assignedClass || '')}`}>← Quay lại quan sát Unit đang chọn</Link>}
      <ObservationPortfolio studentId={studentId} initialLessonId={observationParams.get("lessonId")||""} unitId={observationParams.get("unitId")||undefined} ageGroup={student.ageGroupCode}/>
      <div className="grid gap-3.5 grid-cols-2 lg:grid-cols-6 items-stretch">
        {/* Card 1: Cấp độ Koko */}
        <div
          onClick={() => setShowCompetencyModal(true)}
          className="h-full min-h-[128px] rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/90 to-emerald-50/50 p-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-teal-400 flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">Cấp độ bé</span>
            <span className="px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-black uppercase shadow-2xs">
              Level {explorerLevel.level}
            </span>
          </div>

          <div className="my-1.5 flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-2xl bg-white border border-teal-200/90 shadow-2xs flex items-center justify-center shrink-0 p-1 group-hover:scale-110 transition-transform">
              <img
                src={levelMedia.img}
                alt={explorerLevel.title}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-black text-teal-950 leading-snug break-words">
                {explorerLevel.title}
              </div>
              <div className="text-[10px] font-bold text-teal-700 mt-0.5">
                {stats.totalStars} ⭐ tích lũy
              </div>
            </div>
          </div>

          <div className="text-[11px] text-teal-800 font-bold flex items-center gap-1 group-hover:underline">
            <Brain size={12} />
            <span>Hồ sơ năng lực →</span>
          </div>
        </div>

        {/* Card 2: Chuyên cần */}
        <div className="h-full min-h-[128px] rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">Chuyên cần</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {data?.attendanceSummary?.attendanceRate ?? 100}%
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold truncate">
            {data?.attendanceSummary?.present || 0}/{data?.attendanceSummary?.totalSessions || 0} buổi tham gia
          </div>
        </div>

        {/* Card 3: Từ vựng tích lũy */}
        <div className="h-full min-h-[128px] rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">Từ vựng</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              <span>{data?.competencyReport?.vocabularyCompetency?.masteredCount ?? 0}</span>
              <span className="text-xs font-bold text-slate-600">từ</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold truncate">
            Đã nhớ thành thạo
          </div>
        </div>

        {/* Card 4: Bài đã hoàn thành */}
        <div className="h-full min-h-[128px] rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">Bài hoàn thành</span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-1">
              <span>{stats.completedLessons}</span>
              <span className="text-xs font-bold text-slate-600">bài</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold truncate">
            Hoàn tất chương trình
          </div>
        </div>

        {/* Card 5: Số sao Koko */}
        <div className="h-full min-h-[128px] rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">Số sao Koko</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Star size={16} className="text-amber-500 fill-amber-400" />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black text-amber-600 tracking-tight">
              ⭐ {stats.totalStars}
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold truncate">
            Tổng sao tích lũy
          </div>
        </div>

        {/* Card 6: Thời gian học */}
        <div className="h-full min-h-[128px] rounded-2xl border border-slate-200/90 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 flex flex-col justify-between group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 tracking-wide">Thời gian học</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Clock size={16} />
            </div>
          </div>
          <div className="my-1.5">
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate" title={studyTimeLabel(stats.learningTime, stats.hasLearningTime)}>
              {studyTimeLabel(stats.learningTime, stats.hasLearningTime)}
            </div>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold truncate">
            Thời lượng ghi nhận
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Lịch sử học tập */}
        <section className="rounded-2xl border bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                <span>Lịch sử học tập</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {data.recentActivities.length} hoạt động
              </span>
            </div>

            <div className="space-y-2.5">
              {data.recentActivities.length ? (
                (showAllActivities ? data.recentActivities : data.recentActivities.slice(0, 5)).map((r: any) => (
                  <div key={r._id} className="p-3 rounded-2xl bg-slate-50/90 hover:bg-slate-100/90 border border-slate-200/70 transition-all space-y-2">
                    {/* Hàng 1: Tên bài học và Điểm số + Sao */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 text-xs block truncate" title={r.lesson?.title}>
                          {r.lesson?.title || 'Bài học'}
                        </span>
                        <div className="mt-1">
                          <span
                            className="inline-block max-w-full text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 truncate"
                            title={r.activity?.title}
                          >
                            {r.activity?.title || 'Hoạt động tự luyện'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                          r.score == null
                            ? 'bg-slate-100 text-slate-600'
                            : r.score >= 80
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : r.score >= 60
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {r.score == null ? 'Chưa chấm' : `${r.score}%`}
                        </span>
                        <span className="text-xs font-black text-amber-600 flex items-center gap-0.5 shrink-0 bg-amber-50 px-1.5 py-0.5 rounded-lg border border-amber-200" title="Đánh giá thành tích lượt chơi">
                          <Star size={11} className="fill-amber-400 text-amber-500" />
                          <span>{r.stars || 0}★</span>
                        </span>
                      </div>
                    </div>

                    {/* Hàng 2: Thời gian và Trạng thái hoàn thành */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-500">
                        <Clock size={11} className="text-slate-400 shrink-0" />
                        <span>{date(r.createdAt)}</span>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Đã hoàn thành
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-6">Chưa có hoạt động học nào.</p>
              )}
            </div>
          </div>

          {data.recentActivities.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllActivities(!showAllActivities)}
              className="w-full mt-3 py-2 px-3 rounded-xl border border-dashed border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 text-xs font-bold transition-colors text-center cursor-pointer"
            >
              {showAllActivities
                ? 'Thu gọn lịch sử học tập ↑'
                : `Xem toàn bộ ${data.recentActivities.length} hoạt động ↓`}
            </button>
          )}
        </section>

        {/* Chuyên cần & Điểm danh */}
        <section className="rounded-2xl border bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserCheck size={18} className="text-teal-700" />
                <span>Chuyên cần & Điểm danh</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                (data?.attendanceSummary?.attendanceRate ?? 100) >= 90
                  ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                  : 'bg-amber-100 text-amber-950 border border-amber-300'
              }`}>
                {data?.attendanceSummary?.attendanceRate ?? 100}%
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 text-center mb-3.5">
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="block text-[10px] font-bold text-emerald-800">Có mặt</span>
                <strong className="text-sm font-black text-emerald-950">{data?.attendanceSummary?.present || 0}</strong>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-100">
                <span className="block text-[10px] font-bold text-amber-800">Đến trễ</span>
                <strong className="text-sm font-black text-amber-950">{data?.attendanceSummary?.late || 0}</strong>
              </div>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                <span className="block text-[10px] font-bold text-blue-800">Nghỉ phép</span>
                <strong className="text-sm font-black text-blue-950">{data?.attendanceSummary?.excused || 0}</strong>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                <span className="block text-[10px] font-bold text-rose-800">Vắng</span>
                <strong className="text-sm font-black text-rose-950">{data?.attendanceSummary?.absent || 0}</strong>
              </div>
            </div>

            {/* Chi tiết từng buổi học đã kết thúc */}
            <div className="space-y-2">
              {data?.attendanceSummary?.history?.length ? (
                (showAllAttendance ? data.attendanceSummary.history : data.attendanceSummary.history.slice(0, 5)).map((h: any, idx: number) => {
                  const isPresent = h.attendance === 'PRESENT';
                  const isLate = h.attendance === 'LATE';
                  const isExcused = h.attendance === 'EXCUSED';
                  return (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs hover:bg-slate-100/70 transition-colors">
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-800 block truncate">{h.title}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{date(h.date)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] shrink-0 ${
                        isPresent
                          ? 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                          : isLate
                          ? 'bg-amber-100 text-amber-950 border border-amber-200'
                          : isExcused
                          ? 'bg-blue-100 text-blue-950 border border-blue-200'
                          : 'bg-rose-100 text-rose-950 border border-rose-200'
                      }`}>
                        {isPresent ? 'Có mặt' : isLate ? 'Đến trễ' : isExcused ? 'Nghỉ phép' : 'Vắng mặt'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 italic text-center py-4">Chưa có lịch sử điểm danh buổi học.</p>
              )}
            </div>
          </div>

          {data?.attendanceSummary?.history?.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllAttendance(!showAllAttendance)}
              className="w-full mt-3 py-2 px-3 rounded-xl border border-dashed border-teal-300 text-teal-800 bg-teal-50/50 hover:bg-teal-50 text-xs font-bold transition-colors text-center cursor-pointer"
            >
              {showAllAttendance
                ? 'Thu gọn danh sách buổi học ↑'
                : `Xem toàn bộ ${data.attendanceSummary.history.length} buổi học ↓`}
            </button>
          )}
        </section>

        <section className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900 text-base">Ghi chú nội bộ giáo viên</h3>
            <span className="text-xs text-slate-600 font-medium">Lưu trữ sư phạm</span>
          </div>

          <form onSubmit={add} className="mb-4 space-y-3">
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Thêm ghi chú riêng về bé (tiến độ, tâm lý, điểm cần lưu ý)…"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-teal-500"
              rows={3}
            />

            {/* Quick chips for teacher note */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-600">Mẫu ghi chú nhanh:</span>
              <div className="flex flex-wrap gap-1.5">
                {studentNoteTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNote(prev => prev ? `${prev} ${t.text}` : t.text)}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!note.trim()}
              className="rounded-xl bg-teal-700 hover:bg-teal-700 disabled:opacity-40 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Lưu ghi chú nội bộ
            </button>
          </form>

          {data.notes.length ? (
            <div className="space-y-3">
              {data.notes.map((n: any) => (
                <div key={n._id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{n.teacher?.name || 'Giáo viên'}</span>
                      <span className="text-[10px] text-slate-600">Nội bộ lớp</span>
                    </div>
                    <small className="text-slate-600 text-xs">{date(n.createdAt)}</small>
                  </div>
                  <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">{n.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-600 py-3 text-center">Chưa có ghi chú nội bộ nào cho bé.</p>
          )}
        </section>
      </div>

      {/* Sổ liên lạc & Thông báo học tập tới Phụ huynh (GV-07: Hiển thị dạng thẻ thông báo, không phải dạng chat) */}
      <section className="mt-6 rounded-2xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <Mail className="text-amber-800" size={20} />
              Sổ Liên Lạc & Thông Báo Tới Phụ Huynh ({parentNotifs.length})
            </h3>
            <p className="text-xs text-slate-600">
              Các phiếu thông báo nhận xét học tập đã gửi về Sổ liên lạc của gia đình bé.
            </p>
          </div>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-700 hover:bg-amber-700 px-3.5 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
          >
            + Gửi thông báo nhận xét mới
          </button>
        </div>

        {parentNotifs.length ? (
          <div className="space-y-4">
            {parentNotifs.map((item: any) => (
              <div key={item._id} className="rounded-2xl border-2 border-amber-200/80 bg-white p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-lg">
                      📢
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{item.subject || 'Phiếu nhận xét học tập'}</h4>
                      <span className="text-[11px] text-slate-600">
                        Gửi ngày {new Date(item.sentAt || item.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.stars > 0 && (
                      <span className="rounded-full bg-amber-100 text-amber-900 px-2.5 py-0.5 text-xs font-bold flex items-center gap-1 border border-amber-300">
                        ⭐ {item.stars} sao khen thưởng
                      </span>
                    )}
                    <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold">
                      ✓ Đã gửi tới phụ huynh
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                  {item.teacherNote || item.content}
                </div>

                {/* Phản hồi từ Phụ huynh / Gia đình gắn trực tiếp với phiếu nhận xét */}
                {item.parentFeedback?.message ? (
                  <div className="mt-2.5 p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                      <span className="flex items-center gap-1.5">
                        💬 <span>{item.parentFeedback.senderName || 'Phụ huynh bé'} phản hồi:</span>
                      </span>
                      {item.parentFeedback.createdAt && (
                        <span className="text-[11px] text-teal-700 font-medium">
                          {new Date(item.parentFeedback.createdAt).toLocaleDateString('vi-VN')} {new Date(item.parentFeedback.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-teal-950 font-medium leading-relaxed whitespace-pre-wrap">
                      {item.parentFeedback.message}
                    </p>
                  </div>
                ) : item.replies && item.replies.length > 0 ? (
                  <div className="mt-2.5 space-y-2">
                    {item.replies.map((reply: any, rIdx: number) => (
                      <div key={rIdx} className={`p-3 rounded-xl border text-xs ${reply.senderRole === 'PARENT' || reply.senderRole === 'FAMILY' ? 'bg-teal-50 border-teal-200 text-teal-950' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>{reply.senderRole === 'PARENT' || reply.senderRole === 'FAMILY' ? '💬 ' : '👩‍🏫 '}{reply.senderName || (reply.senderRole === 'PARENT' ? 'Phụ huynh' : 'Giáo viên')}</span>
                          {reply.createdAt && <span className="text-[10px] opacity-75">{new Date(reply.createdAt).toLocaleDateString('vi-VN')}</span>}
                        </div>
                        <p className="leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium pt-1">
                    <span>⏳ Phụ huynh chưa phản hồi phiếu nhận xét này.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-600 py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chưa có thông báo nào được gửi tới Sổ liên lạc của phụ huynh bé {student.name}.
          </p>
        )}
      </section>

      {/* Modal gửi nhận xét tới Phụ huynh */}
      {showSendModal && (
        <Modal title={`Gửi thông báo tới Sổ liên lạc bé ${student.name}`} close={() => setShowSendModal(false)}>
          <form onSubmit={sendToParent} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Tiêu đề thông báo
              <input
                type="text"
                value={parentSubject}
                onChange={e => setParentSubject(e.target.value)}
                placeholder="VD: Nhận xét học tập tuần này, Khen ngợi bé..."
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-amber-400"
                required
              />
            </label>



            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nội dung nhận xét & dặn dò phụ huynh:
              </label>
              <ParentNoteSuggestions childId={studentId}
                onSelect={option => { setParentNoteText(option.content);  }} />
              <textarea
                value={parentNoteText}
                onChange={e => setParentNoteText(e.target.value)}
                rows={4}
                placeholder="Nhập lời nhận xét chi tiết gửi về cho phụ huynh bé (khen ngợi phát âm, mức độ tập trung, từ vựng cần ôn luyện thêm)..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-amber-400"
                required
              />

              {/* Quick templates for parent note */}
              <div className="mt-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-600">Mẫu nhận xét nhanh:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bé phát âm rất to, rõ ràng và có nhiều tiến bộ hôm nay! 🌟',
                    'Bé tích cực tương tác, hoàn thành rất tốt các bài tập trên lớp! 👏',
                    'Gia đình cho bé ôn thêm từ vựng bài này 10 phút mỗi ngày nhé! 📖',
                    'Bé nhớ bài nhanh, phản xạ nghe và chọn tranh rất chính xác! 🎯'
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setParentNoteText(prev => prev ? `${prev} ${tpl}` : tpl)}
                      className="text-[11px] font-medium bg-slate-100 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {tpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !parentNoteText.trim()}
              className="mt-2 w-full rounded-xl bg-amber-700 hover:bg-amber-700 disabled:opacity-40 py-2.5 font-bold text-white transition-colors cursor-pointer"
            >
              Xác nhận gửi thông báo tới Sổ liên lạc
            </button>
          </form>
        </Modal>
      )}

      {/* Modal Hồ sơ Năng lực 3 Trụ Cột */}
      <StudentCompetencyModal
        isOpen={showCompetencyModal}
        onClose={() => setShowCompetencyModal(false)}
        student={student}
        stats={stats}
        competencyReport={data?.competencyReport}
      />
    </>
  );
};

export { TeacherAnalytics } from './TeacherInsights';

