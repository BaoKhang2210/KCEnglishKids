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
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAnalytics();
      if (res.success) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-400">Đang tổng hợp báo cáo phân tích toàn trường...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            <BarChart3 size={14} />
            <span>Thống Kê & Phân Tích</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Báo Cáo Hoạt Động & Kinh Tế Sao
          </h1>
          <p className="text-sm text-slate-400">
            Theo dõi tổng quan số sao tích lũy, hiệu quả học tập trên lớp & tại nhà toàn hệ thống.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 transition-all flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw size={15} />
          <span>Làm mới số liệu</span>
        </button>
      </div>

      {/* Star Economy KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <Star size={20} className="fill-amber-400 text-amber-400" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng sao toàn trường</span>
          </div>
          <div className="text-3xl font-black text-amber-400">
            {analytics?.totalAllStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Bao gồm sao học ở nhà & thưởng trên lớp
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <School size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sao thưởng trên lớp</span>
          </div>
          <div className="text-3xl font-black text-teal-400">
            {analytics?.totalClassStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Từ {analytics?.totalSessionsConducted ?? 0} buổi dạy đã diễn ra
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sao tự học ở nhà</span>
          </div>
          <div className="text-3xl font-black text-purple-400">
            {analytics?.totalHomeStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Qua trò chơi tương tác & mở rương Unit
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Users size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sĩ số học tập</span>
          </div>
          <div className="text-3xl font-black text-indigo-400">
            {analytics?.totalStudents ?? 0}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Phân bổ trong {analytics?.totalClassrooms ?? 0} lớp học
          </p>
        </div>
      </div>

      {/* Two Column Layout: Top Students & Classroom Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Students Leaderboard */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <Award className="text-amber-400" size={18} />
              <span>Top 5 Học Sinh Xuất Sắc</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Toàn trường
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {analytics?.topStudents && analytics.topStudents.length > 0 ? (
              analytics.topStudents.map((st: any, idx: number) => (
                <div
                  key={st._id}
                  className="p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 flex items-center justify-between hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-slate-500 w-5">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">
                      {st.avatar === 'lion' ? '🦁' : st.avatar === 'panda' ? '🐼' : st.avatar === 'rabbit' ? '🐰' : '🦁'}
                    </span>
                    <div>
                      <p className="font-bold text-white text-xs">{st.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{st.className}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 font-black text-amber-400 text-xs">
                      <span>{st.totalStars}</span>
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                    </div>
                    <span className="block text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      Lớp: <span className="text-teal-400 font-bold">{st.classStars ?? 0}</span> • Nhà: <span className="text-purple-400 font-bold">{st.homeStars ?? 0}</span>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs font-bold">
                Chưa có dữ liệu xếp hạng học sinh.
              </div>
            )}
          </div>
        </div>

        {/* Classroom Performance Metrics Table */}
        <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <TrendingUp className="text-teal-400" size={18} />
              <span>Hiệu Quả & Tiến Độ Từng Lớp Học</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {analytics?.classroomStats?.length || 0} Lớp đang theo dõi
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3 px-3.5">Lớp học</th>
                  <th className="py-3 px-3.5">Giáo viên</th>
                  <th className="py-3 px-3.5 text-center">Sĩ số</th>
                  <th className="py-3 px-3.5 text-center">Buổi dạy</th>
                  <th className="py-3 px-3.5 text-center">Tổng sao lớp</th>
                  <th className="py-3 px-3.5 text-right">TB/Bé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-300">
                {analytics?.classroomStats && analytics.classroomStats.length > 0 ? (
                  analytics.classroomStats.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white">
                        {c.name}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          Khối {c.ageGroupCode} tuổi
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-300">
                        Cô {c.teacherName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold">
                        {c.studentCount} bé
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-teal-400">
                        {c.sessionCount} buổi
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-black text-amber-400 text-sm">{c.totalStars} ⭐</span>
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Lớp: <span className="text-teal-400 font-semibold">{c.classSessionStars ?? c.classStars ?? 0}</span> • Nhà: <span className="text-purple-400 font-semibold">{c.homeStars ?? 0}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-indigo-400 text-sm">
                        {c.avgStarsPerStudent} ⭐
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500 font-bold">
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
