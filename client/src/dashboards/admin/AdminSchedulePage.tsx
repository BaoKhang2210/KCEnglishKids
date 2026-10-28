import { fetchAllPages } from '../../services/adminPagination';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  School,
  Edit2,
  Trash2,
  Filter,
  LayoutGrid,
  List,
  X,
  AlertCircle,
  MapPin,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { adminApi } from '../../services/api';
import type { ClassSchedule, ScheduleWeeklySlot } from '../../types';

interface ClassroomOption {
  _id: string;
  name: string;
  ageGroupCode?: string;
  academicYear?: string;
  studentCount?: number;
  teacher?: {
    _id: string;
    name: string;
    avatarUrl?: string;
    avatar?: string;
    email?: string;
  };
}

interface TeacherOption {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatar?: string;
}

const DAY_LABELS: { [key: number]: string } = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  0: 'Chủ Nhật'
};

const COLOR_THEMES: { [key: string]: { bg: string; border: string; text: string; badge: string; dot: string; lightBg: string } } = {
  indigo: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200',
    text: 'text-indigo-900',
    badge: 'bg-indigo-100 text-indigo-800',
    dot: 'bg-indigo-700',
    lightBg: '#4f46e5'
  },
  emerald: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-700',
    lightBg: '#059669'
  },
  amber: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-200',
    text: 'text-amber-900',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-700',
    lightBg: '#d97706'
  },
  rose: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-200',
    text: 'text-rose-900',
    badge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-700',
    lightBg: '#e11d48'
  },
  purple: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-200',
    text: 'text-purple-900',
    badge: 'bg-purple-100 text-purple-800',
    dot: 'bg-purple-700',
    lightBg: '#9333ea'
  },
  sky: {
    bg: 'bg-sky-50/70',
    border: 'border-sky-200',
    text: 'text-sky-900',
    badge: 'bg-sky-100 text-sky-800',
    dot: 'bg-sky-700',
    lightBg: '#0284c7'
  },
  teal: {
    bg: 'bg-teal-50/70',
    border: 'border-teal-200',
    text: 'text-teal-900',
    badge: 'bg-teal-100 text-teal-800',
    dot: 'bg-teal-700',
    lightBg: '#0d9488'
  },
  orange: {
    bg: 'bg-orange-50/70',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-100 text-orange-800',
    dot: 'bg-orange-700',
    lightBg: '#ea580c'
  }
};

export const AdminSchedulePage: React.FC = () => {
  const [defaultYear, setDefaultYear] = useState('2026-2027');
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');

  // Modal State for Schedule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State for Quick Add Class right from TKB page
  const [isQuickAddClassOpen, setIsQuickAddClassOpen] = useState(false);
  const [quickClassData, setQuickClassData] = useState({
    name: '',
    ageGroupCode: '3-4',
    teacherId: '',
    academicYear: '2026-2027',
    description: ''
  });
  const [quickClassError, setQuickClassError] = useState<string | null>(null);
  const [quickClassSubmitting, setQuickClassSubmitting] = useState(false);

  // Form State for Schedule
  const [formData, setFormData] = useState<{
    classroom: string;
    teacher: string;
    academicYear: string;
    colorTag: string;
    weeklySlots: ScheduleWeeklySlot[];
    effectiveFrom: string;
    effectiveTo: string;
    isActive: boolean;
  }>({
    classroom: '',
    teacher: '',
    academicYear: '2026-2027',
    colorTag: 'indigo',
    weeklySlots: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: 'English Communication', room: 'Phòng 101' },
      { dayOfWeek: 3, startTime: '08:00', endTime: '08:45', subjectNote: 'Phonics & Story', room: 'Phòng 101' }
    ],
    effectiveTo: '',
    effectiveFrom: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true
  });

  // Toast
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, clsRes, teachersRes, settingsRes] = await Promise.all([
        adminApi.getSchedules(),
        adminApi.getClassrooms(),
        fetchAllPages<any>(page => adminApi.getUsers({ role: 'TEACHER', limit: 100, page })).then(data => ({ data, users: data })),
        adminApi.getSettings()
      ]);
      setDefaultYear(settingsRes.data.academicYear);

      const sList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
      setSchedules(sList);

      const cList = Array.isArray(clsRes) ? clsRes : (clsRes?.data || clsRes?.classrooms || []);
      setClassrooms(cList);

      const tList = Array.isArray(teachersRes) ? teachersRes : (teachersRes?.data || teachersRes?.users || []);
      setTeachers(tList);
    } catch (error: any) {
      console.error('Lỗi khi tải dữ liệu thời khóa biểu:', error);
      showAlert('error', error?.message || 'Không thể tải thời khóa biểu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map teachers that already have an active class (1-1 check)
  const teacherClassMap = useMemo(() => {
    const map = new Map<string, string>();
    classrooms.forEach((c) => {
      const tId = c.teacher?._id || (typeof c.teacher === 'string' ? c.teacher : null);
      if (tId) {
        map.set(String(tId), c.name);
      }
    });
    return map;
  }, [classrooms]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((sch) => {
      const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
      const tId = typeof sch.teacher === 'object' ? sch.teacher?._id : sch.teacher;

      if (selectedClassFilter !== 'ALL' && cId !== selectedClassFilter) return false;
      if (selectedTeacherFilter !== 'ALL' && tId !== selectedTeacherFilter) return false;
      return true;
    });
  }, [schedules, selectedClassFilter, selectedTeacherFilter]);

  // Lessons available for the selected classroom (để gắn buổi học cụ thể là bài mấy lên TKB)
  const [classroomLessons, setClassroomLessons] = useState<Array<{
    _id: string;
    title: string;
    vietnameseTitle?: string;
    syllabusOrder: number;
    unitNumber?: number;
    unitTitle?: string;
  }>>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Load sequential syllabus lessons for classroom
  const loadClassroomLessons = async (classroomId: string) => {
    if (!classroomId) {
      setClassroomLessons([]);
      return;
    }
    try {
      setLoadingLessons(true);
      const res = await adminApi.getClassroomCurriculumProgress(classroomId);
      if (res.success && res.data?.sequentialSyllabus) {
        setClassroomLessons(res.data.sequentialSyllabus);
      } else {
        setClassroomLessons([]);
      }
    } catch (err) {
      console.warn('Could not load lessons for classroom:', err);
      setClassroomLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  // Open Modal for Create Schedule
  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setModalError(null);
    const firstClass = classrooms[0];
    const initialTeacher = firstClass?.teacher?._id || teachers[0]?._id || '';

    if (firstClass?._id) {
      loadClassroomLessons(firstClass._id);
    } else {
      setClassroomLessons([]);
    }

    setFormData({
      classroom: firstClass?._id || '',
      teacher: initialTeacher,
      academicYear: firstClass?.academicYear || defaultYear,
      colorTag: 'indigo',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: 'English Communication', room: 'Phòng 101', lesson: null, lessonNumber: 1, lessonTitle: 'Bài 1: Làm quen & Chào hỏi' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45', subjectNote: 'Phonics & Story', room: 'Phòng 101', lesson: null, lessonNumber: 2, lessonTitle: 'Bài 2: Từ vựng & Mẫu câu' }
      ],
      effectiveTo: '',
      effectiveFrom: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit Schedule
  const handleOpenEditModal = (sch: ClassSchedule) => {
    setEditingSchedule(sch);
    setModalError(null);
    const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
    const tId = typeof sch.teacher === 'object' ? sch.teacher?._id : sch.teacher;

    if (cId) {
      loadClassroomLessons(cId);
    } else {
      setClassroomLessons([]);
    }

    setFormData({
      classroom: cId,
      teacher: tId,
      academicYear: sch.academicYear || '2026-2027',
      colorTag: sch.colorTag || 'indigo',
      weeklySlots: sch.weeklySlots?.length > 0 ? [...sch.weeklySlots] : [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: '', room: '', lesson: null, lessonNumber: null, lessonTitle: '' }
      ],
      effectiveTo: sch.effectiveTo ? new Date(+new Date(sch.effectiveTo) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : '',
      effectiveFrom: sch.effectiveFrom ? new Date(+new Date(sch.effectiveFrom) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10),
      isActive: sch.isActive !== undefined ? sch.isActive : true
    });
    setIsModalOpen(true);
  };

  // Class change in form -> auto populate teacher & reload lessons
  const handleClassChange = (classId: string) => {
    const selected = classrooms.find((c) => String(c._id) === String(classId));
    setFormData((prev) => ({
      ...prev,
      classroom: classId,
      weeklySlots: prev.weeklySlots.map(slot => ({ ...slot, lesson: null, lessonNumber: null, lessonTitle: '' })),
      teacher: selected?.teacher?._id || prev.teacher,
      academicYear: selected?.academicYear || prev.academicYear
    }));
    loadClassroomLessons(classId);
  };

  // Slot handlers
  const handleAddSlot = () => {
    setFormData((prev) => ({
      ...prev,
      weeklySlots: [
        ...prev.weeklySlots,
        { dayOfWeek: 2, startTime: '09:00', endTime: '09:45', subjectNote: '', room: 'Phòng 101' }
      ]
    }));
  };

  const handleRemoveSlot = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      weeklySlots: prev.weeklySlots.filter((_, i) => i !== index)
    }));
  };

  const handleSlotChange = (index: number, field: keyof ScheduleWeeklySlot, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.weeklySlots];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, weeklySlots: updated };
    });
  };

  // Save Schedule Submit
  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.classroom) {
      setModalError('Vui lòng chọn lớp học');
      return;
    }
    if (!formData.teacher) {
      setModalError('Vui lòng phân công giáo viên phụ trách');
      return;
    }
    if (formData.weeklySlots.length === 0) {
      setModalError('Vui lòng thêm ít nhất 1 buổi học trong tuần');
      return;
    }

    try {
      setModalLoading(true);
      setModalError(null);

      if (editingSchedule) {
        await adminApi.updateSchedule(editingSchedule._id, { ...formData, effectiveTo: formData.effectiveTo || null });
        showAlert('success', 'Đã cập nhật thời khóa biểu thành công!');
      } else {
        await adminApi.createSchedule({ ...formData, effectiveTo: formData.effectiveTo || null });
        showAlert('success', 'Đã thiết lập thời khóa biểu mới thành công!');
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setModalError(err?.message || 'Có lỗi xảy ra khi lưu thời khóa biểu');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (scheduleId: string, className: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thời khóa biểu của lớp "${className}"?`)) return;
    try {
      await adminApi.deleteSchedule(scheduleId);
      showAlert('success', 'Đã xóa thời khóa biểu thành công.');
      await fetchData();
    } catch (err: any) {
      showAlert('error', err?.message || 'Không thể xóa thời khóa biểu.');
    }
  };

  // Open Quick Add Class Modal
  const handleOpenQuickAddClass = () => {
    const availableTeacher = teachers.find((t) => !teacherClassMap.has(String(t._id)));
    setQuickClassData({
      name: '',
      ageGroupCode: '3-4',
      teacherId: availableTeacher?._id || '',
      academicYear: defaultYear,
      description: ''
    });
    setQuickClassError(null);
    setIsQuickAddClassOpen(true);
  };

  // Submit Quick Add Class
  const handleQuickAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickClassError(null);
    const cleanName = quickClassData.name.trim();
    if (!cleanName) {
      setQuickClassError('Vui lòng nhập tên lớp học.');
      return;
    }

    // Check duplicate
    const exists = classrooms.find((c) => c.name.trim().toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      setQuickClassError(`Tên lớp "${cleanName}" đã tồn tại. Vui lòng chọn tên khác!`);
      return;
    }

    if (!quickClassData.teacherId) {
      setQuickClassError('Vui lòng phân công giáo viên phụ trách (quy tắc 1-1).');
      return;
    }

    try {
      setQuickClassSubmitting(true);
      const res = await adminApi.createClassroom({
        name: cleanName,
        ageGroupCode: quickClassData.ageGroupCode,
        teacherId: quickClassData.teacherId,
        academicYear: quickClassData.academicYear,
        description: quickClassData.description
      });

      if (res.success) {
        showAlert('success', `Đã tạo thành công lớp "${cleanName}"! Lớp đã được thêm vào danh sách.`);
        setIsQuickAddClassOpen(false);
        // Refresh classrooms and auto select this new class in schedule modal
        const freshClasses = await adminApi.getClassrooms();
        const freshList = Array.isArray(freshClasses) ? freshClasses : (freshClasses?.data || []);
        setClassrooms(freshList);
        // If schedule modal was open or to be opened:
        const createdClassId = res.data?._id;
        if (createdClassId) {
          setFormData((prev) => ({
            ...prev,
            classroom: createdClassId,
            teacher: quickClassData.teacherId
          }));
        }
        await fetchData();
      }
    } catch (err: any) {
      setQuickClassError(err?.message || 'Tạo lớp học thất bại.');
    } finally {
      setQuickClassSubmitting(false);
    }
  };

  // Organize timetable weekly slots by Day (1..6, 0)
  const timetableByDay = useMemo(() => {
    const map: { [key: number]: Array<{ schedule: ClassSchedule; slot: ScheduleWeeklySlot }> } = {};
    for (let d = 0; d <= 6; d++) map[d] = [];

    filteredSchedules.forEach((sch) => {
      if (!sch.isActive || sch.effectiveFrom && +new Date(sch.effectiveFrom) > Date.now() || sch.effectiveTo && +new Date(sch.effectiveTo) < Date.now()) return;
      sch.weeklySlots?.forEach((slot) => {
        if (map[slot.dayOfWeek]) {
          map[slot.dayOfWeek].push({ schedule: sch, slot });
        }
      });
    });

    // Sort slots by startTime
    Object.keys(map).forEach((dStr) => {
      const d = Number(dStr);
      map[d].sort((a, b) => (a.slot.startTime || '').localeCompare(b.slot.startTime || ''));
    });

    return map;
  }, [filteredSchedules]);

  // Check if a slot is currently in session right now
  const isSlotLiveNow = (dayOfWeek: number, startTime: string, endTime: string) => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const vnNow = new Date(utc + 7 * 3600000);
    if (vnNow.getDay() !== dayOfWeek) return false;

    const currentMin = vnNow.getHours() * 60 + vnNow.getMinutes();
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const sMin = sH * 60 + sM;
    const eMin = eH * 60 + eM;

    return currentMin >= sMin - 15 && currentMin <= eMin + 30;
  };

  return (
    <div className="space-y-7 animate-fade-in text-slate-800 text-base">
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
              <CalendarDays size={28} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Thời Khóa Biểu Giảng Dạy
            </h1>
          </div>
          <p className="text-base text-slate-600 font-semibold max-w-2xl leading-relaxed">
            Thiết lập lịch học cố định theo tuần cho từng lớp. Giáo viên chỉ có thể mở lớp và bắt đầu giảng dạy khi đến đúng ngày và giờ quy định theo thời khóa biểu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleOpenQuickAddClass}
            className="py-3 px-5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-black text-sm sm:text-base flex items-center gap-2 transition-all border border-indigo-200 cursor-pointer"
            title="Tạo lớp học mới trực tiếp từ đây"
          >
            <School size={18} />
            <span>+ Thêm Lớp Mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-sm sm:text-base flex items-center gap-2.5 transition-all  cursor-pointer"
          >
            <Plus size={20} />
            <span>+ Xếp Lịch Cho Lớp</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Controls Bar ────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Class filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-600" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base font-bold focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả lớp học ({classrooms.length})</option>
              {classrooms.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} {c.ageGroupCode ? `(${c.ageGroupCode} tuổi)` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher filter */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base font-bold focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">Tất cả giáo viên ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-indigo-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={16} />
            <span>Lịch Tuần</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-indigo-800' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <List size={16} />
            <span>Danh Sách Lớp</span>
          </button>
        </div>
      </div>

      {/* ── Main View: Weekly Grid or List ─────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-600">Đang đồng bộ thời khóa biểu các lớp học…</p>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4">
          <CalendarDays size={52} className="mx-auto text-slate-700" />
          <h3 className="text-xl font-black text-slate-900">Chưa có thời khóa biểu nào được xếp</h3>
          <p className="text-base text-slate-600 font-semibold max-w-md mx-auto">
            Hãy bắt đầu tạo lịch học đầu tiên cho các lớp để phân công lịch dạy cố định cho giáo viên.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenQuickAddClass}
              className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm sm:text-base border border-slate-200 cursor-pointer"
            >
              + Tạo Lớp Mới
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base cursor-pointer"
            >
              + Xếp Thời Khóa Biểu
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── WEEKLY GRID VIEW ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
            const daySlots = timetableByDay[dayNum] || [];
            const isToday = new Date().getDay() === dayNum;

            return (
              <div
                key={dayNum}
                className={`rounded-3xl border transition-all flex flex-col min-h-[380px] ${
                  isToday
                    ? 'bg-indigo-50/40 border-indigo-300 ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200/90'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-4 border-b rounded-t-3xl flex items-center justify-between ${
                    isToday ? 'bg-indigo-700 text-white' : 'bg-slate-50/90 border-slate-100 text-slate-800'
                  }`}
                >
                  <span className="font-black text-base">{DAY_LABELS[dayNum]}</span>
                  {isToday ? (
                    <span className="text-[11px] font-black uppercase tracking-wider bg-black/10 text-inherit px-2 py-0.5 rounded-full">
                      Hôm nay
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-inherit">
                      {daySlots.length} ca
                    </span>
                  )}
                </div>

                {/* Day Slots Body */}
                <div className="p-3 flex-1 overflow-y-auto space-y-2.5">
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-4 text-center">
                      <span className="text-xs font-semibold text-slate-600 italic">Không có ca học</span>
                    </div>
                  ) : (
                    daySlots.map(({ schedule, slot }, sIdx) => {
                      const theme = COLOR_THEMES[schedule.colorTag] || COLOR_THEMES.indigo;
                      const cName =
                        typeof schedule.classroom === 'object' ? schedule.classroom?.name : 'Lớp học';
                      const tName =
                        typeof schedule.teacher === 'object' ? schedule.teacher?.name : 'Chưa phân công';
                      const isLive = isSlotLiveNow(dayNum, slot.startTime, slot.endTime);

                      return (
                        <div
                          key={`${schedule._id}-${sIdx}`}
                          className={`p-3.5 rounded-2xl border transition-all group relative ${theme.bg} ${theme.border} `}
                        >
                          {/* Live Now glowing badge */}
                          {isLive && (
                            <div className="flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span>ĐANG TRONG GIỜ DẠY</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-xs font-black text-slate-900 truncate" title={cName}>
                              {cName}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(schedule)}
                              className="text-slate-600 hover:text-indigo-800 p-1 rounded-md cursor-pointer opacity-80 group-hover:opacity-100"
                              title="Sửa lịch"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>

                          <div className="flex items-center gap-1 text-xs font-black text-indigo-800 mb-1">
                            <Clock size={13} />
                            <span>
                              {slot.startTime} – {slot.endTime}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 font-semibold truncate" title={tName}>
                            GV: {tName}
                          </p>

                          {/* Attached Lesson Badge (Bài mấy) */}
                          {(slot.lessonNumber || slot.lessonTitle || slot.lesson) && (
                            <div className="mt-1.5 px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200/90 flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-700 shrink-0" />
                              <span className="text-[11px] font-black truncate" title={slot.lessonTitle || (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}>
                                {slot.lessonNumber ? `Bài ${slot.lessonNumber}` : 'Bài học'}:{' '}
                                {slot.lessonTitle
                                  ? slot.lessonTitle.replace(/^Bài\s*\d+\s*[:\-]\s*/i, '')
                                  : (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}
                              </span>
                            </div>
                          )}

                          {slot.room && (
                            <p className="text-[11px] text-slate-600 font-bold flex items-center gap-1 mt-1 truncate">
                              <MapPin size={11} />
                              <span>{slot.room}</span>
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ───────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchedules.map((sch) => {
            const theme = COLOR_THEMES[sch.colorTag] || COLOR_THEMES.indigo;
            const cName = typeof sch.classroom === 'object' ? sch.classroom?.name : 'Lớp học';
            const tName = typeof sch.teacher === 'object' ? sch.teacher?.name : 'Chưa phân công';
            const tEmail = typeof sch.teacher === 'object' ? sch.teacher?.email : '';

            return (
              <div
                key={sch._id}
                className={`bg-white rounded-3xl border ${theme.border} p-6 transition-all flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-800 block mb-1">
                        Thời khóa biểu cố định
                      </span>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{cName}</h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Năm học: {sch.academicYear || '2026-2027'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sch)}
                        className="p-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Chỉnh sửa lịch"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSchedule(sch._id, cName)}
                        className="p-2 rounded-xl text-rose-800 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa lịch"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Teacher snippet */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {tName[0] || 'T'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">{tName}</p>
                      <p className="text-xs text-slate-600 font-semibold truncate">{tEmail}</p>
                    </div>
                  </div>

                  {/* Weekly slots list */}
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Các buổi học trong tuần ({sch.weeklySlots?.length || 0}):
                    </p>
                    <div className="space-y-1.5">
                      {sch.weeklySlots?.map((slot, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-bold"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black">
                              {DAY_LABELS[slot.dayOfWeek]}
                            </span>
                            <span className="text-slate-800 font-bold">
                              {slot.startTime} – {slot.endTime}
                            </span>
                            {slot.room && (
                              <span className="text-slate-600 font-semibold truncate">
                                • {slot.room}
                              </span>
                            )}
                          </div>
                          {(slot.lessonNumber || slot.lessonTitle || slot.lesson) && (
                            <span
                              className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-black border border-amber-200 truncate max-w-[200px]"
                              title={slot.lessonTitle || (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}
                            >
                              🎯 {slot.lessonNumber ? `Bài ${slot.lessonNumber}` : 'Bài'}:{' '}
                              {slot.lessonTitle
                                ? slot.lessonTitle.replace(/^Bài\s*\d+\s*[:\-]\s*/i, '')
                                : (typeof slot.lesson === 'object' ? slot.lesson?.title : '')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Màu thẻ: {sch.colorTag}</span>
                  <span className={sch.isActive ? 'text-emerald-800 font-bold' : 'text-slate-600'}>
                    {sch.isActive ? '✓ Đang kích hoạt' : 'Tạm dừng'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: XẾP THỜI KHÓA BIỂU (CREATE / EDIT) ───────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-black">
                  <CalendarDays size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {editingSchedule ? 'Cập Nhật Thời Khóa Biểu' : 'Xếp Thời Khóa Biểu Cho Lớp'}
                  </h2>
                  <p className="text-sm font-semibold text-slate-600">
                    Sắp xếp ngày và khung giờ dạy học định kỳ hàng tuần cho lớp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-600 hover:text-slate-700 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-bold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-rose-800" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="grid gap-2">Có hiệu lực từ<input type="date" required value={formData.effectiveFrom} onChange={event => setFormData(previous => ({ ...previous, effectiveFrom: event.target.value }))} /></label>
                <label className="grid gap-2">Có hiệu lực đến (tùy chọn)<input type="date" min={formData.effectiveFrom} value={formData.effectiveTo} onChange={event => setFormData(previous => ({ ...previous, effectiveTo: event.target.value }))} /></label>
                <label className="flex items-center gap-3"><input type="checkbox" checked={formData.isActive} onChange={event => setFormData(previous => ({ ...previous, isActive: event.target.checked }))} /> Kích hoạt lịch dạy</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lớp học */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-black uppercase tracking-wider text-slate-700">
                      Lớp Học <span className="text-rose-800">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        handleOpenQuickAddClass();
                      }}
                      className="text-xs font-bold text-indigo-800 hover:underline cursor-pointer"
                    >
                      + Thêm lớp mới
                    </button>
                  </div>
                  <select
                    value={formData.classroom}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="" disabled>
                      -- Chọn lớp học --
                    </option>
                    {classrooms.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.ageGroupCode ? `(${c.ageGroupCode} tuổi)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Giáo viên */}
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Giáo Viên Giảng Dạy <span className="text-rose-800">*</span>
                  </label>
                  <select
                    value={formData.teacher}
                    disabled
                    title="Giáo viên theo phân công lớp. Thay đổi ở trang Lớp học."
                    onChange={(e) => setFormData((p) => ({ ...p, teacher: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="" disabled>
                      -- Chọn giáo viên --
                    </option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Năm học & Màu nhận diện */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Năm Học
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData((p) => ({ ...p, academicYear: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Màu Nhận Diện Lớp
                  </label>
                  <select
                    value={formData.colorTag}
                    onChange={(e) => setFormData((p) => ({ ...p, colorTag: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold"
                  >
                    <option value="indigo">🟣 Màu Indigo (Xanh tím)</option>
                    <option value="emerald">🟢 Màu Emerald (Xanh lá)</option>
                    <option value="amber">🟠 Màu Amber (Cam đất)</option>
                    <option value="rose">🔴 Màu Rose (Hồng đào)</option>
                    <option value="teal">🌊 Màu Teal (Xanh ngọc)</option>
                    <option value="purple">🔮 Màu Purple (Tím)</option>
                  </select>
                </div>
              </div>

              {/* Danh sách các buổi học trong tuần */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black uppercase tracking-wider text-slate-700">
                    Khung Giờ Học Hàng Tuần <span className="text-rose-800">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="py-1.5 px-3 rounded-xl bg-indigo-50 text-indigo-800 font-bold text-xs hover:bg-indigo-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Thêm buổi học</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.weeklySlots.map((slot, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3"
                    >
                      {/* Row 1: Time, Day and Room */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Thứ</label>
                          <select
                            value={slot.dayOfWeek}
                            onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold"
                          >
                            <option value={1}>Thứ 2</option>
                            <option value={2}>Thứ 3</option>
                            <option value={3}>Thứ 4</option>
                            <option value={4}>Thứ 5</option>
                            <option value={5}>Thứ 6</option>
                            <option value={6}>Thứ 7</option>
                            <option value={0}>Chủ Nhật</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Bắt đầu</label>
                          <input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Kết thúc</label>
                          <input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1 sm:pt-0">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Phòng học</label>
                            <input
                              type="text"
                              placeholder="Phòng 101"
                              value={slot.room || ''}
                              onChange={(e) => handleSlotChange(index, 'room', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold"
                            />
                          </div>

                          {formData.weeklySlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(index)}
                              className="mt-4 p-2 text-rose-800 hover:bg-rose-100 rounded-xl cursor-pointer shrink-0"
                              title="Xóa buổi này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Lesson Assignment (Gắn buổi học cụ thể là bài mấy) */}
                      <div className="pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-7">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-indigo-800 mb-1 flex items-center gap-1.5">
                            <BookOpen size={13} className="text-indigo-800" />
                            <span>Gắn Bài Học Theo Giáo Trình (Bài mấy)</span>
                          </label>
                          <select
                            value={typeof slot.lesson === 'object' ? slot.lesson?._id : (slot.lesson || '')}
                            onChange={(e) => {
                              const selectedLessonId = e.target.value;
                              if (!selectedLessonId) {
                                handleSlotChange(index, 'lesson', null);
                                handleSlotChange(index, 'lessonNumber', null);
                                handleSlotChange(index, 'lessonTitle', '');
                              } else {
                                const found = classroomLessons.find(l => l._id === selectedLessonId);
                                const lessonNum = found?.syllabusOrder || index + 1;
                                const titleStr = found
                                  ? `Bài ${lessonNum}: ${found.title}${found.vietnameseTitle ? ` - ${found.vietnameseTitle}` : ''}`
                                  : `Bài ${lessonNum}`;
                                handleSlotChange(index, 'lesson', selectedLessonId);
                                handleSlotChange(index, 'lessonNumber', lessonNum);
                                handleSlotChange(index, 'lessonTitle', titleStr);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                          >
                            <option value="">-- Không gắn bài học cố định --</option>
                            {classroomLessons.map((les) => (
                              <option key={les._id} value={les._id}>
                                🎯 Bài {les.syllabusOrder}: {les.title} {les.vietnameseTitle ? `(${les.vietnameseTitle})` : ''} {les.unitNumber ? `• Unit ${les.unitNumber}` : ''}
                              </option>
                            ))}
                            {classroomLessons.length === 0 && (
                              <option value="" disabled>
                                {loadingLessons ? 'Đang tải danh sách bài học...' : 'Chưa có bài học trong giáo trình của lớp'}
                              </option>
                            )}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                            Bài Số
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            placeholder="Số bài"
                            value={slot.lessonNumber ?? ''}
                            onChange={(e) => handleSlotChange(index, 'lessonNumber', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs sm:text-sm font-bold text-indigo-800"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                            Tiêu Đề / Ghi Chú Ca
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Bài 1: Hello"
                            value={slot.lessonTitle || ''}
                            onChange={(e) => handleSlotChange(index, 'lessonTitle', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="py-3 px-7 rounded-2xl bg-indigo-700 hover:bg-indigo-700 disabled:opacity-60 text-white font-black text-base cursor-pointer"
                >
                  {modalLoading ? 'Đang lưu lịch...' : 'Lưu Thời Khóa Biểu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM LỚP HỌC MỚI TRỰC TIẾP TỪ TKB ──────────────────────── */}
      {isQuickAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-7 w-full max-w-lg border border-slate-200 animate-scale-up space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-black">
                  <School size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Tạo Lớp Học Mới</h3>
                  <p className="text-xs font-semibold text-slate-600">Tạo lớp và đồng bộ ngay vào danh sách xếp lịch</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickAddClassOpen(false)}
                className="p-1.5 text-slate-600 hover:text-slate-700 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            {quickClassError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-rose-800" />
                <span>{quickClassError}</span>
              </div>
            )}

            <form onSubmit={handleQuickAddClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Tên Lớp Học * (Không được trùng lặp)
                </label>
                <input
                  type="text"
                  required
                  value={quickClassData.name}
                  onChange={(e) => setQuickClassData({ ...quickClassData, name: e.target.value })}
                  placeholder="Ví dụ: Rainbow Stars (4-5 tuổi)"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Độ Tuổi Giảng Dạy *
                  </label>
                  <select
                    value={quickClassData.ageGroupCode}
                    onChange={(e) => setQuickClassData({ ...quickClassData, ageGroupCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold"
                  >
                    <option value="3-4">3–4 Tuổi (Mầm)</option>
                    <option value="4-5">4–5 Tuổi (Chồi)</option>
                    <option value="5-6">5–6 Tuổi (Lá)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Năm Học
                  </label>
                  <input
                    type="text"
                    value={quickClassData.academicYear}
                    onChange={(e) => setQuickClassData({ ...quickClassData, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Giáo Viên Phụ Trách * (1 Giáo Viên - 1 Lớp)
                </label>
                <select
                  required
                  value={quickClassData.teacherId}
                  onChange={(e) => setQuickClassData({ ...quickClassData, teacherId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-600"
                >
                  <option value="" disabled>
                    -- Chọn giáo viên --
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
                        {t.name} {assigned ? `[Đã có lớp: ${assigned}]` : '✓ Sẵn sàng'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickAddClassOpen(false)}
                  className="py-2.5 px-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={quickClassSubmitting}
                  className="py-2.5 px-5 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-sm cursor-pointer"
                >
                  {quickClassSubmitting ? 'Đang tạo...' : 'Tạo Lớp & Xếp Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
