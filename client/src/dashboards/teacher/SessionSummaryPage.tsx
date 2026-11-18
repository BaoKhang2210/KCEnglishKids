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
  CheckCircle2,
  School,
  Sparkles,
  Calendar,
  Check,
  X,
  Mail
} from 'lucide-react';
import { classroomSessionApi } from '../../services/api';
import { getLessonUnitInfo } from '../../utils/teachingSchedule';
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
  return Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000);
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
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
          <p className="text-sm font-bold text-slate-600">Đang tải dữ liệu tổng kết buổi học…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center text-slate-600">
        <p className="text-lg font-bold text-rose-600 mb-4">{error || 'Không tìm thấy buổi dạy này.'}</p>
        <Link
          className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-2.5 text-white font-bold text-sm shadow-md hover:bg-teal-800 transition-all"
          to="/teacher/classroom-sessions"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách buổi dạy</span>
        </Link>
      </div>
    );
  }

  const s = session.summary;
  const scores = [...(session.studentScores || [])].sort(
    (a, b) =>
      Number(['ABSENT', 'EXCUSED'].includes(a.attendance || '')) -
        Number(['ABSENT', 'EXCUSED'].includes(b.attendance || '')) || b.stars - a.stars
  );
  const duration = durationMin(session.startedAt, session.endedAt);
  const answeredCount = scores
    .filter((sc) => !['ABSENT', 'EXCUSED'].includes(sc.attendance || ''))
    .reduce((total, sc) => total + sc.correctCount + sc.incorrectCount, 0);

  const topPerformers = (s?.topPerformers || []).map((t) =>
    typeof t === 'string' ? t : (t as User)
  );

  const needsPractice = (s?.studentsNeedingPractice || []).map((t) =>
    typeof t === 'string' ? t : (t as User)
  );

  const presentCount = scores.filter(
    (sc) => (sc as any).attendance === 'PRESENT' || !(sc as any).attendance
  ).length;
  const absentCount = scores.filter((sc) => (sc as any).attendance === 'ABSENT').length;
  const excusedCount = scores.filter((sc) => (sc as any).attendance === 'EXCUSED').length;
  const lateCount = scores.filter((sc) => (sc as any).attendance === 'LATE').length;
  const attendedCount = scores.filter((sc) => !['ABSENT', 'EXCUSED'].includes((sc as any).attendance)).length;
  const participationCount =
    s?.participationCount !== undefined && s.participationCount > 0 ? s.participationCount : attendedCount;

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 pb-16 animate-fade-in">
      {/* ── Top Header Hero Banner (Full-width, Modern Emerald Gradient) ──── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 text-white px-6 py-10 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="w-full max-w-[1920px] mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-black border border-white/20">
              <span>🎉</span>
              <span>BUỔI HỌC ĐÃ HOÀN THÀNH XUẤT SẮC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              {session.title}
            </h1>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1 text-xs font-bold text-emerald-100">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 border border-white/15">
                <School size={14} className="text-emerald-300" />
                <span>Lớp: {(session.classroom as any)?.name || 'Chưa xác định'}</span>
              </span>

              {(session.classroom as any)?.ageGroupCode && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-400 text-slate-950 font-black shadow-xs">
                  👶 {(session.classroom as any)?.ageGroupCode} tuổi
                </span>
              )}

              {(() => {
                const lessonObj = session.lesson as any;
                const uInfo = getLessonUnitInfo(lessonObj);
                if (!lessonObj?.title && !uInfo.label) return null;
                return (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/20 text-white font-black border border-white/25">
                    <BookOpen size={13} className="text-amber-300" />
                    <span>
                      {uInfo.label ? `${uInfo.label}: ` : ''}
                      {lessonObj?.title || ''}
                    </span>
                  </span>
                );
              })()}

              {Boolean(session.plannedDuration) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 border border-white/15">
                  <Clock size={13} className="text-teal-300" />
                  <span>Kế hoạch: {session.plannedDuration} phút</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/20 border border-white/15">
                <Calendar size={13} className="text-sky-300" />
                <span>{fmt(session.startedAt)}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send size={16} />
              <span>Gửi báo cáo phụ huynh</span>
            </button>
            <Link
              to="/teacher/classroom-sessions"
              className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-3 text-xs sm:text-sm border border-white/25 backdrop-blur-md transition-all cursor-pointer active:scale-[0.98]"
            >
              <ArrowLeft size={16} />
              <span>Quay lại</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main Full-Width Content Container ─────────────────────────────── */}
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Teaching Outcome Banner (if present) */}
        {session.teachingOutcome && (
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-white to-sky-50/70 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs shrink-0">
                <BookOpen size={20} />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Mục tiêu buổi học:</span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-extrabold text-xs">
                    {
                      ({
                        COMPLETE: '✓ Đã hoàn thành trọn vẹn mục tiêu bài',
                        CONTINUE: '⏳ Cần tiếp tục ở buổi sau',
                        REVIEW: '🔄 Buổi ôn tập củng cố kiến thức'
                      } as any)[session.teachingOutcome.coverage] || 'Đã tổ chức đủ bài'
                    }
                  </span>
                </h3>
                {session.teachingOutcome.reflection && (
                  <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                    {session.teachingOutcome.reflection}
                  </p>
                )}
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto">
              Đã đồng bộ hồ sơ quan sát của lớp
            </span>
          </div>
        )}

        {/* ── 4 Top KPI Metric Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">Học sinh tham gia</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">
                {participationCount} / {scores.length} bé
              </p>
              <p className="text-xs text-blue-800 font-semibold mt-0.5">
                {scores.length > 0 ? Math.round((participationCount / scores.length) * 100) : 100}% sĩ số lớp
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users size={22} />
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Tỷ lệ trả lời đúng</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                {answeredCount ? `${s?.averageAccuracy || 0}%` : '100%'}
              </p>
              <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                {answeredCount ? `${answeredCount} lượt tương tác` : 'Phản xạ tích cực'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Target size={22} />
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Tổng sao thưởng</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                {s?.totalStars || 0} ⭐
              </p>
              <p className="text-xs text-amber-800 font-semibold mt-0.5">Tích lũy toàn lớp</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
              <Star size={24} className="fill-slate-950" />
            </div>
          </div>

          <div className="rounded-3xl border border-purple-200 bg-gradient-to-br from-purple-50/90 via-white to-pink-50/40 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">Thời lượng buổi dạy</p>
              <p className="text-2xl sm:text-3xl font-black text-purple-950 mt-1">
                {duration} phút
              </p>
              <p className="text-xs text-purple-800 font-semibold mt-0.5">
                {session.plannedDuration ? `Kế hoạch: ${session.plannedDuration} phút` : 'Đúng thời lượng'}
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock size={22} />
            </div>
          </div>
        </div>

        {/* ── Main Grid: Leaderboard (Left, Wide) & Highlights/Info (Right) ─ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* ── Left 8-Cols on XL: Student Leaderboard (Fits screen with NO scrollbar) ── */}
          <div className="xl:col-span-8 rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  <span>Bảng Xếp Hạng Sao &amp; Chuyên Cần ({scores.length} học sinh)</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Thứ hạng sao và điểm số tương tác của các bé trong buổi học
                </p>
              </div>

              {/* Attendance Summary Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-xl bg-emerald-50 border border-emerald-300 px-3 py-1 font-bold text-emerald-800 flex items-center gap-1">
                  <Check size={13} className="text-emerald-600 stroke-[3]" />
                  <span>{presentCount} có mặt</span>
                </span>
                {absentCount > 0 && (
                  <span className="rounded-xl bg-rose-50 border border-rose-300 px-3 py-1 font-bold text-rose-800 flex items-center gap-1">
                    <X size={13} className="text-rose-600 stroke-[3]" />
                    <span>{absentCount} vắng</span>
                  </span>
                )}
                {excusedCount > 0 && (
                  <span className="rounded-xl bg-amber-50 border border-amber-300 px-3 py-1 font-bold text-amber-800 flex items-center gap-1">
                    <Mail size={13} className="text-amber-600" />
                    <span>{excusedCount} có phép</span>
                  </span>
                )}
                {lateCount > 0 && (
                  <span className="rounded-xl bg-orange-50 border border-orange-300 px-3 py-1 font-bold text-orange-800 flex items-center gap-1">
                    <Clock size={13} className="text-orange-600" />
                    <span>{lateCount} muộn</span>
                  </span>
                )}
              </div>
            </div>

            {/* Table: Fully responsive and fitted to width, no horizontal scroll needed */}
            <div className="w-full overflow-hidden">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 text-center rounded-l-xl w-14">Hạng</th>
                    <th className="py-3 px-3">Học sinh</th>
                    <th className="py-3 px-3">Chuyên cần</th>
                    <th className="py-3 px-3 text-center">Đúng / Sai</th>
                    <th className="py-3 px-3 text-center">Chính xác</th>
                    <th className="py-3 px-3 text-center">Sao thưởng</th>
                    <th className="py-3 px-3 rounded-r-xl text-center">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {scores.map((sc, i) => {
                    const stu = sc.student as User;
                    const name = stu?.name || 'Học sinh';
                    const ans = sc.correctCount + sc.incorrectCount;
                    const acc = ans > 0 ? Math.round((sc.correctCount / ans) * 100) : 0;
                    const isAbsent = ['ABSENT', 'EXCUSED'].includes(sc.attendance || '');
                    const rank =
                      sc.stars > 0 && !isAbsent
                        ? 1 + scores.filter((row) => !['ABSENT', 'EXCUSED'].includes(row.attendance || '') && row.stars > sc.stars).length
                        : null;

                    return (
                      <tr
                        key={i}
                        className={`transition-colors ${
                          isAbsent ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3.5 px-3 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 font-black text-xs shadow-xs">
                              🥇
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-tr from-slate-200 to-slate-300 text-slate-800 font-black text-xs shadow-xs">
                              🥈
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-tr from-amber-600 to-amber-700 text-white font-black text-xs shadow-xs">
                              🥉
                            </span>
                          ) : rank ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                              #{rank}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">—</span>
                          )}
                        </td>

                        {/* Student Name & Avatar */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <StudentAvatar student={stu} size="sm" />
                            <span className="font-extrabold text-slate-900 truncate">
                              {name}
                            </span>
                          </div>
                        </td>

                        {/* Attendance Chip */}
                        <td className="py-3.5 px-3">
                          <AttendanceBadge attendance={(sc as any).attendance || 'PRESENT'} />
                        </td>

                        {/* Correct / Incorrect Counters */}
                        <td className="py-3.5 px-3 text-center">
                          {isAbsent ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 font-bold">
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                ✓ {sc.correctCount}
                              </span>
                              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                ✕ {sc.incorrectCount}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Accuracy Percentage */}
                        <td className="py-3.5 px-3 text-center">
                          {isAbsent || ans === 0 ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span
                              className={`font-black px-2.5 py-0.5 rounded-lg border text-xs ${
                                acc >= 80
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : acc >= 50
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {acc}%
                            </span>
                          )}
                        </td>

                        {/* Stars Pill Badge */}
                        <td className="py-3.5 px-3 text-center">
                          {isAbsent ? (
                            <span className="text-slate-400">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-black px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs text-xs">
                              ⭐ {sc.stars} sao
                            </span>
                          )}
                        </td>

                        {/* Status / Assessment Badge */}
                        <td className="py-3.5 px-3 text-center">
                          {isAbsent ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                              Vắng mặt
                            </span>
                          ) : ans === 0 ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              Chưa ghi nhận
                            </span>
                          ) : (
                            <StatusBadge status={sc.status} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right 4-Cols on XL: Highlights & Detailed Info ─────────────────── */}
          <div className="xl:col-span-4 space-y-4">
            {/* Top Performers Card */}
            {topPerformers.length > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-yellow-50/40 border border-amber-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-amber-100">
                  <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                    <Trophy size={18} className="text-amber-500" />
                    <span>Bé Nổi Bật Buổi Học</span>
                  </h3>
                  <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                    Top xuất sắc
                  </span>
                </div>
                <div className="space-y-2.5">
                  {topPerformers.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white border border-amber-200/70 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">🌟</span>
                          <span className="font-extrabold text-sm text-slate-900">{name}</span>
                        </div>
                        <span className="text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          3 ⭐ Xuất sắc
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Needs Practice Card */}
            {needsPractice.length > 0 && (
              <div className="rounded-3xl bg-gradient-to-br from-amber-50/90 via-white to-orange-50/50 border border-amber-300 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-amber-200">
                  <h3 className="font-black text-amber-950 flex items-center gap-2 text-sm sm:text-base">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <span>Bé Cần Ôn Luyện Thêm</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                    Cần hỗ trợ
                  </span>
                </div>
                <div className="space-y-2">
                  {needsPractice.map((t, i) => {
                    const name = typeof t === 'string' ? t : t.name;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/80 border border-amber-200 text-xs font-bold text-slate-800"
                      >
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <span>{name}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-amber-900 font-semibold bg-amber-100/60 p-2.5 rounded-xl border border-amber-200/60 leading-relaxed">
                  💡 Gợi ý: Giáo viên có thể giao thêm 1 hoạt động ôn bài nhẹ nhàng về nhà để bé củng cố từ vựng.
                </p>
              </div>
            )}

            {/* Session Metadata Card (Vibrant Colored Badges & Rows) */}
            <div className="rounded-3xl bg-white border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm sm:text-base pb-2 border-b border-slate-100">
                <BookOpen size={18} className="text-teal-600" />
                <span>Thông Tin Buổi Dạy</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <School size={15} className="text-indigo-600" />
                    <span>Lớp học</span>
                  </span>
                  <span className="font-black text-indigo-950 px-2.5 py-1 rounded-xl bg-white border border-indigo-200">
                    {(session.classroom as any)?.name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/70 border border-amber-100">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <BookOpen size={15} className="text-amber-600" />
                    <span>Bài giảng</span>
                  </span>
                  <span className="font-black text-amber-950 px-2.5 py-1 rounded-xl bg-white border border-amber-200 max-w-[55%] truncate text-right">
                    {(session.lesson as any)?.title || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-purple-50/70 border border-purple-100">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-purple-600" />
                    <span>Hoạt động theo bài</span>
                  </span>
                  <span className="font-black text-purple-950 px-2.5 py-1 rounded-xl bg-white border border-purple-200">
                    {session.activities?.length || 0} hoạt động
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-teal-50/70 border border-teal-100">
                  <span className="font-bold text-teal-900 flex items-center gap-1.5">
                    <Clock size={15} className="text-teal-600" />
                    <span>Bắt đầu</span>
                  </span>
                  <span className="font-bold text-teal-950 px-2.5 py-1 rounded-xl bg-white border border-teal-200">
                    {fmt(session.startedAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-sky-50/70 border border-sky-100">
                  <span className="font-bold text-sky-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} className="text-sky-600" />
                    <span>Kết thúc</span>
                  </span>
                  <span className="font-bold text-sky-950 px-2.5 py-1 rounded-xl bg-white border border-sky-200">
                    {fmt(session.endedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
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

// ── Sub-components for Colorful, Beautiful Badges ──────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { cls: string; label: string }> = {
    COMPLETED: {
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      label: '✓ Hoàn thành tốt'
    },
    ACTIVE: {
      cls: 'bg-sky-100 text-sky-800 border-sky-300',
      label: '● Đang tiến bộ'
    },
    NEEDS_PRACTICE: {
      cls: 'bg-amber-100 text-amber-800 border-amber-300',
      label: '⚠ Cần ôn thêm'
    }
  };
  const item = cfg[status] || {
    cls: 'bg-slate-100 text-slate-700 border-slate-300',
    label: status
  };
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${item.cls}`}
    >
      {item.label}
    </span>
  );
};

const AttendanceBadge = ({ attendance }: { attendance?: string }) => {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PRESENT: {
      label: 'Có mặt',
      cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <Check size={12} className="text-emerald-600 stroke-[3]" />
    },
    ABSENT: {
      label: 'Vắng mặt',
      cls: 'bg-rose-50 text-rose-800 border-rose-300',
      icon: <X size={12} className="text-rose-600 stroke-[3]" />
    },
    EXCUSED: {
      label: 'Có phép',
      cls: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: <Mail size={12} className="text-amber-600" />
    },
    LATE: {
      label: 'Đi muộn',
      cls: 'bg-orange-50 text-orange-800 border-orange-300',
      icon: <Clock size={12} className="text-orange-600" />
    }
  };
  const item = map[attendance || 'PRESENT'] || map.PRESENT;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-2xs ${item.cls}`}
    >
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};

export default SessionSummaryPage;
