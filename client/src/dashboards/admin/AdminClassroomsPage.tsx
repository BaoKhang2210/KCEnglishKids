import { downloadCsv } from '../../utils/downloadCsv';
import { IssuedCredentialsDialog } from '../../components/staff/IssuedCredentialsDialog';
import type { IssuedCredential } from '../../components/staff/IssuedCredentialsDialog';
import { fetchAllPages } from '../../services/adminPagination';
import React, { useEffect, useState, useMemo } from 'react';
import {
  School,
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  UserMinus,
  UserCheck,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Database,
  CalendarDays,
  Clock,
  Radio,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { adminApi } from '../../services/api';

export const AdminClassroomsPage: React.FC = () => {
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [defaultYear, setDefaultYear] = useState('2026-2027');
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAge, setFilterAge] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editClassModal, setEditClassModal] = useState<any | null>(null);
  const [manageStudentsModal, setManageStudentsModal] = useState<any | null>(null);
  const [curriculumProgressModal, setCurriculumProgressModal] = useState<any | null>(null);
  const [deleteTargetClass, setDeleteTargetClass] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetPinTarget, setResetPinTarget] = useState<any | null>(null);
  const [newPinValue, setNewPinValue] = useState('');
  const [resettingPin, setResettingPin] = useState(false);

  // Form states for Create/Edit
  const [formData, setFormData] = useState({
    name: '',
    ageGroupCode: '3-4',
    teacherId: '',
    academicYear: '2026-2027',
    description: '',
    status: 'ACTIVE'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Excel batch import state for existing class
  const [excelImportRows, setExcelImportRows] = useState<any[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelImporting, setExcelImporting] = useState(false);

  // Excel batch import state for CREATE class modal
  const [createExcelRows, setCreateExcelRows] = useState<any[]>([]);
  const [createExcelFileName, setCreateExcelFileName] = useState('');

  // Single individual student admission form (Thêm lẻ học sinh từ tài khoản có sẵn trong hệ thống)
  const [singleStudentTab, setSingleStudentTab] = useState<'excel' | 'single'>('single');
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [availableStudentsLoading, setAvailableStudentsLoading] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentFilterScope, setStudentFilterScope] = useState<'ALL' | 'UNASSIGNED'>('ALL');
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);
  const [showManualCreateFallback, setShowManualCreateFallback] = useState(false);
  const [singleStudentForm, setSingleStudentForm] = useState({
    name: '',
    dob: '',
    pin: '',
    contact: ''
  });
  const [singleStudentSubmitting, setSingleStudentSubmitting] = useState(false);

  // Curriculum progress management state
  const [curriculumData, setCurriculumData] = useState<any | null>(null);
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [classDetailTab, setClassDetailTab] = useState<'schedule' | 'attendance' | 'progress'>('schedule');
  const [sessionAttendanceFilter, setSessionAttendanceFilter] = useState<'ALL' | 'PRESENT_ONLY' | 'ABSENT_ONLY'>('ALL');

  // Toast alert
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, teacherRes, settingsRes] = await Promise.all([
        adminApi.getClassrooms(),
        fetchAllPages<any>(page => adminApi.getUsers({ role: 'TEACHER', limit: 100, page })).then(data => ({ data, users: data })),
        adminApi.getSettings()
      ]);
      setDefaultYear(settingsRes.data.academicYear);
      const cList = Array.isArray(classRes) ? classRes : (classRes?.data || classRes?.classrooms || []);
      const tList = Array.isArray(teacherRes) ? teacherRes : (teacherRes?.data || teacherRes?.users || []);
      setClassrooms(cList);
      setTeachers(tList);
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể tải danh sách lớp học.');
    } finally {
      setLoading(false);
    }
  };

  // Map teachers that already have an active class (1-1 rule check)
  const teacherClassMap = useMemo(() => {
    const map = new Map<string, string>();
    classrooms.forEach((c) => {
      const tId = c.teacher?._id || (typeof c.teacher === 'string' ? c.teacher : null);
      if (tId && ['ACTIVE', 'UPCOMING'].includes(c.status)) {
        map.set(String(tId), c.name);
      }
    });
    return map;
  }, [classrooms]);

  // Open Create Class Modal
  const handleOpenCreate = () => {
    // Find first teacher without an assigned classroom
    const availableTeacher = teachers.find((t) => !teacherClassMap.has(String(t._id)));
    setFormData({
      name: '',
      ageGroupCode: '3-4',
      teacherId: availableTeacher?._id || '',
      academicYear: defaultYear,
      description: '',
      status: 'ACTIVE'
    });
    setCreateExcelRows([]);
    setCreateExcelFileName('');
    setFormError(null);
    setCreateModalOpen(true);
  };

  // Check unique class name
  const validateClassName = (name: string, excludeId?: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return 'Vui lòng nhập tên lớp học.';
    const duplicate = classrooms.find(
      (c) => c.name.trim().toLowerCase() === trimmed && String(c._id) !== String(excludeId)
    );
    if (duplicate) {
      return `Tên lớp "${name.trim()}" đã tồn tại trên hệ thống. Vui lòng chọn tên khác!`;
    }
    return null;
  };

  // Submit Create Class
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameErr = validateClassName(formData.name);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    if (!formData.teacherId) {
      setFormError('Vui lòng phân công một giáo viên phụ trách lớp (quy định 1-1).');
      return;
    }

    // Check teacher 1-1
    const currentClassOfTeacher = teacherClassMap.get(String(formData.teacherId));
    if (currentClassOfTeacher) {
      setFormError(
        `Giáo viên đã được phân công lớp "${currentClassOfTeacher}". Mỗi giáo viên chỉ được phụ trách 1 lớp học!`
      );
      return;
    }

    try {
      setFormSubmitting(true);
      const validStudents = createExcelRows.filter((r) => r.isValid);
      const payload: any = {
        name: formData.name.trim(),
        ageGroupCode: formData.ageGroupCode,
        teacherId: formData.teacherId,
        academicYear: formData.academicYear.trim(),
        description: formData.description.trim(),
        status: formData.status
      };

      if (validStudents.length > 0) {
        payload.students = validStudents.map((r) => ({
          name: r.name,
          dob: r.dob,
          pin: r.pin || undefined,
          contact: r.contact
        }));
      }

      const res = await adminApi.createClassroom(payload);
      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert(
          'success',
          res.message ||
            `Tạo thành công lớp "${formData.name}"! ${
              validStudents.length > 0 ? `(Đã nạp ${validStudents.length} học sinh từ Excel)` : ''
            }`
        );
        setCreateModalOpen(false);
        setCreateExcelRows([]);
        setCreateExcelFileName('');
        await loadData();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Tạo lớp học thất bại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Class Modal
  const handleOpenEdit = (c: any) => {
    setEditClassModal(c);
    setFormData({
      name: c.name,
      ageGroupCode: c.ageGroupCode || '3-4',
      teacherId: c.teacher?._id || '',
      academicYear: c.academicYear || '2026-2027',
      description: c.description || '',
      status: c.status || 'ACTIVE'
    });
    setFormError(null);
  };

  // Submit Edit Class
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClassModal) return;
    setFormError(null);

    const nameErr = validateClassName(formData.name, editClassModal._id);
    if (nameErr) {
      setFormError(nameErr);
      return;
    }

    // Check teacher 1-1 if changing teacher
    if (formData.teacherId && String(formData.teacherId) !== String(editClassModal.teacher?._id)) {
      const assignedClass = teacherClassMap.get(String(formData.teacherId));
      if (assignedClass && assignedClass !== editClassModal.name) {
        setFormError(
          `Giáo viên đã được phân công lớp "${assignedClass}". Mỗi giáo viên chỉ được phụ trách 1 lớp học!`
        );
        return;
      }
    }

    try {
      setFormSubmitting(true);
      const res = await adminApi.updateClassroom(editClassModal._id, formData);
      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert('success', `Đã cập nhật thông tin lớp "${formData.name}" thành công!`);
        setEditClassModal(null);
        await loadData();
      }
    } catch (err: any) {
      setFormError(err?.message || 'Cập nhật lớp học thất bại.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Load available students from system
  const loadAvailableStudents = async () => {
    try {
      setAvailableStudentsLoading(true);
      const res = await fetchAllPages<any>(page => adminApi.getUsers({ role: 'CHILD', limit: 100, page })).then(data => ({ data, users: data }));
      const list = Array.isArray(res) ? res : (res?.data || res?.users || []);
      setAvailableStudents(list);
    } catch (err) {
      console.warn('Could not load available students:', err);
    } finally {
      setAvailableStudentsLoading(false);
    }
  };

  // Open Manage Students Modal for a Class
  const handleOpenManageStudents = async (c: any) => {
    try {
      setManageStudentsModal(c);
      setSingleStudentTab('single');
      setExcelImportRows([]);
      setExcelFileName('');
      setStudentSearchTerm('');
      setSingleStudentForm({ name: '', dob: '', pin: '', contact: '' });
      setShowManualCreateFallback(false);
      loadAvailableStudents();
      // Fetch latest class details
      const res = await adminApi.getClassroomById(c._id);
      if (res.success && res.data) {
        setManageStudentsModal(res.data);
      }
    } catch (err) {
      console.warn('Could not refresh classroom details:', err);
    }
  };

  // Add existing student into classroom (Thêm từ tài khoản có sẵn trong hệ thống)
  const handleAddExistingStudent = async (student: any) => {
    if (!manageStudentsModal) return;
    try {
      setAddingStudentId(student._id);
      const res = await adminApi.addStudentToClassroom(manageStudentsModal._id, student._id);
      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert('success', res.message || `Đã thêm học sinh "${student.name}" vào lớp ${manageStudentsModal.name}!`);
        const refresh = await adminApi.getClassroomById(manageStudentsModal._id);
        if (refresh.success && refresh.data) {
          setManageStudentsModal(refresh.data);
        }
        await loadAvailableStudents();
        await loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể thêm học sinh vào lớp.');
    } finally {
      setAddingStudentId(null);
    }
  };

  // Filter available students for picker
  const filteredAvailableStudents = useMemo(() => {
    return availableStudents.filter((st) => {
      if (studentFilterScope === 'UNASSIGNED') {
        const hasClass = Boolean(st.assignedClass && (typeof st.assignedClass === 'object' ? st.assignedClass._id : st.assignedClass));
        if (hasClass) return false;
      }
      if (studentSearchTerm.trim()) {
        const term = studentSearchTerm.trim().toLowerCase();
        const matchName = st.name?.toLowerCase().includes(term);
        const matchUser = st.username?.toLowerCase().includes(term);
        const matchContact = st.contact?.toLowerCase().includes(term);
        if (!matchName && !matchUser && !matchContact) return false;
      }
      return true;
    });
  }, [availableStudents, studentFilterScope, studentSearchTerm]);

  // Remove Student from Classroom
  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!manageStudentsModal) return;
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa học sinh "${studentName}" ra khỏi lớp ${manageStudentsModal.name}?`
      )
    ) {
      return;
    }
    try {
      const res = await adminApi.removeStudentFromClassroom(manageStudentsModal._id, studentId);
      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert('success', `Đã chuyển học sinh "${studentName}" ra khỏi lớp thành công.`);
        const refresh = await adminApi.getClassroomById(manageStudentsModal._id);
        if (refresh.success) setManageStudentsModal(refresh.data);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Xóa học sinh khỏi lớp thất bại.');
    }
  };

  // Reset Student PIN
  const handleConfirmResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPinTarget || !/^\d{4}$/.test(newPinValue.trim())) {
      showAlert('error', 'Mã PIN mới phải gồm đúng 4 chữ số (0-9).');
      return;
    }
    setResettingPin(true);
    try {
      const res = await adminApi.resetChildPin(resetPinTarget._id, newPinValue.trim());
      if (res.success) {
        showAlert('success', res.message || `Đã đặt lại mã PIN mới thành công cho bé ${resetPinTarget.name}!`);
        setResetPinTarget(null);
        setNewPinValue('');
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Đặt lại mã PIN thất bại.');
    } finally {
      setResettingPin(false);
    }
  };

  // Add individual student (Thêm lẻ học sinh xin vào lớp)
  const handleAddSingleStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageStudentsModal) return;
    if (!singleStudentForm.name.trim()) {
      showAlert('error', 'Vui lòng nhập họ và tên học sinh.');
      return;
    }

    try {
      setSingleStudentSubmitting(true);
      const res = await adminApi.addIndividualStudentToClassroom(manageStudentsModal._id, {
        name: singleStudentForm.name.trim(),
        dob: singleStudentForm.dob || undefined,
        pin: singleStudentForm.pin.trim() || undefined,
        contact: singleStudentForm.contact.trim() || undefined
      });

      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert('success', res.message || `Đã tiếp nhận học sinh "${singleStudentForm.name}" vào lớp!`);
        setSingleStudentForm({ name: '', dob: '', pin: '', contact: '' });
        const refresh = await adminApi.getClassroomById(manageStudentsModal._id);
        if (refresh.success) setManageStudentsModal(refresh.data);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Tiếp nhận học sinh thất bại.');
    } finally {
      setSingleStudentSubmitting(false);
    }
  };

  // Helper parser for Excel file
  const parseExcelFile = (file: File, callback: (rows: any[], fileName: string) => void) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!rawData || rawData.length === 0) {
          showAlert('error', 'File Excel không có dữ liệu học sinh.');
          return;
        }

        const rows = rawData.map((item, idx) => {
          // Clean keys by trimming whitespace
          const cleaned: Record<string, any> = {};
          for (const key of Object.keys(item)) {
            cleaned[key.trim()] = item[key];
          }

          const rawName =
            cleaned['Họ và tên'] ||
            cleaned['Họ tên'] ||
            cleaned['Tên học sinh'] ||
            cleaned['Tên'] ||
            cleaned['FullName'] ||
            cleaned['fullName'] ||
            cleaned['name'] ||
            cleaned['Học sinh'] ||
            '';
          const name = String(rawName).trim();
          const rawDob = cleaned['Ngày sinh'] || cleaned['Ngay sinh'] || cleaned['birthDate'] || cleaned['dob'] || '';
          let dob = '';
          if (rawDob instanceof Date && !isNaN(rawDob.getTime())) {
            dob = rawDob.toISOString().split('T')[0];
          } else if (rawDob) {
            dob = String(rawDob).trim();
          }

          let rawPin = cleaned['Mã PIN'] || cleaned['Mã pin'] || cleaned['PIN'] || cleaned['pin'] || '';
          let pin = String(rawPin).trim();
          if (/^\d{1,3}$/.test(pin)) {
            pin = pin.padStart(4, '0');
          }
          if (!pin || !/^\d{4}$/.test(pin)) {
            pin = String(Math.floor(1000 + Math.random() * 9000));
          }

          const rawContact =
            cleaned['SĐT Phụ huynh'] ||
            cleaned['Số điện thoại'] ||
            cleaned['SĐT'] ||
            cleaned['Điện thoại'] ||
            cleaned['contact'] ||
            cleaned['phone'] ||
            '';

          return {
            stt: idx + 1,
            name,
            dob,
            pin,
            contact: String(rawContact).trim(),
            isValid: Boolean(name)
          };
        });

        callback(rows, file.name);
      } catch (err: any) {
        showAlert('error', 'Không thể đọc file: ' + (err?.message || 'Lỗi định dạng Excel.'));
      }
    };
    reader.readAsBinaryString(file);
  };

  // Excel upload in CREATE modal
  const handleUploadExcelForCreate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file, (rows, fName) => {
      setCreateExcelRows(rows);
      setCreateExcelFileName(fName);
    });
  };

  // Excel upload in MANAGE STUDENTS modal
  const handleUploadExcelForExisting = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseExcelFile(file, (rows, fName) => {
      setExcelImportRows(rows);
      setExcelFileName(fName);
    });
  };

  // Confirm Excel import into existing class
  const handleConfirmImportExcel = async () => {
    if (!manageStudentsModal) return;
    const validRows = excelImportRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      showAlert('error', 'Không có dòng dữ liệu học sinh hợp lệ để nạp.');
      return;
    }

    try {
      setExcelImporting(true);
      const res = await adminApi.importStudentsFromExcel(
        manageStudentsModal._id,
        validRows.map((r) => ({
          name: r.name,
          dob: r.dob,
          pin: r.pin,
          contact: r.contact
        }))
      );

      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert(
          'success',
          res.message || `Đã nạp thành công ${validRows.length} học sinh vào lớp ${manageStudentsModal.name}!`
        );
        setExcelImportRows([]);
        setExcelFileName('');
        const refresh = await adminApi.getClassroomById(manageStudentsModal._id);
        if (refresh.success) setManageStudentsModal(refresh.data);
        loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Nạp danh sách học sinh thất bại.');
    } finally {
      setExcelImporting(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'STT': 1,
        'Họ và tên': 'Nguyễn Gia Bảo',
        'Ngày sinh': '2021-04-15',
        'Giới tính': 'Nam',
        'Mã PIN': '2468',
        'SĐT Phụ huynh': '0901234567'
      },
      {
        'STT': 2,
        'Họ và tên': 'Trần Mai Phương',
        'Ngày sinh': '2021-08-20',
        'Giới tính': 'Nữ',
        'Mã PIN': '3579',
        'SĐT Phụ huynh': '0987654321'
      },
      {
        'STT': 3,
        'Họ và tên': 'Lê Minh Khang',
        'Ngày sinh': '2021-11-05',
        'Giới tính': 'Nam',
        'Mã PIN': '9182',
        'SĐT Phụ huynh': '0912345678'
      }
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Danh_Sach_HS');
    XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh_KCEnglishKids.xlsx');
  };

  // Export Class Roster CSV/Excel
  const handleExportRoster = async (c: any) => {
    try {
      const response = await adminApi.exportClassroomExcel(c._id);
      const rows = response.data || [];
      if (!rows.length) { showAlert('error', 'Lớp chưa có học sinh để xuất.'); return; }
      const keys = Object.keys(rows[0]);
      downloadCsv('Danh_sach_lop_' + c.name.replace(/\s+/g, '_') + '.csv', [keys, ...rows.map((row: any) => keys.map(key => String(row[key] ?? '')))]);
      showAlert('success', 'Đã xuất danh sách ' + rows.length + ' học sinh.');
    } catch (error: any) { showAlert('error', error.message || 'Không xuất được danh sách.'); }
  };

  // Delete Classroom (Cascade Wipe)
  const handleConfirmDelete = async () => {
    if (!deleteTargetClass || deleteConfirmText.trim().toLowerCase() !== 'xoa') return;
    try {
      setIsDeleting(true);
      const res = await adminApi.deleteClassroom(deleteTargetClass._id);
      if (res.success) {
        if (res.credentials?.length) setIssuedCredentials(res.credentials);
        showAlert('success', res.message || `Đã xóa sạch lớp "${deleteTargetClass.name}" thành công.`);
        setDeleteTargetClass(null);
        setDeleteConfirmText('');
        await loadData();
      }
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa lớp học.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Class Detail & Progress Modal for a Class
  const handleOpenCurriculumProgress = async (c: any, initialTab: 'schedule' | 'attendance' | 'progress' = 'schedule') => {
    setCurriculumProgressModal(c);
    setClassDetailTab(initialTab);
    setSessionAttendanceFilter('ALL');
    setCurriculumLoading(true);
    try {
      const res = await adminApi.getClassroomCurriculumProgress(c._id);
      if (res.success && res.data) {
        setCurriculumData(res.data);
      }
    } catch (err: any) {
      showAlert('error', 'Không thể tải chi tiết lớp: ' + (err?.message || 'Lỗi'));
    } finally {
      setCurriculumLoading(false);
    }
  };

  // System Backup Trigger
  const handleTriggerBackup = async () => {
    try {
      setBackingUp(true);
      const res = await adminApi.exportSystemBackup();
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json;charset=utf-8' });
      const downloadUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const timeStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      downloadAnchor.setAttribute('href', downloadUrl);
      downloadAnchor.setAttribute('download', `KCEnglishKids_Backup_${timeStr}.json`);
      try {
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
      } finally {
        downloadAnchor.remove();
        // Release the URL after the browser has started the download.
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      }
      showAlert('success', 'Đã tải xuống gói sao lưu toàn bộ hệ thống (.json) thành công!');
    } catch (err: any) {
      showAlert('error', 'Lỗi khi xuất sao lưu: ' + (err?.message || 'Thất bại'));
    } finally {
      setBackingUp(false);
    }
  };

  // Filtered Classrooms
  const filteredClassrooms = useMemo(() => {
    return classrooms.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.teacher?.name?.toLowerCase().includes(q) ||
        (c.academicYear && c.academicYear.includes(q));
      const matchAge = filterAge === 'ALL' || c.ageGroupCode === filterAge;
      const matchStatus = filterStatus === 'ALL' || (c.status || 'ACTIVE') === filterStatus;
      return matchSearch && matchAge && matchStatus;
    });
  }, [classrooms, search, filterAge, filterStatus]);

  // Classes that had a scheduled slot today but teacher missed / hasn't taught yet
  const missedClasses = useMemo(() => {
    return classrooms.filter((c) => c.todayTeachingStatus === 'MISSED');
  }, [classrooms]);

  // Total statistics
  const totalStudents = useMemo(() => {
    return classrooms.reduce((sum, c) => sum + (c.students?.length || c.studentCount || 0), 0);
  }, [classrooms]);

  return (
    <div className="space-y-7 animate-fade-in text-slate-800">
      <IssuedCredentialsDialog credentials={issuedCredentials} onClose={() => setIssuedCredentials([])} />
      {/* Toast Alert */}
      {alert && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-4 rounded-2xl flex items-center gap-3 text-base font-bold border transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {alert.type === 'success' ? (
            <CheckCircle2 size={22} className="text-emerald-800 shrink-0" />
          ) : (
            <AlertCircle size={22} className="text-rose-800 shrink-0" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 bg-white p-7 rounded-3xl border border-slate-200/90">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-800">
              <School size={28} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Quản lý Lớp học
            </h1>
          </div>
          <p className="text-base text-slate-600 font-semibold max-w-2xl leading-relaxed">
            Quản trị danh sách lớp, phân công 1 giáo viên - 1 lớp học, nạp học sinh trực tiếp bằng file Excel và theo dõi tiến độ từng bài học theo giáo trình chuẩn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={backingUp}
            onClick={handleTriggerBackup}
            className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer border border-slate-200"
            title="Tải toàn bộ cơ sở dữ liệu hệ thống ra file JSON để bảo lưu an toàn"
          >
            <Database size={18} className={backingUp ? 'animate-spin text-indigo-800' : 'text-slate-600'} />
            <span>{backingUp ? 'Đang trích xuất...' : 'Sao Lưu Hệ Thống (Backup)'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-sm sm:text-base flex items-center gap-2.5 transition-all  cursor-pointer"
          >
            <Plus size={20} />
            <span>Tạo Lớp Học Mới</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center shrink-0">
            <School size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">Tổng Lớp Học</p>
            <p className="text-2xl font-black text-slate-900">{classrooms.length} lớp</p>
            <p className="text-xs text-indigo-800 font-bold mt-0.5">
              {classrooms.filter((c) => c.status === 'ACTIVE').length} đang hoạt động
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">Tổng Học Sinh</p>
            <p className="text-2xl font-black text-slate-900">{totalStudents} bé</p>
            <p className="text-xs text-emerald-800 font-bold mt-0.5">Đã phân bổ theo lớp</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
            <Sparkles size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">Quy Tắc Giáo Viên</p>
            <p className="text-2xl font-black text-slate-900">1 Giáo Viên - 1 Lớp</p>
            <p className="text-xs text-amber-800 font-bold mt-0.5">
              {teacherClassMap.size}/{teachers.length} giáo viên đã nhận lớp
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
            <BookOpen size={28} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">Giáo Trình Chuẩn</p>
            <p className="text-2xl font-black text-slate-900">3 Khung Tuổi</p>
            <p className="text-xs text-teal-800 font-bold mt-0.5">Mầm (3-4), Chồi (4-5), Lá (5-6)</p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ──────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên lớp, giáo viên hoặc năm học..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-base font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value)}
            className="py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base font-bold focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="ALL">Tất cả nhóm tuổi ({classrooms.length})</option>
            <option value="3-4">3–4 Tuổi (Mầm)</option>
            <option value="4-5">4–5 Tuổi (Chồi)</option>
            <option value="5-6">5–6 Tuổi (Lá)</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base font-bold focus:outline-none focus:border-indigo-500 transition-all"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">🟢 Đang hoạt động</option>
            <option value="UPCOMING">🔵 Sắp khai giảng</option>
            <option value="COMPLETED">🟣 Đã hoàn thành</option>
            <option value="INACTIVE">⚪ Vô hiệu hóa</option>
          </select>
        </div>
      </div>

      {/* ── Cảnh báo Giảng dạy Hôm nay (MISSED SCHEDULE ALERT) ── */}
      {missedClasses.length > 0 && (
        <div className="p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <AlertTriangle size={26} />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-black text-rose-900 flex items-center gap-2">
                <span>CẢNH BÁO GIẢNG DẠY HÔM NAY: Có {missedClasses.length} lớp học chưa vào dạy!</span>
              </h4>
              <p className="text-xs sm:text-sm font-semibold text-rose-800 mt-1">
                Lớp có lịch học nhưng quá giờ chưa ghi nhận buổi dạy: {missedClasses.map((c) => `${c.name} (${c.todayTeachingNote || 'Chưa dạy'})`).join(', ')}. Admin vui lòng kiểm tra ngay!
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {missedClasses.map((c) => (
              <button
                key={c._id}
                type="button"
                onClick={() => handleOpenCurriculumProgress(c, 'schedule')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <AlertTriangle size={14} />
                <span>Kiểm tra {c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Classroom Cards Grid ──────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-600">Đang tải danh sách lớp học và phân công giáo viên…</p>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
          <School size={48} className="mx-auto text-slate-700 mb-3" />
          <h3 className="text-xl font-black text-slate-800">Không tìm thấy lớp học nào</h3>
          <p className="text-base text-slate-600 font-semibold mt-1 max-w-md mx-auto">
            Chưa có lớp học nào phù hợp với bộ lọc hiện tại. Bấm vào nút bên dưới để tạo lớp học đầu tiên!
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-bold text-base cursor-pointer"
          >
            + Tạo Lớp Học Ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClassrooms.map((c) => {
            const studentCount = c.students?.length || c.studentCount || 0;
            const teacherName = c.teacher?.name || 'Chưa phân công';
            const teacherEmail = c.teacher?.email || '';

            return (
              <div
                key={c._id}
                className="bg-white rounded-3xl border border-slate-200/90 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-6 space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 bg-indigo-50 text-indigo-800 border border-indigo-100">
                        {c.ageGroupCode === '3-4'
                          ? 'Mầm (3-4 tuổi)'
                          : c.ageGroupCode === '4-5'
                          ? 'Chồi (4-5 tuổi)'
                          : 'Lá (5-6 tuổi)'}
                      </span>
                      <h3
                        onClick={() => handleOpenCurriculumProgress(c, 'progress')}
                        className="text-xl font-black text-slate-900 tracking-tight leading-snug cursor-pointer hover:text-indigo-700 transition-colors"
                        title="Bấm để xem chi tiết và tiến độ lớp học"
                      >
                        {c.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Năm học: {c.academicYear || '2026-2027'}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : c.status === 'UPCOMING'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status === 'ACTIVE' ? 'Đang học' : c.status === 'UPCOMING' ? 'Sắp mở' : 'Tạm dừng'}
                    </span>
                  </div>

                  {/* Giám sát tình trạng giảng dạy hôm nay */}
                  {c.todayTeachingStatus === 'MISSED' && (
                    <div
                      onClick={() => handleOpenCurriculumProgress(c, 'schedule')}
                      className="px-3.5 py-2.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs font-black flex items-center justify-between gap-2 cursor-pointer hover:bg-rose-100 transition-colors shadow-xs"
                      title="Có lịch học hôm nay nhưng giáo viên chưa vào lớp giảng dạy! Bấm để xem chi tiết"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <AlertTriangle size={17} className="text-rose-600 shrink-0 animate-bounce" />
                        <span className="truncate">⚠️ Có lịch hôm nay: Giáo viên chưa dạy!</span>
                      </div>
                      <span className="underline shrink-0 text-rose-700 font-extrabold text-[11px]">Kiểm tra</span>
                    </div>
                  )}
                  {c.todayTeachingStatus === 'LIVE' && (
                    <div
                      onClick={() => handleOpenCurriculumProgress(c, 'schedule')}
                      className="px-3.5 py-2 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 text-xs font-black flex items-center justify-between gap-2 cursor-pointer hover:bg-sky-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Radio size={16} className="text-sky-600 shrink-0" />
                        <span>🔴 Đang trong giờ dạy trực tiếp</span>
                      </div>
                      <span className="underline shrink-0 text-sky-700 font-extrabold text-[11px]">Chi tiết</span>
                    </div>
                  )}
                  {c.todayTeachingStatus === 'TAUGHT' && (
                    <div
                      onClick={() => handleOpenCurriculumProgress(c, 'schedule')}
                      className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-black flex items-center justify-between gap-2 cursor-pointer hover:bg-emerald-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                        <span className="truncate">✅ Đã dạy xong hôm nay ({c.todaySlots?.[0]?.startTime || ''})</span>
                      </div>
                      <span className="underline shrink-0 text-emerald-800 font-extrabold text-[11px]">Nhật ký</span>
                    </div>
                  )}
                  {c.todayTeachingStatus === 'UPCOMING' && (
                    <div
                      onClick={() => handleOpenCurriculumProgress(c, 'schedule')}
                      className="px-3.5 py-2 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-black flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Clock size={16} className="text-amber-700 shrink-0" />
                        <span className="truncate">⏰ Sắp tới giờ học ({c.todaySlots?.[0]?.startTime || ''})</span>
                      </div>
                      <span className="underline shrink-0 text-amber-800 font-extrabold text-[11px]">Lịch dạy</span>
                    </div>
                  )}
                  {c.todayTeachingStatus === 'NO_SCHEDULE' && (
                    <div className="px-3 py-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-2">
                      <CalendarDays size={14} className="text-slate-500 shrink-0" />
                      <span>📅 Hôm nay không có lịch dạy</span>
                    </div>
                  )}

                  {/* Teacher Assignment Info (Strict 1-1) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                    <div className="text-xs font-black text-slate-600 uppercase tracking-wider">
                      Giáo Viên Chủ Nhiệm (1-1)
                    </div>
                    <div className="flex items-center gap-3 pt-0.5">
                      <div className="h-10 w-10 rounded-xl bg-indigo-700 text-white font-black text-sm flex items-center justify-center shrink-0">
                        {teacherName[0] || 'T'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{teacherName}</p>
                        <p className="text-xs text-slate-600 font-semibold truncate">{teacherEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Class Info Snippet */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Sĩ Số Học Sinh</p>
                      <p className="text-xl font-black text-slate-900 mt-0.5">{studentCount} bé</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-center">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Bài Hiện Tại</p>
                      <p className="text-sm font-black text-indigo-800 mt-1 truncate" title={c.currentLesson?.title || 'Bài 1'}>
                        {c.currentLesson?.title || 'Theo giáo trình'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="p-5 border-t border-slate-100 bg-slate-50/40 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenManageStudents(c)}
                      className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users size={16} />
                      <span>Quản lý Học sinh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCurriculumProgress(c, 'progress')}
                      className="py-2.5 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <BookOpen size={16} />
                      <span>Chi Tiết &amp; Tiến Độ</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => handleExportRoster(c)}
                      className="text-xs font-bold text-slate-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      title="Xuất danh sách học sinh ra file CSV"
                    >
                      <Download size={14} />
                      <span>Xuất Danh Sách</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(c)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                        title="Chỉnh sửa thông tin lớp"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTargetClass(c);
                          setDeleteConfirmText('');
                        }}
                        className="p-2 rounded-xl text-rose-800 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa vĩnh viễn lớp học và toàn bộ học sinh"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL 1: TẠO LỚP HỌC MỚI ──────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-black">
                  <School size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Tạo Lớp Học Mới</h2>
                  <p className="text-sm font-semibold text-slate-600">
                    Khai báo tên lớp độc nhất và phân công 1 giáo viên phụ trách
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-slate-600 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-rose-800" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              {/* Tên lớp */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Tên Lớp Học <span className="text-rose-800">* (Không được trùng lặp)</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Little Stars 3A, Sunny Kindergarten..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-semibold focus:border-indigo-600 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Độ tuổi & Năm học */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                    Độ Tuổi Giảng Dạy <span className="text-rose-800">*</span>
                  </label>
                  <select
                    value={formData.ageGroupCode}
                    onChange={(e) => setFormData({ ...formData, ageGroupCode: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="3-4">3–4 Tuổi (Mầm - Giáo trình Book 1)</option>
                    <option value="4-5">4–5 Tuổi (Chồi - Giáo trình Book 2)</option>
                    <option value="5-6">5–6 Tuổi (Lá - Giáo trình Book 3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                    Niên Khóa / Năm Học <span className="text-rose-800">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.academicYear}
                    onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                    placeholder="2026-2027"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-semibold focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Giáo viên (1-1) */}
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-2">
                  Giáo Viên Phụ Trách <span className="text-rose-800">* (Mỗi GV chỉ có 1 lớp đang hoạt động/sắp mở)</span>
                </label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:border-indigo-600 focus:outline-none"
                >
                  <option value="" disabled>
                    -- Chọn giáo viên phụ trách --
                  </option>
                  {teachers.map((t) => {
                    const assigned = teacherClassMap.get(String(t._id));
                    return (
                      <option
                        key={t._id}
                        value={t._id}
                        disabled={Boolean(assigned)}
                        className={assigned ? 'text-slate-600 italic' : 'text-slate-900 font-bold'}
                      >
                        {t.name} ({t.email}) {assigned ? `[Đã giảng dạy: ${assigned}]` : '✓ Sẵn sàng'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs font-semibold text-slate-600 mt-1.5">
                  Theo quy định của trường, các giáo viên đã có lớp sẽ bị khóa để tránh trùng lịch.
                </p>
              </div>

              {/* Tùy chọn nạp ngay file Excel khi tạo lớp */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-emerald-800" />
                    <span className="text-sm font-black text-slate-900">
                      Nạp sẵn danh sách học sinh từ file Excel (Tùy chọn)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold text-indigo-800 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Tải file mẫu Excel</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0">
                    <UploadCloud size={16} />
                    <span>{createExcelFileName ? 'Đổi File Khác' : 'Chọn File Excel (.xlsx, .csv)'}</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleUploadExcelForCreate}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-xs font-semibold text-slate-600 truncate">
                    {createExcelFileName
                      ? `Đã nhận: ${createExcelFileName} (${createExcelRows.filter((r) => r.isValid).length} học sinh)`
                      : 'Chưa chọn file (có thể nạp sau)'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="py-3 px-7 rounded-2xl bg-indigo-700 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-base cursor-pointer"
                >
                  {formSubmitting ? 'Đang tạo lớp...' : 'Xác Nhận Tạo Lớp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: CHỈNH SỬA THÔNG TIN LỚP HỌC ──────────────────────────── */}
      {editClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-lg border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-black">
                  <Edit2 size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900">Sửa Lớp: {editClassModal.name}</h2>
              </div>
              <button
                onClick={() => setEditClassModal(null)}
                className="p-1.5 text-slate-600 hover:text-slate-700 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-rose-800" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên Lớp Học *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Giáo Viên Chủ Nhiệm (1-1) *
                </label>
                <select
                  required
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:outline-none focus:border-indigo-600"
                >
                  {teachers.map((t) => {
                    const assigned = teacherClassMap.get(String(t._id));
                    const isCurrent = String(editClassModal.teacher?._id) === String(t._id);
                    return (
                      <option
                        key={t._id}
                        value={t._id}
                        disabled={Boolean(assigned) && !isCurrent}
                        className={assigned && !isCurrent ? 'text-slate-600 italic' : 'text-slate-900 font-bold'}
                      >
                        {t.name} ({t.email}) {isCurrent ? '(Đang phụ trách lớp này)' : assigned ? `[Đã có lớp: ${assigned}]` : '✓ Sẵn sàng'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Nhóm Tuổi
                  </label>
                  <select
                    value={formData.ageGroupCode}
                    onChange={(e) => setFormData({ ...formData, ageGroupCode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold"
                  >
                    <option value="3-4">3–4 Tuổi (Mầm)</option>
                    <option value="4-5">4–5 Tuổi (Chồi)</option>
                    <option value="5-6">5–6 Tuổi (Lá)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Trạng Thái
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold"
                  >
                    <option value="ACTIVE">🟢 Đang học</option>
                    <option value="UPCOMING">🔵 Sắp mở</option>
                    <option value="COMPLETED">🟣 Hoàn thành</option>
                    <option value="INACTIVE">⚪ Vô hiệu hóa</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditClassModal(null)}
                  className="py-2.5 px-5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-base cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="py-2.5 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-base cursor-pointer"
                >
                  {formSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: QUẢN LÝ HỌC SINH CỦA LỚP (IMPORT EXCEL & THÊM LẺ) ─────── */}
      {manageStudentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 animate-scale-up">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
                  <Users className="text-indigo-800" size={24} />
                  <span>Quản Lý Học Sinh — {manageStudentsModal.name}</span>
                </h2>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">
                  Độ tuổi: {manageStudentsModal.ageGroupCode} tuổi • Sĩ số hiện tại:{' '}
                  <span className="font-black text-indigo-800">
                    {manageStudentsModal.students?.length || 0} học sinh
                  </span>
                </p>
              </div>
              <button
                onClick={() => setManageStudentsModal(null)}
                className="p-2 text-slate-600 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-header navigation: Import Excel vs Thêm Lẻ Học Sinh */}
            <div className="flex items-center gap-2 mt-4 p-1.5 rounded-2xl bg-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setSingleStudentTab('excel')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  singleStudentTab === 'excel'
                    ? 'bg-white text-indigo-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet size={16} />
                <span>Nạp Danh Sách Từ File Excel (.xlsx, .csv)</span>
              </button>

              <button
                type="button"
                onClick={() => setSingleStudentTab('single')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  singleStudentTab === 'single'
                    ? 'bg-white text-indigo-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck size={16} />
                <span>+ Thêm Lẻ Từ Tài Khoản Có Sẵn ({availableStudents.length})</span>
              </button>
            </div>

            {/* TAB 1: IMPORT FROM EXCEL */}
            {singleStudentTab === 'excel' && (
              <div className="p-4 my-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Import danh sách từ file bảng tính</p>
                    <p className="text-xs text-slate-600 font-semibold">
                      Tự động tạo tài khoản, sinh mã PIN 4 số và gán thẳng vào lớp này.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="py-2 px-3 rounded-xl bg-white text-indigo-800 font-bold text-xs border border-indigo-200 flex items-center gap-1.5 hover:bg-indigo-50 cursor-pointer"
                    >
                      <Download size={13} />
                      <span>Tải file mẫu Excel</span>
                    </button>
                    <label className="py-2 px-3 rounded-xl bg-indigo-700 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                      <UploadCloud size={14} />
                      <span>{excelFileName ? 'Đổi File' : 'Chọn File Excel'}</span>
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleUploadExcelForExisting}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* Preview of rows if selected */}
                {excelImportRows.length > 0 && (
                  <div className="pt-2 border-t border-indigo-100/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Đã nhận diện: {excelImportRows.length} dòng ({excelImportRows.filter((r) => r.isValid).length} hợp lệ)</span>
                      <button
                        type="button"
                        disabled={excelImporting}
                        onClick={handleConfirmImportExcel}
                        className="py-1.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer"
                      >
                        {excelImporting ? 'Đang nạp...' : '✓ Xác Nhận Nạp Tất Cả Vào Lớp'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: THÊM LẺ TỪ TÀI KHOẢN CÓ SẴN TRONG HỆ THỐNG */}
            {singleStudentTab === 'single' && (
              <div className="p-4 my-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black text-xs">
                      <UserCheck size={15} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">
                        Chọn Học Sinh Từ Tài Khoản Có Sẵn Trong Hệ Thống
                      </h4>
                      <p className="text-xs font-semibold text-slate-600">
                        Tìm kiếm và bấm 1 chạm để thêm ngay học sinh vào lớp {manageStudentsModal.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStudentFilterScope('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        studentFilterScope === 'ALL'
                          ? 'bg-indigo-700 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Tất Cả ({availableStudents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentFilterScope('UNASSIGNED')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        studentFilterScope === 'UNASSIGNED'
                          ? 'bg-indigo-700 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Chưa Có Lớp ({availableStudents.filter(s => !s.assignedClass || !s.assignedClass?._id).length})
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Tìm theo tên học sinh, mã tài khoản (username) hoặc số điện thoại..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-indigo-600"
                  />
                  {studentSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* List of existing students */}
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {availableStudentsLoading ? (
                    <div className="py-6 text-center text-xs font-bold text-slate-600">
                      <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Đang tải danh sách tài khoản học sinh...
                    </div>
                  ) : filteredAvailableStudents.length === 0 ? (
                    <div className="py-6 text-center text-xs font-semibold text-slate-600 bg-white rounded-xl border border-dashed border-slate-200">
                      Không tìm thấy tài khoản học sinh phù hợp với từ khóa "{studentSearchTerm}".
                    </div>
                  ) : (
                    filteredAvailableStudents.slice(0, 50).map((st: any) => {
                      const currentClassId = typeof st.assignedClass === 'object' ? st.assignedClass?._id : st.assignedClass;
                      const isInThisClass = currentClassId === manageStudentsModal._id ||
                        manageStudentsModal.students?.some((currSt: any) => currSt._id === st._id);
                      const isAdding = addingStudentId === st._id;

                      return (
                        <div
                          key={st._id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-800 font-black text-sm flex items-center justify-center shrink-0">
                              {st.avatarUrl ? (
                                <img src={st.avatarUrl} alt="" className="h-full w-full object-cover rounded-xl" />
                              ) : (
                                st.name?.[0] || 'B'
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 truncate">{st.name}</p>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 mt-0.5">
                                <span className="font-mono text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {st.username || 'Mã N/A'}
                                </span>
                                {st.ageGroupCode && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {st.ageGroupCode} tuổi
                                  </span>
                                )}
                                {isInThisClass ? (
                                  <span className="bg-emerald-50 text-emerald-800 font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Check size={11} /> Đang ở lớp này
                                  </span>
                                ) : st.assignedClass ? (
                                  <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded">
                                    Lớp: {typeof st.assignedClass === 'object' ? st.assignedClass.name : 'Khác'}
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    Chưa có lớp
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isInThisClass ? (
                              <button
                                type="button"
                                disabled
                                className="py-1.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200 cursor-not-allowed opacity-90 flex items-center gap-1"
                              >
                                <Check size={13} />
                                <span>Đã Trong Lớp</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isAdding}
                                onClick={() => handleAddExistingStudent(st)}
                                className={`py-1.5 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                                  st.assignedClass
                                    ? 'bg-amber-700 hover:bg-amber-700 text-white'
                                    : 'bg-indigo-700 hover:bg-indigo-700 text-white'
                                }`}
                              >
                                {isAdding ? (
                                  <>
                                    <div className="h-3 w-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                                    <span>Đang thêm...</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={13} />
                                    <span>{st.assignedClass ? 'Chuyển Vào Lớp Này' : '+ Thêm Vào Lớp'}</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Collapsible Manual Add Fallback */}
                <div className="pt-2 border-t border-indigo-100/80">
                  <button
                    type="button"
                    onClick={() => setShowManualCreateFallback(!showManualCreateFallback)}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {showManualCreateFallback ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>Hoặc nhập form đăng ký mới nếu học sinh chưa từng có tài khoản trên hệ thống</span>
                  </button>

                  {showManualCreateFallback && (
                    <form onSubmit={handleAddSingleStudent} className="pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                            Họ Và Tên Học Sinh *
                          </label>
                          <input
                            type="text"
                            required
                            value={singleStudentForm.name}
                            onChange={(e) => setSingleStudentForm({ ...singleStudentForm, name: e.target.value })}
                            placeholder="Ví dụ: Hoàng Bảo Nam"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                            Ngày Sinh (Tùy chọn)
                          </label>
                          <input
                            type="date"
                            value={singleStudentForm.dob}
                            onChange={(e) => setSingleStudentForm({ ...singleStudentForm, dob: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase tracking-wider text-slate-600 mb-1">
                            SĐT Phụ Huynh
                          </label>
                          <input
                            type="text"
                            value={singleStudentForm.contact}
                            onChange={(e) => setSingleStudentForm({ ...singleStudentForm, contact: e.target.value })}
                            placeholder="0912345678"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-semibold focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-600 font-semibold italic">
                          Mã PIN 4 số sẽ được hệ thống tạo tự động nếu để trống.
                        </span>
                        <button
                          type="submit"
                          disabled={singleStudentSubmitting}
                          className="py-2 px-5 rounded-xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-xs cursor-pointer"
                        >
                          {singleStudentSubmitting ? 'Đang tạo...' : '+ Tạo Mới & Tiếp Nhận Vào Lớp'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-600 px-1 py-1">
                <span>Danh sách học sinh đang học trong lớp ({manageStudentsModal.students?.length || 0})</span>
                <button
                  type="button"
                  onClick={() => handleExportRoster(manageStudentsModal)}
                  className="text-indigo-800 hover:underline flex items-center gap-1 font-bold lowercase cursor-pointer"
                >
                  <Download size={13} />
                  <span>tải file danh sách (.csv)</span>
                </button>
              </div>

              {!manageStudentsModal.students || manageStudentsModal.students.length === 0 ? (
                <div className="py-16 text-center text-slate-600 font-semibold text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Lớp học hiện tại chưa có học sinh nào. Hãy tải lên file Excel hoặc thêm lẻ học sinh ở trên!
                </div>
              ) : (
                <div className="space-y-2">
                  {manageStudentsModal.students.map((st: any, idx: number) => (
                    <div
                      key={st._id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/60 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="h-7 w-7 rounded-lg bg-white border border-slate-200 text-slate-600 font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-800 font-black text-sm flex items-center justify-center shrink-0">
                          {st.name?.[0] || 'C'}
                        </div>

                        <div>
                          <p className="text-base font-black text-slate-900">{st.name}</p>
                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 mt-0.5">
                            <span className="font-mono text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded">
                              Mã: {st.username || 'N/A'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setResetPinTarget(st);
                                setNewPinValue('');
                              }}
                              className="font-mono text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                              title="Đặt lại mã PIN 4 số cho bé"
                            >
                              <KeyRound size={12} />
                              <span>Đặt lại PIN</span>
                            </button>
                            {st.dob && <span>NS: {new Date(st.dob).toLocaleDateString('vi-VN')}</span>}
                            {st.contact && <span>SĐT: {st.contact}</span>}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(st._id, st.name)}
                        className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Xóa học sinh ra khỏi lớp"
                      >
                        <UserMinus size={14} />
                        <span>Xóa khỏi lớp</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Modal Close */}
            <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setManageStudentsModal(null)}
                className="py-2.5 px-6 rounded-2xl bg-slate-100 hover:bg-white text-inherit font-black text-base cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: CHI TIẾT & TIẾN ĐỘ LỚP HỌC (GIÁO TRÌNH, LỊCH DẠY, HỌC SINH) ──── */}
      {curriculumProgressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 animate-scale-up">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-800 flex items-center justify-center font-black shrink-0">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Chi Tiết &amp; Tiến Độ — {curriculumProgressModal.name}
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
                    {curriculumProgressModal.ageGroupCode === '3-4'
                      ? 'Nhóm 3–4 tuổi (Mầm)'
                      : curriculumProgressModal.ageGroupCode === '4-5'
                      ? 'Nhóm 4–5 tuổi (Chồi)'
                      : 'Nhóm 5–6 tuổi (Lá)'}{' '}
                    • GVCN:{' '}
                    <span className="font-bold text-slate-800">
                      {curriculumData?.classroom?.teacher?.name || 'Chưa phân công'}
                    </span>{' '}
                    • Năm học: {curriculumData?.classroom?.academicYear || '2026-2027'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurriculumProgressModal(null)}
                className="p-2 text-slate-600 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-slate-100 py-3 shrink-0 overflow-x-auto">
              <button
                type="button"
                onClick={() => setClassDetailTab('schedule')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer relative ${
                  classDetailTab === 'schedule'
                    ? 'bg-indigo-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <CalendarDays size={16} />
                <span>Giám Sát Lịch Dạy &amp; Bài Học Hôm Nay</span>
                {curriculumData?.todayStatus?.warning && (
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setClassDetailTab('attendance')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  classDetailTab === 'attendance'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users size={16} />
                <span>Chuyên Cần Của Trẻ Em</span>
                {curriculumData?.recentSessions?.some((s: any) => (s.attendanceStats?.absent || 0) > 0 || (s.attendanceStats?.excused || 0) > 0) && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold ml-0.5">
                    Có vắng
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setClassDetailTab('progress')}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  classDetailTab === 'progress'
                    ? 'bg-teal-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen size={16} />
                <span>Tiến Độ Giáo Trình (36 Bài)</span>
              </button>
            </div>

            {curriculumLoading ? (
              <div className="py-20 text-center">
                <div className="h-10 w-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-base font-bold text-slate-600">Đang tải thông tin lớp học và tiến độ…</p>
              </div>
            ) : !curriculumData ? (
              <div className="py-16 text-center text-slate-600">Không có dữ liệu cho lớp học này.</div>
            ) : (
              <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
                {/* ── TAB 1: TIẾN ĐỘ GIÁO TRÌNH ────────────────────────────── */}
                {classDetailTab === 'progress' && (
                  <div className="space-y-5">
                    {/* Progression banner */}
                    <div className="p-5 rounded-2xl bg-teal-50/80 border border-teal-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-teal-800">
                            {curriculumData.curriculumBook?.title || 'Giáo trình mầm non chuẩn'}
                          </span>
                          <h4 className="text-xl font-black text-slate-900 mt-0.5">
                            Đã hoàn thành {curriculumData.completedCount}/{curriculumData.totalLessons} bài học ({curriculumData.progressPercentage || 0}%)
                          </h4>
                        </div>
                        <div className="sm:text-right bg-white p-3 rounded-xl border border-teal-100 shadow-xs">
                          <p className="text-xs font-bold text-slate-500">Bài đang học hiện tại:</p>
                          <p className="text-sm font-black text-indigo-900 mt-0.5">
                            {curriculumData.currentLesson?.title || 'Chưa thiết lập'}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-teal-200/60 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-teal-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, curriculumData.progressPercentage || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Units and Lessons in Strict Order */}
                    <div className="space-y-4">
                      {curriculumData.units?.map((unit: any) => (
                        <div
                          key={unit._id}
                          className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="h-7 w-7 rounded-lg bg-teal-700 text-white font-black text-xs flex items-center justify-center">
                                U{unit.unitNumber}
                              </span>
                              <h4 className="text-base font-black text-slate-900">
                                Unit {unit.unitNumber}: {unit.bigQuestion}
                              </h4>
                            </div>
                            <span className="text-xs font-bold text-slate-600">
                              {unit.lessons?.length || 0} bài học
                            </span>
                          </div>

                          {/* Lessons in this unit */}
                          <div className="space-y-2 pt-1">
                            {unit.lessons?.map((les: any) => {
                              const isCurrent =
                                String(curriculumData.currentLesson?._id || curriculumData.currentLesson) ===
                                String(les._id);

                              return (
                                <div
                                  key={les._id}
                                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                                    isCurrent
                                      ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                                      : les.isCompleted
                                      ? 'bg-white border-emerald-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`h-6 w-6 rounded-md font-black text-xs flex items-center justify-center ${
                                        isCurrent
                                          ? 'bg-indigo-700 text-white'
                                          : les.isCompleted
                                          ? 'bg-emerald-700 text-white'
                                          : 'bg-slate-200 text-slate-600'
                                      }`}
                                    >
                                      {les.unitOrder}
                                    </span>

                                    <div>
                                      <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                        <span>{les.title}</span>
                                        {isCurrent && (
                                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-indigo-700 text-white uppercase tracking-wider">
                                            Bài đang dạy
                                          </span>
                                        )}
                                        {les.isCompleted && !isCurrent && (
                                          <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-100 text-emerald-800">
                                            Đã dạy ({les.taughtCount || 1} buổi)
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-xs text-slate-600 font-semibold">
                                        {les.vietnameseTitle || 'Chủ đề tiếng Anh tương tác'}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isCurrent ? (
                                      <span className="text-xs font-black text-indigo-900 bg-indigo-100/90 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                                        <span>🎯</span>
                                        <span>Bài Đang Dạy</span>
                                      </span>
                                    ) : les.isCompleted ? (
                                      <span className="text-xs font-black text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <CheckCircle2 size={13} className="text-emerald-700" />
                                        <span>Đã Hoàn Thành</span>
                                      </span>
                                    ) : (
                                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <Clock size={13} className="text-slate-400" />
                                        <span>Chưa Học</span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── TAB 1: GIÁM SÁT LỊCH DẠY & BÀI HỌC HÔM NAY ─────────────────── */}
                {classDetailTab === 'schedule' && (
                  <div className="space-y-6">
                    {/* Tiêu điểm: Đúng hôm nay phải học bài nào? */}
                    <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <span className="p-2 rounded-xl bg-indigo-700 text-white font-black text-xs">
                            <Clock size={16} />
                          </span>
                          <div>
                            <h4 className="text-base font-black text-slate-900">
                              Đúng Hôm Nay Phải Học Đến Bài Nào?
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Hệ thống đối chiếu Thời khóa biểu hôm nay với tiến độ thực tế giảng dạy
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-indigo-100/70 text-indigo-900 font-extrabold text-xs self-start sm:self-auto">
                          📅 {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>

                      {curriculumData.todayStatus?.hasSchedule ? (
                        <div className="space-y-3.5">
                          {/* Bài học quy định của ngày hôm nay */}
                          <div className="p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                Bài Học Quy Định Hôm Nay (Theo TKB)
                              </span>
                              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                                <span>🎯 {curriculumData.todayStatus?.scheduledLesson?.title || curriculumData.currentLesson?.title || 'Bài học theo lộ trình'}</span>
                              </h3>
                              {curriculumData.todayStatus?.scheduledLesson?.vietnameseTitle && (
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                  Chủ đề: {curriculumData.todayStatus.scheduledLesson.vietnameseTitle}
                                </p>
                              )}
                              <p className="text-xs font-bold text-indigo-800 mt-1 flex items-center gap-2">
                                <span>⏰ Khung giờ: {curriculumData.todayStatus?.slots?.[0]?.startTime} – {curriculumData.todayStatus?.slots?.[0]?.endTime}</span>
                                <span>•</span>
                                <span>🏫 {curriculumData.todayStatus?.slots?.[0]?.room || 'Phòng học chính'}</span>
                              </p>
                            </div>

                            <div className="sm:text-right shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <p className="text-xs font-bold text-slate-500">Thứ tự trong giáo trình:</p>
                              <p className="text-lg font-black text-indigo-900 mt-0.5">
                                Bài #{curriculumData.todayStatus?.scheduledLesson?.syllabusOrder || 1} / {curriculumData.totalLessons || 36}
                              </p>
                            </div>
                          </div>

                          {/* Tình trạng đối chiếu thực tế của giáo viên */}
                          {curriculumData.todayStatus?.status === 'MISSED' && (
                            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-2.5">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <AlertTriangle size={22} />
                                </div>
                                <div>
                                  <h4 className="text-base font-black text-rose-900">
                                    ⚠️ CẢNH BÁO: Quá giờ bắt đầu nhưng giáo viên chưa vào lớp dạy bài này!
                                  </h4>
                                  <p className="text-xs text-rose-700 font-bold mt-0.5">
                                    Hôm nay có ca học từ {curriculumData.todayStatus?.slots?.[0]?.startTime} đến {curriculumData.todayStatus?.slots?.[0]?.endTime} nhưng chưa ghi nhận phiên dạy nào.
                                  </p>
                                </div>
                              </div>

                              <div className="p-3.5 rounded-xl bg-white border border-rose-200 text-xs sm:text-sm font-semibold text-rose-900 space-y-1 shadow-xs">
                                <p>
                                  • Giáo viên phụ trách:{' '}
                                  <span className="font-black text-rose-950">
                                    {curriculumData.classroom?.teacher?.name || 'Chưa có thông tin'}
                                  </span>{' '}
                                  (SĐT: <span className="font-bold underline">{curriculumData.classroom?.teacher?.phone || 'Chưa cập nhật'}</span> — Email: {curriculumData.classroom?.teacher?.email || 'N/A'})
                                </p>
                                <p className="text-xs italic text-rose-600 pt-0.5">
                                  * Admin vui lòng liên hệ ngay với giáo viên để xác nhận tình hình hoặc phân công giáo viên dạy thay.
                                </p>
                              </div>
                            </div>
                          )}

                          {curriculumData.todayStatus?.status === 'TAUGHT' && (
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3.5">
                              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                <CheckCircle2 size={22} />
                              </div>
                              <div>
                                <h4 className="text-base font-black text-emerald-900">
                                  ✅ Đã hoàn thành buổi dạy bài này hôm nay!
                                </h4>
                                <p className="text-xs text-emerald-800 font-semibold mt-0.5">
                                  Giáo viên {curriculumData.classroom?.teacher?.name} đã hoàn tất phiên giảng dạy theo đúng bài quy định trên thời khóa biểu.
                                </p>
                              </div>
                            </div>
                          )}

                          {curriculumData.todayStatus?.status === 'LIVE' && (
                            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-300 text-sky-950 flex items-center gap-3.5">
                              <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                                <Radio size={22} className="animate-pulse" />
                              </div>
                              <div>
                                <h4 className="text-base font-black text-sky-900">
                                  🔴 Đang trong giờ dạy trực tiếp bài học này!
                                </h4>
                                <p className="text-xs text-sky-800 font-semibold mt-0.5">
                                  Giáo viên {curriculumData.classroom?.teacher?.name} đang tổ chức tiết học với học sinh trong lớp.
                                </p>
                              </div>
                            </div>
                          )}

                          {curriculumData.todayStatus?.status === 'UPCOMING' && (
                            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center gap-3.5">
                              <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                                <Clock size={22} />
                              </div>
                              <div>
                                <h4 className="text-base font-black text-amber-900">
                                  ⏰ Tiết học hôm nay sắp bắt đầu!
                                </h4>
                                <p className="text-xs text-amber-800 font-semibold mt-0.5">
                                  Khung giờ: {curriculumData.todayStatus?.slots?.[0]?.startTime} – {curriculumData.todayStatus?.slots?.[0]?.endTime}. Giáo viên chuẩn bị vào lớp giảng dạy bài học này.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                            <CalendarDays size={22} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-800">
                              📅 Hôm nay không có lịch học theo thời khóa biểu
                            </h4>
                            <p className="text-xs text-slate-600 font-semibold mt-0.5">
                              Lớp {curriculumProgressModal.name} không có ca dạy vào ngày hôm nay. Buổi học kế tiếp sẽ học bài: <span className="font-bold text-indigo-900">{curriculumData.currentLesson?.title || 'Bài học theo lộ trình'}</span>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thời khóa biểu cố định trong tuần & Bài học gắn vào từng buổi */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <CalendarDays size={16} className="text-indigo-800" />
                          <span>Thời Khóa Biểu Trong Tuần &amp; Bài Học Được Gán</span>
                        </h4>
                        <span className="text-xs font-bold text-indigo-800">
                          {curriculumData.schedule?.weeklySlots?.length || 0} ca học / tuần
                        </span>
                      </div>

                      {(!curriculumData.schedule?.weeklySlots || curriculumData.schedule.weeklySlots.length === 0) ? (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                          Lớp chưa được cài đặt thời khóa biểu cố định. Bấm nút "⚡ Gán Bài Học Vào TKB 3 Lớp" ở trên để tự động phân bổ ngay.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {curriculumData.schedule.weeklySlots.map((slot: any, idx: number) => {
                            const daysMap: Record<number, string> = {
                              1: 'Thứ Hai',
                              2: 'Thứ Ba',
                              3: 'Thứ Tư',
                              4: 'Thứ Năm',
                              5: 'Thứ Sáu',
                              6: 'Thứ Bảy',
                              0: 'Chủ Nhật'
                            };
                            const isToday = slot.dayOfWeek === curriculumData.todayStatus?.dayOfWeek;
                            return (
                              <div
                                key={idx}
                                className={`p-4 rounded-2xl border transition-all ${
                                  isToday
                                    ? curriculumData.todayStatus?.status === 'MISSED'
                                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/30'
                                      : 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-black uppercase tracking-wider ${isToday ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    {daysMap[slot.dayOfWeek] || `Thứ ${slot.dayOfWeek}`}
                                  </span>
                                  {isToday && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                      curriculumData.todayStatus?.status === 'MISSED'
                                        ? 'bg-rose-600 text-white animate-pulse'
                                        : 'bg-indigo-700 text-white'
                                    }`}>
                                      {curriculumData.todayStatus?.status === 'MISSED' ? 'Chưa dạy hôm nay' : 'Hôm nay'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-base font-black text-slate-900 mt-1 flex items-center gap-1.5">
                                  <Clock size={15} className="text-slate-500" />
                                  <span>{slot.startTime} – {slot.endTime}</span>
                                </p>
                                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                  Phòng: {slot.room || 'Phòng học chính'}
                                </p>

                                {/* Gắn bài học của buổi này */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/80">
                                  <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                                    Bài học quy định:
                                  </p>
                                  {(slot.lessonTitle || slot.lesson) ? (
                                    <p className="text-xs font-black text-indigo-950 mt-0.5 truncate" title={slot.lessonTitle || slot.lesson?.title}>
                                      🎯 {slot.lessonTitle || slot.lesson?.title}
                                    </p>
                                  ) : (
                                    <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                      Khung giờ học (Không gán bài cố định)
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Nhật ký các buổi học đã tổ chức gần đây */}
                    <div className="space-y-2.5">
                      <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-700" />
                        <span>Nhật Ký Các Buổi Dạy Gần Đây</span>
                      </h4>

                      {(!curriculumData.recentSessions || curriculumData.recentSessions.length === 0) ? (
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                          Chưa có buổi học nào được ghi nhận tổ chức cho lớp này.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3 whitespace-nowrap">Ngày học</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Khung giờ</th>
                                <th className="py-2.5 px-3 whitespace-nowrap min-w-[200px]">Bài học / Nội dung</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Giáo viên</th>
                                <th className="py-2.5 px-3 text-center whitespace-nowrap">Chuyên cần</th>
                                <th className="py-2.5 px-3 whitespace-nowrap">Trạng thái</th>
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Khen thưởng</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold">
                              {curriculumData.recentSessions.map((s: any) => {
                                const sDate = s.date || s.startedAt || s.createdAt;
                                const dateStr = sDate ? new Date(sDate).toLocaleDateString('vi-VN') : '—';
                                const timeStr = (s.startTime && s.endTime && s.startTime !== '--:--')
                                  ? `${s.startTime} - ${s.endTime}`
                                  : s.startedAt
                                  ? `${new Date(s.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${s.endedAt ? ` - ${new Date(s.endedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : (s.status === 'LIVE' ? ' (Đang dạy)' : '')}`
                                  : 'Theo lịch';
                                const rawLesson = s.lesson?.title || s.lessonTitle || s.title || 'Buổi học';
                                const cleanLessonTitle = String(rawLesson).replace(/^(Buổi học trực tiếp:\s*|Buổi học tương tác:\s*|Buổi học:\s*)/i, '').trim();
                                const vietnameseSub = s.lesson?.vietnameseTitle || (s.lesson?.description && s.lesson.description !== cleanLessonTitle ? s.lesson.description : '');
                                const teacherStr = s.teacherName || s.teacher?.name || 'Giáo viên';
                                const present = s.attendanceStats?.present ?? s.allStudentScores?.filter((x: any) => x.attendance === 'PRESENT').length ?? 0;
                                const total = s.attendanceStats?.total ?? s.allStudentScores?.length ?? 0;
                                const rate = s.attendanceStats?.attendanceRate ?? (total > 0 ? Math.round((present / total) * 100) : 100);
                                const absentCount = s.attendanceStats?.absent ?? s.allStudentScores?.filter((x: any) => x.attendance === 'ABSENT').length ?? 0;
                                const excusedCount = s.attendanceStats?.excused ?? s.allStudentScores?.filter((x: any) => x.attendance === 'EXCUSED').length ?? 0;

                                return (
                                  <tr key={s._id} className="hover:bg-slate-50/70">
                                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                      {dateStr}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                      {timeStr}
                                    </td>
                                    <td className="py-2.5 px-3 min-w-[200px] max-w-[280px]">
                                      <div className="flex flex-col">
                                        <span className="font-black text-indigo-950 text-xs truncate" title={rawLesson}>
                                          📖 {cleanLessonTitle}
                                        </span>
                                        {vietnameseSub && (
                                          <span className="text-[11px] text-slate-500 font-semibold truncate" title={vietnameseSub}>
                                            {vietnameseSub}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-800 whitespace-nowrap">
                                      {teacherStr}
                                    </td>
                                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                      <div className="flex flex-col items-center gap-0.5">
                                        <span className="font-bold text-slate-800 text-[11px]">
                                          {present}/{total} ({rate}%)
                                        </span>
                                        {(absentCount > 0 || excusedCount > 0) && (
                                          <span className="text-[10px] font-black text-rose-600">
                                            {absentCount > 0 ? `${absentCount} vắng` : ''}
                                            {absentCount > 0 && excusedCount > 0 ? ' • ' : ''}
                                            {excusedCount > 0 ? `${excusedCount} phép` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                                        s.status === 'COMPLETED'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : s.status === 'LIVE'
                                          ? 'bg-sky-100 text-sky-800'
                                          : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {s.status === 'COMPLETED' ? 'Đã hoàn thành' : s.status === 'LIVE' ? '🔴 Đang dạy' : s.status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 font-black text-amber-700 text-right whitespace-nowrap">
                                      ⭐ {s.summary?.totalStars || s.averageScore || 0} sao
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
                )}

                {/* ── TAB 2: CHUYÊN CẦN CỦA TRẺ EM (THỐNG KÊ VẮNG/NGHỈ/TRỄ) ──────────── */}
                {classDetailTab === 'attendance' && (() => {
                  const studentsList = curriculumData?.studentAttendanceSummary || (curriculumData?.enrolledStudents || []).map((st: any) => ({
                    student: st,
                    present: 0,
                    excused: 0,
                    absent: 0,
                    late: 0,
                    totalSessions: 0,
                    attendanceRate: 100
                  }));

                  const sessionsList = curriculumData?.recentSessions || [];
                  const totalClassRoster = curriculumData?.enrolledStudents?.length || studentsList.length || 0;
                  const totalSessionsConducted = sessionsList.length;

                  let totalPresentCount = 0;
                  let totalExcusedCount = 0;
                  let totalAbsentCount = 0;
                  let totalLateCount = 0;

                  studentsList.forEach((item: any) => {
                    totalPresentCount += (item.present || 0);
                    totalExcusedCount += (item.excused || 0);
                    totalAbsentCount += (item.absent || 0);
                    totalLateCount += (item.late || 0);
                  });

                  const totalSlotsSum = totalPresentCount + totalExcusedCount + totalAbsentCount + totalLateCount;
                  const classAvgRate = totalSlotsSum > 0 ? Math.round(((totalPresentCount + totalLateCount) / totalSlotsSum) * 100) : 100;

                  const filteredStudents = studentsList.filter((item: any) => {
                    if (sessionAttendanceFilter === 'ABSENT_ONLY') {
                      return (item.absent || 0) > 0 || (item.excused || 0) > 0 || (item.late || 0) > 0;
                    }
                    if (sessionAttendanceFilter === 'PRESENT_ONLY') {
                      return (item.attendanceRate || 100) >= 95;
                    }
                    return true;
                  });

                  const animalEmojis: Record<string, string> = {
                    lion: '🦁', fox: '🦊', koala: '🐨', rabbit: '🐰', panda: '🐼', bear: '🐻', monkey: '🐒', cat: '🐱', dog: '🐶', elephant: '🐘'
                  };

                  return (
                    <div className="space-y-6">
                      {/* KPI Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Sĩ Số Học Sinh</p>
                          <p className="text-2xl font-black text-slate-900 mt-1">{totalClassRoster} bé</p>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Trong danh sách lớp</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
                          <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Tỷ Lệ Chuyên Cần</p>
                          <p className="text-2xl font-black text-emerald-950 mt-1">{classAvgRate}%</p>
                          <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">Mức độ tham gia lớp</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-2xs">
                          <p className="text-[11px] font-black uppercase tracking-wider text-sky-800">Số Buổi Đã Học</p>
                          <p className="text-2xl font-black text-sky-950 mt-1">{totalSessionsConducted} buổi</p>
                          <p className="text-[11px] font-semibold text-sky-800 mt-0.5">Đã tổ chức điểm danh</p>
                        </div>

                        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-2xs">
                          <p className="text-[11px] font-black uppercase tracking-wider text-rose-800">Lượt Vắng / Nghỉ</p>
                          <p className="text-2xl font-black text-rose-950 mt-1">{totalAbsentCount + totalExcusedCount} lượt</p>
                          <p className="text-[11px] font-semibold text-rose-800 mt-0.5">{totalAbsentCount} vắng • {totalExcusedCount} phép • {totalLateCount} trễ</p>
                        </div>
                      </div>

                      {/* Section 1: Thống Kê Chuyên Cần Theo Từng Học Sinh */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                              <Users size={18} className="text-amber-700" />
                              <span>Thống Kê Chuyên Cần Từng Bé</span>
                            </h4>
                            <p className="text-xs text-slate-500 font-semibold mt-0.5">
                              Theo dõi mức độ đi học đầy đủ, số buổi có mặt, vắng nghỉ hoặc đi muộn
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => setSessionAttendanceFilter('ALL')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                sessionAttendanceFilter === 'ALL'
                                  ? 'bg-white text-slate-900 shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Tất cả ({studentsList.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionAttendanceFilter('ABSENT_ONLY')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                sessionAttendanceFilter === 'ABSENT_ONLY'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-rose-700'
                              }`}
                            >
                              Có vắng / nghỉ ({studentsList.filter((x: any) => (x.absent || 0) > 0 || (x.excused || 0) > 0 || (x.late || 0) > 0).length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setSessionAttendanceFilter('PRESENT_ONLY')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                sessionAttendanceFilter === 'PRESENT_ONLY'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-emerald-700'
                              }`}
                            >
                              Đi đủ 100% ({studentsList.filter((x: any) => (x.attendanceRate || 100) >= 95).length})
                            </button>
                          </div>
                        </div>

                        {filteredStudents.length === 0 ? (
                          <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                            Không có học sinh nào phù hợp với bộ lọc chuyên cần đã chọn.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-slate-200">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-3">Học sinh</th>
                                  <th className="py-2.5 px-3">SĐT Phụ huynh</th>
                                  <th className="py-2.5 px-3 text-center">Tổng ca học</th>
                                  <th className="py-2.5 px-3 text-center">Có mặt 🟢</th>
                                  <th className="py-2.5 px-3 text-center">Nghỉ phép 🟡</th>
                                  <th className="py-2.5 px-3 text-center">Vắng mặt 🔴</th>
                                  <th className="py-2.5 px-3 text-center">Đi muộn 🟠</th>
                                  <th className="py-2.5 px-3 text-center">Tỷ lệ chuyên cần</th>
                                  <th className="py-2.5 px-3 text-right">Đánh giá & Ghi chú</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-semibold">
                                {filteredStudents.map((item: any) => {
                                  const st = item.student || item;
                                  const rate = item.attendanceRate ?? 100;
                                  const isPerfect = rate >= 90;
                                  const isGood = rate >= 75 && rate < 90;

                                  return (
                                    <tr key={st._id} className="hover:bg-slate-50/70">
                                      <td className="py-2.5 px-3 font-bold text-slate-900">
                                        <div className="flex items-center gap-2.5">
                                          {st.avatarUrl ? (
                                            <img src={st.avatarUrl} alt={st.name} className="w-7 h-7 rounded-full object-contain shrink-0 border border-slate-200 bg-slate-50" />
                                          ) : (
                                            <span className="text-xl shrink-0">
                                              {animalEmojis[st.avatar] || '🦁'}
                                            </span>
                                          )}
                                          <div>
                                            <p className="font-black text-slate-900 text-xs">{st.name}</p>
                                            <p className="text-[10px] text-slate-500 font-normal">@{st.username || 'user'}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                        {st.contact || st.parentContact || '—'}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                        {item.totalSessions ?? (item.present + item.excused + item.absent + item.late)} buổi
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-emerald-800">
                                        {item.present ?? 0} buổi
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-amber-800">
                                        {item.excused ?? 0} buổi
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-rose-700">
                                        {item.absent ?? 0} buổi
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-bold text-orange-800">
                                        {item.late ?? 0} buổi
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                          isPerfect
                                            ? 'bg-emerald-100 text-emerald-900'
                                            : isGood
                                            ? 'bg-amber-100 text-amber-900'
                                            : 'bg-rose-100 text-rose-900'
                                        }`}>
                                          {rate}%
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                          {isPerfect ? (
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black">
                                              🌟 Chăm ngoan
                                            </span>
                                          ) : isGood ? (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                                              Đạt yêu cầu
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-black">
                                              ⚠️ Cần chú ý
                                            </span>
                                          )}
                                          {item.latestNote && (
                                            <span className="text-[10px] text-slate-500 font-normal italic max-w-[160px] truncate" title={item.latestNote}>
                                              💬 {item.latestNote}
                                            </span>
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

                      {/* Section 2: Nhật Ký Từng Buổi Học — Theo Dõi Học Sinh Vắng/Nghỉ */}
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                          <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                            <Clock size={18} className="text-indigo-800" />
                            <span>Nhật Ký Từng Buổi Học (Danh Sách Vắng / Nghỉ Phép)</span>
                          </h4>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Theo dõi chi tiết từng buổi học cụ thể xem có học sinh nào vắng hoặc nghỉ phép không
                          </p>
                        </div>

                        {sessionsList.length === 0 ? (
                          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                            Chưa có dữ liệu buổi học nào được ghi nhận tổ chức cho lớp này.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {sessionsList.map((session: any) => {
                              const sDate = session.date || session.startedAt || session.createdAt;
                              const dateStr = sDate ? new Date(sDate).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Buổi học';
                              const timeStr = (session.startTime && session.endTime && session.startTime !== '--:--')
                                ? `${session.startTime} - ${session.endTime}`
                                : session.startedAt
                                ? `${new Date(session.startedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}${session.endedAt ? ` - ${new Date(session.endedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                                : 'Theo ca học';
                              const lessonStr = session.lessonTitle || session.lesson?.title || session.title || 'Buổi học';
                              const scores = session.allStudentScores || session.studentScores || [];
                              const absentStudents = scores.filter((sc: any) => sc.attendance === 'ABSENT');
                              const excusedStudents = scores.filter((sc: any) => sc.attendance === 'EXCUSED');
                              const lateStudents = scores.filter((sc: any) => sc.attendance === 'LATE');
                              const presentCount = scores.filter((sc: any) => sc.attendance === 'PRESENT').length;
                              const totalCount = scores.length || totalClassRoster;
                              const hasAbsences = absentStudents.length > 0 || excusedStudents.length > 0 || lateStudents.length > 0;

                              return (
                                <div
                                  key={session._id}
                                  className={`p-4 rounded-2xl border transition-all ${
                                    hasAbsences
                                      ? 'bg-rose-50/40 border-rose-200'
                                      : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-black text-slate-900 text-xs sm:text-sm">
                                        📅 {dateStr}
                                      </span>
                                      <span className="text-slate-400 font-semibold">•</span>
                                      <span className="text-xs font-bold text-slate-600">
                                        ⏰ {timeStr}
                                      </span>
                                      <span className="text-slate-400 font-semibold">•</span>
                                      <span className="text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                                        📖 {lessonStr}
                                      </span>
                                      {session.status === 'LIVE' && (
                                        <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black uppercase">
                                          🔴 Đang diễn ra
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs font-bold text-slate-700">
                                        Sĩ số: <b className="text-slate-900">{presentCount}/{totalCount}</b> có mặt
                                      </span>
                                    </div>
                                  </div>

                                  <div className="pt-2.5">
                                    {hasAbsences ? (
                                      <div className="space-y-1.5">
                                        <p className="text-[11px] font-black text-rose-800 uppercase tracking-wider">
                                          Danh sách học sinh vắng / nghỉ phép trong buổi này:
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                          {absentStudents.map((sc: any, idx: number) => {
                                            const name = sc.student?.name || 'Học sinh';
                                            return (
                                              <span
                                                key={idx}
                                                className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 text-xs font-black flex items-center gap-1.5"
                                              >
                                                <span>🔴 Vắng không phép:</span>
                                                <b>{name}</b>
                                              </span>
                                            );
                                          })}
                                          {excusedStudents.map((sc: any, idx: number) => {
                                            const name = sc.student?.name || 'Học sinh';
                                            return (
                                              <span
                                                key={idx}
                                                className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black flex items-center gap-1.5"
                                              >
                                                <span>🟡 Nghỉ có phép:</span>
                                                <b>{name}</b>
                                              </span>
                                            );
                                          })}
                                          {lateStudents.map((sc: any, idx: number) => {
                                            const name = sc.student?.name || 'Học sinh';
                                            return (
                                              <span
                                                key={idx}
                                                className="px-2.5 py-1 rounded-xl bg-orange-100 text-orange-900 border border-orange-300 text-xs font-black flex items-center gap-1.5"
                                              >
                                                <span>🟠 Đi muộn:</span>
                                                <b>{name}</b>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                        <CheckCircle2 size={15} className="text-emerald-700" />
                                        <span>Buổi học đạt chuyên cần 100% — Tất cả {totalCount} học sinh đều đi học đầy đủ.</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setCurriculumProgressModal(null)}
                className="py-2.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-inherit font-black text-base cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ĐẶT LẠI MÃ PIN CHO BÉ ──────────────── */}
      {resetPinTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-pop-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-900 font-black text-lg">
                <KeyRound size={20} className="text-indigo-600" />
                <span>Đặt Lại Mã PIN Cho Bé</span>
              </div>
              <button
                type="button"
                onClick={() => setResetPinTarget(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-slate-600 font-semibold">
              Học sinh: <span className="font-black text-slate-900">{resetPinTarget.name}</span>
              {resetPinTarget.username && <span className="text-slate-400 font-mono text-xs ml-2">(@{resetPinTarget.username})</span>}
            </p>

            <form onSubmit={handleConfirmResetPin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                  Nhập mã PIN 4 chữ số mới *
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  required
                  autoFocus
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Ví dụ: 1234"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-600 text-2xl tracking-[0.5em] text-center font-mono font-black outline-hidden"
                />
                <p className="text-[11px] text-slate-500 font-semibold mt-1.5 text-center">
                  Mã PIN gồm 4 số (0-9) để bé và phụ huynh đăng nhập vào hệ thống.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPinTarget(null)}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={newPinValue.trim().length !== 4 || resettingPin}
                  className="flex-1 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm cursor-pointer transition-colors disabled:opacity-50"
                >
                  {resettingPin ? 'Đang lưu...' : 'Xác Nhận Đổi PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 5: XÁC NHẬN XÓA SẠCH LỚP HỌC (CASCADE WIPE) ──────────────── */}
      {deleteTargetClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-md border border-rose-200 animate-scale-up space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center font-black shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">Xóa Vĩnh Viễn Lớp Học?</h3>
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Hành động không thể hoàn tác</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-sm font-bold text-rose-900 space-y-2">
              <p>
                Cảnh báo: Hành động này sẽ xóa sạch lớp <span className="font-black text-rose-800">"{deleteTargetClass.name}"</span> và{' '}
                <span className="underline">toàn bộ {deleteTargetClass.students?.length || 0} tài khoản học sinh</span> thuộc lớp, cùng dữ liệu điểm danh và thời khóa biểu liên quan.
              </p>
              <p className="text-xs font-semibold text-rose-800">
                (Theo quy định, học sinh của lớp sẽ bị xóa hoàn toàn khỏi hệ thống, không chuyển thành học sinh không có lớp).
              </p>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Nhập chữ <span className="text-rose-800 font-mono font-black">XOA</span> để xác nhận:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="XOA"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-300 text-base font-black text-center uppercase tracking-widest focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetClass(null)}
                className="py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting || deleteConfirmText.trim().toLowerCase() !== 'xoa'}
                onClick={handleConfirmDelete}
                className="py-2.5 px-5 rounded-2xl bg-rose-700 hover:bg-rose-700 disabled:opacity-40 text-white font-black text-sm cursor-pointer"
              >
                {isDeleting ? 'Đang xóa sạch...' : 'Xóa Vĩnh Viễn Lớp Học'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
