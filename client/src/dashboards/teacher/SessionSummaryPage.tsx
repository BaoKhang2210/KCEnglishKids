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
  Loader2
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
    ? new Date(d).toLocaleString('en-GB', {
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
        <span className="ml-3 text-slate-600">Loading summary…</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-slate-500">Session not found.</div>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-10 text-center">
        <p className="text-5xl mb-2">🎉</p>
        <h1 className="text-4xl font-black tracking-tight">Session Complete!</h1>
        <p className="mt-2 text-emerald-100 text-lg">
          {session.title}
        </p>
        <p className="text-sm text-emerald-200 mt-1">
          {fmt(session.startedAt)}
          {session.endedAt && ` · ${duration} min`}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* ── Metrics ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
          <MetricCard
            icon={<Users size={22} className="text-blue-600" />}
            label="Participation"
            value={`${s?.participationCount || 0} / ${scores.length}`}
            bg="bg-blue-50"
          />
          <MetricCard
            icon={<Target size={22} className="text-emerald-600" />}
            label="Avg Accuracy"
            value={`${s?.averageAccuracy || 0}%`}
            bg="bg-emerald-50"
          />
          <MetricCard
            icon={<Star size={22} className="text-amber-600 fill-amber-400" />}
            label="Total Stars"
            value={`${s?.totalStars || 0} ⭐`}
            bg="bg-amber-50"
          />
          <MetricCard
            icon={<Clock size={22} className="text-violet-600" />}
            label="Duration"
            value={`${duration} min`}
            bg="bg-violet-50"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Left: Student leaderboard ─────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-900">
              Student Results
            </h2>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="pb-3">Student</th>
                    <th className="pb-3">✓ Correct</th>
                    <th className="pb-3">✕ Wrong</th>
                    <th className="pb-3">Accuracy</th>
                    <th className="pb-3">Stars</th>
                    <th className="pb-3">Points</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((sc, i) => {
                    const stu = sc.student as User;
                    const name = stu?.name || 'Student';
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
                  <Trophy size={18} className="text-amber-500" /> Top Performers
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
                  <AlertTriangle size={18} className="text-amber-600" /> Needs Practice
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
                  Consider assigning extra practice activities for these students.
                </p>
              </div>
            )}

            {/* Session info */}
            <div className="rounded-2xl bg-white border border-slate-200 p-5 text-sm">
              <h3 className="mb-3 font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600" /> Session Info
              </h3>
              <InfoRow label="Class" value={(session.classroom as any)?.name || '—'} />
              <InfoRow label="Lesson" value={(session.lesson as any)?.title || '—'} />
              <InfoRow label="Activities" value={`${session.activities?.length || 0}`} />
              <InfoRow label="Started" value={fmt(session.startedAt)} />
              <InfoRow label="Ended" value={fmt(session.endedAt)} />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-semibold text-white shadow hover:bg-teal-700"
          >
            <Send size={18} /> Send Reports to Parents
          </button>
          <Link
            to={`/teacher/classes/${(session.classroom as any)?._id || ''}`}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} /> Back to Classroom
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
    COMPLETED: '✓ Done',
    ACTIVE: '● Active',
    NEEDS_PRACTICE: '⚠ Needs practice'
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cfg[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
      setError(e.message || 'Failed to send reports');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Send Parent Reports</h3>
          <button onClick={onClose}>
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <CheckCircle2 size={64} className="text-emerald-500 mb-4" />
            <h4 className="text-xl font-bold text-slate-900">Reports Sent!</h4>
            <p className="mt-2 text-slate-500">
              {scores.length} learning reports have been recorded successfully.
            </p>
            <button onClick={onClose} className="mt-6 rounded-xl bg-teal-600 px-6 py-2.5 font-semibold text-white">
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto px-6 py-4">
              <p className="mb-4 text-sm text-slate-500">
                A learning report will be created for each student. Optionally add a personal note per student.
              </p>

              {error && (
                <div className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {scores.map((sc, i) => {
                  const stu = sc.student as User;
                  const studentId = typeof sc.student === 'string' ? sc.student : stu._id || stu.id || '';
                  const name = stu?.name || 'Student';
                  const ans = sc.correctCount + sc.incorrectCount;
                  const accuracy = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;

                  return (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900">{name}</p>
                        <div className="flex gap-3 text-xs text-slate-500">
                          <span>⭐ {sc.stars}</span>
                          <span>🎯 {accuracy}%</span>
                          <span>✓ {sc.correctCount}</span>
                        </div>
                      </div>
                      <input
                        placeholder={`Add a note for ${name.split(' ')[0]}… (optional)`}
                        value={notes[studentId] || ''}
                        onChange={(e) =>
                          setNotes((prev) => ({ ...prev, [studentId]: e.target.value }))
                        }
                        className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400"
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
                Cancel
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
                {sending ? 'Sending…' : `Send to ${scores.length} Parents`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SessionSummaryPage;
