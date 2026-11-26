import { fetchAllPages } from '../../services/adminPagination';
import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Filter,
  LayoutGrid,
  List,
  X,
  AlertCircle,
  MapPin,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { adminApi, classroomSessionApi } from '../../services/api';
import type { ClassSchedule, ScheduleWeeklySlot } from '../../types';
import { resolveDynamicSlotLesson, cleanReason, getLessonUnitInfo } from '../../utils/teachingSchedule';
import { vietnamDate } from '../../utils/vietnamTime';



interface ClassroomOption {
  _id: string;
  name: string;
  status?: string;
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

  // Map classId -> sequential syllabus lessons
  const [classSyllabusMap, setClassSyllabusMap] = useState<Record<string, any[]>>({});
  const [sessions, setSessions] = useState<any[]>([]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [schedRes, clsRes, teachersRes, settingsRes, sessRes] = await Promise.all([
        adminApi.getSchedules(),
        adminApi.getClassrooms(),
        fetchAllPages<any>(page => adminApi.getUsers({ role: 'TEACHER', limit: 100, page })).then(data => ({ data, users: data })),
        adminApi.getSettings(),
        classroomSessionApi.getSessions().catch(() => ({ data: [] }))
      ]);
      setDefaultYear(settingsRes.data.academicYear);

      const sList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
      setSchedules(sList);

      const cList = Array.isArray(clsRes) ? clsRes : (clsRes?.data || clsRes?.classrooms || []);
      setClassrooms(cList);

      const tList = Array.isArray(teachersRes) ? teachersRes : (teachersRes?.data || teachersRes?.users || []);
      setTeachers(tList);

      if (sessRes?.data) {
        setSessions(sessRes.data);
      }

      // Load syllabus lessons for each classroom to calculate weekly lesson progression
      void Promise.all(
        cList.map(async (c: any) => {
          try {
            const res = await adminApi.getClassroomCurriculumProgress(c._id);
            if (res.success && res.data?.sequentialSyllabus) {
              return { classId: String(c._id), syllabus: res.data.sequentialSyllabus };
            }
          } catch {
            // ignore
          }
          return null;
        })
      ).then(results => {
        const newMap: Record<string, any[]> = {};
        results.forEach(r => {
          if (r) newMap[r.classId] = r.syllabus;
        });
        setClassSyllabusMap(newMap);
      });
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

  // Set of classrooms that currently have an active schedule
  const scheduledClassroomIds = useMemo(() => {
    const ids = new Set<string>();
    schedules.forEach((sch: any) => {
      const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
      if (cId && sch.isActive !== false) ids.add(String(cId));
    });
    return ids;
  }, [schedules]);

  // Set of classrooms that currently have any schedule (active or inactive)
  const allScheduledClassroomIds = useMemo(() => {
    const ids = new Set<string>();
    schedules.forEach((sch: any) => {
      const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
      if (cId) ids.add(String(cId));
    });
    return ids;
  }, [schedules]);

  // Classes that are COMPLETED but do not have an existing schedule record in DB
  const completedWithoutSchedule = useMemo(() => {
    return classrooms.filter((c: any) => {
      if (c.status !== 'COMPLETED') return false;
      if (allScheduledClassroomIds.has(String(c._id))) return false;
      if (selectedClassFilter !== 'ALL' && String(c._id) !== selectedClassFilter) return false;
      const tId = typeof c.teacher === 'object' ? c.teacher?._id : c.teacher;
      if (selectedTeacherFilter !== 'ALL' && String(tId) !== selectedTeacherFilter) return false;
      return true;
    }).map((c: any) => ({
      _id: `completed-class-${c._id}`,
      classroom: c,
      teacher: c.teacher || null,
      academicYear: c.academicYear || '2026-2027',
      colorTag: 'purple',
      weeklySlots: [],
      effectiveFrom: c.createdAt || new Date().toISOString(),
      effectiveTo: null,
      isActive: false,
      isSyntheticCompleted: true
    } as any));
  }, [classrooms, allScheduledClassroomIds, selectedClassFilter, selectedTeacherFilter]);

  // Combined items to render in List View (both schedules and completed classes)
  const listModeItems = useMemo(() => {
    return [...filteredSchedules, ...completedWithoutSchedule];
  }, [filteredSchedules, completedWithoutSchedule]);

  // Classes that are ACTIVE or UPCOMING but do not have a schedule yet
  const unscheduledClassrooms = useMemo(() => {
    return classrooms.filter((c: any) => {
      if (c.status === 'COMPLETED' || c.status === 'INACTIVE') return false;
      return !scheduledClassroomIds.has(String(c._id));
    });
  }, [classrooms, scheduledClassroomIds]);

  // Open Modal for Create Schedule
  const handleOpenCreateModal = (defaultClassId?: string) => {
    setEditingSchedule(null);
    setModalError(null);
    const eligibleClassrooms = classrooms.filter((c) => c.status !== 'COMPLETED');
    const chosenClass = defaultClassId
      ? classrooms.find((c) => String(c._id) === String(defaultClassId))
      : eligibleClassrooms.find((c) => c.status === 'ACTIVE' || c.status === 'UPCOMING') || eligibleClassrooms[0];

    if (chosenClass?.status === 'COMPLETED') {
      showAlert('error', 'Lớp học đã hoàn thành niên khóa, không thể xếp thời khóa biểu mới.');
      return;
    }

    if (!chosenClass) {
      showAlert('error', 'Không có lớp học nào khả dụng để xếp lịch.');
      return;
    }

    const initialTeacher = chosenClass?.teacher?._id || teachers[0]?._id || '';

    setFormData({
      classroom: chosenClass?._id || '',
      teacher: initialTeacher,
      academicYear: chosenClass?.academicYear || defaultYear,
      colorTag: 'indigo',
      weeklySlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: 'English Communication', room: 'Phòng 101', lesson: null, lessonNumber: null, lessonTitle: '' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '08:45', subjectNote: 'Phonics & Story', room: 'Phòng 101', lesson: null, lessonNumber: null, lessonTitle: '' }
      ],
      effectiveTo: '',
      effectiveFrom: currentWeekDays[0]?.dateString || vietnamDate(),
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit Schedule
  const handleOpenEditModal = (sch: ClassSchedule) => {
    const classObj = typeof sch.classroom === 'object'
      ? sch.classroom
      : classrooms.find((c) => String(c._id) === String(sch.classroom));
    if (classObj?.status === 'COMPLETED') {
      showAlert('error', 'Lớp học đã hoàn thành niên khóa, không thể chỉnh sửa thời khóa biểu.');
      return;
    }
    setEditingSchedule(sch);
    setModalError(null);
    const cId = typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom;
    const tId = typeof sch.teacher === 'object' ? sch.teacher?._id : sch.teacher;

    const sortedSlots = [...(sch.weeklySlots || [])].sort((a: any, b: any) => {
      const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
      const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
      if (dayA !== dayB) return dayA - dayB;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    setFormData({
      classroom: cId,
      teacher: tId,
      academicYear: sch.academicYear || '2026-2027',
      colorTag: sch.colorTag || 'indigo',
      weeklySlots: sortedSlots.length > 0 ? sortedSlots : [
        { dayOfWeek: 1, startTime: '08:00', endTime: '08:45', subjectNote: '', room: '', lesson: null, lessonNumber: null, lessonTitle: '' }
      ],
      effectiveTo: sch.effectiveTo ? new Date(+new Date(sch.effectiveTo) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : '',
      effectiveFrom: sch.effectiveFrom ? new Date(+new Date(sch.effectiveFrom) + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) : new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10),
      isActive: sch.isActive !== undefined ? sch.isActive : true
    });
    setIsModalOpen(true);
  };

  // Class change in form -> auto populate teacher
  const handleClassChange = (classId: string) => {
    const selected = classrooms.find((c) => String(c._id) === String(classId));
    setFormData((prev) => ({
      ...prev,
      classroom: classId,
      weeklySlots: prev.weeklySlots.map(slot => ({ ...slot, lesson: null, lessonNumber: null, lessonTitle: '' })),
      teacher: selected?.teacher?._id || prev.teacher,
      academicYear: selected?.academicYear || prev.academicYear
    }));
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

    // Validate each slot time
    for (let i = 0; i < formData.weeklySlots.length; i++) {
      const slot = formData.weeklySlots[i];
      if (!slot.startTime || !slot.endTime) {
        setModalError(`Ca thứ ${i + 1}: Vui lòng nhập đầy đủ giờ bắt đầu và giờ kết thúc.`);
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setModalError(`Ca thứ ${i + 1}: Giờ kết thúc (${slot.endTime}) phải sau giờ bắt đầu (${slot.startTime}).`);
        return;
      }
    }

    // Check duplicate/overlap in same day
    for (let i = 0; i < formData.weeklySlots.length; i++) {
      for (let j = i + 1; j < formData.weeklySlots.length; j++) {
        const s1 = formData.weeklySlots[i];
        const s2 = formData.weeklySlots[j];
        if (s1.dayOfWeek === s2.dayOfWeek) {
          if (s1.startTime < s2.endTime && s2.startTime < s1.endTime) {
            setModalError(`Ca thứ ${i + 1} và ca thứ ${j + 1} bị trùng lặp hoặc chồng chéo khung giờ trong cùng một ngày.`);
            return;
          }
        }
      }
    }

    try {
      setModalLoading(true);
      setModalError(null);

      // Clean & sort slots: schedule establishes teaching timeslots in Monday -> Sunday order
      const sortedWeeklySlots = [...formData.weeklySlots]
        .map(s => ({
          ...s,
          lesson: null,
          lessonNumber: null,
          lessonTitle: ''
        }))
        .sort((a, b) => {
          const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
          const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
          if (dayA !== dayB) return dayA - dayB;
          return (a.startTime || '').localeCompare(b.startTime || '');
        });

      const cleanPayload = {
        ...formData,
        effectiveTo: formData.effectiveTo || null,
        weeklySlots: sortedWeeklySlots
      };

      if (editingSchedule) {
        await adminApi.updateSchedule(editingSchedule._id, cleanPayload);
        showAlert('success', 'Đã cập nhật thời khóa biểu thành công!');
      } else {
        await adminApi.createSchedule(cleanPayload);
        const selClass = classrooms.find(c => String(c._id) === String(formData.classroom));
        if (selClass?.status === 'UPCOMING') {
          showAlert('success', `Đã thiết lập thời khóa biểu và khai giảng lớp "${selClass.name}" (chuyển sang Đang học)!`);
        } else {
          showAlert('success', 'Đã thiết lập thời khóa biểu mới thành công!');
        }
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

  // Week navigation (offset 0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Vietnam Time now
  const getVietnamNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 3600000);
  };

  // Calendar days for the selected week (Monday to Sunday)
  const currentWeekDays = useMemo(() => {
    const now = getVietnamNow();
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);

    // Find Monday (day 1)
    const currentDayOfWeek = targetDate.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const dayNums = [1, 2, 3, 4, 5, 6, 0];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      const shortDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const isToday = now.getFullYear() === d.getFullYear() && now.getMonth() === d.getMonth() && now.getDate() === d.getDate();

      days.push({
        dayNum: dayNums[i],
        dayName: dayNames[i],
        date: d,
        dateString,
        formattedDate,
        shortDate,
        isToday
      });
    }

    return days;
  }, [weekOffset]);

  // Check if a schedule applies on a given date (effectiveFrom / effectiveTo)
  const scheduleAppliesOnDate = (sch: ClassSchedule, dateString: string) => {
    const isCompletedClass = typeof sch.classroom === 'object' && sch.classroom?.status === 'COMPLETED';
    if (!sch.isActive && !isCompletedClass) return false;
    if (sch.effectiveFrom) {
      const fromStr = new Date(+new Date(sch.effectiveFrom) + 7 * 3600000).toISOString().slice(0, 10);
      if (dateString < fromStr) return false;
    }
    if (sch.effectiveTo) {
      const toStr = new Date(+new Date(sch.effectiveTo) + 7 * 3600000).toISOString().slice(0, 10);
      if (dateString > toStr) return false;
    }
    return true;
  };

  // Organize timetable weekly slots by Day (1..6, 0) for the selected week
  const timetableByDay = useMemo(() => {
    const map: { [key: number]: Array<{ schedule: ClassSchedule; slot: ScheduleWeeklySlot }> } = {};
    for (let d = 0; d <= 6; d++) map[d] = [];

    currentWeekDays.forEach((day) => {
      filteredSchedules.forEach((sch) => {
        if (!scheduleAppliesOnDate(sch, day.dateString)) return;
        sch.weeklySlots?.forEach((slot) => {
          if (slot.dayOfWeek === day.dayNum) {
            map[day.dayNum].push({ schedule: sch, slot });
          }
        });
      });
    });

    // Sort slots by startTime
    Object.keys(map).forEach((dStr) => {
      const d = Number(dStr);
      map[d].sort((a, b) => (a.slot.startTime || '').localeCompare(b.slot.startTime || ''));
    });

    return map;
  }, [filteredSchedules, currentWeekDays]);

  // Check if a slot is currently in session right now
  const isSlotLiveNow = (_dayOfWeek: number, startTime: string, endTime: string, isTodayDate: boolean) => {
    if (!isTodayDate) return false;
    const vnNow = getVietnamNow();
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
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-800">
              <CalendarDays size={28} />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Thời Khóa Biểu Giảng Dạy
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-black text-sm sm:text-base flex items-center gap-2.5 transition-all cursor-pointer"
          >
            <Plus size={20} />
            <span> Xếp Lịch Cho Lớp</span>
          </button>
        </div>
      </div>

      {/* ── Filters & Controls Bar ────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Class filter */}
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-600" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:border-indigo-600"
              >
                <option value="ALL">Tất cả lớp học ({classrooms.length})</option>
                <optgroup label="Lớp đang học (Active)">
                  {classrooms.filter((c) => c.status === 'ACTIVE').map((c) => {
                    const isUnscheduled = !scheduledClassroomIds.has(String(c._id));
                    return (
                      <option key={c._id} value={c._id}>
                        {c.name} {c.ageGroupCode ? `(${c.ageGroupCode} tuổi)` : ''} {isUnscheduled ? '• [Chưa có lịch]' : ''}
                      </option>
                    );
                  })}
                </optgroup>
                {classrooms.some((c) => c.status === 'UPCOMING') && (
                  <optgroup label="Lớp sắp khai giảng (Upcoming)">
                    {classrooms.filter((c) => c.status === 'UPCOMING').map((c) => {
                      const isUnscheduled = !scheduledClassroomIds.has(String(c._id));
                      return (
                        <option key={c._id} value={c._id}>
                          {c.name} (Sắp khai giảng) {isUnscheduled ? '• [Chưa có lịch]' : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                {classrooms.some((c) => c.status === 'COMPLETED') && (
                  <optgroup label="Lớp đã hoàn thành (Completed)">
                    {classrooms.filter((c) => c.status === 'COMPLETED').map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Đã hoàn thành)
                      </option>
                    ))}
                  </optgroup>
                )}
                {classrooms.some((c) => c.status === 'INACTIVE') && (
                  <optgroup label="Lớp tạm dừng (Inactive)">
                    {classrooms.filter((c) => c.status === 'INACTIVE').map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} (Đã tạm dừng)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Teacher filter */}
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="py-2.5 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold focus:outline-none focus:border-indigo-600"
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
                viewMode === 'grid' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={16} />
              <span>Lịch Tuần</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-indigo-800 shadow-xs' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <List size={16} />
              <span>Lịch Theo Lớp</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Unscheduled Classrooms Alert & Quick Action ───────────────────────── */}
      {unscheduledClassrooms.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-r from-amber-50 via-orange-50 to-amber-100/50 border border-amber-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                  <span>Lớp học chưa được xếp thời khóa biểu</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900 border border-amber-300">
                    {unscheduledClassrooms.length} lớp
                  </span>
                </h3>
                <p className="text-xs text-amber-800/90 font-medium">
                  Các lớp học dưới đây đang mở hoặc sắp khai giảng nhưng chưa có lịch học hàng tuần. Hãy bấm xếp lịch để kích hoạt lịch giảng dạy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {unscheduledClassrooms.map((c: any) => (
              <div
                key={c._id}
                className="p-3 bg-white rounded-2xl border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-amber-400 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {c.name}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                      c.status === 'UPCOMING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}>
                      {c.status === 'UPCOMING' ? 'Sắp khai giảng' : 'Đang học'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    Khối {c.ageGroupCode} tuổi • {c.teacher?.name ? `GV: ${c.teacher.name}` : 'Chưa phân công GV'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(c._id)}
                  className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title={`Xếp thời khóa biểu cho lớp ${c.name}`}
                >
                  <Plus size={13} />
                  <span>Xếp lịch</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Week Navigation Controls ──────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Xem thời khóa biểu tuần trước"
          >
            <ChevronLeft size={18} />
            <span>Tuần trước</span>
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-2xs cursor-pointer active:scale-95 ${
              weekOffset === 0
                ? 'bg-indigo-700 text-white shadow-indigo-200'
                : 'border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900'
            }`}
            title="Quay về tuần học hiện tại"
          >
            <span>Tuần này</span>
          </button>

          <button
            type="button"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Xem thời khóa biểu tuần sau"
          >
            <span>Tuần sau</span>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs sm:text-sm font-bold text-slate-700 flex-wrap justify-center md:justify-end">
          <div className="flex items-center gap-2 bg-indigo-50/80 px-4 py-2 rounded-2xl border border-indigo-200/80 text-indigo-950 font-black">
            <Calendar size={18} className="text-indigo-700 shrink-0" />
            <span>
              Tuần từ {currentWeekDays[0].formattedDate} đến {currentWeekDays[6].formattedDate}
            </span>
          </div>
          {weekOffset !== 0 && (
            <span className="text-xs font-black text-amber-900 bg-amber-100/90 px-3 py-1.5 rounded-xl border border-amber-300">
              {weekOffset < 0
                ? `📅 Đang xem ${Math.abs(weekOffset)} tuần trước`
                : `📅 Đang xem ${weekOffset} tuần tới`}
            </span>
          )}
        </div>
      </div>

      {/* ── Cảnh báo Giảng dạy Hôm nay (MISSED SCHEDULE ALERT) ── */}
      {(() => {
        const missedClasses = classrooms.filter((c: any) => c.status === 'ACTIVE' && c.todayTeachingStatus === 'MISSED');
        if (missedClasses.length === 0) return null;

        return (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-rose-50 to-pink-50/50 border-2 border-rose-300 text-rose-950 shadow-xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="text-xl p-2.5 rounded-2xl bg-rose-200 border border-rose-300 text-rose-700 shrink-0">
                <AlertTriangle size={22} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white font-black text-2xs uppercase tracking-wide">
                    Cảnh báo hôm nay
                  </span>
                  <p className="text-sm font-black text-rose-950">
                    Có {missedClasses.length} lớp quá giờ chưa vào dạy:
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-rose-900 mt-2.5">
                  {missedClasses.map((c: any) => (
                    <div
                      key={c._id}
                      className="bg-white/95 border border-rose-200 px-3.5 py-2 rounded-xl shadow-2xs flex flex-wrap items-center gap-2"
                    >
                      <span className="font-black text-slate-800">{c.name}</span>
                      <span className="text-2xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {c.todayTeachingNote || 'Chưa dạy'}
                      </span>
                      {c.teacher?.name && (
                        <span className="text-2xs text-slate-500 font-semibold">
                          (GV: {c.teacher.name})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Week Cancelled Sessions Overview Alert ────────────────────────── */}
      {(() => {
        const weekDateSet = new Set(currentWeekDays.map(d => d.dateString));
        const weekCancelled = sessions.filter((s: any) => {
          if (s.status !== 'CANCELLED') return false;
          const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
          if (selectedClassFilter !== 'ALL' && cId !== selectedClassFilter) return false;
          const rawTs = s.startedAt || s.createdAt;
          const sDate = rawTs ? vietnamDate(new Date(rawTs)) : '';
          return weekDateSet.has(sDate);
        });

        if (weekCancelled.length === 0) return null;

        return (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3.5">
              <span className="text-2xl p-2 rounded-2xl bg-amber-200 border border-amber-300 shrink-0">🚫</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-600 text-white font-black text-2xs uppercase tracking-wide">
                    Lịch báo nghỉ
                  </span>
                  <p className="text-sm font-black text-amber-950 flex flex-wrap items-center gap-2">
                    <span>Tổng quan tuần: Có {weekCancelled.length} ca học đã báo nghỉ</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-900 mt-1.5">
                  {weekCancelled.map((cs: any) => {
                    const cName = typeof cs.classroom === 'object' ? cs.classroom?.name : 'Lớp';
                    const rawTs = cs.startedAt || cs.createdAt;
                    const sDate = rawTs ? vietnamDate(new Date(rawTs)) : '';
                    const parts = sDate.split('-');
                    const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : sDate;
                    return (
                      <span key={cs._id} className="bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-xl text-amber-950 font-bold">
                        {cName} ({shortDate}: {cleanReason(cs.cancellationReason)})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-amber-200/90 border border-amber-300 px-3 py-1.5 rounded-xl shrink-0 self-start md:self-auto">
              ⭐ Bài học tự động bảo lưu
            </span>
          </div>
        );
      })()}

      {/* ── Main View: Weekly Grid or List ─────────────────────────────────── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center">
          <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-600">Đang đồng bộ thời khóa biểu các lớp học…</p>
        </div>
      ) : (viewMode === 'grid' ? filteredSchedules.length === 0 : listModeItems.length === 0) ? (
        <div className="bg-white rounded-3xl p-16 border border-slate-200 text-center space-y-4">
          <CalendarDays size={52} className="mx-auto text-slate-700" />
          <h3 className="text-xl font-black text-slate-900">Chưa có thời khóa biểu nào được xếp</h3>
          <div className="flex items-center justify-center pt-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="py-3 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-700 text-white font-bold text-sm sm:text-base cursor-pointer"
            >
              + Xếp Thời Khóa Biểu
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── WEEKLY GRID VIEW (DÀN ĐẦY RỘNG RÃI, THOÁNG ĐẸP, ĐẦY ĐỦ THÔNG TIN) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {currentWeekDays.map((day) => {
            const daySlots = timetableByDay[day.dayNum] || [];
            const isToday = day.isToday;

            return (
              <div
                key={day.dayNum}
                className={`rounded-3xl border transition-all flex flex-col min-h-[320px] overflow-hidden ${
                  isToday
                    ? 'bg-indigo-700 border-indigo-700 ring-4 ring-indigo-500/25 shadow-lg'
                    : 'bg-white border-slate-200/90 shadow-2xs'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-4 border-b flex items-center justify-between ${
                    isToday ? 'bg-indigo-700 border-indigo-600/60 text-white' : 'bg-slate-50/90 border-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-black text-base">{day.dayName}</span>
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {day.shortDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                        Hôm nay
                      </span>
                    )}
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {daySlots.length} ca học
                    </span>
                  </div>
                </div>

                {/* Day Slots Body */}
                <div className={`p-3.5 flex-1 overflow-y-auto space-y-3 ${isToday ? 'bg-indigo-700' : ''}`}>
                  {daySlots.length === 0 ? (
                    <div className="h-full flex items-center justify-center p-6 text-center">
                      <span className={`text-xs font-semibold italic ${isToday ? 'text-indigo-200' : 'text-slate-400'}`}>
                        Không có ca học
                      </span>
                    </div>
                  ) : (
                    daySlots.map(({ schedule, slot }, sIdx) => {
                      const theme = COLOR_THEMES[schedule.colorTag] || COLOR_THEMES.indigo;
                      const classObj = typeof schedule.classroom === 'object'
                        ? schedule.classroom
                        : classrooms.find((c) => String(c._id) === String(schedule.classroom));
                      const cName = classObj?.name || 'Lớp học';
                      const isClassCompleted = classObj?.status === 'COMPLETED';
                      const isClassUpcoming = classObj?.status === 'UPCOMING';
                      const isClassInactive = classObj?.status === 'INACTIVE';
                      const tName =
                        typeof schedule.teacher === 'object' ? schedule.teacher?.name : 'Chưa phân công';
                      const isLive = isSlotLiveNow(day.dayNum, slot.startTime, slot.endTime, isToday);

                      return (
                        <div
                          key={`${schedule._id}-${sIdx}`}
                          className={`p-4 rounded-2xl border transition-all group relative space-y-2.5 ${
                            isToday
                              ? 'bg-white border-white/90 shadow-md text-slate-900'
                              : isClassCompleted
                              ? 'bg-purple-50/50 border-purple-200/90 text-slate-700 opacity-80'
                              : `${theme.bg} ${theme.border}`
                          }`}
                        >
                          {/* Live Now glowing badge */}
                          {isLive && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                              <span>ĐANG TRONG GIỜ DẠY</span>
                            </div>
                          )}

                          {/* Class Name & Edit button */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-snug break-words" title={cName}>
                                {cName}
                              </h4>
                              {isClassCompleted && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shrink-0 flex items-center gap-1">
                                  <span>🎓</span>
                                  <span>Đã kết thúc</span>
                                </span>
                              )}
                              {isClassUpcoming && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0 flex items-center gap-1">
                                  <span>⏳</span>
                                  <span>Sắp khai giảng</span>
                                </span>
                              )}
                              {isClassInactive && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300 shrink-0">
                                  Đã dừng
                                </span>
                              )}
                            </div>
                            {!isClassCompleted && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(schedule)}
                                className="text-slate-400 hover:text-indigo-800 p-1 rounded-md hover:bg-black/5 cursor-pointer shrink-0 transition-colors"
                                title="Sửa lịch"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                          </div>

                          {/* Meta Row: Time badge & Room badge */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="flex items-center gap-1 bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded-md font-bold border border-indigo-100/80 shrink-0 text-[11px]">
                              <Clock size={11} className="shrink-0 text-indigo-700" />
                              <span>{slot.startTime} – {slot.endTime}</span>
                            </span>
                            {slot.room && (
                              <span className="text-[10px] text-slate-700 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 border border-slate-200/80">
                                <MapPin size={10} className="text-slate-500" />
                                <span>{slot.room}</span>
                              </span>
                            )}
                          </div>

                          {/* Teacher Name */}
                          <p className="text-[11px] text-slate-600 font-semibold truncate" title={tName}>
                            GV: <strong className="font-black text-slate-900">{tName}</strong>
                          </p>

                          {/* Attached Lesson Badge or Cancelled Status */}
                          {(() => {
                            const cId = String(typeof schedule.classroom === 'object' ? schedule.classroom?._id : schedule.classroom);
                            const matchedCancelled = sessions.find((sess: any) => {
                              const sessCId = String(typeof sess.classroom === 'object' ? sess.classroom?._id : sess.classroom);
                              if (sessCId !== cId) return false;
                              if (sess.status !== 'CANCELLED') return false;
                              const rawTs = sess.startedAt || sess.createdAt;
                              const sDate = rawTs ? vietnamDate(new Date(rawTs)) : '';
                              return sDate === day.dateString;
                            });

                            if (matchedCancelled) {
                              return (
                                <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 space-y-1.5 shadow-2xs">
                                  {/* Row 1: Badges */}
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-950 border border-amber-300 whitespace-nowrap inline-flex items-center gap-1 shrink-0">
                                      🚫 Đã báo nghỉ
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md border border-amber-200 whitespace-nowrap shrink-0">
                                      Bảo lưu bài
                                    </span>
                                  </div>

                                  {/* Row 2: Lý do with cleanReason */}
                                  <div className="text-[11px] font-bold text-amber-950 leading-snug break-words">
                                    <span className="text-amber-800 font-extrabold">Lý do:</span>{' '}
                                    <span className="underline decoration-amber-400 font-black">
                                      {cleanReason(matchedCancelled.cancellationReason)}
                                    </span>
                                    {matchedCancelled.cancellationNote && (
                                      <p className="text-[10px] text-amber-800 font-medium italic mt-0.5 leading-tight">
                                        "{matchedCancelled.cancellationNote}"
                                      </p>
                                    )}
                                  </div>

                                  {/* Row 3: Action Button full-width */}
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (!window.confirm(`Khôi phục ca học cho lớp ${cName}? Lớp sẽ được mở lại lịch dạy bình thường.`)) return;
                                      try {
                                        await classroomSessionApi.restoreCancelledSession(matchedCancelled._id);
                                        showAlert('success', 'Đã hủy báo nghỉ và mở lại lịch học bình thường');
                                        await fetchData();
                                      } catch (err: any) {
                                        showAlert('error', err?.message || 'Không thể khôi phục');
                                      }
                                    }}
                                    className="w-full text-center rounded-lg bg-amber-200/90 hover:bg-amber-300 text-amber-950 border border-amber-400/80 py-1 px-2 text-xs font-black transition-colors cursor-pointer active:scale-98 shadow-2xs flex items-center justify-center gap-1"
                                    title="Hủy báo nghỉ và mở lại lịch dạy ca này"
                                  >
                                    <span>↩ Hủy báo nghỉ</span>
                                  </button>
                                </div>
                              );
                            }

                            const classLessons = classSyllabusMap[cId] || [];
                            const seq = resolveDynamicSlotLesson(schedule, slot, day.dateString, classLessons, sessions, vietnamDate());
                            if (seq.isUnheld) {
                              return (
                                <div className="p-2.5 rounded-xl border bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-2 shadow-2xs">
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0 bg-slate-400" />
                                  <div className="text-xs font-bold leading-snug truncate flex-1">
                                    <span className="text-slate-600 font-black">Chưa tổ chức</span>
                                    <span className="text-slate-400 ml-1 text-[11px]">(Đã qua ngày)</span>
                                  </div>
                                </div>
                              );
                            }
                            const displayName = seq.title || seq.vietnameseTitle || (slot.lessonTitle ? slot.lessonTitle.replace(/^Bài\s*\d+\s*[:\-]\s*/i, '') : '');
                            const unitLessonText = seq.unitNumber && seq.unitLessonNumber
                              ? `Unit ${seq.unitNumber} · Lesson ${seq.unitLessonNumber}`
                              : `Lesson ${seq.lessonNumber}`;
                            return displayName ? (
                              <div className={`p-2.5 rounded-xl border flex items-center gap-2 shadow-2xs ${
                                seq.isTaught
                                  ? 'bg-emerald-50/90 text-emerald-950 border-emerald-200/90'
                                  : 'bg-indigo-50/90 text-indigo-950 border-indigo-200/90'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${seq.isTaught ? 'bg-emerald-600' : 'bg-indigo-700'}`} />
                                <div className="text-xs font-bold leading-snug truncate flex-1" title={`${unitLessonText}: ${displayName}${seq.vietnameseTitle ? ` (${seq.vietnameseTitle})` : ''}`}>
                                  <span className={`${seq.isTaught ? 'text-emerald-700' : 'text-indigo-700'} font-black`}>
                                    {seq.isTaught ? `✅ ${unitLessonText}:` : `${unitLessonText}:`}
                                  </span>{' '}
                                  {displayName}
                                </div>
                              </div>
                            ) : null;
                          })()}
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
          {listModeItems.map((sch) => {
            const theme = COLOR_THEMES[sch.colorTag] || COLOR_THEMES.indigo;
            const classObj = typeof sch.classroom === 'object'
              ? sch.classroom
              : classrooms.find((c) => String(c._id) === String(sch.classroom));
            const cName = classObj?.name || 'Lớp học';
            const isClassCompleted = classObj?.status === 'COMPLETED';
            const isClassUpcoming = classObj?.status === 'UPCOMING';
            const isClassInactive = classObj?.status === 'INACTIVE';
            const tName = typeof sch.teacher === 'object' ? sch.teacher?.name : 'Chưa phân công';
            const tEmail = typeof sch.teacher === 'object' ? sch.teacher?.email : '';

            return (
              <div
                key={sch._id}
                className={`rounded-3xl border p-6 transition-all flex flex-col justify-between ${
                  isClassCompleted
                    ? 'bg-purple-50/25 border-purple-200/90 shadow-2xs'
                    : `bg-white ${theme.border}`
                }`}
              >
                <div className="space-y-4">
                  {/* Status Banner for Completed or Upcoming */}
                  {isClassCompleted && (
                    <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-900 text-xs font-black flex items-center gap-2 border border-purple-200">
                      <span className="text-sm">🎓</span>
                      <span>LỚP ĐÃ HOÀN THÀNH NIÊN KHÓA (Thời khóa biểu lưu trữ lịch sử)</span>
                    </div>
                  )}
                  {isClassUpcoming && (
                    <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-900 text-xs font-black flex items-center gap-2 border border-amber-200">
                      <span className="text-sm">⏳</span>
                      <span>LỚP SẮP KHAI GIẢNG (Chưa vào kỳ học chính thức)</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-800 block mb-1">
                        {isClassCompleted ? 'Lịch sử lớp học' : 'Thời khóa biểu cố định'}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{cName}</h3>
                        {isClassCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-200">
                            Đã kết thúc
                          </span>
                        ) : isClassUpcoming ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                            Sắp khai giảng
                          </span>
                        ) : isClassInactive ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-200 text-slate-700 border border-slate-300">
                            Đã dừng
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Đang học
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Năm học: {sch.academicYear || '2026-2027'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {!isClassCompleted && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(sch)}
                          className="p-2 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Chỉnh sửa lịch"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {!(sch as any).isSyntheticCompleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(sch._id, cName)}
                          className="p-2 rounded-xl text-rose-800 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa lịch"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Teacher snippet */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {tName[0] || 'T'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 break-words">{tName}</p>
                      <p className="text-xs text-slate-600 font-semibold break-words">{tEmail}</p>
                    </div>
                  </div>

                  {/* Display Actual Sessions for COMPLETED classes, or Weekly slots for active/upcoming classes */}
                  {isClassCompleted ? (
                    <div className="space-y-2.5">
                      {(() => {
                        const cId = String(typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom);
                        const classSessions = sessions
                          .filter((s: any) => {
                            const sessCId = String(typeof s.classroom === 'object' ? s.classroom?._id : s.classroom);
                            return sessCId === cId;
                          })
                          .sort((a: any, b: any) => new Date(b.startedAt || b.createdAt || 0).getTime() - new Date(a.startedAt || a.createdAt || 0).getTime());

                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                <span>📖</span>
                                <span>Buổi học thực tế đã dạy ({classSessions.length}):</span>
                              </p>
                              {classSessions.length > 0 && (
                                <span className="text-[11px] font-bold text-slate-500">
                                  Mới nhất lên đầu
                                </span>
                              )}
                            </div>

                            {classSessions.length === 0 ? (
                              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 text-center">
                                <p className="text-xs font-semibold text-purple-900">
                                  Lớp học đã kết thúc nhưng chưa ghi nhận lượt dạy thực tế nào trong hệ thống.
                                </p>
                              </div>
                            ) : (
                              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                {classSessions.map((sess: any, sIdx: number) => {
                                  const sessDate = sess.startedAt || sess.createdAt;
                                  const dObj = sessDate ? new Date(sessDate) : null;
                                  const dateStr = dObj && !isNaN(dObj.getTime())
                                    ? `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`
                                    : '';
                                  const timeStr = dObj && !isNaN(dObj.getTime())
                                    ? `${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')}`
                                    : '';
                                  const lessonTitle = sess.lesson?.title || sess.lesson?.vietnameseTitle || sess.title || `Buổi học #${classSessions.length - sIdx}`;
                                  const sessUnitInfo = getLessonUnitInfo(sess.lesson);
                                  const isCancelled = sess.status === 'CANCELLED';
                                  const presentStudents = sess.studentScores?.filter((st: any) => st.attendance === 'PRESENT')?.length ?? 0;
                                  const totalStudents = sess.studentScores?.length ?? 0;

                                  return (
                                    <div
                                      key={sess._id || sIdx}
                                      className={`p-3 rounded-2xl border text-xs flex flex-col gap-1.5 ${
                                        isCancelled
                                          ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                                          : 'bg-white border-slate-200 shadow-2xs text-slate-800'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[11px]">
                                            Buổi {classSessions.length - sIdx}
                                          </span>
                                          {dateStr && (
                                            <span className="font-bold text-slate-700 text-[11px]">
                                              📅 {dateStr} {timeStr ? `(${timeStr})` : ''}
                                            </span>
                                          )}
                                        </div>
                                        {isCancelled ? (
                                          <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-black text-[10px] shrink-0 border border-rose-200">
                                            Báo nghỉ
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black text-[10px] shrink-0 border border-emerald-200">
                                            ✓ Hoàn thành
                                          </span>
                                        )}
                                      </div>

                                      <div className="font-black text-slate-900 line-clamp-1 flex items-center gap-1.5" title={lessonTitle}>
                                        {sessUnitInfo.label && (
                                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-black shrink-0">
                                            {sessUnitInfo.label}
                                          </span>
                                        )}
                                        <span className="truncate">{lessonTitle}</span>
                                      </div>

                                      {!isCancelled && totalStudents > 0 && (
                                        <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
                                          <span>Chuyên cần:</span>
                                          <span className="font-bold text-slate-700">
                                            {presentStudents}/{totalStudents} học sinh có mặt
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    /* Weekly slots list */
                    <div className="space-y-2">
                      <p className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Các buổi học trong tuần ({sch.weeklySlots?.length || 0}):
                      </p>
                      <div className="space-y-1.5">
                        {[...(sch.weeklySlots || [])]
                          .sort((a: any, b: any) => {
                            const dayA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
                            const dayB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
                            if (dayA !== dayB) return dayA - dayB;
                            return (a.startTime || '').localeCompare(b.startTime || '');
                          })
                          .map((slot: any, idx: number) => {
                            const cId = String(typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom);
                            const classLessons = classSyllabusMap[cId] || [];
                            const targetDay = currentWeekDays.find(d => d.dayNum === slot.dayOfWeek);
                            const targetDateStr = targetDay?.dateString || currentWeekDays[0]?.dateString;

                            // Check if there is an explicit CANCELLED session on this slot's date
                            const matchedCancelled = sessions.find((sess: any) => {
                              const sessCId = String(typeof sess.classroom === 'object' ? sess.classroom?._id : sess.classroom);
                              if (sessCId !== cId) return false;
                              if (sess.status !== 'CANCELLED') return false;
                              const rawTs = sess.startedAt || sess.createdAt;
                              const sDate = rawTs ? vietnamDate(new Date(rawTs)) : '';
                              return sDate === targetDateStr;
                            });

                            const seq = resolveDynamicSlotLesson(sch, slot, targetDateStr, classLessons, sessions, vietnamDate());
                            const isCancelled = !!matchedCancelled || seq.isCancelled;
                            const reasonText = matchedCancelled?.cancellationReason
                              ? cleanReason(matchedCancelled.cancellationReason)
                              : (seq.vietnameseTitle || 'Đã báo nghỉ');
                            const displayName = seq.title || seq.vietnameseTitle || (slot.lessonTitle ? slot.lessonTitle.replace(/^Bài\s*\d+\s*[:\-]\s*/i, '') : '');
                            const unitLessonText = seq.unitNumber && seq.unitLessonNumber
                              ? `Unit ${seq.unitNumber} · Lesson ${seq.unitLessonNumber}`
                              : `Lesson ${seq.lessonNumber}`;

                            return (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl border text-xs font-bold space-y-1.5 transition-all ${
                                  isCancelled
                                    ? 'bg-rose-50/50 border-rose-200'
                                    : seq.isTaught
                                    ? 'bg-emerald-50/40 border-emerald-200'
                                    : targetDay?.isToday
                                    ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300'
                                    : 'bg-slate-50 border-slate-200/70'
                                }`}
                              >
                                {/* Dòng 1: Thứ + Ngày (dd/MM), Giờ và Phòng học */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md font-black text-xs shrink-0 ${
                                      targetDay?.isToday
                                        ? 'bg-indigo-700 text-white'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {DAY_LABELS[slot.dayOfWeek]}{targetDay?.shortDate ? ` · ${targetDay.shortDate}` : ''}
                                    </span>
                                    {targetDay?.isToday && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black shrink-0">
                                        Hôm nay
                                      </span>
                                    )}
                                    <span className="text-slate-900 font-bold text-xs whitespace-nowrap">
                                      {slot.startTime} – {slot.endTime}
                                    </span>
                                  </div>
                                  {slot.room && (
                                    <span className="text-slate-500 font-semibold text-[11px] shrink-0 whitespace-nowrap">
                                      • {slot.room}
                                    </span>
                                  )}
                                </div>

                                {/* Dòng 2: Nội dung buổi học hoặc Trạng thái Báo nghỉ */}
                                {isCancelled ? (
                                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200/80 space-y-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                      <span className="text-[11px] font-black text-rose-800 flex items-center gap-1 shrink-0">
                                        <span>🚫</span> Buổi học báo nghỉ
                                      </span>
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0 whitespace-nowrap">
                                        ⭐ Bảo lưu bài học
                                      </span>
                                    </div>
                                    {reasonText && (
                                      <div className="text-[11px] font-bold text-rose-900 bg-rose-100/70 px-2 py-1 rounded-lg border border-rose-200/60 leading-snug break-words">
                                        Lý do: <span className="font-extrabold">{reasonText}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : seq.isUnheld ? (
                                  <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500 font-bold border border-slate-200 text-[11px] text-center">
                                    Chưa tổ chức
                                  </div>
                                ) : displayName ? (
                                  seq.isTaught ? (
                                    <div
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-900 font-black border border-emerald-200 flex items-center gap-1 min-w-0 truncate"
                                      title={`${unitLessonText}: ${displayName}`}
                                    >
                                      <span className="shrink-0">✅</span>
                                      <span className="truncate">{unitLessonText}: {displayName}</span>
                                    </div>
                                  ) : (
                                    <div
                                      className="p-1.5 rounded-lg bg-amber-50 text-amber-900 font-black border border-amber-200 flex items-center gap-1 min-w-0 truncate"
                                      title={`${unitLessonText}: ${displayName}`}
                                    >
                                      <span className="shrink-0">🎯</span>
                                      <span className="truncate">{unitLessonText}: {displayName}</span>
                                    </div>
                                  )
                                ) : null}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>
                    {isClassCompleted
                      ? `${sessions.filter((s: any) => String(typeof s.classroom === 'object' ? s.classroom?._id : s.classroom) === String(typeof sch.classroom === 'object' ? sch.classroom?._id : sch.classroom)).length} buổi học thực tế`
                      : `${sch.weeklySlots?.length || 0} ca/tuần`}
                  </span>
                  <span className={isClassCompleted ? 'text-purple-800 font-bold' : sch.isActive ? 'text-emerald-800 font-bold' : 'text-slate-600'}>
                    {isClassCompleted ? 'Đã hoàn thành' : sch.isActive ? '✓ Đang kích hoạt' : 'Tạm dừng'}
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
          <div className="bg-white rounded-3xl p-7 w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center font-black">
                  <CalendarDays size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {editingSchedule ? 'Cập Nhật Thời Khóa Biểu' : 'Xếp Thời Khóa Biểu Cho Lớp'}
                  </h2>
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
              {/* Ngày hiệu lực & Kích hoạt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Có hiệu lực từ <span className="text-rose-800">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData((p) => ({ ...p, effectiveFrom: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Có hiệu lực đến (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    min={formData.effectiveFrom}
                    value={formData.effectiveTo}
                    onChange={(e) => setFormData((p) => ({ ...p, effectiveTo: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 px-1">
                <input
                  type="checkbox"
                  id="isActiveSchedule"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-700 focus:ring-indigo-500 border-slate-300"
                />
                <label htmlFor="isActiveSchedule" className="text-sm font-bold text-slate-800 cursor-pointer">
                  Kích hoạt lịch dạy cho lớp ngay sau khi lưu
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Lớp học */}
                <div>
                  <label className="block text-sm font-black uppercase tracking-wider text-slate-700 mb-1.5">
                    Lớp Học <span className="text-rose-800">*</span>
                  </label>
                  <select
                    value={formData.classroom}
                    onChange={(e) => handleClassChange(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="" disabled>
                      -- Chọn lớp học --
                    </option>
                    {classrooms
                      .filter((c) => c.status !== 'COMPLETED')
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} {c.ageGroupCode ? `(${c.ageGroupCode} tuổi)` : ''} {c.status === 'UPCOMING' ? '— [Sắp khai giảng]' : c.status === 'INACTIVE' ? '— [Đã dừng]' : ''}
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

              {/* Tự động kích hoạt khi xếp lịch cho lớp sắp khai giảng */}
              {(() => {
                const selectedClass = classrooms.find(c => String(c._id) === String(formData.classroom));
                if (selectedClass?.status === 'UPCOMING') {
                  return (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                      <span className="text-base select-none shrink-0 mt-0.5">⚡</span>
                      <div className="text-xs">
                        <strong className="text-amber-950 font-black block">
                          Tự động kích hoạt khai giảng lớp học
                        </strong>
                        <span className="text-amber-800 font-medium block mt-0.5">
                          Lớp "{selectedClass.name}" đang ở trạng thái "Sắp khai giảng". Khi lưu thời khóa biểu, hệ thống sẽ tự động kích hoạt lớp sang trạng thái "Đang học" (Active).
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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

              {/* Danh sách các buổi học trong tuần - Tinh gọn */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Clock size={16} className="text-indigo-700" />
                      <span>Khung Giờ Học Hàng Tuần ({formData.weeklySlots.length} ca/tuần)</span> <span className="text-rose-800">*</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    className="py-1.5 px-3 rounded-xl bg-indigo-50 text-indigo-800 font-bold text-xs hover:bg-indigo-100 flex items-center gap-1 cursor-pointer shrink-0 border border-indigo-200"
                  >
                    <Plus size={14} />
                    <span>Thêm ca học</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.weeklySlots.map((slot, index) => (
                    <div
                      key={index}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Thứ</label>
                          <select
                            value={slot.dayOfWeek}
                            onChange={(e) => handleSlotChange(index, 'dayOfWeek', Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                          >
                            <option value={1}>Thứ Hai</option>
                            <option value={2}>Thứ Ba</option>
                            <option value={3}>Thứ Tư</option>
                            <option value={4}>Thứ Năm</option>
                            <option value={5}>Thứ Sáu</option>
                            <option value={6}>Thứ Bảy</option>
                            <option value={0}>Chủ Nhật</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Giờ bắt đầu</label>
                          <input
                            type="time"
                            required
                            value={slot.startTime}
                            onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Giờ kết thúc</label>
                          <input
                            type="time"
                            required
                            value={slot.endTime}
                            onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                          />
                        </div>

                        <div className="sm:col-span-3 flex items-center gap-2 pt-1 sm:pt-0">
                          <div className="flex-1">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Phòng học</label>
                            <input
                              type="text"
                              placeholder="Phòng học chính"
                              value={slot.room || ''}
                              onChange={(e) => handleSlotChange(index, 'room', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600"
                            />
                          </div>

                          {formData.weeklySlots.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSlot(index)}
                              className="mt-5 p-2 text-rose-600 hover:bg-rose-100 rounded-xl cursor-pointer shrink-0 transition-colors"
                              title="Xóa ca này"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons with Clear Schedule option */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {editingSchedule ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const cName = classrooms.find(c => c._id === formData.classroom)?.name || 'lớp này';
                      if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ thời khóa biểu của lớp "${cName}" không? Các ca học định kỳ sẽ được giải phóng hoàn toàn.`)) {
                        try {
                          await adminApi.deleteSchedule(editingSchedule._id);
                          showAlert('success', 'Đã xóa thời khóa biểu của lớp thành công.');
                          setIsModalOpen(false);
                          await fetchData();
                        } catch (err: any) {
                          showAlert('error', err?.message || 'Không thể xóa thời khóa biểu.');
                        }
                      }
                    }}
                    className="py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 transition-all"
                    title="Xóa hoàn toàn thời khóa biểu của lớp này"
                  >
                    <Trash2 size={15} />
                    <span>Xóa Toàn Bộ Lịch Lớp Này</span>
                  </button>
                ) : <div />}

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm sm:text-base cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="py-2.5 px-6 rounded-2xl bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white font-black text-sm sm:text-base cursor-pointer shadow-xs transition-all"
                  >
                    {modalLoading ? 'Đang lưu lịch...' : 'Lưu Thời Khóa Biểu'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM LỚP HỌC MỚI TRỰC TIẾP TỪ TKB ──────────────────────── */}
    </div>
  );
};
