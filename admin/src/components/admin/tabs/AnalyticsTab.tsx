import React, { useEffect, useState } from 'react';
import {
  Star,
  Award,
  Users,
  School,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { adminApi } from '../../../services/api';

export const AnalyticsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAdminAnalytics();
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
      <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tổng hợp báo cáo phân tích toàn trường…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Star Economy Overview */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
              ⭐
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng sao toàn trường</span>
          </div>
          <div className="text-3xl font-black text-amber-500">
            {analytics?.totalAllStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Bao gồm sao học ở nhà & thưởng trên lớp
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sao thưởng trên lớp</span>
          </div>
          <div className="text-3xl font-black text-teal-700">
            {analytics?.totalClassStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Từ {analytics?.totalSessionsConducted ?? 0} buổi dạy giáo viên đã dạy
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sao tự học ở nhà</span>
          </div>
          <div className="text-3xl font-black text-purple-700">
            {analytics?.totalHomeStars?.toLocaleString() ?? 0}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Qua 18 game tương tác & mở rương Unit
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase">Sĩ số học tập</span>
          </div>
          <div className="text-3xl font-black text-indigo-700">
            {analytics?.totalStudents ?? 0}
          </div>
          <p className="text-[11px] font-bold text-slate-500 mt-1">
            Phân bổ trong {analytics?.totalClassrooms ?? 0} lớp học
          </p>
        </div>
      </section>

      {/* Two Column Layout: Top Students & Classroom Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 Students Leaderboard */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <span>Top 5 Học Sinh Xuất Sắc</span>
            </h3>
            <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
              Toàn trường
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {analytics?.topStudents && analytics.topStudents.length > 0 ? (
              analytics.topStudents.map((st: any, idx: number) => (
                <div
                  key={st._id}
                  className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-black text-xs text-slate-400 w-4">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                    </span>
                    <span className="text-2xl">
                      {st.avatar === 'lion' ? '🦁' : st.avatar === 'panda' ? '🐼' : st.avatar === 'rabbit' ? '🐰' : '🦁'}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{st.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{st.className}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 font-black text-amber-500 text-xs">
                    <span>{st.totalStars}</span>
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-bold">
                Chưa có dữ liệu xếp hạng học sinh.
              </div>
            )}
          </div>
        </div>

        {/* Classroom Performance Metrics Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-600" />
              <span>Hiệu Quả & Tiến Độ Từng Lớp Học</span>
            </h3>
            <span className="text-[11px] font-bold text-slate-400">
              {analytics?.classroomStats?.length || 0} Lớp đang theo dõi
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3 px-3.5">Lớp học</th>
                  <th className="py-3 px-3.5">Giáo viên</th>
                  <th className="py-3 px-3.5 text-center">Sĩ số</th>
                  <th className="py-3 px-3.5 text-center">Buổi dạy</th>
                  <th className="py-3 px-3.5 text-center">Tổng sao lớp</th>
                  <th className="py-3 px-3.5 text-right">TB/Bé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {analytics?.classroomStats && analytics.classroomStats.length > 0 ? (
                  analytics.classroomStats.map((c: any) => (
                    <tr key={c._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        {c.name}
                        <span className="text-[10px] text-slate-400 block font-normal">
                          Khối {c.ageGroupCode} tuổi
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-600">
                        Cô {c.teacherName}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold">
                        {c.studentCount} bé
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-teal-700">
                        {c.sessionCount} buổi
                      </td>
                      <td className="py-3 px-3.5 text-center font-black text-amber-500">
                        {c.totalStars} ⭐
                      </td>
                      <td className="py-3 px-3.5 text-right font-black text-indigo-600">
                        {c.avgStarsPerStudent} ⭐
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
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
