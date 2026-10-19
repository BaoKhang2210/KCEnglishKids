import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Star,
  Users,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Send,
  ArrowLeft,
  Clock,
  Target,
  BookOpen,
  X,
  Loader2,
  Calendar,
  History
} from 'lucide-react';
import { classroomSessionApi, parentNotificationApi } from '../../services/api';
import type { ClassroomSession, User } from '../../types';

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

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
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    classroomSessionApi
      .getSessionSummary(sessionId)
      .then((r) => setSession(r.data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-slate-600">Đang tải tổng kết…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-slate-500">Không tìm thấy buổi dạy này.</div>
    );
  }

  const s = session.summary;
  const scores = session.studentScores || [];
  const duration = durationMin(session.startedAt, session.endedAt);

  const topPerformers = (s?.topPerformers || [])
    .slice(0, 3)
    .map((t) => (typeof t === 'string' ? t : (t as User)));

  const needsPractice = (s?.studentsNeedingPractice || []).map((t) =>
    typeof t === 'string' ? t : (t as User)
  );

  const presentCount = scores.filter((sc) => (sc as any).attendance === 'PRESENT' || !(sc as any).attendance).length;
  const absentCount = scores.filter((sc) => (sc as any).attendance === 'ABSENT').length;
  const excusedCount = scores.filter((sc) => (sc as any).attendance === 'EXCUSED').length;
  const lateCount = scores.filter((sc) => (sc as any).attendance === 'LATE').length;

  return (
    <div className="min-h-screen teacher-dark dark bg-[#0c1222] text-slate-100">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-10 text-center">
        <p className="text-5xl mb-2">🎉</p>
        <h1 className="text-4xl font-black tracking-tight">Buổi dạy kết thúc!</h1>
        <p className="mt-2 text-emerald-100 text-lg">
          {session.title}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-bold text-white shadow-xs">
          <span>🏫 Lớp: {(session.classroom as any)?.name || 'Chưa xác định'}</span>
          {(session.classroom as any)?.ageGroupCode && (
            <span className="bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-black">
              {(session.classroom as any)?.ageGroupCode} tuổi
            </span>
          )}
        </div>
        <p className="text-sm text-emerald-200 mt-2">
          {fmt(session.startedAt)}
          {session.endedAt && ` · ${duration} phút`}
        </p>
      </div>

      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 py-8">
        {/* ── Metrics ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <MetricCard
            icon={<Users size={22} className="text-blue-600" />}
            label="Số bé tham gia"
            value={`${s?.participationCount || 0} / ${scores.length}`}
            bg="bg-blue-50"
          />
          <MetricCard
            icon={<Target size={22} className="text-emerald-600" />}
            label="Tỷ lệ đúng"
            value={`${s?.averageAccuracy || 0}%`}
            bg="bg-emerald-50"
          />
          <MetricCard
            icon={<Star size={22} className="text-amber-600 fill-amber-400" />}
            label="Tổng số sao"
            value={`${s?.totalStars || 0} ⭐`}
            bg="bg-amber-50"
          />
          <MetricCard
            icon={<Clock size={22} className="text-violet-600" />}
            label="Thời lượng"
            value={`${duration} phút`}
            bg="bg-violet-50"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Student leaderboard ─────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Kết quả của các bé ({scores.length})
              </h2>
              {/* Quick Attendance Summary Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-1 font-bold text-emerald-700">
                  ✓ {presentCount} có mặt
                </span>
                {absentCount > 0 && (
                  <span className="rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1 font-bold text-rose-700">
                    ✕ {absentCount} vắng
                  </span>
                )}
                {excusedCount > 0 && (
                  <span className="rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1 font-bold text-amber-700">
                    ✉ {excusedCount} có phép
                  </span>
                )}
                {lateCount > 0 && (
                  <span className="rounded-xl bg-orange-50 border border-orange-200 px-2.5 py-1 font-bold text-orange-700">
                    ⏰ {lateCount} muộn
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="pb-3">Học sinh</th>
                    <th className="pb-3">Chuyên cần</th>
                    <th className="pb-3">✓ Đúng</th>
                    <th className="pb-3">✕ Sai</th>
                    <th className="pb-3">Chính xác</th>
                    <th className="pb-3">Sao</th>
                    <th className="pb-3">Điểm</th>
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
                        <td className="py-3 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-teal-100 text-xs font-bold text-teal-700 flex items-center justify-center flex-shrink-0">
                            {stu?.avatarUrl ? (
                              <img src={stu.avatarUrl} className="h-8 w-8 rounded-full object-cover" alt={name} />
                            ) : initials(name)}
                          </div>
                          <span className="font-medium text-slate-800">{name}</span>
                        </td>
                        <td className="py-3">
                          <AttendanceBadge attendance={(sc as any).attendance || 'PRESENT'} />
                        </td>
                        <td className="py-3 text-emerald-600 font-semibold">{sc.correctCount}</td>
                        <td className="py-3 text-rose-500">{sc.incorrectCount}</td>
                        <td className="py-3 text-slate-600 font-medium">{ans > 0 ? `${acc}%` : '—'}</td>
                        <td className="py-3 text-amber-600">
                          {'⭐'.repeat(Math.min(sc.stars, 3))}
                          {sc.stars > 0 && <span className="ml-1 text-xs text-amber-500">×{sc.stars}</span>}
                        </td>
                        <td className="py-3 font-semibold">{sc.points}</td>
                        <td className="py-3">
                          <StatusBadge status={sc.status} />
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
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5">
                <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" /> Bé nổi bật
                </h3>
                <div className="space-y-2">
                  {topPerformers.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    const medals = ['🥇', '🥈', '🥉'];
                    return (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-xl">{medals[i]}</span>
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
                  <AlertTriangle size={18} className="text-amber-600" /> Bé cần ôn thêm
                </h3>
                <div className="space-y-1">
                  {needsPractice.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    return (
                      <p key={i} className="text-sm text-amber-700">• {name}</p>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-amber-600">
                  Cô nên giao thêm bài luyện tập cho các bé này nhé.
                </p>
              </div>
            )}

            {/* Session info */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm">
              <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600" /> Thông tin buổi dạy
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
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow hover:bg-teal-700 transition-colors"
          >
            <Send size={18} /> Gửi báo cáo cho phụ huynh
          </button>
          <Link
            to={`/teacher/classroom-sessions?classroomId=${(session.classroom as any)?._id || ''}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <History size={16} className="text-teal-600" /> Nhật ký buổi dạy lớp này
          </Link>
          <Link
            to={`/teacher/schedule?classroomId=${(session.classroom as any)?._id || ''}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Calendar size={16} className="text-teal-600" /> Sổ lịch & Giáo trình
          </Link>
          <Link
            to={`/teacher/classes/${(session.classroom as any)?._id || ''}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} /> Quay lại lớp học
          </Link>
        </div>
      </div>

      {/* ── Parent Report Modal ──────────────────────────────────────────── */}
      {showReportModal && (
        <ParentReportModal
          session={session}
          onClose={() => setShowReportModal(false)}
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
  bg
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) => (
  <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${bg} border-0`}>
    <div className="mb-2">{icon}</div>
    <p className="text-2xl font-black text-slate-900">{value}</p>
    <p className="text-xs text-slate-500 mt-1">{label}</p>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    NEEDS_PRACTICE: 'bg-amber-100 text-amber-700'
  };
  const labels: Record<string, string> = {
    COMPLETED: '✓ Hoàn thành',
    ACTIVE: '● Đang diễn ra',
    NEEDS_PRACTICE: '⚠ Cần ôn thêm'
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
    </span>
  );
};

const AttendanceBadge = ({ attendance }: { attendance?: string }) => {
  const map: Record<string, { label: string; cls: string }> = {
    PRESENT: { label: '✓ Có mặt', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    ABSENT: { label: '✕ Vắng', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
    EXCUSED: { label: '✉ Có phép', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    LATE: { label: '⏰ Muộn', cls: 'bg-orange-100 text-orange-700 border-orange-200' }
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
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-900 text-right max-w-[60%] truncate">{value}</span>
  </div>
);

// ── Parent Report Modal ────────────────────────────────────────────────────────
const ParentReportModal = ({
  session,
  onClose
}: {
  session: ClassroomSession;
  onClose: () => void;
}) => {
  const scores = session.studentScores || [];
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [batchNote, setBatchNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const PRESET_TEMPLATES = [
    {
      label: '🌟 Khen cả lớp làm tốt',
      text: 'Hôm nay bé tham gia rất tích cực, hào hứng và hoàn thành tốt toàn bộ các hoạt động của buổi học!'
    },
    {
      label: '🗣️ Phát âm tiến bộ',
      text: 'Bé phát âm từ vựng to, rõ ràng và tự tin tương tác với cô giáo trong các trò chơi tiếng Anh.'
    },
    {
      label: '❤️ Chăm chỉ ngoan ngoãn',
      text: 'Bé rất ngoan, chú ý lắng nghe cô hướng dẫn và hoàn thành bài tập đầy đủ với tinh thần vui vẻ.'
    },
    {
      label: '⭐ Xuất sắc nhận sao',
      text: 'Bé hoàn thành xuất sắc các thử thách trong buổi học và nhận được nhiều ngôi sao khen thưởng từ cô!'
    }
  ];

  const applyTemplateToAll = (text: string) => {
    const updated: Record<string, string> = {};
    scores.forEach((sc) => {
      const stu = sc.student as User;
      const studentId = typeof sc.student === 'string' ? sc.student : stu._id || stu.id || '';
      if (studentId) updated[studentId] = text;
    });
    setNotes(updated);
  };

  const handleSendAll = async () => {
    setSending(true);
    setError('');
    try {
      const childReports = scores.map((sc) => {
        const stu = sc.student as User;
        const studentId = typeof sc.student === 'string' ? sc.student : stu._id || stu.id || '';
        const ans = sc.correctCount + sc.incorrectCount;
        const accuracy = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;
        const scorePercent = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;
        return {
          childId: studentId,
          score: scorePercent,
          vocabMastered: 0,
          vocabTotal: 0,
          stars: sc.stars,
          accuracy,
          teacherNote: notes[studentId] || ''
        };
      });

      await parentNotificationApi.sendBulkNotifications({
        sessionId: session._id,
        templateType: 'SESSION_REPORT',
        childReports
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Không thể gửi báo cáo');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Gửi báo cáo & Nhận xét cho phụ huynh</h3>
            <p className="text-xs text-slate-500">Gửi thông báo kết quả buổi học đến {scores.length} phụ huynh của lớp</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
            <h4 className="text-xl font-bold text-slate-900">Đã gửi báo cáo thành công!</h4>
            <p className="mt-2 text-slate-500">
              Đã ghi nhận và gửi {scores.length} báo cáo học tập đến phụ huynh.
            </p>
            <button onClick={onClose} className="mt-6 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white">
              Hoàn tất
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
              {/* Batch Evaluation Templates */}
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="text-xs font-black text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>✨</span> Mẫu nhận xét chung cho toàn bộ học sinh (Áp dụng nhanh 1-Click)
                  </h4>
                  <span className="text-[11px] text-teal-700 font-semibold">
                    {scores.length} bé
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplateToAll(tpl.text)}
                      className="rounded-xl border border-teal-200/80 bg-white p-2.5 text-left text-xs hover:border-teal-400 hover:shadow-xs transition-all cursor-pointer group"
                    >
                      <p className="font-bold text-teal-900 group-hover:text-teal-700">{tpl.label}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{tpl.text}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={batchNote}
                    onChange={(e) => setBatchNote(e.target.value)}
                    placeholder="Hoặc tự soạn nhận xét chung cho cả lớp…"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-400"
                  />
                  <button
                    type="button"
                    disabled={!batchNote.trim()}
                    onClick={() => {
                      if (batchNote.trim()) {
                        applyTemplateToAll(batchNote.trim());
                        setBatchNote('');
                      }
                    }}
                    className="rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
                  >
                    Áp dụng cho tất cả
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              {/* Individual Students list with personalized notes */}
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Chi tiết nhận xét từng bé ({scores.length} bé):
                </p>
                {scores.map((sc, i) => {
                  const stu = sc.student as User;
                  const studentId = typeof sc.student === 'string' ? sc.student : stu._id || stu.id || '';
                  const name = stu?.name || 'Học sinh';
                  const ans = sc.correctCount + sc.incorrectCount;
                  const accuracy = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;

                  return (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="font-bold text-sm text-slate-900">{name}</p>
                        <div className="flex gap-2.5 text-xs text-slate-500 font-semibold">
                          <span className="text-amber-600">⭐ {sc.stars}</span>
                          <span>🎯 {accuracy}%</span>
                          <span className="text-emerald-600">✓ {sc.correctCount} đúng</span>
                        </div>
                      </div>
                      <input
                        placeholder={`Nhận xét riêng cho bé ${name.split(' ').pop()}…`}
                        value={notes[studentId] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [studentId]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t px-6 py-4 flex justify-between gap-3">
              <button
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSendAll}
                disabled={sending}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {sending ? 'Đang gửi…' : `Gửi tới ${scores.length} phụ huynh`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionSummaryPage;
