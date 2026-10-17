import React from 'react';
import {
  Users,
  BookOpen,
  Layers,
  Sparkles,
  Award,
  TrendingUp,
  Clock,
  ArrowRight
} from 'lucide-react';

interface OverviewTabProps {
  stats: any;
  curriculum: any[];
  onNavigateTab: (tab: 'users' | 'classrooms' | 'curriculum' | 'analytics') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  curriculum,
  onNavigateTab
}) => {
  const metrics = stats?.metrics;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => onNavigateTab('users')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
              Xem <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {metrics?.totalChildren ?? 0}
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">Trẻ em đang theo học</p>
          <div className="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{metrics?.totalTeachers ?? 0} giáo viên phụ trách</span>
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
              Xem <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {metrics?.totalCurriculumUnits ?? 27}
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">Curriculum Units (3 Sách)</p>
          <div className="text-[11px] font-semibold text-indigo-600 mt-2">
            {metrics?.activeLessons ?? 0} bài học tương tác
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('curriculum')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
              Xem <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 tracking-tight">
            {metrics?.totalActivities ?? 0}
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">Hoạt động & Trò chơi</p>
          <div className="text-[11px] font-semibold text-purple-600 mt-2">
            {metrics?.totalVocabulary ?? 0} từ vựng chuẩn Cambridge
          </div>
        </div>

        <div 
          onClick={() => onNavigateTab('analytics')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600 flex items-center gap-1 transition-colors">
              Báo cáo <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight">
            {metrics?.completionRate ?? 0}%
          </div>
          <p className="text-xs font-bold text-slate-500 mt-1">Tỷ lệ hoàn thành buổi học</p>
          <div className="text-[11px] font-semibold text-emerald-700 mt-2">
            {metrics?.completedSessions ?? 0} / {metrics?.totalSessions ?? 0} buổi hoàn thành
          </div>
        </div>
      </section>

      {/* Curriculum Books Overview Bar */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Khung Chương Trình Chuẩn (Curriculum Books)</span>
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Phân phối 3 đầu sách tương ứng từng độ tuổi mầm non (3-4, 4-5, 5-6 tuổi)
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('curriculum')}
            className="text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
          >
            Chi tiết giáo trình ➔
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {curriculum && curriculum.length > 0 ? (
            curriculum.map((book: any) => (
              <div
                key={book._id || book.bookNumber}
                className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase ${
                    book.bookNumber === 1
                      ? 'bg-amber-100 text-amber-800'
                      : book.bookNumber === 2
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}>
                    Book {book.bookNumber}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {book.units?.length || 9} Units
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-base mb-1">
                  {book.title || `Giáo trình Book ${book.bookNumber}`}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-3">
                  {book.bookNumber === 1 ? 'Khối Mầm (3–4 tuổi)' : book.bookNumber === 2 ? 'Khối Chồi (4–5 tuổi)' : 'Khối Lá (5–6 tuổi)'}
                </p>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      book.bookNumber === 1 ? 'bg-amber-500' : book.bookNumber === 2 ? 'bg-emerald-500' : 'bg-sky-500'
                    }`} 
                    style={{ width: `${Math.min(100, (book.units?.length || 9) * 11.1)}%` }} 
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-slate-400 font-semibold">
              Đang tải dữ liệu giáo trình chuẩn…
            </div>
          )}
        </div>
      </section>

      {/* Recent Student Learning Results */}
      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Kết Quả Học Tập Gần Nhất Ghi Nhận Từ MongoDB</span>
          </h2>
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Cập nhật thời gian thực
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
              <tr>
                <th className="py-3 px-4">Bé học</th>
                <th className="py-3 px-4">Bài học</th>
                <th className="py-3 px-4">Hoạt động</th>
                <th className="py-3 px-4 text-center">Điểm số</th>
                <th className="py-3 px-4 text-center">Sao nhận</th>
                <th className="py-3 px-4 text-right">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {stats?.recentResults && stats.recentResults.length > 0 ? (
                stats.recentResults.map((res: any) => (
                  <tr key={res._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-2 font-bold text-slate-900">
                      <span className="text-xl">🦁</span>
                      <span>{res.child?.name || 'Học sinh'}</span>
                    </td>
                    <td className="py-3 px-4">{res.lesson?.title || 'Bài học'}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{res.activity?.title || 'Trò chơi tương tác'}</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600">
                      {res.score ?? 0}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex gap-0.5 text-amber-400">
                        {Array.from({ length: Math.min(5, res.stars || 0) }).map((_, i) => (
                          <span key={i}>⭐</span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {res.createdAt ? new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-bold">
                    Chưa có kết quả học tập nào được ghi nhận hôm nay.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
