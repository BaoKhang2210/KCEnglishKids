import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Star,
  Users,
  AlertTriangle,
  Trophy,
  Send,
  ArrowLeft,
  Clock,
  Target,
  BookOpen,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { classroomSessionApi } from '../../services/api';
import { FamilyReportModal } from '../../components/teacher/FamilyReportModal';
import { StudentAvatar } from '../../components/common/StudentAvatar';
import type { ClassroomSession, User } from '../../types';

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    : '—';

const durationMin = (start?: string, end?: string) => {
  if (!start || !end) return 0;
  return Math.floor(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000
  );
};

export const SessionSummaryPage: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!successToast) return;
    const t = setTimeout(() => setSuccessToast(''), 4000);
    return () => clearTimeout(t);
  }, [successToast]);

  useEffect(() => {
    classroomSessionApi
      .getSessionSummary(sessionId)
      .then((r) => setSession(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-800" />
        <span className="ml-3 text-slate-600">Đang tải tổng kết…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-slate-600">
        {error || 'Không tìm thấy buổi dạy này.'}
        <Link className="teacher-button ml-4" to="/teacher/classroom-sessions">
          Quay lại xem toàn bộ những buổi học
        </Link>
      </div>
    );
  }

  const s = session.summary;
  const scores = [...(session.studentScores || [])].sort((a, b) => Number(['ABSENT', 'EXCUSED'].includes(a.attendance || '')) - Number(['ABSENT', 'EXCUSED'].includes(b.attendance || '')) || b.stars - a.stars);
  const duration = durationMin(session.startedAt, session.endedAt);
  const answeredCount = scores.filter(sc => !['ABSENT', 'EXCUSED'].includes(sc.attendance || '')).reduce((total, sc) => total + sc.correctCount + sc.incorrectCount, 0);

  const topPerformers = (s?.topPerformers || [])
    .map((t) => (typeof t === 'string' ? t : (t as User)));

  const needsPractice = (s?.studentsNeedingPractice || []).map((t) =>
    typeof t === 'string' ? t : (t as User)
  );

  const presentCount = scores.filter((sc) => (sc as any).attendance === 'PRESENT' || !(sc as any).attendance).length;
  const absentCount = scores.filter((sc) => (sc as any).attendance === 'ABSENT').length;
  const excusedCount = scores.filter((sc) => (sc as any).attendance === 'EXCUSED').length;
  const lateCount = scores.filter((sc) => (sc as any).attendance === 'LATE').length;

  return (
    <div className="staff-workspace min-h-screen bg-slate-50 text-slate-700">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="bg-emerald-700 text-white px-6 py-10 text-center">
        <p className="text-5xl mb-2">🎉</p>
        <h1 className="text-4xl font-black tracking-tight">Buổi dạy kết thúc!</h1>
        <p className="mt-2 text-inherit text-lg">
          {session.title}
        </p>
        <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 bg-black/10 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold text-inherit">
          <span>🏫 Lớp: {(session.classroom as any)?.name || 'Chưa xác định'}</span>
          {(session.classroom as any)?.ageGroupCode && (
            <span className="bg-black/10 px-2.5 py-0.5 rounded-full text-xs font-black">
              {(session.classroom as any)?.ageGroupCode} tuổi
            </span>
          )}
          {Boolean(session.plannedDuration) && (
            <span className="bg-black/10 px-2.5 py-0.5 rounded-full text-xs font-black flex items-center gap-1">
              ⏱ Kế hoạch: {session.plannedDuration} phút
            </span>
          )}
        </div>
        <p className="text-sm text-inherit mt-2">
          {fmt(session.startedAt)}
          {session.endedAt && (
            <span>
              {' · '}
              Thực dạy: {duration} phút
              {session.plannedDuration ? ` (kế hoạch: ${session.plannedDuration} phút)` : ''}
            </span>
          )}
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 py-8">
        {session.teachingOutcome && <section className="portfolio-card mb-6"><h2 className="font-bold text-xl">Nội dung buổi học</h2><p className="mt-2">{({COMPLETE:'Đã tổ chức đủ mục tiêu bài',CONTINUE:'Cần dạy tiếp ở buổi sau',REVIEW:'Buổi ôn tập, giữ tiến độ hiện tại'})[session.teachingOutcome.coverage]}</p><p className="mt-2">{session.teachingOutcome.reflection}</p><p className="text-sm mt-2 text-slate-600">Đây là ghi nhận nội dung đã dạy; mức tự làm của từng bé được lưu trong hồ sơ quan sát.</p></section>}
        {/* ── Metrics ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <MetricCard
            icon={<Users size={22} className="text-blue-800" />}
            label="Số bé tham gia"
            value={`${s?.participationCount || 0} / ${scores.length}`}
            bg="bg-blue-50"
          />
          <MetricCard
            icon={<Target size={22} className="text-emerald-800" />}
            label="Tỷ lệ đúng"
            value={answeredCount ? (s?.averageAccuracy || 0) + '%' : 'Chưa có dữ liệu'}
            bg="bg-emerald-50"
          />
          <MetricCard
            icon={<Star size={22} className="text-amber-800 fill-amber-400" />}
            label="Tổng số sao"
            value={`${s?.totalStars || 0} ⭐`}
            bg="bg-amber-50"
          />
          <MetricCard
            icon={<Clock size={22} className="text-violet-800" />}
            label="Thời lượng"
            value={`${duration} phút`}
            sublabel={session.plannedDuration ? `Kế hoạch: ${session.plannedDuration} phút` : undefined}
            bg="bg-violet-50"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Student leaderboard ─────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Bảng xếp hạng sao ({scores.length} học sinh)
              </h2>
              {/* Quick Attendance Summary Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-bold text-emerald-800">
                  ✓ {presentCount} có mặt
                </span>
                {absentCount > 0 && (
                  <span className="rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1 font-bold text-rose-800">
                    ✕ {absentCount} vắng
                  </span>
                )}
                {excusedCount > 0 && (
                  <span className="rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-800">
                    ✉ {excusedCount} có phép
                  </span>
                )}
                {lateCount > 0 && (
                  <span className="rounded-xl bg-orange-50 border border-orange-200 px-2.5 py-1 font-bold text-orange-800">
                    ⏰ {lateCount} muộn
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full min-w-[760px] text-sm [&_th]:whitespace-nowrap [&_th]:pr-3 [&_td]:pr-3">
                <thead className="text-left text-slate-600 border-b">
                  <tr>
                    <th className="pb-3">Hạng sao</th>
                    <th className="pb-3">Học sinh</th>
                    <th className="pb-3">Chuyên cần</th>
                    <th className="pb-3">✓ Đúng</th>
                    <th className="pb-3">✕ Sai</th>
                    <th className="pb-3">Chính xác</th>
                    <th className="pb-3">Sao</th>
                    <th className="pb-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((sc, i) => {
                    const stu = sc.student as User;
                    const name = stu?.name || 'Học sinh';
                    const ans = sc.correctCount + sc.incorrectCount;
                    const acc = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;
                    return (
                      <tr key={i} className="border-t">
                        <td className="py-3 font-bold">{sc.stars > 0 && !['ABSENT', 'EXCUSED'].includes(sc.attendance || '') ? 1 + scores.filter(row => !['ABSENT', 'EXCUSED'].includes(row.attendance || '') && row.stars > sc.stars).length : '—'}</td>
                        <td className="py-3 flex items-center gap-2">
                          <StudentAvatar student={stu} size="sm" />
                          <span style={{ minWidth: 130, whiteSpace: 'nowrap' }} className="font-medium text-slate-800">{name}</span>
                        </td>
                        <td className="py-3">
                          <AttendanceBadge attendance={(sc as any).attendance || 'PRESENT'} />
                        </td>
                        <td className="py-3 text-emerald-800 font-semibold">{sc.correctCount}</td>
                        <td className="py-3 text-rose-800">{sc.incorrectCount}</td>
                        <td className="py-3 text-slate-600 font-medium">{ans > 0 ? `${acc}%` : '—'}</td>
                        <td className="py-3 text-amber-800">
                          <span className="whitespace-nowrap">⭐ {sc.stars}</span>
                        </td>
                        <td className="py-3">
                          {['ABSENT','EXCUSED'].includes(sc.attendance || '') ? <span className="text-slate-500">Vắng mặt</span> : ans === 0 ? <span className="text-slate-500">Chưa ghi nhận câu trả lời</span> : <StatusBadge status={sc.status} />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right: Highlights ─────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Top performers */}
            {topPerformers.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-200 p-5">
                <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-800" /> Bé nổi bật
                </h3>
                <div className="space-y-2">
                  {topPerformers.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xl">🌟</span>
                        <span className="font-medium text-slate-800">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Needs practice */}
            {needsPractice.length > 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
                <h3 className="mb-3 font-bold text-amber-800 flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-800" /> Bé cần ôn thêm
                </h3>
                <div className="space-y-1">
                  {needsPractice.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    return (
                      <p key={i} className="text-sm text-amber-800">• {name}</p>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-amber-800">
                  Có thể chọn thêm bài luyện tập cho các bé này nhé.
                </p>
              </div>
            )}

            {/* Session info */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm">
              <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-800" /> Thông tin buổi dạy
              </h3>
              <InfoRow label="Lớp" value={(session.classroom as any)?.name || '—'} />
              <InfoRow label="Bài học" value={(session.lesson as any)?.title || '—'} />
              <InfoRow label="Hoạt động" value={`${session.activities?.length || 0}`} />
              <InfoRow label="Bắt đầu" value={fmt(session.startedAt)} />
              <InfoRow label="Kết thúc" value={fmt(session.endedAt)} />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 font-semibold text-white hover:bg-teal-700 transition-colors"
          >
            <Send size={18} /> Gửi báo cáo cho phụ huynh
          </button>
          <Link
            to="/teacher/classroom-sessions"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại xem toàn bộ những buổi học
          </Link>
        </div>
      </div>

      {/* ── Toast notification ────────────────────────────────────────── */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 px-5 py-3.5 text-white font-bold shadow-2xl animate-fade-in border border-emerald-400/30">
          <CheckCircle2 size={20} className="text-emerald-200 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── Parent Report Modal ──────────────────────────────────────────── */}
      {showReportModal && (
        <FamilyReportModal
          session={session}
          onClose={() => setShowReportModal(false)}
          onSuccess={(msg) => setSuccessToast(msg)}
        />
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const MetricCard = ({
  icon,
  label,
  value,
  sublabel,
  bg
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel?: string;
  bg: string;
}) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${bg} border-0 flex flex-col justify-between`}>
    <div>
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
    <div className="mt-1">
      <p className="text-xs text-slate-600 font-medium">{label}</p>
      {sublabel && <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{sublabel}</p>}
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    ACTIVE: 'bg-blue-100 text-blue-800',
    NEEDS_PRACTICE: 'bg-amber-100 text-amber-800'
  };
  const labels: Record<string, string> = {
    COMPLETED: '✓ Hoàn thành',
    ACTIVE: '● Đang củng cố',
    NEEDS_PRACTICE: '⚠ Cần ôn thêm'
  };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cfg[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
    </span>
  );
};

const AttendanceBadge = ({ attendance }: { attendance?: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PRESENT: { label: '✓ Có mặt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    ABSENT: { label: '✕ Vắng', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
    EXCUSED: { label: '✉ Có phép', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    LATE: { label: '⏰ Muộn', cls: 'bg-orange-100 text-orange-800 border-orange-200' }
  };
  const item = map[attendance || 'PRESENT'] || map.PRESENT;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${item.cls}`}>
      {item.label}
    </span>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-1 border-t first:border-0">
    <span className="text-slate-600">{label}</span>
    <span className="font-medium text-slate-900 text-right max-w-[60%] truncate">{value}</span>
  </div>
);

export default SessionSummaryPage;
