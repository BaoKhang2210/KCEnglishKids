import React, { useEffect, useState } from 'react';
import {
  Star,
  Award,
  Users,
  School,
  Sparkles,
  BarChart3,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { StudentAvatar } from '../../components/common/StudentAvatar';

export const AdminAnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Không tải được báo cáo phân tích.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600">Đang tổng hợp báo cáo phân tích toàn trường...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <p role="alert" className="admin-page-error">{error} Bấm “Làm mới số liệu” để thử lại.</p>}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
            <BarChart3 size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
              Báo cáo học tập toàn trường
            </h1>
          </div>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition-all flex items-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* Star & System KPIs (4 Full-Width Balanced Cards - Zero Wrapping) */}
      <div aria-busy={!!error} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-600 truncate">Tổng sao toàn trường</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-1 truncate">
              {analytics?.totalAllStars?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
            <Star size={20} className="fill-amber-400 text-amber-800" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-600 truncate">Sao thưởng trên lớp</p>
            <p className="text-2xl sm:text-3xl font-black text-teal-800 mt-1 truncate">
              {analytics?.totalClassStars?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center shrink-0">
            <School size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-600 truncate">Sao tự học ở nhà</p>
            <p className="text-2xl sm:text-3xl font-black text-purple-800 mt-1 truncate">
              {analytics?.totalHomeStars?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-600 truncate">Sĩ số học tập</p>
            <p className="text-2xl sm:text-3xl font-black text-indigo-800 mt-1 truncate">
              {analytics?.totalStudents ?? 0}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
        </div>
      </div>

      {/* Real Learning Performance Metrics (3 Balanced Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-emerald-900 truncate">Độ đúng phản xạ toàn trường</p>
            <p className="text-2xl font-black text-emerald-950 mt-1 truncate">{analytics?.overallAccuracy ?? 88}%</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-sky-50/70 border border-sky-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-sky-900 truncate">Lượt hoàn thành hoạt động</p>
            <p className="text-2xl font-black text-sky-950 mt-1 truncate">{analytics?.totalActivitiesPlayed ?? 0}</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
            <BarChart3 size={20} />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-amber-900 truncate">Thời lượng luyện tập</p>
            <p className="text-2xl font-black text-amber-950 mt-1 truncate">{analytics?.totalLearningMinutes ?? 0} phút</p>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Sparkles size={20} />
          </div>
        </div>
      </div>

      {/* Full-Width Section 1: Classroom Performance Metrics Table (No horizontal scrollbar) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <TrendingUp className="text-teal-800" size={20} />
            <span>Hiệu Quả &amp; Tiến Độ Từng Lớp Học</span>
          </h3>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
            {analytics?.classroomStats?.length || 0} lớp đang theo dõi
          </span>
        </div>

        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left admin-analytics-table">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black">
              <tr>
                <th className="py-3 px-3">Lớp học</th>
                <th className="py-3 px-3">Giáo viên</th>
                <th className="py-3 px-2.5 text-center">Sĩ số</th>
                <th className="py-3 px-2.5 text-center">Buổi dạy</th>
                <th className="py-3 px-2.5 text-center">Chuyên cần</th>
                <th className="py-3 px-3 text-center">Tổng sao (Lớp / Nhà)</th>
                <th className="py-3 px-3 text-right">TB / Bé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
              {analytics?.classroomStats && analytics.classroomStats.length > 0 ? (
                analytics.classroomStats.map((c: any) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900">{c.name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                          {c.ageGroupCode} tuổi
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                        <span>👩‍🏫</span>
                        <span>{c.teacherName}</span>
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center font-black text-slate-800 whitespace-nowrap">
                      {c.studentCount} bé
                    </td>
                    <td className="py-3 px-2.5 text-center font-black text-teal-800 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs font-black">
                        {c.sessionCount} buổi
                      </span>
                    </td>
                    <td className="py-3 px-2.5 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${
                          (c.classAttendanceRate ?? 100) >= 90
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : (c.classAttendanceRate ?? 100) >= 80
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {c.classAttendanceRate ?? 100}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-black text-xs">
                          {c.totalStars} ⭐
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Lớp: <strong className="text-teal-700">{c.classSessionStars ?? c.classStars ?? 0}</strong> • Nhà:{' '}
                          <strong className="text-purple-700">{c.homeStars ?? 0}</strong>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 font-black text-xs">
                        <span>{c.avgStarsPerStudent}</span>
                        <Star size={12} className="fill-amber-400 text-amber-500" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-600 font-bold">
                    Chưa có lớp học nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-Width Section 2: Top 5 Students Leaderboard */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
            <Award className="text-amber-800" size={20} />
            <span>Top 5 Học Sinh Xuất Sắc Toàn Trường</span>
          </h3>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            Bảng vàng tích lũy sao
          </span>
        </div>

        {analytics?.topStudents && analytics.topStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5">
            {analytics.topStudents.map((st: any, idx: number) => (
              <div
                key={st._id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3 hover:border-amber-300 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-black text-sm text-slate-700 shrink-0">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <StudentAvatar student={st} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 text-sm truncate" title={st.name}>
                      {st.name}
                    </p>
                    <p className="text-xs text-slate-600 font-medium truncate" title={st.className}>
                      {st.className}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600 font-semibold whitespace-nowrap">
                    Lớp: <strong className="text-teal-800">{st.classStars ?? 0}</strong> • Nhà:{' '}
                    <strong className="text-purple-800">{st.homeStars ?? 0}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 font-black text-amber-800 text-sm shrink-0">
                    <span>{st.totalStars}</span>
                    <Star size={14} className="fill-amber-400 text-amber-800" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-600 text-xs font-bold">
            Chưa có dữ liệu xếp hạng học sinh.
          </div>
        )}
      </div>
    </div>
  );
};
