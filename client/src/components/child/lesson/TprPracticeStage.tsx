import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, Gift, Star, Sparkles, Check, Play } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { KokoMascot } from '../KokoMascot';
import { ProgressDots } from './ProgressDots';
import {
  STAGE_CONFIG,
  KOKO_PRAISE_ROTATION,
  KOKO_TRY_AGAIN_ROTATION,
} from '../../../config/kcStageConfig';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';

interface TprPracticeStageProps {
  vocabulary: Vocabulary[];
  onCompleteStage: () => void;
  subtitlesEnabled?: boolean;
  onUpdateStats?: (
    wordKey: string,
    stat: { firstTry: boolean; hints: number; assisted: boolean; spoken: boolean }
  ) => void;
}

export const TprPracticeStage: React.FC<TprPracticeStageProps> = ({
  vocabulary,
  onCompleteStage,
  subtitlesEnabled = false,
  onUpdateStats,
}) => {
  // 1. Divide words into rounds (e.g. 8 words -> 2 rounds of 4 words)
  const items = vocabulary.length > 0 ? vocabulary : [
    { _id: '1', english: 'Teacher', vietnamese: 'Giáo viên', imageUrl: '' },
    { _id: '2', english: 'Student', vietnamese: 'Học sinh', imageUrl: '' },
    { _id: '3', english: 'Friend', vietnamese: 'Bạn bè', imageUrl: '' },
    { _id: '4', english: 'Principal', vietnamese: 'Hiệu trưởng', imageUrl: '' },
  ];

  const totalRounds = Math.ceil(items.length / STAGE_CONFIG.WORDS_PER_ROUND);
  const [currentRound, setCurrentRound] = useState(0);

  // Slice current round items
  const roundWords = items.slice(
    currentRound * STAGE_CONFIG.WORDS_PER_ROUND,
    (currentRound + 1) * STAGE_CONFIG.WORDS_PER_ROUND
  );

  // States inside a round:
  // stepType: 'tpr_find' | 'speak_moment' | 'gift_reward'
  const [stepType, setStepType] = useState<'tpr_find' | 'speak_moment' | 'gift_reward'>('tpr_find');
  const [targetIdxInRound, setTargetIdxInRound] = useState(0);

  // Target word for current trial
  const currentTarget = roundWords[targetIdxInRound] || roundWords[0];

  // Distractors in scene: 2 items on step 0, 3 items on step >= 1
  const [visibleItems, setVisibleItems] = useState<Vocabulary[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [highlightTarget, setHighlightTarget] = useState(false);
  const [feedbackLock, setFeedbackLock] = useState(false);
  const [kokoSpeech, setKokoSpeech] = useState<string>('');
  const [kokoState, setKokoState] = useState<'happy' | 'speaking' | 'listening' | 'celebrating' | 'sleepy' | 'encouraging'>('speaking');

  // Stats for current word
  const currentStatRef = useRef({
    firstTry: true,
    hints: 0,
    assisted: false,
    spoken: false,
  });

  // Timers ref
  const timersRef = useRef<{
    hintTimer?: any;
    idleTimer?: any;
    autoAdvanceTimer?: any;
  }>({});

  const clearAllTimers = () => {
    if (timersRef.current.hintTimer) clearTimeout(timersRef.current.hintTimer);
    if (timersRef.current.idleTimer) clearTimeout(timersRef.current.idleTimer);
    if (timersRef.current.autoAdvanceTimer) clearTimeout(timersRef.current.autoAdvanceTimer);
  };

  // Play audio command: "Find the ___" or target word
  const playTargetCommand = (word: Vocabulary) => {
    stopWordAudio();
    setKokoState('speaking');
    setKokoSpeech(`Tìm ${word.vietnamese || word.english} nhé! 🔍`);
    // Pronounce the word
    playWordAudio(word.english, word.audioUrl);
  };

  // Setup visible items for current target
  useEffect(() => {
    if (stepType !== 'tpr_find' || !currentTarget) return;

    clearAllTimers();
    setAttempts(0);
    setHighlightTarget(false);
    setFeedbackLock(false);
    currentStatRef.current = {
      firstTry: true,
      hints: 0,
      assisted: false,
      spoken: false,
    };

    // Determine number of objects in scene: 2 for first target, 3 for later
    const pool = roundWords.filter((w) => w.english !== currentTarget.english);
    const neededDistractors = targetIdxInRound === 0 ? 1 : Math.min(2, pool.length);
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const distractors = shuffledPool.slice(0, neededDistractors);

    // Combine & shuffle visible objects
    const sceneItems = [currentTarget, ...distractors].sort(() => 0.5 - Math.random());
    setVisibleItems(sceneItems);

    // Play command
    const t = setTimeout(() => {
      playTargetCommand(currentTarget);
    }, 400);

    // Step 0 hint delay is early, later is longer
    const hintDelay =
      targetIdxInRound === 0
        ? STAGE_CONFIG.HINT_DELAY_EARLY_MS
        : STAGE_CONFIG.HINT_DELAY_LATE_MS;

    timersRef.current.hintTimer = setTimeout(() => {
      setHighlightTarget(true);
      currentStatRef.current.hints += 1;
    }, hintDelay);

    return () => {
      clearTimeout(t);
      clearAllTimers();
    };
  }, [currentRound, targetIdxInRound, stepType]);

  // Handle baby tapping an item in the classroom scene
  const handleTapItem = (item: Vocabulary) => {
    if (feedbackLock || stepType !== 'tpr_find') return;

    if (item.english === currentTarget.english) {
      // CORRECT!
      setFeedbackLock(true);
      clearAllTimers();
      sfx.playCorrect();
      setKokoState('celebrating');

      const praise =
        KOKO_PRAISE_ROTATION[Math.floor(Math.random() * KOKO_PRAISE_ROTATION.length)];
      setKokoSpeech(praise);

      // Record stats
      onUpdateStats?.(currentTarget.english.toLowerCase(), currentStatRef.current);

      // Advance
      timersRef.current.autoAdvanceTimer = setTimeout(() => {
        if (targetIdxInRound + 1 < roundWords.length) {
          setTargetIdxInRound((prev) => prev + 1);
        } else {
          // Finished all 4 find tasks -> go to speak moment
          setStepType('speak_moment');
        }
      }, 1500);
    } else {
      // WRONG ATTEMPT (Gentle, no negative buzzer, no red X)
      sfx.playGentleWrong();
      currentStatRef.current.firstTry = false;
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      if (nextAttempts === 1) {
        setKokoState('encouraging');
        const retryPhrase =
          KOKO_TRY_AGAIN_ROTATION[
            Math.floor(Math.random() * KOKO_TRY_AGAIN_ROTATION.length)
          ];
        setKokoSpeech(retryPhrase);
        setTimeout(() => {
          playTargetCommand(currentTarget);
        }, 1000);
      } else if (nextAttempts === 2) {
        setHighlightTarget(true);
        currentStatRef.current.hints += 1;
        playTargetCommand(currentTarget);
      } else {
        // Attempt >= 3 -> full assist
        setHighlightTarget(true);
        currentStatRef.current.assisted = true;
        setKokoState('speaking');
        setKokoSpeech(`Ở đây nè bé ơi! 👉`);
        playTargetCommand(currentTarget);
      }
    }
  };

  // Speak Moment: Koko asks, baby speaks
  const handleCompleteSpeakMoment = () => {
    sfx.playCorrect();
    currentStatRef.current.spoken = true;
    setStepType('gift_reward');
  };

  // Gift Reward Box opened
  const handleOpenGift = () => {
    sfx.playStarFanfare();
    setTimeout(() => {
      if (currentRound + 1 < totalRounds) {
        // Next Round
        setCurrentRound((prev) => prev + 1);
        setTargetIdxInRound(0);
        setStepType('tpr_find');
      } else {
        // Finished Stage 2 completely!
        onCompleteStage();
      }
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between min-h-0 relative select-none">
      {/* ── TOP SECTION: ProgressDots (No "1/8" text) ── */}
      <div className="flex-shrink-0 w-full pt-1 pb-1 flex flex-col items-center">
        <ProgressDots
          total={items.length}
          current={currentRound * STAGE_CONFIG.WORDS_PER_ROUND + targetIdxInRound}
          color="teal"
        />
      </div>

      {/* ── MAIN CLASSROOM TPR SCENE ── */}
      <div className="flex-1 w-full max-w-4xl min-h-0 px-2 sm:px-4 py-1 flex flex-col justify-center relative">
        {stepType === 'tpr_find' && (
          <div className="w-full h-full max-h-[460px] bg-gradient-to-b from-sky-100/90 via-teal-50/80 to-amber-100/70 rounded-3xl border-4 border-teal-300 shadow-xl overflow-hidden relative flex flex-col items-center justify-center p-3 sm:p-5">
            {/* Classroom background elements */}
            <div className="absolute top-3 left-4 text-3xl opacity-60 pointer-events-none">🏫</div>
            <div className="absolute top-3 right-4 text-3xl opacity-60 pointer-events-none">⭐</div>
            <div className="absolute bottom-2 left-6 text-4xl opacity-40 pointer-events-none">🌱</div>
            <div className="absolute bottom-2 right-6 text-4xl opacity-40 pointer-events-none">📚</div>

            {/* Audio repeat icon button (>=64px) at top corner of scene */}
            <button
              onClick={() => playTargetCommand(currentTarget)}
              type="button"
              aria-label="Nghe lại câu lệnh"
              style={{ width: '64px', height: '64px' }}
              className="absolute top-3 right-3 rounded-2xl bg-teal-400 hover:bg-teal-300 border-b-4 border-teal-600 text-teal-950 flex items-center justify-center shadow-lg active:translate-y-1 active:border-b-2 transition-all cursor-pointer z-20"
            >
              <Volume2 className="w-8 h-8" />
            </button>

            {/* Subtitles text (optional for parents/teachers) */}
            {subtitlesEnabled && kokoSpeech && (
              <div className="absolute top-4 bg-white/95 border-2 border-teal-300 rounded-2xl px-4 py-1 shadow-sm z-10 animate-fade-in">
                <p className="text-xs sm:text-sm font-black text-teal-950">{kokoSpeech}</p>
              </div>
            )}

            {/* Interactive Objects Container (Max 3, >=96px each) */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 z-10 my-auto">
              {visibleItems.map((item) => {
                const isTarget = item.english === currentTarget.english;
                const shouldGlow = isTarget && highlightTarget;

                return (
                  <button
                    key={item.english}
                    onClick={() => handleTapItem(item)}
                    type="button"
                    style={{ minWidth: '104px', minHeight: '104px' }}
                    aria-label={`Chạm vào ${item.vietnamese || item.english}`}
                    className={`relative rounded-3xl p-3 sm:p-4 bg-white border-4 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 shadow-lg group ${
                      shouldGlow
                        ? 'border-amber-400 ring-8 ring-amber-300 animate-soft-bounce bg-amber-50'
                        : 'border-teal-200 hover:border-teal-400 bg-white'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.english}
                        className="w-20 h-20 sm:w-28 sm:h-28 object-contain pointer-events-none drop-shadow-md group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-5xl sm:text-6xl pointer-events-none">🎒</span>
                    )}

                    {/* Word text below object */}
                    <span className="font-black text-sm sm:text-base text-slate-800 capitalize mt-1 pointer-events-none">
                      {item.vietnamese || item.english}
                    </span>

                    {/* Glowing highlight beacon */}
                    {shouldGlow && (
                      <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow">
                        ✨
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SPEAK MOMENT: "Koko asks - baby speaks" ── */}
        {stepType === 'speak_moment' && (
          <div className="w-full h-full max-h-[460px] bg-gradient-to-b from-amber-50 to-orange-50 rounded-3xl border-4 border-amber-300 shadow-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h3 className="text-xl sm:text-2xl font-black text-amber-950 mb-3">
              Cùng Koko đọc to từ này nhé! 🎤
            </h3>
            <p className="text-3xl sm:text-4xl font-black text-teal-800 uppercase tracking-wide mb-6">
              {currentTarget?.english}
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={handleCompleteSpeakMoment}
                type="button"
                aria-label="Đọc theo Koko"
                style={{ width: '84px', height: '84px' }}
                className="rounded-3xl bg-pink-500 hover:bg-pink-400 border-b-6 border-pink-700 text-white flex items-center justify-center shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer animate-soft-bounce"
              >
                <Mic className="w-10 h-10" />
              </button>
            </div>
            <p className="text-xs text-amber-700 font-bold mt-4">
              Chạm mic hoặc đọc to để nhận quà bí ẩn!
            </p>
          </div>
        )}

        {/* ── GIFT REWARD BOX ── */}
        {stepType === 'gift_reward' && (
          <div className="w-full h-full max-h-[460px] bg-gradient-to-b from-purple-50 to-pink-50 rounded-3xl border-4 border-purple-300 shadow-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <h3 className="text-2xl font-black text-purple-950 mb-2">
              Bé hoàn thành vòng {currentRound + 1}! 🎉
            </h3>
            <p className="text-sm font-bold text-purple-700 mb-6">
              Chạm hộp quà để nhận sticker lấp lánh!
            </p>

            <button
              onClick={handleOpenGift}
              type="button"
              aria-label="Mở hộp quà"
              className="p-6 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-4xl border-4 border-amber-500 shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer animate-bounce"
            >
              <Gift className="w-20 h-20 text-amber-950" />
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM GUIDE: Koko Mascot Companion ── */}
      <footer className="flex-shrink-0 w-full flex items-center justify-center py-1">
        <div className="flex items-center gap-2">
          <KokoMascot
            state={kokoState}
            size="md"
            interactive={true}
            onClick={() => playTargetCommand(currentTarget)}
          />
        </div>
      </footer>
    </div>
  );
};
