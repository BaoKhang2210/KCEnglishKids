import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  BookOpen,
  Clock,
  Printer,
  Copy,
  Check,
  PlayCircle,
  Award,
  Layers,
  AlertCircle,
  Volume2,
  Lightbulb,
  HeartHandshake,
  Rocket
} from 'lucide-react';
import { teacherApi, aiApi, classroomSessionApi } from '../../services/api';
import type { LessonPlan } from '../../types';

export const TeacherLessonPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL query params
  const initialClassId = searchParams.get('classroomId') || '';
  const initialLessonId = searchParams.get('lessonId') || '';

  // Data states
  const [classes, setClasses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(initialLessonId);
  const [duration, setDuration] = useState<15 | 25 | 35>(25);
  const [style, setStyle] = useState<'active_tpr' | 'story_song' | 'interactive_drills'>('active_tpr');

  // Plan generation state
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Load teacher classes and lessons
  useEffect(() => {
    Promise.all([teacherApi.getClasses(), teacherApi.getContent()])
      .then(([classesRes, contentRes]) => {
        const clsList = classesRes.data || [];
        setClasses(clsList);
        if (!selectedClassId && clsList.length > 0) {
          setSelectedClassId(String(clsList[0]._id));
        }

        const lsnList = contentRes.data?.lessons || [];
        setLessons(lsnList);
        if (!selectedLessonId && lsnList.length > 0) {
          setSelectedLessonId(String(lsnList[0]._id));
        }
      })
      .catch((err) => {
        setError(err.message || 'Không thể tải dữ liệu lớp học.');
      });
  }, []);

  // When class changes, adjust age group awareness
  const currentClass = classes.find((c) => String(c._id) === selectedClassId);
  const currentLesson = lessons.find((l) => String(l._id) === selectedLessonId);

  // Auto-generate initial plan once lesson is ready
  useEffect(() => {
    if (selectedLessonId) {
      handleGeneratePlan();
    }
  }, [selectedLessonId, selectedClassId, duration, style]);

  const handleGeneratePlan = async () => {
    if (!selectedLessonId) return;
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.generateLessonPlan({
        lessonId: selectedLessonId || undefined,
        classroomId: selectedClassId || undefined,
        durationMinutes: duration,
        teachingStyle: style,
        ageGroup: currentClass?.ageGroupCode || currentLesson?.ageGroupCode || '3-4',
        lessonTitle: currentLesson?.title || 'English Fun Lesson'
      });
      if (res.data) {
        setPlan(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo kịch bản tiết dạy.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!plan) return;
    const textLines = [
      `KỊCH BẢN GIẢNG DẠY TIẾNG ANH MẦM NON — KCENGLISHKIDS`,
      `Bài học: ${plan.meta.lessonTitle} (${plan.meta.bookLevel})`,
      `Chủ đề: ${plan.meta.targetTopic} | Độ tuổi: ${plan.meta.ageGroup} tuổi`,
      `Thời lượng: ${plan.meta.durationMinutes} phút | Phong cách: ${plan.meta.teachingStyle}`,
      `Từ vựng trọng tâm: ${plan.targetVocabulary.map((v) => v.english).join(', ')}`,
      `--------------------------------------------------`,
      `I. MỤC TIÊU BÀI HỌC:`,
      ...plan.objectives.knowledge.map((k) => `- ${k}`),
      ...plan.objectives.skills.map((s) => `- ${s}`),
      `--------------------------------------------------`,
      `II. CÁC GIAI ĐOẠN TIẾT HỌC:`,
      ...plan.phases.flatMap((phase) => [
        `\n[${phase.name} - ${phase.durationMin} phút]`,
        ...phase.activities.flatMap((act) => [
          `* ${act.name} (${act.durationMin}p):`,
          `  - Khẩu lệnh của cô: "${act.teacherTalk}"`,
          `  - Cử chỉ TPR: ${act.tprAction}`,
          `  - Mô tả: ${act.description}`
        ])
      ]),
      `--------------------------------------------------`,
      `III. DẶN DÒ PHỤ HUYNH VỀ NHÀ:`,
      plan.homeConnectPrompt
    ];

    navigator.clipboard.writeText(textLines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStartLiveSession = () => {
    if (selectedClassId && selectedLessonId) {
      navigate(`/teacher/classroom-sessions/new?classroomId=${selectedClassId}&lessonId=${selectedLessonId}`);
    } else {
      navigate('/teacher/classroom-sessions/new');
    }
  };

  const handleLaunchLiveSessionWithPlan = async () => {
    if (!selectedClassId || !selectedLessonId || !plan) return;
    setStartingSession(true);
    setError('');
    try {
      const createRes = await classroomSessionApi.createSession({
        classroomId: selectedClassId,
        lessonId: selectedLessonId,
        plannedDuration: duration,
        includeWarmup: true,
        lessonPlan: plan
      });
      const newSession = createRes.data;
      const sId = newSession._id || newSession.id;
      await classroomSessionApi.startSession(sId);
      navigate(`/teacher/classroom-sessions/${sId}/live`);
    } catch (err: any) {
      setError(err.message || 'Không thể khởi động buổi học trực tiếp.');
      setStartingSession(false);
    }
  };

  const groupedLessons = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    lessons.forEach((l) => {
      const key = l.ageGroupCode
        ? `Lứa tuổi ${l.ageGroupCode} tuổi`
        : l.bookLevel || 'Giáo trình mầm non';
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    });
    return groups;
  }, [lessons]);

  const getPhaseColorClasses = (theme: string) => {
    switch (theme) {
      case 'amber':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-900 border-amber-300',
          iconColor: 'text-amber-600'
        };
      case 'teal':
        return {
          bg: 'bg-teal-50',
          border: 'border-teal-200',
          badge: 'bg-teal-100 text-teal-900 border-teal-300',
          iconColor: 'text-teal-600'
        };
      case 'indigo':
        return {
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          iconColor: 'text-indigo-600'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          iconColor: 'text-emerald-600'
        };
      default:
        return {
          bg: 'bg-slate-50',
          border: 'border-slate-200',
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          iconColor: 'text-slate-600'
        };
    }
  };

  return (
    <div className="mx-auto max-w-[1920px] space-y-7 pb-16">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 p-6 sm:p-8 text-white shadow-lg">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-56 w-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-black tracking-wide text-white backdrop-blur-md">
              <Sparkles size={14} className="text-amber-300" /> TRỢ LÝ SƯ PHẠM MẦM NON (AI TEACHER COPILOT)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Soạn Giáo Án & Kịch Bản Tiết Dạy Thông Minh
            </h1>
            <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed">
              Tự động thiết kế kịch bản tiết học 15–35 phút theo phương pháp phản xạ toàn thân (TPR) và học qua trò chơi,
              bám sát bộ sách chuẩn KCEnglishKids cho trẻ từ 3–6 tuổi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLaunchLiveSessionWithPlan}
              disabled={startingSession || !plan}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-900 shadow-md hover:bg-amber-300 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Rocket size={18} className={startingSession ? 'animate-bounce' : ''} />
              {startingSession ? 'Đang chuẩn bị lớp dạy…' : 'Bắt đầu tiết dạy ngay'}
            </button>
            <button
              type="button"
              onClick={handleStartLiveSession}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-3 text-sm font-bold text-white transition-all cursor-pointer"
            >
              <PlayCircle size={18} />
              Tùy chỉnh trước khi dạy
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Plan View on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Settings Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Layers size={18} />
              </div>
              <h2 className="text-base font-black text-slate-900">Thông Số Tiết Học</h2>
            </div>

            {/* Select Classroom */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Lớp học mầm non</span>
                {currentClass && (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-extrabold text-teal-700 border border-teal-200">
                    Độ tuổi {currentClass.ageGroupCode || '3-4'}
                  </span>
                )}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
              >
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.ageGroupCode ? `Nhóm ${cls.ageGroupCode} tuổi` : 'Mầm non'})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Lesson */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen size={13} className="text-teal-600" />
                <span>Bài học trong giáo trình</span>
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 focus:bg-white focus:border-teal-500 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all"
              >
                {Object.entries(groupedLessons).map(([groupName, lsnList]) => (
                  <optgroup key={groupName} label={groupName}>
                    {lsnList.map((lsn) => (
                      <option key={lsn._id} value={lsn._id}>
                        {lsn.key ? `[${lsn.key}] ` : ''}{lsn.title} {lsn.vietnameseTitle ? `(${lsn.vietnameseTitle})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Select Duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-teal-600" />
                <span>Thời lượng tiết dạy</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { m: 15, label: '15 phút', desc: 'Tiết ngắn' },
                  { m: 25, label: '25 phút', desc: 'Chuẩn mầm non' },
                  { m: 35, label: '35 phút', desc: 'Nâng cao' }
                ].map(({ m, label, desc }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m as any)}
                    className={`rounded-2xl border p-2.5 text-center transition-all cursor-pointer ${
                      duration === m
                        ? 'border-teal-600 bg-teal-50/80 text-teal-900 shadow-sm ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-extrabold">{label}</div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Select Teaching Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Phong cách & Phương pháp sư phạm</label>
              <div className="space-y-2">
                {[
                  {
                    id: 'active_tpr',
                    title: 'Vận động thể chất TPR (Khuyên dùng)',
                    desc: 'Nhảy múa, bắt chước hành động, giải phóng năng lượng cho trẻ 3–5 tuổi'
                  },
                  {
                    id: 'story_song',
                    title: 'Kể chuyện & Bài hát vần điệu',
                    desc: 'Kể chuyện dẫn dắt cùng Koko, hát chant và gắn kết cảm xúc nhẹ nhàng'
                  },
                  {
                    id: 'interactive_drills',
                    title: 'Phản xạ tương tác nhóm',
                    desc: 'Trò chơi nhanh, bốc hộp thần kỳ và thi đua đội nhóm'
                  }
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setStyle(item.id as any)}
                    className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                      style === item.id
                        ? 'border-teal-600 bg-teal-50/60 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">{item.title}</span>
                      {style === item.id && <Check size={14} className="text-teal-600 font-bold" />}
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Re-generate button */}
            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-teal-700 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Đang tạo kịch bản sư phạm…' : 'Cập nhật kịch bản tiết dạy'}
            </button>
          </div>

          {/* Quick Pedagogical Tip Card */}
          <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-slate-900 font-bold">
                <Lightbulb size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">Nguyên Tắc Mầm Non</h3>
                <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                  Trẻ 3–6 tuổi tập trung tối đa <b>15–20 phút</b>. Hãy luôn kết hợp cử chỉ tay chân (TPR) và khích lệ bằng nụ cười thay vì ép buộc phát âm chuẩn 100%.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Main Panel: Generated Lesson Plan */}
        <div className="lg:col-span-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle size={18} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {loading && !plan ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
              <div className="text-base font-extrabold text-slate-800">Đang tổng hợp kịch bản giáo án thông minh…</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Trợ lý KCEnglishKids đang phân tích từ vựng, xây dựng trò chơi vận động TPR và khẩu lệnh mầm non.
              </p>
            </div>
          ) : plan ? (
            <div ref={printRef} className="space-y-6 print:space-y-4">
              {/* Plan Header Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold text-teal-900 border border-teal-200">
                        {plan.meta.bookLevel}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                        ⏱️ {plan.meta.durationMinutes} phút
                      </span>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
                        Chủ đề: {plan.meta.targetTopic}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                      {plan.meta.lessonTitle}
                    </h2>
                  </div>

                  {/* Actions: Copy & Print */}
                  <div className="flex items-center gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      {copied ? 'Đã sao chép!' : 'Sao chép'}
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer size={14} /> In giáo án
                    </button>
                  </div>
                </div>

                {/* Target Vocabulary Badges */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Từ vựng trọng tâm bài học ({plan.targetVocabulary.length} từ)
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    {plan.targetVocabulary.map((word, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-1 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 px-3.5 py-2.5 border border-teal-200 shadow-2xs"
                      >
                        <div className="flex items-center gap-2">
                          <Volume2 size={14} className="text-teal-700" />
                          <span className="font-extrabold text-sm text-teal-950">{word.english}</span>
                          {word.vietnamese && (
                            <span className="text-xs text-slate-500 font-medium">({word.vietnamese})</span>
                          )}
                          {word.pronunciation && (
                            <span className="text-[10px] text-teal-700/80 font-mono bg-white px-1.5 py-0.5 rounded-md border border-teal-100">
                              {word.pronunciation}
                            </span>
                          )}
                        </div>
                        {word.tprGesture && (
                          <div className="text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/70 flex items-center gap-1.5">
                            <span className="font-black text-amber-700">🤸 TPR:</span>
                            <span>{word.tprGesture}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Materials & Prep Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-2">
                    <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Layers size={14} className="text-teal-600" /> Học liệu & Đồ dùng cần chuẩn bị
                    </h3>
                    <ul className="text-xs text-slate-600 space-y-1 font-medium list-disc list-inside">
                      {plan.materialsNeeded.map((m, idx) => (
                        <li key={idx} className="leading-relaxed">{m}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl bg-teal-50/50 p-4 border border-teal-100 space-y-2">
                    <h3 className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                      <Award size={14} className="text-teal-600" /> Mục tiêu sư phạm chính
                    </h3>
                    <ul className="text-xs text-teal-900 space-y-1 font-medium list-disc list-inside">
                      {plan.objectives.knowledge.map((k, idx) => (
                        <li key={idx} className="leading-relaxed">{k}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Four Phases Cards */}
              <div className="space-y-5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-teal-600" />
                    Kịch Bản Chi Tiết 4 Giai Đoạn Chuẩn Mầm Non
                  </h3>
                  <span className="text-xs text-slate-500 font-bold">Tổng: {plan.meta.durationMinutes} phút</span>
                </div>

                {plan.phases.map((phase, pIdx) => {
                  const theme = getPhaseColorClasses(phase.colorTheme);
                  return (
                    <div
                      key={pIdx}
                      className={`rounded-3xl border ${theme.border} bg-white shadow-sm overflow-hidden transition-all`}
                    >
                      {/* Phase Header */}
                      <div className={`flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 ${theme.bg} border-b ${theme.border}`}>
                        <div className="flex items-center gap-3">
                          <span className={`grid h-8 w-8 place-items-center rounded-xl bg-white shadow-2xs font-black text-sm ${theme.iconColor}`}>
                            {pIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-base font-extrabold text-slate-900">{phase.name}</h4>
                            <div className="text-xs text-slate-500 font-medium">
                              Mục tiêu: {phase.goals.join(' • ')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`rounded-xl px-3 py-1 text-xs font-extrabold border ${theme.badge}`}>
                            ⏱️ {phase.durationMin} phút
                          </span>
                        </div>
                      </div>

                      {/* Activities in Phase */}
                      <div className="p-4 sm:p-6 space-y-5">
                        {phase.activities.map((act, aIdx) => (
                          <div
                            key={aIdx}
                            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-teal-600" />
                                <h5 className="text-sm font-black text-slate-900">{act.name}</h5>
                              </div>
                              <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                                {act.durationMin} phút
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                              {act.description}
                            </p>

                            {/* Teacher Talk Quote */}
                            {act.teacherTalk && (
                              <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-3 flex items-start gap-2.5">
                                <div className="text-sky-700 font-extrabold text-xs shrink-0 mt-0.5">💬 Khẩu lệnh cô:</div>
                                <div className="text-xs font-bold text-sky-950 italic">
                                  "{act.teacherTalk}"
                                </div>
                              </div>
                            )}

                            {/* TPR Physical Action */}
                            {act.tprAction && (
                              <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-3 flex items-start gap-2.5">
                                <div className="text-amber-800 font-extrabold text-xs shrink-0 mt-0.5">🤸 Cử chỉ TPR:</div>
                                <div className="text-xs font-medium text-amber-950">
                                  {act.tprAction}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Home Connect Take-home prompt */}
              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-xs flex items-start gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                  <HeartHandshake size={20} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-emerald-950">Gợi Ý Tin Nhắn Sổ Liên Lạc Cho Phụ Huynh Về Nhà</h4>
                  <p className="text-xs text-emerald-900 font-medium leading-relaxed">
                    {plan.homeConnectPrompt}
                  </p>
                </div>
              </div>

              {/* Bottom Quick Launch Action Bar */}
              <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                  <div className="text-base font-black">Sẵn Sàng Dạy Tiết Học Này?</div>
                  <p className="text-xs text-teal-100 font-medium max-w-lg">
                    Kịch bản 4 giai đoạn, bài hát khởi động, thẻ mô phỏng TPR và trò chơi tương tác sẽ tự động được kích hoạt trên màn chiếu của lớp.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLaunchLiveSessionWithPlan}
                  disabled={startingSession || !plan}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-black text-slate-900 shadow-md hover:bg-amber-300 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Rocket size={18} className={startingSession ? 'animate-bounce' : ''} />
                  {startingSession ? 'Đang chuẩn bị màn chiếu…' : '🚀 Vào Lớp Dạy Trực Tiếp Ngay'}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              Chưa có kịch bản bài học. Vui lòng chọn bài học ở khung bên trái để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
