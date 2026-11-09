import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Award, BookOpen, CalendarDays, ChartNoAxesCombined, ClipboardList, History, KeyRound, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TeacherChangePasswordModal } from '../../components/teacher/TeacherChangePasswordModal';
import '../../styles/teacher.css';

const groups = [
  { title: 'Không gian giảng dạy', links: [
    { to: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { to: 'schedule', label: 'Lịch giảng dạy và tiến độ', icon: CalendarDays },
    { to: 'students', label: 'Hồ sơ học sinh', icon: Users }
  ] },
  { title: 'Chuẩn bị & tổ chức', links: [
    { to: 'content', label: 'Giáo trình', icon: BookOpen },
    { to: 'assignments', label: 'Bài tập', icon: ClipboardList },
    { to: 'classroom-sessions', label: 'Nhật ký buổi dạy', icon: History }
  ] },
  { title: 'Đồng hành cùng học sinh', links: [
    { to: 'analytics', label: 'Theo dõi tiến bộ', icon: ChartNoAxesCombined },
    { to: 'recognitions', label: 'Vinh danh', icon: Award }
  ] }
];

export const TeacherLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open && !showPasswordModal) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showPasswordModal) setShowPasswordModal(false);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, showPasswordModal]);

  const current = groups.flatMap(group => group.links).find(link => location.pathname.startsWith('/teacher/' + link.to));

  return (
    <div className="teacher-workspace staff-workspace">
      <a className="staff-skip-link" href="#teacher-main">Đến nội dung chính</a>
      {open && <button className="teacher-nav-backdrop" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <aside className={`teacher-sidebar ${open ? 'is-open' : ''}`} aria-label="Điều hướng giáo viên">
        <Link to="/teacher/dashboard" className="teacher-brand">
          <span className="teacher-brand-mark"><BookOpen size={23} /></span>
          <span><strong>KCEnglishKids</strong><small>Không gian giáo viên</small></span>
        </Link>
        <button className="teacher-mobile-close" aria-label="Đóng menu" onClick={() => setOpen(false)}>
          <X size={21} />
        </button>
        <nav>
          {groups.map(group => (
            <section key={group.title} className="teacher-nav-group">
              <p>{group.title}</p>
              {group.links.map(link => (
                <NavLink
                  key={link.to}
                  to={'/teacher/' + link.to}
                  className={({ isActive }) => `teacher-nav-link ${isActive || (link.to === 'content' && location.pathname.includes('/sentences')) ? 'active' : ''}`}
                >
                  <link.icon size={19} />
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <div className="teacher-profile">
          <span className="teacher-avatar">
            {user?.name?.split(' ').filter(Boolean).slice(-2).map(part => part[0]).join('') || 'GV'}
          </span>
          <div>
            <strong>{user?.name || 'Giáo viên'}</strong>
            <small>Giáo viên phụ trách</small>
          </div>
          <button
            type="button"
            title="Đổi mật khẩu tài khoản"
            aria-label="Đổi mật khẩu"
            onClick={() => setShowPasswordModal(true)}
            className="hover:text-teal-700 transition-colors cursor-pointer"
          >
            <KeyRound size={18} />
          </button>
          <button
            type="button"
            title="Đăng xuất"
            aria-label="Đăng xuất"
            onClick={() => { logout(); navigate('/teacher/login'); }}
            className="hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogOut size={19} />
          </button>
        </div>
      </aside>
      <div className="teacher-body">
        <header className="teacher-topbar">
          <div className="teacher-topbar-title">
            <button className="teacher-menu-button" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu size={22} />
            </button>
            <span>Giảng dạy <span aria-hidden="true">/</span> <b>{current?.label || 'Học liệu'}</b></span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/teacher/classroom-sessions/new" className="teacher-topbar-action">
              Chuẩn bị buổi dạy <ArrowUpRight size={17} />
            </Link>
          </div>
        </header>
        <main id="teacher-main" tabIndex={-1} className="teacher-main">
          <Outlet />
        </main>
        <footer className="teacher-footer">KCEnglishKids · Mỗi giờ học, một bước tiến nhỏ.</footer>
      </div>

      <TeacherChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};
