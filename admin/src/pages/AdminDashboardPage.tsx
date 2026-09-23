import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Layers,
  Award,
  LogOut,
  Sparkles,
  UserPlus,
  Lock,
  Unlock,
  Search,
  CheckCircle2,
  Calendar,
  History
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state: overview | users | audit
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');

  // Overview data
  const [stats, setStats] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // User management state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'TEACHER' | 'CHILD'>('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // Modals state
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    contact: ''
  });
  const [childForm, setChildForm] = useState({
    name: '',
    dob: '',
    pin: '1234',
    avatar: 'lion',
    email: '',
    contact: '',
    password: ''
  });
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/admin/login');
      return;
    }

    fetchOverviewData();
  }, [user, navigate]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [dashRes, currRes] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getCurriculum()
      ]);
      if (dashRes.success) setStats(dashRes.data);
      if (currRes.success) setCurriculum(currRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await adminApi.getUsers(userRoleFilter, userSearchQuery);
      if (res.success) {
        setUsersList(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await adminApi.getAuditLogs();
      if (res.success) {
        setAuditLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Switch tabs
  const handleTabChange = (tab: 'overview' | 'users' | 'audit') => {
    setActiveTab(tab);
    if (tab === 'users') fetchUsers();
    if (tab === 'audit') fetchAuditLogs();
  };

  // Filter or search users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [userRoleFilter, userSearchQuery]);

  const handleToggleStatus = async (userId: string) => {
    try {
      const res = await adminApi.toggleUserStatus(userId);
      if (res.success) {
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 3000);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Thao tác khóa/mở khóa thất bại');
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.createTeacher(teacherForm);
      if (res.success) {
        setShowTeacherModal(false);
        setTeacherForm({ name: '', username: '', email: '', password: '', contact: '' });
        setActionMessage('Tạo tài khoản Giáo viên thành công!');
        setTimeout(() => setActionMessage(null), 3000);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Tạo tài khoản giáo viên thất bại');
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminApi.createChild(childForm);
      if (res.success) {
        setShowChildModal(false);
        setChildForm({ name: '', dob: '', pin: '1234', avatar: 'lion', email: '', contact: '', password: '' });
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 3500);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.message || 'Tạo tài khoản học sinh thất bại');
    }
  };

  const calculateAgePreview = (dobStr: string) => {
    if (!dobStr) return null;
    const birth = new Date(dobStr);
    const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    if (age <= 3) return { age, code: '3-4', book: 'Book 1 (Lớp Mầm)' };
    if (age === 4) return { age, code: '4-5', book: 'Book 2 (Lớp Chồi)' };
    return { age, code: '5-6', book: 'Book 3 (Lớp Lá)' };
  };

  const childAgePreview = calculateAgePreview(childForm.dob);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const metrics = stats?.metrics;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
            K
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              KCEnglishKids • Cổng Quản Trị
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              Quản lý chương trình, người dùng & nhật ký hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-xl transition-colors"
          >
            Chuyển sang Cổng Trẻ Em 🦁
          </Link>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-sm font-bold text-slate-700">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Bar */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-6xl w-full mx-auto flex items-center gap-2 pt-2">
          <button
            onClick={() => handleTabChange('overview')}
            className={`py-3 px-5 font-black text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Tổng quan & Khung chuẩn</span>
          </button>

          <button
            onClick={() => handleTabChange('users')}
            className={`py-3 px-5 font-black text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý người dùng ({metrics?.totalChildren ? metrics.totalChildren + (metrics.totalTeachers || 0) : '...'})</span>
          </button>

          <button
            onClick={() => handleTabChange('audit')}
            className={`py-3 px-5 font-black text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật ký kiểm toán (Audit Logs)</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="max-w-6xl w-full mx-auto px-6 pt-4">
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 animate-pop-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      <main className="max-w-6xl w-full mx-auto p-6 flex-1 space-y-8">
        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Metrics Grid */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Trẻ em học</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {metrics?.totalChildren || 0}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Chủ đề ứng dụng</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {metrics?.activeTopics || 19}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Curriculum Units</span>
                </div>
                <div className="text-3xl font-black text-slate-800">
                  {metrics?.totalCurriculumUnits || 27}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Tỷ lệ hoàn thành</span>
                </div>
                <div className="text-3xl font-black text-emerald-600">
                  {metrics?.completionRate || 0}%
                </div>
              </div>
            </section>

            {/* 27 Official Curriculum Units Foundation */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <span>Khung Chương Trình Chuẩn (3 Sách • 27 Units)</span>
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Tất cả 27 bài học gốc từ 3 đầu sách chuẩn theo 3 nhóm tuổi 3–4, 4–5, 5–6
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {curriculum.map((book) => (
                    <div key={book._id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                        <h3 className="font-black text-base text-indigo-900">
                          📖 {book.title} — Lớp {book.ageGroupCode} tuổi ({book.units?.length || 9} Units)
                        </h3>
                        <span className="text-xs font-extrabold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                          OFFICIAL_CURRICULUM
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-2.5">
                        {book.units?.map((u: any) => {
                          const isUnit5 = book.bookNumber === 1 && u.unitNumber === 5;
                          return (
                            <div
                              key={u._id}
                              className={`p-3 rounded-xl border text-xs ${
                                isUnit5
                                  ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-black text-slate-400">Unit {u.unitNumber}</span>
                                {isUnit5 && (
                                  <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-md uppercase font-black">
                                    Vertical Slice Active
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-800 font-bold leading-tight">
                                {u.bigQuestion}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Student Learning Results */}
            <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Kết quả học tập vừa ghi nhận từ MongoDB</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase font-black text-slate-400">
                      <th className="py-3 px-4">Bé học</th>
                      <th className="py-3 px-4">Bài học</th>
                      <th className="py-3 px-4">Hoạt động</th>
                      <th className="py-3 px-4">Điểm số</th>
                      <th className="py-3 px-4">Sao đạt được</th>
                      <th className="py-3 px-4">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {stats?.recentResults?.map((res: any) => (
                      <tr key={res._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 flex items-center gap-2">
                          <span className="text-xl">🦁</span>
                          <span>{res.child?.name || 'Child'}</span>
                        </td>
                        <td className="py-3 px-4">{res.lesson?.title || 'Pet Animals'}</td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-500">{res.activity?.title}</td>
                        <td className="py-3 px-4 font-black text-emerald-600">{res.score}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-0.5 text-amber-400">
                            {Array.from({ length: res.stars || 0 }).map((_, i) => (
                              <span key={i}>⭐</span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">
                          {new Date(res.createdAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ==================== TAB 2: USER MANAGEMENT ==================== */}
        {activeTab === 'users' && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Users className="w-6 h-6 text-indigo-600" />
                  <span>Quản Lý Người Dùng</span>
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  Quản lý danh sách Giáo viên và Trẻ em, cấp tài khoản và khóa tài khoản an toàn
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowTeacherModal(true)}
                  className="btn-kid bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Thêm Giáo Viên</span>
                </button>

                <button
                  onClick={() => setShowChildModal(true)}
                  className="btn-kid bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Thêm Học Sinh</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, username..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                {(['ALL', 'TEACHER', 'CHILD'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-colors ${
                      userRoleFilter === role
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {role === 'ALL' ? 'Tất cả' : role === 'TEACHER' ? 'Giáo viên' : 'Học sinh'}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            {usersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-400">
                      <th className="py-3 px-4">Người dùng</th>
                      <th className="py-3 px-4">Vai trò</th>
                      <th className="py-3 px-4">Lớp / Nhóm tuổi</th>
                      <th className="py-3 px-4">Tài khoản / PIN</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {usersList.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 flex items-center gap-3">
                          <span className="text-2xl">{u.avatar === 'lion' ? '🦁' : u.avatar === 'panda' ? '🐼' : u.avatar === 'rabbit' ? '🐰' : u.avatar === 'bear' ? '🐻' : u.avatar === 'fox' ? '🦊' : '👤'}</span>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email || u.username}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                              u.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-700'
                                : u.role === 'TEACHER'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-bold text-slate-600">
                          {u.assignedClass?.name || (u.ageGroupCode ? `Nhóm ${u.ageGroupCode} tuổi` : '—')}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono text-slate-500">
                          {u.role === 'CHILD' ? 'PIN: **** (Mã hóa)' : u.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleToggleStatus(u._id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                                u.status === 'ACTIVE'
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                            >
                              {u.status === 'ACTIVE' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 3: AUDIT LOGS ==================== */}
        {activeTab === 'audit' && (
          <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <History className="w-6 h-6 text-indigo-600" />
                <span>Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</span>
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-1">
                Lịch sử ghi vết toàn bộ các thao tác thêm, cập nhật, khóa/mở khóa tài khoản từ quản trị viên
              </p>
            </div>

            {auditLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 font-bold">Chưa có bản ghi nhật ký nào.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-black text-slate-400">
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Người thực hiện</th>
                      <th className="py-3 px-4">Hành động</th>
                      <th className="py-3 px-4">Đối tượng</th>
                      <th className="py-3 px-4">Chi tiết thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.user?.name || 'Admin'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-extrabold bg-indigo-100 text-indigo-800 uppercase">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">{log.targetType}</td>
                        <td className="py-3 px-4 font-mono text-slate-500 max-w-xs truncate">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* ==================== MODAL: CREATE TEACHER ==================== */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-2xl max-w-md w-full p-6 animate-pop-in">
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <span>Thêm Tài Khoản Giáo Viên</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-4">Cấp quyền quản lý lớp và giao bài tập</p>

            <form onSubmit={handleCreateTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="Cô Nguyễn Thu Hà"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Tên đăng nhập</label>
                <input
                  type="text"
                  required
                  placeholder="teacher_ha"
                  value={teacherForm.username}
                  onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="ha.teacher@kcenglishkids.com"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Mật khẩu</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  placeholder="0912345678"
                  value={teacherForm.contact}
                  onChange={(e) => setTeacherForm({ ...teacherForm, contact: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="btn-kid px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-kid px-5 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer shadow"
                >
                  Tạo Giáo Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: CREATE CHILD ==================== */}
      {showChildModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-2xl max-w-md w-full p-6 animate-pop-in">
            <h3 className="text-xl font-black text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-500" />
              <span>Thêm Tài Khoản Học Sinh</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 mb-4">Nhập ngày sinh để hệ thống tự động gán đúng nhóm tuổi</p>

            <form onSubmit={handleCreateChild} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Tên của bé</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tom, Anna, Bống"
                  value={childForm.name}
                  onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ngày sinh (DOB)</span>
                </label>
                <input
                  type="date"
                  required
                  value={childForm.dob}
                  onChange={(e) => setChildForm({ ...childForm, dob: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
                {childAgePreview && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Tuổi bé: {childAgePreview.age} tuổi • Tự động gán: {childAgePreview.book}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Mã PIN 4 chữ số *</label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  pattern="\d{4}"
                  placeholder="1234"
                  value={childForm.pin}
                  onChange={(e) => setChildForm({ ...childForm, pin: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-mono tracking-widest text-center font-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-1">Gmail phụ huynh (Học tại nhà)</label>
                  <input
                    type="email"
                    placeholder="phuhuynh@gmail.com"
                    value={childForm.email}
                    onChange={(e) => setChildForm({ ...childForm, email: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-600 uppercase mb-1">Số ĐT phụ huynh</label>
                  <input
                    type="tel"
                    placeholder="0901234567"
                    value={childForm.contact}
                    onChange={(e) => setChildForm({ ...childForm, contact: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Mật khẩu học tại nhà (Mặc định nếu để trống: theo mã PIN)</label>
                <input
                  type="text"
                  placeholder="Password@123 (Tùy chọn)"
                  value={childForm.password}
                  onChange={(e) => setChildForm({ ...childForm, password: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">Chọn linh vật (Avatar)</label>
                <div className="flex items-center gap-3">
                  {[
                    { key: 'lion', emoji: '🦁', name: 'Sư tử' },
                    { key: 'panda', emoji: '🐼', name: 'Gấu trúc' },
                    { key: 'rabbit', emoji: '🐰', name: 'Thỏ' },
                    { key: 'bear', emoji: '🐻', name: 'Gấu' },
                    { key: 'fox', emoji: '🦊', name: 'Cáo' }
                  ].map((av) => (
                    <button
                      key={av.key}
                      type="button"
                      onClick={() => setChildForm({ ...childForm, avatar: av.key })}
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center text-2xl cursor-pointer transition-all ${
                        childForm.avatar === av.key
                          ? 'border-amber-500 bg-amber-100 scale-105 shadow'
                          : 'border-slate-200 bg-slate-50 hover:bg-white'
                      }`}
                    >
                      {av.emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowChildModal(false)}
                  className="btn-kid px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-kid px-5 py-2 text-sm font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl cursor-pointer shadow"
                >
                  Tạo Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
