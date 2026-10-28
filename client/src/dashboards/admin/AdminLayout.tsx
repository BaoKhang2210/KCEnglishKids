import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, School, BookOpen, MessageSquare, Users, ClipboardList, LogOut, Menu, X, ShieldCheck, ChevronRight, ExternalLink, BarChart3, CalendarDays, Gamepad2, Award, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/api';
import '../../styles/admin.css';

const navigation = [
  { title: 'Điều hành', items: [
    { label: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Lớp học', path: '/admin/classrooms', icon: School },
    { label: 'Thời khóa biểu', path: '/admin/schedule', icon: CalendarDays },
    { label: 'Tài khoản', path: '/admin/users', icon: Users }
  ] },
  { title: 'Nội dung học tập', items: [
    { label: 'Giáo trình & bài học', path: '/admin/curriculum', icon: BookOpen },
    { label: 'Thư viện mẫu câu', path: '/admin/sentences', icon: MessageSquare },
    { label: 'Kho trò chơi', path: '/admin/games', icon: Gamepad2 },
    { label: 'Vinh danh của lớp', path: '/admin/recognitions', icon: Award }
  ] },
  { title: 'Quản trị hệ thống', items: [
    { label: 'Báo cáo phân tích', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Nhật ký hoạt động', path: '/admin/audit-logs', icon: ClipboardList },
    { label: 'Cài đặt', path: '/admin/settings', icon: Settings }
  ] }
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [school, setSchool] = useState('KCEnglishKids');
  const active = navigation.flatMap(group => group.items).find(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
  useEffect(() => {
    let current = true;
    adminApi.getSettings().then(response => { if (current && response.data?.schoolName) setSchool(response.data.schoolName); }).catch(() => {});
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', escape);
    return () => { current = false; window.removeEventListener('keydown', escape); };
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  return <div className="staff-workspace admin-workspace">
    <a className="staff-skip-link" href="#staff-main">Đến nội dung chính</a>
    {mobileOpen && <button className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} />}
    <aside className="admin-sidebar" data-open={mobileOpen} aria-label="Điều hướng quản trị">
      <Link to="/admin/dashboard" className="admin-brand"><span className="admin-brand-mark"><ShieldCheck size={24} /></span><span><strong>KCEnglishKids</strong><p>Không gian quản trị</p></span></Link>
      <button type="button" className="admin-mobile-close" aria-label="Đóng menu quản trị" onClick={() => setMobileOpen(false)}><X size={22} /></button>
      <nav className="admin-nav">{navigation.map(group => <div className="admin-nav-group" key={group.title}>
        <p className="admin-nav-heading">{group.title}</p>
        {group.items.map(item => <Link key={item.path} to={item.path} className="admin-nav-link" aria-current={active?.path === item.path ? 'page' : undefined}><item.icon size={19} /><span>{item.label}</span></Link>)}
      </div>)}</nav>
      <div className="admin-sidebar-footer">
        <div className="admin-profile"><span className="admin-avatar">{user?.name?.[0] || 'A'}</span><div><strong>{user?.name || 'Quản trị viên'}</strong><small>{user?.email}</small></div><button type="button" title="Đăng xuất" aria-label="Đăng xuất" onClick={() => { logout(); navigate('/admin/login'); }}><LogOut size={18} /></button></div>
        <Link className="admin-portal-link" to="/teacher/login" target="_blank" rel="noreferrer">Mở cổng đăng nhập giáo viên<ExternalLink size={14} /></Link>
      </div>
    </aside>
    <div className="admin-content">
      <header className="admin-topbar"><div className="flex items-center gap-3"><button type="button" className="admin-mobile-toggle" aria-label="Mở menu quản trị" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={23} /></button><div className="admin-breadcrumb"><Link to="/admin/dashboard">Quản trị</Link><ChevronRight size={15} /><strong>{active?.label || 'Tổng quan'}</strong></div></div><span className="admin-school">{school}</span></header>
      <main id="staff-main" tabIndex={-1} className="admin-main"><Outlet /></main>
    </div>
  </div>;
}