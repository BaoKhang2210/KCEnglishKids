import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Award,
  Star,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Send,
  Sparkles,
  BarChart3,
  Search,
  Play,
  Layers,
  GraduationCap
} from 'lucide-react';
import { teacherApi, parentNotificationApi } from '../../services/api';
import { ParentNoteSuggestions } from './ParentNoteSuggestions';

export const TeacherAnalyticsTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'CLASS' | 'COMPARE'>('CLASS');
  const [students, setStudents] = useState<any[]>([]);

  // Search & performance filters
  const [searchQuery, setSearchQuery] = useState('');
  const [perfFilter, setPerfFilter] = useState<'ALL' | 'EXCELLENT' | 'GOOD' | 'NEEDS_PRACTICE'>('ALL');

  // Quick Parent Note Modal State
  const [selectedStudentForNote, setSelectedStudentForNote] = useState<any | null>(null);
  const [quickNoteText, setQuickNoteText] = useState('');
  const [bonusStars, setBonusStars] = useState(3);
  const [sendingNote, setSendingNote] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [classRes, studentRes] = await Promise.all([
        teacherApi.getClasses(),
        teacherApi.getStudents()
      ]);

      const classList = classRes.data || [];
      setClasses(classList);
      if (classList.length > 0 && !selectedClassId) {
        setSelectedClassId(String(classList[0]._id));
      }

      if (studentRes.data) {
        setStudents(studentRes.data);
      }
    } catch (err) {
      console.error('Failed to load teacher analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSendQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForNote || !quickNoteText.trim()) return;

    setSendingNote(true);
    try {
      const childId = selectedStudentForNote.student?._id || selectedStudentForNote._id;
      const childName = selectedStudentForNote.student?.name || selectedStudentForNote.name;
      await parentNotificationApi.sendNotification({
        childId,
        subject: 'Động viên tiến độ học tập từ cô giáo',
        teacherNote: quickNoteText.trim(),
        stars: bonusStars,
        score: selectedStudentForNote.stats?.averageScore || 0,
        templateType: 'PROGRESS_UPDATE'
      });
      showToast(`Đã gửi lời khen và tặng ⭐ ${bonusStars} sao cho bé ${childName}!`);
      setSelectedStudentForNote(null);
      setQuickNoteText('');
      setBonusStars(3);
      loadAnalyticsData();
    } catch (err: any) {
      alert(err.message || 'Gửi nhận xét thất bại');
    } finally {
      setSendingNote(false);
    }
  };

  // Helper to map student to class
  const isStudentInClass = (item: any, classObj: any) => {
    if (!classObj) return false;
    const cid = String(classObj._id);
    const assignedId = String(item.assignedClass?._id || item.assignedClass || item.student?.assignedClass?._id || item.student?.assignedClass || item.classroom?._id || item.classroomId || '');
    if (assignedId && assignedId === cid) return true;

    // Check if in classObj.students list
    if (Array.isArray(classObj.students)) {
      return classObj.students.some((st: any) => String(st._id || st) === String(item._id || item.student?._id));
    }
    return false;
  };

  // Pre-calculate per-class metrics for class switcher cards
  const classSummaries = useMemo(() => {
    return classes.map((c) => {
      const classStudents = students.filter((st) => isStudentInClass(st, c));
      const totalStars = classStudents.reduce((sum, st) => sum + (st.stats?.totalStars || 0), 0);
      const avgScore = classStudents.length > 0
        ? Math.round(classStudents.reduce((sum, st) => sum + (st.stats?.averageScore || 0), 0) / classStudents.length)
        : 0;
      const needingHelp = classStudents.filter((st) => (st.stats?.averageScore ?? 0) < 70).length;

      const bookTitle =
        c.ageGroupCode === '3-4'
          ? '📘 Sách 1 (3–4 tuổi)'
          : c.ageGroupCode === '4-5'
          ? '📗 Sách 2 (4–5 tuổi)'
          : '📙 Sách 3 (5–6 tuổi)';

      return {
        ...c,
        studentsCount: classStudents.length,
        totalStars,
        avgScore,
        needingHelp,
        bookTitle
      };
    });
  }, [classes, students]);

  // Selected class object
  const currentClass = useMemo(() => {
    return classes.find((c) => String(c._id) === String(selectedClassId)) || classes[0] || null;
  }, [classes, selectedClassId]);

  // All students of current class
  const currentClassStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter((st) => isStudentInClass(st, currentClass));
  }, [students, currentClass]);

  // Filtered students inside current class by search and performance
  const filteredStudents = useMemo(() => {
    return currentClassStudents.filter((item) => {
      const st = item.student || item;
      const stats = item.stats || {};
      const score = stats.averageScore ?? 0;

      // Filter by performance
      if (perfFilter === 'EXCELLENT' && score < 85) return false;
      if (perfFilter === 'GOOD' && (score < 70 || score >= 85)) return false;
      if (perfFilter === 'NEEDS_PRACTICE' && score >= 70) return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (st.name || '').toLowerCase().includes(q);
        const userMatch = (st.username || '').toLowerCase().includes(q);
        if (!nameMatch && !userMatch) return false;
      }

      return true;
    });
  }, [currentClassStudents, perfFilter, searchQuery]);

  // Top 5 Leaderboard of current class
  const topStudents = useMemo(() => {
    return [...currentClassStudents]
      .sort((a, b) => (b.stats?.totalStars ?? 0) - (a.stats?.totalStars ?? 0) || (b.stats?.averageScore ?? 0) - (a.stats?.averageScore ?? 0))
      .slice(0, 5);
  }, [currentClassStudents]);

  // Students needing attention in current class
  const needingAttention = useMemo(() => {
    return currentClassStudents.filter((item) => {
      const score = item.stats?.averageScore ?? 0;
      const completed = item.stats?.completedLessons ?? 0;
      return score < 70 || completed === 0;
    });
  }, [currentClassStudents]);

  // Overall metrics of current class
  const totalStarsAccumulated = useMemo(() => {
    return currentClassStudents.reduce((sum, item) => sum + (item.stats?.totalStars ?? 0), 0);
  }, [currentClassStudents]);

  const avgClassScore = useMemo(() => {
    return currentClassStudents.length > 0
      ? Math.round(currentClassStudents.reduce((sum, item) => sum + (item.stats?.averageScore ?? 0), 0) / currentClassStudents.length)
      : 0;
  }, [currentClassStudents]);

  const getKidAvatarEmoji = (av?: string) => {
    if (!av) return '🦁';
    if (av === 'lion') return '🦁';
    if (av === 'panda') return '🐼';
    if (av === 'rabbit') return '🐰';
    if (av === 'fox') return '🦊';
    if (av === 'bear') return '🐻';
    if (av === 'cat') return '🐱';
    if (av === 'dog') return '🐶';
    return '🦁';
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 font-bold bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        Đang tổng hợp báo cáo tiến độ học sinh theo từng lớp…
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-50 border-2 border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-xs animate-pop-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
            Trung Tâm Phân Tích Sư Phạm Mầm Non • KCEnglishKids
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-teal-600" />
            <span>Báo Cáo & Phân Tích Tiến Độ Theo Lớp Học</span>
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Dữ liệu được phân chia độc lập theo từng lớp học để giáo viên đánh giá chính xác năng lực, chuyên cần và can thiệp kịp thời.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewMode('CLASS')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'CLASS'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={15} /> Chi tiết theo lớp
          </button>
          <button
            type="button"
            onClick={() => setViewMode('COMPARE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'COMPARE'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={15} /> So sánh các lớp
          </button>
        </div>
      </div>

      {/* ─── Classroom Selection Bar (Request 2: Phân chia theo lớp) ───────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <GraduationCap size={14} className="text-teal-600" />
            <span>Chọn lớp học để xem phân tích:</span>
          </span>
          <span className="text-xs font-bold text-slate-400">
            Giáo viên phụ trách {classes.length} lớp học
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {classSummaries.map((cs) => {
            const isSelected = viewMode === 'CLASS' && String(cs._id) === String(selectedClassId);

            return (
              <button
                key={cs._id}
                type="button"
                onClick={() => {
                  setSelectedClassId(String(cs._id));
                  setViewMode('CLASS');
                }}
                className={`text-left p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/40 ring-4 ring-teal-500/10 shadow-md scale-[1.01]'
                    : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/60 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-teal-100 text-teal-800 text-lg font-black shrink-0">
                      🏫
                    </span>
                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black uppercase tracking-wider">
                        Đang xem
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                        {cs.ageGroupCode} tuổi
                      </span>
                    )}
                  </div>

                  <h3 className="font-black text-slate-900 text-base mt-2 leading-tight">
                    {cs.name}
                  </h3>
                  <span className="inline-block text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/50 mt-1">
                    {cs.bookTitle}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-1 text-center">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">Sĩ số</span>
                    <b className="text-xs font-black text-slate-800">{cs.studentsCount} bé</b>
                  </div>
                  <div className="border-x border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400">Độ đúng</span>
                    <b className="text-xs font-black text-emerald-600">{cs.avgScore}%</b>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400">Tổng sao</span>
                    <b className="text-xs font-black text-amber-500 flex items-center justify-center gap-0.5">
                      ⭐ {cs.totalStars}
                    </b>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Mode 1: Detailed Analytics for Selected Class ─────────────────── */}
      {viewMode === 'CLASS' && currentClass && (
        <div className="space-y-6">
          {/* Class Spotlight Banner with Quick Links */}
          <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="rounded-md bg-teal-600 px-2.5 py-0.5 text-xs font-bold text-white shadow-2xs">
                  {currentClass.name}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-bold text-teal-800 bg-white px-2.5 py-0.5 rounded-md border border-teal-200">
                  {currentClass.ageGroupCode === '3-4' ? 'Sách 1 (Mầm 3–4 tuổi)' : currentClass.ageGroupCode === '4-5' ? 'Sách 2 (Chồi 4–5 tuổi)' : 'Sách 3 (Lá 5–6 tuổi)'}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  👩‍🏫 Cô giáo phụ trách: <b>{currentClass.teacher?.name || 'Giáo viên phụ trách'}</b>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Hồ Sơ Năng Lực & Tiến Độ Học Tập — {currentClass.name}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Toàn bộ biểu đồ, điểm danh và chỉ số bên dưới áp dụng riêng cho <b>{currentClassStudents.length} học sinh</b> của lớp này.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/teacher/classroom-sessions/new?classroomId=${currentClass._id}`}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                title="Điểm danh và bắt đầu buổi dạy trực tiếp cho lớp này"
              >
                <Play size={14} className="fill-white" /> Điểm danh & Dạy ngay
              </Link>
              <Link
                to={`/teacher/classes/${currentClass._id}`}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs transition-all"
                title="Xem sổ lớp và hồ sơ học sinh"
              >
                <Users size={14} /> Sổ lớp
              </Link>
            </div>
          </div>

          {/* 4 KPI Metrics for this specific class */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Sĩ số lớp này</span>
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                  <Users size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900">{currentClassStudents.length}</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Bé theo học chính thức</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Điểm TB của lớp</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <BarChart3 size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600">{avgClassScore}%</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                {avgClassScore >= 80 ? '🌟 Mức độ tiếp thu xuất sắc' : avgClassScore >= 65 ? '👍 Mức độ tiếp thu tốt' : '📖 Cần tăng cường ôn tập'}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng sao của lớp</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <Star size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-amber-500">{totalStarsAccumulated} ⭐</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">Tích lũy từ bài học & thưởng</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Bé cần cô hỗ trợ</span>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-3xl font-black text-rose-600">{needingAttention.length}</div>
              <p className="text-[11px] font-semibold text-rose-600 mt-1">Điểm &lt;70% trong lớp này</p>
            </div>
          </section>

          {/* Leaderboard & Class Student Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {/* Top 5 Leaderboard OF THIS CLASS */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Top Sao Lớp {currentClass.name}</span>
                  </h3>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Bảng vinh danh
                  </span>
                </div>

                <div className="space-y-3">
                  {topStudents.length > 0 ? (
                    topStudents.map((item, idx) => {
                      const st = item.student || item;
                      const stats = item.stats || {};
                      const streak = st.streak || 1;
                      const avatarIcon = getKidAvatarEmoji(st.avatar);

                      return (
                        <div
                          key={st._id}
                          className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-black text-sm w-5 text-center">
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                            </span>
                            <span className="text-2xl select-none">{avatarIcon}</span>
                            <div>
                              <p className="font-bold text-slate-900 text-xs truncate max-w-[110px]">{st.name}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span>{stats.averageScore ?? 0}% TB</span>
                                <span>•</span>
                                <span className="flex items-center text-amber-600 font-bold">
                                  <Flame className="w-3 h-3 fill-amber-500" /> {streak} ngày
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-amber-500 text-xs block">
                              {stats.totalStars ?? 0} ⭐
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForNote(item)}
                              className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                            >
                              Khen ngợi
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold">
                      Chưa có dữ liệu học tập cho lớp này.
                    </div>
                  )}
                </div>
              </div>

              {/* At-Risk Warning Box for this class */}
              {needingAttention.length > 0 && (
                <div className="mt-5 p-3.5 rounded-2xl border border-rose-200 bg-rose-50/60 text-rose-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-rose-700">
                    <AlertTriangle size={15} />
                    <span>{needingAttention.length} bé trong lớp cần kèm thêm:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {needingAttention.map((na) => (
                      <span
                        key={na._id}
                        onClick={() => setSelectedStudentForNote(na)}
                        className="bg-white text-rose-700 px-2 py-0.5 rounded-lg border border-rose-200 font-bold text-[11px] cursor-pointer hover:bg-rose-100 transition-colors"
                        title="Bấm để gửi lời dặn dò cho phụ huynh bé"
                      >
                        {na.name} ({na.stats?.averageScore || 0}%) ✉️
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Detailed Class Student Progress Table */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs lg:col-span-2 2xl:col-span-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                    <span>Danh Sách Học Sinh — Lớp {currentClass.name}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Hiển thị {filteredStudents.length} / {currentClassStudents.length} bé trong lớp
                  </p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search box */}
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                    <Search size={14} className="text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm tên bé trong lớp…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-transparent outline-none text-xs text-slate-800 placeholder:text-slate-400 w-32 sm:w-40"
                    />
                  </div>

                  {/* Performance Filter */}
                  <select
                    value={perfFilter}
                    onChange={(e: any) => setPerfFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả mức độ</option>
                    <option value="EXCELLENT">🌟 Xuất sắc (≥85%)</option>
                    <option value="GOOD">👍 Tiến bộ tốt (70–84%)</option>
                    <option value="NEEDS_PRACTICE">📖 Cần rèn thêm (&lt;70%)</option>
                  </select>
                </div>
              </div>

              {filteredStudents.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                      <tr>
                        <th className="py-3 px-3.5">Học sinh</th>
                        <th className="py-3 px-3.5 text-center">Chuỗi Streak</th>
                        <th className="py-3 px-3.5 text-center">Điểm TB</th>
                        <th className="py-3 px-3.5 text-center">Sao Đạt</th>
                        <th className="py-3 px-3.5 text-center">Đánh giá sư phạm</th>
                        <th className="py-3 px-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {filteredStudents.map((item) => {
                        const st = item.student || item;
                        const stats = item.stats || {};
                        const avg = stats.averageScore ?? 0;
                        const streak = st.streak || 1;
                        const avatarIcon = getKidAvatarEmoji(st.avatar);

                        return (
                          <tr key={st._id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3.5 flex items-center gap-2.5 font-bold text-slate-900">
                              <span className="text-xl select-none">{avatarIcon}</span>
                              <div>
                                <span>{st.name}</span>
                                <span className="text-[10px] text-slate-400 block font-normal">
                                  {st.username ? `@${st.username}` : `Mã: ${st._id.slice(-4)}`}
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3.5 text-center font-bold">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                                <Flame className="w-3 h-3 fill-amber-500" /> {streak} ngày
                              </span>
                            </td>

                            <td className="py-3 px-3.5 text-center font-black">
                              <span className={avg >= 80 ? 'text-emerald-600' : avg >= 65 ? 'text-amber-600' : 'text-rose-600'}>
                                {avg}%
                              </span>
                            </td>

                            <td className="py-3 px-3.5 text-center font-black text-amber-500">
                              {stats.totalStars ?? 0} ⭐
                            </td>

                            <td className="py-3 px-3.5 text-center">
                              {avg >= 85 ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  🌟 Xuất sắc
                                </span>
                              ) : avg >= 70 ? (
                                <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  👍 Tiến bộ tốt
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                                  📖 Cần rèn thêm
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForNote(item)}
                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                              >
                                Nhận xét & Sao
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs font-bold border border-dashed border-slate-200 rounded-2xl">
                  Không tìm thấy học sinh nào phù hợp trong lớp {currentClass.name}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Mode 2: Multi-Class Cross Comparison ─────────────────────────── */}
      {viewMode === 'COMPARE' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="text-teal-600" />
              <span>Bảng Đối Sánh Chất Lượng Giữa Các Lớp Học</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              So sánh mức độ tiếp thu, chuyên cần và sĩ số giữa các lớp để giáo viên cân đối giáo án và kế hoạch phụ đạo.
            </p>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                  <tr>
                    <th className="py-3 px-4">Lớp học</th>
                    <th className="py-3 px-4 text-center">Độ tuổi & Sách</th>
                    <th className="py-3 px-4 text-center">Sĩ số</th>
                    <th className="py-3 px-4 text-center">Điểm TB Lớp</th>
                    <th className="py-3 px-4 text-center">Tổng sao</th>
                    <th className="py-3 px-4 text-center">Cần hỗ trợ</th>
                    <th className="py-3 px-4 text-center">Đánh giá chung</th>
                    <th className="py-3 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {classSummaries.map((cs) => (
                    <tr key={cs._id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-black text-slate-900 flex items-center gap-2">
                        <span className="text-lg">🏫</span>
                        <span>{cs.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold border border-teal-200">
                          {cs.bookTitle}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {cs.studentsCount} bé
                      </td>
                      <td className="py-3 px-4 text-center font-black">
                        <span className={cs.avgScore >= 80 ? 'text-emerald-600' : cs.avgScore >= 65 ? 'text-amber-600' : 'text-rose-600'}>
                          {cs.avgScore}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-amber-500">
                        ⭐ {cs.totalStars}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cs.needingHelp > 0 ? (
                          <span className="text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {cs.needingHelp} bé
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                            0 bé
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {cs.avgScore >= 80 ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            🌟 Tiến độ xuất sắc
                          </span>
                        ) : cs.avgScore >= 65 ? (
                          <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            👍 Tiến bộ đều
                          </span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                            📖 Cần điều chỉnh nhịp dạy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedClassId(String(cs._id));
                            setViewMode('CLASS');
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Xem lớp này →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Quick Parent Notification Modal */}
      {selectedStudentForNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-pop-in">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Gửi Nhận Xét & Thưởng Sao</h3>
                <p className="text-xs text-teal-100">
                  Gửi về Sổ liên lạc của bé <b>{selectedStudentForNote.student?.name || selectedStudentForNote.name}</b>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForNote(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendQuickNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-2">
                  Tặng sao khen thưởng cho bé:
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setBonusStars(s)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        bonusStars === s
                          ? 'bg-amber-400 text-amber-950 font-black shadow-xs ring-2 ring-amber-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      ⭐ {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase mb-1">
                  Nội dung nhận xét sư phạm gửi phụ huynh:
                </label>
                <ParentNoteSuggestions childId={selectedStudentForNote.student?._id || selectedStudentForNote._id}
                  disabled={sendingNote}
                  onSelect={option => { setQuickNoteText(option.content); setBonusStars(option.suggestedStars); }} />
                <textarea
                  required
                  rows={3}
                  value={quickNoteText}
                  onChange={(e) => setQuickNoteText(e.target.value)}
                  placeholder="Nhập lời khen ngợi và dặn dò phụ huynh…"
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 outline-none"
                />

                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400">Gợi ý câu mẫu nhanh:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Bé phát âm rất to rõ và đạt điểm cao tuần này! 🌟',
                      'Bé rất chăm chỉ học từ vựng mới, cô khen bé nhé! 👏',
                      'Bé phản xạ nghe tranh rất nhạy, tiếp tục phát huy nhé! 🎯',
                      'Gia đình cho bé ôn thêm từ vựng bài trước 10 phút nhé! 📖'
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setQuickNoteText(tpl)}
                        className="text-[10px] font-semibold bg-slate-100 hover:bg-teal-50 hover:text-teal-800 px-2 py-0.5 rounded-md text-slate-600 transition-colors cursor-pointer"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForNote(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={sendingNote}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingNote ? 'Đang gửi…' : 'Gửi tới Sổ liên lạc'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAnalyticsTab;
