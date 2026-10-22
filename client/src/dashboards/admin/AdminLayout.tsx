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
  CalendarDays,
  Gamepad2,
  DownloadCloud,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/api';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [backupToast, setBackupToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const navLinks = [
    { label: 'Tổng quan hệ thống', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Quản lý Lớp học', path: '/admin/classrooms', icon: School },
    { label: 'Thời Khóa Biểu', path: '/admin/schedule', icon: CalendarDays },
    { label: 'Giáo trình & Bài học', path: '/admin/curriculum', icon: BookOpen },
    { label: 'Thư viện Mẫu câu', path: '/admin/sentences', icon: MessageSquare },
    { label: 'Kho Trò Chơi', path: '/admin/games', icon: Gamepad2 },
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

  // Quick system backup export action
  const handleExportBackup = async () => {
    try {
      setBackingUp(true);
      const res = await adminApi.exportSystemBackup();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res, null, 2));
      const downloadAnchor = document.createElement('a');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `KCEnglishKids_Full_Backup_${timeStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupToast({
        type: 'success',
        message: 'Đã xuất file sao lưu dữ liệu toàn bộ hệ thống (.json) thành công!'
      });
      setTimeout(() => setBackupToast(null), 5000);
    } catch (err: any) {
      setBackupToast({
        type: 'error',
        message: 'Lỗi khi sao lưu dữ liệu: ' + (err?.message || 'Không thể tải')
      });
      setTimeout(() => setBackupToast(null), 5000);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased bg-[#f8fafc] text-slate-800 text-base">
      {/* Toast Notification */}
      {backupToast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-base font-bold border transition-all animate-fade-in ${
            backupToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {backupToast.type === 'success' ? (
            <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={22} className="text-rose-600 shrink-0" />
          )}
          <span>{backupToast.message}</span>
        </div>
      )}

      {/* ── Mobile Top Header ─────────────────────────────────────────────── */}
      <div className="flex md:hidden items-center justify-between bg-white border-b border-slate-200 px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-black shadow-md shadow-indigo-600/30">
            <ShieldCheck size={24} />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 block tracking-tight">KCEnglishKids</span>
            <span className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">Admin Portal</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Desktop & Mobile Sidebar ──────────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 lg:w-80 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-transform duration-300 shrink-0 shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Logo brand */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/30">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight">KCEnglishKids</h1>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Quản Trị Viên</span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </p>
              </div>
            </div>
            {mobileOpen && (
              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Quick Backup Action Banner */}
          <div className="p-4 mx-4 my-3 rounded-2xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <DownloadCloud size={15} />
                <span>Sao lưu dữ liệu</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500">Toàn hệ thống</span>
            </div>
            <button
              type="button"
              disabled={backingUp}
              onClick={handleExportBackup}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 cursor-pointer"
            >
              <DownloadCloud size={14} className={backingUp ? 'animate-bounce' : ''} />
              <span>{backingUp ? 'Đang trích xuất backup...' : 'Tải File Backup (.json)'}</span>
            </button>
          </div>

          {/* Navigation links */}
          <nav className="p-4 space-y-1">
            <p className="px-3 text-xs font-black uppercase tracking-wider text-slate-400 mb-2.5">
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
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm sm:text-base font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-500'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon
                      size={20}
                      className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}
                    />
                    <span className={active ? 'font-black tracking-tight text-white' : ''}>
                      {item.label}
                    </span>
                  </div>
                  {active && <ChevronRight size={16} className="text-indigo-200" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Portal Switch */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3 shrink-0">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm shadow-2xs">
            <span className="text-slate-600 font-bold">Cổng Giáo viên</span>
            <Link
              to="/teacher/dashboard"
              target="_blank"
              className="text-indigo-600 hover:text-indigo-700 font-black flex items-center gap-1.5"
            >
              <span>Vào xem</span>
              <ExternalLink size={13} />
            </Link>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-base border border-indigo-200 shrink-0">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{user?.name || 'Admin User'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@kcenglishkids.edu.vn'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────────── */}
      <main className="flex-1 min-h-screen overflow-x-hidden p-4 sm:p-7 lg:p-9 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto space-y-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
