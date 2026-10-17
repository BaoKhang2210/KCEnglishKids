import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Lock,
  Unlock,
  Edit3,
  KeyRound
} from 'lucide-react';
import { adminApi } from '../../../services/api';

interface UsersTabProps {
  usersList: any[];
  classroomsList: any[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateTeacher: () => void;
  onOpenCreateChild: () => void;
  onOpenEditUser: (user: any) => void;
  onOpenResetPin: (user: any) => void;
  onNotify: (msg: string) => void;
}

export const UsersTab: React.FC<UsersTabProps> = ({
  usersList,
  classroomsList,
  loading,
  onRefresh,
  onOpenCreateTeacher,
  onOpenCreateChild,
  onOpenEditUser,
  onOpenResetPin,
  onNotify
}) => {
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'CHILD'>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleStatus = async (userId: string, _currentStatus: string) => {
    try {
      const res = await adminApi.toggleUserStatus(userId);
      if (res.success) {
        onNotify(res.message);
        onRefresh();
      }
    } catch (err: any) {
      alert(err.message || 'Thao tác khóa/mở khóa thất bại');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchSearch =
      !searchQuery ||
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchClass = true;
    if (classFilter !== 'ALL') {
      if (classFilter === 'UNASSIGNED') {
        matchClass = !u.assignedClass;
      } else {
        const cid = u.assignedClass?._id || u.assignedClass;
        matchClass = String(cid) === String(classFilter);
      }
    }

    return matchRole && matchSearch && matchClass;
  });

  const teacherCount = usersList.filter((u) => u.role === 'TEACHER').length;
  const childCount = usersList.filter((u) => u.role === 'CHILD').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Quick Action Buttons */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>Quản Lý Người Dùng & Phân Quyền</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Tổng cộng: <b>{usersList.length}</b> tài khoản ({teacherCount} giáo viên, {childCount} học sinh mầm non)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateTeacher}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Cấp GV Mới</span>
          </button>
          <button
            onClick={onOpenCreateChild}
            className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Cấp Học Sinh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, giáo viên, email hoặc username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {(['ALL', 'TEACHER', 'CHILD'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                roleFilter === r
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'ALL' ? 'Tất cả' : r === 'TEACHER' ? `Giáo viên (${teacherCount})` : `Học sinh (${childCount})`}
            </button>
          ))}
        </div>

        {/* Class Filter Dropdown */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Lọc lớp:</span>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả các lớp</option>
            {classroomsList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.ageGroupCode}T)
              </option>
            ))}
            <option value="UNASSIGNED">Chưa phân lớp</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải danh sách người dùng…
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">
            Không tìm thấy tài khoản nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3.5 px-4">Hồ sơ người dùng</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Lớp & Giáo trình</th>
                  <th className="py-3.5 px-4">Tài khoản / PIN</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác quản trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredUsers.map((u) => {
                  const isChild = u.role === 'CHILD';
                  const isTeacher = u.role === 'TEACHER';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <span className="text-2xl">
                          {u.avatar === 'lion' ? '🦁' : u.avatar === 'panda' ? '🐼' : u.avatar === 'rabbit' ? '🐰' : u.avatar === 'fox' ? '🦊' : isTeacher ? '👩‍🏫' : '👤'}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {u.email || u.username || '—'}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isAdmin
                            ? 'bg-purple-100 text-purple-700'
                            : isTeacher
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isAdmin ? 'Quản Trị' : isTeacher ? 'Giáo Viên' : 'Học Sinh'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.assignedClass ? (
                          <div>
                            <span className="font-bold text-slate-800">
                              {u.assignedClass?.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              Khối {u.ageGroupCode || u.assignedClass?.ageGroupCode} tuổi
                            </span>
                          </div>
                        ) : isChild ? (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-bold">
                            Chưa phân lớp
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {isChild ? (
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-700">
                              PIN: ****
                            </span>
                            <button
                              type="button"
                              onClick={() => onOpenResetPin(u)}
                              className="text-amber-600 hover:text-amber-800 text-[10px] font-bold underline cursor-pointer"
                            >
                              Đổi PIN
                            </button>
                          </div>
                        ) : (
                          u.username || u.email
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}>
                          {u.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isChild && (
                            <button
                              type="button"
                              onClick={() => onOpenResetPin(u)}
                              className="p-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Đặt lại mã PIN của bé"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenEditUser(u)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u._id, u.status)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                u.status === 'ACTIVE'
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                            >
                              {u.status === 'ACTIVE' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
