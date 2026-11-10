import { SessionClosureForm, type Coverage } from '../../components/teacher/SessionClosureForm';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Star,
  ChevronLeft,
  ChevronRight,
  StopCircle,
  Clock,
  Mic,
  Sparkles,
  Shuffle,
  Volume2,
  BookOpen,
  Gamepad2,
  Award,
  CheckSquare,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  EyeOff,
  ExternalLink,
  Flame,
  Play,
  RotateCcw,
  Gift,
  LogOut,
  UserCheck,
  Search,
  X
} from 'lucide-react';
import { classroomSessionApi, sentenceApi, teacherApi } from '../../services/api';
import { StudentAvatar } from '../../components/common/StudentAvatar';
import type { ClassroomSession, StudentSessionScore, User, LessonPlan } from '../../types';
import { playAnimalSound, stopAnimalSound } from '../../utils/animalAudio';
import { sfx, playWordAudio, stopWordAudio, playDialogueAudio } from '../../utils/audio';
import { ClassroomActivities } from '../../components/teacher/ClassroomActivities';
import { KokoSpeakingCoach } from '../../components/child/KokoSpeakingCoach';
import { KokoMascot } from '../../components/child/KokoMascot';
import type { SentencePattern } from './SentenceTeachingPage';
import { getSentenceIllustration } from '../../utils/sentenceIllustrations';
import { getPreschoolTprGesture } from '../../utils/tprGestures';
import { compareLessons } from '../../utils/curriculumLessons';

const elapsedMin = (startedAt?: string) => {
  if (!startedAt) return 0;
  return Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
};

type AnswerMap = Record<string, 'CORRECT' | 'INCORRECT' | 'NOT_ANSWERED'>;
type ViewTab = 'warmup' | 'presentation' | 'sentences' | 'games' | 'wrapup';


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

const ANIMAL_ROSTER = [
  { id: 'dog', name: 'Dog', vi: 'Con Chó', soundText: 'Woof woof! 🐶 Bark bark!', emoji: '🐶', callText: 'Gâu gâu! (Woof woof!)' },
  { id: 'cat', name: 'Cat', vi: 'Con Mèo', soundText: 'Meow meow! 🐱 Purr purr!', emoji: '🐱', callText: 'Meo meo! (Meow meow!)' },
  { id: 'cow', name: 'Cow', vi: 'Con Bò', soundText: 'Moo moo! 🐮 Moo moo!', emoji: '🐮', callText: 'Ùm bò bò! (Moo moo!)' },
  { id: 'duck', name: 'Duck', vi: 'Con Vịt', soundText: 'Quack quack! 🦆 Quack quack!', emoji: '🦆', callText: 'Cạp cạp! (Quack quack!)' },
  { id: 'monkey', name: 'Monkey', vi: 'Con Khỉ', soundText: 'Ooh ooh aah aah! 🐒 Monkey!', emoji: '🐒', callText: 'Khẹc khẹc! (Ooh ooh aah aah!)' },
  { id: 'bird', name: 'Bird', vi: 'Con Chim', soundText: 'Tweet tweet! 🐦 Tweet tweet!', emoji: '🐦', callText: 'Líu lo! (Tweet tweet!)' },
  { id: 'lion', name: 'Lion', vi: 'Sư Tử', soundText: 'Roar roar! 🦁 Roar roar!', emoji: '🦁', callText: 'Gầm gừ! (Roar!)' },
  { id: 'sheep', name: 'Sheep', vi: 'Con Cừu', soundText: 'Baa baa! 🐑 Baa baa!', emoji: '🐑', callText: 'Bê bê! (Baa baa!)' }
];

export const LiveSessionPage: React.FC = () => {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<ClassroomSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const scoringRef = useRef(false);
  const [ending, setEnding] = useState(false);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [scoringStudent, setScoringStudent] = useState<StudentSessionScore | null>(null);
  const [spotlightStudent, setSpotlightStudent] = useState<StudentSessionScore | null>(null);
  const [spotlightPromptOverride, setSpotlightPromptOverride] = useState<string | null>(null);
  const [isPickingRandom, setIsPickingRandom] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSetInitialTabRef = useRef(false);

  // Joyous visual celebration state for scoring individual & whole-class
  const [celebrationEffect, setCelebrationEffect] = useState<{
    show: boolean;
    type: 'stars' | 'correct' | 'all';
    message: string;
    studentName?: string;
    count?: number;
  } | null>(null);

  // Planned duration is a reminder; the teacher decides when to close the lesson.
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [overtimeSnoozeUntil, setOvertimeSnoozeUntil] = useState<number>(0);

  // Exit / End Session Modal state
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [coverage, setCoverage] = useState<Coverage>('CONTINUE');

  // Classroom teaching views
  const [activeTab, setActiveTab] = useState<ViewTab>('presentation');
  const [isPlayingGoodbye, setIsPlayingGoodbye] = useState(false);
  useEffect(() => {
    setSpotlightPromptOverride(null);
    return () => {
      stopAnimalSound();
      stopWordAudio();
      setIsPlayingGoodbye(false);
    };
  }, [activeTab]);
  const [currentVocabIndex, setCurrentVocabIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  // Warm-up Phase state (Ôn tập từ vựng, mẫu câu hoặc Nhảy Koko Freeze Dance)
  const [previousLesson, setPreviousLesson] = useState<any | null>(null);
  const warmupSessionRef = useRef<string | null>(null);
  const [warmupLoading, setWarmupLoading] = useState(true);
  const [warmupVocabList, setWarmupVocabList] = useState<any[]>([]);
  const [currentWarmupIndex, setCurrentWarmupIndex] = useState(0);
  const [isWarmupRevealed, setIsWarmupRevealed] = useState(false);
  const [warmupPatterns, setWarmupPatterns] = useState<SentencePattern[]>([]);
  const [currentWarmupPatternIndex, setCurrentWarmupPatternIndex] = useState(0);
  const [isWarmupPatternRevealed, setIsWarmupPatternRevealed] = useState(false);
  const [warmupSection, setWarmupSection] = useState<'vocab' | 'patterns' | 'freeze-dance'>('vocab');
  const [freezeState, setFreezeState] = useState<'idle' | 'dancing' | 'frozen'>('idle');
  const [freezeCountdown, setFreezeCountdown] = useState<number>(5);

  // Freeze Dance countdown timer
  useEffect(() => {
    if (freezeState !== 'dancing') return;
    const interval = setInterval(() => {
      setFreezeCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setFreezeState('frozen');
          sfx.playFreezeSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [freezeState]);

  const handleStartFreezeDance = () => {
    sfx.playDanceMelody();
    setFreezeCountdown(5);
    setFreezeState('dancing');
  };

  // Sentence Patterns teaching state
  const [patterns, setPatterns] = useState<SentencePattern[]>([]);
  const [currentPatternIndex, setCurrentPatternIndex] = useState(0);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Late Attendance Modal
  const [isLateAttendanceModalOpen, setIsLateAttendanceModalOpen] = useState(false);

  // Mini-game in classroom state (7 Trò chơi tương tác Koko)
  const [gamesCategory, setGamesCategory] = useState<'curriculum' | 'interactive'>('curriculum');
  const [classroomGameMode, setClassroomGameMode] = useState<
    'mystery-box' | 'listen-choose' | 'true-false' | 'bubble-pop' | 'missing-object' | 'lucky-wheel' | 'animal-sound'
  >('mystery-box');
  const [gameQuestionIdx, setGameQuestionIdx] = useState(0);
  const [isMysteryBoxOpen, setIsMysteryBoxOpen] = useState(false);
  const [isMysteryShaking, setIsMysteryShaking] = useState(false);
  const [isMysterySpinningStudent, setIsMysterySpinningStudent] = useState(false);
  const [mysteryVocabIndex, setMysteryVocabIndex] = useState(0);
  const [mysteryPickedStudent, setMysteryPickedStudent] = useState<StudentSessionScore | null>(null);

  // Game 2: Nghe & Chọn interactive states
  const [listenPickSelectedId, setListenPickSelectedId] = useState<string | null>(null);
  const [listenPickStatus, setListenPickStatus] = useState<'correct' | 'wrong' | null>(null);

  // Game 3: Đúng hay Sai interactive states
  const [tfMatchRatio, setTfMatchRatio] = useState<boolean>(true);
  const [tfSelectedResult, setTfSelectedResult] = useState<'correct' | 'wrong' | null>(null);

  // Game 4: Đập Bong Bóng interactive states
  const [poppedBubbleIds, setPoppedBubbleIds] = useState<string[]>([]);
  const [bubbleWinStatus, setBubbleWinStatus] = useState<boolean>(false);

  // Game 5: Đồ Vật Biến Mất (Kim's Game) interactive states
  const [kokoMissingStage, setKokoMissingStage] = useState<'MEMORIZE' | 'GUESS' | 'REVEALED'>('MEMORIZE');
  const [kokoMissingPickId, setKokoMissingPickId] = useState<string | null>(null);

  // Game 6: Vòng Quay Koko interactive states
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [wheelBonusStars, setWheelBonusStars] = useState<number>(2);
  const [wheelPickedStudent, setWheelPickedStudent] = useState<StudentSessionScore | null>(null);

  // Game 7: Tiếng kêu con vật interactive states
  const [animalGameIndex, setAnimalGameIndex] = useState(0);
  const [animalSelectedChoiceId, setAnimalSelectedChoiceId] = useState<string | null>(null);
  const [animalResultStatus, setAnimalResultStatus] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    setAnswers({});
    setPoppedBubbleIds([]);
    setBubbleWinStatus(false);
    setKokoMissingStage('MEMORIZE');
    setKokoMissingPickId(null);
    return () => stopAnimalSound();
  }, [classroomGameMode, gameQuestionIdx, mysteryVocabIndex, animalGameIndex]);

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

  const pickRandomStudent = () => {
    if (!session?.studentScores || session.studentScores.length === 0) return;
    setSpotlightPromptOverride(null);
    const eligibleStudents = session.studentScores.filter(
      (sc) => sc.attendance !== 'ABSENT' && sc.attendance !== 'EXCUSED'
    );
    const pool = eligibleStudents.length > 0 ? eligibleStudents : session.studentScores;
    sfx.playPop();
    setIsPickingRandom(true);
    let count = 0;
    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * pool.length);
      setSpotlightStudent(pool[randIdx]);
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
      setPageError('');
      if (s.status === 'COMPLETED') { navigate(`/teacher/classroom-sessions/${sessionId}/summary`, { replace: true }); return; }
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

      setLessonPlan(s.lessonPlan || null);

      if (warmupSessionRef.current !== s._id) {
        warmupSessionRef.current = s._id;
        setPreviousLesson(null);
        setWarmupLoading(true);
        setWarmupVocabList([]);
        setWarmupPatterns([]);
        setCurrentWarmupIndex(0);
        setCurrentWarmupPatternIndex(0);

        // Load the last completed lesson of this class, or the preceding curriculum lesson.
        try {
          const cId = typeof s.classroom === 'object' ? s.classroom?._id : s.classroom;
          let prevLessonDoc: any = null;

          // 1. Check previous sessions of this class to get the lesson taught in the preceding session
          if (cId) {
            try {
              const prevSessRes = await classroomSessionApi.getSessions({ classroomId: cId });
              const list = (prevSessRes.data || []) as any[];
              const priorSession = list
                .filter((ps: any) => ps._id !== s._id && ps.lesson && ps.status === 'COMPLETED'
                  && Number(ps.sessionNumber) < Number(s.sessionNumber)
                  && String(typeof ps.lesson === 'object' ? ps.lesson._id : ps.lesson) !== String(lessonId))
                .sort((a: any, b: any) => Number(b.sessionNumber) - Number(a.sessionNumber))[0];

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
          if (!prevLessonDoc && cId) {
            const cntRes = await teacherApi.getContent(`classroomId=${encodeURIComponent(cId || '')}`);
            if (cntRes.data?.lessons) {
              const allL = [...cntRes.data.lessons].sort((a: any, b: any) => compareLessons(a, b, cntRes.data.units));
              const curIdx = allL.findIndex((l: any) => String(l._id) === String(lessonId));
              if (curIdx > 0) {
                const detailRes = await teacherApi.getLesson(allL[curIdx - 1]._id);
                prevLessonDoc = detailRes.data || allL[curIdx - 1];
              }
            }
          }

          if (prevLessonDoc) {
            setPreviousLesson(prevLessonDoc);

            // Populate Vocabulary of the immediately preceding lesson
            if (prevLessonDoc.vocabularyItems?.length > 0) {
              setWarmupVocabList(
                prevLessonDoc.vocabularyItems.filter((v: any) => v.status !== 'INACTIVE').map((v: any) => ({
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
              if (patRes.success && Array.isArray(patRes.data)) {
                setWarmupPatterns(patRes.data);
              }
            } catch (e) {
              console.warn('Could not load warmup patterns:', e);
            }
          }
        } catch (err) {
          console.warn('Could not load warmup previous lesson data:', err);
          warmupSessionRef.current = null;
        } finally {
          setWarmupLoading(false);
        }
      }

      // Initialise answer map for this question
      const initialAnswers: AnswerMap = {};
      (s.studentScores || []).forEach((sc) => {
        const sid = typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || '';
        initialAnswers[sid] = 'NOT_ANSWERED';
      });
      setAnswers((prev) => ({ ...initialAnswers, ...prev }));
    } catch (e: any) {
      setPageError(e.message || 'Không thể tải buổi dạy.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, loadSentencePatterns, navigate]);

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

  // Check if session has exceeded planned duration
  useEffect(() => {
    if (!session || session.status === 'COMPLETED' || isOvertimeModalOpen || isExitModalOpen) return;
    const planned = session.plannedDuration || 35;
    if (elapsed >= planned && !showWarn) {
      setShowWarn(true);
    }
    // Offer a reminder after 15 extra minutes, without ending the session.
    if (elapsed >= planned + 15 && Date.now() > overtimeSnoozeUntil) {
      setIsOvertimeModalOpen(true);
    }
  }, [elapsed, session, showWarn, overtimeSnoozeUntil, isOvertimeModalOpen, isExitModalOpen]);

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
  const currentWarmupVocab = warmupVocabList[currentWarmupIndex] || warmupVocabList[0];
  const activeWarmupPatterns = warmupPatterns;
  const currentWarmupPattern = activeWarmupPatterns[currentWarmupPatternIndex] || activeWarmupPatterns[0];
  const currentLessonId = typeof session?.lesson === 'object' ? (session?.lesson as any)?._id : session?.lesson;

  // Current Vocabulary TPR Physical Mime Action from Lesson Plan or Rich Preschool TPR Map
  const currentTprGesture = useMemo(() => {
    if (!currentVocab) return '';
    const match = lessonPlan?.targetVocabulary?.find(
      (w) => w.english.toLowerCase() === currentVocab.english.toLowerCase()
    );
    return getPreschoolTprGesture(currentVocab.english, currentVocab.vietnamese, match?.tprGesture);
  }, [currentVocab, lessonPlan]);

  // Magic Mystery Box Vocabulary & TPR
  const currentMysteryVocab = activeVocabList[mysteryVocabIndex] || activeVocabList[0];
  const currentMysteryTpr = useMemo(() => {
    if (!currentMysteryVocab) return '';
    const match = lessonPlan?.targetVocabulary?.find(
      (w) => w.english.toLowerCase() === currentMysteryVocab.english.toLowerCase()
    );
    return getPreschoolTprGesture(currentMysteryVocab.english, currentMysteryVocab.vietnamese, match?.tprGesture);
  }, [currentMysteryVocab, lessonPlan]);

  const handleOpenMysteryBox = () => {
    if (isMysteryBoxOpen) {
      setIsMysteryBoxOpen(false);
      setMysteryPickedStudent(null);
      setMysteryVocabIndex((prev) => (prev + 1) % activeVocabList.length);
      return;
    }
    setIsMysteryShaking(true);
    sfx.playMysteryDrumroll();
    setTimeout(() => {
      setIsMysteryShaking(false);
      setIsMysteryBoxOpen(true);
      sfx.playStarFanfare();
      playWordAudio(currentMysteryVocab.english, currentMysteryVocab.audioUrl);
    }, 800);
  };

  const handleMysteryPickStudent = () => {
    if (!session?.studentScores || session.studentScores.length === 0 || isMysterySpinningStudent) return;
    const eligibleStudents = session.studentScores.filter(
      (sc) => sc.attendance !== 'ABSENT' && sc.attendance !== 'EXCUSED'
    );
    const pool = eligibleStudents.length > 0 ? eligibleStudents : session.studentScores;
    setIsMysteryBoxOpen(false);
    setIsMysterySpinningStudent(true);
    sfx.playPop();

    let ticks = 0;
    const totalTicks = 12;
    const spinInterval = setInterval(() => {
      const candidate = pool[Math.floor(Math.random() * pool.length)];
      setMysteryPickedStudent(candidate);
      sfx.playPop();
      ticks += 1;
      if (ticks >= totalTicks) {
        clearInterval(spinInterval);
        const finalPicked = pool[Math.floor(Math.random() * pool.length)];
        setMysteryPickedStudent(finalPicked);
        setIsMysterySpinningStudent(false);
        sfx.playBadgeChime();
      }
    }, 90);
  };

  // Target vocabulary for interactive games (always synced with gameQuestionIdx)
  const gameTargetVocab = activeVocabList[gameQuestionIdx % activeVocabList.length] || activeVocabList[0];

  // Safe 4-option Listen & Choose choices that ALWAYS include gameTargetVocab
  const listenChooseOptions = useMemo(() => {
    if (!gameTargetVocab || activeVocabList.length === 0) return [];
    const target = gameTargetVocab;
    const others = activeVocabList.filter(
      (v) => (v._id || v.english) !== (target._id || target.english)
    );
    const selectedDistractors: typeof activeVocabList = [];
    for (let i = 0; i < Math.min(3, others.length); i++) {
      const idx = (gameQuestionIdx + i * 3) % others.length;
      if (!selectedDistractors.includes(others[idx])) {
        selectedDistractors.push(others[idx]);
      }
    }
    for (const item of others) {
      if (selectedDistractors.length >= 3) break;
      if (!selectedDistractors.includes(item)) {
        selectedDistractors.push(item);
      }
    }
    const combined = [target, ...selectedDistractors];
    // Deterministic shuffle position for target based on gameQuestionIdx
    const targetPos = (gameQuestionIdx * 3 + (target.english.charCodeAt(0) || 0)) % combined.length;
    if (targetPos !== 0 && targetPos < combined.length) {
      const temp = combined[0];
      combined[0] = combined[targetPos];
      combined[targetPos] = temp;
    }
    return combined;
  }, [gameTargetVocab, activeVocabList, gameQuestionIdx]);

  const handleSpinLuckyWheel = () => {
    if (isWheelSpinning || activeVocabList.length === 0) return;
    setIsWheelSpinning(true);
    sfx.playMysteryDrumroll();
    const eligibleStudents = (session?.studentScores || []).filter(
      (sc) => sc.attendance !== 'ABSENT' && sc.attendance !== 'EXCUSED'
    );
    const pool = eligibleStudents.length > 0 ? eligibleStudents : session?.studentScores || [];

    let ticks = 0;
    const totalTicks = 14;
    const spinInterval = setInterval(() => {
      setGameQuestionIdx((prev) => (prev + 1) % activeVocabList.length);
      setWheelBonusStars(((ticks % 3) + 1));
      if (pool.length > 0) {
        setWheelPickedStudent(pool[Math.floor(Math.random() * pool.length)]);
      }
      sfx.playPop();
      ticks += 1;
      if (ticks >= totalTicks) {
        clearInterval(spinInterval);
        const nextIdx = Math.floor(Math.random() * activeVocabList.length);
        const bonus = [1, 2, 2, 3][Math.floor(Math.random() * 4)];
        setGameQuestionIdx(nextIdx);
        setCurrentVocabIndex(nextIdx);
        setWheelBonusStars(bonus);
        if (pool.length > 0) {
          setWheelPickedStudent(pool[Math.floor(Math.random() * pool.length)]);
        }
        setIsWheelSpinning(false);
        sfx.playStarFanfare();
        const chosenWord = activeVocabList[nextIdx];
        if (chosenWord) {
          playWordAudio(chosenWord.english, chosenWord.audioUrl);
        }
      }
    }, 85);
  };

  // ── Question result submission ─────────────────────────────────────────────
  const submitQuestionResult = async (activityId?: string, qIndex = 0, promptText = '', answerMap = answers) => {
    if (!session || scoringRef.current) return;
    scoringRef.current = true;
    try {
      const activity = session.activities?.find(item => item._id === activityId);
      const linkedActivity = activity?.questions?.[qIndex] ? activityId : undefined;
      const studentAnswers = Object.entries(answerMap).filter(([studentId]) => session.studentScores.some(row => {
        const id = typeof row.student === 'string' ? row.student : row.student._id;
        return id === studentId && !['ABSENT', 'EXCUSED'].includes(row.attendance || '');
      })).map(([studentId, result]) => ({ studentId, result }));
      await classroomSessionApi.recordQuestionResult(sessionId, { activityId: linkedActivity, questionIndex: qIndex, promptText, studentAnswers });
      showToast('Đã lưu câu trả lời. Lưu lại cùng câu hỏi sẽ cập nhật kết quả.');
      await load();
    } catch (e: any) { showToast(e.message || 'Chưa lưu được câu trả lời. Vui lòng thử lại.'); }
    finally { scoringRef.current = false; }
  };

  // ── Per-student scoring with Joyous Celebration & Instant Real-time Feedback ──────
    const handleMarkAttendance = async (studentId: string, attendanceStatus: 'PRESENT' | 'LATE' = 'LATE') => {
    try {
      await classroomSessionApi.updateStudentAttendance(sessionId, studentId, attendanceStatus);
      const matches = (row: StudentSessionScore) => (typeof row.student === 'string' ? row.student : row.student._id) === studentId;
      setSession(prev => prev ? {
        ...prev,
        studentScores: prev.studentScores.map(row => matches(row) ? { ...row, attendance: attendanceStatus } : row)
      } : prev);
      const row = session?.studentScores.find(matches);
      const name = row && typeof row.student === 'object' ? row.student.name : 'bé';
      sfx.playPop();
      showToast(`Đã điểm danh cho ${name} vào lớp (${attendanceStatus === 'LATE' ? 'Đến trễ' : 'Có mặt'})! 🎉`);
    } catch (e: any) {
      showToast(e?.message || 'Không thể cập nhật điểm danh. Vui lòng thử lại.');
    }
  };

  const applyScore = async (
    studentId: string,
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    actionType?: 'applause' | 'loud_clear' | 'excellent_pronunciation' | 'correct' | 'custom',
    customMessage?: string
  ) => {
    if (actionType === 'applause') sfx.playApplause();
    else if (actionType === 'loud_clear') sfx.playSpeakingBravo();
    else if (actionType === 'excellent_pronunciation') sfx.playCheerFanfare();
    else sfx.playStarFanfare();

    if (scoringRef.current) return;
    scoringRef.current = true;
    try {
      await classroomSessionApi.scoreStudent(sessionId, { studentId, ...opts });
      const update = (row: StudentSessionScore) => ({ ...row, stars: Math.max(0, row.stars + (opts.stars || 0)), correctCount: Math.max(0, row.correctCount + (opts.correctDelta || 0)), incorrectCount: Math.max(0, row.incorrectCount + (opts.incorrectDelta || 0)) });
      const matches = (row: StudentSessionScore) => (typeof row.student === 'string' ? row.student : row.student._id) === studentId;
      setSession(prev => prev ? { ...prev, studentScores: prev.studentScores.map(row => matches(row) ? update(row) : row) } : prev);
      setSpotlightStudent(prev => prev && matches(prev) ? update(prev) : prev);
      setScoringStudent(prev => prev && matches(prev) ? update(prev) : prev);
      const row = session?.studentScores.find(matches);
      const name = row && typeof row.student === 'object' ? row.student.name : 'bé';
      setCelebrationEffect({ show: true, type: 'stars', message: customMessage || 'Hoan hô ' + name + '! Cùng tiếp tục cố gắng nhé.', studentName: name, count: opts.stars || 0 });
      setTimeout(() => setCelebrationEffect(null), 2800);
    } catch (e: any) { showToast(e.message || 'Chưa xác nhận được việc lưu sao. Vui lòng kiểm tra lại.'); await load(); }
    finally { scoringRef.current = false; }
  };
  const applyBulkScore = async (
    studentIds: string[],
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    successMsg?: string
  ) => {

    if (!studentIds.length || scoringRef.current) return;
    scoringRef.current = true;
    try {
      await classroomSessionApi.scoreBulk(sessionId, { studentIds, ...opts });
      sfx.playStarFanfare();
      showToast(successMsg || 'Đã lưu sao động viên cho học sinh.');
      await load();
    } catch (e: any) { showToast(e.message || 'Chưa lưu được sao. Vui lòng kiểm tra lại.'); await load(); }
    finally { scoringRef.current = false; }
  };

  // 1. Ghi nhận tất cả các bé đang có trạng thái Đúng (✓)
  const handleAwardAllCorrect = (stars = 1) => {
    const correctStudentIds = Object.entries(answers)
      .filter(([_, ans]) => ans === 'CORRECT')
      .map(([sid]) => sid);

    if (correctStudentIds.length === 0) {
      showToast('⚠️ Chưa có học sinh nào được tích Đúng (✓) trong lượt này!');
      return;
    }

    void applyBulkScore(
      correctStudentIds,
      { stars, correctDelta: 1 },
      `⭐ Đã thưởng +${stars} Sao & ghi nhận đúng cho ${correctStudentIds.length} bé!`
    );
  };

  // 2. Thưởng CẢ LỚP cùng lúc (sửa lỗi thông báo báo +0 sao)
  const handleAwardWholeClass = (stars = 1) => {
    if (!session?.studentScores || session.studentScores.length === 0) return;
    const allIds = session.studentScores.filter(sc => !['ABSENT', 'EXCUSED'].includes(sc.attendance || '')).map(sc =>
      typeof sc.student === 'string' ? sc.student : (sc.student as User)._id || ''
    ).filter(Boolean);

    const message = stars > 0
      ? `🌟 Hoan hô cả lớp! Tất cả ${allIds.length} bạn đều được thưởng +${stars} sao!`
      : `🌟 Hoan hô cả lớp! Tất cả ${allIds.length} bạn đều được khen thưởng!`;

    void applyBulkScore(
      allIds,
      { stars },
      message
    );
  };

  // ── Toggle answer state for a student (dùng trong game tương tác) ────────
  const cycleAnswer = (studentId: string) => {
    sfx.playPop();
    setAnswers((prev) => {
      const cur = prev[studentId] || 'NOT_ANSWERED';
      const next =
        cur === 'NOT_ANSWERED' ? 'CORRECT' : cur === 'CORRECT' ? 'INCORRECT' : 'NOT_ANSWERED';
      return { ...prev, [studentId]: next };
    });
  };

  // ── Mở modal tùy chọn kết thúc hoặc thoát buổi dạy ────────────────────────
  const handleEnd = () => {
    setIsExitModalOpen(true);
  };

  // ── 1. Hoàn tất tiết học & Xuất báo cáo (chuyển sang trang summary) ────────
  const handleCompleteAndExit = async () => {
    if (ending || scoringRef.current) return;
    setEnding(true);
    try {
      const allGoalKeys = (session?.teachingGuide?.goals || []).map((g: any) => g.key);
      const effectiveGoals = coverage === 'COMPLETE' ? allGoalKeys : [];

      await classroomSessionApi.endSession(sessionId, {
        coverage,
        goalsCovered: effectiveGoals,
        reflection: ''
      });
      setIsExitModalOpen(false);
      navigate(`/teacher/classroom-sessions/${sessionId}/summary`);
    } catch (e: any) {
      showToast(e.message || 'Chưa lưu được tổng kết. Vui lòng thử lại.');
    } finally {
      setEnding(false);
    }
  };

  // ── 2. Rời buổi dạy & Thoát ra danh sách buổi dạy ─────────────────────────────
  const handlePauseAndExit = () => {
    setIsExitModalOpen(false);
    navigate('/teacher/classroom-sessions');
  };

  const handleOvertimeClosure = () => {
    setIsOvertimeModalOpen(false);
    setOvertimeSnoozeUntil(Date.now() + 15 * 60 * 1000);
    setIsExitModalOpen(true);
  };

  if (pageError && !session) return <div className="min-h-screen p-8"><div className="teacher-error" role="alert">{pageError}<button onClick={() => void load()}>Thử lại</button></div><Link to="/teacher/classroom-sessions" className="teacher-button mt-5">Về nhật ký buổi dạy</Link></div>;

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
        <span className="ml-4 text-xl font-bold">Đang tải phòng học trực tiếp…</span>
      </div>
    );
  }

  if (session.status === 'SCHEDULED') return <div className="min-h-screen bg-slate-50 p-8"><div className="teacher-panel mx-auto max-w-xl"><p className="teacher-eyebrow">KẾ HOẠCH ĐÃ LƯU</p><h1 className="text-2xl font-bold">{session.title}</h1><p className="my-4">Buổi học chưa bắt đầu. Hãy kiểm tra danh sách trước khi mở lớp.</p><p className="text-sm text-slate-500 mb-5">{session.studentScores.length} học sinh · {session.plannedDuration} phút</p>{pageError && <p role="alert" className="text-red-700 mb-4">{pageError}</p>}<div className="flex flex-wrap gap-3"><button className="teacher-button primary" disabled={ending} onClick={async () => { setEnding(true); try { await classroomSessionApi.startSession(sessionId); await load(); } catch(e: any) { setPageError(e.message); } finally { setEnding(false); } }}>Bắt đầu buổi dạy</button><Link className="teacher-button" to="/teacher/classroom-sessions">Về nhật ký</Link></div></div></div>;

  const scores = (session.studentScores || []).filter(row => !['ABSENT', 'EXCUSED'].includes(row.attendance || ''));
  const absentScores = (session.studentScores || []).filter(row => ['ABSENT', 'EXCUSED'].includes(row.attendance || ''));
  const correct = scores.reduce((n, s) => n + s.correctCount, 0);
  const totalStars = scores.reduce((n, s) => n + s.stars, 0);
  const starRanking = [...scores].sort((a, b) => b.stars - a.stars);
  const rankFor = (stars: number) => 1 + starRanking.filter(row => row.stars > stars).length;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-950 text-white select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-full border-2 border-white flex items-center gap-2 animate-bounce-short">
          <Sparkles className="w-5 h-5 text-yellow-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top bar: Header, Prominent Metrics, Tabs & Right-aligned Actions ────── */}
      <header className="z-40 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900/95 px-2.5 py-1.5 sm:px-4">
        {/* Left: Title + Prominent Live Metrics (Phút, Đúng, Sao) */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-base font-black text-amber-950 sm:flex">
              🏫
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                  BUỔI {session.sessionNumber || 1}
                </span>
              </div>
              <h1 className="truncate text-xs font-black tracking-tight text-white sm:text-sm max-w-[180px] sm:max-w-[240px]" title={session.lesson?.title || session.title}>
                {session.lesson?.title || session.title}
              </h1>
            </div>
          </div>

          {/* Prominent Live Stats Bar (Phút · Đúng · Sao) */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-amber-400/30 bg-slate-950/90 px-2.5 py-1 shadow-inner">
            <span className="flex items-center gap-1 rounded-xl bg-sky-500/20 border border-sky-400/30 px-2.5 py-0.5 text-xs font-black text-sky-300" title="Thời gian buổi học đã diễn ra">
              <Clock size={13} className="text-sky-400" />
              <span>{elapsed > 0 ? `${elapsed} phút` : '0 phút'}</span>
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-black text-emerald-300" title="Tổng số lượt trả lời đúng">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>{correct} đúng</span>
            </span>
            <span className="flex items-center gap-1 rounded-xl bg-amber-500/25 border border-amber-400/50 px-2.5 py-0.5 text-xs font-black text-amber-300" title="Tổng số sao cả lớp đạt được">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              <span>{totalStars} sao</span>
            </span>

            {absentScores.length > 0 && (
              <button
                type="button"
                onClick={() => setIsLateAttendanceModalOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-rose-500/25 hover:bg-rose-500/35 border border-rose-400/50 px-2 py-0.5 text-xs font-black text-rose-300 cursor-pointer active:scale-95 transition-all animate-pulse"
                title="Có học sinh vắng. Nhấn để điểm danh cho bé đến trễ vào lớp"
              >
                <UserCheck size={13} className="text-rose-400" />
                <span>{absentScores.length} vắng • Vào lớp</span>
              </button>
            )}
          </div>
        </div>

        {/* Center: View Mode Switcher Tabs (Desktop / Laptop) */}
        <div className="hidden grid-cols-5 gap-1 rounded-xl border border-white/10 bg-slate-800/90 p-1 xl:grid [&>button]:min-w-0 [&>button]:justify-center">
          <button
            type="button"
            onClick={() => setActiveTab('warmup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'warmup'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white ring-1 ring-orange-300'
                : 'text-amber-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Flame size={14} className="text-amber-300 fill-amber-300" />
            <span>Ôn bài cũ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presentation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'presentation'
                ? 'bg-amber-400 text-amber-950'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={14} />
            <span>Từ vựng</span>
          </button>

          <button
            type="button" onClick={() => setActiveTab('sentences')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'sentences'
                ? 'bg-teal-400 text-teal-950'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare size={14} />
            <span>Mẫu câu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'games'
                ? 'bg-purple-500 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Gamepad2 size={14} />
            <span>Trò chơi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wrapup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              activeTab === 'wrapup'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950'
                : 'text-amber-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Award size={14} />
            <span>Tổng kết</span>
          </button>
        </div>

        {/* Far Right: Exit & End Session Buttons */}
        <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs sm:text-sm font-black text-slate-200 border border-white/15 transition-all cursor-pointer active:scale-95"
            title="Thoát hoặc tạm dừng buổi dạy"
          >
            <LogOut size={15} className="text-amber-300" />
            <span>Thoát</span>
          </button>

          <button
            type="button"
            onClick={handleEnd}
            disabled={ending}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-3.5 py-1.5 text-xs sm:text-sm font-black text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            title="Kết thúc hoặc dừng buổi dạy"
          >
            <StopCircle size={15} />
            <span>{ending ? 'Đang hoàn tất…' : 'Kết thúc'}</span>
          </button>
        </div>
      </header>

      {/* Sub-header Tab switcher bar for < xl screens */}
      <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-white/10 bg-slate-900 p-1 sm:grid-cols-6 xl:hidden [&>button]:min-w-0 [&>button]:justify-center [&>button]:px-1">
        <button
          onClick={() => setActiveTab('warmup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'warmup' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white' : 'text-amber-300 hover:bg-white/10'
          }`}
        >
          <Flame size={14} className="fill-amber-300" /> Ôn bài cũ
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
          <MessageSquare size={14} /> Mẫu câu
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
          onClick={() => setActiveTab('wrapup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all ${
            activeTab === 'wrapup' ? 'bg-amber-400 text-slate-950' : 'text-amber-300 hover:bg-white/10'
          }`}
        >
          <Award size={14} /> Tổng Kết
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
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden lg:overflow-hidden p-2 sm:p-2.5 lg:p-3">

        {/* ========================================================================= */}
        {/* TAB 0: REVIEW PREVIOUS LESSON */}
        {/* ========================================================================= */}
        {/* Vocabulary and sentence patterns from the preceding lesson */}
        {/* ========================================================================= */}
        {activeTab === 'warmup' && (
          <div className="grid min-h-0 w-full max-w-[2200px] flex-1 grid-cols-1 gap-2 mx-auto overflow-hidden lg:grid-cols-12 lg:gap-3 2xl:max-w-none">
            {/* Left 8 Cols: Giant Warm-up Review Flashcard & Projection */}
            <div className="relative flex min-h-0 flex-col items-center justify-between overflow-y-auto rounded-3xl border-2 border-orange-400/50 bg-gradient-to-b from-slate-900 via-orange-950/20 to-slate-900 p-3 sm:p-4 lg:col-span-8">
              {/* Header badge & controls */}
              <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-3.5 py-1.5 rounded-full text-xs sm:text-sm flex items-center gap-1.5 shrink-0 shadow-sm">
                    <Flame size={15} className="fill-white" />
                    Ôn bài cũ
                  </span>
                  {previousLesson && (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-300 min-w-0">
                      <span className="text-amber-400 font-bold shrink-0">📖 Đang ôn bài trước:</span>
                      <span className="text-white font-black truncate">{previousLesson.title}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {/* Switcher Vocab vs Patterns vs Freeze Dance */}
                  <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-800 p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setWarmupSection('vocab');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        warmupSection === 'vocab'
                          ? 'bg-orange-500 text-white shadow-sm'
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        warmupSection === 'patterns'
                          ? 'bg-teal-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💬 Mẫu câu ({activeWarmupPatterns.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        sfx.playPop();
                        setWarmupSection('freeze-dance');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                        warmupSection === 'freeze-dance'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                          : 'text-cyan-300 hover:text-white'
                      }`}
                    >
                      🧊 Freeze Dance!
                    </button>
                  </div>

                  {/* Navigation arrows for Vocab */}
                  {warmupSection === 'vocab' && warmupVocabList.length > 1 && (
                    <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-800 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupRevealed(false);
                          setCurrentWarmupIndex((i) => (i > 0 ? i - 1 : warmupVocabList.length - 1));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Từ ôn trước"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold text-amber-300 px-1.5 min-w-[3rem] text-center select-none whitespace-nowrap">
                        {currentWarmupIndex + 1} / {warmupVocabList.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupRevealed(false);
                          setCurrentWarmupIndex((i) => (i < warmupVocabList.length - 1 ? i + 1 : 0));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Từ ôn tiếp theo"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}

                  {/* Navigation arrows for Sentence Patterns */}
                  {warmupSection === 'patterns' && activeWarmupPatterns.length > 1 && (
                    <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-slate-800 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupPatternRevealed(false);
                          setCurrentWarmupPatternIndex((i) => (i > 0 ? i - 1 : activeWarmupPatterns.length - 1));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Mẫu câu trước"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-xs font-bold text-teal-300 px-1.5 min-w-[3rem] text-center select-none whitespace-nowrap">
                        {currentWarmupPatternIndex + 1} / {activeWarmupPatterns.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          setIsWarmupPatternRevealed(false);
                          setCurrentWarmupPatternIndex((i) => (i < activeWarmupPatterns.length - 1 ? i + 1 : 0));
                        }}
                        className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                        title="Mẫu câu tiếp theo"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Flashcard for Warm-up: Vocabulary vs Sentence Pattern */}
              {warmupSection === 'vocab' && currentWarmupVocab && (
                <div className="flex flex-col items-center text-center my-auto w-full">
                  {/* Card Image */}
                  <div className="relative mb-2 flex h-[clamp(6.5rem,20vh,13rem)] w-[clamp(6.5rem,20vh,13rem)] items-center justify-center rounded-3xl border-4 border-orange-400 bg-white p-2.5 group">
                    <img
                      src={currentWarmupVocab.imageUrl}
                      alt={currentWarmupVocab.english}
                      className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => {
                        sfx.playPop();
                        playWordAudio(currentWarmupVocab.english, currentWarmupVocab.audioUrl);
                      }}
                      className="absolute -bottom-2.5 -right-2.5 w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 hover:from-orange-400 hover:to-amber-300 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer ring-4 ring-orange-300/40"
                      title="Phát âm từ này"
                    >
                      <Volume2 size={22} />
                    </button>
                  </div>

                  {/* Word title */}
                  <h2 className="text-3xl sm:text-5xl font-black text-orange-400 font-display tracking-wide uppercase mb-1.5">
                    {currentWarmupVocab.english}
                  </h2>

                  {/* Vietnamese / Hint Reveal Toggle */}
                  <div className="flex items-center justify-center gap-3 mb-2.5">
                    {isWarmupRevealed ? (
                      <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1 rounded-2xl text-base font-bold text-white border border-white/20 animate-fade-in">
                        <span>{currentWarmupVocab.vietnamese}</span>
                        {currentWarmupVocab.pronunciation && (
                          <span className="text-orange-300 font-mono text-xs">
                            {currentWarmupVocab.pronunciation}
                          </span>
                        )}
                        <button
                          onClick={() => setIsWarmupRevealed(false)}
                          className="ml-1 text-xs text-slate-400 hover:text-white"
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
                        className="flex items-center gap-1.5 px-3.5 py-1 rounded-2xl bg-orange-500/20 text-orange-300 border border-orange-400/40 text-xs sm:text-sm font-bold hover:bg-orange-500/30 cursor-pointer transition-all"
                      >
                        <Sparkles size={14} /> Đố bé nghĩa tiếng Việt là gì? (Bấm để xem)
                      </button>
                    )}
                  </div>

                  {/* Koko Speaking Coach */}
                  <div className="flex items-center justify-center w-full max-w-xl">
                    <KokoSpeakingCoach
                      targetWord={currentWarmupVocab.english}
                      audioUrl={currentWarmupVocab.audioUrl}
                      ageGroup={session.ageGroup}
                      contextKey={`${sessionId}:warmup-word:${currentWarmupIndex}`}
                      onCallStudent={pickRandomStudent}
                    />
                  </div>
                </div>
              )}

              {/* Main Flashcard for Warm-up: Sentence Patterns */}
              {warmupSection === 'patterns' && currentWarmupPattern && (
                <div className="flex flex-col items-center text-center my-auto w-full">
                  {/* Pattern Illustration Frame */}
                  <div className="relative mb-2 flex h-[clamp(6.5rem,18vh,11.5rem)] w-[clamp(6.5rem,18vh,11.5rem)] items-center justify-center rounded-3xl border-4 border-amber-400/60 bg-white/10 p-2.5">
                    <img src={getSentenceIllustration(currentWarmupPattern.english)} alt="" className="w-full h-full object-contain" />
                    <button
                      onClick={() => {
                        sfx.playPop();
                        const qText = currentWarmupPattern.english;
                        const ansList = currentWarmupPattern.answers && currentWarmupPattern.answers.length > 0
                          ? currentWarmupPattern.answers
                          : [];
                        void playDialogueAudio(
                          qText,
                          ansList,
                          currentWarmupPattern.audioUrl || undefined
                        );
                      }}
                      className="absolute -bottom-2.5 -right-2.5 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 hover:from-amber-400 text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer ring-4 ring-amber-300/40"
                      title="Phát âm cả câu hỏi và tất cả câu trả lời"
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>

                  {/* Sentence English Text */}
                  <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-amber-300 font-display tracking-wide uppercase mb-1 max-w-2xl">
                    &ldquo;{currentWarmupPattern.english}&rdquo;
                  </h2>

                  {/* Dual Audio Actions */}
                  {currentWarmupPattern.answers && currentWarmupPattern.answers.length > 0 && (
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          const qText = currentWarmupPattern.english;
                          const ansList = currentWarmupPattern.answers;
                          void playDialogueAudio(
                            qText,
                            ansList,
                            currentWarmupPattern.audioUrl || undefined
                          );
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs active:scale-95 transition-all cursor-pointer shadow-sm"
                        title="Nghe lần lượt câu hỏi và tất cả câu trả lời"
                      >
                        <Volume2 size={14} />
                        <span>
                          {currentWarmupPattern.answers.length > 1
                            ? `Đọc cả Hỏi & ${currentWarmupPattern.answers.length} Đáp 💬`
                            : 'Đọc cả Hỏi & Đáp 💬'}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Pronunciation & Vietnamese Meaning */}
                  <div className="flex flex-col items-center justify-center gap-1.5 mb-2.5">
                    {currentWarmupPattern.pronunciation && (
                      <span className="text-xs text-slate-300 font-mono bg-white/10 px-3 py-0.5 rounded-full">
                        {currentWarmupPattern.pronunciation}
                      </span>
                    )}

                    {isWarmupPatternRevealed ? (
                      <div className="flex items-center gap-2 bg-white/15 px-3.5 py-1 rounded-2xl text-sm sm:text-base font-bold text-white border border-white/20 animate-fade-in">
                        <span>{currentWarmupPattern.vietnamese}</span>
                        <button
                          onClick={() => setIsWarmupPatternRevealed(false)}
                          className="ml-1 text-xs text-slate-400 hover:text-white"
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
                        className="flex items-center gap-1.5 px-3.5 py-1 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-bold hover:bg-amber-500/30 cursor-pointer transition-all"
                      >
                        <Sparkles size={14} /> Đố bé mẫu câu này nghĩa là gì? (Bấm để xem)
                      </button>
                    )}
                  </div>

                  {/* Practice speaking Sentence with Koko */}
                  <div className="flex items-center justify-center w-full max-w-xl">
                    <KokoSpeakingCoach
                      targetWord={currentWarmupPattern.english}
                      audioUrl={currentWarmupPattern.audioUrl || undefined}
                      ageGroup={session.ageGroup}
                      contextKey={`${sessionId}:warmup-pattern:${currentWarmupPatternIndex}`}
                      onCallStudent={pickRandomStudent}
                    />
                  </div>
                </div>
              )}

              {warmupSection !== 'freeze-dance' && !(warmupSection === 'vocab' ? currentWarmupVocab : currentWarmupPattern) && (
                <div className="my-auto rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <BookOpen className="mx-auto mb-3 text-amber-300" size={32} />
                  <p className="font-bold text-white">{warmupLoading ? 'Đang tải bài học trước…' : previousLesson ? 'Bài trước chưa có nội dung cho phần ôn này.' : 'Lớp chưa có bài học trước để ôn.'}</p>
                  <button type="button" onClick={() => setActiveTab('presentation')} className="mt-4 rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950">Chuyển sang bài mới</button>
                </div>
              )}

              {/* Main Mode for Warm-up: Koko Freeze Dance */}
              {warmupSection === 'freeze-dance' && (
                <div className="flex flex-col items-center text-center my-auto w-full py-2">
                  {/* Status Banner */}
                  <div className="mb-3">
                    {freezeState === 'idle' && (
                      <div className="flex flex-col items-center gap-2">
                        <KokoMascot state="waving" size="md" interactive={false} />
                        <h2 className="text-2xl sm:text-4xl font-black text-cyan-300 font-display">
                          Koko Freeze Dance!
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-slate-300 max-w-lg">
                          Cô bật nhạc: Bé đứng dậy nhảy theo Koko! Khi nhạc dừng hoặc cô hô <span className="text-cyan-400 font-black">FREEZE!</span>, bé nào đứng im như tượng băng sẽ được cộng sao ở danh sách bên phải!
                        </p>
                      </div>
                    )}

                    {freezeState === 'dancing' && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-6xl animate-pulse ring-6 ring-cyan-300/40">
                            💃
                          </div>
                          <span className="absolute -top-2 -right-2 text-3xl animate-bounce">🎵</span>
                          <span className="absolute -bottom-2 -left-2 text-3xl animate-bounce">🎶</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black text-amber-400 font-display uppercase tracking-wider animate-pulse">
                          DANCE! NHẢY CÙNG KOKO!
                        </h2>
                        <div className="flex items-center gap-2 text-lg font-black text-white bg-white/10 px-5 py-1.5 rounded-2xl border border-white/20">
                          <span>Đếm ngược đóng băng:</span>
                          <span className="text-cyan-400 text-2xl font-mono">{freezeCountdown}s</span>
                        </div>
                      </div>
                    )}

                    {freezeState === 'frozen' && (
                      <div className="flex flex-col items-center gap-2 animate-bounce-short">
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-blue-300 to-cyan-500 flex items-center justify-center text-5xl sm:text-6xl ring-6 ring-cyan-200">
                          🧊
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-black text-cyan-200 font-display uppercase tracking-wider">
                          ❄️ FREEZE! ĐỨNG IM! ❄️
                        </h2>
                        <p className="text-xs sm:text-sm font-bold text-cyan-100 max-w-md">
                          👉 Cô bấm <span className="text-amber-300 font-black">+1 ⭐</span> cho từng bé đứng im xuất sắc bên dưới hoặc cột bên phải nhé!
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Per-student Individual Star Award Grid directly inside Freeze Dance when Frozen */}
                  {freezeState === 'frozen' && (
                    <div className="w-full max-w-2xl mb-3 rounded-2xl border border-cyan-400/30 bg-slate-950/70 p-2.5">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-black text-cyan-300 uppercase">
                          🧊 Chọn thưởng sao cho bé đứng im tốt:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            handleAwardWholeClass(1);
                            showToast('⭐ Cả lớp đứng im xuất sắc! +1 sao cho tất cả các bé!');
                          }}
                          className="text-[11px] font-black bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 px-2.5 py-1 rounded-lg cursor-pointer"
                        >
                          Thưởng cả lớp +1 ⭐
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {scores.map((sc) => {
                          const student = sc.student as User;
                          const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                          const sName = student?.name || 'Bé';
                          return (
                            <button
                              key={sid}
                              type="button"
                              onClick={() => {
                                void applyScore(sid, { stars: 1 }, 'custom', `🧊 ${sName} đứng im như tượng băng! +1 ⭐`);
                                showToast(`⭐ +1 Sao Freeze Dance cho ${sName}!`);
                              }}
                              className="flex items-center justify-between gap-1.5 rounded-xl bg-white/5 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400 px-2.5 py-1.5 text-left cursor-pointer active:scale-95 transition-all"
                            >
                              <span className="text-xs font-bold text-white truncate">{sName}</span>
                              <span className="shrink-0 rounded-md bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5">
                                +1⭐
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Freeze Controls */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {freezeState === 'idle' ? (
                      <button
                        type="button"
                        onClick={handleStartFreezeDance}
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-cyan-300/30"
                      >
                        <Play size={20} className="fill-white" />
                        <span>Bắt Đầu Nhảy (Play Dance Music) 🎵</span>
                      </button>
                    ) : freezeState === 'dancing' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFreezeState('frozen');
                          sfx.playFreezeSound();
                        }}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 text-white font-black text-sm sm:text-base px-6 py-3 rounded-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-blue-300/40"
                      >
                        <span>🧊 BẤM FREEZE NGAY!</span>
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleStartFreezeDance}
                          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl active:scale-95 transition-all cursor-pointer"
                        >
                          <RotateCcw size={16} />
                          <span>Chơi Vòng Nữa 🔄</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Big CTA: Complete Warm-up and Transition to Lesson */}
              <div className="w-full mt-3 pt-2.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                <span className="text-xs text-orange-200/80 font-medium">
                  💡 Gợi ý: Cho cả lớp đồng thanh ôn lại 2-3 lần rồi bắt đầu bài mới!
                </span>

                <button
                  type="button"
                  onClick={() => {
                    sfx.playStarFanfare();
                    setActiveTab('presentation');
                    showToast('🚀 Ôn bài cũ hoàn tất! Bắt đầu Giảng dạy bài mới!');
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs sm:text-sm px-5 py-2.5 rounded-2xl active:scale-95 transition-all cursor-pointer"
                >
                  <span>Hoàn thành ôn bài cũ</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Right 4 Cols: Warm-up Rewards, Spotlight Student, Vocab/Pattern/Student Quick List */}
            <div className="flex min-h-0 flex-col gap-2 overflow-y-auto lg:col-span-4">
              {/* Quick Whole-Class & Random Call Actions */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-3 shrink-0">
                <h3 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Flame size={15} /> Thưởng sao ôn bài cũ
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAwardWholeClass(1)}
                    className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl active:scale-95 transition-all cursor-pointer"
                  >
                    <Star size={15} className="fill-white" />
                    <span>Cả lớp +1 ⭐</span>
                  </button>

                  <button
                    onClick={pickRandomStudent}
                    disabled={isPickingRandom}
                    className="flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Shuffle size={14} />
                    <span>{isPickingRandom ? 'Đang chọn…' : '🎲 Gọi ngẫu nhiên'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Jump List: Student list for Freeze Dance, or Vocab/Patterns of preceding lesson */}
              <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-slate-900/90 p-3">
                <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10 shrink-0">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {warmupSection === 'freeze-dance'
                      ? `Thưởng sao từng bé (${scores.length})`
                      : warmupSection === 'vocab'
                      ? `Từ vựng bài trước (${warmupVocabList.length})`
                      : `Mẫu câu bài trước (${warmupPatterns.length})`}
                  </h4>
                  <span className="text-[10px] text-amber-300 font-bold truncate max-w-[120px]">
                    {warmupSection === 'freeze-dance' ? '🧊 Freeze Dance' : previousLesson?.title || 'Bài trước'}
                  </span>
                </div>

                {warmupSection === 'freeze-dance' ? (
                  <div className="min-h-0 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1 content-start overflow-y-auto pr-0.5">
                    {scores.map((sc) => {
                      const student = sc.student as User;
                      const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                      const sName = student?.name || 'Học sinh';
                      return (
                        <div
                          key={sid}
                          className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/40 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-xs font-bold text-white truncate">{sName}</span>
                            <span className="text-[10px] font-black text-amber-300 shrink-0">⭐{sc.stars}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              void applyScore(sid, { stars: 1 }, 'custom', `🧊 ${sName} đứng im xuất sắc trong Freeze Dance! +1 ⭐`);
                              showToast(`⭐ +1 Sao cho ${sName}!`);
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[10px] cursor-pointer active:scale-95 shrink-0"
                          >
                            +1⭐
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : warmupSection === 'vocab' ? (
                  <div className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pr-1">
                    {warmupVocabList.length === 0 && <p className="col-span-2 py-4 text-center text-xs text-slate-400">Chưa có từ vựng để ôn</p>}
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
                              ? 'bg-orange-500 text-white font-bold ring-2 ring-orange-300'
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
                  <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
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
                                ? 'bg-teal-600 text-white font-bold ring-2 ring-teal-300'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <img src={getSentenceIllustration(pat.english)} alt="" className="w-9 h-9 object-contain shrink-0" />
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
          <div className="mx-auto grid min-h-0 w-full max-w-[2200px] flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-12 lg:gap-3 2xl:max-w-none">
            {/* Left Col (8 cols): Giant Presentation Flashcard for classroom display */}
            <div className="relative flex min-h-0 flex-col items-center justify-between overflow-y-auto rounded-3xl border-2 border-amber-400/40 bg-gradient-to-b from-slate-900 to-slate-800 p-3 sm:p-4 lg:col-span-8">
              <div className="w-full flex items-center justify-between mb-2">
                <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black px-3.5 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Từ vựng {currentVocabIndex + 1} / {activeVocabList.length}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(i => (i > 0 ? i - 1 : activeVocabList.length - 1));
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                    title="Từ trước"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(i => (i < activeVocabList.length - 1 ? i + 1 : 0));
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
                    title="Từ tiếp theo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Giant Flashcard Content */}
              <div className="flex flex-col items-center text-center my-auto w-full">
                {/* Visual Image Frame */}
                <div className="relative mb-2 flex h-[clamp(6.5rem,20vh,13rem)] w-[clamp(6.5rem,20vh,13rem)] items-center justify-center rounded-3xl border-4 border-amber-300 bg-white p-2.5 group">
                  <img
                    src={currentVocab.imageUrl}
                    alt={currentVocab.english}
                    className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                  />
                </div>

                {/* English Word */}
                <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-amber-400 font-display tracking-wide uppercase mb-1.5 leading-tight">
                  {currentVocab.english}
                </h2>

                {/* Vietnamese Meaning & Pronunciation hint */}
                <div className="flex flex-wrap items-center justify-center gap-2 text-slate-300 text-sm sm:text-xl font-bold mb-2">
                  <span className="text-white bg-white/10 px-3.5 py-0.5 rounded-xl">
                    {currentVocab.vietnamese}
                  </span>
                  {currentVocab.pronunciation && (
                    <span className="text-amber-300/80 font-mono text-xs sm:text-sm">
                      {currentVocab.pronunciation}
                    </span>
                  )}
                </div>

                {/* Physical TPR Mime Action Callout from Lesson Plan */}
                {currentTprGesture && (
                  <div className="w-full max-w-xl mx-auto my-1.5 p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 border-2 border-amber-400/50 flex items-center gap-3 backdrop-blur-sm">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
                      🤸
                    </div>
                    <div className="text-left">
                      <div className="text-amber-300 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <span>Cử chỉ vận động phản xạ TPR</span>
                        <span className="bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded text-[10px]">Cô & Bé cùng làm</span>
                      </div>
                      <div className="text-white font-extrabold text-xs sm:text-sm leading-snug mt-0.5">
                        {currentTprGesture}
                      </div>
                    </div>
                  </div>
                )}

                {/* Koko Speaking Coach (Restored UI with Nghe + Gọi bé đọc) */}
                <div className="mt-2 flex items-center justify-center w-full max-w-xl">
                  <KokoSpeakingCoach
                    targetWord={currentVocab.english}
                    audioUrl={currentVocab.audioUrl}
                    ageGroup={session.ageGroup}
                    contextKey={`${sessionId}:presentation:${currentVocabIndex}`}
                    onCallStudent={pickRandomStudent}
                  />
                </div>
              </div>

              {/* Vocabulary Carousel Strip at bottom */}
              <div className="w-full flex items-center gap-2 overflow-x-auto pt-2.5 mt-2 border-t border-white/10 scrollbar-none">
                {activeVocabList.map((v, idx) => (
                  <button
                    key={v._id || idx}
                    onClick={() => {
                      sfx.playPop();
                      setCurrentVocabIndex(idx);
                    }}
                    className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
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

            {/* Right Col: Student Quick Panel (Tối ưu cho cả lớp nhỏ và lớp đông 20-30 bé) */}
            <StudentQuickPanel
              title="Gọi đọc & Thưởng sao"
              icon={<Award size={18} className="text-amber-400" />}
              accent="amber"
              scores={scores}
              onApplyScore={(sid, opts) => {
                void applyScore(sid, opts);
                const sRow = scores.find(s => (typeof s.student === 'string' ? s.student : s.student._id) === sid);
                const sName = sRow && typeof sRow.student === 'object' ? sRow.student.name : 'Bé';
                showToast(`⭐ +${opts.stars || 1} Sao cho ${sName}!`);
              }}
              onSpotlightStudent={(sc) => {
                setSpotlightPromptOverride(null);
                setSpotlightStudent(sc);
              }}
              onAwardWholeClass={handleAwardWholeClass}
              onPickRandom={pickRandomStudent}
              callLabel="Gọi đọc"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SENTENCES & DIALOGUE TEACHING (Màn hình Giảng dạy Mẫu câu của bài) */}
        {/* ========================================================================= */}
        {activeTab === 'sentences' && (
          <div className="mx-auto grid min-h-0 w-full max-w-[2200px] flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-12 lg:gap-3 2xl:max-w-none">
            {/* Left Col (8 cols): Giant Presentation for Sentence Patterns */}
            <div className="relative flex min-h-0 flex-col items-center justify-between overflow-y-auto rounded-3xl border-2 border-teal-400/40 bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 p-3 sm:p-4 lg:col-span-8">
              {/* Top bar in sentence presentation */}
              <div className="w-full flex items-center justify-between mb-2">
                <span className="bg-teal-400/20 border border-teal-400/40 text-teal-300 font-black px-3.5 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1.5">
                  <MessageSquare size={14} />
                  Mẫu câu bài học {patterns.length > 0 ? `${currentPatternIndex + 1} / ${patterns.length}` : '—'}
                </span>

                <div className="flex items-center gap-1.5">
                  {currentLessonId && (
                    <a
                      href={`/teacher/sentences?lessonId=${currentLessonId}&mode=classroom`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-400/30 text-xs font-bold transition-all cursor-pointer"
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
                      setCurrentPatternIndex(i => (i > 0 ? i - 1 : patterns.length - 1));
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                    title="Mẫu câu trước"
                    disabled={patterns.length <= 1}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setIsAnswerRevealed(false);
                      setCurrentPatternIndex(i => (i < patterns.length - 1 ? i + 1 : 0));
                    }}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all disabled:opacity-40"
                    title="Mẫu câu tiếp theo"
                    disabled={patterns.length <= 1}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Main Sentence Content */}
              {loadingPatterns ? (
                <div className="my-auto py-12 text-center text-slate-400">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-teal-400 border-t-transparent" />
                  <p className="font-bold">Đang tải mẫu câu tương ứng của bài học...</p>
                </div>
              ) : patterns.length > 0 && patterns[currentPatternIndex] ? (
                (() => {
                  const currentPattern = patterns[currentPatternIndex];
                  const primaryAnswer = currentPattern.answers?.[0];

                  return (
                    <div className="flex flex-col items-center text-center my-auto w-full max-w-3xl">
                      {/* Question or Lead Sentence Card */}
                      <div className="relative w-full rounded-3xl bg-white/10 border-2 border-teal-300/40 p-3.5 sm:p-4 backdrop-blur-xs mb-2.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-teal-300 bg-teal-950/60 px-3 py-0.5 rounded-full border border-teal-400/30">
                            {currentPattern.contentType === 'QUESTION' ? '❓ Câu hỏi tương tác' : '💬 Mẫu câu đàm thoại'}
                          </span>

                          {/* Speaker Audio Buttons */}
                          <div className="flex items-center gap-1.5">
                            {primaryAnswer?.english && (
                              <button
                                type="button"
                                onClick={() => {
                                  sfx.playPop();
                                  playWordAudio(currentPattern.english, currentPattern.audioUrl || undefined);
                                }}
                                className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                                title="Chỉ phát âm câu hỏi"
                              >
                                Chỉ câu hỏi
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                sfx.playPop();
                                const qText = currentPattern.english;
                                const answersList = (currentPattern.answers && currentPattern.answers.length > 0)
                                  ? currentPattern.answers
                                  : primaryAnswer?.english
                                  ? [{ english: primaryAnswer.english, audioUrl: primaryAnswer.audioUrl }]
                                  : [];
                                void playDialogueAudio(
                                  qText,
                                  answersList,
                                  currentPattern.audioUrl || undefined
                                );
                              }}
                              className="px-3.5 py-1.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 active:scale-90 transition-transform cursor-pointer ring-2 ring-teal-400/30 shadow-md"
                              title="Phát âm cả câu hỏi và các câu trả lời"
                            >
                              <Volume2 size={18} />
                              <span>
                                {currentPattern.answers && currentPattern.answers.length > 1
                                  ? `Đọc cả Hỏi & ${currentPattern.answers.length} Đáp 💬`
                                  : primaryAnswer?.english
                                  ? 'Đọc cả Hỏi & Đáp 💬'
                                  : 'Phát âm mẫu câu'}
                              </span>
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-5">
                          {/* Question Visual Illustration Frame */}
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white p-2 border-4 border-teal-300 flex items-center justify-center shrink-0 group">
                            <img
                              src={getSentenceIllustration(currentPattern.english, currentPattern.imageUrl, false)}
                              alt={currentPattern.english}
                              className="w-full h-full object-contain filter group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <div className="text-center sm:text-left">
                            {/* Big Question Text */}
                            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-display tracking-wide mb-1.5 leading-tight">
                              {currentPattern.english}
                            </h2>

                            {/* Vietnamese Meaning & Pronunciation */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-slate-300 text-xs sm:text-sm font-bold">
                              {currentPattern.vietnamese && (
                                <span className="text-teal-200 bg-teal-900/50 px-3 py-0.5 rounded-xl border border-teal-500/30">
                                  {currentPattern.vietnamese}
                                </span>
                              )}
                              {currentPattern.pronunciation && (
                                <span className="text-amber-300 font-mono text-xs">
                                  /{currentPattern.pronunciation}/
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Answer Section (Reveal / Hide) */}
                      <div className="w-full mb-2.5">
                        {!isAnswerRevealed ? (
                          <button
                            onClick={() => {
                              sfx.playCorrect();
                              setIsAnswerRevealed(true);
                            }}
                            className="w-full py-3 px-5 rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer group active:scale-98"
                          >
                            <HelpCircle size={20} className="group-hover:rotate-12 transition-transform text-amber-400" />
                            <span>Bấm để lật mở câu trả lời cho bé ✨</span>
                          </button>
                        ) : (
                          <div className="w-full rounded-3xl bg-gradient-to-r from-emerald-950/70 via-teal-900/60 to-emerald-950/70 border-2 border-emerald-400 p-3 sm:p-4 relative animate-pop-in">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950 px-3 py-0.5 rounded-full border border-emerald-400/30">
                                ✨ Câu trả lời của bé
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setIsAnswerRevealed(false)}
                                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold"
                                  title="Che lại đáp án để đố tiếp"
                                >
                                  <EyeOff size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    sfx.playPop();
                                    const answersList = (currentPattern.answers && currentPattern.answers.length > 0)
                                      ? currentPattern.answers
                                      : primaryAnswer?.english
                                      ? [{ english: primaryAnswer.english, audioUrl: primaryAnswer.audioUrl }]
                                      : [{ english: currentPattern.english, audioUrl: currentPattern.audioUrl }];
                                    void playDialogueAudio('', answersList);
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white flex items-center gap-1.5 text-xs font-black active:scale-90 transition-transform cursor-pointer shadow-sm"
                                  title="Phát âm tất cả câu trả lời"
                                >
                                  <Volume2 size={16} />
                                  <span>
                                    {currentPattern.answers && currentPattern.answers.length > 1
                                      ? `Đọc cả ${currentPattern.answers.length} câu trả lời`
                                      : 'Đọc câu trả lời'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* Answer options with intuitive illustrations */}
                            <div className="space-y-2">
                              {(currentPattern.answers && currentPattern.answers.length > 0
                                ? currentPattern.answers
                                : [{ english: currentPattern.english, vietnamese: currentPattern.vietnamese, imageUrl: currentPattern.imageUrl }]
                              ).map((ans, aIdx) => (
                                <div
                                  key={ans._id || aIdx}
                                  className="flex items-center justify-between gap-3 bg-white/5 rounded-2xl p-2.5 border border-emerald-400/30"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1 border-2 border-emerald-300 shrink-0 flex items-center justify-center">
                                      <img
                                        src={getSentenceIllustration(ans.english, ans.imageUrl, true)}
                                        alt={ans.english}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <p className="text-xl sm:text-2xl md:text-3xl font-black text-amber-300 font-display leading-tight">
                                        {ans.english}
                                      </p>
                                      {ans.vietnamese && (
                                        <p className="text-emerald-200 text-xs sm:text-sm font-bold mt-0.5">
                                          {ans.vietnamese}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      sfx.playPop();
                                      playWordAudio(ans.english, ans.audioUrl || undefined);
                                    }}
                                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 hover:text-white transition-all cursor-pointer shrink-0 active:scale-90"
                                    title={`Nghe riêng câu trả lời: "${ans.english}"`}
                                  >
                                    <Volume2 size={18} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Interactive Speech & Classroom Actions */}
                      <div className="flex items-center justify-center w-full max-w-2xl px-2">
                        <KokoSpeakingCoach
                          targetWord={primaryAnswer?.english || currentPattern.english}
                          audioUrl={(primaryAnswer?.audioUrl || currentPattern.audioUrl) || undefined}
                          ageGroup={session.ageGroup}
                          contextKey={`${sessionId}:sentence:${currentPatternIndex}:${isAnswerRevealed}`}
                          onCallStudent={pickRandomStudent}
                          callStudentLabel="Gọi bé đọc"
                        />
                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="my-auto py-12 text-center text-slate-400 max-w-md mx-auto">
                  <div className="w-14 h-14 rounded-3xl bg-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-3 text-2xl">
                    💬
                  </div>
                  <p className="text-lg font-bold text-white mb-1.5">Chưa có mẫu câu riêng cho bài này</p>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    Cô giáo có thể chuyển sang trang Quản lý Mẫu câu để chọn mẫu câu từ ngân hàng 27 Unit mẫu!
                  </p>
                  <button
                    onClick={() => navigate('/teacher/sentences')}
                    className="px-4 py-2 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs sm:text-sm active:scale-95 transition-all cursor-pointer"
                  >
                    Xem ngân hàng mẫu câu 🚀
                  </button>
                </div>
              )}

              {/* Pattern Carousel Strip at bottom */}
              <div className="w-full flex items-center gap-2 overflow-x-auto pt-2.5 mt-2 border-t border-white/10 scrollbar-none">
                {patterns.map((p, idx) => (
                  <button
                    key={p._id || idx}
                    onClick={() => {
                      sfx.playPop();
                      setIsAnswerRevealed(false);
                      setCurrentPatternIndex(idx);
                    }}
                    className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-bold shrink-0 transition-all cursor-pointer ${
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

            {/* Right Col: Student Quick Panel (Tối ưu cho cả lớp nhỏ và lớp đông 20-30 bé) */}
            <StudentQuickPanel
              title="Ghi nhận mẫu câu"
              icon={<MessageSquare size={16} className="text-teal-300" />}
              accent="teal"
              scores={scores}
              onApplyScore={(sid, opts) => {
                void applyScore(sid, opts);
                const sRow = scores.find(s => (typeof s.student === 'string' ? s.student : s.student._id) === sid);
                const sName = sRow && typeof sRow.student === 'object' ? sRow.student.name : 'Bé';
                showToast(`⭐ +${opts.stars || 1} Sao cho ${sName}!`);
              }}
              onSpotlightStudent={(sc) => {
                setSpotlightPromptOverride(null);
                setSpotlightStudent(sc);
              }}
              onAwardWholeClass={handleAwardWholeClass}
              onPickRandom={pickRandomStudent}
              callLabel="Gọi đọc câu"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CLASSROOM INTERACTIVE GAMES (Trò chơi lớp học)                     */}
        {/* ========================================================================= */}
        {activeTab === 'games' && (
          <div className="mx-auto flex min-h-0 w-full max-w-[2200px] flex-1 flex-col overflow-hidden rounded-3xl border-2 border-purple-500/40 bg-slate-900/90 p-2.5 sm:p-3.5 2xl:max-w-none">
            {/* Top Switcher: Curriculum Activities vs Koko Interactive Mini-Games */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-white/10">
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-2xl border border-white/10">
                <button
                  type="button" onClick={() => setGamesCategory('curriculum')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all ${
                    gamesCategory === 'curriculum'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>🎯</span>
                  <span>Trò Chơi Theo Bài ({session.activities?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGamesCategory('interactive')}
                  className={`px-3.5 py-1.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-all ${
                    gamesCategory === 'interactive'
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-400/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>✨</span>
                  <span>Trò Chơi Tương Tác Koko (7)</span>
                </button>
              </div>

              {gamesCategory === 'interactive' && (
                <div className="flex flex-wrap items-center gap-1 bg-slate-800 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setClassroomGameMode('mystery-box')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'mystery-box' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎁 Hộp Bí Mật
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('listen-choose')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'listen-choose' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎧 Nghe & Chọn
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('true-false')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'true-false' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    👍 Đúng hay Sai
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('bubble-pop')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'bubble-pop' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🫧 Đập Bong Bóng
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('missing-object')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'missing-object' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎩 Đồ Vật Biến Mất
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('lucky-wheel')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'lucky-wheel' ? 'bg-pink-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎡 Vòng Quay Koko
                  </button>
                  <button
                    onClick={() => setClassroomGameMode('animal-sound')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      classroomGameMode === 'animal-sound' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🐾 Tiếng Kêu Con Vật
                  </button>
                </div>
              )}
            </div>

            {gamesCategory === 'curriculum' && (
              <ClassroomActivities
                session={session}
                onSave={submitQuestionResult}
                onAwardStudent={(sid, stars) => {
                  const sc = scores.find(r => (typeof r.student === 'string' ? r.student : r.student._id) === sid);
                  const sName = sc && typeof sc.student === 'object' ? sc.student.name : 'bé';
                  void applyScore(sid, { stars: stars || 1 });
                  showToast(`⭐ +${stars || 1} Sao cho ${sName}!`);
                }}
                onAwardAllCorrect={(ids, stars) => {
                  void applyBulkScore(
                    ids,
                    { stars: stars || 1 },
                    `⭐ Đã thưởng +${stars || 1} Sao cho ${ids.length} bé trả lời đúng!`
                  );
                }}
                onSpotlightStudent={(sc, prompt) => {
                  setSpotlightPromptOverride(prompt || null);
                  setSpotlightStudent(sc);
                }}
              />
            )}

            {gamesCategory === 'interactive' && (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 overflow-hidden lg:grid-cols-12 lg:gap-3">
                {/* Left 8 Cols: Interactive Game Question Stage */}
                <div className="flex min-h-0 flex-col items-center justify-between overflow-y-auto rounded-3xl border-2 border-purple-400/30 bg-slate-950/75 p-3.5 sm:p-5 text-center lg:col-span-8">
                  <div className="flex w-full items-center justify-between gap-2 mb-2">
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-3.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
                      <Sparkles size={13} />
                      {classroomGameMode === 'mystery-box'
                        ? `Món đồ ${mysteryVocabIndex + 1} / ${activeVocabList.length}`
                        : classroomGameMode === 'animal-sound'
                        ? `Câu hỏi ${(animalGameIndex % ANIMAL_ROSTER.length) + 1} / ${ANIMAL_ROSTER.length}`
                        : `Câu hỏi ${(gameQuestionIdx % activeVocabList.length) + 1} / ${activeVocabList.length}`}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          if (classroomGameMode === 'animal-sound') {
                            setAnimalGameIndex(i => (i - 1 + ANIMAL_ROSTER.length) % ANIMAL_ROSTER.length);
                            setAnimalSelectedChoiceId(null);
                            setAnimalResultStatus(null);
                          } else if (classroomGameMode === 'mystery-box') {
                            setMysteryVocabIndex(i => (i - 1 + activeVocabList.length) % activeVocabList.length);
                            setIsMysteryBoxOpen(false);
                            setMysteryPickedStudent(null);
                          } else {
                            setGameQuestionIdx(i => (i - 1 + activeVocabList.length) % activeVocabList.length);
                            setCurrentVocabIndex(i => (i - 1 + activeVocabList.length) % activeVocabList.length);
                            setListenPickSelectedId(null);
                            setListenPickStatus(null);
                            setTfSelectedResult(null);
                            setTfMatchRatio(prev => !prev);
                          }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs cursor-pointer active:scale-95"
                      >
                        <ArrowLeft size={14} />
                        <span>Câu trước</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sfx.playPop();
                          if (classroomGameMode === 'animal-sound') {
                            setAnimalGameIndex(i => i + 1);
                            setAnimalSelectedChoiceId(null);
                            setAnimalResultStatus(null);
                          } else if (classroomGameMode === 'mystery-box') {
                            setMysteryVocabIndex(i => (i + 1) % activeVocabList.length);
                            setIsMysteryBoxOpen(false);
                            setMysteryPickedStudent(null);
                          } else {
                            setGameQuestionIdx(i => (i + 1) % activeVocabList.length);
                            setCurrentVocabIndex(i => (i + 1) % activeVocabList.length);
                            setListenPickSelectedId(null);
                            setListenPickStatus(null);
                            setTfSelectedResult(null);
                            setTfMatchRatio(prev => !prev);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs cursor-pointer active:scale-95"
                      >
                        <span>Câu tiếp theo</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                  {classroomGameMode === 'mystery-box' && (
                    <div className="flex flex-col items-center my-auto w-full">
                      {!isMysteryBoxOpen ? (
                        <div className="flex flex-col items-center">
                          {mysteryPickedStudent && (
                            <div className={`mb-3 px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg flex items-center gap-2 ${isMysterySpinningStudent ? 'animate-pulse' : 'animate-bounce'}`}>
                              <span>{isMysterySpinningStudent ? '🎲 Đang quay ngẫu nhiên:' : '🎉 Mời bé:'}</span>
                              <span className="text-purple-950 underline font-black text-base">
                                {(mysteryPickedStudent.student as User)?.name || 'Bé'}
                              </span>
                              <span>{isMysterySpinningStudent ? '…' : 'lên bấm mở hộp quà nào! 🎁'}</span>
                            </div>
                          )}

                          {/* Bouncing Gift Box */}
                          <div
                            onClick={handleOpenMysteryBox}
                            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-300 p-4 flex flex-col items-center justify-center border-4 border-amber-200 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                              isMysteryShaking ? 'animate-bounce' : 'hover:animate-pulse'
                            }`}
                          >
                            <span className="text-6xl sm:text-7xl filter">🎁</span>
                            <span className="text-slate-950 font-black text-xs mt-2 bg-white/90 px-3 py-0.5 rounded-full">
                              {isMysteryShaking
                                ? 'Đang mở hộp… 🥁'
                                : mysteryPickedStudent && !isMysterySpinningStudent
                                ? `BẤM MỞ HỘP CÙNG ${(mysteryPickedStudent.student as User)?.name?.toUpperCase() || 'BÉ'}`
                                : 'BẤM ĐỂ MỞ HỘP'}
                            </span>
                          </div>

                          <h3 className="text-xl sm:text-2xl font-black text-amber-300 font-display mt-3 mb-1">
                            Chiếc Hộp Bí Mật Của Koko!
                          </h3>
                          <p className="text-slate-300 text-xs font-bold mb-3 max-w-md">
                            {mysteryPickedStudent && !isMysterySpinningStudent
                              ? `Đã chọn được bé ${(mysteryPickedStudent.student as User)?.name || ''}! Bây giờ mời bé lên chạm vào hộp quà hoặc bấm "Mở Hộp Ngay!" nhé!`
                              : 'Bấm "Quay chọn 1 bé lên mở 🎲" để chọn ngẫu nhiên 1 bạn nhỏ trước, sau đó mời bé bấm mở hộp quà!'}
                          </p>

                          <div className="flex flex-wrap items-center justify-center gap-2.5">
                            <button
                              type="button"
                              onClick={handleMysteryPickStudent}
                              disabled={isMysterySpinningStudent || isMysteryShaking}
                              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs sm:text-sm px-5 py-2.5 rounded-2xl border border-purple-400/40 active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <Shuffle size={15} className={isMysterySpinningStudent ? 'animate-spin' : ''} />
                              <span>
                                {isMysterySpinningStudent
                                  ? 'Đang quay chọn bé… 🎲'
                                  : mysteryPickedStudent
                                  ? 'Quay chọn bé khác 🎲'
                                  : 'Quay chọn 1 bé lên mở 🎲'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenMysteryBox}
                              disabled={isMysteryShaking || isMysterySpinningStudent}
                              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 text-slate-950 font-black text-xs sm:text-sm px-6 py-2.5 rounded-2xl active:scale-95 cursor-pointer disabled:opacity-50 shadow-md"
                            >
                              <Sparkles size={16} />
                              <span>
                                {mysteryPickedStudent && !isMysterySpinningStudent
                                  ? `Mời bé ${(mysteryPickedStudent.student as User)?.name || ''} Mở Hộp Ngay! 🎁`
                                  : 'Mở Hộp Ngay!'}
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center animate-fade-in w-full">
                          {mysteryPickedStudent && (
                            <div className="mb-2 px-4 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 font-black text-xs sm:text-sm flex items-center gap-1.5">
                              <span>🎉 Bé</span>
                              <span className="text-white underline font-black">
                                {(mysteryPickedStudent.student as User)?.name || 'Bé'}
                              </span>
                              <span>đã mở hộp quà thành công!</span>
                            </div>
                          )}

                          {/* Revealed Card Frame */}
                          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white p-3 border-4 border-amber-300 mb-2.5 flex items-center justify-center relative ring-4 ring-amber-400/30">
                            <img
                              src={currentMysteryVocab.imageUrl}
                              alt={currentMysteryVocab.english}
                              className="w-full h-full object-contain filter animate-scale-up"
                            />
                            <button
                              onClick={() => {
                                sfx.playPop();
                                playWordAudio(currentMysteryVocab.english, currentMysteryVocab.audioUrl);
                              }}
                              className="absolute -bottom-2 -right-2 w-11 h-11 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center active:scale-90 cursor-pointer ring-2 ring-amber-300/40"
                              title="Phát âm từ"
                            >
                              <Volume2 size={20} />
                            </button>
                          </div>

                          {/* English Word & Meaning */}
                          <h2 className="text-3xl sm:text-5xl font-black text-amber-400 font-display tracking-wide uppercase mb-1">
                            {currentMysteryVocab.english}
                          </h2>
                          <div className="flex items-center gap-2 text-slate-300 text-sm sm:text-base font-bold mb-2">
                            <span className="text-white bg-white/10 px-3 py-0.5 rounded-xl">
                              {currentMysteryVocab.vietnamese}
                            </span>
                            {currentMysteryVocab.pronunciation && (
                              <span className="text-amber-300/80 font-mono text-xs">
                                {currentMysteryVocab.pronunciation}
                              </span>
                            )}
                          </div>

                          {/* Revealed TPR Mime Action */}
                          {currentMysteryTpr && (
                            <div className="w-full max-w-lg mb-3 p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center gap-2.5">
                              <span className="text-2xl">🤸</span>
                              <div className="text-left">
                                <span className="text-amber-300 text-[11px] font-black uppercase tracking-wider block">Cử chỉ TPR của từ này:</span>
                                <span className="text-white font-extrabold text-xs sm:text-sm">{currentMysteryTpr}</span>
                              </div>
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            {mysteryPickedStudent && (
                              <button
                                type="button"
                                onClick={() => {
                                  sfx.playSuccess();
                                  const sid = typeof mysteryPickedStudent.student === 'string'
                                    ? mysteryPickedStudent.student
                                    : (mysteryPickedStudent.student as User)._id;
                                  if (sid) {
                                    void applyScore(sid, { stars: 1 }, 'correct', `⭐ Bé ${(mysteryPickedStudent.student as User)?.name} mở hộp và gọi đúng "${currentMysteryVocab.english}"!`);
                                  }
                                  showToast(`⭐ Đã thưởng +1 sao cho bé ${(mysteryPickedStudent.student as User)?.name || ''}!`);
                                }}
                                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 rounded-2xl active:scale-95 cursor-pointer shadow-md"
                              >
                                <Star size={15} className="fill-slate-950" />
                                <span>Thưởng bé {(mysteryPickedStudent.student as User)?.name} (+1 ⭐)</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                sfx.playSuccess();
                                handleAwardWholeClass(1);
                                showToast(`⭐ Cả lớp gọi đúng "${currentMysteryVocab.english}"! +1 sao!`);
                              }}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl active:scale-95 cursor-pointer"
                            >
                              <Star size={15} className="fill-white" />
                              <span>Thưởng Cả Lớp (+1 ⭐)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsMysteryBoxOpen(false);
                                setMysteryPickedStudent(null);
                                setMysteryVocabIndex((prev) => (prev + 1) % activeVocabList.length);
                                sfx.playPop();
                              }}
                              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl active:scale-95 cursor-pointer"
                            >
                              <Gift size={15} />
                              <span>Hộp Tiếp Theo ➔</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {classroomGameMode === 'listen-choose' && (
                    <div className="flex flex-col items-center my-auto w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          onClick={() => playWordAudio(gameTargetVocab.english, gameTargetVocab.audioUrl)}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center active:scale-95 cursor-pointer ring-4 ring-sky-400/30 animate-pulse hover:scale-105 transition-all"
                          title="Bấm để nghe phát âm"
                        >
                          <Volume2 size={32} />
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm font-bold mb-3">
                        Bé hãy lắng nghe âm thanh và chạm vào bức tranh đúng nhất:
                      </p>

                      {/* 4 Interactive Choice Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-3">
                        {listenChooseOptions.map((v) => {
                          const isChosen = listenPickSelectedId === v._id;
                          const isCorrectAnswer = v._id === gameTargetVocab._id || v.english === gameTargetVocab.english;

                          let borderClass = 'border-white/15 bg-white/5 hover:border-sky-400 hover:bg-white/10';
                          if (listenPickSelectedId) {
                            if (isCorrectAnswer) {
                              borderClass = 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/50 scale-105';
                            } else if (isChosen) {
                              borderClass = 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-400/50';
                            } else {
                              borderClass = 'border-white/5 bg-white/5 opacity-50';
                            }
                          }

                          return (
                            <button
                              key={v._id}
                              type="button"
                              onClick={() => {
                                setListenPickSelectedId(v._id);
                                if (isCorrectAnswer) {
                                  setListenPickStatus('correct');
                                  sfx.playCorrect();
                                  sfx.playBadgeChime();
                                } else {
                                  setListenPickStatus('wrong');
                                  sfx.playGentleWrong();
                                }
                              }}
                              className={`rounded-3xl border-2 p-3 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative group ${borderClass}`}
                            >
                              {listenPickSelectedId && isCorrectAnswer && (
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs animate-bounce">
                                  ✓
                                </div>
                              )}
                              {isChosen && !isCorrectAnswer && (
                                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xs">
                                  ✕
                                </div>
                              )}
                              <div className="w-20 h-20 sm:w-24 sm:h-24 mb-2 flex items-center justify-center p-2 bg-white rounded-2xl group-hover:scale-105 transition-transform">
                                <img src={v.imageUrl} alt="" className="w-full h-full object-contain" />
                              </div>
                              <span className="font-black text-sm sm:text-base text-white tracking-wide">{v.english}</span>
                              <span className="text-[11px] text-slate-300 font-medium">{v.vietnamese}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Feedback & Actions */}
                      {listenPickStatus === 'correct' && (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 animate-fade-in bg-emerald-500/15 border border-emerald-400/50 px-4 py-2.5 rounded-2xl">
                          <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs sm:text-sm">
                            <CheckCircle2 size={18} className="text-emerald-400" />
                            <span>Chính xác! Đó là &ldquo;{gameTargetVocab.english}&rdquo; ({gameTargetVocab.vietnamese})! 🎉</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setListenPickSelectedId(null);
                              setListenPickStatus(null);
                              setCurrentVocabIndex((prev) => (prev + 1) % activeVocabList.length);
                              setGameQuestionIdx((prev) => (prev + 1) % activeVocabList.length);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                          >
                            <span>Câu tiếp theo ➔</span>
                          </button>
                        </div>
                      )}

                      {listenPickStatus === 'wrong' && (
                        <div className="flex items-center gap-2 animate-fade-in bg-rose-500/15 border border-rose-400/40 px-4 py-2 rounded-2xl text-rose-300 text-xs font-bold">
                          <XCircle size={16} className="text-rose-400 shrink-0" />
                          <span>Chưa đúng rồi! Bé hãy bấm vào chiếc loa để nghe lại nhé! 👂</span>
                          <button
                            type="button"
                            onClick={() => {
                              setListenPickSelectedId(null);
                              setListenPickStatus(null);
                              playWordAudio(gameTargetVocab.english, gameTargetVocab.audioUrl);
                            }}
                            className="ml-2 underline hover:text-white cursor-pointer"
                          >
                            Thử lại
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {classroomGameMode === 'true-false' && (() => {
                    const isMatch = tfMatchRatio;
                    const otherVocabs = activeVocabList.filter(v => v._id !== gameTargetVocab._id);
                    const displayedVocab = isMatch
                      ? gameTargetVocab
                      : (otherVocabs.length > 0 ? otherVocabs[gameQuestionIdx % otherVocabs.length] : gameTargetVocab);

                    return (
                      <div className="flex flex-col items-center my-auto w-full">
                        <p className="text-slate-400 text-xs font-bold mb-2">
                          Bé hãy quan sát hình ảnh và cho cô biết câu hỏi dưới đây là ĐÚNG hay SAI:
                        </p>

                        <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white p-2.5 border-4 border-amber-300 mb-3 flex items-center justify-center relative group">
                          <img src={gameTargetVocab.imageUrl} alt="" className="w-full h-full object-contain filter group-hover:scale-105 transition-transform" />
                          <button
                            type="button"
                            onClick={() => playWordAudio(displayedVocab.english)}
                            className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-amber-400 hover:bg-amber-300 text-amber-950 flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                            title="Nghe phát âm từ"
                          >
                            <Volume2 size={18} />
                          </button>
                        </div>

                        <h3 className="text-lg sm:text-2xl font-black text-white mb-4 text-center">
                          Đây có phải là: <span className="text-amber-400 font-display uppercase tracking-wide">&ldquo;{displayedVocab.english}&rdquo;</span> ({displayedVocab.vietnamese}) không các con?
                        </h3>

                        {/* Interactive Yes / No choice buttons */}
                        <div className="flex flex-wrap items-center justify-center gap-4 mb-3">
                          <button
                            type="button"
                            onClick={() => {
                              const correct = isMatch === true;
                              setTfSelectedResult(correct ? 'correct' : 'wrong');
                              if (correct) {
                                sfx.playCorrect();
                                sfx.playBadgeChime();
                              } else {
                                sfx.playGentleWrong();
                              }
                            }}
                            className={`py-3 px-6 rounded-2xl border-2 font-black text-base sm:text-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                              tfSelectedResult === 'correct' && isMatch === true
                                ? 'bg-emerald-500 text-white border-emerald-300 ring-4 ring-emerald-400/50 scale-105'
                                : 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30'
                            }`}
                          >
                            <CheckCircle2 size={22} />
                            <span>ĐÚNG (YES)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const correct = isMatch === false;
                              setTfSelectedResult(correct ? 'correct' : 'wrong');
                              if (correct) {
                                sfx.playCorrect();
                                sfx.playBadgeChime();
                              } else {
                                sfx.playGentleWrong();
                              }
                            }}
                            className={`py-3 px-6 rounded-2xl border-2 font-black text-base sm:text-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                              tfSelectedResult === 'correct' && isMatch === false
                                ? 'bg-rose-500 text-white border-rose-300 ring-4 ring-rose-400/50 scale-105'
                                : 'bg-rose-500/20 border-rose-400 text-rose-300 hover:bg-rose-500/30'
                            }`}
                          >
                            <XCircle size={22} />
                            <span>SAI (NO)</span>
                          </button>
                        </div>

                        {/* True/False Result feedback banner */}
                        {tfSelectedResult === 'correct' && (
                          <div className="flex flex-wrap items-center justify-center gap-2.5 animate-fade-in bg-emerald-500/15 border border-emerald-400/50 px-4 py-2.5 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs sm:text-sm">
                              <CheckCircle2 size={18} className="text-emerald-400" />
                              <span>
                                {isMatch
                                  ? `Chính xác! Tranh đúng là "${gameTargetVocab.english}"! 🎉`
                                  : `Chính xác! Tranh này là "${gameTargetVocab.english}" chứ không phải "${displayedVocab.english}"! 🎉`}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                sfx.playPop();
                                setTfSelectedResult(null);
                                setTfMatchRatio(prev => !prev);
                                setCurrentVocabIndex((prev) => (prev + 1) % activeVocabList.length);
                                setGameQuestionIdx((prev) => (prev + 1) % activeVocabList.length);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <span>Câu tiếp theo ➔</span>
                            </button>
                          </div>
                        )}

                        {tfSelectedResult === 'wrong' && (
                          <div className="flex items-center gap-2 animate-fade-in bg-rose-500/15 border border-rose-400/40 px-4 py-2 rounded-2xl text-rose-300 text-xs font-bold">
                            <XCircle size={16} className="text-rose-400 shrink-0" />
                            <span>Chưa đúng rồi! Bé hãy nhìn kỹ tranh và chọn lại nhé!</span>
                            <button
                              type="button"
                              onClick={() => setTfSelectedResult(null)}
                              className="ml-2 underline hover:text-white cursor-pointer"
                            >
                              Chọn lại
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {classroomGameMode === 'bubble-pop' && (
                    <div className="flex flex-col items-center my-auto w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          onClick={() => playWordAudio(gameTargetVocab.english, gameTargetVocab.audioUrl)}
                          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2 active:scale-95 cursor-pointer ring-4 ring-cyan-400/30 shadow-lg"
                        >
                          <Volume2 size={20} />
                          <span>Nghe từ cần đập: &ldquo;{gameTargetVocab.english}&rdquo; 🫧</span>
                        </button>
                      </div>
                      <p className="text-slate-300 text-xs sm:text-sm font-bold mb-4">
                        Mời bé chạy lên chạm vào quả bong bóng chứa hình <strong className="text-cyan-300">&ldquo;{gameTargetVocab.english}&rdquo; ({gameTargetVocab.vietnamese})</strong> để làm nổ bóng nhé!
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl mb-4">
                        {listenChooseOptions.map((v, idx) => {
                          const isPopped = poppedBubbleIds.includes(v._id);
                          const isCorrectAnswer = v._id === gameTargetVocab._id || v.english === gameTargetVocab.english;

                          return (
                            <button
                              key={v._id}
                              type="button"
                              onClick={() => {
                                if (isCorrectAnswer) {
                                  setBubbleWinStatus(true);
                                  setPoppedBubbleIds((prev) => [...prev, v._id]);
                                  sfx.playCorrect();
                                  sfx.playBadgeChime();
                                  playWordAudio(v.english, v.audioUrl);
                                } else {
                                  setPoppedBubbleIds((prev) => [...prev, v._id]);
                                  sfx.playGentleWrong();
                                }
                              }}
                              className={`relative aspect-square rounded-full border-4 p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                                isPopped && isCorrectAnswer
                                  ? 'border-emerald-300 bg-gradient-to-tr from-emerald-500/40 to-teal-400/40 scale-105 ring-4 ring-emerald-400/50'
                                  : isPopped
                                  ? 'border-rose-400/40 bg-rose-950/30 opacity-40 scale-90'
                                  : 'border-cyan-300/70 bg-gradient-to-tr from-cyan-500/30 via-sky-400/20 to-white/25 hover:scale-105 shadow-[inset_0_0_24px_rgba(255,255,255,0.35)]'
                              }`}
                              style={{ animationDelay: `${idx * 150}ms` }}
                            >
                              <div className="absolute top-3 left-5 w-4 h-2 rounded-full bg-white/60 -rotate-45 pointer-events-none" />
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 p-2 mb-1.5 flex items-center justify-center shadow-inner">
                                <img src={v.imageUrl} alt={v.english} className="w-full h-full object-contain" />
                              </div>
                              <span className="font-black text-xs sm:text-sm text-white drop-shadow">{v.english}</span>
                              <span className="text-[10px] text-cyan-200 font-bold">{v.vietnamese}</span>
                              {isPopped && (
                                <span className="absolute inset-0 flex items-center justify-center text-4xl font-black drop-shadow-md">
                                  {isCorrectAnswer ? '💥🎉' : '💨'}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {bubbleWinStatus && (
                        <div className="flex flex-wrap items-center justify-center gap-2.5 animate-fade-in bg-emerald-500/15 border border-emerald-400/50 px-4 py-2.5 rounded-2xl">
                          <span className="text-emerald-300 font-black text-xs sm:text-sm">
                            🫧 BÙM! Bé đập trúng bong bóng &ldquo;{gameTargetVocab.english}&rdquo; rồi! Giỏi quá!
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setPoppedBubbleIds([]);
                              setBubbleWinStatus(false);
                              setCurrentVocabIndex((prev) => (prev + 1) % activeVocabList.length);
                              setGameQuestionIdx((prev) => (prev + 1) % activeVocabList.length);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xs cursor-pointer"
                          >
                            Bong bóng tiếp theo ➔
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {classroomGameMode === 'missing-object' && (
                    <div className="flex flex-col items-center my-auto w-full">
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black">
                          {kokoMissingStage === 'MEMORIZE'
                            ? '👀 Bước 1: Cả lớp cùng đọc to & ghi nhớ 4 bức tranh trên bàn'
                            : kokoMissingStage === 'GUESS'
                            ? '🙈 Bước 2: Úm ba la! Món đồ nào vừa biến mất?'
                            : `🎉 Bước 3: Món đồ biến mất chính là "${gameTargetVocab.english}"!`}
                        </span>
                        {kokoMissingStage === 'MEMORIZE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playMysteryDrumroll();
                              setKokoMissingStage('GUESS');
                              setKokoMissingPickId(null);
                            }}
                            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs cursor-pointer active:scale-95 shadow-md"
                          >
                            🎩 Phủ khăn giấu 1 món đồ!
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              setKokoMissingStage('MEMORIZE');
                              setKokoMissingPickId(null);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                          >
                            👁️ Xem lại 4 món đồ
                          </button>
                        )}
                      </div>

                      {/* 4 Cards on Koko's Magic Tray */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-3">
                        {listenChooseOptions.map((v) => {
                          const isMissingTarget = v._id === gameTargetVocab._id || v.english === gameTargetVocab.english;
                          const isHiddenNow = kokoMissingStage === 'GUESS' && isMissingTarget;

                          return (
                            <div
                              key={v._id}
                              onClick={() => {
                                if (!isHiddenNow) playWordAudio(v.english, v.audioUrl);
                              }}
                              className={`rounded-3xl border-2 p-3 flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isHiddenNow
                                  ? 'border-dashed border-amber-400 bg-amber-500/15 animate-pulse'
                                  : isMissingTarget && kokoMissingStage === 'REVEALED'
                                  ? 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/40 scale-105'
                                  : 'border-white/15 bg-white/5 hover:border-purple-400'
                              }`}
                            >
                              {isHiddenNow ? (
                                <div className="h-28 sm:h-32 flex flex-col items-center justify-center">
                                  <span className="text-4xl sm:text-5xl mb-1">🎩❓</span>
                                  <span className="text-xs font-black text-amber-300">Cái gì biến mất?</span>
                                </div>
                              ) : (
                                <>
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 mb-1.5 flex items-center justify-center p-2 bg-white rounded-2xl">
                                    <img src={v.imageUrl} alt={v.english} className="w-full h-full object-contain" />
                                  </div>
                                  <span className="font-black text-sm sm:text-base text-white">{v.english}</span>
                                  <span className="text-[11px] text-slate-300">{v.vietnamese}</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Choice buttons when in GUESS or REVEALED stage */}
                      {kokoMissingStage !== 'MEMORIZE' && (
                        <div className="w-full max-w-2xl">
                          <p className="text-xs font-bold text-amber-300 mb-2">
                            👇 Bé chọn tên món đồ vừa biến mất:
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {listenChooseOptions.map((opt) => {
                              const isTarget = opt._id === gameTargetVocab._id || opt.english === gameTargetVocab.english;
                              const isPicked = kokoMissingPickId === opt._id;
                              return (
                                <button
                                  key={opt._id}
                                  type="button"
                                  onClick={() => {
                                    setKokoMissingPickId(opt._id);
                                    if (isTarget) {
                                      setKokoMissingStage('REVEALED');
                                      sfx.playCorrect();
                                      sfx.playBadgeChime();
                                      playWordAudio(opt.english, opt.audioUrl);
                                    } else {
                                      sfx.playGentleWrong();
                                    }
                                  }}
                                  className={`py-2 px-3 rounded-2xl border-2 font-black text-xs sm:text-sm cursor-pointer transition-all ${
                                    kokoMissingStage === 'REVEALED' && isTarget
                                      ? 'border-emerald-400 bg-emerald-500 text-slate-950 scale-105'
                                      : isPicked && !isTarget
                                      ? 'border-rose-400 bg-rose-500/20 text-rose-200'
                                      : 'border-white/15 bg-white/10 hover:bg-white/20 text-white'
                                  }`}
                                >
                                  {opt.english} ({opt.vietnamese})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {classroomGameMode === 'lucky-wheel' && (
                    <div className="flex flex-col items-center my-auto w-full">
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="px-4 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-pink-200 font-black text-xs sm:text-sm">
                          🌟 Ô thưởng hiện tại: +{wheelBonusStars} Sao!
                        </span>
                        {wheelPickedStudent && (
                          <span className="px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs sm:text-sm">
                            🎯 Mời bé: {(wheelPickedStudent.student as User)?.name || 'Bé'}
                          </span>
                        )}
                      </div>

                      <div className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-amber-400 p-2.5 mb-3 shadow-xl transition-transform duration-300 ${isWheelSpinning ? 'animate-spin' : ''}`}>
                        <div className="w-full h-full rounded-full bg-white p-3 flex flex-col items-center justify-center relative">
                          <img src={gameTargetVocab.imageUrl} alt={gameTargetVocab.english} className="w-24 h-24 sm:w-28 sm:h-28 object-contain" />
                          <button
                            type="button"
                            onClick={() => playWordAudio(gameTargetVocab.english, gameTargetVocab.audioUrl)}
                            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center cursor-pointer shadow"
                            title="Nghe phát âm"
                          >
                            <Volume2 size={16} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-2xl sm:text-4xl font-black text-amber-300 uppercase tracking-wide mb-0.5">
                        {gameTargetVocab.english}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-300 mb-4">
                        {gameTargetVocab.vietnamese} {gameTargetVocab.pronunciation ? `(${gameTargetVocab.pronunciation})` : ''}
                      </p>

                      <div className="flex flex-wrap items-center justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={handleSpinLuckyWheel}
                          disabled={isWheelSpinning}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-400 text-white font-black text-xs sm:text-sm cursor-pointer active:scale-95 shadow-lg disabled:opacity-50"
                        >
                          <Shuffle size={16} className={isWheelSpinning ? 'animate-spin' : ''} />
                          <span>{isWheelSpinning ? 'Đang quay vòng quay… 🎡' : '🎡 Quay Vòng Quay Koko!'}</span>
                        </button>

                        {wheelPickedStudent && !isWheelSpinning && (
                          <button
                            type="button"
                            onClick={() => {
                              const sid = typeof wheelPickedStudent.student === 'string'
                                ? wheelPickedStudent.student
                                : (wheelPickedStudent.student as User)._id;
                              const sName = (wheelPickedStudent.student as User)?.name || 'Bé';
                              if (sid) {
                                void applyScore(sid, { stars: wheelBonusStars, correctDelta: 1 }, 'correct', `🎡 ${sName} đọc xuất sắc từ "${gameTargetVocab.english}" trên Vòng Quay Koko! +${wheelBonusStars} ⭐`);
                                showToast(`⭐ Đã thưởng +${wheelBonusStars} sao cho ${sName}!`);
                              }
                            }}
                            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm cursor-pointer active:scale-95 shadow-md"
                          >
                            <Star size={15} className="fill-slate-950" />
                            <span>Thưởng {(wheelPickedStudent.student as User)?.name} +{wheelBonusStars} ⭐</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {classroomGameMode === 'animal-sound' && (() => {
                    const currentAnimal = ANIMAL_ROSTER[animalGameIndex % ANIMAL_ROSTER.length];
                    const otherAnimals = ANIMAL_ROSTER.filter(a => a.id !== currentAnimal.id);
                    const rotatedDistractors = [0, 1, 2].map(
                      offset => otherAnimals[(animalGameIndex * 2 + offset) % otherAnimals.length]
                    );
                    const displayChoices = [
                      currentAnimal,
                      ...rotatedDistractors
                    ].sort((a, b) => a.name.localeCompare(b.name));

                    return (
                      <div className="flex flex-col items-center my-auto w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <button
                            type="button"
                            onClick={() => {
                              sfx.playPop();
                              void playAnimalSound(currentAnimal.id).catch(() => showToast("Không phát được tiếng kêu. Vui lòng thử lại."));
                            }}
                            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base flex items-center gap-2.5 active:scale-95 transition-all ring-4 ring-amber-300/30 animate-pulse cursor-pointer"
                          >
                            <Volume2 size={22} />
                            <span>BẤM NGHE TIẾNG KÊU BÍ ẨN 🎵</span>
                          </button>
                        </div>

                        <p className="text-slate-300 text-xs sm:text-sm font-bold mb-3">
                          Bạn động vật đáng yêu nào vừa phát ra tiếng kêu thế nhỉ?
                        </p>

                        {/* 4 Interactive Animal Choice Buttons */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl mb-3">
                          {displayChoices.map((a) => {
                            const isChosen = animalSelectedChoiceId === a.id;
                            const isCorrectAnswer = a.id === currentAnimal.id;

                            let borderClass = 'border-white/15 bg-white/5 hover:border-amber-400 hover:bg-white/10';
                            if (animalSelectedChoiceId) {
                              if (isCorrectAnswer) {
                                borderClass = 'border-emerald-400 bg-emerald-500/20 ring-4 ring-emerald-400/50 scale-105';
                              } else if (isChosen) {
                                borderClass = 'border-rose-500 bg-rose-500/20 ring-4 ring-rose-400/50';
                              } else {
                                borderClass = 'border-white/5 bg-white/5 opacity-50';
                              }
                            }

                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setAnimalSelectedChoiceId(a.id);
                                  if (isCorrectAnswer) {
                                    setAnimalResultStatus('correct');
                                    sfx.playCheerFanfare();
                                  } else {
                                    setAnimalResultStatus('wrong');
                                    sfx.playGentleWrong();
                                  }
                                }}
                                className={`rounded-3xl border-2 p-3.5 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 relative group ${borderClass}`}
                              >
                                {animalSelectedChoiceId && isCorrectAnswer && (
                                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs animate-bounce">
                                    ✓
                                  </div>
                                )}
                                {isChosen && !isCorrectAnswer && (
                                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-xs">
                                    ✕
                                  </div>
                                )}
                                <span className="text-5xl sm:text-6xl mb-2 filter group-hover:scale-110 transition-transform">
                                  {a.emoji}
                                </span>
                                <span className="font-black text-base text-white tracking-wide">{a.name}</span>
                                <span className="text-[11px] text-amber-300 font-bold">{a.vi}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Animal Sound Result feedback */}
                        {animalResultStatus === 'correct' && (
                          <div className="flex flex-wrap items-center justify-center gap-2.5 animate-fade-in bg-emerald-500/15 border border-emerald-400/50 px-4 py-2.5 rounded-2xl">
                            <div className="flex items-center gap-1.5 text-emerald-300 font-black text-xs sm:text-sm">
                              <CheckCircle2 size={18} className="text-emerald-400" />
                              <span>
                                🎉 Chính xác! Đó là bạn {currentAnimal.emoji} {currentAnimal.name} ({currentAnimal.vi})! {currentAnimal.callText}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                sfx.playPop();
                                setAnimalSelectedChoiceId(null);
                                setAnimalResultStatus(null);
                                setAnimalGameIndex((prev) => prev + 1);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <span>Con vật tiếp theo ➔</span>
                            </button>
                          </div>
                        )}

                        {animalResultStatus === 'wrong' && (
                          <div className="flex items-center gap-2 animate-fade-in bg-rose-500/15 border border-rose-400/40 px-4 py-2 rounded-2xl text-rose-300 text-xs font-bold">
                            <XCircle size={16} className="text-rose-400 shrink-0" />
                            <span>Chưa phải bạn này rồi! Bé hãy bấm nghe lại tiếng kêu nhé! 👂</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAnimalSelectedChoiceId(null);
                                setAnimalResultStatus(null);
                                void playAnimalSound(currentAnimal.id).catch(() => showToast("Không phát được tiếng kêu. Vui lòng thử lại."));
                              }}
                              className="ml-2 underline hover:text-white cursor-pointer"
                            >
                              Nghe lại
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                    <span>💡 Mời bé lên chạm trực tiếp trên màn hình hoặc gọi bé bên cột phải</span>
                    <button
                      type="button"
                      onClick={pickRandomStudent}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 font-black text-xs hover:bg-amber-400/30 cursor-pointer"
                    >
                      <Mic size={13} />
                      <span>Gọi ngẫu nhiên 1 bé 🎲</span>
                    </button>
                  </div>
                </div>

                {/* Right 4 Cols: Ultra-compact Student Roster & Scoring Sidebar (Siêu gọn) */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-900/90 p-2.5 sm:p-3 lg:col-span-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Award size={16} className="text-purple-400" />
                      <h3 className="font-black text-xs sm:text-sm text-white">Danh sách bé ({scores.length})</h3>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">Chạm tên: ✓ / ✕</span>
                  </div>

                  {/* Quick mass actions */}
                  <div className="grid grid-cols-3 gap-1 mb-2 shrink-0">
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
                      className="py-1 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-black cursor-pointer"
                    >
                      ✓ Cả lớp đúng
                    </button>
                    <button
                      onClick={() => handleAwardWholeClass(1)}
                      className="py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-black cursor-pointer"
                    >
                      ⭐ Cả lớp +1
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
                      className="py-1 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-[11px] font-bold cursor-pointer"
                    >
                      Làm mới
                    </button>
                  </div>

                  {/* Ultra-compact 2-column student pills */}
                  <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 content-start pr-0.5">
                    {scores.map((sc) => {
                      const student = sc.student as User;
                      const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
                      const sName = student?.name || 'Bé yêu';
                      const ans = answers[sid] || 'NOT_ANSWERED';

                      return (
                        <div
                          key={sid}
                          className={`flex items-center justify-between gap-1 px-2 py-1 rounded-lg border transition-all ${
                            ans === 'CORRECT'
                              ? 'border-emerald-400 bg-emerald-500/20'
                              : ans === 'INCORRECT'
                              ? 'border-rose-400/60 bg-rose-500/20'
                              : 'border-white/10 bg-white/5 hover:border-purple-400/40'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => cycleAnswer(sid)}
                            className="flex items-center gap-1 min-w-0 flex-1 text-left cursor-pointer"
                            title="Bấm tên bé để đổi: Đúng (✓) / Chưa đúng (✕)"
                          >
                            <span
                              className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                                ans === 'CORRECT'
                                  ? 'bg-emerald-400 text-slate-950'
                                  : ans === 'INCORRECT'
                                  ? 'bg-rose-400 text-slate-950'
                                  : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              {ans === 'CORRECT' ? '✓' : ans === 'INCORRECT' ? '✕' : '•'}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{sName}</span>
                            <span className="text-[10px] font-black text-amber-300 shrink-0">⭐{sc.stars}</span>
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                void applyScore(sid, { stars: 1 });
                                showToast(`⭐ +1 Sao cho ${sName}!`);
                              }}
                              className="py-0.5 px-1.5 rounded bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[10px] cursor-pointer active:scale-95"
                              title="Thưởng 1 sao"
                            >
                              +1⭐
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSpotlightPromptOverride(null);
                                setSpotlightStudent(sc);
                              }}
                              className="py-0.5 px-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] cursor-pointer active:scale-95"
                              title="Gọi bé"
                            >
                              Gọi
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Save & Bulk Award bar */}
                  <div className="pt-2 mt-1.5 border-t border-white/10 flex flex-col gap-1.5 shrink-0">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAwardAllCorrect(1)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-white font-black text-xs cursor-pointer active:scale-95"
                      >
                        <Star size={12} className="fill-yellow-200 text-yellow-200" />
                        <span>Thưởng bé đúng (+1)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const index = classroomGameMode === 'animal-sound' ? animalGameIndex % ANIMAL_ROSTER.length : classroomGameMode === 'mystery-box' ? mysteryVocabIndex : gameQuestionIdx;
                          const word = classroomGameMode === 'animal-sound' ? ANIMAL_ROSTER[index].name : classroomGameMode === 'mystery-box' ? currentMysteryVocab.english : gameTargetVocab.english;
                          void submitQuestionResult(undefined, index, classroomGameMode + ': ' + word);
                        }}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer active:scale-95"
                      >
                        <CheckSquare size={12} />
                        <span>Lưu kết quả câu</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: WRAP-UP & CELEBRATION (Tổng kết & xếp hạng sao)                    */}
        {/* ========================================================================= */}
        {activeTab === 'wrapup' && (
          <div className="mx-auto flex min-h-0 w-full max-w-[2200px] flex-1 flex-col justify-between gap-3 overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-slate-900/90 p-3.5 sm:p-5 2xl:max-w-none">
            {/* Celebration Header (Removed whole-class applause button as requested) */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 flex items-center justify-center text-xl text-slate-950 font-black">
                  🏆
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">Tổng Kết & Lễ Trao Thưởng Sao Vàng</h2>
                  <p className="text-xs font-bold text-amber-300/90">
                    Khen ngợi nỗ lực của bé, nghe bài hát tạm biệt và khép lại buổi học
                  </p>
                </div>
              </div>
            </div>

            {/* Main 2-column content so everything fits without scrolling */}
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden lg:grid-cols-12">
              {/* Left 7 Cols: Star Ranking Table */}
              <section className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-amber-400/30 bg-amber-950/20 p-4 lg:col-span-7">
                <div className="flex items-center justify-between mb-2 shrink-0">
                  <h3 className="text-base sm:text-lg font-black text-amber-200">Bảng xếp hạng sao buổi học</h3>
                  <span className="text-xs font-bold text-slate-300">Tổng: ⭐ {totalStars} sao</span>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <table className="w-full text-left text-white text-sm">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-xs">
                      <tr className="border-b border-white/20 text-xs text-slate-300 uppercase">
                        <th className="p-2.5">Hạng</th>
                        <th className="p-2.5">Học sinh</th>
                        <th className="p-2.5">Đúng</th>
                        <th className="p-2.5 text-right">Sao đạt được</th>
                      </tr>
                    </thead>
                    <tbody>
                      {starRanking.map(row => {
                        const student = typeof row.student === 'object' ? row.student : { _id: row.student, name: 'Học sinh' };
                        return (
                          <tr key={student._id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-2.5 font-black text-amber-300">{row.stars > 0 ? `#${rankFor(row.stars)}` : '—'}</td>
                            <td className="p-2.5 font-bold">{student.name}</td>
                            <td className="p-2.5 text-emerald-300 font-bold">{row.correctCount || 0}</td>
                            <td className="p-2.5 text-right text-amber-200 font-black">⭐ {row.stars}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Right 5 Cols: Audible Goodbye Song + Finish Session CTA */}
              <div className="flex min-h-0 flex-col justify-between gap-3 lg:col-span-5">
                {/* Goodbye Song Card with Real Playable Audio + Vocals */}
                <div className="flex flex-1 flex-col justify-between rounded-3xl border border-purple-400/30 bg-slate-950/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎵</span>
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-white">Bài Hát Tạm Biệt (Goodbye Song)</h4>
                        <p className="text-[11px] text-purple-300 font-semibold">Giai điệu vui tươi kết hợp giọng hát tiếng Anh</p>
                      </div>
                    </div>
                    {isPlayingGoodbye ? (
                      <button
                        type="button"
                        onClick={() => {
                          stopWordAudio();
                          setIsPlayingGoodbye(false);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black cursor-pointer active:scale-95 transition-all"
                      >
                        <StopCircle size={15} /> Dừng nhạc
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingGoodbye(true);
                          void sfx.playGoodbyeSong().finally(() => setIsPlayingGoodbye(false));
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-black cursor-pointer active:scale-95 transition-all shadow-md"
                      >
                        <Play size={15} className="fill-white" /> Phát bài hát tạm biệt
                      </button>
                    )}
                  </div>

                  <div className="my-auto py-3 text-sm sm:text-base text-slate-100 font-bold leading-relaxed italic bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    &ldquo;Goodbye, goodbye, it&apos;s time to go!<br />
                    Goodbye, goodbye, I&apos;ll miss you so!<br />
                    See you tomorrow, have a wonderful day!&rdquo;
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    👋 Cô bật bài hát, vẫy tay chào các con và đập tay (high-five) từng bạn khi ra về!
                  </p>
                </div>

                {/* Finish Session Call to Action */}
                <div className="flex flex-col justify-between gap-3 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 p-4 rounded-3xl border border-emerald-500/40 shrink-0">
                  <div>
                    <h4 className="text-base font-black text-white">Khép lại buổi dạy</h4>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      Ghi nhận nội dung đã dạy, lưu số sao và xem tổng kết trước khi gửi báo cáo cho gia đình.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={ending}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 text-slate-950 font-black text-sm sm:text-base px-6 py-3 rounded-2xl active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <StopCircle size={18} />
                    <span>{ending ? 'Đang hoàn tất…' : 'Ghi nhận & Kết thúc buổi dạy'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Spotlight / Mời bé đọc Modal ─────────────────────────────────── */}
      {spotlightStudent && (
        <SpotlightModal
          score={
            session?.studentScores?.find((s) => {
              const sid = typeof s.student === 'string' ? s.student : (s.student as User)?._id;
              const targetId = typeof spotlightStudent.student === 'string' ? spotlightStudent.student : (spotlightStudent.student as User)?._id;
              return sid === targetId;
            }) || spotlightStudent
          }
          vocabPrompt={
            spotlightPromptOverride ||
            (activeTab === 'sentences'
              ? patterns[currentPatternIndex]?.english || currentVocab.english
              : activeTab === 'warmup'
              ? warmupSection === 'patterns'
                ? currentWarmupPattern?.english || currentVocab.english
                : currentWarmupVocab?.english || currentVocab.english
              : activeTab === 'games' && gamesCategory === 'interactive'
              ? classroomGameMode === 'animal-sound'
                ? ANIMAL_ROSTER[animalGameIndex % ANIMAL_ROSTER.length]?.name || currentVocab.english
                : classroomGameMode === 'mystery-box'
                ? currentMysteryVocab?.english || currentVocab.english
                : currentVocab.english
              : currentVocab.english)
          }
          sentencePrompt={
            !spotlightPromptOverride && activeTab === 'sentences' && patterns[currentPatternIndex]
              ? {
                  question: patterns[currentPatternIndex].english,
                  questionVi: patterns[currentPatternIndex].vietnamese,
                  questionAudioUrl: patterns[currentPatternIndex].audioUrl || undefined,
                  answers:
                    patterns[currentPatternIndex].answers && patterns[currentPatternIndex].answers.length > 0
                      ? patterns[currentPatternIndex].answers.map((a) => ({
                          english: a.english,
                          vietnamese: a.vietnamese,
                          audioUrl: a.audioUrl || undefined
                        }))
                      : []
                }
              : !spotlightPromptOverride && activeTab === 'warmup' && warmupSection === 'patterns' && currentWarmupPattern
              ? {
                  question: currentWarmupPattern.english,
                  questionVi: currentWarmupPattern.vietnamese,
                  questionAudioUrl: currentWarmupPattern.audioUrl || undefined,
                  answers:
                    currentWarmupPattern.answers && currentWarmupPattern.answers.length > 0
                      ? currentWarmupPattern.answers.map((a: any) => ({
                          english: a.english,
                          vietnamese: a.vietnamese,
                          audioUrl: a.audioUrl || undefined
                        }))
                      : []
                }
              : undefined
          }
          onClose={() => {
            setSpotlightPromptOverride(null);
            setSpotlightStudent(null);
          }}
          onPickAnother={pickRandomStudent}
          onApply={(opts, actionType, customMessage) => {
            const sid =
              typeof spotlightStudent.student === 'string'
                ? spotlightStudent.student
                : (spotlightStudent.student as User)._id || '';
            void applyScore(sid, opts, actionType, customMessage);
          }}
        />
      )}

      {/* ── Individual Scoring modal ─────────────────────────────────────────── */}
      {scoringStudent && (
        <ScoringModal
          score={
            session?.studentScores?.find((s) => {
              const sid = typeof s.student === 'string' ? s.student : (s.student as User)?._id;
              const targetId = typeof scoringStudent.student === 'string' ? scoringStudent.student : (scoringStudent.student as User)?._id;
              return sid === targetId;
            }) || scoringStudent
          }
          onClose={() => setScoringStudent(null)}
          onApply={(opts, actionType, customMessage) => {
            const sid =
              typeof scoringStudent.student === 'string'
                ? scoringStudent.student
                : (scoringStudent.student as User)._id || '';
            void applyScore(sid, opts, actionType, customMessage);
          }}
        />
      )}

      {/* ── Visual Joyous Scoring Celebration Effect ─────────────────────────── */}
      {celebrationEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
          <div className="relative flex flex-col items-center justify-center rounded-3xl bg-slate-900/95 border-4 border-amber-400 p-8 shadow-[0_0_80px_rgba(251,191,36,0.7)] backdrop-blur-md animate-bounce max-w-sm sm:max-w-md text-center">
            <div className="text-6xl sm:text-7xl mb-2 animate-pulse">
              {celebrationEffect.type === 'stars'
                ? '⭐🌟⭐'
                : celebrationEffect.type === 'correct'
                ? '🎯🎉✨'
                : '🏆👏🥳'}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide font-display">
              {celebrationEffect.studentName || 'Hoan Hô Cả Lớp!'}
            </h3>
            <p className="mt-1 text-base sm:text-lg font-black text-white">
              {celebrationEffect.message}
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 px-4 py-1 text-xs font-black uppercase tracking-wider">
              <span>🎉 THƯỞNG THÀNH TÍCH VUI NHỘN</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Overtime reminder ──────────────────────────────────── */}
      {isOvertimeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-400 p-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/20 text-amber-400">
              <Clock size={28} className="animate-spin" />
            </div>
            <h3 className="text-xl font-black text-white">Buổi dạy đã quá giờ dự kiến!</h3>
            <p className="text-sm text-slate-300 mt-2">
              Buổi dạy đã vượt thời lượng dự kiến {session.plannedDuration || 35} phút. Bạn có thể tiếp tục hoạt động phù hợp với trẻ hoặc ghi nhận nội dung đã dạy để khép lại buổi học.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsOvertimeModalOpen(false);
                  setOvertimeSnoozeUntil(Date.now() + 15 * 60 * 1000);
                }}
                className="flex-1 rounded-2xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white hover:bg-white/20 transition-all cursor-pointer"
              >
                Nhắc lại sau 15 phút
              </button>
              <button
                type="button"
                onClick={handleOvertimeClosure}
                className="flex-1 rounded-2xl bg-teal-600 hover:bg-teal-500 py-3 text-xs font-black text-white transition-all cursor-pointer"
              >
                Ghi nhận & Kết thúc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xác Nhận Kết Thúc Hoặc Thoát Buổi Học ────────────────── */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Ghi nhận nội dung và kết thúc buổi học"
            className="relative w-full max-w-2xl max-h-[96dvh] bg-slate-900 border-2 border-white/20 rounded-3xl p-5 sm:p-6 text-white space-y-4 animate-pop-in shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xl sm:text-2xl shrink-0">
                  🛑
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white">Kết Thúc Hoặc Tạm Dừng Buổi Học</h3>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">Chọn trạng thái để lưu kết quả và kết thúc buổi dạy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Session Progress Selection */}
            <SessionClosureForm guide={session.teachingGuide} coverage={coverage} onCoverage={setCoverage} />

            {/* Action Options in 2 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Complete and view summary */}
              <button
                type="button"
                onClick={handleCompleteAndExit}
                disabled={ending}
                className="flex flex-col justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border-2 border-emerald-500/50 transition-all cursor-pointer group active:scale-[0.99] disabled:opacity-50 text-left"
              >
                <div>
                  <div className="flex items-center gap-2 text-emerald-300 font-black text-sm sm:text-base mb-1.5">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                    <span className="whitespace-nowrap">{ending ? 'Đang lưu tổng kết…' : 'Kết Thúc & Xem Tổng Kết'}</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-300 leading-snug">
                    Lưu số sao và tiến độ buổi dạy, chuyển sang màn hình tổng kết để gửi phụ huynh.
                  </p>
                </div>
              </button>

              {/* Option 2: Pause and exit to sessions */}
              <button
                type="button"
                onClick={handlePauseAndExit}
                className="flex flex-col justify-between p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border-2 border-white/15 hover:border-amber-400/50 transition-all cursor-pointer group active:scale-[0.99] text-left"
              >
                <div>
                  <div className="flex items-center gap-2 text-amber-300 font-black text-sm sm:text-base mb-1.5">
                    <Clock size={18} className="text-amber-400 shrink-0" />
                    <span className="whitespace-nowrap">Tạm Dừng & Thoát Ra</span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-slate-400 leading-snug">
                    Lưu điểm số hiện tại và thoát ra ngoài. Bạn có thể mở lại tiếp tục dạy bất cứ lúc nào.
                  </p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">💡 Điểm số và sao của bé đều đã được tự động lưu.</span>
              <button
                type="button"
                onClick={() => setIsExitModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap text-center"
              >
                Tiếp tục ở lại dạy học
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Late Attendance Modal (Cho bé đến trễ vào lớp) ───────────── */}
      {isLateAttendanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-emerald-400/50 p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Điểm Danh Bé Đến Trễ</h3>
                  <p className="text-xs text-slate-400 font-medium">Bấm vào tên để cho bé vào lớp học ngay</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLateAttendanceModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {absentScores.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-400" />
                <p className="font-bold text-white">Cả lớp đã có mặt đầy đủ!</p>
                <p className="text-xs mt-1">Không còn bé nào vắng mặt trong buổi học này.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {absentScores.map((sc) => {
                  const stu = sc.student as User;
                  const sId = typeof sc.student === 'string' ? sc.student : stu?._id || '';
                  const sName = stu?.name || 'Học sinh';
                  return (
                    <div
                      key={sId}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <StudentAvatar student={stu} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-white truncate">{sName}</p>
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">
                            Đang ghi nhận: Vắng
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void handleMarkAttendance(sId, 'PRESENT');
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer transition-all shrink-0"
                      >
                        <UserCheck size={14} />
                        <span>Vào lớp</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsLateAttendanceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StudentQuickPanel = ({
  title,
  icon,
  accent = 'amber',
  scores,
  onApplyScore,
  onSpotlightStudent,
  onAwardWholeClass,
  onPickRandom,
  callLabel = 'Gọi đọc'
}: {
  title: string;
  icon: React.ReactNode;
  accent?: 'amber' | 'teal';
  scores: StudentSessionScore[];
  onApplyScore: (sid: string, opts: { stars?: number }) => void;
  onSpotlightStudent: (sc: StudentSessionScore) => void;
  onAwardWholeClass: (stars: number) => void;
  onPickRandom: () => void;
  callLabel?: string;
}) => {
  const [search, setSearch] = useState('');

  const filteredScores = useMemo(() => {
    if (!search.trim()) return scores;
    const q = search.trim().toLowerCase();
    return scores.filter((sc) => {
      const student = sc.student as User;
      const sName = (student?.name || '').toLowerCase();
      return sName.includes(q);
    });
  }, [scores, search]);

  const borderAccent = accent === 'teal' ? 'hover:border-teal-400/50' : 'hover:border-amber-400/50';
  const tagBg = accent === 'teal' ? 'bg-teal-500/20 text-teal-300' : 'bg-amber-500/20 text-amber-300';
  const btnStarBg = accent === 'teal' ? 'bg-teal-400 hover:bg-teal-300 text-teal-950' : 'bg-amber-400 hover:bg-amber-300 text-amber-950';

  return (
    <div className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-slate-900/90 p-2.5 sm:p-3 lg:col-span-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg ${tagBg} flex items-center justify-center`}>
            {icon}
          </div>
          <h3 className="font-black text-xs sm:text-sm text-white">{title}</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-400">{scores.length} có mặt</span>
      </div>

      {/* Master Action Bar */}
      <div className="grid grid-cols-2 gap-1.5 mb-2 shrink-0">
        <button
          type="button"
          onClick={() => onAwardWholeClass(1)}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 hover:bg-amber-500/30 text-xs font-black cursor-pointer active:scale-95 transition-all truncate"
          title="Thưởng +1 sao cho cả lớp"
        >
          <Star size={12} className="fill-amber-400 shrink-0" />
          <span className="truncate">Cả lớp +1 ⭐</span>
        </button>

        <button
          type="button"
          onClick={onPickRandom}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-200 hover:bg-purple-600/50 text-xs font-black cursor-pointer active:scale-95 transition-all truncate"
          title="Gọi ngẫu nhiên 1 bé đọc"
        >
          <Shuffle size={12} className="shrink-0" />
          <span className="truncate">🎲 Gọi ngẫu nhiên</span>
        </button>
      </div>

      {/* Quick Search bar */}
      <div className="relative mb-2 shrink-0">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Tìm tên trong ${scores.length} bé...`}
          className="w-full pl-7 pr-7 py-1 text-xs rounded-xl bg-white/10 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 transition-all font-medium"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Ultra-compact Student List (Siêu gọn) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {filteredScores.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400 italic">Không tìm thấy bé nào khớp với từ khóa.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 content-start">
            {filteredScores.map((sc) => {
              const student = sc.student as User;
              const sid = typeof sc.student === 'string' ? sc.student : student?._id || '';
              const sName = student?.name || 'Bé yêu';

              return (
                <div
                  key={sid}
                  className={`flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 ${borderAccent} transition-colors`}
                >
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="text-xs font-bold text-white truncate">{sName}</span>
                    <span className="text-[10px] font-black text-amber-300 shrink-0">⭐{sc.stars}</span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onApplyScore(sid, { stars: 1 })}
                      className={`py-0.5 px-1.5 rounded ${btnStarBg} font-black text-[10px] cursor-pointer active:scale-95 transition-all`}
                      title="Thưởng 1 sao"
                    >
                      +1⭐
                    </button>
                    <button
                      type="button"
                      onClick={() => onSpotlightStudent(sc)}
                      className="py-0.5 px-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] cursor-pointer active:scale-95 transition-all"
                      title={callLabel}
                    >
                      Gọi
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const SpotlightModal = ({
  score,
  vocabPrompt,
  sentencePrompt,
  onClose,
  onPickAnother,
  onApply
}: {
  score: StudentSessionScore;
  vocabPrompt?: string;
  sentencePrompt?: {
    question: string;
    questionVi?: string;
    questionAudioUrl?: string;
    answers: Array<{ english: string; vietnamese?: string; audioUrl?: string }>;
  };
  onClose: () => void;
  onPickAnother: () => void;
  onApply: (
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    actionType?: 'applause' | 'loud_clear' | 'excellent_pronunciation' | 'correct' | 'custom',
    customMessage?: string
  ) => void;
}) => {
  const student = score.student as User;
  const name = student?.name || 'Bé yêu';
  const [recentAward, setRecentAward] = useState<string | null>(null);
  const [awardKey, setAwardKey] = useState(0);

  const handleReward = (
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    actionType: 'applause' | 'loud_clear' | 'excellent_pronunciation' | 'correct',
    badgeText: string,
    celebrationText: string
  ) => {
    setRecentAward(badgeText);
    setAwardKey((k) => k + 1);
    onApply(opts, actionType, celebrationText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md">
      <div role="dialog" aria-modal="true" aria-labelledby="spotlight-name" className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-3xl bg-white text-slate-900 border-4 border-amber-400 p-5 sm:p-7 text-center relative">
        {/* Highlighted Gold Callout Badge (Mic icon removed as requested) */}
        <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 text-amber-950 px-6 py-2 font-black text-sm uppercase tracking-wider mb-4 border-2 border-amber-200">
          <span>🌟 Mời bé đọc</span>
        </div>

        {/* Student avatar */}
        <div className="flex justify-center mb-3">
          <StudentAvatar student={student} name={name} size="2xl" className="ring-8 ring-amber-400/90 shadow-lg" />
        </div>

        {/* Student name */}
        <h3 id="spotlight-name" className="break-words text-2xl sm:text-4xl font-black text-slate-900 leading-tight">{name}</h3>

        {/* Sentence Prompt: Full Question AND Full Answer(s) */}
        {sentencePrompt ? (
          <div className="my-3.5 space-y-2.5 text-left">
            {/* Question Box */}
            <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/90 p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 text-white px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                  ❓ Câu hỏi
                </span>
                <button
                  type="button"
                  onClick={() => playWordAudio(sentencePrompt.question, sentencePrompt.questionAudioUrl)}
                  className="inline-flex items-center gap-1 rounded-full bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 text-xs font-black cursor-pointer active:scale-95 transition-all"
                >
                  <Volume2 size={13} /> Nghe câu hỏi
                </button>
              </div>
              <p className="break-words text-xl sm:text-3xl font-black text-teal-950 leading-snug">
                &ldquo;{sentencePrompt.question}&rdquo;
              </p>
              {sentencePrompt.questionVi && (
                <p className="text-xs sm:text-sm font-bold text-teal-700 mt-0.5">
                  {sentencePrompt.questionVi}
                </p>
              )}
            </div>

            {/* Answer(s) Box */}
            {sentencePrompt.answers.length > 0 && (
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 text-white px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                    ✨ Câu trả lời
                  </span>
                </div>
                <div className="space-y-2">
                  {sentencePrompt.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 rounded-xl bg-white/90 border border-emerald-200 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-lg sm:text-2xl font-black text-emerald-950 leading-snug">
                          &ldquo;{ans.english}&rdquo;
                        </p>
                        {ans.vietnamese && (
                          <p className="text-xs sm:text-sm font-bold text-emerald-700 mt-0.5">
                            {ans.vietnamese}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => playWordAudio(ans.english, ans.audioUrl)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-black cursor-pointer active:scale-95 transition-all"
                      >
                        <Volume2 size={13} /> Nghe câu trả lời
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          vocabPrompt && (
            <div className="my-4 bg-sky-50 border-2 border-sky-200 px-4 py-4 sm:py-5 rounded-3xl flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base text-sky-800 font-extrabold uppercase tracking-wider">
                  Bé đọc to nhé!
                </span>
                <button
                  type="button"
                  onClick={() => playWordAudio(vocabPrompt)}
                  className="inline-flex items-center gap-1 rounded-full bg-sky-600 hover:bg-sky-500 text-white px-2.5 py-1 text-xs font-black cursor-pointer active:scale-95 transition-all"
                  title="Nghe mẫu"
                >
                  <Volume2 size={13} /> Nghe mẫu
                </button>
              </div>
              <span className={`break-words font-black text-sky-950 leading-tight ${vocabPrompt.length > 14 ? 'text-2xl sm:text-4xl' : 'text-4xl sm:text-6xl'}`}>
                &ldquo;{vocabPrompt}&rdquo;
              </span>
            </div>
          )
        )}

        {/* Star reward and feedback */}
        <div className="my-3 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5">
          {recentAward && (
            <div
              key={awardKey}
              role="status" className="text-base font-black text-emerald-800"
            >
              {recentAward}
            </div>
          )}
          <span className="flex items-center gap-1.5 text-xl font-black text-amber-900">
            <Star size={16} className="fill-amber-400 text-amber-400" />
            {score.stars || 0} sao
          </span>
        </div>

        {/* Reward buttons with sound & joy (3 buttons: Applause, Loud & Clear, Excellent Pronunciation) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <button
            type="button"
            onClick={() =>
              handleReward(
                {},
                'applause',
                '👏 Hoan hô!',
                `👏 Cả lớp vỗ tay hoan hô ${name}!`
              )
            }
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-sky-500/40 bg-sky-50 p-3.5 hover:bg-sky-100 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 text-2xl shadow-md shadow-sky-400/30">
              👏
            </div>
            <div>
              <p className="text-sm font-black text-sky-950">Vỗ tay khen ngợi</p>
              <p className="text-xs font-bold text-sky-700">Khích lệ tinh thần</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleReward(
                { stars: 1 },
                'loud_clear',
                '+1 ⭐ Nói to rõ ràng!',
                `🔊 ${name} nói to, rõ ràng và rất tự tin! +1 ⭐`
              )
            }
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-amber-500/40 bg-amber-50 p-3.5 hover:bg-amber-100 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow-md shadow-amber-400/30">
              <Volume2 size={24} className="stroke-[2.5]" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-500 shadow-xs text-[11px]">
                ⭐
              </span>
            </div>
            <div>
              <p className="text-sm font-black text-amber-950">Nói to rõ ràng</p>
              <p className="text-sm font-black text-amber-800">+1 ⭐</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() =>
              handleReward(
                { stars: 3, correctDelta: 1 },
                'excellent_pronunciation',
                '+3 ⭐ 🌟',
                `🌟 Tuyệt vời! ${name} phát âm cực kỳ chuẩn! +3 ⭐`
              )
            }
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-violet-500/40 bg-violet-50 p-3.5 hover:bg-violet-100 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-2xl shadow-md shadow-violet-400/30">
              🌟
            </div>
            <div>
              <p className="text-sm font-black text-violet-950">Phát âm xuất sắc</p>
              <p className="text-sm font-black text-violet-800">+3 ⭐</p>
            </div>
          </button>
        </div>

        {/* Modal Controls */}
        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            onClick={onPickAnother}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-300 bg-slate-100 py-3 text-base font-black text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <Shuffle size={16} /> Đổi bé khác
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl bg-teal-700 hover:bg-teal-800 py-3 text-base font-black text-white transition-colors cursor-pointer"
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
  onApply: (
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    actionType?: 'applause' | 'loud_clear' | 'excellent_pronunciation' | 'correct' | 'custom',
    customMessage?: string
  ) => void;
}) => {
  const student = score.student as User;
  const name = student?.name || 'Học sinh';
  const [recentAward, setRecentAward] = useState<string | null>(null);
  const [awardKey, setAwardKey] = useState(0);

  const handleReward = (
    opts: { stars?: number; correctDelta?: number; incorrectDelta?: number },
    actionType?: 'applause' | 'loud_clear' | 'excellent_pronunciation' | 'correct' | 'custom',
    badgeText?: string,
    customMessage?: string
  ) => {
    if (badgeText) {
      setRecentAward(badgeText);
      setAwardKey((k) => k + 1);
    }
    onApply(opts, actionType, customMessage);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-white/20 p-6 relative">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <StudentAvatar student={score.student as any} name={name} size="lg" />
          <div className="relative">
            {recentAward && (
              <div
                key={awardKey}
                className="absolute -top-5 left-0 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] animate-bounce pointer-events-none"
              >
                {recentAward}
              </div>
            )}
            <h3 className="text-xl font-black text-white">{name}</h3>
            <p className="text-xs text-slate-300 font-bold mt-0.5">
              ⭐ {score.stars || 0} sao &bull; ✓ {score.correctCount || 0} đúng
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <ActionBtn
            label="✓ Đúng"
            sub="ghi nhận câu trả lời"
            color="emerald"
            onClick={() =>
              handleReward(
                { correctDelta: 1, stars: 1 },
                'correct',
                '+1 Đúng & +1 ⭐',
                `🎯 Hoan hô! ${name} trả lời đúng! +1 ⭐`
              )
            }
          />
          <ActionBtn
            label="✕ Chưa đúng"
            sub="cố gắng lần sau"
            color="rose"
            onClick={() =>
              handleReward(
                { incorrectDelta: 1 },
                undefined,
                undefined,
                undefined
              )
            }
          />
          <ActionBtn
            label="⭐ +1 Sao"
            sub="khen ngợi"
            color="amber"
            onClick={() =>
              handleReward(
                { stars: 1 },
                'loud_clear',
                '+1 ⭐ ',
                `🗣️ ${name} cố gắng rất tốt! +1 ⭐`
              )
            }
          />
          <ActionBtn
            label="🎉 +3 Sao"
            sub="xuất sắc!"
            color="violet"
            onClick={() =>
              handleReward(
                { stars: 3, correctDelta: 1 },
                'excellent_pronunciation',
                '+3 ⭐ ',
                `🌟 Xuất sắc! Thưởng ${name} 3 sao vàng!`
              )
            }
          />
        </div>

        <button
          type="button"
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
