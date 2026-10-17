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
  ArrowRight,
  MessageSquare,
  HelpCircle,
  EyeOff,
  ExternalLink,
  Flame
} from 'lucide-react';
import { classroomSessionApi, sentenceApi, teacherApi } from '../../services/api';
import type { ClassroomSession, StudentSessionScore, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { sfx, playWordAudio } from '../../utils/audio';
import { childSpeechEngine, type SpeechRecognitionResult } from '../../utils/speechRecognition';
import type { SentencePattern } from './SentenceTeachingPage';
import { getSentenceIllustration } from '../../utils/sentenceIllustrations';

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
type ViewTab = 'warmup' | 'presentation' | 'sentences' | 'grid' | 'games';


const makeSvgUri = (emoji: string, bg: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bg}"/>
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.3"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" rx="36" fill="url(#g)"/>
      <text x="50%" y="54%" font-size="110" dominant-baseline="middle" text-anchor="middle">${emoji}</text>
      <text x="50%" y="86%" font-family="sans-serif" font-weight="900" font-size="22" fill="#1e293b" text-anchor="middle">${label}</text>
    </svg>`
  )}`;

// Safe local preschool vocabulary with vector SVG illustrations for projection
const DEFAULT_PRESCHOOL_VOCAB = [
  { _id: 'v_cat', english: 'Cat', vietnamese: 'Con mèo', pronunciation: '/kæt/', imageUrl: makeSvgUri('🐱', '#FDE68A', 'Cat'), audioUrl: '' },
  { _id: 'v_dog', english: 'Dog', vietnamese: 'Con chó', pronunciation: '/dɒɡ/', imageUrl: makeSvgUri('🐶', '#FED7AA', 'Dog'), audioUrl: '' },
  { _id: 'v_apple', english: 'Apple', vietnamese: 'Quả táo', pronunciation: '/ˈæp.əl/', imageUrl: makeSvgUri('🍎', '#FECDD3', 'Apple'), audioUrl: '' },
  { _id: 'v_car', english: 'Car', vietnamese: 'Xe hơi', pronunciation: '/kɑːr/', imageUrl: makeSvgUri('🚗', '#BAE6FD', 'Car'), audioUrl: '' },
  { _id: 'v_bird', english: 'Bird', vietnamese: 'Con chim', pronunciation: '/bɜːd/', imageUrl: makeSvgUri('🐦', '#A7F3D0', 'Bird'), audioUrl: '' },
  { _id: 'v_fish', english: 'Fish', vietnamese: 'Con cá', pronunciation: '/fɪʃ/', imageUrl: makeSvgUri('🐟', '#C7D2FE', 'Fish'), audioUrl: '' },
  { _id: 'v_sun', english: 'Sun', vietnamese: 'Mặt trời', pronunciation: '/sʌn/', imageUrl: makeSvgUri('☀️', '#FEF08A', 'Sun'), audioUrl: '' },
  { _id: 'v_bear', english: 'Bear', vietnamese: 'Con gấu', pronunciation: '/beər/', imageUrl: makeSvgUri('🐻', '#E2E8F0', 'Bear'), audioUrl: '' }
];

export const LiveSessionPage: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

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
  const hasSetInitialTabRef = useRef(false);

  // Classroom teaching views
  const [activeTab, setActiveTab] = useState<ViewTab>('presentation');
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Warm-up Phase state (Ôn tập từ vựng & mẫu câu của bài học ngay trước đó)
  const [previousLesson, setPreviousLesson] = useState<any | null>(null);
  const [warmupVocabList, setWarmupVocabList] = useState<any[]>(DEFAULT_PRESCHOOL_VOCAB);
  const [currentWarmupIndex, setCurrentWarmupIndex] = useState(0);
  const [isWarmupRevealed, setIsWarmupRevealed] = useState(false);
  const [warmupPatterns, setWarmupPatterns] = useState<SentencePattern[]>([]);
  const [currentWarmupPatternIndex, setCurrentWarmupPatternIndex] = useState(0);
  const [isWarmupPatternRevealed, setIsWarmupPatternRevealed] = useState(false);
  const [warmupSection, setWarmupSection] = useState<'vocab' | 'patterns'>('vocab');

  // Sentence Patterns teaching state
  const [patterns, setPatterns] = useState<SentencePattern[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [speechResult, setSpeechResult] = useState<SpeechRecognitionResult | null>(null);

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

  const loadSentencePatterns = useCallback(async (lessonId?: string, ageGroup?: string) => {
    try {
      setLoadingPatterns(true);
      const res = await sentenceApi.getPatterns({
        lessonId: lessonId || undefined,
        ageGroupCode: ageGroup || undefined
      });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setPatterns(res.data);
      } else {
        const fallbackRes = await sentenceApi.getPatterns({ ageGroupCode: ageGroup || '3-4' });
        if (fallbackRes.success && Array.isArray(fallbackRes.data)) {
          setPatterns(fallbackRes.data);
        }
      }
    } catch (e) {
      console.warn('Could not load sentence patterns for session:', e);
    } finally {
      setLoadingPatterns(false);
    }
  }, []);

  const handleStartMic = async (targetSentence: string) => {
    if (isListeningMic) {
      childSpeechEngine.stop();
      setIsListeningMic(false);
      return;
    }

    if (!childSpeechEngine.isAvailable()) {
      showToast('⚠️ Trình duyệt chưa hỗ trợ micro nhận diện giọng nói. Cô hãy cho bé phát âm theo loa nhé!');
      return;
    }

    sfx.playPop();
    setIsListeningMic(true);
    setSpeechResult(null);

    try {
      const result = await childSpeechEngine.listenAndVerify(targetSentence, 8000);
      setIsListeningMic(false);
      setSpeechResult(result);
      if (result.isMatch) {
        sfx.playStarFanfare();
        showToast(`🎉 Bé phát âm rất tốt (${Math.round(result.confidence * 100)}%): "${result.spokenText}"`);
      } else {
        sfx.playGentleWrong();
        showToast(`Bé nói: "${result.spokenText || '...'}" — Thử lại nhé!`);
      }
    } catch (error) {
      setIsListeningMic(false);
      console.warn('Speech error:', error);
    }
  };

  const playDialogue = async (qText: string, aText?: string) => {
    sfx.playPop();
    playWordAudio(qText);
    if (aText) {
      setTimeout(() => {
        playWordAudio(aText);
      }, 2200);
    }
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

      // Auto-activate warm-up tab on initial start if configured
      if (!hasSetInitialTabRef.current) {
        hasSetInitialTabRef.current = true;
        if (s.includeWarmup !== false) {
          setActiveTab('warmup');
        }
      }

      const lessonId = typeof s.lesson === 'object' ? s.lesson?._id : s.lesson;
      void loadSentencePatterns(lessonId, s.ageGroup || s.classroom?.ageGroupCode);

      // Fetch the immediately preceding lesson (bài học ngay trước đó) for Warm-up
      try {
        const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
        let prevLessonDoc: any = null;

        // 1. Check previous sessions of this class to get the lesson taught in the preceding session
        if (cId) {
          try {
            const prevSessRes = await classroomSessionApi.getSessions({ classroomId: cId });
            const list = (prevSessRes.data || []) as any[];
            const validPastSessions = list
              .filter((ps: any) => ps._id !== s._id && ps.lesson)
              .sort((a: any, b: any) => (Number(b.sessionNumber) || 0) - (Number(a.sessionNumber) || 0));

            const priorSession = validPastSessions.find((ps: any) =>
              (Number(ps.sessionNumber) || 0) < (Number(s.sessionNumber) || 999)
            ) || validPastSessions[0];

            if (priorSession?.lesson) {
              const pLId = typeof priorSession.lesson === 'object' ? priorSession.lesson._id : priorSession.lesson;
              const detailRes = await teacherApi.getLesson(pLId);
              if (detailRes.data) {
                prevLessonDoc = detailRes.data;
              }
            }
          } catch (err) {
            console.warn('Could not load previous session lesson:', err);
          }
        }

        // 2. Fallback to book order if no previous session found
        if (!prevLessonDoc) {
          const cntRes = await teacherApi.getContent();
          if (cntRes.data?.lessons) {
            const allL = cntRes.data.lessons;
            const curId = typeof s.lesson === 'object' ? s.lesson?._id : s.lesson;
            const curIdx = allL.findIndex((l: any) => String(l._id) === String(curId));
            if (curIdx > 0) {
              const detailRes = await teacherApi.getLesson(allL[curIdx - 1]._id);
              if (detailRes.data) {
                prevLessonDoc = detailRes.data;
              } else {
                prevLessonDoc = allL[curIdx - 1];
              }
            } else if (allL.length > 0) {
              prevLessonDoc = allL[0];
            }
          }
        }

        if (prevLessonDoc) {
          setPreviousLesson(prevLessonDoc);

          // Populate Vocabulary of the immediately preceding lesson
          if (prevLessonDoc.vocabularyItems?.length > 0) {
            setWarmupVocabList(
              prevLessonDoc.vocabularyItems.map((v: any) => ({
                _id: v._id || v.word,
                english: v.english || v.word || 'Word',
                vietnamese: v.vietnamese || '',
                pronunciation: v.pronunciation || '',
                imageUrl: v.imageUrl || makeSvgUri('⭐', '#FED7AA', v.english || 'Word'),
                audioUrl: v.audioUrl || ''
              }))
            );
          }

          // Populate Sentence Patterns of the immediately preceding lesson
          try {
            const patRes = await sentenceApi.getPatterns({
              lessonId: prevLessonDoc._id,
              ageGroupCode: s.ageGroup || s.classroom?.ageGroupCode
            });
            if (patRes.success && Array.isArray(patRes.data) && patRes.data.length > 0) {
              setWarmupPatterns(patRes.data);
            } else {
              const fallbackPats = await sentenceApi.getPatterns({
                ageGroupCode: s.ageGroup || s.classroom?.ageGroupCode || '3-4'
              });
              if (fallbackPats.success && Array.isArray(fallbackPats.data)) {
                setWarmupPatterns(fallbackPats.data.slice(0, 3));
              }
            }
          } catch (e) {
            console.warn('Could not load warmup patterns:', e);
          }
        }
      } catch (err) {
        console.warn('Could not load warmup previous lesson data:', err);
      }

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
  }, [sessionId, loadSentencePatterns]);

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
        imageUrl: v.imageUrl || makeSvgUri('📖', '#FEF08A', v.english || 'Word'),
        audioUrl: v.audioUrl || ''
      }));
    }
    return DEFAULT_PRESCHOOL_VOCAB;
  }, [session?.lesson]);

  const currentVocab = activeVocabList[currentVocabIndex] || activeVocabList[0];
  const currentWarmupVocab = warmupVocabList[currentWarmupIndex] || warmupVocabList[0] || DEFAULT_PRESCHOOL_VOCAB[0];
  const currentWarmupPattern = warmupPatterns[currentWarmupPatternIndex] || warmupPatterns[0];
  const currentLessonId = typeof session?.lesson === 'object' ? (session?.lesson as any)?._id : session?.lesson;

  const unitInfo = useMemo(() => {
    const l = session?.lesson as any;
    if (!l) return null;
    const u = Array.isArray(l.curriculumUnits) && l.curriculumUnits.length > 0 ? l.curriculumUnits[0] : null;
    return {
      bookNumber: u?.bookNumber || 1,
      unitNumber: u?.unitNumber || 1,
      unitTitle: u?.title || '',
      topicName: l.topic?.englishName || l.topic?.vietnameseName || ''
    };
  }, [session?.lesson]);

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
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                BUỔI {session.sessionNumber || 1}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>{session.lesson?.title || session.title}</span>
              {unitInfo && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Book {unitInfo.bookNumber} • Unit {unitInfo.unitNumber}{unitInfo.unitTitle ? `: ${unitInfo.unitTitle}` : ''}
                </span>
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300">
                {session.classroom?.name || 'Mầm non'}
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/30 flex items-center gap-1 shadow-xs">
                👩‍🏫 Cô: {(typeof session.teacher === 'object' && (session.teacher as any)?.name) || (session.classroom as any)?.teacher?.name || user?.name || 'Giáo viên'}
              </span>
            </h1>
          </div>
        </div>

        {/* View Mode Switcher Tabs (Desktop / Laptop) */}
        <div className="hidden lg:flex items-center bg-slate-800/90 p-1.5 rounded-2xl border border-white/15 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('warmup')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'warmup'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md scale-105 ring-2 ring-orange-300'
                : 'text-amber-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame size={16} className="text-amber-300 fill-amber-300" />
            <span>0. Ôn Cũ Học Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'presentation'
                ? 'bg-amber-400 text-amber-950 shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={16} />
            <span>1. Giảng Từ Vựng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sentences')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'sentences'
                ? 'bg-teal-400 text-teal-950 shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={16} />
            <span>2. Dạy Mẫu Câu ({patterns.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'games'
                ? 'bg-purple-500 text-white shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={16} />
            <span>3. Trò Chơi Lớp Học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'grid'
                ? 'bg-sky-500 text-white shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users size={16} />
            <span>4. Lưới Quản Lý ({scores.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-sm">
          {/* Elapsed time */}
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 sm:px-3 py-1 font-bold text-xs">
            <Clock size={14} className="text-amber-300" />
            <span className="hidden xs:inline">{elapsed > 0 ? `${elapsed} phút` : 'Vừa bắt đầu'}</span>
            <span className="xs:hidden">{elapsed}m</span>
          </span>

          {/* Total correct answers */}
          <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-emerald-300 font-bold text-xs border border-emerald-500/30">
            <CheckCircle2 size={14} className="text-emerald-400" />
            {correct} đúng
          </span>

          {/* Total stars */}
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 sm:px-3.5 py-1 text-amber-300 font-black text-xs border border-amber-500/30">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            {totalStars} sao
          </span>

          <button
            onClick={handleEnd}
            disabled={ending}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-black text-white shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <StopCircle size={15} />
            <span className="hidden xs:inline">{ending ? 'Đang kết thúc…' : 'Kết thúc'}</span>
            <span className="xs:hidden">Dừng</span>
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Tab switcher bar */}
      <div className="flex lg:hidden items-center justify-start gap-1.5 bg-slate-900 border-b border-white/10 p-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('warmup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'warmup' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-amber-300 hover:bg-white/10'
          }`}
        >
          <Flame size={14} className="fill-amber-300" /> Ôn Cũ
        </button>
        <button
          onClick={() => setActiveTab('presentation')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'presentation' ? 'bg-amber-400 text-amber-950' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <BookOpen size={14} /> Từ Vựng
        </button>
        <button
          onClick={() => setActiveTab('sentences')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'sentences' ? 'bg-teal-400 text-teal-950' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <MessageSquare size={14} /> Mẫu Câu ({patterns.length})
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'games' ? 'bg-purple-500 text-white' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <Gamepad2 size={14} /> Trò Chơi
        </button>
        <button
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'grid' ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-white/10'
          }`}
        >
          <Users size={14} /> Lớp ({scores.length})
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
      <div className="flex-1 flex flex-col p-3 sm:p-6 overflow-x-hidden">

        {/* ========================================================================= */}
        {/* TAB 0: WARM-UP & REVIEW PREVIOUS LESSONS (ÔN CŨ HỌC MỚI) (GV-03)        */}
        {/* ========================================================================= */}
        {/* TAB 0: WARM-UP & PREVIOUS LESSON REVIEW (ÔN CŨ HỌC MỚI: TỪ VỰNG & MẪU CÂU) */}
        {/* ========================================================================= */}
        {activeTab === 'warmup' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[2200px] 2xl:max-w-none mx-auto">
            {/* Left 8 Cols: Giant Warm-up Review Flashcard & Projection */}
            <div className="lg:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-orange-950/20 to-slate-900 rounded-4xl border-3 border-orange-400/50 p-5 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Header badge & controls */}
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-4 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5 shadow-md">
                      <Flame size={16} className="fill-white" />
                      Ôn Cũ Học Mới: Bài học ngay trước đó
                    </span>
                    {warmupSection === 'vocab' ? (
                      <span className="text-xs text-amber-300 font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                        Từ {currentWarmupIndex + 1} / {warmupVocabList.length || 1}
                      </span>
                    ) : (
                      <span className="text-xs text-teal-300 font-bold bg-white/10 px-2.5 py-1 rounded-lg">
                        Mẫu câu {currentWarmupPatternIndex + 1} / {warmupPatterns.length || 1}
                      </span>
                    )}
                  </div>
                  {previousLesson && (
                    <p className="text-xs sm:text-sm font-bold text-amber-300/90 mt-1 flex items-center gap-1.5">
                      <span>📖 Đang ôn bài trước:</span>
                      <span className="text-white font-black underline">{previousLesson.title}</span>
                      {previousLesson.vietnameseTitle && <span className="text-slate-300">({previousLesson.vietnameseTitle})</span>}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Switcher Vocab vs Patterns */}
                  <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-white/15 shadow-inner">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setWarmupSection('vocab');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        warmupSection === 'vocab'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🔤 Từ vựng ({warmupVocabList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setWarmupSection('patterns');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        warmupSection === 'patterns'
                          ? 'bg-teal-500 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💬 Mẫu câu ({warmupPatterns.length})
                    </button>
                  </div>

                  {/* Navigation arrows */}
                  {warmupSection === 'vocab' ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupRevealed(false);
                          setCurrentWarmupIndex((i) => (i > 0 ? i - 1 : warmupVocabList.length - 1));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Từ ôn trước"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupRevealed(false);
                          setCurrentWarmupIndex((i) => (i < warmupVocabList.length - 1 ? i + 1 : 0));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Từ ôn tiếp theo"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupPatternRevealed(false);
                          setCurrentWarmupPatternIndex((i) => (i > 0 ? i - 1 : warmupPatterns.length - 1));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Mẫu câu trước"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupPatternRevealed(false);
                          setCurrentWarmupPatternIndex((i) => (i < warmupPatterns.length - 1 ? i + 1 : 0));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Mẫu câu tiếp theo"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Flashcard for Warm-up: Vocabulary vs Sentence Pattern */}
              {warmupSection === 'vocab' && currentWarmupVocab && (
                <div className="flex flex-col items-center text-center my-auto w-full">
                  {/* Card Image */}
                  <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-4xl bg-white p-4 shadow-2xl border-4 border-orange-400 mb-5 flex items-center justify-center relative group">
                    <img
                      src={currentWarmupVocab.imageUrl}
                      alt={currentWarmupVocab.english}
                      className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => {
                        sfx.playPop();
                        playWordAudio(currentWarmupVocab.english, currentWarmupVocab.audioUrl);
                      }}
                      className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer ring-6 ring-orange-300/40"
                      title="Phát âm từ này"
                    >
                      <Volume2 size={26} />
                    </button>
                  </div>

                  {/* Word title */}
                  <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-orange-400 font-display tracking-wide uppercase drop-shadow-md mb-2">
                    {currentWarmupVocab.english}
                  </h2>

                  {/* Vietnamese / Hint Reveal Toggle */}
                  <div className="flex items-center justify-center gap-3 mb-5">
                    {isWarmupRevealed ? (
                      <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-2xl text-lg font-bold text-white border border-white/20 animate-fade-in">
                        <span>{currentWarmupVocab.vietnamese}</span>
                        {currentWarmupVocab.pronunciation && (
                          <span className="text-orange-300 font-mono text-sm">
                            {currentWarmupVocab.pronunciation}
                          </span>
                        )}
                        <button
                          onClick={() => setIsWarmupRevealed(false)}
                          className="ml-2 text-xs text-slate-400 hover:text-white"
                        >
                          <EyeOff size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupRevealed(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-2xl bg-orange-500/20 text-orange-300 border border-orange-400/40 text-sm font-bold hover:bg-orange-500/30 cursor-pointer transition-all"
                      >
                        <Sparkles size={15} /> Đố bé nghĩa tiếng Việt là gì? (Bấm để xem)
                      </button>
                    )}
                  </div>

                  {/* Speech mic check for child standing up */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleStartMic(currentWarmupVocab.english)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isListeningMic
                          ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/50'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                      }`}
                    >
                      <Mic size={18} />
                      <span>{isListeningMic ? 'Đang lắng nghe bé nói…' : 'Mời bé đọc vào Mic 🎤'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Main Flashcard for Warm-up: Sentence Patterns */}
              {warmupSection === 'patterns' && currentWarmupPattern && (
                <div className="flex flex-col items-center text-center my-auto w-full">
                  {/* Pattern Illustration Frame */}
                  <div className="w-44 h-44 sm:w-56 sm:h-56 rounded-4xl bg-white/10 p-4 shadow-2xl border-4 border-amber-400/60 mb-5 flex items-center justify-center relative">
                    <span className="text-7xl sm:text-8xl filter drop-shadow">
                      {getSentenceIllustration(currentWarmupPattern.english)}
                    </span>
                    <button
                      onClick={() => {
                        sfx.playPop();
                        playWordAudio(currentWarmupPattern.english, currentWarmupPattern.audioUrl || undefined);
                      }}
                      className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 hover:from-amber-400 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer ring-4 ring-amber-300/40"
                      title="Nghe phát âm mẫu câu này"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>

                  {/* Sentence English Text */}
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-amber-300 font-display tracking-wide uppercase drop-shadow-md mb-2 max-w-2xl">
                    &ldquo;{currentWarmupPattern.english}&rdquo;
                  </h2>

                  {/* Pronunciation & Vietnamese Meaning */}
                  <div className="flex flex-col items-center justify-center gap-2 mb-5">
                    {currentWarmupPattern.pronunciation && (
                      <span className="text-xs sm:text-sm text-slate-300 font-mono bg-white/10 px-3 py-1 rounded-full">
                        {currentWarmupPattern.pronunciation}
                      </span>
                    )}

                    {isWarmupPatternRevealed ? (
                      <div className="flex items-center gap-2 bg-white/15 px-4 py-2 rounded-2xl text-base sm:text-lg font-bold text-white border border-white/20 animate-fade-in">
                        <span>{currentWarmupPattern.vietnamese}</span>
                        <button
                          onClick={() => setIsWarmupPatternRevealed(false)}
                          className="ml-2 text-xs text-slate-400 hover:text-white"
                        >
                          <EyeOff size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupPatternRevealed(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs sm:text-sm font-bold hover:bg-amber-500/30 cursor-pointer transition-all"
                      >
                        <Sparkles size={14} /> Đố bé mẫu câu này nghĩa là gì? (Bấm để xem)
                      </button>
                    )}
                  </div>

                  {/* Practice speaking Sentence with Mic */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => handleStartMic(currentWarmupPattern.english)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all cursor-pointer shadow-lg active:scale-95 ${
                        isListeningMic
                          ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/50'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-emerald-950'
                      }`}
                    >
                      <Mic size={18} />
                      <span>{isListeningMic ? 'Đang lắng nghe bé nói câu này…' : 'Mời bé đọc mẫu câu vào Mic 🎤'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Big CTA: Complete Warm-up and Transition to Lesson */}
              <div className="w-full mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-orange-200/80 font-medium">
                  💡 Gợi ý: Cho cả lớp đồng thanh ôn lại 2-3 lần, gọi 2 bé đọc mẫu câu rồi bắt đầu bài mới!
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playStarFanfare();
                    setActiveTab('presentation');
                    showToast('🚀 Ôn bài cũ hoàn tất! Bắt đầu Giảng dạy bài mới!');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm sm:text-base px-6 py-3 rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer"
                >
                  <span>Hoàn thành Ôn Bài Cũ ➔ Giảng Bài Mới</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Warm-up Rewards, Spotlight Student, Vocab/Pattern Quick Jump */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Quick Whole-Class & Random Call Actions */}
              <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-5 shadow-xl">
                <h3 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Flame size={15} /> Thưởng sao ôn bài cũ
                </h3>

                <div className="space-y-2.5">
                  <button
                    onClick={() => handleAwardWholeClass(1, 5)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-sm py-3 px-4 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <Star size={18} className="fill-white" />
                    <span>Thưởng Sao Cả Lớp (+1 ⭐ / bé)</span>
                  </button>

                  <button
                    onClick={pickRandomStudent}
                    disabled={isPickingRandom}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-sm py-2.5 px-4 rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Shuffle size={16} />
                    <span>{isPickingRandom ? 'Đang quay chọn…' : '🎲 Gọi 1 bé ngẫu nhiên lên ôn bài'}</span>
                  </button>
                </div>
              </div>

              {/* Spotlight student display if picked */}
              {spotlightStudent && (
                <div className="bg-gradient-to-br from-purple-950/70 to-slate-900 rounded-3xl border-2 border-purple-400 p-4 shadow-xl animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold text-purple-300 uppercase">Bé được gọi</span>
                    <button
                      onClick={() => setSpotlightStudent(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 font-black text-lg flex items-center justify-center">
                      {(spotlightStudent.student as User)?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-base">
                        {(spotlightStudent.student as User)?.name || 'Học sinh'}
                      </p>
                      <p className="text-xs text-amber-300 font-bold">
                        ⭐ {spotlightStudent.stars} sao · {spotlightStudent.points}đ
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const sid = typeof spotlightStudent.student === 'string' ? spotlightStudent.student : (spotlightStudent.student as User)._id;
                        if (sid) {
                          applyScore(sid, { stars: 1, points: 5, correctDelta: 1 });
                          showToast(`⭐ Đã thưởng sao cho ${(spotlightStudent.student as User)?.name}!`);
                        }
                      }}
                      className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-md active:scale-90 transition-all cursor-pointer"
                    >
                      <Star size={14} className="fill-amber-950" /> +1 Sao
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Jump List: Vocab or Patterns of preceding lesson */}
              <div className="bg-slate-900/90 rounded-3xl border border-white/10 p-4 shadow-xl flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {warmupSection === 'vocab'
                      ? `Từ vựng bài trước (${warmupVocabList.length})`
                      : `Mẫu câu bài trước (${warmupPatterns.length})`}
                  </h4>
                  <span className="text-[10px] text-amber-300 font-bold truncate max-w-[120px]">
                    {previousLesson?.title || 'Bài trước'}
                  </span>
                </div>

                {warmupSection === 'vocab' ? (
                  <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-64 pr-1">
                    {warmupVocabList.map((item, idx) => {
                      const isCur = idx === currentWarmupIndex;
                      return (
                        <button
                          key={item._id || idx}
                          onClick={() => {
                            sfx.playPop();
                            setCurrentWarmupIndex(idx);
                            setIsWarmupRevealed(false);
                          }}
                          className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all ${
                            isCur
                              ? 'bg-orange-500 text-white font-bold shadow-md ring-2 ring-orange-300'
                              : 'bg-white/5 hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <span className="text-base">{item.imageUrl?.includes('data:') ? '📖' : '🔤'}</span>
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">{item.english}</p>
                            <p className="text-[10px] opacity-75 truncate">{item.vietnamese}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                    {warmupPatterns.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-400 italic">
                        Bài trước chưa tạo mẫu câu riêng
                      </p>
                    ) : (
                      warmupPatterns.map((pat, idx) => {
                        const isCur = idx === currentWarmupPatternIndex;
                        return (
                          <button
                            key={pat._id || idx}
                            onClick={() => {
                              sfx.playPop();
                              setCurrentWarmupPatternIndex(idx);
                              setIsWarmupPatternRevealed(false);
                            }}
                            className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all ${
                              isCur
                                ? 'bg-teal-600 text-white font-bold shadow-md ring-2 ring-teal-300'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <span className="text-lg shrink-0">{getSentenceIllustration(pat.english)}</span>
                            <div className="truncate min-w-0 flex-1">
                              <p className="text-xs font-bold truncate">{pat.english}</p>
                              <p className="text-[10px] opacity-75 truncate">{pat.vietnamese}</p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: PRESENTATION & VOCABULARY TEACHING (Màn hình Giảng dạy Từ vựng)   */}
        {/* ========================================================================= */}
        {activeTab === 'presentation' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[2200px] 2xl:max-w-none mx-auto">
            {/* Left Col (8 cols): Giant Presentation Flashcard for classroom display */}
            <div className="lg:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 to-slate-800 rounded-4xl border-3 border-amber-400/40 p-5 sm:p-8 shadow-2xl relative overflow-hidden">
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
                <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-4xl bg-white p-4 shadow-2xl border-4 border-amber-300 mb-6 flex items-center justify-center relative group">
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
                    className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-white flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer ring-6 ring-amber-300/50"
                    title="Cô bấm để phát âm chuẩn"
                  >
                    <Volume2 size={26} />
                  </button>
                </div>

                {/* English Word */}
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-amber-400 font-display tracking-wide uppercase drop-shadow-md mb-2">
                  {currentVocab.english}
                </h2>

                {/* Vietnamese Meaning & Pronunciation hint */}
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-slate-300 text-base sm:text-2xl font-bold mb-6">
                  <span className="text-white bg-white/10 px-4 py-1 rounded-2xl">
                    {currentVocab.vietnamese}
                  </span>
                  {currentVocab.pronunciation && (
                    <span className="text-amber-300/80 font-mono text-xs sm:text-base">
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
                    className="flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 px-4 sm:px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
                  >
                    <Volume2 size={18} />
                    <span>Cả lớp đồng thanh đọc</span>
                  </button>

                  <button
                    onClick={pickRandomStudent}
                    className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black px-5 sm:px-6 py-2.5 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer text-xs sm:text-sm"
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

            {/* Right Col: Quick Grading on the Spot */}
            <div className="lg:col-span-4 flex flex-col bg-slate-900/80 rounded-4xl border border-white/15 p-4 sm:p-5 shadow-xl">
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
                        <div className="relative w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-white/20 group cursor-pointer">
                          {student?.avatarUrl ? (
                            <img src={student.avatarUrl} alt={sName} className="w-full h-full object-cover" />
                          ) : (
                            initials(sName)
                          )}
                          <div
                            className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-xs font-bold"
                            title="Ý kiến phụ huynh: Bé chăm ngoan!"
                          >
                            💬
                          </div>
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
        {/* TAB 2: SENTENCES & DIALOGUE TEACHING (Màn hình Giảng dạy Mẫu câu của bài) */}
        {/* ========================================================================= */}
        {activeTab === 'sentences' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[2200px] 2xl:max-w-none mx-auto">
            {/* Left Col (8 cols): Giant Presentation for Sentence Patterns */}
            <div className="lg:col-span-8 flex flex-col items-center justify-between bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 rounded-4xl border-3 border-teal-400/40 p-5 sm:p-8 shadow-2xl relative overflow-hidden">
              {/* Top bar in sentence presentation */}
              <div className="w-full flex items-center justify-between mb-4">
                <span className="bg-teal-400/20 border border-teal-400/40 text-teal-300 font-black px-4 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Mẫu câu bài học {patterns.length > 0 ? `${currentPatternIndex + 1} / ${patterns.length}` : '—'}
                </span>

                <div className="flex items-center gap-2">
                  {currentLessonId && (
                    <a
                      href={`/teacher/sentences?lessonId=${currentLessonId}&mode=classroom`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/30 text-xs font-bold transition-all cursor-pointer"
                      title="Mở màn hình học mẫu câu độc lập ở tab mới"
                    >
                      <ExternalLink size={13} />
                      <span className="hidden sm:inline">Học mẫu câu ↗</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      sfx.playPop();
                      setIsAnswerRevealed(false);
                      setSpeechResult(null);
                      setCurrentPatternIndex(i => (i > 0 ? i - 1 : patterns.length - 1));
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                    title="Mẫu câu trước"
                    disabled={patterns.length <= 1}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setIsAnswerRevealed(false);
                      setSpeechResult(null);
                      setCurrentPatternIndex(i => (i < patterns.length - 1 ? i + 1 : 0));
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                    title="Mẫu câu tiếp theo"
                    disabled={patterns.length <= 1}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              {/* Main Sentence Content */}
              {loadingPatterns ? (
                <div className="my-auto py-16 text-center text-slate-400">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
                  <p className="font-bold">Đang tải mẫu câu tương ứng của bài học...</p>
                </div>
              ) : patterns.length > 0 && patterns[currentPatternIndex] ? (
                (() => {
                  const currentPattern = patterns[currentPatternIndex];
                  const primaryAnswer = currentPattern.answers?.[0];

                  return (
                    <div className="flex flex-col items-center text-center my-auto w-full max-w-2xl">
                      {/* Question or Lead Sentence Card */}
                      <div className="relative w-full rounded-3xl bg-white/10 border-2 border-teal-300/40 p-5 sm:p-7 shadow-xl backdrop-blur-xs mb-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 bg-teal-950/60 px-3 py-1 rounded-full border border-teal-400/30">
                            {currentPattern.contentType === 'QUESTION' ? '❓ Câu hỏi tương tác' : '💬 Mẫu câu đàm thoại'}
                          </span>

                          {/* Speaker Audio Button */}
                          <button
                            onClick={() => {
                              sfx.playPop();
                              playWordAudio(currentPattern.english, currentPattern.audioUrl || undefined);
                            }}
                            className="w-12 h-12 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer ring-4 ring-teal-400/30"
                            title="Cô bấm để phát âm câu hỏi"
                          >
                            <Volume2 size={24} />
                          </button>
                        </div>

                        {/* Question Visual Illustration Frame */}
                        <div className="relative mx-auto mb-4 w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-4xl bg-white p-3 shadow-2xl border-4 border-teal-300 flex items-center justify-center group">
                          <img
                            src={getSentenceIllustration(currentPattern.english, currentPattern.imageUrl, false)}
                            alt={currentPattern.english}
                            className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform"
                          />
                        </div>

                        {/* Big Question Text */}
                        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-display tracking-wide drop-shadow-md mb-3 leading-tight">
                          {currentPattern.english}
                        </h2>

                        {/* Vietnamese Meaning & Pronunciation */}
                        <div className="flex flex-wrap items-center justify-center gap-2 text-slate-300 text-sm sm:text-base font-bold">
                          {currentPattern.vietnamese && (
                            <span className="text-teal-200 bg-teal-900/50 px-3.5 py-1 rounded-xl border border-teal-500/30">
                              {currentPattern.vietnamese}
                            </span>
                          )}
                          {currentPattern.pronunciation && (
                            <span className="text-amber-300 font-mono text-xs sm:text-sm">
                              /{currentPattern.pronunciation}/
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Interactive Answer Section (Reveal / Hide) */}
                      <div className="w-full mb-6">
                        {!isAnswerRevealed ? (
                          <button
                            onClick={() => {
                              sfx.playCorrect();
                              setIsAnswerRevealed(true);
                            }}
                            className="w-full py-4 sm:py-5 px-6 rounded-3xl border-2 border-dashed border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-black text-base sm:text-xl flex items-center justify-center gap-3 transition-all cursor-pointer group active:scale-98 shadow-md"
                          >
                            <HelpCircle size={24} className="group-hover:rotate-12 transition-transform text-amber-400" />
                            <span>Bấm để lật mở câu trả lời cho bé ✨</span>
                          </button>
                        ) : (
                          <div className="w-full rounded-3xl bg-gradient-to-r from-emerald-950/70 via-teal-900/60 to-emerald-950/70 border-2 border-emerald-400 p-5 sm:p-6 shadow-xl relative animate-pop-in">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-400/30">
                                ✨ Câu trả lời của bé
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setIsAnswerRevealed(false)}
                                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                                  title="Che lại đáp án để đố tiếp"
                                >
                                  <EyeOff size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    const ansText = primaryAnswer?.english || currentPattern.english;
                                    const ansAudio = primaryAnswer?.audioUrl;
                                    sfx.playPop();
                                    playWordAudio(ansText, ansAudio || undefined);
                                  }}
                                  className="w-10 h-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
                                  title="Phát âm câu trả lời"
                                >
                                  <Volume2 size={20} />
                                </button>
                              </div>
                            </div>

                            {/* Answer options with intuitive illustrations */}
                            <div className="space-y-3 py-1">
                              {(currentPattern.answers && currentPattern.answers.length > 0
                                ? currentPattern.answers
                                : [{ english: currentPattern.english, vietnamese: currentPattern.vietnamese, imageUrl: currentPattern.imageUrl }]
                              ).map((ans, aIdx) => (
                                <div
                                  key={ans._id || aIdx}
                                  className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white/5 rounded-2xl p-3 border border-emerald-400/30"
                                >
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1.5 shadow-md border-2 border-emerald-300 shrink-0 flex items-center justify-center">
                                    <img
                                      src={getSentenceIllustration(ans.english, ans.imageUrl, true)}
                                      alt={ans.english}
                                      className="w-full h-full object-contain"
                                    />
                                  </div>
                                  <div className="text-center sm:text-left min-w-0">
                                    <p className="text-2xl sm:text-3xl md:text-4xl font-black text-amber-300 font-display drop-shadow-sm leading-tight">
                                      {ans.english}
                                    </p>
                                    {ans.vietnamese && (
                                      <p className="text-emerald-200 text-sm sm:text-base font-bold mt-1">
                                        {ans.vietnamese}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Speech & Classroom Actions */}
                      <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                        {/* Live Mic Button */}
                        <button
                          onClick={() => {
                            const targetText = primaryAnswer?.english || currentPattern.english;
                            handleStartMic(targetText);
                          }}
                          className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all cursor-pointer ${
                            isListeningMic
                              ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-400/50'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white'
                          }`}
                        >
                          <Mic size={18} className={isListeningMic ? 'animate-bounce' : ''} />
                          <span>{isListeningMic ? 'Đang nghe bé nói...' : 'Mời bé đọc vào Mic 🎙️'}</span>
                        </button>

                        {/* Whole class dialogue */}
                        <button
                          onClick={() => {
                            const aText = primaryAnswer?.english;
                            void playDialogue(currentPattern.english, aText);
                          }}
                          className="flex items-center gap-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-black text-xs sm:text-sm cursor-pointer active:scale-95 transition-all"
                        >
                          <Volume2 size={18} />
                          <span>Cả lớp đồng thanh đọc 🗣️</span>
                        </button>

                        {/* Random student picker */}
                        <button
                          onClick={pickRandomStudent}
                          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-amber-950 font-black px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg active:scale-95 transition-all cursor-pointer text-xs sm:text-sm"
                        >
                          <span>Mời 1 bé trả lời 🎲</span>
                        </button>
                      </div>

                      {/* Speech Result Display */}
                      {speechResult && (
                        <div className={`mt-4 p-3 rounded-2xl border text-xs sm:text-sm font-black flex items-center justify-between gap-3 w-full animate-pop-in ${
                          speechResult.isMatch
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                        }`}>
                          <span>
                            {speechResult.isMatch ? '🎉 Phát âm chuẩn!' : '👉 Bé nói:'}{' '}
                            "{speechResult.spokenText || '...'}" ({Math.round(speechResult.confidence * 100)}%)
                          </span>
                          <button
                            onClick={() => {
                              if (spotlightStudent) {
                                const sid = typeof spotlightStudent.student === 'string' ? spotlightStudent.student : (spotlightStudent.student as User)._id;
                                if (sid) {
                                  void applyScore(sid, { stars: 1, points: 5 });
                                  showToast(`⭐ Đã thưởng sao cho bé đọc xuất sắc!`);
                                }
                              } else {
                                handleAwardWholeClass(1, 5);
                              }
                            }}
                            className="px-3 py-1 rounded-xl bg-amber-400 text-amber-950 text-xs font-black shadow-xs hover:scale-105 active:scale-95 cursor-pointer"
                          >
                            Thưởng bé +1 ⭐
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="my-auto py-16 text-center text-slate-400 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4 text-3xl">
                    💬
                  </div>
                  <p className="text-xl font-bold text-white mb-2">Chưa có mẫu câu riêng cho bài này</p>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    Cô giáo có thể chuyển sang trang Quản lý Mẫu câu để chọn mẫu câu từ ngân hàng 27 Unit mẫu!
                  </p>
                  <button
                    onClick={() => navigate('/teacher/sentences')}
                    className="px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    Xem ngân hàng mẫu câu 🚀
                  </button>
                </div>
              )}

              {/* Pattern Carousel Strip at bottom */}
              <div className="w-full flex items-center gap-2 overflow-x-auto pt-4 border-t border-white/10 scrollbar-none">
                {patterns.map((p, idx) => (
                  <button
                    key={p._id || idx}
                    onClick={() => {
                      sfx.playPop();
                      setIsAnswerRevealed(false);
                      setSpeechResult(null);
                      setCurrentPatternIndex(idx);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
                      currentPatternIndex === idx
                        ? 'border-teal-400 bg-teal-400/20 text-teal-300 ring-2 ring-teal-400/40'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md overflow-hidden bg-white/20 inline-flex items-center justify-center shrink-0">
                      <img
                        src={getSentenceIllustration(p.english, p.imageUrl, false)}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </span>
                    <span>Câu {idx + 1}:</span>
                    <span className="truncate max-w-[130px]">{p.english}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Col: Quick Grading Panel */}
            <div className="lg:col-span-4 flex flex-col bg-slate-900/80 rounded-4xl border border-white/15 p-4 sm:p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-teal-400" />
                  <h3 className="font-black text-base text-white">Chấm Điểm Mẫu Câu</h3>
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
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-teal-500/20 border border-teal-400/40 text-teal-300 hover:bg-teal-500/30 text-xs font-black cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  <ThumbsUp size={14} />
                  <span>Khen nói hay +5đ</span>
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
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-teal-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 border border-white/20">
                          {student?.avatarUrl ? (
                            <img src={student.avatarUrl} alt={sName} className="w-full h-full object-cover" />
                          ) : (
                            initials(sName)
                          )}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{sName}</p>
                          <p className="text-[11px] text-teal-300 flex items-center gap-1 font-semibold">
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
                          className="px-2 py-1 rounded-lg bg-teal-400 hover:bg-teal-300 text-teal-950 font-black text-xs cursor-pointer active:scale-95 shadow-xs"
                          title="Thưởng 1 sao"
                        >
                          +1 ⭐
                        </button>
                        <button
                          onClick={() => setSpotlightStudent(sc)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95"
                          title="Mời bé đọc mẫu câu"
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
          <div className="flex-1 flex flex-col w-full max-w-[2000px] 2xl:max-w-none mx-auto bg-slate-900/90 rounded-4xl border-3 border-purple-500/40 p-6 sm:p-8 shadow-2xl">
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
          <div className="flex-1 flex flex-col w-full max-w-[2200px] 2xl:max-w-none mx-auto">
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
      <div className="w-full max-w-md rounded-4xl bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-4 border-amber-400 p-6 sm:p-8 shadow-[0_0_50px_rgba(251,191,36,0.5)] text-center relative overflow-hidden animate-pop-in">
        {/* Glow effects */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-yellow-400/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Highlighted Gold Callout Badge */}
        <div className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-amber-950 px-6 py-2 font-black text-sm uppercase tracking-wider mb-5 shadow-xl border-2 border-white animate-bounce">
          <Mic size={18} className="animate-pulse text-amber-950" />
          <span>📢 GIÁO VIÊN MỜI BÉ ĐỌC TO! 🌟</span>
        </div>

        {/* Animated Avatar Box with Golden Ring */}
        <div className="relative mx-auto mb-4 h-32 w-32 rounded-3xl ring-8 ring-amber-400/90 shadow-2xl overflow-hidden flex items-center justify-center bg-slate-800 border-4 border-white animate-pulse">
          {student?.avatarUrl ? (
            <img src={student.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl font-black text-amber-300">{initials(name)}</span>
          )}
        </div>

        {/* Student name */}
        <h3 className="text-4xl font-black text-amber-300 tracking-wide font-display drop-shadow-md">{name}</h3>

        {vocabPrompt && (
          <div className="my-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-2 border-amber-400/60 px-6 py-3 rounded-2xl inline-block shadow-inner">
            <span className="text-xs text-amber-200 font-extrabold uppercase tracking-wider block mb-1">
              Bé hãy đọc thật to từ này nhé 🎤:
            </span>
            <span className="text-3xl font-black text-amber-300 uppercase font-display tracking-widest drop-shadow-lg">
              "{vocabPrompt}"
            </span>
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
