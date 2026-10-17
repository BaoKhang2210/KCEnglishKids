import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  GraduationCap,
  History,
  TrendingUp,
  Settings,
  LogOut,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../services/api';

// Tabs
import { OverviewTab } from '../components/admin/tabs/OverviewTab';
import { UsersTab } from '../components/admin/tabs/UsersTab';
import { ClassroomsTab } from '../components/admin/tabs/ClassroomsTab';
import { CurriculumTab } from '../components/admin/tabs/CurriculumTab';
import { AnalyticsTab } from '../components/admin/tabs/AnalyticsTab';
import { AuditTab } from '../components/admin/tabs/AuditTab';
import { SettingsTab } from '../components/admin/tabs/SettingsTab';

// Modals
import { CreateTeacherModal } from '../components/admin/modals/CreateTeacherModal';
import { CreateChildModal } from '../components/admin/modals/CreateChildModal';
import { EditUserModal } from '../components/admin/modals/EditUserModal';
import { ResetPinModal } from '../components/admin/modals/ResetPinModal';
import { CreateClassroomModal } from '../components/admin/modals/CreateClassroomModal';
import { ChangeTeacherModal } from '../components/admin/modals/ChangeTeacherModal';
import { AssignStudentsModal } from '../components/admin/modals/AssignStudentsModal';

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Tab state: overview | users | classrooms | curriculum | analytics | audit | settings
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'classrooms' | 'curriculum' | 'analytics' | 'audit' | 'settings'
  >('overview');

  // Shared data states
  const [stats, setStats] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [classroomsList, setClassroomsList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Loading states
  const [_loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [classroomsLoading, setClassroomsLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Notification toast message
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Modals state
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showResetPinModal, setShowResetPinModal] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showChangeTeacherModal, setShowChangeTeacherModal] = useState(false);
  const [showAssignStudentsModal, setShowAssignStudentsModal] = useState(false);

  // Selected entities for modals
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState<any | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    loadInitialData();
  }, [user, navigate]);

  const notify = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 3500);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [dashRes, currRes] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getCurriculum()
      ]);
      if (dashRes.success) setStats(dashRes.data);
      if (currRes.success) setCurriculum(currRes.data);

      fetchClassrooms();
      fetchUsers();
    } catch (err) {
      console.error('Failed to load initial admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await adminApi.getUsers();
      if (res.success) setUsersList(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      setClassroomsLoading(true);
      const res = await adminApi.getClassrooms();
      if (res.success) setClassroomsList(res.data);
    } catch (err) {
      console.error('Failed to fetch classrooms:', err);
    } finally {
      setClassroomsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const res = await adminApi.getAuditLogs();
      if (res.success) setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'users') fetchUsers();
    if (tab === 'classrooms') fetchClassrooms();
    if (tab === 'audit') fetchAuditLogs();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const teachersList = usersList.filter((u) => u.role === 'TEACHER');
  const childrenList = usersList.filter((u) => u.role === 'CHILD');

  const navTabs = [
    { key: 'overview', label: 'Tổng Quan', icon: BookOpen },
    { key: 'users', label: `Người Dùng (${usersList.length})`, icon: Users },
    { key: 'classrooms', label: `Lớp Học (${classroomsList.length})`, icon: GraduationCap },
    { key: 'curriculum', label: 'Kho Giáo Trình', icon: Sparkles },
    { key: 'analytics', label: 'Báo Cáo Toàn Trường', icon: TrendingUp },
    { key: 'audit', label: 'Nhật Ký (Audit)', icon: History },
    { key: 'settings', label: 'Cấu Hình Hệ Thống', icon: Settings }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
            KC
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-tight">
              KCEnglishKids • Cổng Quản Trị Hệ Thống
            </h1>
            <p className="text-[11px] font-semibold text-slate-400">
              Quản trị giáo trình, người dùng, lớp học & nhật ký kiểm toán
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-xl transition-colors hidden sm:inline-flex items-center gap-1.5"
          >
            <span>Mở Cổng Trẻ Em & Giáo Viên</span> 🦁
          </a>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-black text-slate-800 block">{user?.name}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase">Quản Trị Viên</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 sticky top-[65px] z-20 shadow-2xs">
        <div className="w-full max-w-[2200px] 2xl:max-w-none mx-auto flex items-center gap-1 overflow-x-auto no-scrollbar pt-1">
          {navTabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTabChange(t.key)}
                className={`py-3 px-4 font-black text-xs border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                  active
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Notification Toast Banner */}
      {actionMessage && (
        <div className="w-full max-w-[2200px] 2xl:max-w-none mx-auto px-6 pt-4 animate-pop-in">
          <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        </div>
      )}

      {/* Tab Content Body */}
      <main className="w-full max-w-[2200px] 2xl:max-w-none mx-auto p-6 flex-1">
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            curriculum={curriculum}
            onNavigateTab={(tab) => handleTabChange(tab)}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            usersList={usersList}
            classroomsList={classroomsList}
            loading={usersLoading}
            onRefresh={fetchUsers}
            onOpenCreateTeacher={() => setShowTeacherModal(true)}
            onOpenCreateChild={() => setShowChildModal(true)}
            onOpenEditUser={(u) => {
              setSelectedUser(u);
              setShowEditUserModal(true);
            }}
            onOpenResetPin={(u) => {
              setSelectedUser(u);
              setShowResetPinModal(true);
            }}
            onNotify={notify}
          />
        )}

        {activeTab === 'classrooms' && (
          <ClassroomsTab
            classroomsList={classroomsList}
            loading={classroomsLoading}
            onRefresh={fetchClassrooms}
            onOpenCreateClass={() => setShowCreateClassModal(true)}
            onOpenChangeTeacher={(c) => {
              setSelectedClassroom(c);
              setShowChangeTeacherModal(true);
            }}
            onOpenAssignStudents={(c) => {
              setSelectedClassroom(c);
              setShowAssignStudentsModal(true);
            }}
            onNotify={notify}
          />
        )}

        {activeTab === 'curriculum' && (
          <CurriculumTab onNotify={notify} />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}

        {activeTab === 'audit' && (
          <AuditTab auditLogs={auditLogs} loading={auditLoading} />
        )}

        {activeTab === 'settings' && (
          <SettingsTab onNotify={notify} />
        )}
      </main>

      {/* All Dialogs & Modals */}
      <CreateTeacherModal
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => {
          notify('Tạo tài khoản giáo viên thành công!');
          fetchUsers();
          fetchClassrooms();
        }}
        classroomsList={classroomsList}
      />

      <CreateChildModal
        isOpen={showChildModal}
        onClose={() => setShowChildModal(false)}
        onSuccess={(msg) => {
          notify(msg || 'Tạo tài khoản học sinh thành công!');
          fetchUsers();
          fetchClassrooms();
        }}
        classroomsList={classroomsList}
      />

      <EditUserModal
        isOpen={showEditUserModal}
        user={selectedUser}
        onClose={() => {
          setShowEditUserModal(false);
          setSelectedUser(null);
        }}
        onSuccess={(msg) => {
          notify(msg || 'Cập nhật thông tin thành công!');
          fetchUsers();
          fetchClassrooms();
        }}
        classroomsList={classroomsList}
      />

      <ResetPinModal
        isOpen={showResetPinModal}
        user={selectedUser}
        onClose={() => {
          setShowResetPinModal(false);
          setSelectedUser(null);
        }}
        onSuccess={(msg) => {
          notify(msg || 'Đặt lại mã PIN thành công!');
        }}
      />

      <CreateClassroomModal
        isOpen={showCreateClassModal}
        onClose={() => setShowCreateClassModal(false)}
        onSuccess={(msg) => {
          notify(msg || 'Tạo lớp học thành công!');
          fetchClassrooms();
        }}
        teachersList={teachersList}
      />

      <ChangeTeacherModal
        isOpen={showChangeTeacherModal}
        classroom={selectedClassroom}
        onClose={() => {
          setShowChangeTeacherModal(false);
          setSelectedClassroom(null);
        }}
        onSuccess={(msg) => {
          notify(msg || 'Phân công lại giáo viên thành công!');
          fetchClassrooms();
        }}
        teachersList={teachersList}
      />

      <AssignStudentsModal
        isOpen={showAssignStudentsModal}
        classroom={selectedClassroom}
        onClose={() => {
          setShowAssignStudentsModal(false);
          setSelectedClassroom(null);
        }}
        onSuccess={(msg) => {
          notify(msg || 'Phân bổ học sinh thành công!');
          fetchClassrooms();
          fetchUsers();
        }}
        allChildren={childrenList}
      />
    </div>
  );
};
