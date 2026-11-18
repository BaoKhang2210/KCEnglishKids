import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Play,
  LayoutGrid,
  List,
  ChevronRight,
  Loader2,
  Search,
  BookOpen,
  X,
  History,
  CheckCircle2,
  School,
  Star,
  Users,
  Target,
  Calendar,
  Sparkles,
  AlertCircle,
  Plus,
  RotateCcw
} from 'lucide-react';
import { cleanReason, getLessonUnitInfo } from '../../utils/teachingSchedule';
import { classroomSessionApi, teacherApi } from '../../services/api';
import type { ClassroomSession } from '../../types';

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '—';

const durationMin = (s?: ClassroomSession) => {
  if (!s?.startedAt || !s?.endedAt) return null;
  const mins = Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
  return mins > 0 ? mins : 1;
};

export const ClassroomSessionsList: React.FC = () => {
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { classId } = useParams<{ classId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // View mode: 'list' (compact table-like rows) or 'grid' (rich card tiles)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filters
  const initialSearch = searchParams.get('search') || '';
  const initialClassId = classId || searchParams.get('classroomId') || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [search, setSearch] = useState(initialSearch);
  const [selectedClassFilter, setSelectedClassFilter] = useState(initialClassId);
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'LIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    const cId = classId || searchParams.get('classroomId') || '';
    const q = searchParams.get('search') || '';
    setSelectedClassFilter(cId);
    setSearch(q);
  }, [classId, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      classroomSessionApi.getSessions(selectedClassFilter ? { classroomId: selectedClassFilter } : undefined),
      teacherApi.getClasses().catch(() => ({ data: [] }))
    ])
      .then(([sessRes, classRes]) => {
        if (cancelled) return;
        setSessions(sessRes.data || []);
        setClasses(classRes.data || []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Không thể tải danh sách buổi dạy');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClassFilter]);

  const baseSessions = useMemo(() => {
    let result = sessions.filter((s) => s.status !== 'SCHEDULED');

    if (selectedClassFilter) {
      result = result.filter((s) => {
        const cId = String(typeof s.classroom === 'object' ? (s.classroom as any)?._id : s.classroom);
        return cId === String(selectedClassFilter);
      });
    }

    if (initialLessonId) {
      result = result.filter((s) => {
        const lId = String(typeof s.lesson === 'object' ? (s.lesson as any)?._id : s.lesson);
        return lId === initialLessonId;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((s) => {
        const t = (s.title || '').toLowerCase();
        const lessonName = (typeof s.lesson === 'object' ? (s.lesson as any)?.title || '' : '').toLowerCase();
        const cName = (typeof s.classroom === 'object' ? (s.classroom as any)?.name || '' : '').toLowerCase();
        return t.includes(q) || lessonName.includes(q) || cName.includes(q);
      });
    }

    return result;
  }, [sessions, selectedClassFilter, initialLessonId, search]);

  const counts = useMemo(
    () => ({
      all: baseSessions.length,
      completed: baseSessions.filter((s) => s.status === 'COMPLETED').length,
      live: baseSessions.filter((s) => s.status === 'LIVE').length,
      cancelled: baseSessions.filter((s) => s.status === 'CANCELLED').length
    }),
    [baseSessions]
  );

  // Overall KPI metrics
  const stats = useMemo(() => {
    const completed = baseSessions.filter((s) => s.status === 'COMPLETED');
    let totalStars = 0;
    let totalStudents = 0;
    let sumAccuracy = 0;
    let countAccuracy = 0;

    for (const s of completed) {
      if (s.summary?.totalStars) totalStars += s.summary.totalStars;
      const count = s.summary?.participationCount || (Array.isArray((s as any).scores) ? (s as any).scores.length : 0);
      totalStudents += count;

      const acc = (s.summary as any)?.averageScore ?? s.summary?.averageAccuracy;
      if (typeof acc === 'number' && !isNaN(acc) && acc > 0) {
        sumAccuracy += acc;
        countAccuracy += 1;
      }
    }

    const avgAccuracy = countAccuracy > 0 ? Math.round(sumAccuracy / countAccuracy) : 0;
    return { totalStars, totalStudents, avgAccuracy };
  }, [baseSessions]);

  const filteredSessions = useMemo(() => {
    let result = baseSessions;

    if (selectedStatusTab !== 'ALL') {
      result = result.filter((s) => s.status === selectedStatusTab);
    }

    return result.sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      const dateA = new Date(a.startedAt || a.createdAt || '').getTime();
      const dateB = new Date(b.startedAt || b.createdAt || '').getTime();
      return dateB - dateA;
    });
  }, [baseSessions, selectedStatusTab]);

  const liveSessions = useMemo(() => filteredSessions.filter((s) => s.status === 'LIVE'), [filteredSessions]);
  const completedSessions = useMemo(() => filteredSessions.filter((s) => s.status === 'COMPLETED'), [filteredSessions]);
  const cancelledSessions = useMemo(() => filteredSessions.filter((s) => s.status === 'CANCELLED'), [filteredSessions]);

  const clearAllFilters = () => {
    setSearch('');
    setSelectedClassFilter('');
    setSelectedStatusTab('ALL');
    setSearchParams({});
  };

  if (error) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-8 text-center text-rose-800 space-y-4">
          <AlertCircle size={40} className="mx-auto text-rose-500" />
          <h2 className="text-xl font-black">Đã xảy ra lỗi khi tải nhật ký buổi dạy</h2>
          <p className="text-sm text-rose-600 max-w-lg mx-auto">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition cursor-pointer"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
          <Sparkles className="h-5 w-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <p className="font-extrabold text-slate-700 text-base">Đang tải nhật ký buổi dạy trên lớp...</p>
        <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
              <History size={14} className="text-teal-700" />
              Nhật Ký & Lịch Sử Giảng Dạy
            </span>
            {counts.live > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                {counts.live} buổi đang dạy
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Nhật Ký Các Buổi Dạy Trên Lớp
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            Xem lại lịch sử mọi buổi học đã diễn ra, bảng xếp hạng sao của học sinh và gửi phiếu báo cáo học tập tới phụ huynh.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards (4 Colorful Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng buổi */}
        <div className="relative overflow-hidden rounded-3xl border border-teal-200/80 bg-gradient-to-br from-teal-50 via-teal-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wide">Tổng buổi dạy</span>
            <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-700 shadow-xs">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-teal-950">{counts.all}</span>
            <span className="text-xs font-bold text-teal-800">buổi ghi nhận</span>
          </div>
          <p className="mt-1 text-[11px] text-teal-700">Lịch sử bài giảng trên lớp</p>
        </div>

        {/* Card 2: Đang dạy live */}
        <div className={`relative overflow-hidden rounded-3xl border p-4 sm:p-5 shadow-xs transition-all ${
          counts.live > 0
            ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-white ring-2 ring-emerald-400/30'
            : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Đang diễn ra</span>
            <div className={`p-2.5 rounded-2xl ${counts.live > 0 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-emerald-100 text-emerald-700'}`}>
              <Play size={20} className={counts.live > 0 ? 'fill-white' : ''} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-950">{counts.live}</span>
            <span className="text-xs font-bold text-emerald-800">buổi đang mở</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700">
            {counts.live > 0 ? 'Có buổi học cần tiếp tục' : 'Không có lớp đang dạy'}
          </p>
        </div>

        {/* Card 3: Tổng lượt bé tham gia */}
        <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-sky-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wide">Lượt bé học</span>
            <div className="p-2.5 rounded-2xl bg-sky-100 text-sky-700 shadow-xs">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-sky-950">{stats.totalStudents}</span>
            <span className="text-xs font-bold text-sky-800">lượt tham gia</span>
          </div>
          <p className="mt-1 text-[11px] text-sky-700">{counts.completed} buổi đã hoàn thành</p>
        </div>

        {/* Card 4: Tổng sao & Độ chính xác */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50/40 to-white p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Tổng sao thưởng</span>
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shadow-xs">
              <Star size={20} className="fill-amber-500 text-amber-500" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-950">{stats.totalStars}</span>
            <span className="text-xs font-bold text-amber-800">⭐ tích lũy</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-800">
            {stats.avgAccuracy > 0 ? `Độ chính xác TB: ${stats.avgAccuracy}%` : 'Chưa có điểm đánh giá'}
          </p>
        </div>
      </div>

      {/* Filter Toolbar (Search, Class Filter, Status Tabs, View Switcher) */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
        {/* Row 1: Search, Classroom selector, and View Mode switch */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên buổi dạy, bài học, lớp học..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 hover:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassFilter(val);
                const nextParams = new URLSearchParams(searchParams);
                if (val) nextParams.set('classroomId', val);
                else nextParams.delete('classroomId');
                setSearchParams(nextParams);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 bg-slate-50/50 cursor-pointer"
            >
              <option value="">🏢 Tất cả lớp học ({classes.length} lớp)</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Switcher (List vs Grid) */}
          <div className="md:col-span-2 flex items-center justify-end gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="Chế độ danh sách hàng ngang"
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={15} />
              <span className="hidden sm:inline">Danh sách</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Chế độ ô thẻ"
              className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={15} />
              <span className="hidden sm:inline">Lưới thẻ</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Tabs (Colorful, Modern & Prominent) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSelectedStatusTab('ALL')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              selectedStatusTab === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/80'
            }`}
          >
            <span>Tất cả</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                selectedStatusTab === 'ALL' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {counts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatusTab('LIVE')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              selectedStatusTab === 'LIVE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100 border-emerald-200/80'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Đang dạy live</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                selectedStatusTab === 'LIVE' ? 'bg-emerald-800 text-white' : 'bg-emerald-200/80 text-emerald-900'
              }`}
            >
              {counts.live}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatusTab('COMPLETED')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              selectedStatusTab === 'COMPLETED'
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-teal-50/60 text-teal-800 hover:bg-teal-100 border-teal-200/80'
            }`}
          >
            <CheckCircle2 size={15} />
            <span>Đã kết thúc</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                selectedStatusTab === 'COMPLETED' ? 'bg-teal-900 text-teal-100' : 'bg-teal-200/80 text-teal-900'
              }`}
            >
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatusTab('CANCELLED')}
            className={`w-full py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              selectedStatusTab === 'CANCELLED'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50/60 text-amber-900 hover:bg-amber-100 border-amber-200/80'
            }`}
          >
            <AlertCircle size={15} />
            <span>Đã báo nghỉ</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                selectedStatusTab === 'CANCELLED' ? 'bg-amber-800 text-white' : 'bg-amber-200/80 text-amber-950'
              }`}
            >
              {counts.cancelled}
            </span>
          </button>
        </div>

        {/* Filter criteria banner */}
        {(search || selectedClassFilter || initialLessonId) && (
          <div className="flex items-center justify-between text-xs font-bold text-teal-900 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 px-4 py-3 rounded-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <CheckCircle2 size={15} className="text-teal-700 shrink-0" />
              <span>
                Đang lọc kết quả:
                {selectedClassFilter && (
                  <span className="ml-1.5 px-2 py-0.5 bg-white rounded-lg border border-teal-300 font-extrabold text-teal-800">
                    Lớp: {classes.find((c) => String(c._id) === String(selectedClassFilter))?.name || selectedClassFilter}
                  </span>
                )}
                {search && (
                  <span className="ml-1.5 px-2 py-0.5 bg-white rounded-lg border border-teal-300 font-extrabold text-teal-800">
                    Từ khóa: "{search}"
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-black text-teal-800 hover:text-teal-950 hover:underline cursor-pointer shrink-0 ml-3"
            >
              <RotateCcw size={13} />
              <span>Đặt lại bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* SESSIONS SECTION: LIVE SESSIONS (Priority Highlight) */}
      {(selectedStatusTab === 'ALL' || selectedStatusTab === 'LIVE') && liveSessions.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-emerald-900">
              <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping" />
              <span>Buổi Học Đang Diễn Ra Trên Lớp ({liveSessions.length})</span>
            </h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              Sẵn sàng cho cô và các bé
            </span>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' : 'space-y-3.5'}>
            {liveSessions.map((s) => (
              <SessionItem key={s._id} session={s} viewMode={viewMode} />
            ))}
          </div>
        </section>
      )}

      {/* SESSIONS SECTION: COMPLETED SESSIONS */}
      {(selectedStatusTab === 'ALL' || selectedStatusTab === 'COMPLETED') && completedSessions.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-800">
              <Clock size={19} className="text-teal-700" />
              <span>Các Buổi Dạy Đã Kết Thúc ({completedSessions.length})</span>
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              Sắp xếp theo thời gian mới nhất
            </span>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' : 'space-y-3.5'}>
            {completedSessions.map((s) => (
              <SessionItem key={s._id} session={s} viewMode={viewMode} />
            ))}
          </div>
        </section>
      )}

      {/* SESSIONS SECTION: CANCELLED SESSIONS */}
      {(selectedStatusTab === 'ALL' || selectedStatusTab === 'CANCELLED') && cancelledSessions.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base sm:text-lg font-black text-amber-900">
              <AlertCircle size={19} className="text-amber-600" />
              <span>Các Ca Dạy Đã Báo Nghỉ ({cancelledSessions.length})</span>
            </h2>
            <span className="text-xs font-semibold text-amber-700">
              Tiến độ bài học đã được tự động bảo lưu
            </span>
          </div>

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5' : 'space-y-3.5'}>
            {cancelledSessions.map((s) => (
              <SessionItem key={s._id} session={s} viewMode={viewMode} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 px-6 text-center text-slate-600 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
            <LayoutGrid size={32} />
          </div>
          <h3 className="font-black text-slate-800 text-lg sm:text-xl">
            Không tìm thấy buổi dạy nào phù hợp
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
            {search || selectedClassFilter || selectedStatusTab !== 'ALL'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm đặt lại toàn bộ bộ lọc để xem các buổi khác.'
              : 'Hãy bắt đầu chuẩn bị một buổi dạy trên lớp để tự động ghi nhận vào nhật ký học tập.'}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            {search || selectedClassFilter || selectedStatusTab !== 'ALL' ? (
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            ) : (
              <Link
                to="/teacher/classroom-sessions/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 text-white text-xs sm:text-sm font-bold hover:bg-teal-700 transition shadow-sm"
              >
                <Plus size={16} /> Bắt đầu buổi dạy
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SessionItemProps {
  session: ClassroomSession;
  viewMode: 'list' | 'grid';
}

const SessionItem: React.FC<SessionItemProps> = ({ session: s, viewMode }) => {
  const dur = durationMin(s);
  const classroom = s.classroom as any;
  const lesson = s.lesson as any;
  const unitInfo = getLessonUnitInfo(lesson);
  const isCancelled = s.status === 'CANCELLED';
  const isLive = s.status === 'LIVE';

  const link = isCancelled
    ? '/teacher/schedule'
    : isLive
    ? `/teacher/classroom-sessions/${s._id}/live`
    : `/teacher/classroom-sessions/${s._id}/summary`;

  const avg = (s.summary as any)?.averageScore ?? s.summary?.averageAccuracy;
  const participationCount = s.summary?.participationCount || (Array.isArray((s as any).scores) ? (s as any).scores.length : 0);
  const totalStars = s.summary?.totalStars ?? 0;

  // Render GRID CARD layout
  if (viewMode === 'grid') {
    return (
      <Link
        to={link}
        className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
          isLive
            ? 'border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white hover:border-emerald-500 ring-2 ring-emerald-400/20'
            : isCancelled
            ? 'border-amber-200 bg-gradient-to-b from-amber-50/40 to-white hover:border-amber-400'
            : 'border-slate-200/90 bg-white hover:border-teal-400'
        }`}
      >
        <div className="space-y-3.5">
          {/* Card Top: Badges */}
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200">
              <School size={12} className="text-teal-700" />
              <span className="truncate max-w-[140px]">{classroom?.name || 'Lớp học'}</span>
            </span>

            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang dạy
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                🚫 Báo nghỉ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                ✓ Hoàn thành
              </span>
            )}
          </div>

          {/* Card Middle: Title & Lesson */}
          <div>
            <h3 className="font-black text-slate-900 text-base group-hover:text-teal-700 transition-colors line-clamp-2 leading-snug">
              {isCancelled && s.cancellationReason ? `Báo nghỉ: ${cleanReason(s.cancellationReason)}` : s.title}
            </h3>
            {lesson?.title && (
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600 line-clamp-1" title={`${unitInfo.label ? `${unitInfo.label}: ` : ''}${lesson.title}`}>
                <BookOpen size={13} className="text-teal-700 shrink-0" />
                {unitInfo.label && (
                  <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-black shrink-0">
                    {unitInfo.label}
                  </span>
                )}
                <span className="truncate">{lesson.title}</span>
              </p>
            )}
          </div>

          {/* Time & Duration row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              {fmt(s.startedAt || s.createdAt)}
            </span>
            {dur !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                <Clock size={11} className="text-slate-400" />
                {dur}p
              </span>
            )}
          </div>
        </div>

        {/* Card Footer: Metrics & CTA */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
          {s.status === 'COMPLETED' ? (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200"
                title="Số bé tham gia"
              >
                <Users size={12} /> {participationCount}
              </span>
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200"
                title="Tổng sao thưởng"
              >
                <Star size={12} className="fill-amber-400 text-amber-500" /> {totalStars}
              </span>
              {typeof avg === 'number' && !isNaN(avg) && avg > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                  title="Độ chính xác trung bình"
                >
                  <Target size={12} /> {avg}%
                </span>
              )}
            </div>
          ) : isCancelled ? (
            <span className="text-[11px] font-bold text-amber-800 truncate max-w-[180px]">
              {cleanReason(s.cancellationReason)}
            </span>
          ) : (
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Buổi dạy đang mở
            </span>
          )}

          <div
            className={`inline-flex items-center gap-1 text-xs font-black group-hover:translate-x-1 transition-transform ${
              isLive ? 'text-emerald-700' : isCancelled ? 'text-amber-800' : 'text-teal-700'
            }`}
          >
            <span>{isLive ? 'Tiếp tục' : isCancelled ? 'TKB' : 'Tổng kết'}</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </Link>
    );
  }

  // Render LIST ROW layout (Full Width, Neat & Modern)
  return (
    <Link
      to={link}
      className={`group flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isLive
          ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/80 via-white to-white hover:border-emerald-500 ring-2 ring-emerald-400/20'
          : isCancelled
          ? 'border-amber-200 bg-gradient-to-r from-amber-50/60 via-white to-white hover:border-amber-400'
          : 'border-slate-200/90 bg-white hover:border-teal-400'
      }`}
    >
      {/* Left: Icon + Main Info */}
      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Status Avatar */}
        <div
          className={`h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-2xl grid place-items-center shadow-xs transition-transform group-hover:scale-105 ${
            isLive
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-200'
              : isCancelled
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200'
              : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-200'
          }`}
        >
          {isLive ? (
            <Play size={22} className="fill-white translate-x-0.5" />
          ) : isCancelled ? (
            <AlertCircle size={24} />
          ) : (
            <BookOpen size={22} />
          )}
        </div>

        {/* Text Details */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200">
              <School size={12} className="text-teal-700" />
              <span>{classroom?.name || 'Lớp học'}</span>
            </span>

            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang diễn ra trên lớp
              </span>
            ) : isCancelled ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                🚫 Đã báo nghỉ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                ✓ Đã hoàn thành
              </span>
            )}

            {lesson?.title && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-teal-900 bg-teal-50 border border-teal-200">
                <BookOpen size={11} className="text-teal-700 shrink-0" />
                <span>{unitInfo.label ? `${unitInfo.label} · ` : ''}{lesson.title}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base group-hover:text-teal-700 transition-colors truncate">
            {isCancelled && s.cancellationReason ? `Báo nghỉ: ${cleanReason(s.cancellationReason)}` : s.title}
          </h3>

          {/* Metadata sub-row */}
          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} className="text-slate-400" />
              {fmt(s.startedAt || s.createdAt)}
            </span>
            {dur !== null && (
              <span className="inline-flex items-center gap-1 font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                <Clock size={11} className="text-slate-400" />
                {dur} phút
              </span>
            )}
            {isCancelled && (
              <span className="text-amber-800 font-semibold">
                Lý do: {cleanReason(s.cancellationReason)} · Tiến độ tự động bảo lưu
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Metrics + Action Button */}
      <div className="flex items-center justify-between lg:justify-end gap-3.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
        {/* Performance metrics pills for completed sessions */}
        {s.status === 'COMPLETED' && (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs"
              title="Số học sinh tham gia buổi học"
            >
              <Users size={14} className="text-sky-600" />
              <span>{participationCount} bé</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs"
              title="Tổng số sao các bé nhận được"
            >
              <Star size={14} className="fill-amber-400 text-amber-500" />
              <span>{totalStars} sao</span>
            </div>

            {typeof avg === 'number' && !isNaN(avg) && avg > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs"
                title="Tỉ lệ hoàn thành / chuẩn xác"
              >
                <Target size={14} className="text-emerald-600" />
                <span>{avg}%</span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div>
          {isLive ? (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-sm group-hover:bg-emerald-700 transition">
              <span>Vào lớp dạy</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : isCancelled ? (
            <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-bold group-hover:bg-amber-200 transition">
              <span>Xem lịch dạy</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 text-slate-800 text-xs sm:text-sm font-bold group-hover:bg-teal-50 group-hover:text-teal-800 group-hover:border-teal-200 border border-transparent transition">
              <span>Xem tổng kết</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ClassroomSessionsList;
