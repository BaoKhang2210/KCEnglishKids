import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { UnitObservationPanel } from '../../components/teacher/UnitObservationPanel';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Search,
  Users,
  Star,
  Clock,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Award,
  Layers
} from 'lucide-react';
import { teacherApi } from '../../services/api';
import { needsObservation, studyTimeLabel } from '../../utils/learningMetrics';
import { sortByNameVi } from '../../utils/sortStudents';
import { StudentAvatar } from '../../components/common/StudentAvatar';

export const TeacherAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [params, setParams] = useSearchParams();
  const classId = params.get('classroomId') || '';
  const [view, setView] = useState(params.has('unitId') ? 'UNIT' : 'RESULTS');

  const setClassId = (value: string) => {
    const next = new URLSearchParams(params);
    next.delete('unitId');
    if (value) next.set('classroomId', value);
    else next.delete('classroomId');
    setParams(next);
  };

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'EXCELLENT' | 'SUPPORT' | 'UNASSESSED'>('ALL');

  const load = async () => {
    setError('');
    try {
      const [classes, students] = await Promise.all([teacherApi.getClasses(), teacherApi.getStudents()]);
      setData({ classes: classes.data || [], students: students.data || [] });
    } catch (e: any) {
      setError(e.message || 'Không thể tải dữ liệu học tập.');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedClassId = useMemo(() => {
    if (!data?.classes?.length) return '';
    return data.classes.some((room: any) => String(room._id) === classId)
      ? classId
      : String(data.classes[0]._id);
  }, [data, classId]);

  const members = useMemo(() => {
    if (!data?.students) return [];
    return data.students.filter((s: any) => {
      const assigned = String(s.assignedClass?._id || s.assignedClass || '');
      return (
        (!selectedClassId || assigned === selectedClassId) &&
        data.classes.some((room: any) => String(room._id) === assigned)
      );
    });
  }, [data, selectedClassId]);

  const assessed = useMemo(() => members.filter((s: any) => s.stats?.hasAssessment), [members]);
  const support = useMemo(() => members.filter((s: any) => needsObservation(s.stats)), [members]);
  const excellent = useMemo(
    () => members.filter((s: any) => s.stats?.hasAssessment && (s.stats?.averageScore ?? 0) >= 80),
    [members]
  );

  const totalAnswers = useMemo(
    () => assessed.reduce((n: number, s: any) => n + (s.stats?.answeredCount || 0), 0),
    [assessed]
  );

  const avg = useMemo(() => {
    if (!totalAnswers) return null;
    const totalCorrect = assessed.reduce((n: number, s: any) => n + (s.stats?.correctAnswers || 0), 0);
    return Math.round((100 * totalCorrect) / totalAnswers);
  }, [assessed, totalAnswers]);

  const filteredStudents = useMemo(() => {
    return sortByNameVi(members).filter((s: any) => {
      const matchesSearch = s.name.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'));
      if (!matchesSearch) return false;
      if (filter === 'EXCELLENT') return s.stats?.hasAssessment && (s.stats?.averageScore ?? 0) >= 80;
      if (filter === 'SUPPORT') return needsObservation(s.stats);
      if (filter === 'UNASSESSED') return !s.stats?.hasAssessment;
      return true;
    });
  }, [members, search, filter]);

  if (error) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-rose-200 shadow-2xs text-center space-y-3">
        <AlertCircle size={36} className="mx-auto text-rose-500" />
        <p className="text-sm font-bold text-rose-900">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer"
        >
          Tải lại dữ liệu
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm font-semibold text-slate-600">Đang tổng hợp dữ liệu tiến độ học tập…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-800">
      {/* ── HEADER CARD ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md ring-4 ring-indigo-100">
            <TrendingUp size={24} />
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase tracking-wider mb-1">
              <Sparkles size={12} />
              <span>Quan sát &amp; Đồng hành</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
              Theo Dõi Tiến Bộ Học Sinh
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Đánh giá phản xạ, số bài hoàn thành và mức độ tiến bộ qua từng buổi học và hoạt động tự luyện
            </p>
          </div>
        </div>

        <Link
          to="/teacher/assignments"
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs sm:text-sm transition-all shadow-2xs flex items-center gap-2 self-start sm:self-auto shrink-0"
        >
          <span>Giao bài &amp; Nhận xét</span>
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {/* ── 4 COLORFUL KPI STAT CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Sĩ số */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-white to-blue-500/5 border border-indigo-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Học sinh theo dõi</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-950 mt-1">
              {members.length} <span className="text-sm font-bold text-indigo-700">bé</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Trong lớp đang chọn</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Đã có dữ liệu */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-teal-500/10 via-white to-emerald-500/5 border border-teal-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-teal-800 uppercase tracking-wider">Đã tự luyện tập</p>
            <p className="text-2xl sm:text-3xl font-black text-teal-950 mt-1">
              {assessed.length} <span className="text-sm font-bold text-teal-700">bé</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Có dữ liệu trả lời câu hỏi</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 3: Độ đúng trung bình */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-white to-yellow-500/5 border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Độ đúng phản xạ</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
              {avg == null ? '—' : `${avg}%`}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Trung bình bài tự luyện</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
            <Award size={24} />
          </div>
        </div>

        {/* Card 4: Cần cô đồng hành thêm */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-rose-500/10 via-white to-orange-500/5 border border-rose-200/90 shadow-2xs flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cần hỗ trợ thêm</p>
            <p className="text-2xl sm:text-3xl font-black text-rose-950 mt-1">
              {support.length} <span className="text-sm font-bold text-rose-700">bé</span>
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Độ đúng &lt; 60% hoặc chưa học</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles size={24} />
          </div>
        </div>
      </div>

      {/* ── CHÚ GIẢI SƯ PHẠM THÂN THIỆN ─────────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border border-emerald-200/90 flex items-start gap-3 shadow-2xs">
        <Lightbulb size={20} className="text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-950 font-medium leading-relaxed">
          <b>Lời khuyên chuyên môn:</b> Độ đúng phản xạ được tính từ các bài tập và minigame bé tự làm. Cô sử dụng số liệu này để phát hiện kịp thời các từ vựng bé còn bỡ ngỡ nhằm củng cố thêm trong các buổi dạy tiếp theo.
        </div>
      </div>

      {/* ── TABS CHUYỂN CHẾ ĐỘ XEM ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/70">
          <button
            type="button"
            onClick={() => setView('RESULTS')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              view === 'RESULTS'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={16} />
            <span>Kết quả luyện tập &amp; Tự học</span>
          </button>

          <button
            type="button"
            onClick={() => setView('UNIT')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 ${
              view === 'UNIT'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={16} />
            <span>Quan sát năng lực theo Unit</span>
          </button>
        </div>

        {/* Lọc lớp học */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lớp học:</span>
          <select
            value={selectedClassId}
            onChange={e => setClassId(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            {!data.classes.length && <option value="">Chưa có lớp giảng dạy</option>}
            {data.classes.map((c: any) => (
              <option key={c._id} value={c._id}>
                Lớp {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── NỘI DUNG CHÍNH ──────────────────────────────────────────────────── */}
      {view === 'UNIT' ? (
        <UnitObservationPanel
          key={selectedClassId}
          classId={selectedClassId}
          initialUnitId={params.get('unitId') || ''}
        />
      ) : (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
          {/* Header Bar of Table with Search and Filter Pills */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                <span>Bảng Theo Dõi Tiến Bộ Học Sinh</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Hiển thị độ đúng tự luyện, tiến độ bài học, số lượt luyện tập và tổng sao tích lũy.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[200px]">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm học sinh theo tên..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tất cả ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('EXCELLENT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'EXCELLENT'
                      ? 'bg-emerald-500 text-white shadow-2xs'
                      : 'text-emerald-700 hover:bg-emerald-100/60'
                  }`}
                >
                  Tốt ({excellent.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('SUPPORT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'SUPPORT'
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : 'text-rose-700 hover:bg-rose-100/60'
                  }`}
                >
                  Cần hỗ trợ ({support.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('UNASSESSED')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filter === 'UNASSESSED'
                      ? 'bg-slate-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  Chưa học ({members.length - assessed.length})
                </button>
              </div>
            </div>
          </div>

          {/* ── BẢNG THEO DÕI TIẾN BỘ RỰC RỠ SẮC MÀU ────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead className="bg-slate-50/95 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3.5 min-w-[150px]">Học Sinh</th>
                  <th className="py-3 px-3 text-center min-w-[180px]">Độ Đúng Tự Luyện</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Bài Đã Hoàn Thành</th>
                  <th className="py-3 px-3 text-center min-w-[130px]">Luyện Tập &amp; Giờ Học</th>
                  <th className="py-3 px-3 text-center min-w-[140px]">Sao Tích Lũy</th>
                  <th className="py-3 px-3 text-center min-w-[110px]">Hồ Sơ Cá Nhân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 text-xs font-bold">
                      <Users size={32} className="mx-auto text-slate-300 mb-2" />
                      Không tìm thấy học sinh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student: any) => {
                    const stats = student.stats || {};
                    const hasAssessment = stats.hasAssessment;
                    const accuracy = stats.averageScore ?? null;
                    const completed = stats.completedLessons || 0;
                    const attempts = stats.attempts || 0;
                    const studyTime = studyTimeLabel(stats.learningTime);
                    const totalStars = stats.totalStars || 0;
                    const classStars = stats.classStars ?? stats.classroomStars ?? 0;
                    const homeStars = stats.homeStars ?? 0;

                    // Accuracy Tier Color Schemes
                    const isGood = hasAssessment && accuracy != null && accuracy >= 80;
                    const isFair = hasAssessment && accuracy != null && accuracy >= 60 && accuracy < 80;

                    return (
                      <tr
                        key={student._id}
                        className="hover:bg-slate-50/90 transition-colors"
                      >
                        {/* 1. Học Sinh */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-3">
                            <StudentAvatar student={student} size="sm" />
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 text-sm truncate">{student.name}</p>
                              <p className="text-[11px] font-semibold text-slate-500 truncate">
                                {student.assignedClass?.name || 'Chưa phân lớp'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Độ Đúng Tự Luyện & Thanh Tiến Độ */}
                        <td className="py-3 px-3 text-center">
                          {hasAssessment && accuracy != null ? (
                            <div className="space-y-1.5 max-w-[160px] mx-auto">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    isGood
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isFair
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isGood ? 'Rất tốt' : isFair ? 'Khá tốt' : 'Cần hỗ trợ'}
                                </span>
                                <span
                                  className={`font-black text-sm ${
                                    isGood
                                      ? 'text-emerald-700'
                                      : isFair
                                      ? 'text-sky-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {accuracy}%
                                </span>
                              </div>
                              {/* Colored Progress Bar */}
                              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isGood
                                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                                      : isFair
                                      ? 'bg-gradient-to-r from-sky-400 to-blue-500'
                                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                  }`}
                                  style={{ width: `${Math.max(8, accuracy)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                              Chưa có dữ liệu
                            </span>
                          )}
                        </td>

                        {/* 3. Bài Đã Hoàn Thành */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-black text-indigo-900 text-sm">
                              {completed} <span className="text-xs font-bold text-slate-400">/ 36 bài</span>
                            </span>
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600"
                                style={{ width: `${Math.min(100, Math.round((completed / 36) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Lượt Luyện Tập & Thời Lượng */}
                        <td className="py-3 px-3 text-center">
                          <p className="text-slate-800 text-xs font-bold">{attempts} lượt làm bài</p>
                          <p className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                            <Clock size={11} className="text-slate-400" />
                            <span>{studyTime}</span>
                          </p>
                        </td>

                        {/* 5. Sao Tích Lũy */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs shadow-2xs">
                              <Star size={12} className="fill-amber-400 text-amber-500" />
                              <span>{totalStars} sao</span>
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 mt-1">
                              Lớp: <strong className="text-indigo-700">{classStars}</strong> • Nhà:{' '}
                              <strong className="text-emerald-700">{homeStars}</strong>
                            </span>
                          </div>
                        </td>

                        {/* 6. Hồ Sơ Cá Nhân */}
                        <td className="py-3 px-3 text-center">
                          <Link
                            to={`/teacher/students/${student._id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <span>Hồ sơ</span>
                            <ArrowUpRight size={13} />
                          </Link>
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
    </div>
  );
};
