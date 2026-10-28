import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  School,
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Activity,
  Layers,
  Award,
  CalendarDays
} from 'lucide-react';
import { adminApi } from '../../services/api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải số liệu thống kê.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-600">Đang tải dữ liệu tổng quan...</p>
        </div>
      </div>
    );
  }

  const metrics = stats?.metrics || stats || {};

  const kpis = [
    {
      label: 'Học sinh đang học',
      value: metrics.totalChildren || 0,
      icon: Users,
      bgColor: 'bg-blue-50 dark:bg-blue-50',
      iconColor: 'text-blue-800 dark:text-blue-800',
      borderColor: 'border-blue-100 dark:border-blue-900/50',
      sub: 'Tài khoản trẻ em kích hoạt'
    },
    {
      label: 'Giáo viên phụ trách',
      value: metrics.totalTeachers || 0,
      icon: Award,
      bgColor: 'bg-emerald-50 dark:bg-emerald-50',
      iconColor: 'text-emerald-800 dark:text-emerald-800',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
      sub: 'Giảng viên đứng lớp'
    },
    {
      label: 'Units Giáo trình',
      value: metrics.totalCurriculumUnits ?? 0,
      icon: BookOpen,
      bgColor: 'bg-amber-50 dark:bg-amber-50',
      iconColor: 'text-amber-800 dark:text-amber-800',
      borderColor: 'border-amber-100 dark:border-amber-900/50',
      sub: '3 Bộ sách (3-4, 4-5, 5-6 tuổi)'
    },
    {
      label: 'Bài học & Hoạt động',
      value: `${metrics.activeLessons || 0} / ${metrics.totalActivities || 0}`,
      icon: Layers,
      bgColor: 'bg-purple-50 dark:bg-purple-50',
      iconColor: 'text-purple-800 dark:text-purple-800',
      borderColor: 'border-purple-100 dark:border-purple-900/50',
      sub: 'Bài học & trò chơi tương tác'
    },
    {
      label: 'Từ vựng chuẩn hóa',
      value: metrics.totalVocabulary || 0,
      icon: MessageSquare,
      bgColor: 'bg-sky-50 dark:bg-sky-50',
      iconColor: 'text-sky-800 dark:text-sky-800',
      borderColor: 'border-sky-100 dark:border-sky-900/50',
      sub: 'Phát âm & minh họa trực quan'
    },
    {
      label: 'Phiên học đã hoàn thành',
      value: metrics.completedSessions || 0,
      icon: CheckCircle2,
      bgColor: 'bg-rose-50 dark:bg-rose-50',
      iconColor: 'text-rose-800 dark:text-rose-800',
      borderColor: 'border-rose-100 dark:border-rose-900/50',
      sub: `Tổng số: ${metrics.totalSessions || 0} phiên`
    }
  ];

  const quickActions = [
    {
      title: 'Lớp học & Trẻ em',
      desc: 'Gán giáo viên chủ nhiệm, thêm xóa học sinh theo lớp, nhập xuất danh sách Excel.',
      to: '/admin/classrooms',
      icon: School,
      color: 'indigo',
      badgeBg: 'bg-indigo-50 text-indigo-800 dark:bg-indigo-50 dark:text-indigo-800',
      hoverBorder: 'hover:border-indigo-400 dark:hover:border-indigo-500',
      accentColor: 'text-indigo-800 dark:text-indigo-800'
    },
    {
      title: 'Thời Khóa Biểu',
      desc: 'Quản lý lịch dạy cố định hàng tuần cho từng lớp, phân ca sáng chiều cho giáo viên.',
      to: '/admin/schedule',
      icon: CalendarDays,
      color: 'sky',
      badgeBg: 'bg-sky-50 text-sky-800 dark:bg-sky-50 dark:text-sky-800',
      hoverBorder: 'hover:border-sky-400 dark:hover:border-sky-500',
      accentColor: 'text-sky-800 dark:text-sky-800'
    },
    {
      title: 'Giáo trình & Bài học',
      desc: 'Quản lý 3 Bộ sách, 27 Units, bài học, từ vựng chuẩn hóa và các câu hỏi lớn.',
      to: '/admin/curriculum',
      icon: BookOpen,
      color: 'amber',
      badgeBg: 'bg-amber-50 text-amber-800 dark:bg-amber-50 dark:text-amber-800',
      hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-500',
      accentColor: 'text-amber-800 dark:text-amber-800'
    },
    {
      title: 'Thư viện Mẫu câu',
      desc: 'Quản lý mẫu câu giao tiếp, cấu trúc hỏi đáp, rèn luyện kỹ năng Oracy theo độ tuổi.',
      to: '/admin/sentences',
      icon: MessageSquare,
      color: 'teal',
      badgeBg: 'bg-teal-50 text-teal-800 dark:bg-teal-50 dark:text-teal-800',
      hoverBorder: 'hover:border-teal-400 dark:hover:border-teal-500',
      accentColor: 'text-teal-800 dark:text-teal-800'
    },
    {
      title: 'Quản lý Tài khoản',
      desc: 'Cấp tài khoản giáo viên, trẻ em, cấp đổi mã PIN 4 số và phân quyền quản trị.',
      to: '/admin/users',
      icon: Users,
      color: 'purple',
      badgeBg: 'bg-purple-50 text-purple-800 dark:bg-purple-50 dark:text-purple-800',
      hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-500',
      accentColor: 'text-purple-800 dark:text-purple-800'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header Hero Banner (Executive Midnight Indigo & Sapphire Glow) ────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-slate-50 p-6 md:p-8 ">
        <img src="/images/scenes/learning-garden-v1.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 pointer-events-none" />
        {/* Decorative ambient glowing orbs & top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px from-transparent to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-800 border border-indigo-500/30 backdrop-blur-md">
              <Sparkles size={14} className="text-indigo-800 animate-pulse" />
              <span>Trung Tâm Điều Hành Toàn Hệ Thống</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-inherit flex flex-wrap items-center gap-2.5">
              <span>KCEnglishKids</span>
              <span className="  text-indigo-800">
                Admin Dashboard
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-700 max-w-2xl leading-relaxed font-normal">
              Quản lý Giáo trình, Thời khóa biểu, Thư viện Mẫu câu, Phân lớp &amp; Phân công Giáo viên tập trung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/admin/schedule"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-700 hover:bg-indigo-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white  border border-indigo-400/30  transition-all transform active:scale-95"
            >
              <CalendarDays size={16} />
              <span>Thời Khóa Biểu</span>
            </Link>
            <Link
              to="/admin/classrooms"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-100 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:text-inherit border border-slate-200 hover:border-slate-200 transition-all transform active:scale-95"
            >
              <School size={16} />
              <span>Lớp học &amp; Trẻ em</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 dark:bg-rose-50 dark:border-rose-900/60 p-4 text-rose-800 dark:text-rose-800 text-sm flex items-center gap-3">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Cards Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="rounded-3xl border border-slate-200 bg-white p-5 transition-all dark:border-slate-200 dark:bg-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-600">
                    {kpi.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-inherit mt-1.5 tracking-tight">
                    {kpi.value}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-600 mt-1 font-medium">
                    {kpi.sub}
                  </p>
                </div>
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center ${kpi.bgColor} ${kpi.iconColor}`}
                >
                  <Icon size={22} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Quick Action Navigation Cards (Sạch đẹp, sáng rõ, dễ nhìn) ───── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-inherit flex items-center gap-2">
            <span>Truy Cập Nhanh Các Phân Hệ</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {quickActions.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                to={item.to}
                className={`group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:-translate-y-1 dark:border-slate-200 dark:bg-white ${item.hoverBorder}`}
              >
                <div>
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${item.badgeBg}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-inherit mb-1 group-hover:text-indigo-800 dark:group-hover:text-indigo-800 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-600 line-clamp-3 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className={`mt-4 pt-3 border-t border-slate-100 dark:border-slate-200 flex items-center gap-1.5 text-xs font-bold ${item.accentColor}`}>
                  <span>Truy cập</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Recent Activity Results Table ─────────────────────────────────── */}
      {stats?.recentResults && stats.recentResults.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-200 dark:bg-white">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-inherit flex items-center gap-2">
                <Activity size={18} className="text-indigo-800 dark:text-indigo-800" />
                <span>Hoạt động học tập gần nhất của học sinh</span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-600 mt-0.5">
                Kết quả làm bài và hoàn thành trò chơi theo thời gian thực
              </p>
            </div>
            <Link
              to="/admin/audit-logs"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-800 hover:text-indigo-800 dark:text-indigo-800"
            >
              <span>Xem nhật ký hệ thống</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-bold dark:border-slate-200 dark:bg-slate-100 dark:text-slate-600">
                  <th className="py-3 px-4 rounded-l-xl">Học sinh</th>
                  <th className="py-3 px-4">Bài học</th>
                  <th className="py-3 px-4">Hoạt động</th>
                  <th className="py-3 px-4">Điểm số</th>
                  <th className="py-3 px-4 rounded-r-xl">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium dark:divide-slate-200">
                {stats.recentResults.map((result: any, i: number) => (
                  <tr key={result._id || i} className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-100">
                    <td className="py-3 px-4 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-100 shrink-0 border border-slate-200 dark:border-slate-200 flex items-center justify-center">
                        {result.child?.avatarUrl ? (
                          <img src={result.child.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-bold text-indigo-800 dark:text-indigo-800">
                            {result.child?.name?.[0] || 'C'}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-inherit">
                        {result.child?.name || 'Học sinh'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-700">
                      {result.lesson?.title || 'Bài học'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200/60 font-bold dark:bg-indigo-50 dark:text-indigo-800 dark:border-indigo-800/50">
                        {result.activity?.title || 'Hoạt động'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-50 dark:text-emerald-800 dark:border-emerald-800">
                        ⭐ {result.score ?? 100}đ
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-600">
                      {result.createdAt ? new Date(result.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
