import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  School,
  BookOpen,
  MessageSquare,
  Users,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  BarChart3,
  CalendarDays
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Lớp học & Trẻ em', path: '/admin/classrooms', icon: School },
    { label: 'Thời Khóa Biểu', path: '/admin/schedule', icon: CalendarDays },
    { label: 'Giáo trình & Bài học', path: '/admin/curriculum', icon: BookOpen },
    { label: 'Thư viện Mẫu câu', path: '/admin/sentences', icon: MessageSquare },
    { label: 'Quản lý Tài khoản', path: '/admin/users', icon: Users },
    { label: 'Báo cáo Phân tích', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Nhật ký Hoạt động', path: '/admin/audit-logs', icon: ClipboardList }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isLinkActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased transition-colors duration-200 admin-dark dark bg-[#0b0f19] text-slate-100">
      {/* ── Mobile Header ────────────────────────────────────────────────────── */}
      <div className="flex md:hidden items-center justify-between bg-slate-950 border-b border-slate-800 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black shadow-md">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span className="text-sm font-black text-white block">KCEnglishKids</span>
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Admin Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Desktop & Mobile Sidebar ─────────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-slate-950 border-r border-slate-800 flex flex-col justify-between transition-transform duration-300 shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Logo brand */}
          <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 text-white shadow-lg shadow-indigo-600/30">
                <ShieldCheck size={24} className="text-white-forced" />
              </div>
              <div>
                <h1 className="text-base font-black text-white tracking-tight">KCEnglishKids</h1>
                <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                  <span>Quản Trị Viên</span>
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </p>
              </div>
            </div>
            {mobileOpen && (
              <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-400">
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1.5">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
              Menu Quản Trị
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isLinkActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-1 ring-white/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={active ? 'text-white' : 'text-slate-400'}
                    />
                    <span className={active ? 'text-white font-extrabold' : ''}>
                      {item.label}
                    </span>
                  </div>
                  {active && (
                    <ChevronRight
                      size={14}
                      className="text-indigo-200"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom user profile & quick links */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
          {/* Quick portal switch */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">Cổng Giáo viên</span>
            <Link
              to="/teacher/dashboard"
              target="_blank"
              className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
            >
              <span>Xem</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {/* Profile pill */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-900/60 border border-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black text-sm border border-indigo-500/30 shrink-0">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Admin User'}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@kcenglishkids.edu.vn'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-[#0b0f19]">
        <div className="max-w-7xl mx-auto space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
