import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  User as UserIcon,
  School,
  Edit2,
  Trash2,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  X,
  AlertCircle,
  MapPin
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
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-200 dark:border-indigo-800/60',
    text: 'text-indigo-900 dark:text-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    lightBg: '#6366f1'
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    text: 'text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    lightBg: '#10b981'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800/60',
    text: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
    dot: 'bg-amber-500',
    lightBg: '#f59e0b'
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800/60',
    text: 'text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
    dot: 'bg-rose-500',
    lightBg: '#f43f5e'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-200 dark:border-purple-800/60',
    text: 'text-purple-900 dark:text-purple-200',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300',
    dot: 'bg-purple-500',
    lightBg: '#a855f7'
  },
  sky: {
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-200 dark:border-sky-800/60',
    text: 'text-sky-900 dark:text-sky-200',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
    dot: 'bg-sky-500',
    lightBg: '#0ea5e9'
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800/60',
    text: 'text-teal-900 dark:text-teal-200',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
    dot: 'bg-teal-500',
    lightBg: '#14b8a6'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-200 dark:border-orange-800/60',
    text: 'text-orange-900 dark:text-orange-200',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
    dot: 'bg-orange-500',
    lightBg: '#f97316'
  }
};

export const AdminSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    classroom: string;
    teacher: string;
    academicYear: string;
    colorTag: string;
    weeklySlots: ScheduleWeeklySlot[];
    effectiveFrom: string;
    isActive: boolean;
  }>({
    classroom: '',
    teacher: '',
    academicYear: '2026-2027',
    colorTag: 'indigo',
    weeklySlots: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: 'English Playtime', room: 'Phòng A1' }
    ],
    effectiveFrom: new Date().toISOString().split('T')[0],
    isActive: true
  });

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, clsRes, teachersRes] = await Promise.all([
        adminApi.getSchedules(),
        adminApi.getClassrooms(),
        adminApi.getUsers({ role: 'TEACHER', limit: 100 })
      ]);

      const sList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
      setSchedules(sList);

      const cList = Array.isArray(clsRes) ? clsRes : (clsRes?.data || clsRes?.classrooms || []);
      setClassrooms(cList);

      const tList = Array.isArray(teachersRes) ? teachersRes : (teachersRes?.data || teachersRes?.users || []);
      setTeachers(tList);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu thời khóa biểu:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
      const tId = typeof sch.teacher === 'object' ? sch.teacher?._id : sch.teacher;

      if (selectedClassFilter !== 'ALL' && cId !== selectedClassFilter) return false;
      if (selectedTeacherFilter !== 'ALL' && tId !== selectedTeacherFilter) return false;
      return true;
    });
  }, [schedules, selectedClassFilter, selectedTeacherFilter]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setModalError(null);
    const firstClass = classrooms[0];
    const initialTeacher = firstClass?.teacher?._id || teachers[0]?._id || '';

    setFormData({
      classroom: firstClass?._id || '',
      teacher: initialTeacher,
      academicYear: firstClass?.academicYear || '2026-2027',
      colorTag: 'indigo',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: 'English Communication', room: 'Phòng 101' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45', subjectNote: 'Phonics & Story', room: 'Phòng 101' }
      ],
      effectiveFrom: new Date().toISOString().split('T')[0],
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (sch: ClassSchedule) => {
    setEditingSchedule(sch);
    setModalError(null);
    const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
    const tId = typeof sch.teacher === 'object' ? sch.teacher?._id : sch.teacher;

    setFormData({
      classroom: cId,
      teacher: tId,
      academicYear: sch.academicYear || '2026-2027',
      colorTag: sch.colorTag || 'indigo',
      weeklySlots: sch.weeklySlots?.length > 0 ? [...sch.weeklySlots] : [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: '', room: '' }
      ],
      effectiveFrom: sch.effectiveFrom ? new Date(sch.effectiveFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      isActive: sch.isActive !== undefined ? sch.isActive : true
    });
    setIsModalOpen(true);
  };

  // Class change in form -> auto populate teacher
  const handleClassChange = (classId: string) => {
    const selected = classrooms.find(c => c._id === classId);
    setFormData(prev => ({
      ...prev,
      classroom: classId,
      teacher: selected?.teacher?._id || prev.teacher,
      academicYear: selected?.academicYear || prev.academicYear
    }));
  };

  // Add slot
  const handleAddSlot = () => {
    setFormData(prev => ({
      ...prev,
      weeklySlots: [
        ...prev.weeklySlots,
        { dayOfWeek: 2, startTime: '09:00', endTime: '09:45', subjectNote: '', room: '' }
      ]
    }));
  };

  // Remove slot
  const handleRemoveSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      weeklySlots: prev.weeklySlots.filter((_, i) => i !== index)
    }));
  };

  // Update slot field
  const handleSlotChange = (index: number, field: keyof ScheduleWeeklySlot, value: any) => {
    setFormData(prev => {
      const updated = [...prev.weeklySlots];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, weeklySlots: updated };
    });
  };

  // Save Modal
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
        await adminApi.updateSchedule(editingSchedule._id, formData);
      } else {
        await adminApi.createSchedule(formData);
      }

      await fetchData();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Lỗi khi lưu thời khóa biểu:', err);
      setModalError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu thời khóa biểu');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id: string, className: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thời khóa biểu của lớp "${className}"?`)) return;
    try {
      await adminApi.deleteSchedule(id);
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      console.error('Lỗi khi xóa thời khóa biểu:', err);
      alert('Không thể xóa thời khóa biểu. Vui lòng thử lại!');
    }
  };

  // Extract all slots for Grid view sorted by dayOfWeek and startTime
  const gridSlotsByDay = useMemo(() => {
    // 1 to 6 (Thứ 2 to Thứ 7), 0 (Chủ Nhật)
    const days = [1, 2, 3, 4, 5, 6, 0];
    const map: { [key: number]: Array<{ schedule: ClassSchedule; slot: ScheduleWeeklySlot }> } = {};

    days.forEach(d => { map[d] = []; });

    filteredSchedules.forEach(sch => {
      if (!sch.isActive) return;
      sch.weeklySlots?.forEach(slot => {
        if (map[slot.dayOfWeek] !== undefined) {
          map[slot.dayOfWeek].push({ schedule: sch, slot });
        }
      });
    });

    // Sort slots by startTime
    days.forEach(d => {
      map[d].sort((a, b) => a.slot.startTime.localeCompare(b.slot.startTime));
    });

    return map;
  }, [filteredSchedules]);

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner (Executive Midnight Indigo & Sapphire Glow) ────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-slate-950 via-indigo-950/70 to-slate-950 p-6 md:p-8 shadow-xl shadow-indigo-950/40">
        {/* Decorative ambient glowing orbs & top highlight line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent pointer-events-none" />
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 -bottom-10 h-44 w-44 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/15 px-3.5 py-1 text-xs font-bold text-indigo-300 border border-indigo-500/30 shadow-xs backdrop-blur-md">
              <Sparkles size={14} className="text-indigo-400 animate-pulse" />
              <span>Quản lý Lịch giảng dạy &amp; Thời khóa biểu tập trung</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <CalendarDays className="h-8 w-8 text-indigo-400" />
              <span>Thời Khóa Biểu Các Lớp Học</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed font-normal">
              Thiết lập và phân công thời khóa biểu cố định hàng tuần cho giáo viên và học sinh.
              Giáo viên sẽ tự động đồng bộ lịch này vào màn hình giảng dạy lớp học.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/30 hover:shadow-indigo-500/40 transition-all transform active:scale-95"
            >
              <Plus size={18} className="stroke-[3]" />
              <span>Thêm Lịch Dạy Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters & View Modes ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Filter size={14} />
            <span>Bộ lọc:</span>
          </div>

          {/* Classroom filter */}
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Tất cả lớp học ({classrooms.length})</option>
            {classrooms.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.ageGroupCode ? `${c.ageGroupCode} tuổi` : 'Chưa phân độ tuổi'})
              </option>
            ))}
          </select>

          {/* Teacher filter */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="ALL">Tất cả giáo viên ({teachers.length})</option>
            {teachers.map(t => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.email})
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              viewMode === 'grid'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LayoutGrid size={15} />
            <span>Lưới Tuần (Grid)</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              viewMode === 'list'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <List size={15} />
            <span>Danh sách Lớp ({filteredSchedules.length})</span>
          </button>
        </div>
      </div>

      {/* ── Content View ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">Đang tải thời khóa biểu...</p>
          </div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-4">
            <CalendarDays size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Chưa có thời khóa biểu nào</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md">
            Hãy bắt đầu tạo lịch học đầu tiên cho các lớp để phân công lịch dạy cố định cho giáo viên.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
          >
            <Plus size={16} />
            <span>Tạo Thời Khóa Biểu Đầu Tiên</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── WEEKLY GRID VIEW ──────────────────────────────────────────────── */
        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1000px] grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 0].map((dayNum) => {
              const daySlots = gridSlotsByDay[dayNum] || [];
              const isWeekend = dayNum === 6 || dayNum === 0;

              return (
                <div
                  key={dayNum}
                  className={`flex flex-col rounded-2xl border transition-all ${
                    isWeekend
                      ? 'border-slate-200/80 bg-slate-50/70 dark:border-slate-800/80 dark:bg-slate-900/40'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-3.5 border-b text-center rounded-t-2xl font-bold ${
                    isWeekend
                      ? 'border-slate-200 bg-slate-100/70 text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400'
                      : 'border-slate-100 bg-indigo-50/40 text-indigo-950 dark:border-slate-800 dark:bg-indigo-950/20 dark:text-indigo-300'
                  }`}>
                    <div className="text-sm">{DAY_LABELS[dayNum]}</div>
                    <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                      {daySlots.length} ca học
                    </div>
                  </div>

                  {/* Slot Cards List */}
                  <div className="p-2.5 flex-1 space-y-2.5 min-h-[350px]">
                    {daySlots.length === 0 ? (
                      <div className="h-full flex items-center justify-center p-4 text-center">
                        <span className="text-xs font-medium text-slate-400 italic">Không có tiết học</span>
                      </div>
                    ) : (
                      daySlots.map(({ schedule, slot }, sIdx) => {
                        const theme = COLOR_THEMES[schedule.colorTag] || COLOR_THEMES.indigo;
                        const cName = typeof schedule.classroom === 'object' ? schedule.classroom?.name : 'Lớp học';
                        const tName = typeof schedule.teacher === 'object' ? schedule.teacher?.name : 'Chưa phân công';

                        return (
                          <div
                            key={`${schedule._id}-${sIdx}`}
                            className={`group relative rounded-xl border p-3 shadow-xs transition-all hover:shadow-md ${theme.bg} ${theme.border}`}
                          >
                            {/* Time badge */}
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${theme.badge}`}>
                                <Clock size={11} />
                                {slot.startTime} - {slot.endTime}
                              </span>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditModal(schedule)}
                                  className="p-1 rounded-md hover:bg-black/10 text-slate-600 dark:text-slate-300"
                                  title="Chỉnh sửa lịch lớp"
                                >
                                  <Edit2 size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Class name */}
                            <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                              <span className="truncate">{cName}</span>
                            </div>

                            {/* Subject & Room */}
                            {slot.subjectNote && (
                              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 truncate">
                                📚 {slot.subjectNote}
                              </div>
                            )}

                            {slot.room && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <MapPin size={11} />
                                <span>{slot.room}</span>
                              </div>
                            )}

                            {/* Teacher name */}
                            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                              <UserIcon size={12} className="text-slate-400" />
                              <span className="truncate">{tName}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── LIST VIEW ─────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map((sch) => {
            const theme = COLOR_THEMES[sch.colorTag] || COLOR_THEMES.indigo;
            const cName = typeof sch.classroom === 'object' ? sch.classroom?.name : 'Lớp học';
            const cAge = typeof sch.classroom === 'object' ? sch.classroom?.ageGroupCode : '';
            const cCount = typeof sch.classroom === 'object' ? sch.classroom?.studentCount : 0;
            const tName = typeof sch.teacher === 'object' ? sch.teacher?.name : 'Chưa phân công';
            const tEmail = typeof sch.teacher === 'object' ? sch.teacher?.email : '';

            return (
              <div
                key={sch._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-white shadow-sm"
                        style={{ backgroundColor: theme.lightBg }}
                      >
                        <School size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-slate-900 dark:text-white">{cName}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {cAge && <span className="font-semibold text-indigo-600 dark:text-indigo-400">{cAge} tuổi</span>}
                          <span>•</span>
                          <span>{cCount || 0} học sinh</span>
                          <span>•</span>
                          <span>{sch.academicYear}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      sch.isActive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {sch.isActive ? 'Đang áp dụng' : 'Tạm dừng'}
                    </span>
                  </div>

                  {/* Teacher info */}
                  <div className="mb-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center justify-center font-bold">
                      {tName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">GV phụ trách: {tName}</div>
                      <div className="text-slate-500 dark:text-slate-400">{tEmail || 'Email giáo viên'}</div>
                    </div>
                  </div>

                  {/* Weekly slots */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Thời khóa biểu ({sch.weeklySlots?.length || 0} buổi/tuần):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sch.weeklySlots?.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${theme.bg} ${theme.text} border ${theme.border}`}
                        >
                          <span className="font-extrabold">{DAY_LABELS[slot.dayOfWeek]}:</span>
                          <span>{slot.startTime}-{slot.endTime}</span>
                          {slot.room && <span className="opacity-75">({slot.room})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEditModal(sch)}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                  >
                    <Edit2 size={14} />
                    <span>Chỉnh sửa</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(sch._id, cName)}
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50 transition"
                  >
                    <Trash2 size={14} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl dark:bg-slate-900 dark:border dark:border-slate-800 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingSchedule ? 'Chỉnh Sửa Thời Khóa Biểu' : 'Thêm Thời Khóa Biểu Mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sắp xếp ngày và khung giờ dạy học định kỳ hàng tuần cho lớp
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitModal} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Classroom */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Lớp học <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.classroom}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="" disabled>-- Chọn lớp học --</option>
                    {classrooms.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.ageGroupCode ? `(${c.ageGroupCode} tuổi)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Teacher */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Giáo viên giảng dạy <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.teacher}
                    onChange={(e) => setFormData(p => ({ ...p, teacher: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="" disabled>-- Chọn giáo viên --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>
                        {t.name} ({t.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Năm học
                  </label>
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) => setFormData(p => ({ ...p, academicYear: e.target.value }))}
                    placeholder="2026-2027"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* Color Tag */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Màu nhận diện lớp học
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {Object.keys(COLOR_THEMES).map(color => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setFormData(p => ({ ...p, colorTag: color }))}
                        className={`h-7 w-7 rounded-full transition-transform ${
                          formData.colorTag === color ? 'scale-125 ring-2 ring-slate-800 dark:ring-white ring-offset-2' : 'hover:scale-110 opacity-70'
                        }`}
                        style={{ backgroundColor: COLOR_THEMES[color].lightBg }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Weekly Slots Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Các buổi học trong tuần ({formData.weeklySlots.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <Plus size={14} />
                    <span>Thêm buổi học</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {formData.weeklySlots.map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex flex-col md:flex-row items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50"
                    >
                      {/* Day of Week */}
                      <select
                        value={slot.dayOfWeek}
                        onChange={(e) => handleSlotChange(sIdx, 'dayOfWeek', Number(e.target.value))}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      >
                        <option value={1}>Thứ 2</option>
                        <option value={2}>Thứ 3</option>
                        <option value={3}>Thứ 4</option>
                        <option value={4}>Thứ 5</option>
                        <option value={5}>Thứ 6</option>
                        <option value={6}>Thứ 7</option>
                        <option value={0}>Chủ Nhật</option>
                      </select>

                      {/* Start Time */}
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleSlotChange(sIdx, 'startTime', e.target.value)}
                        required
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />
                      <span className="text-xs text-slate-400 font-bold">đến</span>
                      {/* End Time */}
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleSlotChange(sIdx, 'endTime', e.target.value)}
                        required
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />

                      {/* Room */}
                      <input
                        type="text"
                        placeholder="Phòng học"
                        value={slot.room || ''}
                        onChange={(e) => handleSlotChange(sIdx, 'room', e.target.value)}
                        className="w-24 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />

                      {/* Subject Note */}
                      <input
                        type="text"
                        placeholder="Nội dung/môn (ví dụ: Giao tiếp)"
                        value={slot.subjectNote || ''}
                        onChange={(e) => handleSlotChange(sIdx, 'subjectNote', e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                      />

                      {/* Remove Button */}
                      {formData.weeklySlots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(sIdx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status toggle & Effective date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Ngày bắt đầu áp dụng
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData(p => ({ ...p, effectiveFrom: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {formData.isActive ? 'Kích hoạt lịch học' : 'Tạm dừng áp dụng'}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>{editingSchedule ? 'Cập Nhật Lịch' : 'Tạo Lịch Dạy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
