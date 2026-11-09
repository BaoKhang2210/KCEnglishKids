import { PrintLessonCards } from '../../components/teacher/PrintLessonCards';
import { studyTimeLabel } from '../../utils/learningMetrics';
import { LessonFlashcardPreview } from '../../components/teacher/LessonFlashcardPreview';
import { compareLessons, lessonPosition, bilingualLessonTitle } from '../../utils/curriculumLessons';
import React, { useEffect, useMemo, useState } from 'react';
import { ObservationPortfolio } from '../../components/teacher/ObservationPortfolio';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle2, ClipboardList, MessageSquare, Play, Plus, Search, Star, Users, X, Mail, Calendar, ChevronRight, Clock, Sparkles, Trash2, Award, ArrowUpDown, Send, Brain } from 'lucide-react';
import { api, teacherApi, parentNotificationApi } from '../../services/api';
import { sortByNameVi } from '../../utils/sortStudents';
import { ParentNoteSuggestions } from './ParentNoteSuggestions';
import { SentenceTeachingPage } from './SentenceTeachingPage';
import { StudentCompetencyModal } from '../../components/teacher/StudentCompetencyModal';
import { StudentAvatar } from '../../components/common/StudentAvatar';

const Loader = () => <div className="py-20 text-center text-slate-600"><div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />Đang tải không gian giảng dạy…</div>;
const Empty = ({ children }: { children: React.ReactNode }) => <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">{children}</div>;
const Metric = ({ label, value, icon, gradient = 'from-slate-50/80 to-white border-slate-200/90', badge = 'bg-slate-100 text-slate-700', textColor = 'text-slate-900' }: any) => (
  <div className={`rounded-3xl border bg-gradient-to-br ${gradient} p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center justify-between gap-3 group`}>
    <div>
      <span className="block text-xs font-bold text-slate-700 tracking-wide mb-1">{label}</span>
      <div className={`text-3xl font-black ${textColor} tracking-tight`}>{value ?? 0}</div>
    </div>
    <div className={`w-12 h-12 rounded-2xl ${badge} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
      {icon}
    </div>
  </div>
);
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

const Modal = ({ title, close, children, maxWidth = 'max-w-lg' }: any) => (
  <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-2 sm:p-4">
    <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${maxWidth} rounded-2xl bg-white p-4 sm:p-5 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl`}>
      <div className="mb-3 flex items-center justify-between pb-2.5 border-b border-slate-100">
        <h3 className="font-bold text-slate-900 text-base sm:text-lg">{title}</h3>
        <button onClick={close} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
          <X size={20} />
        </button>
      </div>
      <div className="overflow-y-auto flex-1">{children}</div>
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
              <Link
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-semibold text-white transition-all cursor-pointer shadow-xs"
                to={`/teacher/assignments?lesson=${lesson._id}`}
              >
                <ClipboardList size={14} /> Giao bài học này
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export const TeacherAssignments = () => {
  const [assignmentSearch, setAssignmentSearch] = useSearchParams();
  const initialLesson = assignmentSearch.get('lesson') || assignmentSearch.get('lessonId') || '';
  const initialClass = assignmentSearch.get('classroomId') || '';
  const initialStudent = assignmentSearch.get('studentId') || '';
  const [proposal, setProposal] = useState<any>();
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState('');
  const [items, setItems] = useState<any[]>();
  const [error, setError] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [content, setContent] = useState<any>();
  const [create, setCreate] = useState(Boolean(initialLesson || initialStudent));
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(initialClass);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form State
  const [form, setForm] = useState({
    classRoomId: initialClass,
    assignedToType: initialStudent ? 'STUDENT' : 'CLASS',
    studentId: initialStudent,
    lessonId: initialLesson,
    activityId: '',
    dueDate: '',
    instructions: ''
  });

  const [classStudents, setClassStudents] = useState<any[]>([]);

  const load = () => teacherApi.getAssignments().then(x => { setItems(x.data || []); setError(''); }).catch(e => setError(e.message));

  useEffect(() => {
    void load();
    teacherApi.getClasses().then(x => setClasses(x.data || [])).catch(e => setError(e.message));
    teacherApi.getContent().then(x => setContent(x.data || { lessons: [], activities: [] })).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!content || !classes.length) return;
    setForm(current => {
      const activeClasses = classes.filter(c => c.status === 'ACTIVE');
      const classRoomId = current.classRoomId || activeClasses.find(c => c.students?.some((child: any) => String(child._id || child) === initialStudent))?._id || (activeClasses.length === 1 ? activeClasses[0]._id : '');
      const room = classes.find(c => c._id === classRoomId);
      const selectedLesson = content.lessons.find((lesson: any) => lesson._id === current.lessonId);
      const lessonId = selectedLesson?.ageGroupCode && room?.ageGroupCode && selectedLesson.ageGroupCode !== room.ageGroupCode ? '' : current.lessonId;
      return { ...current, classRoomId, lessonId };
    });
  }, [classes, content]);

  useEffect(() => {
    let cancelled = false;
    setClassStudents([]);
    if (form.classRoomId) {
      teacherApi.getClassDetail(form.classRoomId).then(x => {
        if (!cancelled) setClassStudents(x.data?.students || []);
      }).catch(() => { if (!cancelled) setClassStudents([]); });
    }
    return () => { cancelled = true; };
  }, [form.classRoomId]);

  useEffect(() => {
    setProposal(undefined); setProposalError('');
    if (!create || !form.classRoomId || (form.assignedToType === 'STUDENT' && !form.studentId)) { setProposalLoading(false); return; }
    const abort = new AbortController(); setProposalLoading(true);
    const params = new URLSearchParams({ classRoomId: form.classRoomId });
    if (form.assignedToType === 'STUDENT') params.set('studentId', form.studentId);
    if (form.lessonId) params.set('lessonId', form.lessonId);
    api.get('/teacher/assignments/proposal?' + params, abort.signal).then(result => {
      if (abort.signal.aborted) return;
      setProposal(result.data);
      setForm(current => result.data.lessons.some((lesson: any) => lesson._id === current.lessonId) ? current : { ...current, lessonId: result.data.lessonId || '', activityId: '' });
    }).catch(error => { if (!abort.signal.aborted) setProposalError(error.message); })
      .finally(() => { if (!abort.signal.aborted) setProposalLoading(false); });
    return () => abort.abort();
  }, [create, form.classRoomId, form.assignedToType, form.studentId, form.lessonId]);

  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => window.location.reload()}>Thử lại</button></div>;
  if (!items || !content) return <Loader />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classRoomId || !form.lessonId || proposalLoading || !proposal?.available) return;
    setSubmitting(true);
    try {
      await teacherApi.createAssignment({
        classRoomId: form.classRoomId,
        assignedToType: form.assignedToType,
        studentId: form.assignedToType === 'STUDENT' ? form.studentId : undefined,
        lessonId: form.lessonId,
        activityId: form.activityId || undefined,
        dueDate: form.dueDate || undefined,
        instructions: form.instructions || undefined
      });
      setCreate(false);
      setAssignmentSearch({});
      setForm({
        classRoomId: '',
        assignedToType: 'CLASS',
        studentId: '',
        lessonId: '',
        activityId: '',
        dueDate: '',
        instructions: ''
      });
      void load();
    } catch (err: any) {
      alert(err?.message || 'Không thể giao bài. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Hủy bài giao này? Kết quả và nhận xét đã ghi nhận vẫn được giữ lại.')) {
      try {
        await teacherApi.deleteAssignment(id);
        void load();
      } catch (err: any) {
        alert(err?.message || 'Không thể xóa bài.');
      }
    }
  };

  const filtered = items.filter(a => {
    const title = (a.activity?.title || a.lesson?.title || '').toLowerCase();
    const matchSearch = !searchTerm || title.includes(searchTerm.toLowerCase());
    const matchClass = !selectedClassFilter || a.classRoom?._id === selectedClassFilter;
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const activeCount = items.filter(x => ['ASSIGNED', 'IN_PROGRESS'].includes(x.status)).length;
  const completedCount = items.filter(x => x.status === 'COMPLETED').length;

  return (
    <>
      <Header
        title="Quản lý Bài tập được giao"
        text="Theo dõi tiến độ làm bài, giao bài mới và chấm bài của các lớp."
        action={
          <button
            onClick={() => setCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 cursor-pointer"
          >
            <Plus size={16} /> Giao bài tập mới
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Metric
          label="Tổng số bài đã giao"
          value={items.length}
          icon={<ClipboardList size={22} />}
          gradient="from-indigo-50/80 to-blue-50/40 border-indigo-200/90"
          badge="bg-indigo-600 text-white shadow-xs"
          textColor="text-indigo-950"
        />
        <Metric
          label="Đang diễn ra"
          value={activeCount}
          icon={<Clock size={22} />}
          gradient="from-amber-50/80 to-orange-50/40 border-amber-200/90"
          badge="bg-amber-600 text-white shadow-xs"
          textColor="text-amber-950"
        />
        <Metric
          label="Đã hoàn thành"
          value={completedCount}
          icon={<CheckCircle2 size={22} />}
          gradient="from-teal-50/80 to-emerald-50/40 border-teal-200/90"
          badge="bg-teal-600 text-white shadow-xs"
          textColor="text-teal-950"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <SearchBox value={searchTerm} onChange={setSearchTerm} />
          
          <select
            value={selectedClassFilter}
            onChange={e => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer hover:bg-white transition-colors"
          >
            <option value="">Tất cả các lớp</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer hover:bg-white transition-colors"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ASSIGNED">Đang giao</option>
            <option value="IN_PROGRESS">Đang học</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <span className="text-xs font-bold text-slate-600">
          Hiển thị <b className="text-slate-900">{filtered.length}</b> / {items.length} bài
        </span>
      </div>

      {filtered.length ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700 font-bold text-xs border-b border-slate-200">
              <tr>
                <th className="p-4">Nội dung bài tập</th>
                <th className="p-4">Lớp áp dụng</th>
                <th className="p-4">Đối tượng</th>
                <th className="p-4">Hạn hoàn thành</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => {
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date() && a.status !== 'COMPLETED';
                return (
                  <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <Link
                        className="font-black text-slate-900 hover:text-teal-900 hover:underline flex items-center gap-1.5"
                        to={`/teacher/assignments/${a._id}`}
                      >
                        {a.activity?.title || a.lesson?.title}
                        <ChevronRight size={14} className="text-teal-700" />
                      </Link>
                      <span className="mt-1 inline-block text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        {a.activity?.activityType || 'Toàn bộ bài học'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 font-bold text-indigo-900 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-full text-xs">
                        {a.classRoom?.name || '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-teal-900 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-full text-xs">
                        <Users size={13} className="text-teal-700" />
                        Cả lớp ({a.classRoom?.students?.length || 0} bé)
                      </span>
                    </td>
                    <td className="p-4">
                      {a.dueDate ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${isOverdue ? 'text-rose-900 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg' : 'text-slate-700'}`}>
                          <Calendar size={13} />
                          {date(a.dueDate)}
                          {isOverdue && ' (Hết hạn)'}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs font-medium">Không giới hạn</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black border ${
                        a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' :
                        a.status === 'CANCELLED' ? 'bg-rose-100 text-rose-950 border-rose-300' :
                        a.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-950 border-sky-300' :
                        'bg-amber-100 text-amber-950 border-amber-300'
                      }`}>
                        {a.status === 'ASSIGNED' ? 'Đang giao' :
                         a.status === 'IN_PROGRESS' ? 'Đang học' :
                         a.status === 'COMPLETED' ? 'Hoàn thành' :
                         a.status === 'CANCELLED' ? 'Đã hủy' : a.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/teacher/assignments/${a._id}`}
                          className="rounded-xl bg-teal-700 hover:bg-teal-800 px-3.5 py-1.5 text-xs font-bold text-white transition-all shadow-2xs"
                        >
                          Chi tiết & Chấm bài
                        </Link>
                        <button
                          onClick={e => handleDelete(a._id, e)}
                          title="Hủy bài giao, giữ lịch sử"
                          className="p-1.5 text-slate-400 hover:text-rose-700 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>Không có bài tập nào phù hợp với bộ lọc.</Empty>
      )}

      {create && (
        <Modal title="Giao bài tập mới cho học sinh" maxWidth="max-w-4xl" close={() => setCreate(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Select
              label="Chọn lớp học"
              value={form.classRoomId}
              onChange={(v: string) => setForm({ ...form, classRoomId: v, studentId: '', lessonId: '', activityId: '' })}
              options={classes.filter(c => c.status === 'ACTIVE').map(c => ({ value: c._id, label: `${c.name} (${c.students?.length || 0} học sinh)` }))}
            />

            {form.classRoomId && <>
              <Select label="Đối tượng nhận bài" value={form.assignedToType} onChange={(v: string) => setForm({ ...form, assignedToType: v, studentId: '' })} options={[{ value: 'CLASS', label: 'Toàn bộ học sinh trong lớp' }, { value: 'STUDENT', label: 'Một học sinh cần ôn tập riêng' }]} />
              {form.assignedToType === 'STUDENT' && <Select label="Chọn học sinh" value={form.studentId} onChange={(v: string) => setForm({ ...form, studentId: v })} options={classStudents.map(s => ({ value: s._id, label: s.name }))} />}
              <p className="text-sm text-slate-500">Ưu tiên hoạt động ngắn, vui và phù hợp với nội dung bé vừa học.</p>
            </>}

            <Select
              label="Chọn bài học (Lesson)"
              value={form.lessonId}
              onChange={(v: string) => setForm({ ...form, lessonId: v, activityId: '' })}
              options={(proposal?.lessons || []).filter((l: any) => !form.classRoomId || !l.ageGroupCode || l.ageGroupCode === classes.find(c => c._id === form.classRoomId)?.ageGroupCode).sort((a: any, b: any) => compareLessons(a, b, content.units)).map((l: any) => ({ value: l._id, label: `[Unit ${lessonPosition(l, content.units).unit} - Lesson ${lessonPosition(l, content.units).lesson}] ${bilingualLessonTitle(l)}` }))}
            />

            {form.lessonId && (
              <Select
                required={false}
                label="Chọn hoạt động / Game cụ thể"
                value={form.activityId}
                onChange={(v: string) => setForm({ ...form, activityId: v })}
                options={[
                  { value: '', label: '📌 Toàn bộ bài học (Tất cả hoạt động)' },
                  ...content.activities
                    .filter((a: any) => String(a.lesson) === form.lessonId)
                    .map((a: any) => ({ value: a._id, label: `🎮 ${a.title} (${a.activityType})` }))
                ]}
              />
            )}

            {proposalLoading && <p role="status">Đang đối chiếu bài đã học…</p>}
            {proposalError && <p role="alert" className="text-sm text-rose-700">{proposalError}</p>}
            {proposal && <section className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm">
              <p>{proposal.message}</p>
              {!!proposal.items.length && <><strong className="block mt-3">Từ gợi ý cùng gia đình ôn</strong><ul className="mt-2 space-y-2">{proposal.items.map((item: any) => <li key={item.vocabulary._id}><b>{item.vocabulary.english}</b> · {item.reason}</li>)}</ul>
              <p className="mt-2 text-xs">Bài luyện theo nội dung bài hoặc hoạt động đã chọn. Cô có thể dùng nhóm từ này trong lời dặn gia đình.</p>
              <button type="button" className="teacher-button mt-3" onClick={() => setForm({ ...form, instructions: proposal.instructions })}>Dùng hướng dẫn gia đình gợi ý</button></>}
            </section>}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Hạn hoàn thành bài tập
                <input
                  type="date"
                  value={form.dueDate}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                  onChange={e => setForm({ ...form, dueDate: e.target.value })}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Lời dặn dò của giáo viên
                <textarea
                  rows={3}
                  placeholder="VD: Các con luyện phát âm thật to và hoàn thành bài tập này trước cuối tuần nhé!"
                  value={form.instructions}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm"
                  onChange={e => setForm({ ...form, instructions: e.target.value })}
                />
              </label>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreate(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting || proposalLoading || !proposal?.available}
                className="rounded-xl bg-teal-700 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? 'Đang tạo bài…' : 'Xác nhận giao bài'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

const Select = ({ label, value, onChange, options, required = true }: any) => (
  <label className="block text-sm font-medium text-slate-700">
    {label}
    <select
      required={required}
      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-teal-500"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {required && <option value="">Chọn…</option>}
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </label>
);

export const TeacherAssignmentDetail = () => {
  const { assignmentId = '' } = useParams();
  const [data, setData] = useState<any>();
  const [activeTab, setActiveTab] = useState<'ALL' | 'SUBMITTED' | 'UNSUBMITTED' | 'NEEDS_REVIEW'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected student submission for reviewing modal
  const [selectedSub, setSelectedSub] = useState<any | null>(null);

  // Review form state
  const [reviewNote, setReviewNote] = useState('');
  const [bonusStars, setBonusStars] = useState(1);
  const [notifyParent, setNotifyParent] = useState(true);
  const [savingReview, setSavingReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [error, setError] = useState('');
  const load = () => teacherApi.getAssignment(assignmentId).then(x => { setData(x.data); setError(''); }).catch(e => setError(e.message));

  useEffect(() => {
    void load();
  }, [assignmentId]);

  if (error) return <div role="alert" className="teacher-error">{error}<button onClick={() => void load()}>Thử lại</button></div>;
  if (!data) return <Loader />;

  const a = data.assignment;
  const stats = data.stats || {
    totalStudents: 0,
    submittedStudents: 0,
    unsubmittedStudents: 0,
    submissionRate: 0,
    averageScore: 0
  };

  const studentSubmissions: any[] = data.studentSubmissions || [];

  // Open review modal
  const openReviewModal = (item: any) => {
    setSelectedSub(item);
    setReviewNote(item.submission?.teacherFeedback?.comment || '');
    setBonusStars(item.submission?.teacherFeedback?.bonusStars ?? 1);
    setNotifyParent(true);
    setSaveSuccess(false);
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setSavingReview(true);
    try {
      await teacherApi.reviewSubmission(a._id, selectedSub.student._id, {
        comment: reviewNote,
        bonusStars,
        notifyParent
      });
      setSaveSuccess(true);
      await load();
      setTimeout(() => {
        setSelectedSub(null);
        setSaveSuccess(false);
      }, 1200);
    } catch (err: any) {
      alert(err?.message || 'Không thể lưu nhận xét.');
    } finally {
      setSavingReview(false);
    }
  };

  const quickReviewChips = [
    { label: '🌟 Xuất sắc & Điểm tối đa', text: 'Bé hoàn thành bài tập xuất sắc, đạt điểm tuyệt đối và ghi nhớ bài rất nhanh! 🌟' },
    { label: '🗣️ Phát âm to rõ', text: 'Bé phát âm rất to, rõ ràng và chuẩn xác từng từ vựng! 🗣️' },
    { label: '🚀 Phản xạ nhanh', text: 'Bé có phản xạ nghe và chọn đáp án rất nhanh nhạy, đáng khen ngợi! 🚀' },
    { label: '✨ Tiến bộ rõ rệt', text: 'Bé có nhiều tiến bộ tích cực so với các buổi học trước, cô khen ngợi bé! ✨' },
    { label: '👏 Chăm chỉ hoàn thành', text: 'Bé rất chăm chỉ, tự giác hoàn thành bài tập đúng hạn! 👏' },
    { label: '📖 Cần ôn thêm từ vựng', text: 'Bé làm tốt, gia đình cho bé nghe lại từ vựng thêm 10 phút ở nhà để nhớ lâu hơn nhé! 📖' },
    { label: '💡 Cần rèn phản xạ nghe', text: 'Bé cần chú ý lắng nghe kỹ hơn ở các câu hỏi nghe chọn hình ảnh nhé! 💡' }
  ];

  // Filtering students
  const filteredSubmissions = studentSubmissions.filter(item => {
    const matchName = item.student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.student.username.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchName) return false;

    if (activeTab === 'SUBMITTED') return item.hasSubmitted;
    if (activeTab === 'UNSUBMITTED') return !item.hasSubmitted;
    if (activeTab === 'NEEDS_REVIEW') return item.hasSubmitted && !item.submission?.teacherFeedback?.comment;
    return true;
  });

  const needsReviewCount = studentSubmissions.filter(s => s.hasSubmitted && !s.submission?.teacherFeedback?.reviewedAt).length;

  return (
    <>
      <Header
        title={a.activity?.title || a.lesson?.title}
        text={`${a.classRoom?.name || 'Lớp học'} · ${
          a.status === 'ASSIGNED' ? 'Đang giao bài' :
          a.status === 'IN_PROGRESS' ? 'Đang làm bài' :
          a.status === 'COMPLETED' ? 'Đã hoàn thành' : a.status
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link
              to="/teacher/assignments"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← Quay lại danh sách
            </Link>
            {a.status !== 'CANCELLED' && (
              <button
                onClick={async () => {
                  if (confirm('Bạn có chắc muốn hủy bài giao này? Kết quả học đã có sẽ được giữ nguyên.')) {
                    await teacherApi.cancelAssignment(a._id);
                    void load();
                  }
                }}
                className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50"
              >
                Hủy bài giao
              </button>
            )}
          </div>
        }
      />

      {/* Assignment instructions banner */}
      {a.instructions && (
        <div className="mb-6 rounded-2xl bg-teal-50 border border-teal-200 p-4 text-sm text-teal-900 flex items-start gap-3">
          <BookOpen className="text-teal-800 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <b>Lời dặn dò của cô:</b> {a.instructions}
          </div>
        </div>
      )}

      {/* KPI Metrics */}
      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="rounded-3xl border border-teal-200/90 bg-gradient-to-br from-teal-50/80 to-emerald-50/40 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-teal-900 mb-2">
            <span className="text-xs font-bold tracking-wide">Tỷ lệ nộp bài</span>
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Users size={18} />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-teal-950 tracking-tight">
              {stats.submittedStudents} / {stats.totalStudents} <span className="text-xs font-bold text-teal-800">({stats.submissionRate}%)</span>
            </div>
            <div className="mt-2.5 h-2 w-full rounded-full bg-teal-200/60 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all rounded-full"
                style={{ width: `${stats.submissionRate}%` }}
              />
            </div>
          </div>
        </div>

        <Metric
          label="Độ đúng trung bình"
          value={`${stats.averageScore}%`}
          icon={<Award size={20} />}
          gradient="from-amber-50/80 to-orange-50/40 border-amber-200/90"
          badge="bg-amber-600 text-white shadow-xs"
          textColor="text-amber-950"
        />

        <Metric
          label="Chưa nộp bài"
          value={stats.unsubmittedStudents}
          icon={<Clock size={20} />}
          gradient="from-rose-50/80 to-pink-50/40 border-rose-200/90"
          badge="bg-rose-600 text-white shadow-xs"
          textColor="text-rose-950"
        />

        <Metric
          label="Cần chấm / Nhận xét"
          value={needsReviewCount}
          icon={<Sparkles size={20} />}
          gradient="from-indigo-50/80 to-blue-50/40 border-indigo-200/90"
          badge="bg-indigo-600 text-white shadow-xs"
          textColor="text-indigo-950"
        />
      </div>

      {/* Filter and Tab Section */}
      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'ALL'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({studentSubmissions.length})
            </button>
            <button
              onClick={() => setActiveTab('SUBMITTED')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'SUBMITTED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã nộp bài ({stats.submittedStudents})
            </button>
            <button
              onClick={() => setActiveTab('UNSUBMITTED')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'UNSUBMITTED'
                  ? 'bg-rose-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa làm bài ({stats.unsubmittedStudents})
            </button>
            <button
              onClick={() => setActiveTab('NEEDS_REVIEW')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === 'NEEDS_REVIEW'
                  ? 'bg-amber-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Chưa nhận xét ({needsReviewCount})
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <SearchBox value={searchTerm} onChange={setSearchTerm} />
          </div>
        </div>

        {/* Students Submission Table */}
        {filteredSubmissions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                <tr>
                  <th className="p-4">Học sinh</th>
                  <th className="p-4">Trạng thái làm bài</th>
                  <th className="p-4">Độ đúng (%)</th>
                  <th className="p-4">Sao đạt được</th>
                  <th className="p-4">Nhận xét của cô</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubmissions.map(item => {
                  const sub = item.submission;
                  const hasFeedback = !!sub?.teacherFeedback?.reviewedAt;
                  return (
                    <tr key={item.student._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar student={item.student} />
                          <div>
                            <b className="text-slate-900 block">{item.student.name}</b>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={14} /> Đã nộp ({date(sub.submittedAt)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full">
                            <Clock size={14} /> Chưa làm bài
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="font-bold text-slate-800 text-base">{sub.score}%</span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {item.hasSubmitted ? (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                            <Star size={16} className="fill-amber-400 text-amber-800" />
                            {sub.stars}
                            {sub.teacherFeedback?.bonusStars > 0 && (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-1 rounded">
                                +{sub.teacherFeedback.bonusStars} thưởng
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-700">—</span>
                        )}
                      </td>
                      <td className="p-4 max-w-xs">
                        {item.hasSubmitted ? (
                          hasFeedback ? (
                            <div className="text-xs text-slate-700 line-clamp-2" title={sub.teacherFeedback.comment}>
                              <span className="font-bold text-teal-800">✓ Đã nhận xét:</span> {sub.teacherFeedback.comment}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                              Chưa có lời nhận xét
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-600">Chờ bé làm bài</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {item.hasSubmitted ? (
                          <button
                            onClick={() => openReviewModal(item)}
                            className="rounded-xl bg-teal-700 hover:bg-teal-700 px-3.5 py-1.5 text-xs font-bold text-white transition-all cursor-pointer"
                          >
                            Xem bài & Chấm điểm
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600 italic">Chưa có bài nộp</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-600">
            Không tìm thấy học sinh nào trong nhóm này.
          </div>
        )}
      </section>

      {/* Modal Chấm điểm & Xem chi tiết bài làm */}
      {selectedSub && selectedSub.submission && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <Avatar student={selectedSub.student} />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Bài làm của bé: {selectedSub.student.name}
                  </h3>
                  <p className="text-xs text-slate-600">
                    Nộp bài lúc {new Date(selectedSub.submission.submittedAt).toLocaleString()} · Thời gian: {selectedSub.submission.duration || 0}s
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSub(null)}
                className="p-1 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-6">
              {/* Score Snapshot */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Độ đúng (%)</span>
                  <b className="text-2xl text-amber-800">{selectedSub.submission.score}%</b>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Số sao đạt</span>
                  <b className="text-2xl text-amber-800 flex items-center justify-center gap-1">
                    <Star size={20} className="fill-amber-400 text-amber-800 inline" />
                    {selectedSub.submission.stars}
                  </b>
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Kết quả câu</span>
                  <b className="text-xl text-emerald-800">
                    {selectedSub.submission.correctCount || 0} đúng / {(selectedSub.submission.correctCount || 0) + (selectedSub.submission.incorrectCount || 0)} câu
                  </b>
                </div>
              </div>

              {/* Detailed Questions & Answers Breakdown */}
              <div>
                <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-800" />
                  Chi tiết từng câu trả lời ({selectedSub.submission.answers?.length || 0} câu):
                </h4>

                {selectedSub.submission.answers && selectedSub.submission.answers.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSub.submission.answers.map((ans: any, idx: number) => {
                      const vocab = ans.vocabularyId;
                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            ans.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-inherit ${
                                ans.isCorrect ? 'bg-emerald-700' : 'bg-rose-700'
                              }`}>
                                {idx + 1}
                              </span>

                              {vocab?.imageUrl && (
                                <img
                                  src={vocab.imageUrl}
                                  alt={vocab.english || ''}
                                  className="w-12 h-12 object-contain rounded-lg border bg-white"
                                />
                              )}

                              <div>
                                <b className="text-slate-900 block text-sm">
                                  {ans.promptText || vocab?.english || `Câu hỏi #${idx + 1}`}
                                </b>
                                {ans.activityTitle && <span className="block text-xs text-slate-500">{ans.activityTitle}</span>}
                                {vocab && (
                                  <span className="text-xs text-slate-600">
                                    {vocab.english} · {vocab.vietnamese} {vocab.pronunciation && `(/${vocab.pronunciation}/)`}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                                ans.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {ans.isCorrect ? '✓ Chính xác' : '✕ Sai'}
                              </span>
                              {ans.responseTimeMs && (
                                <span className="block text-[11px] text-slate-600 mt-1">
                                  {(ans.responseTimeMs / 1000).toFixed(1)}s
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-600 text-xs">
                    Bài nộp không có chi tiết từng câu hỏi riêng biệt.
                  </div>
                )}
              </div>

              {/* Teacher Review Form */}
              <form onSubmit={handleSaveReview} className="space-y-4 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-800" />
                  Nhận xét & Đánh giá của Giáo viên
                </h4>

                {/* Bonus Stars */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thưởng thêm sao khích lệ bé:
                  </label>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setBonusStars(st)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all ${
                          bonusStars === st
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Star size={14} className={st > 0 ? 'fill-amber-400 text-amber-800' : 'text-slate-600'} />
                        {st === 0 ? 'Không thưởng' : `+${st} sao`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lời nhận xét & dặn dò của cô:
                  </label>
                  <ParentNoteSuggestions childId={selectedSub.student._id} assignmentId={a._id}
                    resultId={selectedSub.submission._id} disabled={savingReview}
                    onSelect={option => { setReviewNote(option.content); setBonusStars(option.suggestedStars); }} />
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={e => setReviewNote(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết gửi cho bé và phụ huynh..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-teal-500"
                    required
                  />

                  {/* Quick Chips */}
                  <div className="mt-2.5 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-800" />
                      <span>Chọn nhanh mẫu câu nhận xét:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {quickReviewChips.map((chip, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setReviewNote(prev => prev ? `${prev} ${chip.text}` : chip.text)}
                          className="text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all cursor-pointer text-left"
                          title={chip.text}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Notify Parent Checkbox */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={notifyParent}
                    onChange={e => setNotifyParent(e.target.checked)}
                    className="rounded border-slate-300 text-teal-800 focus:ring-teal-500 w-4 h-4"
                  />
                  <span>Đồng thời gửi thông báo kết quả này về Sổ liên lạc của Phụ huynh</span>
                </label>

                {saveSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center">
                    ✓ Đã lưu nhận xét và gửi thành công cho bé!
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSub(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={savingReview || !reviewNote.trim()}
                    className="rounded-xl bg-teal-700 hover:bg-teal-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {savingReview ? 'Đang lưu…' : 'Lưu nhận xét & Gửi cho bé'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
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

                    <Link
                      to={`/teacher/classroom-sessions/new?classroomId=${classInfo._id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white transition-all shadow-xs cursor-pointer"
                    >
                      <Play size={13} className="fill-white" /> Dạy lớp này
                    </Link>

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
                                className="text-xs font-bold text-indigo-900 hover:text-indigo-950 flex items-center gap-0.5 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                              >
                                Chi tiết <ChevronRight size={13} className="text-indigo-700" />
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setQuickStudent(s);
                                  setQuickNoteText(
                                    s.stats?.hasAssessment ? `Bé ${s.name} đã hoàn thành ${lessons} bài học, độ đúng qua các câu trả lời đạt ${avg}% và tích lũy được ${stars} sao.` : `Gia đình cùng bé ${s.name} ôn lại nội dung đã học bằng một hoạt động ngắn, vui vẻ nhé.`
                                  );
                                }}
                                className="text-xs font-bold text-amber-950 hover:text-amber-900 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs"
                                title="Gửi nhận xét phụ huynh"
                              >
                                <Send size={12} className="text-amber-700" /> Nhận xét
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
    </>
  );
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

  return (
    <>
      {error && <div className="teacher-error mb-4" role="alert">{error}</div>}
      <Header
        avatar={<StudentAvatar student={student} size="xl" />}
        title={student.name}
        text={`Độ tuổi ${student.ageGroupCode || '—'} · ${(typeof student.assignedClass === 'object' ? student.assignedClass?.name : student.assignedClass) || 'Chưa phân lớp'}`}
      />

      {observationParams.get('unitId')&&<Link className="teacher-button mt-5" to={`/teacher/analytics?unitId=${encodeURIComponent(observationParams.get('unitId')!)}&classroomId=${encodeURIComponent(observationParams.get('classroomId') || data.student?.assignedClass?._id || data.student?.assignedClass || '')}`}>← Quay lại quan sát Unit đang chọn</Link>}
      <ObservationPortfolio studentId={studentId} initialLessonId={observationParams.get("lessonId")||""} unitId={observationParams.get("unitId")||undefined} ageGroup={student.ageGroupCode}/>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <div
          onClick={() => setShowCompetencyModal(true)}
          className="rounded-2xl border-2 border-teal-200 bg-teal-50 p-5 cursor-pointer transition-all group col-span-2 sm:col-span-1"
        >
          <div className="mb-2 flex items-center justify-between text-teal-800 text-xs font-bold uppercase tracking-wider">
            Cấp độ Koko
            <span className="text-xl group-hover:scale-110 transition-transform">
              {data?.competencyReport?.explorerLevel?.icon || '🌱'}
            </span>
          </div>
          <div className="text-base font-black text-teal-900 truncate">
            {data?.competencyReport?.explorerLevel?.title || 'Mầm Nhí Khám Phá'}
          </div>
          <div className="mt-1 text-xs text-teal-800 font-semibold flex items-center gap-1">
            <Brain size={12} /> Xem hồ sơ năng lực →
          </div>
        </div>
        <Metric label="Từ vựng tích lũy" value={`${data?.competencyReport?.vocabularyCompetency?.masteredCount ?? 0} từ vựng`} icon={<BookOpen size={16} />} />
        <Metric label="Bài đã hoàn thành" value={stats.completedLessons} icon={<CheckCircle2 size={16} />} />
        <Metric label="Số sao Koko" value={`⭐ ${stats.totalStars}`} icon={<Star size={16} className="text-amber-800 fill-amber-400" />} />
        <Metric label="Thời gian học đã ghi nhận" value={studyTimeLabel(stats.learningTime, stats.hasLearningTime)} icon={<Clock size={16} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-6">
          <h3 className="mb-3 font-bold">Lịch sử học tập</h3>
          {data.recentActivities.length ? (
            data.recentActivities.map((r: any) => (
              <div key={r._id} className="flex justify-between border-t py-3 text-sm">
                <span>
                  <b>{r.lesson?.title}</b>
                  <small className="block text-slate-600">
                    {r.activity?.title} · {date(r.createdAt)}
                  </small>
                </span>
                <span>{r.score==null?'Chưa có độ đúng':r.score+'%'} · {r.stars}★</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-600">Chưa có hoạt động học nào.</p>
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

