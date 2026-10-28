import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Clock,
  Play,
  Calendar,
  LayoutGrid,
  ChevronRight,
  Plus,
  Loader2,
  Search,
  BookOpen,
  X,
  History,
  CheckCircle2,
  School
} from 'lucide-react';
import { classroomSessionApi, teacherApi } from '../../services/api';
import type { ClassroomSession } from '../../types';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  SCHEDULED: { label: 'Đã lên lịch', color: 'bg-blue-100 text-blue-800', dot: 'bg-blue-700' },
  LIVE: { label: '● Đang dạy', color: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-700 animate-pulse' },
  COMPLETED: { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
};

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const durationMin = (s?: ClassroomSession) => {
  if (!s?.startedAt || !s?.endedAt) return null;
  return Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
};

export const ClassroomSessionsList: React.FC = () => {
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { classId } = useParams<{ classId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const initialSearch = searchParams.get('search') || '';
  const initialClassId = classId || searchParams.get('classroomId') || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  const [search, setSearch] = useState(initialSearch);
  const [selectedClassFilter, setSelectedClassFilter] = useState(initialClassId);
  const [selectedStatusTab, setSelectedStatusTab] = useState<'ALL' | 'LIVE' | 'COMPLETED' | 'SCHEDULED'>('ALL');

  useEffect(() => {
    const cId = classId || searchParams.get('classroomId') || '';
    const q = searchParams.get('search') || '';
    setSelectedClassFilter(cId);
    setSearch(q);
  }, [classId, searchParams]);

  useEffect(() => {
    Promise.all([
      classroomSessionApi.getSessions(selectedClassFilter ? { classroomId: selectedClassFilter } : undefined),
      teacherApi.getClasses().catch(() => ({ data: [] }))
    ])
      .then(([sessRes, classRes]) => {
        setSessions(sessRes.data || []);
        setClasses(classRes.data || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedClassFilter]);

  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (selectedClassFilter) {
      result = result.filter((s) => {
        const cId = String(typeof s.classroom === 'object' ? (s.classroom as any)?._id : s.classroom);
        return cId === String(selectedClassFilter);
      });
    }

    if (selectedStatusTab !== 'ALL') {
      result = result.filter((s) => s.status === selectedStatusTab);
    }

    if (initialLessonId) {
      const matchLesson = result.filter((s) => {
        const lId = String(typeof s.lesson === 'object' ? (s.lesson as any)?._id : s.lesson);
        return lId === initialLessonId;
      });
      if (matchLesson.length > 0) {
        result = matchLesson;
      }
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

    // Sort: Live first, then newest completed/scheduled
    return result.sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      const dateA = new Date(a.startedAt || a.createdAt || '').getTime();
      const dateB = new Date(b.startedAt || b.createdAt || '').getTime();
      return dateB - dateA;
    });
  }, [sessions, selectedStatusTab, search, initialLessonId, selectedClassFilter]);

  const live = filteredSessions.filter((s) => s.status === 'LIVE');
  const past = filteredSessions.filter((s) => s.status === 'COMPLETED');
  const upcoming = filteredSessions.filter((s) => s.status === 'SCHEDULED');

  if (error) return <div className="teacher-error" role="alert">{error}<button onClick={() => window.location.reload()}>Thử lại</button></div>;
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-teal-800" />
        <span className="ml-3 text-slate-600">Đang tải nhật ký buổi dạy…</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs sm:text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
            <History size={16} />
            <span>Nhật ký giảng dạy trên lớp</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5">
            Nhật Ký Các Buổi Dạy
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Xem lại lịch sử mọi buổi học đã diễn ra, tổng kết kết quả của học sinh và kế hoạch bài giảng.
          </p>
        </div>

        <Link
          to="/teacher/classroom-sessions/new"
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 hover:bg-teal-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white  transition self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <Plus size={16} />
          <span>Tạo buổi dạy mới</span>
        </Link>
      </div>

      {/* Filter toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              type="text"
              placeholder="Tìm theo tên bài học, lớp học, buổi dạy..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div className="md:col-span-3">
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            >
              <option value="">🏢 Tất cả lớp học</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.ageGroupCode} tuổi)
                </option>
              ))}
            </select>
          </div>

          {/* Status Tab Filter */}
          <div className="md:col-span-3 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setSelectedStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedStatusTab === 'ALL'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({sessions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedStatusTab === 'COMPLETED'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã dạy
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusTab('LIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedStatusTab === 'LIVE'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Live
            </button>
          </div>
        </div>

        {/* Search & Class match banner if came from another page with query */}
        {(search || selectedClassFilter || initialLessonId) && (
          <div className="flex items-center justify-between text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CheckCircle2 size={14} className="text-teal-800 shrink-0" />
              <span>
                Đang lọc buổi dạy
                {selectedClassFilter && (
                  <span>
                    {' '}của lớp: <strong>"{classes.find((c) => String(c._id) === String(selectedClassFilter))?.name || 'Lớp học'}"</strong>
                  </span>
                )}
                {search && (
                  <span>
                    {' '}khớp bài học: <strong>"{search}"</strong>
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedClassFilter('');
                setSearchParams({});
              }}
              className="text-xs text-teal-800 hover:text-teal-900 underline cursor-pointer shrink-0 ml-2"
            >
              Xem tất cả các lớp
            </button>
          </div>
        )}
      </div>

      {/* Live sessions */}
      {live.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-black text-emerald-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 animate-pulse" />
            <span>Đang diễn ra trên lớp ({live.length})</span>
          </h2>
          <div className="space-y-3">
            {live.map((s) => (
              <SessionCard key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Completed / Past sessions */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-800">
            <Clock size={18} className="text-teal-800" />
            <span>Các buổi dạy đã kết thúc ({past.length})</span>
          </h2>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionCard key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming / Scheduled sessions */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-black text-blue-800">
            <Calendar size={18} className="text-blue-800" />
            <span>Đã lên lịch ({upcoming.length})</span>
          </h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <div key={s._id} className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><SessionCard session={s} /></div><button className="teacher-button text-rose-700" onClick={async () => { if (!window.confirm('Xóa kế hoạch chưa bắt đầu này?')) return; try { await classroomSessionApi.deleteDraft(s._id); setSessions(items => items.filter(item => item._id !== s._id)); } catch(e: any) { alert(e.message); } }}>Xóa kế hoạch</button></div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-600">
          <LayoutGrid size={44} className="mx-auto mb-3 text-slate-700" />
          <p className="font-bold text-slate-800 text-base">Không tìm thấy buổi dạy nào.</p>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
            {search || selectedClassFilter
              ? 'Thử thay đổi từ khóa hoặc xóa bộ lọc để xem các buổi dạy khác.'
              : 'Hãy vào mục Lớp học và bắt đầu buổi dạy để tự động lưu vào nhật ký.'}
          </p>
          {(search || selectedClassFilter) ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSelectedClassFilter('');
                setSelectedStatusTab('ALL');
                setSearchParams({});
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-100 text-inherit text-xs font-bold hover:bg-slate-100 transition"
            >
              Đặt lại bộ lọc
            </button>
          ) : (
            <Link
              to="/teacher/classes"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-teal-700 transition"
            >
              <School size={16} /> Xem các lớp học
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

const SessionCard = ({ session: s }: { session: ClassroomSession }) => {
  const cfg = statusConfig[s.status] || statusConfig.COMPLETED;
  const dur = durationMin(s);
  const classroom = s.classroom as any;
  const lesson = s.lesson as any;
  const link =
    s.status !== 'COMPLETED'
      ? `/teacher/classroom-sessions/${s._id}/live`
      : `/teacher/classroom-sessions/${s._id}/summary`;

  const avg = (s.summary as any)?.averageScore ?? s.summary?.averageAccuracy;

  return (
    <Link
      to={link}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-teal-400 transition-all group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`h-11 w-11 flex-shrink-0 rounded-2xl grid place-items-center ${
            s.status === 'LIVE'
              ? 'bg-emerald-100 text-emerald-800'
              : s.status === 'SCHEDULED'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-teal-50 text-teal-800'
          }`}
        >
          {s.status === 'LIVE' ? (
            <Play size={20} className="fill-emerald-600" />
          ) : s.status === 'SCHEDULED' ? (
            <Calendar size={20} />
          ) : (
            <BookOpen size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              {classroom?.name || 'Lớp học'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>

          <p className="font-extrabold text-slate-900 truncate text-sm sm:text-base group-hover:text-teal-800 transition-colors">
            {s.title}
          </p>

          <p className="text-xs text-slate-600 truncate mt-0.5">
            {lesson?.title ? `Bài học: ${lesson.title}` : 'Buổi dạy tự do'} · {fmt(s.startedAt || s.createdAt)}
            {dur !== null && ` · ${dur} phút`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {s.status === 'COMPLETED' && s.summary && (
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span title="Số bé tham gia">👥 {s.summary.participationCount || (Array.isArray((s as any).scores) ? (s as any).scores.length : 0)} bé</span>
            {s.summary.totalStars !== undefined && (
              <span className="text-amber-800" title="Tổng số sao">⭐ {s.summary.totalStars}</span>
            )}
            {s.summary.participationCount > 0 && avg !== undefined && (
              <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                🎯 {avg}%
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 group-hover:translate-x-0.5 transition-transform">
          <span>{s.status === 'LIVE' ? 'Tiếp tục dạy' : s.status === 'SCHEDULED' ? 'Mở kế hoạch' : 'Xem tổng kết'}</span>
          <ChevronRight size={15} />
        </div>
      </div>
    </Link>
  );
};

export default ClassroomSessionsList;
