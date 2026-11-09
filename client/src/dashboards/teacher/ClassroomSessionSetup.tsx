import { lessonPosition } from '../../utils/curriculumLessons';
import { PrintLessonCards } from '../../components/teacher/PrintLessonCards';
import { scheduleEffectiveAt, countsTowardCurriculum } from '../../utils/teachingSchedule';
import { vietnamDate, vietnamWallClock } from '../../utils/vietnamTime';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  Play,
  CheckSquare,
  Square,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Search,
  Flame,
  Sparkles,
  Lock,
  AlertTriangle,
  X
} from 'lucide-react';
import { teacherApi, classroomSessionApi } from '../../services/api';
import type { ClassSchedule } from '../../types';

const Loader = () => (
  <div className="flex h-72 flex-col items-center justify-center gap-3">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
    <span className="text-base font-bold text-slate-700">Đang tải dữ liệu lớp học và giáo trình…</span>
  </div>
);

const DAY_LABELS: Record<number, string> = {
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy',
  0: 'Chủ Nhật'
};

// Helper: Vietnam timezone time (UTC+7)
const getVietnamNow = vietnamWallClock;

const getActivityMeta = (type: string, title?: string) => {
  const map: Record<string, { icon: string; name: string }> = {
    LISTEN_CHOOSE: { icon: '🎧', name: 'Nghe & Chọn' },
    IMAGE_WORD_MATCH: { icon: '🔤', name: 'Nhìn Tranh Chọn Từ' },
    MATCHING: { icon: '🔗', name: 'Nối Cặp Tranh Từ' },
    MEMORY_CARD: { icon: '🃏', name: 'Lật Thẻ Trí Nhớ' },
    MEMORY: { icon: '🃏', name: 'Lật Thẻ Trí Nhớ' },
    COUNT_OBJECTS: { icon: '🔢', name: 'Đếm Số Lượng' },
    TRUE_FALSE: { icon: '👍', name: 'Đúng hay Sai' },
    FIND_OBJECT: { icon: '🔍', name: 'Tìm Đồ Vật' },
    TAP_PICTURE: { icon: '👆', name: 'Chạm Đúng Tranh' },
    COLOR_RECOGNITION: { icon: '🎨', name: 'Nhận Biết Màu' },
    MISSING_OBJECT: { icon: '🎩', name: 'Đồ Vật Biến Mất' },
    CLASSIFICATION: { icon: '🗂️', name: 'Phân Loại Nhóm' },
    DRAG_DROP: { icon: '📦', name: 'Đặt Vào Hộp' },
    LISTEN_REPEAT: { icon: '🎤', name: 'Nghe & Đọc Theo' },
    FEED_ANIMAL: { icon: '🐻', name: 'Cùng Gấu Koko' },
    BUBBLE_POP: { icon: '🫧', name: 'Đập Bong Bóng' },
    STAR_CATCHER: { icon: '⭐', name: 'Hứng Sao Từ Vựng' },
    ANIMAL_SOUND: { icon: '🐾', name: 'Tiếng Kêu Con Vật' },
    LUCKY_WHEEL: { icon: '🎡', name: 'Vòng Quay Koko' },
    MYSTERY_BOX: { icon: '🎁', name: 'Hộp Bí Mật' }
  };
  const found = map[type];
  return {
    icon: found?.icon || '🎮',
    name: found?.name || (title ? title.split(':')[0] : 'Trò chơi')
  };
};

export const ClassroomSessionSetup: React.FC = () => {
  const { classId: routeClassId = '' } = useParams<{ classId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationState = useLocation().state;
  const preparedPlan = locationState?.lessonPlan;
  const selectedRowRef = useRef<HTMLTableRowElement>(null);
  const scheduleTableRef = useRef<HTMLDivElement>(null);

  const [activeClassId, setActiveClassId] = useState<string>(
    routeClassId || searchParams.get('classroomId') || ''
  );
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [classroom, setClassroom] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [previousSessions, setPreviousSessions] = useState<any[]>([]);
  const [reviewSessions, setReviewSessions] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);

  // Selection states
  const [selectedLessonId, setSelectedLessonId] = useState(
    searchParams.get('lessonId') || ''
  );
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>([]);
  const [lessonActivities, setLessonActivities] = useState<any[]>([]);

  // Session metadata
  const [sessionNumber, setSessionNumber] = useState(1);
  const [includeWarmup, setIncludeWarmup] = useState(true);
  const [duration, setDuration] = useState(() => {
    const value = Number(preparedPlan?.meta?.durationMinutes || locationState?.durationMinutes || searchParams.get('duration') || searchParams.get('durationMinutes'));
    return [15, 20, 25, 30, 35, 45, 60].includes(value) ? value : 25;
  });
  const [title, setTitle] = useState('');

  // Pre-Session Attendance Check-in State
  const [attendanceDate, setAttendanceDate] = useState(() => vietnamDate());
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceNote, setAttendanceNote] = useState('');
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Filters & Schedule Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('ALL');

  const [creating, setCreating] = useState(false);
  const [createdDraftId, setCreatedDraftId] = useState('');
  const [error, setError] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Live timer for timetable check
  const [currentVnTime, setCurrentVnTime] = useState<Date>(getVietnamNow());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentVnTime(getVietnamNow());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    teacherApi
      .getClasses()
      .then((res) => {
        const list = (res.data || []).filter((room: any) => room.status === 'ACTIVE');
        setAllClasses(list);
        if (!activeClassId && list.length > 0) {
          setActiveClassId(String(list[0]._id));
        }
      })
      .catch((e) => setError(e.message || 'Chưa tải được danh sách lớp.'))
      .finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    if (!activeClassId) return;
    let cancelled = false;
    setError('');
    const todayStr = attendanceDate || vietnamDate();
    setLoadingAttendance(true);

    Promise.all([
      teacherApi.getClassDetail(activeClassId),
      teacherApi.getContent(),
      classroomSessionApi.getSessions({ classroomId: activeClassId }),
      teacherApi.getClassAttendance(activeClassId, todayStr),
      teacherApi.getMySchedule()
    ])
      .then(([cls, cnt, prevSess, attRes, schedRes]) => {
        if (cancelled) return;
        const classData = cls.data;
        setClassroom(classData);
        setContent(cnt.data);
        const list = (prevSess.data || []) as any[];
        setReviewSessions(list);
        setPreviousSessions(list.filter(countsTowardCurriculum));
        const maxPrev = list.reduce((m: number, s: any) => Math.max(m, Number(s.sessionNumber) || 0), 0);
        const nextNum = maxPrev > 0 ? maxPrev + 1 : (list.length + 1);
        setSessionNumber(nextNum);

        const schedList = Array.isArray(schedRes) ? schedRes : (schedRes?.data || schedRes?.schedules || []);
        setSchedules(schedList);

        // Auto pre-select attached lesson from timetable slot or Admin-designated current lesson if not provided in URL
        if (!selectedLessonId) {
          const activeClassScheds = schedList.filter((s: any) => {
            const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
            return String(cId) === String(activeClassId) && scheduleEffectiveAt(s);
          });
          let slotLessonId: string | null = null;
          const currentDay = getVietnamNow().getDay();
          const currentMinutes = getVietnamNow().getHours() * 60 + getVietnamNow().getMinutes();
          // 1. First priority: exact slot window on current day
          for (const s of activeClassScheds) {
            for (const slot of s.weeklySlots || []) {
              const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
              const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
              if (slot.dayOfWeek === currentDay && currentMinutes >= (sH * 60 + sM - 15) && currentMinutes <= (eH * 60 + eM + 30)) {
                if (slot.lesson) {
                  slotLessonId = typeof slot.lesson === 'object' ? slot.lesson._id : slot.lesson;
                  break;
                }
              }
            }
            if (slotLessonId) break;
          }

          // 2. Second priority: scheduled slot on current day (any time today)
          if (!slotLessonId) {
            for (const s of activeClassScheds) {
              for (const slot of s.weeklySlots || []) {
                if (slot.dayOfWeek === currentDay && slot.lesson) {
                  slotLessonId = typeof slot.lesson === 'object' ? slot.lesson._id : slot.lesson;
                  break;
                }
              }
              if (slotLessonId) break;
            }
          }

          if (slotLessonId) {
            setSelectedLessonId(String(slotLessonId));
          } else if (!selectedLessonId) {
            const cId = classData?.currentLesson
              ? (typeof classData.currentLesson === 'object' ? classData.currentLesson._id : classData.currentLesson)
              : null;
            const completed = new Set([
              ...(classData?.completedLessons || []).map((item: any) => String(item?._id || item)),
              ...list.filter(countsTowardCurriculum).map(item => String(item.lesson?._id || item.lesson))
            ]);
            if (cId && !completed.has(String(cId))) {
              setSelectedLessonId(String(cId));
            } else {
              const nextUntaught = (cnt.data?.lessons || []).find((l: any) => !completed.has(String(l._id)) && l.ageGroupCode === classData.ageGroupCode);
              if (nextUntaught) setSelectedLessonId(String(nextUntaught._id));
            }
          }
        }

        // Populate attendance records from today's saved records or initialize with PRESENT
        const classroomStudents = classData?.students || [];
        const existingRecords = attRes?.data?.records || [];
        const existingMap = new Map(existingRecords.map((r: any) => [String(r.student?._id || r.student), r]));

        const merged = classroomStudents.map((st: any) => {
          const sId = String(st._id || st);
          const found = existingMap.get(sId) as any;
          return {
            student: st,
            status: found?.status || 'PRESENT',
            note: found?.note || ''
          };
        });
        setAttendanceRecords(merged);
        if (attRes?.data?.note) setAttendanceNote(attRes.data.note);
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoadingAttendance(false); });
    return () => { cancelled = true; };
  }, [activeClassId, attendanceDate]);

  // ── Requirement 10: Strict Timetable Timing Evaluation ─────────────────────
  const scheduleLiveTiming = useMemo(() => {
    const currentDay = currentVnTime.getDay();
    const currentMinutes = currentVnTime.getHours() * 60 + currentVnTime.getMinutes();

    const classSchedules = schedules.filter((s: any) => {
      const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
      return String(cId) === String(activeClassId) && scheduleEffectiveAt(s);
    });

    if (classSchedules.length === 0) {
      return {
        canTeachNow: false,
        activeSlot: null,
        nextSlotText: null,
        hasSchedule: false,
        reason: 'Lớp học chưa có lịch xếp thời khóa biểu từ Ban Quản Trị.'
      };
    }

    let activeSlot: any = null;
    let todaySlot: any = null;
    const upcomingList: Array<{ slot: any; distance: number; dateStr: string }> = [];

    for (const sch of classSchedules) {
      for (const slot of sch.weeklySlots || []) {
        const [sH, sM] = (slot.startTime || '00:00').split(':').map(Number);
        const [eH, eM] = (slot.endTime || '23:59').split(':').map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        if (slot.dayOfWeek === currentDay) {
          if (!todaySlot) todaySlot = slot;
          // Active slot window: 15 minutes before start up to 30 minutes after end
          if (currentMinutes >= (startMin - 15) && currentMinutes <= (endMin + 30)) {
            activeSlot = slot;
          }
        }

        let dayDiff = slot.dayOfWeek - currentDay;
        if (dayDiff < 0 || (dayDiff === 0 && startMin < currentMinutes)) {
          dayDiff += 7;
        }
        const distance = dayDiff * 24 * 60 + (startMin - currentMinutes);
        const targetDate = new Date(currentVnTime);
        targetDate.setDate(targetDate.getDate() + dayDiff);
        const dateStr = `${targetDate.getDate()}/${targetDate.getMonth() + 1}`;

        upcomingList.push({
          slot,
          distance,
          dateStr
        });
      }
    }

    const effectiveSlot = activeSlot || todaySlot;
    if (effectiveSlot) {
      const isExactWindow = !!activeSlot;
      return {
        canTeachNow: true,
        activeSlot: effectiveSlot,
        nextSlotText: null,
        hasSchedule: true,
        reason: isExactWindow
          ? `Đang trong khung giờ dạy: ${DAY_LABELS[effectiveSlot.dayOfWeek]} · ${effectiveSlot.startTime} - ${effectiveSlot.endTime}`
          : `Lịch dạy hôm nay: ${DAY_LABELS[effectiveSlot.dayOfWeek]} · ${effectiveSlot.startTime} - ${effectiveSlot.endTime}`
      };
    }

    upcomingList.sort((a, b) => a.distance - b.distance);
    const nextItem = upcomingList[0] || null;

    let nextSlotText = null;
    if (nextItem) {
      const hours = Math.floor(nextItem.distance / 60);
      const mins = nextItem.distance % 60;
      const timeRemaining = hours > 24
        ? `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`
        : `${hours} giờ ${mins} phút`;
      nextSlotText = `${DAY_LABELS[nextItem.slot.dayOfWeek]} · ${nextItem.dateStr} · ${nextItem.slot.startTime} - ${nextItem.slot.endTime} · còn ${timeRemaining}`;
    }

    return {
      canTeachNow: false,
      activeSlot: null,
      nextSlotText,
      hasSchedule: true,
      reason: nextSlotText
        ? `Chưa đến giờ dạy theo thời khóa biểu. Buổi học kế tiếp: ${nextSlotText}`
        : 'Chưa có ca dạy phù hợp trong tuần.'
    };
  }, [currentVnTime, schedules, activeClassId]);

  const rawScheduledLessonId = String(scheduleLiveTiming.activeSlot?.lesson?._id || scheduleLiveTiming.activeSlot?.lesson || '');
  const isSlotLessonAlreadyCompleted = useMemo(() => {
    if (!rawScheduledLessonId || !classroom) return false;
    return (classroom.completedLessons || []).some(
      (id: any) => String(id?._id || id) === rawScheduledLessonId
    );
  }, [rawScheduledLessonId, classroom]);
  const scheduledLessonId = isSlotLessonAlreadyCompleted ? '' : rawScheduledLessonId;
  const lessonMismatch = !!scheduledLessonId && !!selectedLessonId && scheduledLessonId !== selectedLessonId;
  const canStartSession = scheduleLiveTiming.canTeachNow && !loadingAttendance
    && attendanceDate === vietnamDate() && (!lessonMismatch || !!createdDraftId);
  const [draftSavedSuccess, setDraftSavedSuccess] = useState(false);

  // When a lesson is chosen, update title and fetch activities
  useEffect(() => {
    if (!selectedLessonId || !content) return;
    const lesson = content.lessons.find((l: any) => l._id === selectedLessonId);
    setSelectedLesson(lesson || null);

    if (lesson) {
      setTitle(`Buổi ${sessionNumber}: ${lesson.title} - ${lesson.vietnameseTitle || ''}`);
    }

    const acts = content.activities.filter(
      (a: any) => String(a.lesson?._id || a.lesson) === selectedLessonId
    );
    setLessonActivities(acts);
    setSelectedActivityIds(acts.map((a: any) => String(a._id)));
  }, [selectedLessonId, content, sessionNumber]);

  const toggleActivity = (id: string) => {
    setSelectedActivityIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setStudentStatus = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE') => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        const sId = String(r.student?._id || r.student);
        return sId === String(studentId) ? { ...r, status } : r;
      })
    );
  };

  const setStudentNote = (studentId: string, note: string) => {
    setAttendanceRecords((prev) =>
      prev.map((r) => {
        const sId = String(r.student?._id || r.student);
        return sId === String(studentId) ? { ...r, note } : r;
      })
    );
  };

  const markAllStatus = (status: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE') => {
    setAttendanceRecords((prev) => prev.map((r) => ({ ...r, status })));
  };

  const handleSaveDraftOnly = async () => {
    if (!activeClassId || loadingAttendance || creating) return;
    setCreating(true);
    setError('');
    setDraftSavedSuccess(false);
    try {
      const res = await classroomSessionApi.createSession({
        classroomId: activeClassId,
        lessonId: selectedLessonId || undefined,
        title: title || `Buổi ${sessionNumber}: ${selectedLesson?.title || 'Buổi dạy trên lớp'}`,
        activityIds: selectedActivityIds,
        plannedDuration: duration,
        sessionNumber: Number(sessionNumber) || 1,
        includeWarmup,
        lessonPlan: preparedPlan,
        attendanceRecords,
        attendanceDate,
        attendanceNote
      });
      setCreatedDraftId(res.data._id);
      setDraftSavedSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Không thể lưu kế hoạch buổi dạy');
    } finally {
      setCreating(false);
    }
  };

  const handleCreate = async () => {
    if (!activeClassId || loadingAttendance || creating) return;

    // Strict timetable verification
    if (!scheduleLiveTiming.canTeachNow) {
      setError(scheduleLiveTiming.reason);
      return;
    }
    if (lessonMismatch && !createdDraftId) {
      const scheduledLesson = content?.lessons?.find((item: any) => String(item._id) === scheduledLessonId);
      setError(`Bài đã chọn khác bài được phân trong thời khóa biểu${scheduledLesson ? `: ${scheduledLesson.title}` : ''}. Hãy chọn đúng bài để bắt đầu.`);
      return;
    }
    if (attendanceDate !== vietnamDate()) {
      setError('Điểm danh phải là ngày hôm nay để bắt đầu buổi dạy. Vui lòng chọn lại ngày hôm nay.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      let sessionId = createdDraftId;
      if (!sessionId) {
        const res = await classroomSessionApi.createSession({
          classroomId: activeClassId,
          lessonId: selectedLessonId || undefined,
          title: title || `Buổi ${sessionNumber}: ${selectedLesson?.title || 'Buổi dạy trên lớp'}`,
          activityIds: selectedActivityIds,
          plannedDuration: duration,
          sessionNumber: Number(sessionNumber) || 1,
          includeWarmup,
          lessonPlan: preparedPlan,
          attendanceRecords,
          attendanceDate,
          attendanceNote
        });
        sessionId = res.data._id;
        setCreatedDraftId(sessionId);
      } else {
        await teacherApi.saveClassAttendance(activeClassId, {
          date: attendanceDate,
          records: attendanceRecords,
          note: attendanceNote
        });
      }
      await classroomSessionApi.startSession(sessionId);
      navigate(`/teacher/classroom-sessions/${sessionId}/live`);
    } catch (e: any) {
      setError(e.message || 'Không thể bắt đầu buổi dạy');
      setCreating(false);
    }
  };

  const targetBookNumber =
    classroom?.ageGroupCode === '3-4' ? 1 : classroom?.ageGroupCode === '4-5' ? 2 : 3;

  const targetBookTitle =
    classroom?.ageGroupCode === '3-4'
      ? 'Sách 1'
      : classroom?.ageGroupCode === '4-5'
        ? 'Sách 2'
        : 'Sách 3';

  // Build lesson schedule items strictly sorted by BOOK SEQUENTIAL ORDER
  const scheduleItems = useMemo(() => {
    if (!content || !content.lessons || !classroom) return [];

    const targetBook = classroom.ageGroupCode === '3-4' ? 1 : classroom.ageGroupCode === '4-5' ? 2 : 3;
    const unitsMap = new Map<string, any>((content.units || []).map((u: any) => [String(u._id), u]));
    const booksMap = new Map<any, any>((content.books || []).map((b: any) => [b.bookNumber, b]));

    const taughtSessionMap = new Map<string, string>();
    previousSessions.forEach((s) => {
      const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
      if (activeClassId && sClassId && sClassId !== String(activeClassId)) {
        return;
      }
      const lId = String(typeof s.lesson === 'object' ? s.lesson?._id : s.lesson);
      if (lId && s._id) {
        taughtSessionMap.set(lId, String(s._id));
      }
    });

    const taughtLessonIds = new Set(
      previousSessions
        .filter((s) => {
          const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
          return !sClassId || !activeClassId || sClassId === String(activeClassId);
        })
        .map((s) => (typeof s.lesson === 'object' ? s.lesson?._id : s.lesson))
        .filter(Boolean)
        .map(String)
    );

    (classroom.completedLessons || []).forEach((id: any) => taughtLessonIds.add(String(id?._id || id)));

    // Identify last taught session
    const pastSessionsWithLesson = [...previousSessions]
      .filter((s: any) => {
        if (!s.lesson) return false;
        const sClassId = String(typeof s.classroom === 'object' ? (s.classroom?._id || s.classroom) : s.classroom);
        return !sClassId || !activeClassId || sClassId === String(activeClassId);
      })
      .sort((a: any, b: any) => new Date(b.startedAt || b.createdAt).getTime() - new Date(a.startedAt || a.createdAt).getTime());
    const lastSession = pastSessionsWithLesson[0];
    const lastTaughtLessonId = lastSession ? String(typeof lastSession.lesson === 'object' ? lastSession.lesson._id : lastSession.lesson) : null;
    const lastTaughtSessionNum = lastSession?.sessionNumber || null;

    // Filter relevant lessons
    const relevantLessons = content.lessons.filter((l: any) => {
      const uId = Array.isArray(l.curriculumUnits) ? String(l.curriculumUnits[0]) : String(l.curriculumUnits || '');
      const u = unitsMap.get(uId);
      const bNum = u?.bookNumber || (l.ageGroupCode === '3-4' ? 1 : l.ageGroupCode === '4-5' ? 2 : 3);
      return bNum === targetBook || l.ageGroupCode === classroom.ageGroupCode;
    });

    // Sort according to Book sequence: Unit 1..9 -> Lesson displayOrder
    const sorted = [...relevantLessons].sort((a: any, b: any) => {
      const uIdA = Array.isArray(a.curriculumUnits) ? String(a.curriculumUnits[0]) : String(a.curriculumUnits || '');
      const uIdB = Array.isArray(b.curriculumUnits) ? String(b.curriculumUnits[0]) : String(b.curriculumUnits || '');
      const unitA = unitsMap.get(uIdA);
      const unitB = unitsMap.get(uIdB);

      const unitNumA = unitA?.unitNumber || 0;
      const unitNumB = unitB?.unitNumber || 0;
      if (unitNumA !== unitNumB) return unitNumA - unitNumB;
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

    // Admin designated lesson
    const adminCurrentId = classroom?.currentLesson ? String(typeof classroom.currentLesson === 'object' ? classroom.currentLesson._id : classroom.currentLesson) : null;

    // Find the next lesson in book order that hasn't been taught
    const nextUntaughtLesson = sorted.find((l: any) => !taughtLessonIds.has(String(l._id))) || sorted[0];
    const nextUntaughtId = nextUntaughtLesson ? String(nextUntaughtLesson._id) : null;
    // Check if Admin manually designated a lesson that differs from sequential auto-pacing
    const isSpecialAdminOverride = Boolean(adminCurrentId && nextUntaughtId && adminCurrentId !== nextUntaughtId && !taughtLessonIds.has(adminCurrentId));
    const nextLessonId = (isSpecialAdminOverride ? adminCurrentId : nextUntaughtId) || (sorted[0] ? String(sorted[0]._id) : null);

    return sorted.map((lesson: any, index: number) => {
      const unitId = Array.isArray(lesson.curriculumUnits)
        ? String(lesson.curriculumUnits[0])
        : String(lesson.curriculumUnits || '');
      const unit = unitsMap.get(unitId);
      const bookNumber = targetBook;
      const book = booksMap.get(bookNumber) || (unit?.book as any);

      const acts = (content.activities || []).filter(
        (a: any) => String(a.lesson) === String(lesson._id)
      );

      const isTaught = taughtLessonIds.has(String(lesson._id));
      const isLastTaught = String(lesson._id) === lastTaughtLessonId;
      const isAdminAssigned = isSpecialAdminOverride && String(lesson._id) === adminCurrentId;
      const isNextToTeach = !isTaught && String(lesson._id) === nextLessonId;
      const lastSessionId = taughtSessionMap.get(String(lesson._id));

      return {
        ...lesson,
        unit,
        book,
        bookNumber,
        activityCount: acts.length,
        vocabCount: lesson.vocabularyItems?.length || 0,
        isTaught,
        isLastTaught,
        isAdminAssigned,
        isNextToTeach,
        lastTaughtSessionNum,
        lastSessionId,
        bookOrderIndex: index + 1
      };
    });
  }, [content, previousSessions, classroom, activeClassId]);

  // Pre-select recommended next lesson
  useEffect(() => {
    if (!selectedLessonId && scheduleItems.length > 0) {
      const adminAssigned = scheduleItems.find((item: any) => item.isAdminAssigned);
      const nextItem = adminAssigned || scheduleItems.find((item: any) => item.isNextToTeach) || scheduleItems[0];
      if (nextItem?._id) {
        setSelectedLessonId(String(nextItem._id));
      }
    }
  }, [scheduleItems, selectedLessonId]);

  // Filter lessons
  const filteredSchedule = useMemo(() => {
    return scheduleItems.filter((item: any) => {
      if (selectedUnitFilter !== 'ALL' && String(item.unit?._id) !== selectedUnitFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tMatch = (item.title || '').toLowerCase().includes(q);
        const vnMatch = (item.vietnameseTitle || '').toLowerCase().includes(q);
        const uMatch = (item.unit?.title || item.unit?.bigQuestion || '').toLowerCase().includes(q);
        const topMatch = (item.topic?.englishName || '').toLowerCase().includes(q);
        if (!tMatch && !vnMatch && !uMatch && !topMatch) return false;
      }

      return true;
    });
  }, [scheduleItems, selectedUnitFilter, searchQuery]);

  const reviewLesson = useMemo(() => {
    const priorSession = reviewSessions
      .filter((item: any) => item.status === 'COMPLETED' && item.lesson
        && Number(item.sessionNumber) < sessionNumber
        && String(item.lesson?._id || item.lesson) !== String(selectedLessonId))
      .sort((a: any, b: any) => Number(b.sessionNumber) - Number(a.sessionNumber))[0];
    if (priorSession) {
      const lessonId = String(priorSession.lesson?._id || priorSession.lesson);
      return scheduleItems.find((item: any) => String(item._id) === lessonId) || priorSession.lesson;
    }
    const index = scheduleItems.findIndex((item: any) => String(item._id) === String(selectedLessonId));
    return index > 0 ? scheduleItems[index - 1] : null;
  }, [reviewSessions, scheduleItems, selectedLessonId, sessionNumber]);

  useEffect(() => {
    const row = selectedRowRef.current, table = scheduleTableRef.current;
    if (step === 1 && row && table) {
      table.scrollTop += row.getBoundingClientRect().top - table.getBoundingClientRect().top - table.clientHeight / 2 + row.clientHeight / 2;
    }
  }, [step, selectedLessonId, filteredSchedule]);

  if (error && (!classroom || !content)) return <div className="p-8"><div className="teacher-error" role="alert">{error}<button onClick={() => window.location.reload()}>Thử lại</button></div><button className="teacher-button mt-4" onClick={() => navigate('/teacher/schedule')}>Về lịch dạy</button></div>;
  if (!classesLoading && !activeClassId) return <div className="p-8"><div className="teacher-panel"><h1 className="text-xl font-bold">Chưa có lớp đang hoạt động</h1><p className="my-4">Giáo viên cần được phân công lớp và thời khóa biểu trước khi mở buổi dạy.</p><button className="teacher-button" onClick={() => navigate('/teacher/schedule')}>Xem lịch dạy</button></div></div>;
  if (!classroom || !content) return <Loader />;

  return (
    <div className="staff-workspace min-h-screen py-8 bg-[#f8fafc] text-slate-900">
      <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl px-4 sm:px-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => navigate(activeClassId ? `/teacher/schedule?classroomId=${activeClassId}` : '/teacher/schedule')}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-teal-800 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} /> Quay lại lịch dạy {classroom?.name ? `(${classroom.name})` : ''}
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              {allClasses.length > 1 && (
                <div className="flex items-center gap-1.5 bg-slate-50 border border-teal-200 rounded-xl px-3 py-1">
                  <span className="text-xs font-bold text-teal-800">Lớp:</span>
                  <select
                    value={activeClassId}
                    onChange={(e) => {
                      setActiveClassId(e.target.value);
                      setSelectedLessonId('');
                      setSelectedLesson(null);
                      setSelectedActivityIds([]);
                    }}
                    className="text-xs font-black text-slate-800 bg-transparent outline-none cursor-pointer"
                  >
                    {allClasses.map((ac) => (
                      <option key={ac._id} value={ac._id}>
                        {ac.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bắt đầu buổi dạy
            </h1>
            <p className="mt-1 text-sm text-slate-600 font-medium">
              {classroom.name} · {targetBookTitle}
            </p>
          </div>

          {/* Quick Schedule Status Tag */}
          <div className="shrink-0">
            {scheduleLiveTiming.canTeachNow ? (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2 text-xs font-black text-emerald-900 border border-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 animate-ping" />
                Đang trong ca dạy
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-xs font-black text-amber-950 border border-amber-300">
                <Lock size={14} className="text-amber-800" />
                Chưa đến ca dạy
              </span>
            )}
          </div>
        </div>

        {/* ── Requirement 10 Alert Banner: Timetable Schedule Lock Warning ──────── */}
        {!scheduleLiveTiming.canTeachNow && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-amber-700 text-white shrink-0 mt-0.5">
              <Lock size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-200 text-amber-950 px-2 py-0.5 text-xs font-black uppercase tracking-wider">
                  Khóa giờ dạy
                </span>
                <h4 className="text-base font-black text-amber-950">
                  Lớp học chỉ mở khi đến đúng ngày đúng giờ theo Thời Khóa Biểu
                </h4>
              </div>
              <p className="text-sm text-slate-700 mt-1 font-medium">
                {scheduleLiveTiming.nextSlotText ? (
                  <span>
                  Ca dạy tiếp theo: <strong className="text-amber-950">{scheduleLiveTiming.nextSlotText}</strong>.
                  </span>
                ) : (
                  <span>{scheduleLiveTiming.reason}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
          {[
            { num: 1, label: 'Chọn bài học theo lộ trình' },
            { num: 2, label: 'Cấu hình buổi dạy' },
            { num: 3, label: 'Điểm danh' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                type="button"
                onClick={() => {
                  if (s.num === 1 || selectedLessonId) {
                    setStep(s.num as any);
                  }
                }}
                className="flex items-center gap-2.5 cursor-pointer transition-transform hover:scale-102"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-black transition-all ${step >= s.num
                    ? 'bg-teal-700 text-white'
                    : 'bg-slate-100 text-slate-600'
                    }`}
                >
                  {s.num}
                </div>
                <span
                  className={`hidden sm:inline text-sm font-extrabold ${step >= s.num ? 'text-teal-900' : 'text-slate-600'
                    }`}
                >
                  {s.label}
                </span>
              </button>
              {i < 2 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded-full transition-colors ${step > s.num ? 'bg-teal-700' : 'bg-slate-200'
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-800 border-2 border-rose-200 flex items-center gap-3">
            <AlertTriangle size={20} className="text-rose-800 shrink-0" />
            <span>{error}</span>
            {createdDraftId && <button type="button" className="teacher-button" onClick={handleCreate}>Thử bắt đầu lại</button>}
          </div>
        )}

        {/* ── Step 1: Syllabus Schedule & Choose Lesson ────────────────────────── */}
        {step === 1 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            {/* Header of Step 1 */}
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-100 text-teal-800">
                  <Calendar size={24} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    Bước 1 — Chọn bài học
                  </h2>
                  <p className="text-sm text-slate-600 font-medium mt-0.5">
                    Chọn bài học cho buổi dạy.
                  </p>
                </div>
              </div>

            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              <div className="relative sm:col-span-8">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm bài học, chủ đề, từ vựng…"
                  className="w-full rounded-2xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm font-bold text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Unit Filter */}
              <div className="sm:col-span-4">
                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 py-2.5 px-3.5 text-sm font-black text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white cursor-pointer"
                >
                  <option value="ALL">Tất cả Unit</option>
                  {(content.units || [])
                    .filter((u: any) => u.bookNumber === targetBookNumber || u.ageGroupCode === classroom.ageGroupCode)
                    .sort((a: any, b: any) => (a.unitNumber || 0) - (b.unitNumber || 0))
                    .map((u: any) => (
                      <option key={u._id} value={String(u._id)}>
                        Unit {u.unitNumber}: {u.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Schedule Table View */}
            <div ref={scheduleTableRef} className="relative max-h-[32rem] overflow-auto rounded-2xl border border-slate-200">
              <div className="">
                <table className="w-full min-w-[760px] text-left text-sm border-collapse">
                  <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200 text-xs font-black text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">STT</th>
                      <th className="py-3.5 px-4">Chủ đề & Unit</th>
                      <th className="py-3.5 px-4">Bài học</th>
                      <th className="py-3.5 px-3 text-center">Từ vựng</th>
                      <th className="py-3.5 px-3 text-center whitespace-nowrap">Hoạt động</th>
                      <th className="py-3.5 px-4 text-center">Trạng thái lộ trình</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSchedule.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-600 text-sm font-semibold">
                          Không tìm thấy bài học nào phù hợp với bộ lọc trong {targetBookTitle}.
                        </td>
                      </tr>
                    ) : (
                      filteredSchedule.map((item: any, idx: number) => {
                        const isSelected = selectedLessonId === item._id;
                        return (
                          <tr
                            key={`${item._id}-${idx}`}
                            ref={isSelected ? selectedRowRef : undefined}
                            tabIndex={0}
                            aria-selected={isSelected}
                            onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedLessonId(item._id); } }}
                            onClick={() => setSelectedLessonId(item._id)}
                            className={`cursor-pointer transition-colors ${isSelected
                              ? 'bg-teal-50 font-bold ring-2 ring-inset ring-teal-500'
                              : item.isAdminAssigned
                                ? 'bg-amber-100/40 hover:bg-amber-100/70'
                                : item.isNextToTeach
                                  ? 'bg-amber-50/50 hover:bg-amber-50/90'
                                  : 'hover:bg-slate-50'
                              }`}
                          >
                            {/* Sequential Book Order */}
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center justify-center rounded-xl px-3 py-1 text-xs font-black ${item.isAdminAssigned
                                ? 'bg-amber-300 text-amber-950 border border-amber-400'
                                : item.isNextToTeach
                                  ? 'bg-amber-200 text-amber-950 border border-amber-300'
                                  : 'bg-teal-100 text-teal-900'
                                }`}>
                                {item.bookOrderIndex || idx + 1}
                              </span>
                            </td>

                            {/* Book & Unit */}
                            <td className="py-4 px-4 text-xs">
                              <div className="font-extrabold text-slate-900 text-sm">
                                Unit {item.unit?.unitNumber || 1}
                              </div>
                              <div className="text-slate-600 font-medium">
                                {item.unit?.title || item.unit?.bigQuestion || 'Chủ đề mầm non'}
                              </div>
                            </td>

                            {/* Lesson Title */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-extrabold text-slate-900 text-base">Lesson {lessonPosition(item, content.units).lesson}: {item.title}</p>
                                {item.isAdminAssigned && (
                                  <span className="rounded-full bg-purple-700 text-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-xs">
                                    🎯 Kế hoạch Admin chỉ định
                                  </span>
                                )}
                                {!item.isAdminAssigned && item.isNextToTeach && (
                                  <span className="rounded-full bg-emerald-700 text-white px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider shadow-xs">
                                    ⭐ Đề xuất theo giáo trình
                                  </span>
                                )}
                              </div>
                              {item.vietnameseTitle && (
                                <p className="text-xs text-slate-600 italic mt-0.5">{item.vietnameseTitle}</p>
                              )}
                            </td>

                            {/* Vocab count */}
                            <td className="py-4 px-3 text-center">
                              <span className="rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-900 border border-amber-200">
                                {item.vocabCount} từ
                              </span>
                            </td>

                            {/* Activity count */}
                            <td className="py-4 px-3 text-center">
                              <span className="whitespace-nowrap inline-flex rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-900 border border-purple-200">
                                {item.activityCount} game
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-4 px-4 text-center">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white">
                                  Đang chọn
                                </span>
                              ) : item.isAdminAssigned ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-black text-purple-950 border border-purple-300">
                                  🎯 Admin chỉ định
                                </span>
                              ) : item.isNextToTeach ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-950 border border-emerald-300">
                                  ⭐ Bài tiếp theo
                                </span>
                              ) : item.isLastTaught ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
                                  <CheckCircle2 size={13} className="text-emerald-800" /> Vừa dạy gần nhất
                                </span>
                              ) : item.isTaught ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                  <CheckCircle2 size={13} className="text-slate-600" /> Đã dạy
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                                  Chưa dạy
                                </span>
                              )}
                            </td>

                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {selectedLesson ? <>Đang chọn bài: <strong className="text-slate-900">{selectedLesson.title}</strong></> : 'Chọn một bài học để tiếp tục'}
              </p>
              <button
                type="button"
                disabled={!selectedLessonId}
                onClick={() => setStep(2)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tiếp tục bước 2 <ChevronRight size={18} />
              </button>
            </div>

          </div>
        )}

        {/* ── Step 2: Choose Activities & Session Options ───────────────────────── */}
        {step === 2 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-800">
                <CheckSquare size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Bước 2 — Cấu hình buổi dạy
                </h2>
                <p className="text-sm text-slate-600 font-medium mt-0.5">
                  Chọn nội dung ôn tập, trò chơi và thời lượng.
                </p>
              </div>
            </div>

            <div>
              <button type="button" aria-pressed={includeWarmup}
                onClick={() => setIncludeWarmup(!includeWarmup)}
                className={`w-full rounded-2xl border-2 p-4 text-left cursor-pointer transition-all ${includeWarmup
                  ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5">
                    {includeWarmup ? (
                      <CheckSquare size={22} className="text-amber-800" />
                    ) : (
                      <Square size={22} className="text-slate-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 font-black text-slate-900 text-base">
                      <Flame size={18} className="text-amber-800 fill-amber-500" />
                      Ôn bài cũ{reviewLesson?.title ? `: ${reviewLesson.title}` : ''}
                    </div>
                    {!reviewLesson && <p className="mt-1 text-xs font-medium text-slate-600">Chưa có bài học trước để ôn.</p>}
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintPreview(true)}
                disabled={!selectedLesson}
                className="mt-3 inline-flex items-center justify-center rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-900 hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                In tranh bài học
              </button>
            </div>

            {/* Activities list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Trò chơi tương tác · {selectedActivityIds.length}/{lessonActivities.length}
                </h3>
                <div className="flex items-center gap-3"><button
                  type="button"
                  onClick={() =>
                    setSelectedActivityIds(
                      selectedActivityIds.length === lessonActivities.length
                        ? []
                        : lessonActivities.map((a: any) => a._id)
                    )
                  }
                  className="text-xs font-bold text-teal-800 hover:underline cursor-pointer"
                >
                  {selectedActivityIds.length === lessonActivities.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </button></div>
              </div>

              {lessonActivities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 font-medium">
                  Bài học này chưa có trò chơi riêng.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3  pr-1">
                  {lessonActivities.map((a: any) => {
                    const checked = selectedActivityIds.includes(a._id);
                    const meta = getActivityMeta(a.activityType, a.title);
                    return (
                      <button
                        key={a._id}
                        type="button"
                        onClick={() => toggleActivity(a._id)}
                        className={`flex items-center gap-3.5 rounded-2xl border-2 p-4 text-left transition-all cursor-pointer ${checked
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300 bg-white'
                          }`}
                      >
                        {checked ? (
                          <CheckSquare size={20} className="text-violet-800 shrink-0" />
                        ) : (
                          <Square size={20} className="text-slate-600 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-900 text-sm truncate flex items-center gap-1.5">
                            <span>{meta.icon}</span>
                            <span>{meta.name}</span>
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {a.questions?.length ?? a.questionCount ?? 0} câu hỏi tương tác
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <label htmlFor="session-duration" className="text-sm font-bold text-slate-700">Thời lượng buổi học</label>
              <select id="session-duration" value={duration} onChange={e => setDuration(Number(e.target.value))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {[15, 20, 25, 30, 35, 45, 60].map(d => <option key={d} value={d}>{d} phút</option>)}
              </select>
            </div>


            {/* Step 2 Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft size={16} /> Quay lại bước 1
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 rounded-2xl bg-teal-700 px-7 py-3 text-sm font-black text-white hover:bg-teal-700 transition-all cursor-pointer"
              >
                Tiếp tục bước 3 <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Attendance Check & Start Session ─────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Attendance Check-in Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-800">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      Bước 3 — Điểm danh
                    </h2>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      Chọn trạng thái của từng học sinh trước khi bắt đầu.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-slate-600">Ngày dạy:</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-black text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Mark All Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-700">
                  <span>Sĩ số: {attendanceRecords.length} học sinh</span>
                  <span>•</span>
                  <span className="text-emerald-800">
                    {attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length} có mặt
                  </span>
                  <span>•</span>
                  <span className="text-rose-800">
                    {attendanceRecords.filter((r) => r.status === 'ABSENT' || r.status === 'EXCUSED').length} vắng
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllStatus('PRESENT')}
                    className="rounded-xl bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-black hover:bg-emerald-700 transition cursor-pointer"
                  >
                    ✓ Cả lớp có mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStatus('ABSENT')}
                    className="rounded-xl border border-slate-200 bg-white text-slate-600 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              {/* Student Attendance List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5  pr-1">
                {attendanceRecords.map((r) => {
                  const st = r.student || {};
                  const sId = String(st._id || st);
                  const sName = st.name || 'Học sinh';

                  return (
                    <div
                      key={sId}
                      className={`rounded-2xl border-2 p-4 transition-all ${r.status === 'PRESENT'
                        ? 'border-emerald-300 bg-emerald-50/50'
                        : r.status === 'LATE'
                          ? 'border-amber-300 bg-amber-50/50'
                          : r.status === 'EXCUSED'
                            ? 'border-sky-300 bg-sky-50/50'
                            : 'border-rose-300 bg-rose-50/50'
                        }`}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-base shrink-0">
                          {sName[0] || 'B'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-base text-slate-900 truncate">{sName}</h4>
                        </div>
                      </div>

                      {/* 4 Status Pill Buttons */}
                      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'PRESENT')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${r.status === 'PRESENT'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200'
                            }`}
                        >
                          Có mặt
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'LATE')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${r.status === 'LATE'
                            ? 'bg-amber-700 text-white'
                            : 'bg-white text-slate-700 hover:bg-amber-50 border border-slate-200'
                            }`}
                        >
                          Muộn
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'EXCUSED')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${r.status === 'EXCUSED'
                            ? 'bg-sky-700 text-white'
                            : 'bg-white text-slate-700 hover:bg-sky-50 border border-slate-200'
                            }`}
                        >
                          Phép
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentStatus(sId, 'ABSENT')}
                          className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${r.status === 'ABSENT'
                            ? 'bg-rose-700 text-white'
                            : 'bg-white text-slate-700 hover:bg-rose-50 border border-slate-200'
                            }`}
                        >
                          Vắng
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Ghi chú cho học sinh"
                        value={r.note || ''}
                        onChange={(e) => setStudentNote(sId, e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-800 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Note for whole class */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Ghi chú buổi học
                </label>
                <input
                  type="text"
                  value={attendanceNote}
                  onChange={(e) => setAttendanceNote(e.target.value)}
                  placeholder="Ví dụ: Ôn tập phát âm từ vựng bài trước; các bé phản xạ hào hứng…"
                  className="w-full rounded-2xl border border-slate-200 p-3 text-sm text-slate-900 placeholder:text-slate-600 focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Session Summary & Launch Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={20} className="text-amber-800" />
                <span>Xác nhận buổi dạy</span>
              </h3>

              {/* Summary Details */}
              <div className="space-y-3 rounded-2xl bg-slate-50 p-6 border border-slate-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Lớp học:</span>
                  <span className="font-black text-slate-900 text-base">{classroom.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Bài học giáo trình:</span>
                  <span className="font-black text-slate-900">{selectedLesson?.title || 'Chưa chọn'} - {selectedLesson?.vietnameseTitle || ''}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 font-semibold">Sĩ số có mặt hôm nay:</span>
                  <span className="font-black text-emerald-800 text-base">
                    {attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length} / {attendanceRecords.length} học sinh
                  </span>
                </div>
              </div>

              {/* Requirement 10: Timetable Lock Status Notification before Launch */}
              {!scheduleLiveTiming.canTeachNow && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950 flex items-center gap-3">
                  <Lock size={20} className="text-amber-800 shrink-0" />
                  <div>
                    <p className="font-black text-amber-900">Nút "Bắt đầu buổi dạy" hiện đang tạm khóa:</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      {scheduleLiveTiming.nextSlotText || scheduleLiveTiming.reason}
                    </p>
                  </div>
                </div>
              )}

              {lessonMismatch && !createdDraftId && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">
                  Bài đang chọn không khớp bài được phân trong thời khóa biểu.
                  <button type="button" onClick={() => { setSelectedLessonId(scheduledLessonId); setStep(1); }} className="ml-2 font-black underline">Chọn bài theo lịch</button>
                </div>
              )}
              {attendanceDate !== vietnamDate() && (
                <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-bold text-amber-950">Chọn ngày điểm danh hôm nay để bắt đầu buổi dạy.</p>
              )}

              {draftSavedSuccess && createdDraftId && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-950 flex flex-wrap items-center justify-between gap-3">
                  <span>✅ Đã lưu kế hoạch buổi dạy! Khi đến giờ trên thời khóa biểu, cô có thể mở lớp ngay lập tức.</span>
                  <button
                    type="button"
                    onClick={() => navigate('/teacher/schedule')}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 text-xs font-black cursor-pointer"
                  >
                    Về Lịch dạy
                  </button>
                </div>
              )}

              {/* Launch Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Quay lại bước 2
                </button>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  {!createdDraftId && (
                    <button
                      type="button"
                      onClick={handleSaveDraftOnly}
                      disabled={creating || loadingAttendance}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border-2 border-teal-600 bg-teal-50 hover:bg-teal-100 text-teal-900 px-6 py-3.5 text-sm font-black transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Calendar size={18} />
                      <span>Lưu kế hoạch dạy trước</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !canStartSession}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2.5 rounded-2xl px-9 py-4 text-base font-black transition-all ${canStartSession
                      ? 'bg-emerald-700 hover:bg-emerald-700 text-white  active:scale-95 cursor-pointer animate-pulse'
                      : 'bg-slate-200 text-inherit cursor-not-allowed border border-slate-300'
                      }`}
                  >
                    {creating ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-transparent" />
                        <span>Đang lưu điểm danh & khởi tạo phòng học…</span>
                      </>
                    ) : createdDraftId && scheduleLiveTiming.canTeachNow ? (
                      <>
                        <Play size={20} className="fill-white" />
                        <span>Bắt đầu buổi dạy đã lưu</span>
                      </>
                    ) : !scheduleLiveTiming.canTeachNow ? (
                      <>
                        <Lock size={20} />
                        <span>🔒 Chưa đến giờ dạy theo thời khóa biểu</span>
                      </>
                    ) : lessonMismatch ? (
                      <span>Chọn bài được phân theo lịch</span>
                    ) : attendanceDate !== vietnamDate() ? (
                      <span>Chọn ngày điểm danh hôm nay</span>
                    ) : (
                      <>
                        <Play size={20} className="fill-white" />
                        <span>Bắt đầu buổi dạy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {showPrintPreview && selectedLesson && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 sm:p-6" onClick={() => setShowPrintPreview(false)}>
          <section role="dialog" aria-modal="true" aria-label="Xem tranh và in" className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white" onClick={event => event.stopPropagation()}>
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 sm:p-5">
              <div><h2 className="text-lg font-bold text-slate-900">Tranh của bài {selectedLesson.title}</h2><p className="text-sm text-slate-600">Xem tranh trước khi in cho lớp.</p></div>
              <button type="button" aria-label="Đóng xem tranh" onClick={() => setShowPrintPreview(false)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><X size={20} /></button>
            </header>
            <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              {(selectedLesson.vocabularyItems || []).filter((word: any) => word?.english && word.imageUrl && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(word.status)).map((word: any) => (
                <div key={word._id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <img src={word.imageUrl} alt={word.english} className="h-20 w-20 shrink-0 rounded-lg bg-slate-50 object-contain" />
                  <div className="min-w-0"><strong className="block text-sm text-slate-900">{word.english}</strong><span className="text-xs text-slate-600">{word.vietnamese}</span></div>
                </div>
              ))}
              {!(selectedLesson.vocabularyItems || []).some((word: any) => word?.english && word.imageUrl && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(word.status)) && <p className="text-sm text-slate-600">Bài học chưa có tranh để in.</p>}
            </div>
            <footer className="flex justify-end border-t border-slate-200 p-4 sm:p-5"><PrintLessonCards lesson={selectedLesson} /></footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default ClassroomSessionSetup;
