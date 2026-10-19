import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Search,
  Check,
  X,
  AlertCircle,
  School,
  Award,
  ChevronLeft,
  ChevronRight,
  Brain,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';
import { StudentCompetencyModal } from '../../components/teacher/StudentCompetencyModal';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [createTeacherModal, setCreateTeacherModal] = useState(false);
  const [createChildModal, setCreateChildModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [resetPinModal, setResetPinModal] = useState<any | null>(null);
  const [competencyStudent, setCompetencyStudent] = useState<any | null>(null);

  // Bulk Excel Student Import state
  const [bulkImportModalOpen, setBulkImportModalOpen] = useState(false);
  const [bulkExcelRows, setBulkExcelRows] = useState<any[]>([]);
  const [bulkExcelFileName, setBulkExcelFileName] = useState('');
  const [bulkTargetClass, setBulkTargetClass] = useState('');
  const [bulkDefaultAgeGroup, setBulkDefaultAgeGroup] = useState('3-4');
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

  // Forms
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    contact: '',
    assignedClass: ''
  });

  const [childForm, setChildForm] = useState({
    name: '',
    username: '',
    pin: '',
    ageGroupCode: '3-4',
    assignedClass: '',
    contact: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    username: '',
    contact: '',
    assignedClass: '',
    ageGroupCode: '3-4',
    status: 'ACTIVE'
  });

  const [newPin, setNewPin] = useState('');

  // Alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, search]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadClassrooms = async () => {
    try {
      const res = await adminApi.getClassrooms();
      if (res.success) setClassrooms(res.data);
    } catch (e) {
      console.warn('Could not load classrooms for user modal', e);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getUsers({
        page,
        limit: 20,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        search: search.trim() || undefined
      });
      if (res.success) {
        setUsers(res.data);
        setTotalPages(res.pages || 1);
        setTotalCount(res.total || 0);
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE TEACHER ────────────────────────────────────────────────────────
  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.name || !teacherForm.username || !teacherForm.email || !teacherForm.password) {
      showAlert('error', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    try {
      const res = await adminApi.createTeacher(teacherForm);
      if (res.success) {
        showAlert('success', `Đã tạo tài khoản Giáo viên ${teacherForm.name} thành công!`);
        setCreateTeacherModal(false);
        setTeacherForm({ name: '', username: '', email: '', password: '', contact: '', assignedClass: '' });
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Tạo tài khoản giáo viên thất bại.');
    }
  };

  // ── CREATE CHILD ──────────────────────────────────────────────────────────
  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childForm.name || !childForm.pin) {
      showAlert('error', 'Vui lòng nhập tên học sinh và mã PIN 4 số.');
      return;
    }
    if (!/^\d{4}$/.test(childForm.pin)) {
      showAlert('error', 'Mã PIN phải đúng 4 chữ số (0-9).');
      return;
    }
    try {
      const res = await adminApi.createChild(childForm);
      if (res.success) {
        showAlert('success', `Đã tạo tài khoản Học sinh ${childForm.name} thành công!`);
        setCreateChildModal(false);
        setChildForm({ name: '', username: '', pin: '', ageGroupCode: '3-4', assignedClass: '', contact: '' });
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Tạo tài khoản học sinh thất bại.');
    }
  };

  // ── EDIT USER ─────────────────────────────────────────────────────────────
  const handleOpenEdit = (user: any) => {
    setEditUserModal(user);
    setEditForm({
      name: user.name,
      email: user.email || '',
      username: user.username || '',
      contact: user.contact || '',
      assignedClass: user.assignedClass?._id || user.assignedClass || '',
      ageGroupCode: user.ageGroupCode || '3-4',
      status: user.status || 'ACTIVE'
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal) return;
    try {
      const res = await adminApi.updateUser(editUserModal._id, editForm);
      if (res.success) {
        showAlert('success', res.message || 'Cập nhật tài khoản thành công!');
        setEditUserModal(null);
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Cập nhật tài khoản thất bại.');
    }
  };

  // ── RESET PIN ─────────────────────────────────────────────────────────────
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinModal || !/^\d{4}$/.test(newPin)) {
      showAlert('error', 'Mã PIN mới phải gồm đúng 4 chữ số.');
      return;
    }
    try {
      const res = await adminApi.resetChildPin(resetPinModal._id, newPin);
      if (res.success) {
        showAlert('success', res.message || 'Đặt lại mã PIN thành công!');
        setResetPinModal(null);
        setNewPin('');
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Đặt lại PIN thất bại.');
    }
  };

  // ── TOGGLE STATUS ─────────────────────────────────────────────────────────
  const handleToggleStatus = async (user: any) => {
    try {
      const res = await adminApi.toggleUserStatus(user._id);
      if (res.success) {
        showAlert('success', res.message || 'Thay đổi trạng thái tài khoản thành công!');
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể đổi trạng thái tài khoản.');
    }
  };

  // ── DELETE USER ───────────────────────────────────────────────────────────
  const handleDeleteUser = async (user: any) => {
    if (!window.confirm(`Bạn có chắc muốn hủy kích hoạt tài khoản ${user.name}?`)) return;
    try {
      const res = await adminApi.deleteUser(user._id);
      if (res.success) {
        showAlert('success', res.message || 'Đã hủy tài khoản.');
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa tài khoản.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">ADMIN</span>;
      case 'TEACHER':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">GIÁO VIÊN</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">HỌC SINH</span>;
    }
  };

  // ── EXCEL BULK IMPORT STUDENTS HELPERS ────────────────────────────────────
  const downloadSampleExcelTemplate = () => {
    const sampleData = [
      {
        'Họ và tên': 'Nguyễn Hoàng Nam',
        'Ngày sinh': '2021-05-15',
        'Mã PIN': '1234',
        'SĐT Phụ huynh': '0901234567',
        'Nhóm tuổi': '3-4'
      },
      {
        'Họ và tên': 'Trần Mai Anh',
        'Ngày sinh': '2020-08-20',
        'Mã PIN': '8888',
        'SĐT Phụ huynh': '0912345678',
        'Nhóm tuổi': '4-5'
      },
      {
        'Họ và tên': 'Lê Minh Khang',
        'Ngày sinh': '2019-11-02',
        'Mã PIN': '',
        'SĐT Phụ huynh': '0987654321',
        'Nhóm tuổi': '5-6'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');
    XLSX.writeFile(wb, 'Mau_Danh_Sach_Hoc_Sinh_KCEnglishKids.xlsx');
  };

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkExcelFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          showAlert('error', 'File không có dữ liệu học sinh.');
          return;
        }

        const parsedRows = rawData.map((item, idx) => {
          const rawName = item.name || item.fullName || item['Họ và tên'] || item['Họ tên'] || item['Tên'] || '';
          const name = String(rawName).trim();

          let rawPin = item.pin || item['Mã PIN'] || item['PIN'] || '';
          rawPin = String(rawPin).trim();

          let rawDob = item.dob || item.birthDate || item['Ngày sinh'] || '';
          let dobStr = '';
          if (rawDob) {
            if (rawDob instanceof Date) {
              dobStr = rawDob.toISOString().split('T')[0];
            } else if (typeof rawDob === 'string') {
              dobStr = rawDob.trim();
            }
          }

          const rawContact = item.contact || item.parentContact || item.phone || item['SĐT Phụ huynh'] || item['Số điện thoại'] || item['SĐT'] || '';
          const contact = String(rawContact).trim();

          const rawAge = item.ageGroupCode || item['Nhóm tuổi'] || bulkDefaultAgeGroup;
          const ageGroupCode = ['3-4', '4-5', '5-6'].includes(rawAge) ? rawAge : bulkDefaultAgeGroup;

          const isValid = !!name;
          const error = !name ? 'Thiếu họ tên' : undefined;

          return {
            id: `row-${idx + 1}-${Date.now()}`,
            index: idx + 1,
            name,
            dob: dobStr,
            pin: rawPin,
            contact,
            ageGroupCode,
            isValid,
            error
          };
        });

        setBulkExcelRows(parsedRows);
        showAlert('success', `Đã nạp ${parsedRows.length} dòng dữ liệu từ file ${file.name}`);
      } catch (err: any) {
        showAlert('error', 'Lỗi khi đọc file Excel: ' + (err?.message || 'File không hợp lệ'));
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validRows = bulkExcelRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showAlert('error', 'Không có dữ liệu học sinh hợp lệ để tạo tài khoản.');
      return;
    }

    try {
      setIsSubmittingBulk(true);
      const res = await adminApi.bulkImportChildren({
        students: validRows,
        classroomId: bulkTargetClass || undefined,
        defaultAgeGroupCode: bulkDefaultAgeGroup
      });

      if (res.success) {
        showAlert('success', res.message || `Đã tạo thành công ${validRows.length} tài khoản học sinh!`);
        setBulkImportModalOpen(false);
        setBulkExcelRows([]);
        setBulkExcelFileName('');
        loadUsers();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Tạo tài khoản học sinh hàng loạt thất bại.');
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert toast notification */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40'
          }`}
        >
          {alert.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <Users className="text-purple-400" size={26} />
            <span>Quản Lý Tài Khoản Người Dùng</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quản trị viên khởi tạo tài khoản giáo viên, trẻ em, phân lớp và đặt lại mã PIN bảo mật.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            id="btn-bulk-import-children"
            onClick={() => {
              setBulkExcelRows([]);
              setBulkExcelFileName('');
              setBulkImportModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold text-xs shadow-lg shadow-indigo-600/10 flex items-center gap-1.5 transition-all"
            title="Nạp danh sách học sinh từ file Excel"
          >
            <FileSpreadsheet size={16} />
            <span>Nhập Học Sinh (Excel)</span>
          </button>
          <button
            id="btn-create-teacher"
            onClick={() => setCreateTeacherModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
          >
            <UserPlus size={16} />
            <span>Tạo Giáo Viên</span>
          </button>
          <button
            id="btn-create-child"
            onClick={() => setCreateChildModal(true)}
            className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
          >
            <UserPlus size={16} />
            <span>Tạo Học Sinh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, email hoặc tên đăng nhập..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>Tổng cộng:</span>
            <span className="font-black text-purple-400 text-sm">{totalCount} tài khoản</span>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Vai trò:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'TEACHER', label: 'Giáo viên' },
            { id: 'CHILD', label: 'Học sinh' },
            { id: 'ADMIN', label: 'Quản trị viên' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRoleFilter(r.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                roleFilter === r.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : users.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <Users size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">Không tìm thấy tài khoản nào</p>
          <p className="text-xs text-slate-500 mt-1">Hãy thay đổi từ khóa tìm kiếm hoặc vai trò lọc.</p>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3.5 px-4">Tài khoản</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Lớp đang theo học / Phụ trách</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-xs text-purple-300 shrink-0">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            u.name?.[0] || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">{u.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>@{u.username || 'N/A'}</span>
                            {u.email && <span>• {u.email}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.assignedClass ? (
                        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-bold">
                          <School size={14} className="text-indigo-400" />
                          <span>{u.assignedClass.name || 'Lớp học'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 italic">Chưa xếp lớp</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {u.role === 'CHILD' && (
                          <>
                            <button
                              onClick={() => setCompetencyStudent(u)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-teal-600/30 text-teal-300 transition-all cursor-pointer"
                              title="Xem Hồ sơ năng lực 3 trụ cột (Passport)"
                            >
                              <Brain size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setResetPinModal(u);
                                setNewPin('');
                              }}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-indigo-300 transition-all cursor-pointer"
                              title="Đặt lại mã PIN 4 số"
                            >
                              <Key size={14} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                          title={u.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                        >
                          {u.status === 'ACTIVE' ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                          title="Sửa thông tin"
                        >
                          <Edit size={14} />
                        </button>
                        {u.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                            title="Hủy tài khoản"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Trang {page} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Trước</span>
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold flex items-center gap-1"
                >
                  <span>Sau</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: CREATE TEACHER ────────────────────────────────────────────── */}
      {createTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="text-emerald-400" size={20} />
                <span>Tạo Tài Khoản Giáo Viên Mới</span>
              </h2>
              <button onClick={() => setCreateTeacherModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Họ và tên giáo viên *
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder="Ví dụ: Cô Nguyễn Mai Phương"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tên đăng nhập *
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.username}
                    onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                    placeholder="maiphuong"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder="maiphuong@kcenglishkids.edu.vn"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Mật khẩu khởi tạo *
                </label>
                <input
                  type="password"
                  required
                  value={teacherForm.password}
                  onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Phân công lớp phụ trách ban đầu
                </label>
                <select
                  value={teacherForm.assignedClass}
                  onChange={(e) => setTeacherForm({ ...teacherForm, assignedClass: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">-- Chưa gán lớp --</option>
                  {classrooms.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.ageGroupCode} tuổi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateTeacherModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30"
                >
                  Tạo Giáo Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE CHILD ──────────────────────────────────────────────── */}
      {createChildModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="text-indigo-400" size={20} />
                <span>Tạo Tài Khoản Học Sinh Mới</span>
              </h2>
              <button onClick={() => setCreateChildModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateChild} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tên của bé *
                </label>
                <input
                  type="text"
                  required
                  value={childForm.name}
                  onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
                  placeholder="Ví dụ: Bé An An, Minh Khôi"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Mã đăng nhập (Username)
                  </label>
                  <input
                    type="text"
                    value={childForm.username}
                    onChange={(e) => setChildForm({ ...childForm, username: e.target.value })}
                    placeholder="Để trống tự động tạo"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Mã PIN 4 số (Bé đăng nhập) *
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={childForm.pin}
                    onChange={(e) => setChildForm({ ...childForm, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm font-mono tracking-widest focus:border-indigo-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Độ tuổi *
                  </label>
                  <select
                    value={childForm.ageGroupCode}
                    onChange={(e) => setChildForm({ ...childForm, ageGroupCode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="3-4">3-4 Tuổi (Mầm)</option>
                    <option value="4-5">4-5 Tuổi (Chồi)</option>
                    <option value="5-6">5-6 Tuổi (Lá)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Lớp học xếp ban đầu
                  </label>
                  <select
                    value={childForm.assignedClass}
                    onChange={(e) => setChildForm({ ...childForm, assignedClass: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Chưa xếp lớp --</option>
                    {classrooms.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.ageGroupCode} tuổi)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Số điện thoại Phụ huynh (Liên hệ)
                </label>
                <input
                  type="text"
                  value={childForm.contact}
                  onChange={(e) => setChildForm({ ...childForm, contact: e.target.value })}
                  placeholder="0912345678"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateChildModal(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Tạo Học Sinh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT USER ─────────────────────────────────────────────────── */}
      {editUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Edit className="text-purple-400" size={20} />
                <span>Chỉnh Sửa Tài Khoản ({editUserModal.role})</span>
              </h2>
              <button onClick={() => setEditUserModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Họ và tên *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              {editUserModal.role !== 'CHILD' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Lớp học phân bổ
                </label>
                <select
                  value={editForm.assignedClass}
                  onChange={(e) => setEditForm({ ...editForm, assignedClass: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="">-- Chưa gán lớp --</option>
                  {classrooms.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.ageGroupCode} tuổi)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Liên hệ / SĐT
                </label>
                <input
                  type="text"
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditUserModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RESET PIN ─────────────────────────────────────────────────── */}
      {resetPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Key className="text-indigo-400" size={20} />
                <span>Đặt Lại Mã PIN Bé</span>
              </h2>
              <button onClick={() => setResetPinModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Học sinh: <span className="text-white font-bold">{resetPinModal.name}</span>
            </p>

            <form onSubmit={handleResetPinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 text-center">
                  Nhập mã PIN 4 chữ số mới
                </label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  autoFocus
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xl font-mono tracking-widest text-center focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPinModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Xác Nhận Đổi PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: BULK CREATE CHILDREN FROM EXCEL ──────────────────────── */}
      {bulkImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-md">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Tạo Hàng Loạt Học Sinh Từ File Excel</h2>
                  <p className="text-xs text-slate-400">
                    Tải danh sách học sinh từ file (.xlsx, .xls, .csv), tự sinh tài khoản và mã PIN đăng nhập
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
              {/* Top Configuration Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Xếp vào lớp học (Tùy chọn)
                  </label>
                  <select
                    value={bulkTargetClass}
                    onChange={(e) => setBulkTargetClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Để trống (Chưa xếp lớp) --</option>
                    {classrooms.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.ageGroupCode} tuổi - GV: {c.teacher?.name || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Độ tuổi mặc định nếu file thiếu
                  </label>
                  <select
                    value={bulkDefaultAgeGroup}
                    onChange={(e) => setBulkDefaultAgeGroup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="3-4">3-4 Tuổi (Mầm)</option>
                    <option value="4-5">4-5 Tuổi (Chồi)</option>
                    <option value="5-6">5-6 Tuổi (Lá)</option>
                  </select>
                </div>
              </div>

              {/* Upload & Sample Template Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">Chọn file Excel học sinh</span>
                    <span className="text-[11px] text-slate-400">
                      Hỗ trợ cột: "Họ và tên", "Ngày sinh", "Mã PIN", "SĐT Phụ huynh", "Nhóm tuổi"
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={downloadSampleExcelTemplate}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto shrink-0 shadow-sm"
                  >
                    <Download size={13} />
                    <span>Tải file Excel mẫu (.xlsx)</span>
                  </button>
                </div>

                <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/60 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40 group">
                  <UploadCloud size={32} className="text-slate-500 group-hover:text-indigo-400 transition-colors mb-1.5" />
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                    {bulkExcelFileName ? bulkExcelFileName : 'Nhấp để chọn file Excel (.xlsx, .xls, .csv)'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Dung lượng tối đa 10MB</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleBulkFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Preview Table */}
              {bulkExcelRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-indigo-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Danh sách học sinh xem trước ({bulkExcelRows.length} em)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 size={11} />
                        {bulkExcelRows.filter((r) => r.isValid).length} hợp lệ
                      </span>
                      {bulkExcelRows.some((r) => !r.isValid) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertTriangle size={11} />
                          {bulkExcelRows.filter((r) => !r.isValid).length} lỗi
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 sticky top-0 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-2.5">#</th>
                          <th className="py-2 px-2.5">Họ và tên *</th>
                          <th className="py-2 px-2.5">Ngày sinh</th>
                          <th className="py-2 px-2.5">Mã PIN</th>
                          <th className="py-2 px-2.5">Nhóm tuổi</th>
                          <th className="py-2 px-2.5">SĐT Phụ huynh</th>
                          <th className="py-2 px-2.5 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {bulkExcelRows.map((row) => (
                          <tr
                            key={row.id}
                            className={!row.isValid ? 'bg-rose-950/20 text-rose-300' : 'hover:bg-slate-900/50 text-slate-300'}
                          >
                            <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">{row.index}</td>
                            <td className="py-2 px-2.5 font-bold text-white">
                              {row.name || '(Trống)'}
                              {!row.isValid && (
                                <span className="ml-1 px-1 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  {row.error}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{row.dob || '—'}</td>
                            <td className="py-2 px-2.5 font-mono text-[11px]">
                              {row.pin ? (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                  {row.pin}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Tự sinh 4 số</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 font-bold text-slate-400 text-[11px]">{row.ageGroupCode}</td>
                            <td className="py-2 px-2.5 text-slate-400 text-[11px]">{row.contact || '—'}</td>
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setBulkExcelRows(bulkExcelRows.filter((r) => r.id !== row.id))}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                                title="Xóa dòng này"
                              >
                                <X size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {bulkExcelRows.filter((r) => r.isValid).length > 0
                    ? `Sẵn sàng tạo ${bulkExcelRows.filter((r) => r.isValid).length} tài khoản học sinh`
                    : 'Chưa có dòng dữ liệu hợp lệ'}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSubmittingBulk}
                    onClick={() => setBulkImportModalOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={bulkExcelRows.filter((r) => r.isValid).length === 0 || isSubmittingBulk}
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {isSubmittingBulk ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Đang xử lý tạo tài khoản...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={15} />
                        <span>Tạo {bulkExcelRows.filter((r) => r.isValid).length} Tài Khoản Học Sinh</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hồ sơ Năng lực 3 Trụ Cột (Passport) */}
      {competencyStudent && (
        <StudentCompetencyModal
          isOpen={!!competencyStudent}
          onClose={() => setCompetencyStudent(null)}
          student={competencyStudent}
          stats={competencyStudent.stats}
        />
      )}
    </div>
  );
};
