import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Circle,
  Star,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  Clock,
  Users,
  Mic,
  Sparkles,
  Shuffle,
  Volume2,
  BookOpen,
  Gamepad2,
  Award,
  CheckSquare,
  Square,
  ThumbsUp,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { classroomSessionApi } from '../../services/api';
import type { ClassroomSession, StudentSessionScore, User } from '../../types';
import { sfx, playWordAudio } from '../../utils/audio';

// ── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const elapsedMin = (startedAt?: string) => {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
};

type AnswerMap = Record<string, 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED'>;
type ViewTab = 'presentation' | 'grid' | 'games';

// Fallback rich preschool vocabulary in case lesson has no custom vocabulary yet
const DEFAULT_PRESCHOOL_VOCAB = [
  { _id: 'v_cat', english: 'Cat', vietnamese: 'Con mèo', pronunciation: '/kæt/', imageUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500', audioUrl: '' },
  { _id: 'v_dog', english: 'Dog', vietnamese: 'Con chó', pronunciation: '/dɒɡ/', imageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500', audioUrl: '' },
  { _id: 'v_apple', english: 'Apple', vietnamese: 'Quả táo', pronunciation: '/ˈæp.əl/', imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500', audioUrl: '' },
  { _id: 'v_car', english: 'Car', vietnamese: 'Xe hơi', pronunciation: '/kɑːr/', imageUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=500', audioUrl: '' },
  { _id: 'v_bird', english: 'Bird', vietnamese: 'Con chim', pronunciation: '/bɜːd/', imageUrl: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=500', audioUrl: '' },
  { _id: 'v_fish', english: 'Fish', vietnamese: 'Con cá', pronunciation: '/fɪʃ/', imageUrl: 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=500', audioUrl: '' },
  { _id: 'v_sun', english: 'Sun', vietnamese: 'Mặt trời', pronunciation: '/sʌn/', imageUrl: 'https://images.unsplash.com/photo-1538370965046-79c0d6907d47?w=500', audioUrl: '' },
  { _id: 'v_bear', english: 'Bear', vietnamese: 'Con gấu', pronunciation: '/beər/', imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=500', audioUrl: '' }
];

export const LiveSessionPage: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [scoringStudent, setScoringStudent] = useState<StudentSessionScore | null>(null);
  const [spotlightStudent, setSpotlightStudent] = useState<StudentSessionScore | null>(null);
  const [isPickingRandom, setIsPickingRandom] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Classroom teaching views
  const [activeTab, setActiveTab] = useState<ViewTab>('presentation');
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bulk / Multi-select mode
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Mini-game in classroom state
  const [classroomGameMode, setClassroomGameMode] = useState<'listen-choose' | 'true-false' | 'animal-sound'>('listen-choose');
  const [gameQuestionIdx, setGameQuestionIdx] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const pickRandomStudent = () => {
    if (!session?.studentScores || session.studentScores.length === 0) return;
    sfx.playPop();
    setIsPickingRandom(true);
    let count = 0;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * session.studentScores.length);
      setSpotlightStudent(session.studentScores[randIdx]);
      count++;
      if (count >= 10) {
        clearInterval(interval);
        setIsPickingRandom(false);
        sfx.playStarFanfare();
      }
    }, 90);
  };

  const load = useCallback(async () => {
    try {
      const res = await classroomSessionApi.getSession(sessionId);
      const s: ClassroomSession = res.data;
      setSession(s);
      // Initialise answer map for this question
      const initialAnswers: AnswerMap = {};
      (s.studentScores || []).forEach((sc) => {
        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
        initialAnswers[sid] = 'NOT_ANSWERED';
      });
      setAnswers((prev) => ({ ...initialAnswers, ...prev }));
    } catch {
      // silently handle fetch errors
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(elapsedMin(session?.startedAt));
    }, 30000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.startedAt]);

  // Soft warning after planned duration
  useEffect(() => {
    if (session && elapsed >= (session.plannedDuration || 45) && !showWarn) {
      setShowWarn(true);
    }
  }, [elapsed, session, showWarn]);

  // Safe vocabulary pool from lesson or built-in preschool dataset
  const activeVocabList = useMemo(() => {
    const fromLesson = session?.lesson?.vocabularyItems;
    if (fromLesson && Array.isArray(fromLesson) && fromLesson.length > 0) {
      return fromLesson.map((v: any) => ({
        _id: v._id || v.id || v.word,
        english: v.english || v.word || 'Word',
        vietnamese: v.vietnamese || '',
        pronunciation: v.pronunciation || '',
        imageUrl: v.imageUrl || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500',
        audioUrl: v.audioUrl || ''
      }));
    }
    return DEFAULT_PRESCHOOL_VOCAB;
  }, [session?.lesson]);

  const currentVocab = activeVocabList[currentVocabIndex] || activeVocabList[0];

  // ── Question result submission ─────────────────────────────────────────────
  const submitQuestionResult = async (activityId?: string, qIndex = 0, promptText = '') => {
    if (!session) return;
    const studentAnswers = Object.entries(answers).map(([studentId, result]) => ({
      studentId,
      result
    }));
    await classroomSessionApi.recordQuestionResult(sessionId, {
      activityId,
      questionIndex: qIndex,
      promptText,
      studentAnswers
    });
    sfx.playCorrect();
    showToast('✓ Đã lưu kết quả câu hỏi vào tiến trình học!');
    // Reset answers for next question
    const reset: AnswerMap = {};
    session.studentScores.forEach((sc) => {
      const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
      reset[sid] = 'NOT_ANSWERED';
    });
    setAnswers(reset);
    void load();
  };

  // ── Per-student scoring ────────────────────────────────────────────────────
  const applyScore = async (
    studentId: string,
    opts: { stars?: number; points?: number; correctDelta?: number; incorrectDelta?: number }
  ) => {
    sfx.playPop();
    await classroomSessionApi.scoreStudent(sessionId, { studentId, ...opts });
    setScoringStudent(null);
    void load();
  };

  // ── Multi-Student & Bulk Scoring (The Core Requirement) ────────────────────
  const applyBulkScore = async (
    studentIds: string[],
    opts: { stars?: number; points?: number; correctDelta?: number; incorrectDelta?: number },
    successMsg?: string
  ) => {
    if (studentIds.length === 0) return;
    try {
      sfx.playStarFanfare();
      await classroomSessionApi.scoreBulk(sessionId, { studentIds, ...opts });
      showToast(successMsg || `🎉 Đã cộng điểm thành công cho ${studentIds.length} học sinh!`);
      void load();
    } catch {
      // Fallback: per student scoring if bulk fails
      await Promise.all(studentIds.map(sid => classroomSessionApi.scoreStudent(sessionId, { studentId: sid, ...opts })));
      void load();
    }
  };

  // 1. Chấm điểm tất cả các bé đang có trạng thái Đúng (✓)
  const handleAwardAllCorrect = (stars = 1, points = 5) => {
    const correctStudentIds = Object.entries(answers)
      .filter(([_, ans]) => ans === 'CORRECT')
      .map(([sid]) => sid);

    if (correctStudentIds.length === 0) {
      showToast('⚠️ Chưa có học sinh nào được tích Đúng (✓) trong lượt này!');
      return;
    }

    void applyBulkScore(
      correctStudentIds,
      { stars, points, correctDelta: 1 },
      `⭐ Đã thưởng +${stars} Sao & +${points}đ cho ${correctStudentIds.length} bé trả lời đúng!`
    );
  };

  // 2. Thưởng CẢ LỚP cùng lúc
  const handleAwardWholeClass = (stars = 1, points = 5) => {
    if (!session?.studentScores || session.studentScores.length === 0) return;
    const allIds = session.studentScores.map(sc =>
      typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || ''
    ).filter(Boolean);

    void applyBulkScore(
      allIds,
      { stars, points },
      `🌟 Hoan hô cả lớp! Tất cả ${allIds.length} bạn đều được thưởng +${stars} Sao vàng!`
    );
  };

  // 3. Thưởng các bé được tick chọn trong Multi-Select Mode
  const handleAwardSelected = (opts: { stars?: number; points?: number; correctDelta?: number }, label: string) => {
    if (selectedStudentIds.length === 0) {
      showToast('⚠️ Vui lòng chọn ít nhất 1 học sinh!');
      return;
    }

    void applyBulkScore(
      selectedStudentIds,
      opts,
      `👏 Đã thưởng (${label}) cho ${selectedStudentIds.length} bé được chọn!`
    );
  };

  // ── Toggle answer state for a student ─────────────────────────────────────
  const cycleAnswer = (studentId: string) => {
    sfx.playPop();
    setAnswers((prev) => {
      const cur = prev[studentId] || 'NOT_ANSWERED';
      const next =
        cur === 'NOT_ANSWERED' ? 'CORRECT' : cur === 'CORRECT' ? 'INCORRECT' : 'NOT_ANSWERED';
      return { ...prev, [studentId]: next };
    });
  };

  // ── Multi-select student toggle ──────────────────────────────────────────
  const toggleStudentSelection = (studentId: string) => {
    sfx.playPop();
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // ── End session ───────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (!confirm('Bạn có chắc muốn kết thúc phiên học này không? Hệ thống sẽ tạo bảng tổng kết và báo cáo cho phụ huynh.')) return;
    setEnding(true);
    try {
      await classroomSessionApi.endSession(sessionId);
      navigate(`/teacher/classroom-sessions/${sessionId}/summary`);
    } catch {
      setEnding(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <span className="ml-4 text-xl font-bold">Đang tải phòng học trực tiếp…</span>
      </div>
    );
  }

  const scores = session.studentScores || [];
  const currentAct = session.activities?.[session.currentActivityIndex] || null;
  const correct = scores.reduce((n, s) => n + s.correctCount, 0);
  const totalStars = scores.reduce((n, s) => n + s.stars, 0);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce-short">
          <Sparkles className="w-5 h-5 text-yellow-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top bar: Header & Master Status ───────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center text-xl shadow-md text-amber-950 font-black">
            🏫
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <p className="text-xs font-black text-emerald-400 tracking-wider uppercase">LỚP HỌC TRỰC TIẾP</p>
            </div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              {session.title}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300">
                {session.classroom?.name || 'Mầm non'}
              </span>
            </h1>
          </div>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="hidden md:flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-white/15 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'presentation'
                ? 'bg-amber-400 text-amber-950 shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={16} />
            <span>Giảng Bài Từ Vựng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'games'
                ? 'bg-purple-500 text-white shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={16} />
            <span>Trò Chơi Lớp Học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-teal-500 text-white shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            <span>Lưới Quản Lý ({scores.length} bé)</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {/* Elapsed time */}
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-bold text-xs">
            <Clock size={14} className="text-amber-300" />
            {elapsed > 0 ? `${elapsed} phút` : 'Vừa bắt đầu'}
          </span>

          {/* Total correct answers */}
          <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-emerald-300 font-bold text-xs border border-emerald-500/30">
            <CheckCircle2 size={14} className="text-emerald-400" />
            {correct} đúng
          </span>

          {/* Total stars */}
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3.5 py-1 text-amber-300 font-black border border-amber-500/30">
            <Star size={15} className="fill-amber-400 text-amber-400" />
            {totalStars} sao
          </span>

          <button
            onClick={handleEnd}
            disabled={ending}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2 text-xs sm:text-sm font-black text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <StopCircle size={15} />
            {ending ? 'Đang kết thúc…' : 'Kết thúc'}
          </button>
        </div>
      </header>

      {/* Mobile Tab switcher bar */}
      <div className="flex md:hidden items-center justify-around bg-slate-900 border-b border-white/10 p-2">
        <button
          onClick={() => setActiveTab('presentation')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === 'presentation' ? 'bg-amber-400 text-amber-950' : 'text-slate-400'}`}
        >
          <BookOpen size={14} /> Giảng bài
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === 'games' ? 'bg-purple-500 text-white' : 'text-slate-400'}`}
        >
          <Gamepad2 size={14} /> Trò chơi
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${activeTab === 'grid' ? 'bg-teal-500 text-white' : 'text-slate-400'}`}
        >
          <Users size={14} /> Quản lý ({scores.length})
        </button>
      </div>

      {/* Soft warning banner */}
      {showWarn && (
        <div className="flex items-center justify-between bg-amber-500/20 px-6 py-2 text-xs font-bold text-amber-300 border-b border-amber-500/30">
          <span>⏱ Phiên học đã diễn ra {elapsed} phút (kế hoạch dự kiến: {session.plannedDuration} phút). Cô hãy chuẩn bị chuyển sang phần tổng kết nhé!</span>
          <button onClick={() => setShowWarn(false)} className="text-amber-400 hover:text-white cursor-pointer">✕</button>
        </div>
      )}

      {/* ── MAIN CONTENT AREA BASED ON TAB ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-x-hidden">

        {/* ========================================================================= */}
        {/* TAB 1: PRESENTATION & VOCABULARY TEACHING (Màn hình Giảng dạy Từ vựng)   */}
        {/* ========================================================================= */}
        {activeTab === 'presentation' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
            {/* Left Col (8 cols): Giant Presentation Flashcard for classroom display */}
            <div className="lg:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 rounded-4xl border-3 border-amber-400/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="w-full flex items-center justify-between mb-4">
                <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black px-4 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Từ vựng {currentVocabIndex + 1} / {activeVocabList.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(i => (i > 0 ? i - 1 : activeVocabList.length - 1));
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                    title="Từ trước"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(i => (i < activeVocabList.length - 1 ? i + 1 : 0));
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                    title="Từ tiếp theo"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Giant Flashcard Content */}
              <div className="flex flex-col items-center text-center my-auto w-full">
                {/* Visual Image Frame */}
                <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-4xl bg-white p-4 shadow-2xl border-4 border-amber-300 mb-6 flex items-center justify-center relative group">
                  <img
                    src={currentVocab.imageUrl}
                    alt={currentVocab.english}
                    className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                  />
                  {/* Pronounce Speaker on Card */}
                  <button
                    onClick={() => {
                      sfx.playPop();
                      playWordAudio(currentVocab.english, currentVocab.audioUrl);
                    }}
                    className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer ring-6 ring-amber-300/50"
                    title="Cô bấm để phát âm chuẩn"
                  >
                    <Volume2 size={28} />
                  </button>
                </div>

                {/* English Word */}
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-amber-400 font-display tracking-wide uppercase drop-shadow-md mb-2">
                  {currentVocab.english}
                </h2>

                {/* Vietnamese Meaning & Pronunciation hint */}
                <div className="flex items-center gap-3 text-slate-300 text-lg sm:text-2xl font-bold mb-6">
                  <span className="text-white bg-white/10 px-4 py-1 rounded-2xl">
                    {currentVocab.vietnamese}
                  </span>
                  {currentVocab.pronunciation && (
                    <span className="text-amber-300/80 font-mono text-sm sm:text-base">
                      {currentVocab.pronunciation}
                    </span>
                  )}
                </div>

                {/* Classroom Interactive Prompt */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      playWordAudio(currentVocab.english, currentVocab.audioUrl);
                    }}
                    className="flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 px-5 py-2.5 rounded-2xl font-black text-sm cursor-pointer active:scale-95 transition-all"
                  >
                    <Volume2 size={18} />
                    <span>Cả lớp đồng thanh đọc</span>
                  </button>

                  <button
                    onClick={pickRandomStudent}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <Mic size={18} />
                    <span>Mời 1 bé đọc từ này 🎲</span>
                  </button>
                </div>
              </div>

              {/* Vocabulary Carousel Strip at bottom */}
              <div className="w-full flex items-center gap-2 overflow-x-auto pt-4 border-t border-white/10 scrollbar-none">
                {activeVocabList.map((v, idx) => (
                  <button
                    key={v._id || idx}
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(idx);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      currentVocabIndex === idx
                        ? 'border-amber-400 bg-amber-400/20 text-amber-300 ring-2 ring-amber-400/40'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full overflow-hidden bg-white/20 inline-flex items-center justify-center">
                      <img src={v.imageUrl} alt="" className="w-full h-full object-cover" />
                    </span>
                    <span>{v.english}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Col (4 cols): Quick Grading on the Spot */}
            <div className="lg:col-span-4 flex flex-col bg-slate-900/80 rounded-4xl border border-white/15 p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-amber-400" />
                  <h3 className="font-black text-base text-white">Chấm Điểm Nhanh</h3>
                </div>
                <span className="text-xs font-bold text-slate-400">{scores.length} học sinh</span>
              </div>

              {/* Master whole-class award buttons */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => handleAwardWholeClass(1, 5)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 hover:bg-amber-500/30 text-xs font-black cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <Star size={14} className="fill-amber-400" />
                  <span>Cả lớp +1 ⭐</span>
                </button>
                <button
                  onClick={() => handleAwardWholeClass(0, 5)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 hover:bg-sky-500/30 text-xs font-black cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <ThumbsUp size={14} />
                  <span>Khen cả lớp +5đ</span>
                </button>
              </div>

              {/* Quick Students list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[460px]">
                {scores.map((sc) => {
                  const student = sc.student as User;
                  const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                  const sName = student?.name || 'Bé yêu';

                  return (
                    <div
                      key={sid}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-white/20">
                          {student?.avatarUrl ? (
                            <img src={student.avatarUrl} alt={sName} className="w-full h-full object-cover" />
                          ) : (
                            initials(sName)
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{sName}</p>
                          <p className="text-[11px] text-amber-300 flex items-center gap-1 font-semibold">
                            <Star size={10} className="fill-amber-400 text-amber-400" />
                            {sc.stars} sao &bull; {sc.points}đ
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            void applyScore(sid, { stars: 1, points: 5 });
                            showToast(`⭐ +1 Sao cho ${sName}!`);
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs cursor-pointer active:scale-95 shadow-xs"
                          title="Thưởng 1 sao"
                        >
                          +1 ⭐
                        </button>
                        <button
                          onClick={() => setSpotlightStudent(sc)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95"
                          title="Mời bé phát biểu"
                        >
                          <Mic size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CLASSROOM INTERACTIVE GAMES (Trò chơi lớp học)                     */}
        {/* ========================================================================= */}
        {activeTab === 'games' && (
          <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full bg-slate-900/90 rounded-4xl border-3 border-purple-500/40 p-6 sm:p-8 shadow-2xl">
            {/* Game Header & Mode selection */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500 flex items-center justify-center text-2xl shadow-lg">
                  🎮
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">Trò Chơi Tương Tác Lớp Học</h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-400">
                    Sử dụng chính các từ vựng bé học ở nhà &bull; Cả lớp cùng tham gia & Chấm điểm tức thì!
                  </p>
                </div>
              </div>

              {/* Game type selector buttons */}
              <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={() => setClassroomGameMode('listen-choose')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    classroomGameMode === 'listen-choose' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🎧 Nghe & Chọn
                </button>
                <button
                  onClick={() => setClassroomGameMode('true-false')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    classroomGameMode === 'true-false' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  👍 Đúng hay Sai
                </button>
                <button
                  onClick={() => setClassroomGameMode('animal-sound')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    classroomGameMode === 'animal-sound' ? 'bg-orange-500 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🐾 Tiếng kêu con vật
                </button>
              </div>
            </div>

            {/* Game Question Board */}
            <div className="bg-slate-950/70 rounded-3xl border-2 border-purple-400/30 p-6 sm:p-8 flex flex-col items-center text-center mb-6">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-5 py-1.5 rounded-full text-xs sm:text-sm font-black mb-4 flex items-center gap-2">
                <Sparkles size={14} />
                Câu hỏi {gameQuestionIdx + 1} / {activeVocabList.length}
              </span>

              {classroomGameMode === 'listen-choose' && (
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => playWordAudio(currentVocab.english, currentVocab.audioUrl)}
                    className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center shadow-2xl active:scale-95 cursor-pointer ring-8 ring-sky-400/30 mb-4 animate-pulse"
                  >
                    <Volume2 size={44} />
                  </button>
                  <p className="text-slate-400 text-sm font-bold mb-2">Bé lắng nghe cô phát âm và chọn tranh đúng:</p>
                  <h3 className="text-3xl sm:text-4xl font-black text-amber-400 tracking-wide uppercase font-display mb-6">
                    "{currentVocab.english}"
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
                    {activeVocabList.slice(0, 4).map((v) => (
                      <div
                        key={v._id}
                        className={`rounded-2xl border-3 p-3 bg-white/5 flex flex-col items-center justify-center ${
                          v.english === currentVocab.english ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10'
                        }`}
                      >
                        <div className="w-24 h-24 mb-2 flex items-center justify-center p-2 bg-white rounded-xl">
                          <img src={v.imageUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-black text-sm text-white">{v.english}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {classroomGameMode === 'true-false' && (
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 rounded-3xl bg-white p-3 border-4 border-amber-300 shadow-xl mb-4 flex items-center justify-center">
                    <img src={currentVocab.imageUrl} alt="" className="w-full h-full object-contain" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-6">
                    Đây có phải là: <span className="text-amber-400 font-display uppercase">"{currentVocab.english}"</span> ({currentVocab.vietnamese}) không các con?
                  </h3>
                  <div className="flex gap-6">
                    <div className="py-4 px-8 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 font-black text-xl flex items-center gap-2">
                      <CheckCircle2 size={24} /> ĐÚNG (YES)
                    </div>
                    <div className="py-4 px-8 rounded-2xl bg-rose-500/20 border-2 border-rose-400 text-rose-300 font-black text-xl flex items-center gap-2">
                      <XCircle size={24} /> SAI (NO)
                    </div>
                  </div>
                </div>
              )}

              {classroomGameMode === 'animal-sound' && (
                <div className="flex flex-col items-center">
                  <span className="text-7xl mb-4 animate-bounce">🐶 🐱 🐮 🦆</span>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">
                    "Tiếng kêu Meow Meow / Woof Woof..."
                  </h3>
                  <p className="text-slate-400 text-sm font-bold mb-6">Bạn động vật nào vừa kêu thế nhỉ?</p>
                  <button
                    onClick={() => playWordAudio('Woof woof! Dog!')}
                    className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-6 py-2.5 rounded-2xl cursor-pointer"
                  >
                    <Volume2 size={18} /> Nghe tiếng kêu con vật
                  </button>
                </div>
              )}
            </div>

            {/* Live Student Response & Instant Bulk Awarding */}
            <div className="bg-slate-800/90 rounded-3xl p-5 border border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-amber-400">Ghi nhận câu trả lời của lớp:</span>
                  <span className="text-xs text-slate-400">(Chạm vào bé để bật dấu ✓ nếu bé trả lời đúng)</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const all: AnswerMap = {};
                      scores.forEach((sc) => {
                        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
                        all[sid] = 'CORRECT';
                      });
                      setAnswers(all);
                      sfx.playPop();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black cursor-pointer"
                  >
                    ✓ Cả lớp trả lời đúng
                  </button>

                  <button
                    onClick={() => {
                      const reset: AnswerMap = {};
                      scores.forEach((sc) => {
                        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
                        reset[sid] = 'NOT_ANSWERED';
                      });
                      setAnswers(reset);
                      sfx.playPop();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Làm mới lượt
                  </button>
                </div>
              </div>

              {/* Quick response student pill grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 mb-5 max-h-48 overflow-y-auto pr-1">
                {scores.map((sc) => {
                  const student = sc.student as User;
                  const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                  const isCorrect = answers[sid] === 'CORRECT';

                  return (
                    <button
                      key={sid}
                      onClick={() => cycleAnswer(sid)}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        isCorrect
                          ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400/40 scale-102'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <span className="truncate max-w-[85px]">{student?.name || 'Bé'}</span>
                      {isCorrect ? (
                        <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-400/20 shrink-0" />
                      ) : (
                        <Circle size={15} className="text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Master Bulk Award Button for Game */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleAwardAllCorrect(1, 5)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm sm:text-base shadow-xl active:scale-95 cursor-pointer"
                >
                  <Star size={18} className="fill-yellow-200 text-yellow-200" />
                  <span>⭐ Thưởng tất cả các bé đúng (+1 Sao & +5đ)</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => submitQuestionResult(currentAct?._id, gameQuestionIdx, currentVocab.english)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs sm:text-sm cursor-pointer active:scale-95"
                    title="Ghi nhận vào tiến trình học của cả lớp"
                  >
                    <CheckSquare size={16} />
                    <span>Lưu câu hỏi</span>
                  </button>

                  <button
                    onClick={() => {
                      sfx.playPop();
                      setGameQuestionIdx(i => (i + 1) % activeVocabList.length);
                      setCurrentVocabIndex(i => (i + 1) % activeVocabList.length);
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm cursor-pointer active:scale-95"
                  >
                    <span>Câu hỏi tiếp theo</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FULL CLASSROOM GRID & BULK GRADING (Lưới Quản Lý & Chấm Điểm)       */}
        {/* ========================================================================= */}
        {activeTab === 'grid' && (
          <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
            {/* Top Toolbar: Bulk Grading & Multi-Select Controls */}
            <div className="bg-slate-900/90 rounded-3xl border border-white/15 p-4 sm:p-5 shadow-xl mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left: Section Header & Mode Toggle */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300">
                    <Users size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      Danh Sách Học Sinh ({scores.length} bạn)
                    </h2>
                    <p className="text-xs text-slate-400 font-bold">
                      Nhấn vào từng ô để đánh dấu Đúng (✓) hoặc kích hoạt chấm điểm hàng loạt
                    </p>
                  </div>
                </div>

                {/* Right: Master Bulk Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Multi-select toggle */}
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setIsMultiSelectMode(!isMultiSelectMode);
                      if (isMultiSelectMode) setSelectedStudentIds([]);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black border transition-all cursor-pointer ${
                      isMultiSelectMode
                        ? 'bg-purple-600 border-purple-400 text-white ring-2 ring-purple-400/50 shadow-md'
                        : 'bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isMultiSelectMode ? <CheckSquare size={16} /> : <Square size={16} />}
                    <span>{isMultiSelectMode ? 'Đang chọn nhiều' : 'Chọn nhiều bé'}</span>
                  </button>

                  {/* Award all correct button */}
                  <button
                    onClick={() => handleAwardAllCorrect(1, 5)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer"
                  >
                    <Star size={15} className="fill-yellow-200 text-yellow-200" />
                    <span>Thưởng tất cả bé đúng (✓)</span>
                  </button>

                  {/* Award whole class */}
                  <button
                    onClick={() => handleAwardWholeClass(1, 5)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-black text-xs sm:text-sm cursor-pointer active:scale-95"
                  >
                    <Trophy size={15} />
                    <span>Thưởng cả lớp (+1 ⭐)</span>
                  </button>

                  {/* Random student spinner */}
                  <button
                    onClick={pickRandomStudent}
                    disabled={isPickingRandom}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Mic size={15} className={isPickingRandom ? 'animate-bounce' : ''} />
                    <span>Mời phát biểu 🎲</span>
                  </button>
                </div>
              </div>

              {/* Sub-bar: Answer filters & Quick mass setters */}
              <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 font-bold">Thao tác nhanh cho câu hỏi hiện tại:</span>
                  <button
                    onClick={() => {
                      const all: AnswerMap = {};
                      scores.forEach((sc) => {
                        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
                        all[sid] = 'CORRECT';
                      });
                      setAnswers(all);
                      sfx.playPop();
                    }}
                    className="text-emerald-400 hover:underline font-black cursor-pointer"
                  >
                    ✓ Đánh dấu tất cả Đúng
                  </button>
                  <button
                    onClick={() => {
                      const reset: AnswerMap = {};
                      scores.forEach((sc) => {
                        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
                        reset[sid] = 'NOT_ANSWERED';
                      });
                      setAnswers(reset);
                      sfx.playPop();
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    ○ Đặt lại câu hỏi
                  </button>
                </div>

                <div className="flex items-center gap-3 text-slate-400 font-bold">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 size={13} /> {Object.values(answers).filter(v => v === 'CORRECT').length} đúng
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle size={13} /> {Object.values(answers).filter(v => v === 'INCORRECT').length} sai
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Circle size={13} /> {Object.values(answers).filter(v => v === 'NOT_ANSWERED').length} chưa trả lời
                  </span>
                </div>
              </div>
            </div>

            {/* Student Cards Grid (20 Students responsive) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 pb-24">
              {scores.map((sc) => {
                const student = sc.student as User;
                const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                const ans = answers[sid] || 'NOT_ANSWERED';
                const isSelected = selectedStudentIds.includes(sid);

                return (
                  <StudentCard
                    key={sid}
                    score={sc}
                    studentId={sid}
                    answer={ans}
                    isSelected={isSelected}
                    isMultiSelectMode={isMultiSelectMode}
                    onToggleSelect={() => toggleStudentSelection(sid)}
                    onCycleAnswer={() => cycleAnswer(sid)}
                    onOpenScoring={() => setScoringStudent(sc)}
                    onSpotlight={() => setSpotlightStudent(sc)}
                  />
                );
              })}
            </div>

            {/* Floating Bulk Action Bar when multi-selection is active */}
            {isMultiSelectMode && selectedStudentIds.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 border-2 border-purple-400 p-3 sm:p-4 rounded-3xl shadow-2xl flex flex-wrap items-center gap-3 animate-fade-in text-white backdrop-blur-md">
                <span className="text-xs sm:text-sm font-black bg-purple-600 px-3 py-1.5 rounded-xl">
                  Đã chọn {selectedStudentIds.length} bé
                </span>

                <button
                  onClick={() => handleAwardSelected({ stars: 1, points: 5 }, '+1 Sao')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Star size={14} className="fill-amber-950" />
                  +1 ⭐ (+5đ)
                </button>

                <button
                  onClick={() => handleAwardSelected({ stars: 3, points: 15 }, '+3 Sao')}
                  className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Sparkles size={14} />
                  +3 ⭐ (+15đ)
                </button>

                <button
                  onClick={() => {
                    const nextAnswers = { ...answers };
                    selectedStudentIds.forEach(id => { nextAnswers[id] = 'CORRECT'; });
                    setAnswers(nextAnswers);
                    sfx.playPop();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 size={14} />
                  Đánh dấu Đúng (✓)
                </button>

                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Spotlight / Mời phát biểu Modal ─────────────────────────────────── */}
      {spotlightStudent && (
        <SpotlightModal
          score={spotlightStudent}
          vocabPrompt={currentVocab.english}
          onClose={() => setSpotlightStudent(null)}
          onPickAnother={pickRandomStudent}
          onApply={(opts) => {
            const sid =
              typeof spotlightStudent.student === 'string'
                ? spotlightStudent.student
                : (spotlightStudent.student as User)._id || '';
            void applyScore(sid, opts);
          }}
        />
      )}

      {/* ── Individual Scoring modal ─────────────────────────────────────────── */}
      {scoringStudent && (
        <ScoringModal
          score={scoringStudent}
          onClose={() => setScoringStudent(null)}
          onApply={(opts) => {
            const sid =
              typeof scoringStudent.student === 'string'
                ? scoringStudent.student
                : (scoringStudent.student as User)._id || '';
            void applyScore(sid, opts);
          }}
        />
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StudentCard = ({
  score,
  studentId: _studentId,
  answer,
  isSelected,
  isMultiSelectMode,
  onToggleSelect,
  onCycleAnswer,
  onOpenScoring,
  onSpotlight
}: {
  score: StudentSessionScore;
  studentId: string;
  answer: 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED';
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onToggleSelect: () => void;
  onCycleAnswer: () => void;
  onOpenScoring: () => void;
  onSpotlight: () => void;
}) => {
  const student = score.student as User;
  const name = student?.name || 'Student';

  const ansIcon =
    answer === 'CORRECT' ? (
      <CheckCircle2 size={18} className="text-emerald-400 fill-emerald-400/20" />
    ) : answer === 'INCORRECT' ? (
      <XCircle size={18} className="text-rose-400 fill-rose-400/20" />
    ) : (
      <Circle size={18} className="text-slate-500" />
    );

  const borderColor = isSelected
    ? 'border-purple-400 bg-purple-500/20 ring-4 ring-purple-400/40 scale-102 shadow-lg'
    : answer === 'CORRECT'
    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-emerald-500/5'
    : answer === 'INCORRECT'
    ? 'border-rose-500/50 bg-rose-500/10'
    : 'border-white/10 bg-white/5 hover:border-white/25';

  return (
    <div
      onClick={isMultiSelectMode ? onToggleSelect : undefined}
      className={`relative rounded-3xl border-2 p-3.5 transition-all flex flex-col justify-between ${borderColor} ${
        isMultiSelectMode ? 'cursor-pointer' : ''
      }`}
    >
      {/* Top action icons */}
      <div className="flex items-center justify-between mb-2">
        {isMultiSelectMode ? (
          <div className="text-purple-400">
            {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-500" />}
          </div>
        ) : (
          <span className="text-[10px] font-black text-slate-500 uppercase">Học sinh</span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onCycleAnswer();
          }}
          className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          title="Bấm để đổi: Chưa trả lời → Đúng (✓) → Sai (✕)"
        >
          {ansIcon}
        </button>
      </div>

      {/* Avatar & Student Name */}
      <div className="text-center">
        <div className="mx-auto mb-2 h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-800 text-base font-black overflow-hidden border-2 border-white/20 shadow-md">
          {student?.avatarUrl ? (
            <img src={student.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-amber-300">{initials(name)}</span>
          )}
        </div>

        <p className="text-center text-sm font-black text-white truncate max-w-[140px] mx-auto">
          {name}
        </p>

        {/* Stars and points pill */}
        <div className="mt-1.5 flex items-center justify-center gap-2 text-xs font-bold text-slate-300 bg-white/5 py-1 px-2.5 rounded-full border border-white/5">
          <span className="flex items-center gap-1 text-amber-300">
            <Star size={11} className="fill-amber-400 text-amber-400" />
            {score.stars}
          </span>
          <span className="text-slate-500">&bull;</span>
          <span>{score.points}đ</span>
        </div>
      </div>

      {/* Bottom Action buttons */}
      <div className="mt-3 flex gap-1.5 pt-2 border-t border-white/10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenScoring();
          }}
          className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 py-1.5 text-xs font-black text-white transition-colors cursor-pointer"
        >
          Chấm điểm
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpotlight();
          }}
          title="Mời bé phát biểu"
          className="rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-2.5 py-1.5 text-amber-300 transition-colors flex items-center justify-center cursor-pointer"
        >
          <Mic size={14} />
        </button>
      </div>
    </div>
  );
};

const SpotlightModal = ({
  score,
  vocabPrompt,
  onClose,
  onPickAnother,
  onApply
}: {
  score: StudentSessionScore;
  vocabPrompt?: string;
  onClose: () => void;
  onPickAnother: () => void;
  onApply: (opts: { stars?: number; points?: number; correctDelta?: number; incorrectDelta?: number }) => void;
}) => {
  const student = score.student as User;
  const name = student?.name || 'Bé yêu';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-4xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-3 border-amber-400 p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden animate-pop-in">
        {/* Glow effects */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-teal-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-400 text-amber-950 px-5 py-1.5 font-black text-xs uppercase tracking-wider mb-4 shadow-lg">
          <Mic size={15} />
          Mời bé phát biểu
        </div>

        {/* Avatar */}
        <div className="relative mx-auto mb-3 h-28 w-28 rounded-3xl ring-4 ring-amber-400/80 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-800 border-2 border-white">
          {student?.avatarUrl ? (
            <img src={student.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl font-black text-amber-300">{initials(name)}</span>
          )}
        </div>

        {/* Student name */}
        <h3 className="text-3xl font-black text-white tracking-wide">{name}</h3>

        {vocabPrompt && (
          <div className="my-3 bg-white/10 border border-white/15 px-4 py-2 rounded-2xl inline-block">
            <span className="text-xs text-slate-300 font-bold block">Bé đọc từ này nhé:</span>
            <span className="text-xl font-black text-amber-300 uppercase font-display">"{vocabPrompt}"</span>
          </div>
        )}

        <p className="text-sm text-slate-300 font-bold">
          ⭐ {score.stars} sao &bull; 🏆 {score.points} điểm &bull; ✓ {score.correctCount} đúng
        </p>

        {/* Reward buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3 text-left">
          <button
            onClick={() => onApply({ points: 5 })}
            className="flex items-center gap-3 rounded-2xl border border-sky-500/40 bg-sky-500/10 p-3 hover:bg-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-2xl">👏</span>
            <div>
              <p className="text-xs font-bold text-sky-200">Vỗ tay khen ngợi</p>
              <p className="text-[11px] text-sky-400">+5 điểm</p>
            </div>
          </button>

          <button
            onClick={() => onApply({ stars: 1, points: 10 })}
            className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 hover:bg-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-2xl">🗣️</span>
            <div>
              <p className="text-xs font-bold text-amber-200">Nói to rõ ràng</p>
              <p className="text-[11px] text-amber-400">+1 ⭐ (+10đ)</p>
            </div>
          </button>

          <button
            onClick={() => onApply({ stars: 3, points: 15, correctDelta: 1 })}
            className="flex items-center gap-3 rounded-2xl border border-violet-500/40 bg-violet-500/10 p-3 hover:bg-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-2xl">🌟</span>
            <div>
              <p className="text-xs font-bold text-violet-200">Phát âm xuất sắc</p>
              <p className="text-[11px] text-violet-400">+3 ⭐ (+15đ)</p>
            </div>
          </button>

          <button
            onClick={() => onApply({ correctDelta: 1, points: 5 })}
            className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span className="text-2xl">✓</span>
            <div>
              <p className="text-xs font-bold text-emerald-200">Trả lời đúng</p>
              <p className="text-[11px] text-emerald-400">+1 đúng (+5đ)</p>
            </div>
          </button>
        </div>

        {/* Modal Controls */}
        <div className="mt-6 flex gap-2.5">
          <button
            onClick={onPickAnother}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-black text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Shuffle size={16} /> Đổi bé khác
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-teal-600 hover:bg-teal-500 py-3 text-sm font-black text-white transition-colors cursor-pointer shadow-lg"
          >
            Hoàn tất
          </button>
        </div>
      </div>
    </div>
  );
};

const ScoringModal = ({
  score,
  onClose,
  onApply
}: {
  score: StudentSessionScore;
  onClose: () => void;
  onApply: (opts: { stars?: number; points?: number; correctDelta?: number; incorrectDelta?: number }) => void;
}) => {
  const student = score.student as User;
  const name = student?.name || 'Học sinh';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-white/20 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/20 border border-teal-500/40 text-lg font-black text-teal-300">
            {initials(name)}
          </div>
          <div>
            <h3 className="text-xl font-black text-white">{name}</h3>
            <p className="text-xs text-slate-300 font-bold mt-0.5">
              ⭐ {score.stars} sao &bull; {score.points} điểm &bull; ✓ {score.correctCount} đúng
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <ActionBtn
            label="✓ Đúng"
            sub="+5 điểm"
            color="emerald"
            onClick={() => onApply({ correctDelta: 1, points: 5 })}
          />
          <ActionBtn
            label="✕ Chưa đúng"
            sub="cố gắng lần sau"
            color="rose"
            onClick={() => onApply({ incorrectDelta: 1 })}
          />
          <ActionBtn
            label="⭐ +1 Sao"
            sub="khen ngợi"
            color="amber"
            onClick={() => onApply({ stars: 1, points: 5 })}
          />
          <ActionBtn
            label="🎉 +3 Sao"
            sub="xuất sắc!"
            color="violet"
            onClick={() => onApply({ stars: 3, points: 15 })}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[5, 10, 20].map((pts) => (
            <button
              key={pts}
              onClick={() => onApply({ points: pts })}
              className="rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-black text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              +{pts} điểm
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full rounded-2xl border border-white/15 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

const ActionBtn = ({
  label,
  sub,
  color,
  onClick
}: {
  label: string;
  sub: string;
  color: 'emerald' | 'rose' | 'amber' | 'violet';
  onClick: () => void;
}) => {
  const cls = {
    emerald: 'border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300',
    rose: 'border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300',
    amber: 'border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300',
    violet: 'border-violet-500/40 bg-violet-500/20 hover:bg-violet-500/30 text-violet-300'
  }[color];
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-3 text-center transition-all active:scale-95 cursor-pointer ${cls}`}
    >
      <p className="font-black text-sm">{label}</p>
      <p className="text-[11px] opacity-75 font-semibold mt-0.5">{sub}</p>
    </button>
  );
};

export default LiveSessionPage;
