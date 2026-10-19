import React, { useEffect, useState } from 'react';
import {
  School,
  Users,
  UserCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  UserPlus,
  UserMinus,
  Check,
  X,
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';

export const AdminClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editClassModal, setEditClassModal] = useState<any | null>(null);
  const [assignTeacherModal, setAssignTeacherModal] = useState<any | null>(null);
  const [manageStudentsModal, setManageStudentsModal] = useState<any | null>(null);

  // Safe Delete Modal states
  const [deleteTargetClass, setDeleteTargetClass] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial excel student import for create class
  const [createExcelRows, setCreateExcelRows] = useState<any[]>([]);
  const [createExcelFileName, setCreateExcelFileName] = useState('');
  const [exportingClassId, setExportingClassId] = useState<string | null>(null);

  // Form states for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    ageGroupCode: '3-4',
    teacherId: '',
    academicYear: '2026-2027',
    description: '',
    status: 'ACTIVE'
  });

  // Selected teacher in teacher assign modal
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  // Unassigned students for student assign modal
  const [unassignedStudents, setUnassignedStudents] = useState<any[]>([]);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState('');
  const [studentActionLoading, setStudentActionLoading] = useState(false);

  // Status/Alert message
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, teacherRes] = await Promise.all([
        adminApi.getClassrooms(),
        adminApi.getUsers({ role: 'TEACHER', limit: 100 })
      ]);
      if (classRes.success) setClassrooms(classRes.data);
      if (teacherRes.success) setTeachers(teacherRes.data);
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tải danh sách lớp học.');
    } finally {
      setLoading(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      ageGroupCode: '3-4',
      teacherId: teachers[0]?._id || '',
      academicYear: '2026-2027',
      description: '',
      status: 'ACTIVE'
    });
    setCreateExcelRows([]);
    setCreateExcelFileName('');
    setCreateModalOpen(true);
  };

  // Submit Create Class with optional initial Excel students
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('error', 'Vui lòng nhập tên lớp học.');
      return;
    }
    try {
      const validStudents = createExcelRows.filter(r => r.isValid);
      const payload: any = { ...formData };
      if (validStudents.length > 0) {
        payload.students = validStudents.map(r => ({
          name: r.name,
          dob: r.dob,
          pin: r.pin || undefined,
          contact: r.contact,
          notes: r.notes
        }));
      }

      const res = await adminApi.createClassroom(payload);
      if (res.success) {
        showAlert(
          'success',
          res.message ||
            `Đã tạo thành công lớp ${formData.name}! ${validStudents.length > 0 ? `(Đã nạp ${validStudents.length} học sinh)` : ''}`
        );
        setCreateModalOpen(false);
        setCreateExcelRows([]);
        setCreateExcelFileName('');
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Tạo lớp học thất bại.');
    }
  };

  // Open Edit Class Modal
  const handleOpenEdit = (c: any) => {
    setEditClassModal(c);
    setFormData({
      name: c.name,
      ageGroupCode: c.ageGroupCode,
      teacherId: c.teacher?._id || '',
      academicYear: c.academicYear || '2026-2027',
      description: c.description || '',
      status: c.status || 'ACTIVE'
    });
  };

  // Submit Edit Class
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassModal) return;
    try {
      const res = await adminApi.updateClassroom(editClassModal._id, formData);
      if (res.success) {
        showAlert('success', `Đã cập nhật thông tin lớp ${formData.name}!`);
        setEditClassModal(null);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Cập nhật lớp học thất bại.');
    }
  };

  // Open Assign Teacher Modal
  const handleOpenAssignTeacher = (c: any) => {
    setAssignTeacherModal(c);
    setSelectedTeacherId(c.teacher?._id || '');
  };

  // Submit Teacher Reassignment
  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTeacherModal || !selectedTeacherId) {
      showAlert('error', 'Vui lòng chọn một giáo viên.');
      return;
    }
    try {
      const res = await adminApi.assignTeacher(assignTeacherModal._id, selectedTeacherId);
      if (res.success) {
        showAlert('success', res.message || 'Đã phân công giáo viên thành công!');
        setAssignTeacherModal(null);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Điều chuyển giáo viên thất bại.');
    }
  };

  // Open Manage Students Modal
  const handleOpenManageStudents = async (c: any) => {
    setManageStudentsModal(c);
    setStudentActionLoading(true);
    try {
      const res = await adminApi.getClassroomById(c._id);
      if (res.success) {
        setManageStudentsModal(res.data);
      }
      // Load unassigned students
      const unassignedRes = await adminApi.getUnassignedStudents({ ageGroupCode: c.ageGroupCode });
      if (unassignedRes.success) {
        setUnassignedStudents(unassignedRes.data);
        if (unassignedRes.data.length > 0) {
          setSelectedStudentToAdd(unassignedRes.data[0]._id);
        } else {
          setSelectedStudentToAdd('');
        }
      }
    } catch (err: any) {
      console.warn('Could not load detailed classroom info', err);
    } finally {
      setStudentActionLoading(false);
    }
  };

  // Add Student to Classroom
  const handleAddStudent = async () => {
    if (!manageStudentsModal || !selectedStudentToAdd) {
      showAlert('error', 'Vui lòng chọn một học sinh để thêm.');
      return;
    }
    try {
      setStudentActionLoading(true);
      const res = await adminApi.addStudentToClassroom(manageStudentsModal._id, selectedStudentToAdd);
      if (res.success) {
        showAlert('success', res.message || 'Đã thêm học sinh vào lớp!');
        // Refresh modal data
        await handleOpenManageStudents(manageStudentsModal);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Thêm học sinh vào lớp thất bại.');
      setStudentActionLoading(false);
    }
  };

  // Remove Student from Classroom
  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!manageStudentsModal) return;
    if (!window.confirm(`Bạn có chắc muốn chuyển học sinh "${studentName}" ra khỏi lớp ${manageStudentsModal.name}?`)) {
      return;
    }
    try {
      setStudentActionLoading(true);
      const res = await adminApi.removeStudentFromClassroom(manageStudentsModal._id, studentId);
      if (res.success) {
        showAlert('success', res.message || 'Đã chuyển học sinh ra khỏi lớp.');
        await handleOpenManageStudents(manageStudentsModal);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Gỡ học sinh khỏi lớp thất bại.');
      setStudentActionLoading(false);
    }
  };

  // Delete confirmation & execution
  const handleOpenDeleteModal = (c: any) => {
    setDeleteTargetClass(c);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetClass || deleteConfirmText.trim().toLowerCase() !== 'delete') return;
    try {
      setIsDeleting(true);
      const res = await adminApi.deleteClassroom(deleteTargetClass._id);
      if (res.success) {
        showAlert('success', res.message || 'Đã xóa vĩnh viễn lớp học thành công.');
        setDeleteTargetClass(null);
        setDeleteConfirmText('');
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa lớp học.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Status helpers
  const getStatusBadge = (status: string = 'ACTIVE') => {
    switch (status) {
      case 'ACTIVE':
        return {
          label: 'Đang hoạt động',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        };
      case 'UPCOMING':
        return {
          label: 'Sắp khai giảng',
          color: 'bg-sky-500/15 text-sky-400 border-sky-500/30'
        };
      case 'COMPLETED':
        return {
          label: 'Đã hoàn thành',
          color: 'bg-purple-500/15 text-purple-400 border-purple-500/30'
        };
      case 'INACTIVE':
      default:
        return {
          label: 'Vô hiệu hóa',
          color: 'bg-slate-700/40 text-slate-400 border-slate-600/40'
        };
    }
  };

  const handleQuickChangeStatus = async (c: any, newStatus: string) => {
    try {
      const res = await adminApi.updateClassroom(c._id, { status: newStatus });
      if (res.success) {
        showAlert('success', `Đã cập nhật trạng thái lớp "${c.name}" sang: ${getStatusBadge(newStatus).label}`);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể cập nhật trạng thái lớp.');
    }
  };

  // ── EXCEL / CSV HELPERS (CREATE CLASSROOM IMPORT & EXISTING CLASSROOM EXPORT) ───
  const handleFileUploadForCreate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCreateExcelFileName(file.name);
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
          setCreateExcelRows([]);
          return;
        }

        const parsed = rawData.map((row, index) => {
          const name = (
            row['Họ và tên'] ||
            row['Họ tên'] ||
            row['Tên'] ||
            row['fullName'] ||
            row['name'] ||
            ''
          ).toString().trim();

          let dobStr = '';
          const rawDob = row['Ngày sinh'] || row['dob'] || row['birthDate'] || '';
          if (rawDob instanceof Date) {
            dobStr = rawDob.toISOString().split('T')[0];
          } else if (rawDob) {
            dobStr = rawDob.toString().trim();
          }

          let pinStr = (
            row['Mã PIN (4 số)'] ||
            row['Mã PIN'] ||
            row['PIN'] ||
            row['pin'] ||
            ''
          ).toString().trim();

          const contact = (
            row['SĐT Phụ huynh'] ||
            row['Số điện thoại'] ||
            row['SĐT'] ||
            row['contact'] ||
            row['phone'] ||
            ''
          ).toString().trim();

          const notes = (row['Ghi chú'] || row['notes'] || '').toString().trim();

          const isValid = !!name;
          const error = !name ? 'Thiếu họ và tên học sinh' : '';

          return {
            id: `row-${index}`,
            index: index + 1,
            name,
            dob: dobStr,
            pin: pinStr,
            contact,
            notes,
            isValid,
            error
          };
        });

        setCreateExcelRows(parsed);
        const validCount = parsed.filter(p => p.isValid).length;
        showAlert('success', `Đã đọc thành công ${parsed.length} dòng (${validCount} hợp lệ) từ file.`);
      } catch (err: any) {
        console.error('Error reading excel/csv file', err);
        showAlert('error', 'Không thể đọc file. Vui lòng kiểm tra định dạng file Excel hoặc CSV.');
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleRemoveCreateRow = (id: string) => {
    setCreateExcelRows(prev => prev.filter(r => r.id !== id));
  };

  const handleClearCreateRows = () => {
    setCreateExcelRows([]);
    setCreateExcelFileName('');
  };

  // Export existing classroom student roster to CSV format with UTF-8 BOM
  const handleExportClassroomCsv = async (c: any) => {
    try {
      setExportingClassId(c._id);
      // Fetch full details of classroom including populated students
      const res = await adminApi.getClassroomById(c._id);
      const classroomData = res.success ? res.data : c;
      const studentsList = classroomData.students || [];

      if (studentsList.length === 0) {
        showAlert('error', `Lớp ${c.name} hiện chưa có học sinh nào để xuất file CSV.`);
        return;
      }

      const exportData = studentsList.map((st: any, idx: number) => ({
        'STT': idx + 1,
        'Họ và tên': st.name || '',
        'Tên đăng nhập / Mã HS': st.username || '',
        'Mã PIN': st.pin || '••••',
        'Ngày sinh': st.dob ? new Date(st.dob).toLocaleDateString('vi-VN') : '',
        'Nhóm tuổi': classroomData.ageGroupCode ? `${classroomData.ageGroupCode} tuổi` : '',
        'Lớp học': classroomData.name || c.name,
        'Giáo viên chủ nhiệm': classroomData.teacher?.name || 'Chưa phân công',
        'Năm học': classroomData.academicYear || '2026-2027',
        'SĐT Phụ huynh': st.contact || st.parentContact || '',
        'Trạng thái': st.status === 'ACTIVE' ? 'Đang học' : 'Tạm dừng'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csvOutput = XLSX.utils.sheet_to_csv(ws);

      // Prepend UTF-8 BOM (\uFEFF) so Excel and text editors properly render Vietnamese characters
      const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
      const safeName = (c.name || 'Lop').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
      const safeYear = (c.academicYear || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Danh_Sach_Lop_${safeName}_${safeYear}.csv`;

      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showAlert('success', `Đã tải xuống danh sách ${studentsList.length} học sinh lớp ${c.name} (file .csv chuẩn UTF-8)!`);
    } catch (err: any) {
      console.error('Export error', err);
      showAlert('error', 'Không thể xuất file CSV: ' + (err?.message || 'Lỗi'));
    } finally {
      setExportingClassId(null);
    }
  };

  const filteredClassrooms = classrooms.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.teacher?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (c.academicYear && c.academicYear.includes(search));
    const matchAge = filterAge === 'ALL' || c.ageGroupCode === filterAge;
    const matchStatus = filterStatus === 'ALL' || (c.status || 'ACTIVE') === filterStatus;
    return matchSearch && matchAge && matchStatus;
  });

  const getAgeBadge = (code: string) => {
    switch (code) {
      case '3-4':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">3-4 Tuổi (Mầm)</span>;
      case '4-5':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20">4-5 Tuổi (Chồi)</span>;
      case '5-6':
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">5-6 Tuổi (Lá)</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">{code}</span>;
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
            <School className="text-indigo-400" size={26} />
            <span>Phân Lớp & Điều Chuyển Giáo Viên</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Quản trị viên phân quyền giáo viên đứng lớp, thêm sửa xóa danh sách học sinh theo từng lớp học.
          </p>
        </div>
        <button
          id="btn-create-classroom"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Tạo Lớp Học Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp hoặc giáo viên..."
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Độ tuổi:</span>
            {['ALL', '3-4', '4-5', '5-6'].map((age) => (
              <button
                key={age}
                onClick={() => setFilterAge(age)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterAge === age
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {age === 'ALL' ? 'Tất cả' : `${age} tuổi`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Trạng thái:</span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ACTIVE', label: '🟢 Hoạt động' },
              { id: 'UPCOMING', label: '🔵 Sắp mở' },
              { id: 'COMPLETED', label: '🟣 Hoàn thành' },
              { id: 'INACTIVE', label: '⚪ Tạm dừng' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Classroom Table / List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <School size={40} className="mx-auto text-slate-600 mb-3" />
          <p className="text-sm font-bold text-slate-300">Không tìm thấy lớp học nào phù hợp</p>
          <p className="text-xs text-slate-500 mt-1">Hãy tạo lớp học mới hoặc thay đổi bộ lọc tìm kiếm.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredClassrooms.map((c) => {
            const studentCount = Array.isArray(c.students) ? c.students.length : 0;
            return (
              <div
                key={c._id}
                className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-lg font-black text-white">{c.name}</h2>
                        {getAgeBadge(c.ageGroupCode)}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-slate-500" />
                        <span>Năm học: {c.academicYear || '2025-2026'}</span>
                      </p>
                    </div>

                    <div className="flex items-center">
                      <select
                        value={c.status || 'ACTIVE'}
                        onChange={(e) => handleQuickChangeStatus(c, e.target.value)}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border cursor-pointer focus:outline-none transition-all ${
                          getStatusBadge(c.status).color
                        } bg-slate-950`}
                        title="Nhấp để đổi trạng thái lớp học"
                      >
                        <option value="ACTIVE" className="bg-slate-900 text-emerald-400">🟢 Đang hoạt động</option>
                        <option value="UPCOMING" className="bg-slate-900 text-sky-400">🔵 Sắp khai giảng</option>
                        <option value="COMPLETED" className="bg-slate-900 text-purple-400">🟣 Đã hoàn thành</option>
                        <option value="INACTIVE" className="bg-slate-900 text-slate-400">⚪ Vô hiệu hóa</option>
                      </select>
                    </div>
                  </div>

                  {/* Teacher in Charge Card */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                        {c.teacher?.name?.[0] || 'T'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giáo viên phụ trách</p>
                        <p className="text-xs font-bold text-white">{c.teacher?.name || 'Chưa phân công giáo viên'}</p>
                        <p className="text-[10px] text-slate-400">{c.teacher?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <button
                      id="btn-assign-teacher"
                      onClick={() => handleOpenAssignTeacher(c)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-xs border border-indigo-500/30 transition-all flex items-center gap-1.5"
                    >
                      <UserCheck size={14} />
                      <span>Đổi giáo viên</span>
                    </button>
                  </div>

                  {/* Student Statistics */}
                  <div className="mt-4 flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-400" />
                      <span className="text-slate-300 font-semibold">Sĩ số lớp:</span>
                      <span className="font-black text-white">{studentCount} học sinh</span>
                    </div>
                    {c.description && (
                      <span className="text-slate-500 truncate max-w-[200px]" title={c.description}>
                        {c.description}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <button
                    id="btn-manage-students"
                    onClick={() => handleOpenManageStudents(c)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Users size={14} />
                    <span>Học sinh ({studentCount})</span>
                  </button>

                  <button
                    id={`btn-export-csv-${c._id}`}
                    disabled={exportingClassId === c._id}
                    onClick={() => handleExportClassroomCsv(c)}
                    className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10"
                    title="Tải xuống danh sách học sinh lớp này dưới dạng file CSV (.csv)"
                  >
                    <Download size={14} />
                    <span>{exportingClassId === c._id ? 'Đang xuất...' : 'Xuất CSV'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                      title="Sửa thông tin lớp"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenDeleteModal(c)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                      title="Xóa vĩnh viễn lớp học"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: CREATE CLASSROOM (WITH INITIAL EXCEL STUDENT IMPORT) ───────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-md">
                  <School size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">Tạo Lớp Học Mới</h2>
                  <p className="text-xs text-slate-400">
                    Khai báo thông tin lớp học và tùy chọn nạp sẵn danh sách học sinh từ file Excel
                  </p>
                </div>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <span>1. Thông tin cơ bản lớp học</span>
                </h3>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tên lớp học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ví dụ: Little Stars Class (Age 3-4)"
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Độ tuổi *
                    </label>
                    <select
                      value={formData.ageGroupCode}
                      onChange={(e) => setFormData({ ...formData, ageGroupCode: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="3-4">3-4 Tuổi (Mầm)</option>
                      <option value="4-5">4-5 Tuổi (Chồi)</option>
                      <option value="5-6">5-6 Tuổi (Lá)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Năm học *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      placeholder="2026-2027"
                      className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Trạng thái *
                    </label>
                    <select
                      value={formData.status || 'ACTIVE'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="ACTIVE">🟢 Đang hoạt động</option>
                      <option value="UPCOMING">🔵 Sắp khai giảng</option>
                      <option value="COMPLETED">🟣 Đã hoàn thành</option>
                      <option value="INACTIVE">⚪ Vô hiệu hóa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Giáo viên chủ nhiệm phụ trách *
                  </label>
                  <select
                    required
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- Chọn giáo viên phụ trách --</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Ghi chú / Mô tả lớp học
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ghi chú về lớp học..."
                    className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Excel Student Import Section (Initial Batch) */}
              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <FileSpreadsheet size={15} />
                    <span>2. Nhập danh sách học sinh từ file Excel / CSV (Tùy chọn)</span>
                  </h3>
                  {createExcelRows.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCreateRows}
                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      Xóa file đã chọn
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Tải lên file Excel (.xlsx, .xls) hoặc CSV có sẵn danh sách học sinh. Hệ thống sẽ tự động tạo tài khoản các bé, mã PIN 4 số và thêm vào lớp học mới này.
                </p>

                {/* Direct Excel / CSV Upload Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-dashed border-emerald-500/40 hover:border-emerald-500/70 transition-all flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {createExcelFileName ? createExcelFileName : 'Chọn file Excel hoặc CSV chứa danh sách học sinh'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {createExcelFileName
                          ? `Đã nhận diện: ${createExcelRows.length} học sinh`
                          : 'Cột hỗ trợ: Họ và tên (*), Ngày sinh, Mã PIN, SĐT Phụ huynh'}
                      </p>
                    </div>
                  </div>

                  <label className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer shrink-0">
                    <UploadCloud size={15} />
                    <span>{createExcelFileName ? 'Đổi File Khác' : 'Tải File Lên'}</span>
                    <input
                      type="file"
                      id="input-create-excel"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUploadForCreate}
                      className="sr-only"
                    />
                  </label>
                </div>

                {/* Preview Table if rows exist */}
                {createExcelRows.length > 0 && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold text-slate-300">
                          Xem trước danh sách học sinh ({createExcelRows.length} dòng)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={11} />
                          {createExcelRows.filter(r => r.isValid).length} hợp lệ
                        </span>
                        {createExcelRows.some(r => !r.isValid) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <AlertTriangle size={11} />
                            {createExcelRows.filter(r => !r.isValid).length} lỗi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800/80">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 sticky top-0 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-2.5">#</th>
                            <th className="py-2 px-2.5">Họ và tên *</th>
                            <th className="py-2 px-2.5">Ngày sinh</th>
                            <th className="py-2 px-2.5">Mã PIN</th>
                            <th className="py-2 px-2.5">SĐT Phụ huynh</th>
                            <th className="py-2 px-2.5 text-center">Xóa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                          {createExcelRows.map((row) => (
                            <tr
                              key={row.id}
                              className={`transition-colors ${
                                !row.isValid ? 'bg-rose-950/20 text-rose-300' : 'hover:bg-slate-900/50 text-slate-300'
                              }`}
                            >
                              <td className="py-2 px-2.5 text-slate-500 font-mono text-[11px]">{row.index}</td>
                              <td className="py-2 px-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white">{row.name || '(Trống)'}</span>
                                  {!row.isValid && (
                                    <span className="px-1 py-0.5 rounded text-[9px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                      {row.error}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-slate-400 font-mono text-[11px]">{row.dob || '—'}</td>
                              <td className="py-2 px-2.5">
                                {row.pin ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono text-[11px] border border-indigo-500/20">
                                    {row.pin}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Tự sinh 4 số</span>
                                )}
                              </td>
                              <td className="py-2 px-2.5 text-slate-400 text-[11px]">{row.contact || '—'}</td>
                              <td className="py-2 px-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCreateRow(row.id)}
                                  className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
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
              </div>

              {/* Form Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800 shrink-0">
                <span className="text-xs text-slate-400">
                  {createExcelRows.filter(r => r.isValid).length > 0
                    ? `Sẽ khởi tạo kèm ${createExcelRows.filter(r => r.isValid).length} học sinh vào lớp`
                    : 'Chưa có file Excel: Sẽ tạo lớp trống để thêm học sinh sau'}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    id="btn-submit-create-classroom"
                    className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2"
                  >
                    <School size={15} />
                    <span>
                      {createExcelRows.filter(r => r.isValid).length > 0
                        ? `Tạo Lớp Học (Kèm ${createExcelRows.filter(r => r.isValid).length} Học Sinh)`
                        : 'Tạo Lớp Học'}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ASSIGN / REASSIGN TEACHER ───────────────────────────────── */}
      {assignTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <UserCheck className="text-indigo-400" size={20} />
                <span>Điều Chuyển Giáo Viên</span>
              </h2>
              <button onClick={() => setAssignTeacherModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Lớp học: <span className="text-white font-bold">{assignTeacherModal.name}</span> ({assignTeacherModal.ageGroupCode} tuổi)
            </p>

            <form onSubmit={handleAssignTeacherSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Chọn Giáo Viên Phụ Trách Mới *
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {teachers.map((t) => {
                    const isSelected = selectedTeacherId === t._id;
                    return (
                      <label
                        key={t._id}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="teacherSelect"
                            value={t._id}
                            checked={isSelected}
                            onChange={() => setSelectedTeacherId(t._id)}
                            className="sr-only"
                          />
                          <div className="h-8 w-8 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-400">
                            {t.name?.[0] || 'T'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{t.name}</p>
                            <p className="text-[10px] text-slate-400">{t.email}</p>
                          </div>
                        </div>
                        {isSelected && <Check size={16} className="text-indigo-400" />}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAssignTeacherModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Xác Nhận Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: MANAGE STUDENTS IN CLASSROOM ────────────────────────────── */}
      {manageStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="text-indigo-400" size={20} />
                  <span>Quản Lý Học Sinh — {manageStudentsModal.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Độ tuổi: {manageStudentsModal.ageGroupCode} tuổi • Sĩ số hiện tại:{' '}
                  {manageStudentsModal.students?.length || 0} học sinh
                </p>
              </div>
              <button onClick={() => setManageStudentsModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Quick Add Student bar */}
            <div className="p-4 my-4 rounded-2xl bg-slate-950 border border-slate-800/80 shrink-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <UserPlus size={14} className="text-indigo-400" />
                  <span>Thêm học sinh vào lớp này</span>
                </p>
                <button
                  type="button"
                  id="btn-export-students-modal"
                  disabled={exportingClassId === manageStudentsModal._id}
                  onClick={() => handleExportClassroomCsv(manageStudentsModal)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
                  title="Tải xuống danh sách học sinh lớp này ra file CSV (.csv UTF-8)"
                >
                  <Download size={14} />
                  <span>{exportingClassId === manageStudentsModal._id ? 'Đang xuất...' : 'Xuất danh sách CSV'}</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={selectedStudentToAdd}
                  onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  {unassignedStudents.length === 0 ? (
                    <option value="">Không có học sinh chưa xếp lớp nào trong độ tuổi này</option>
                  ) : (
                    unassignedStudents.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.ageGroupCode} tuổi) - Mã: {s.username || 'N/A'}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  disabled={!selectedStudentToAdd || studentActionLoading}
                  onClick={handleAddStudent}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs whitespace-nowrap transition-all shadow-md shadow-indigo-600/20"
                >
                  {studentActionLoading ? 'Đang thêm...' : 'Thêm vào lớp'}
                </button>
              </div>
            </div>

            {/* Students List in this Class */}
            <div className="flex-1 overflow-y-auto pr-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Danh sách học sinh đang học trong lớp
              </p>
              {!manageStudentsModal.students || manageStudentsModal.students.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Chưa có học sinh nào trong lớp này. Hãy chọn học sinh ở trên để thêm vào lớp.
                </div>
              ) : (
                <div className="space-y-2">
                  {manageStudentsModal.students.map((st: any) => (
                    <div
                      key={st._id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-xs text-indigo-300 shrink-0">
                          {st.avatarUrl ? (
                            <img src={st.avatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            st.name?.[0] || 'C'
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{st.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>Mã: {st.username || 'N/A'}</span>
                            {st.dob && <span>• NS: {new Date(st.dob).toLocaleDateString('vi-VN')}</span>}
                            {st.pin && (
                              <span className="text-indigo-400 font-mono">
                                • PIN: {st.pin.length === 4 ? st.pin : '••••'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={studentActionLoading}
                        onClick={() => handleRemoveStudent(st._id, st.name)}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-all border border-rose-500/20 flex items-center gap-1.5"
                        title="Chuyển học sinh ra khỏi lớp"
                      >
                        <UserMinus size={14} />
                        <span className="hidden sm:inline">Xóa khỏi lớp</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setManageStudentsModal(null)}
                className="px-5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: EDIT CLASSROOM ─────────────────────────────────────────── */}
      {editClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Edit className="text-indigo-400" size={20} />
                <span>Chỉnh Sửa Thông Tin Lớp Học</span>
              </h2>
              <button onClick={() => setEditClassModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tên lớp học *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Độ tuổi *
                  </label>
                  <select
                    value={formData.ageGroupCode}
                    onChange={(e) => setFormData({ ...formData, ageGroupCode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="3-4">3-4 Tuổi (Mầm)</option>
                    <option value="4-5">4-5 Tuổi (Chồi)</option>
                    <option value="5-6">5-6 Tuổi (Lá)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Năm học *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Trạng thái *
                  </label>
                  <select
                    value={formData.status || 'ACTIVE'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">🟢 Đang hoạt động</option>
                    <option value="UPCOMING">🔵 Sắp khai giảng</option>
                    <option value="COMPLETED">🟣 Đã hoàn thành</option>
                    <option value="INACTIVE">⚪ Vô hiệu hóa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Ghi chú / Mô tả lớp học
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditClassModal(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ── MODAL 5: DANGER CONFIRM DELETE CLASSROOM ───────────────────────── */}
      {deleteTargetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl shadow-rose-950/50">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <AlertTriangle size={24} className="text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Xác Nhận Xóa Lớp Học</h2>
                <p className="text-xs text-rose-400/80 font-medium">Hành động xóa vĩnh viễn không thể khôi phục!</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 mb-4">
              <p>
                Bạn đang yêu cầu xóa vĩnh viễn lớp: <strong className="text-white text-sm">"{deleteTargetClass.name}"</strong>
              </p>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                🛡️ <strong>Bảo vệ dữ liệu học sinh:</strong> Tài khoản của {deleteTargetClass.students?.length || 0} học sinh trong lớp sẽ <strong className="underline">không bị xóa</strong> mà được tự động chuyển về danh sách học sinh chưa phân lớp để xếp lớp mới.
              </div>
              <p className="text-slate-400 text-[11px]">
                Lịch học của lớp này cũng sẽ được hệ thống tự động dọn dẹp an toàn.
              </p>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Vui lòng gõ đúng chữ <span className="text-rose-400 font-mono font-black select-all bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">delete</span> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Gõ 'delete' để xác nhận xóa..."
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono text-center tracking-widest"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteTargetClass(null);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteConfirmText.trim().toLowerCase() !== 'delete' || isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Xác nhận xóa vĩnh viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
