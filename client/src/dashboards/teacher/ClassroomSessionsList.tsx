import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock, Play, Calendar, LayoutGrid, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { classroomSessionApi } from '../../services/api';
import type { ClassroomSession } from '../../types';

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  SCHEDULED: { label: 'Đã lên lịch', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  LIVE: { label: '● Đang dạy', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500 animate-pulse' },
  COMPLETED: { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
};

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const durationMin = (s?: ClassroomSession) => {
  if (!s?.startedAt || !s?.endedAt) return null;
  return Math.floor((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000);
};

export const ClassroomSessionsList: React.FC = () => {
  const [sessions, setSessions] = useState<ClassroomSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { classId } = useParams<{ classId?: string }>();

  useEffect(() => {
    classroomSessionApi
      .getSessions(classId ? { classroomId: classId } : undefined)
      .then((r) => setSessions(r.data))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
        <span className="ml-3 text-slate-600">Đang tải các buổi dạy…</span>
      </div>
    );
  }

  const live = sessions.filter((s) => s.status === 'LIVE');
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED');
  const past = sessions.filter((s) => s.status === 'COMPLETED');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-teal-700">Không gian giảng dạy</p>
          <h1 className="text-3xl font-bold text-slate-900">Buổi dạy trên lớp</h1>
          <p className="mt-1 text-slate-500">Các buổi dạy trực tiếp và đã kết thúc của bạn.</p>
        </div>
      </div>

      {/* Live sessions */}
      {live.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-700">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Đang diễn ra ({live.length})
          </h2>
          <div className="space-y-3">
            {live.map((s) => (
              <SessionCard key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled sessions */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-700">
            <Calendar size={18} /> Đã lên lịch ({upcoming.length})
          </h2>
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionCard key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-700">
            <Clock size={18} /> Đã kết thúc ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionCard key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          <LayoutGrid size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">Chưa có buổi dạy nào.</p>
          <p className="text-sm mt-1">Hãy vào mục Lớp học và bấm "Bắt đầu buổi dạy" để tạo buổi dạy mới.</p>
          <Link
            to="/teacher/classes"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus size={16} /> Xem các lớp học
          </Link>
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
    s.status === 'LIVE'
      ? `/teacher/classroom-sessions/${s._id}/live`
      : s.status === 'COMPLETED'
      ? `/teacher/classroom-sessions/${s._id}/summary`
      : `/teacher/classroom-sessions/${s._id}/live`;

  return (
    <Link
      to={link}
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <div className={`h-10 w-10 flex-shrink-0 rounded-xl grid place-items-center ${
          s.status === 'LIVE' ? 'bg-emerald-100' : s.status === 'SCHEDULED' ? 'bg-blue-100' : 'bg-slate-100'
        }`}>
          {s.status === 'LIVE' ? (
            <Play size={20} className="text-emerald-700" />
          ) : s.status === 'SCHEDULED' ? (
            <Calendar size={20} className="text-blue-700" />
          ) : (
            <Clock size={20} className="text-slate-600" />
          )}
        </div>

        <div className="min-w-0">
          <p className="font-bold text-slate-900 truncate text-sm sm:text-base">{s.title}</p>
          <p className="text-xs sm:text-sm text-slate-500 truncate">
            {classroom?.name || '—'} · {lesson?.title || 'Buổi tự do'} ·{' '}
            {fmt(s.startedAt || s.createdAt)}
            {dur !== null && ` · ${dur} min`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {s.summary && (
          <div className="hidden sm:flex gap-4 text-sm text-slate-500">
            <span>👥 {s.summary.participationCount}</span>
            <span>⭐ {s.summary.totalStars}</span>
            <span>🎯 {s.summary.averageAccuracy}%</span>
          </div>
        )}
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
          {cfg.label}
        </span>
        <ChevronRight size={16} className="text-slate-400" />
      </div>
    </Link>
  );
};

export default ClassroomSessionsList;
