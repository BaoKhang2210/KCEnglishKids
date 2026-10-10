import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Volume2,
  PlayCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { lessonsApi } from '../../services/api';
import type { Lesson, Vocabulary, Activity } from '../../types';
import { LessonShell } from '../../components/child/lesson/LessonShell';
import { LessonTopBar } from '../../components/child/lesson/LessonTopBar';
import { ProgressDots } from '../../components/child/lesson/ProgressDots';
import { StageCompleteScreen } from '../../components/child/lesson/StageCompleteScreen';
import { LessonHub } from '../../components/child/lesson/LessonHub';
import { ParentSheetModal } from '../../components/child/lesson/ParentSheetModal';
import { TprPracticeStage } from '../../components/child/lesson/TprPracticeStage';
import { Stage3GameList } from '../../components/child/lesson/Stage3GameList';
import { KokoMascot } from '../../components/child/KokoMascot';
import { sfx, playWordAudio, stopWordAudio } from '../../utils/audio';
import { pickLessonGames } from '../../components/child/games/gameRegistry';
import {
  KOKO_FLASHCARD_CONFIG,
  PROMPT_PHRASES,
} from '../../config/kokoFlashcardConfig';

// ─────────────────────────────────────────────────────────────────────────────
//  FlashcardStage1 — Redesigned for 3–4yo Preschoolers
// ─────────────────────────────────────────────────────────────────────────────
interface FlashcardStage1Props {
  items: Vocabulary[];
  childId: string;
  onCompleteStep: () => void;
  subtitlesEnabled?: boolean;
}

type KokoState = 'INITIAL_SPEAK' | 'PROMPT_SAY' | 'WAIT_SPEAK' | 'PRAISING' | 'AUTO_ADVANCE' | 'SLEEPING';

const FlashcardStage1: React.FC<FlashcardStage1Props> = ({
  items,
  childId: _childId,
  onCompleteStep,
  subtitlesEnabled = false,
}) => {
  const [deck, setDeck] = useState<Vocabulary[]>(items);
  const [idx, setIdx] = useState(0);

  // Koko Guided Mode State Machine
  const [kokoMachineState, setKokoMachineState] = useState<KokoState>('INITIAL_SPEAK');
  const [kokoMascotExpression, setKokoMascotExpression] = useState<'happy' | 'speaking' | 'listening' | 'celebrating' | 'sleeping'>('happy');
  const [kokoSpeechText, setKokoSpeechText] = useState<string>('');
  const [passiveCardCount, setPassiveCardCount] = useState<number>(0);
  const [, setHasInteractedThisCard] = useState<boolean>(false);

  // Interactive UI States
  const [isMicListening, setIsMicListening] = useState<boolean>(false);
  const [showAutoplayUnlock, setShowAutoplayUnlock] = useState<boolean>(false);
  const [isWordSpeaking, setIsWordSpeaking] = useState<boolean>(false);
  const [celebrationStars, setCelebrationStars] = useState<boolean>(false);

  const timersRef = useRef<{
    wordDelay?: any;
    promptDelay?: any;
    speakWait?: any;
    recordMax?: any;
    praiseDuration?: any;
    autoAdvance?: any;
  }>({});

  const clearAllTimers = () => {
    if (timersRef.current.wordDelay) clearTimeout(timersRef.current.wordDelay);
    if (timersRef.current.promptDelay) clearTimeout(timersRef.current.promptDelay);
    if (timersRef.current.speakWait) clearTimeout(timersRef.current.speakWait);
    if (timersRef.current.recordMax) clearTimeout(timersRef.current.recordMax);
    if (timersRef.current.praiseDuration) clearTimeout(timersRef.current.praiseDuration);
    if (timersRef.current.autoAdvance) clearTimeout(timersRef.current.autoAdvance);
    timersRef.current = {};
  };

  useEffect(() => {
    setDeck(items);
    setIdx(0);
    setPassiveCardCount(0);
  }, [items]);

  const playWordSafe = async (wordText: string, audioUrl?: string) => {
    setIsWordSpeaking(true);
    try {
      await playWordAudio(wordText, audioUrl);
    } catch {
      setShowAutoplayUnlock(true);
    } finally {
      setIsWordSpeaking(false);
    }
  };

  // Koko Workflow
  useEffect(() => {
    if (!deck || deck.length === 0 || idx >= deck.length) {
      clearAllTimers();
      return;
    }

    const currentWord = deck[idx];
    clearAllTimers();
    setHasInteractedThisCard(false);
    setIsMicListening(false);
    setCelebrationStars(false);

    if (passiveCardCount >= KOKO_FLASHCARD_CONFIG.PASSIVE_CARDS_BEFORE_SLEEP) {
      setKokoMachineState('SLEEPING');
      setKokoMascotExpression('sleeping');
      setKokoSpeechText('Koko đang ngủ tí... Chạm Koko để cùng học nhé! 💤');
      return;
    }

    setKokoMachineState('INITIAL_SPEAK');
    setKokoMascotExpression('speaking');
    setKokoSpeechText(`Cùng nghe từ "${currentWord.english}" nhé!`);

    timersRef.current.wordDelay = setTimeout(async () => {
      await playWordSafe(currentWord.english, currentWord.audioUrl);
      setKokoMascotExpression('happy');

      timersRef.current.promptDelay = setTimeout(() => {
        setKokoMachineState('PROMPT_SAY');
        const nextPrompt = PROMPT_PHRASES[Math.floor(Math.random() * PROMPT_PHRASES.length)];
        setKokoSpeechText(nextPrompt);

        timersRef.current.speakWait = setTimeout(() => {
          setKokoMachineState('WAIT_SPEAK');
          setKokoMascotExpression('listening');
          setIsMicListening(true);

          timersRef.current.recordMax = setTimeout(() => {
            setIsMicListening(false);
            setKokoMachineState('PRAISING');
            setKokoMascotExpression('celebrating');
            setCelebrationStars(true);
            sfx.playCorrect();

            timersRef.current.praiseDuration = setTimeout(() => {
              setCelebrationStars(false);
              setKokoMachineState('AUTO_ADVANCE');

              timersRef.current.autoAdvance = setTimeout(() => {
                handleNextCardInternal(true);
              }, KOKO_FLASHCARD_CONFIG.AUTO_ADVANCE_DELAY_MS);
            }, KOKO_FLASHCARD_CONFIG.PRAISE_DURATION_MS);
          }, KOKO_FLASHCARD_CONFIG.RECORD_MAX_MS);
        }, KOKO_FLASHCARD_CONFIG.SPEAK_WAIT_WINDOW_MS);
      }, KOKO_FLASHCARD_CONFIG.PROMPT_REPEAT_DELAY_MS);
    }, KOKO_FLASHCARD_CONFIG.WORD_AUDIO_DELAY_MS);

    return () => {
      clearAllTimers();
      stopWordAudio();
    };
  }, [idx, deck, passiveCardCount]);

  const handleNextCardInternal = (isAuto = false) => {
    clearAllTimers();
    stopWordAudio();
    if (isAuto) {
      setPassiveCardCount(prev => prev + 1);
    } else {
      setPassiveCardCount(0);
    }
    if (idx + 1 < deck.length) {
      setIdx(prev => prev + 1);
    } else {
      onCompleteStep();
    }
  };

  const handleUserTouch = () => {
    setHasInteractedThisCard(true);
    setPassiveCardCount(0);
  };

  const handleTapWordOrImage = () => {
    if (!deck[idx]) return;
    handleUserTouch();
    sfx.playPop();
    playWordSafe(deck[idx].english, deck[idx].audioUrl);
  };

  const handlePrevCard = () => {
    if (idx > 0) {
      clearAllTimers();
      stopWordAudio();
      setIdx(prev => prev - 1);
      handleUserTouch();
    }
  };

  const handleWakeUpKoko = () => {
    sfx.playPop();
    setPassiveCardCount(0);
    setKokoMascotExpression('happy');
    setKokoMachineState('INITIAL_SPEAK');
    if (deck[idx]) {
      playWordSafe(deck[idx].english, deck[idx].audioUrl);
    }
  };

  const handleUnlockAudio = () => {
    setShowAutoplayUnlock(false);
    if (deck[idx]) {
      playWordSafe(deck[idx].english, deck[idx].audioUrl);
    }
  };

  if (!deck || deck.length === 0) return null;
  const currentWord = deck[idx] || deck[0];

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden relative select-none w-full">
      {/* ── TOP: ProgressDots ── */}
      <div className="flex-shrink-0 w-full pt-1 pb-1 flex flex-col items-center">
        <ProgressDots total={deck.length} current={idx} color="amber" />
      </div>

      {/* ── CENTER: Flashcard Frame ── */}
      <main className="flex-1 min-h-0 w-full flex items-center justify-center px-3 sm:px-6 py-1 overflow-hidden relative">
        {kokoMachineState === 'SLEEPING' && (
          <div
            onClick={handleWakeUpKoko}
            className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="bg-white/95 border-3 border-amber-400 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3 animate-pop-in max-w-xs text-center mx-4">
              <KokoMascot state="sleeping" size="md" interactive={false} />
              <p className="font-black text-slate-800 text-sm">
                Koko đang chợp mắt tí xíu... 💤
              </p>
              <button
                onClick={handleWakeUpKoko}
                className="py-2.5 px-6 rounded-2xl bg-amber-400 font-black text-amber-950 text-sm"
              >
                Chạm để đánh thức Koko ✨
              </button>
            </div>
          </div>
        )}

        {showAutoplayUnlock && (
          <div
            onClick={handleUnlockAudio}
            className="absolute inset-0 z-40 bg-amber-500/30 backdrop-blur-[2px] flex items-center justify-center cursor-pointer"
          >
            <button
              onClick={handleUnlockAudio}
              className="bg-white border-4 border-amber-400 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-2 animate-soft-bounce"
            >
              <PlayCircle className="w-16 h-16 text-amber-500 animate-pulse" />
              <span className="font-black text-amber-950 text-base">Chạm để nghe Koko đọc 🔊</span>
            </button>
          </div>
        )}

        <div className="w-full max-w-4xl h-full max-h-[440px] bg-white rounded-3xl border-4 border-amber-300 shadow-xl overflow-hidden flex flex-col justify-center p-3 sm:p-5 relative">
          {celebrationStars && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden">
              <span className="absolute text-5xl animate-star-spin" style={{ top: '15%', left: '20%' }}>⭐</span>
              <span className="absolute text-4xl animate-star-spin" style={{ top: '25%', right: '20%' }}>✨</span>
              <span className="absolute text-5xl animate-star-spin" style={{ bottom: '20%', left: '25%' }}>🌟</span>
              <span className="absolute text-4xl animate-star-spin" style={{ bottom: '15%', right: '20%' }}>🎉</span>
            </div>
          )}

          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 items-center justify-center min-h-0">
            {/* LEFT: HERO IMAGE */}
            <div
              onClick={handleTapWordOrImage}
              role="button"
              tabIndex={0}
              className="w-full h-full max-h-[290px] md:max-h-full rounded-2xl bg-amber-50/70 border-2 border-amber-200/80 flex items-center justify-center relative cursor-pointer group active:scale-98 transition-all overflow-hidden p-2"
            >
              {currentWord.imageUrl ? (
                <img
                  src={currentWord.imageUrl}
                  alt={currentWord.english}
                  className="max-h-full max-w-full object-contain drop-shadow-md rounded-xl transition-transform group-hover:scale-105"
                  loading="eager"
                />
              ) : (
                <span style={{ fontSize: 'clamp(3rem, 12dvh, 5.5rem)' }}>🐾</span>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleTapWordOrImage();
                }}
                style={{ width: '52px', height: '52px' }}
                className={`absolute bottom-3 right-3 rounded-2xl bg-white/95 border-2 border-amber-300 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                  isWordSpeaking ? 'ring-4 ring-amber-400 bg-amber-100 scale-110' : 'hover:bg-amber-50'
                }`}
              >
                <Volume2 className={`w-7 h-7 text-amber-700 ${isWordSpeaking ? 'animate-bounce' : ''}`} />
              </button>
            </div>

            {/* RIGHT: WORD + MEANING */}
            <div className="w-full flex flex-col items-center md:items-start justify-center gap-2 px-2 text-center md:text-left min-h-0">
              <div className="flex items-center gap-2 mb-1">
                <KokoMascot
                  state={kokoMascotExpression}
                  size="sm"
                  interactive={true}
                  onClick={handleTapWordOrImage}
                />
                {subtitlesEnabled && kokoSpeechText && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-1.5 shadow-xs max-w-xs">
                    <p className="font-black text-amber-950 text-xs leading-snug">
                      {kokoSpeechText}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleTapWordOrImage}
                className="font-black text-amber-950 uppercase tracking-wide leading-none hover:text-amber-800 active:scale-95 transition-transform cursor-pointer"
                style={{ fontSize: 'clamp(36px, 8vmin, 68px)', lineHeight: 1.1 }}
              >
                {currentWord.english}
              </button>

              <p
                className="font-black text-emerald-700 tracking-normal"
                style={{ fontSize: 'clamp(22px, 4.5vmin, 32px)' }}
              >
                {currentWord.vietnamese}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── BOTTOM ACTION BAR ── */}
      <footer className="flex-shrink-0 w-full flex items-center justify-center px-4 py-2 z-20">
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          <button
            onClick={handlePrevCard}
            disabled={idx === 0}
            style={{ width: '60px', height: '60px' }}
            className={`rounded-2xl border-2 flex items-center justify-center transition-all ${
              idx === 0
                ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 active:scale-95 cursor-pointer shadow-xs'
            }`}
          >
            <ArrowLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          <button
            onClick={handleTapWordOrImage}
            style={{ width: '74px', height: '74px' }}
            className="rounded-3xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-amber-950 flex items-center justify-center shadow-lg active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <Volume2 className="w-9 h-9 stroke-[2.5]" />
          </button>

          <button
            onClick={handleTapWordOrImage}
            style={{ width: '74px', height: '74px' }}
            className={`rounded-3xl flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isMicListening
                ? 'bg-rose-500 border-b-4 border-rose-700 text-white ring-4 ring-rose-300 animate-pulse'
                : 'bg-pink-400 hover:bg-pink-300 border-b-4 border-pink-600 text-white active:translate-y-1 active:border-b-2'
            }`}
          >
            <Mic className="w-9 h-9 stroke-[2.5]" />
          </button>

          <button
            onClick={() => handleNextCardInternal(false)}
            style={{ width: '74px', height: '74px' }}
            className="rounded-3xl bg-emerald-500 hover:bg-emerald-400 border-b-4 border-emerald-700 text-white flex items-center justify-center shadow-lg active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <ArrowRight className="w-9 h-9 stroke-[3]" />
          </button>
        </div>
      </footer>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  LessonDetailPage Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const LessonDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<1 | 2 | 3>(1);
  const [stageFinished, setStageFinished] = useState<1 | 2 | 3 | null>(null);
  const [showLessonHub, setShowLessonHub] = useState(false);
  const [showParentSheet, setShowParentSheet] = useState(false);

  // Settings
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [kokoVoice, setKokoVoice] = useState(true);
  const [subtitles, setSubtitles] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Review mode indicator
  const [, setIsReviewMode] = useState(false);

  // TPR Stats for parent sheet
  const [tprStats, setTprStats] = useState<Record<string, any>>({});

  const childId = user?._id || user?.id || 'child_guest';

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    const fetchLesson = async () => {
      try {
        if (!id) return;
        const res = await lessonsApi.getLessonById(id);
        if (res.success) {
          setLesson(res.data);
          const savedStage1 = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';
          const savedStage2 = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';
          const savedActive = localStorage.getItem(`kc_stage_active_${childId}_${id}`);

          if (savedActive === '3' && savedStage2) setActiveStage(3);
          else if (savedActive === '2' && savedStage1) setActiveStage(2);
          else if (savedStage2) setActiveStage(3);
          else if (savedStage1) setActiveStage(2);
          else setActiveStage(1);
        }
      } catch (err) {
        console.error('Failed to load lesson:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id, user, navigate, childId]);

  const rawActivities = (lesson as any)?.activities || [];
  const vocabItems: Vocabulary[] = lesson?.vocabularyItems || [];

  // Use GameRegistry to guarantee >= 3 distinct games covering 3 distinct skills
  const activities: Activity[] = pickLessonGames(rawActivities, vocabItems);

  const isStage1Completed = localStorage.getItem(`kc_stage1_${childId}_${id}`) === 'true';
  const isStage2Completed = localStorage.getItem(`kc_stage2_${childId}_${id}`) === 'true';
  const isStage3Completed = localStorage.getItem(`kc_stage3_${childId}_${id}`) === 'true';

  const handleCompleteStage1 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage1_${childId}_${id}`, 'true');
    setStageFinished(1);
  };

  const handleCompleteStage2 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage2_${childId}_${id}`, 'true');
    setStageFinished(2);
  };

  const handleCompleteStage3 = () => {
    sfx.playSuccess();
    localStorage.setItem(`kc_stage3_${childId}_${id}`, 'true');
    setStageFinished(3);
  };

  const handleSelectStage = (stage: 1 | 2 | 3) => {
    setStageFinished(null);
    setShowLessonHub(false);
    // If selecting already completed stage, mark review mode without wiping progress
    const isCompleted =
      stage === 1 ? isStage1Completed : stage === 2 ? isStage2Completed : isStage3Completed;
    setIsReviewMode(isCompleted);

    setActiveStage(stage);
    localStorage.setItem(`kc_stage_active_${childId}_${id}`, stage.toString());
  };

  return (
    <LessonShell stage={activeStage}>
      {/* ── 1. Shared LessonTopBar with Home Button & Review Stepper ── */}
      <LessonTopBar
        currentStage={activeStage}
        completedStages={{
          1: isStage1Completed,
          2: isStage2Completed,
          3: isStage3Completed,
        }}
        lessonTitle={lesson?.title}
        onBack={() => {
          if (showLessonHub) {
            setShowLessonHub(false);
          } else {
            navigate('/');
          }
        }}
        onHome={() => navigate('/')}
        onOpenParentSheet={() => setShowParentSheet(true)}
        onSelectStage={handleSelectStage}
      />

      {/* ── 2. Content Area (min-h-0, flex-1, overflow-hidden) ── */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── LessonHub: When complete all 3 stages or opened from review ── */}
        {showLessonHub ? (
          <LessonHub
            lessonTitle={lesson?.title || 'Bài học tiếng Anh'}
            totalStars={9}
            onReviewStage={(st) => handleSelectStage(st)}
            onGoHome={() => navigate('/')}
          />
        ) : stageFinished ? (
          /* ── Stage Complete Screen ── */
          <StageCompleteScreen
            stage={stageFinished}
            onNextStage={() => {
              if (stageFinished === 1) handleSelectStage(2);
              else if (stageFinished === 2) handleSelectStage(3);
              else {
                // Completed Stage 3 -> open LessonHub
                setStageFinished(null);
                setShowLessonHub(true);
              }
            }}
            onGoHome={() => navigate('/')}
          />
        ) : (
          <>
            {/* Stage 1: Exploration Flashcard */}
            {activeStage === 1 && vocabItems.length > 0 && (
              <FlashcardStage1
                items={vocabItems}
                childId={childId}
                onCompleteStep={handleCompleteStage1}
                subtitlesEnabled={subtitles}
              />
            )}

            {/* Stage 2: TPR "Listen - Find - Tap" Practice */}
            {activeStage === 2 && (
              <TprPracticeStage
                vocabulary={vocabItems}
                onCompleteStage={handleCompleteStage2}
                subtitlesEnabled={subtitles}
                onUpdateStats={(key, stat) => {
                  setTprStats(prev => ({ ...prev, [key]: stat }));
                }}
              />
            )}

            {/* Stage 3: Game Stage */}
            {activeStage === 3 && (
              <Stage3GameList
                games={activities}
                onSelectGame={(gameId) => navigate(`/activities/${gameId}`)}
              />
            )}
          </>
        )}
      </div>

      {/* ── 3. Parent Sheet Modal ── */}
      <ParentSheetModal
        isOpen={showParentSheet}
        onClose={() => setShowParentSheet(false)}
        lessonTitle={lesson?.title || ''}
        vocabulary={vocabItems}
        currentStage={activeStage}
        onJumpToStage={handleSelectStage}
        tprStats={tprStats}
        autoAdvance={autoAdvance}
        onToggleAutoAdvance={setAutoAdvance}
        kokoVoice={kokoVoice}
        onToggleKokoVoice={setKokoVoice}
        subtitles={subtitles}
        onToggleSubtitles={setSubtitles}
        muted={isMuted}
        onToggleMute={setIsMuted}
      />
    </LessonShell>
  );
};
