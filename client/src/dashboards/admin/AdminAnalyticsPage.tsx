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
    <div className="space-y-8 animate-fade-in">
      {error && <p role="alert" className="admin-page-error">{error} Bấm “Làm mới số liệu” để thử lại.</p>}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-800 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <BarChart3 size={14} />
            <span>Thống Kê & Phân Tích</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-inherit font-display tracking-tight">
            Báo cáo học tập toàn trường
          </h1>
          <p className="text-sm text-slate-600">
            Theo dõi tổng quan số sao tích lũy, hiệu quả học tập trên lớp & tại nhà toàn hệ thống.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-100 text-slate-700 font-bold text-xs sm:text-sm border border-slate-200 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* Star Economy KPIs */}
      <div aria-busy={!!error} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 flex items-center justify-center font-black">
              <Star size={20} className="fill-amber-400 text-amber-800" />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Tổng sao toàn trường</span>
          </div>
          <div className="text-3xl font-black text-amber-800">
            {analytics?.totalAllStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-1">
            Bao gồm sao học ở nhà & thưởng trên lớp
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-800 flex items-center justify-center">
              <School size={20} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Sao thưởng trên lớp</span>
          </div>
          <div className="text-3xl font-black text-teal-800">
            {analytics?.totalClassStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-1">
            Từ {analytics?.totalSessionsConducted ?? 0} buổi dạy đã diễn ra
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-800 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Sao tự học ở nhà</span>
          </div>
          <div className="text-3xl font-black text-purple-800">
            {analytics?.totalHomeStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-1">
            Qua trò chơi tương tác & mở rương Unit
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-800 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-xs font-bold text-slate-600 uppercase">Sĩ số học tập</span>
          </div>
          <div className="text-3xl font-black text-indigo-800">
            {analytics?.totalStudents ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-600 mt-1">
            Phân bổ trong {analytics?.totalClassrooms ?? 0} lớp học
          </p>
        </div>
      </div>

      {/* Two Column Layout: Top Students & Classroom Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Students Leaderboard */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-inherit text-base flex items-center gap-2">
              <Award className="text-amber-800" size={18} />
              <span>Top 5 Học Sinh Xuất Sắc</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Toàn trường
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {analytics?.topStudents && analytics.topStudents.length > 0 ? (
              analytics.topStudents.map((st: any, idx: number) => (
                <div
                  key={st._id}
                  className="p-3.5 rounded-2xl border border-slate-200 bg-white flex items-center justify-between hover:border-slate-200 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-slate-600 w-5">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">
                      {st.avatar === 'lion' ? '🦁' : st.avatar === 'panda' ? '🐼' : st.avatar === 'rabbit' ? '🐰' : '🦁'}
                    </span>
                    <div>
                      <p className="font-bold text-inherit text-xs">{st.name}</p>
                      <p className="text-[10px] text-slate-600 font-medium">{st.className}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 font-black text-amber-800 text-xs">
                      <span>{st.totalStars}</span>
                      <Star size={13} className="fill-amber-400 text-amber-800" />
                    </div>
                    <span className="block text-[10px] text-slate-600 font-medium whitespace-nowrap">
                      Lớp: <span className="text-teal-800 font-bold">{st.classStars ?? 0}</span> • Nhà: <span className="text-purple-800 font-bold">{st.homeStars ?? 0}</span>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-600 text-xs font-bold">
                Chưa có dữ liệu xếp hạng học sinh.
              </div>
            )}
          </div>
        </div>

        {/* Classroom Performance Metrics Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-inherit text-base flex items-center gap-2">
              <TrendingUp className="text-teal-800" size={18} />
              <span>Hiệu Quả & Tiến Độ Từng Lớp Học</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-600">
              {analytics?.classroomStats?.length || 0} Lớp đang theo dõi
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white border-b border-slate-200 text-slate-600 uppercase font-black">
                <tr>
                  <th className="py-3 px-3.5">Lớp học</th>
                  <th className="py-3 px-3.5">Giáo viên</th>
                  <th className="py-3 px-3.5 text-center">Sĩ số</th>
                  <th className="py-3 px-3.5 text-center">Buổi dạy</th>
                  <th className="py-3 px-3.5 text-center">Tổng sao lớp</th>
                  <th className="py-3 px-3.5 text-right">TB/Bé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                {analytics?.classroomStats && analytics.classroomStats.length > 0 ? (
                  analytics.classroomStats.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-100 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-inherit">
                        {c.name}
                        <span className="text-[10px] text-slate-600 block font-normal">
                          Khối {c.ageGroupCode} tuổi
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700">
                        Cô {c.teacherName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold">
                        {c.studentCount} bé
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-teal-800">
                        {c.sessionCount} buổi
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-black text-amber-800 text-sm">{c.totalStars} ⭐</span>
                        <span className="block text-[10px] text-slate-600 font-normal">
                          Lớp: <span className="text-teal-800 font-semibold">{c.classSessionStars ?? c.classStars ?? 0}</span> • Nhà: <span className="text-purple-800 font-semibold">{c.homeStars ?? 0}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-indigo-800 text-sm">
                        {c.avgStarsPerStudent} ⭐
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-600 font-bold">
                      Chưa có lớp học nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
