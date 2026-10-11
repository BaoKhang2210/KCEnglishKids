import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Mic, Gift } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { KokoMascot } from '../KokoMascot';
import { ProgressDots } from './ProgressDots';
import { ChoiceCard } from '../common/ChoiceCard';
import { useFitGrid } from '../../../hooks/useFitGrid';
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
  showCaptions?: boolean;
  showVietnamese?: boolean;
  onUpdateStats?: (
    wordKey: string,
    stat: { firstTry: boolean; hints: number; assisted: boolean; spoken: boolean }
  ) => void;
}

export const TprPracticeStage: React.FC<TprPracticeStageProps> = ({
  vocabulary,
  onCompleteStage,
  subtitlesEnabled = false,
  showCaptions = true,
  showVietnamese = false,
  onUpdateStats,
}) => {
  const rawItems = vocabulary && vocabulary.length > 0 ? vocabulary : [
    { _id: '1', english: 'Teacher', vietnamese: 'Giáo viên', imageUrl: '' },
    { _id: '2', english: 'Student', vietnamese: 'Học sinh', imageUrl: '' },
    { _id: '3', english: 'Friend', vietnamese: 'Bạn bè', imageUrl: '' },
    { _id: '4', english: 'Principal', vietnamese: 'Hiệu trưởng', imageUrl: '' },
  ];

  // Sanitize items so every element is defined and has an english string
  const items = rawItems.filter((w): w is Vocabulary => !!w && typeof w.english === 'string');

  const totalRounds = Math.max(1, Math.ceil(items.length / STAGE_CONFIG.WORDS_PER_ROUND));
  const [currentRound, setCurrentRound] = useState(0);

  const roundWords = items.slice(
    currentRound * STAGE_CONFIG.WORDS_PER_ROUND,
    (currentRound + 1) * STAGE_CONFIG.WORDS_PER_ROUND
  );

  const [stepType, setStepType] = useState<'tpr_find' | 'speak_moment' | 'gift_reward'>('tpr_find');
  const [targetIdxInRound, setTargetIdxInRound] = useState(0);

  const currentTarget = roundWords[targetIdxInRound] || roundWords[0] || items[0] || {
    _id: 'default',
    english: 'Teacher',
    vietnamese: 'Giáo viên',
    imageUrl: '',
  };

  const [visibleItems, setVisibleItems] = useState<Vocabulary[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [highlightTarget, setHighlightTarget] = useState(false);
  const [feedbackLock, setFeedbackLock] = useState(false);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [kokoSpeech, setKokoSpeech] = useState<string>('');
  const [kokoState, setKokoState] = useState<'happy' | 'speaking' | 'listening' | 'celebrating' | 'sleepy' | 'encouraging'>('speaking');

  // Measure card container size with ResizeObserver
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [containerDims, setContainerDims] = useState({ w: 800, h: 420 });

  useEffect(() => {
    if (!cardContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(cardContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute massive card layout using useFitGrid
  const { cardSize, gap } = useFitGrid(
    visibleItems.length,
    containerDims.w,
    containerDims.h,
    440 // MAX_CARD up to 440px
  );

  const currentStatRef = useRef({
    firstTry: true,
    hints: 0,
    assisted: false,
    spoken: false,
  });

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

  const playTargetCommand = (word: Vocabulary) => {
    stopWordAudio();
    setKokoState('speaking');
    setKokoSpeech(`Tìm ${word.vietnamese || word.english} nhé! 🔍`);
    playWordAudio(word.english, word.audioUrl);
  };

  useEffect(() => {
    if (stepType !== 'tpr_find' || !currentTarget) return;

    clearAllTimers();
    setAttempts(0);
    setHighlightTarget(false);
    setFeedbackLock(false);
    setSelectedWordId(null);
    setFeedbackStatus('idle');

    currentStatRef.current = {
      firstTry: true,
      hints: 0,
      assisted: false,
      spoken: false,
    };

    // 2 cards for round 1 / trial 0, max 3 cards for subsequent trials
    const pool = roundWords.filter((w) => w.english !== currentTarget.english);
    const neededDistractors = targetIdxInRound === 0 ? 1 : Math.min(2, pool.length);
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const distractors = shuffledPool.slice(0, neededDistractors);

    const sceneItems = [currentTarget, ...distractors].sort(() => 0.5 - Math.random());
    setVisibleItems(sceneItems);

    const t = setTimeout(() => {
      playTargetCommand(currentTarget);
    }, 400);

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

  const handleTapItem = (item: Vocabulary) => {
    if (feedbackLock || stepType !== 'tpr_find') return;

    setSelectedWordId(item.english);

    if (item.english === currentTarget.english) {
      setFeedbackLock(true);
      setFeedbackStatus('correct');
      clearAllTimers();
      sfx.playCorrect();
      setKokoState('celebrating');

      const praise =
        KOKO_PRAISE_ROTATION[Math.floor(Math.random() * KOKO_PRAISE_ROTATION.length)];
      setKokoSpeech(praise);

      onUpdateStats?.(currentTarget.english.toLowerCase(), currentStatRef.current);

      timersRef.current.autoAdvanceTimer = setTimeout(() => {
        if (targetIdxInRound + 1 < roundWords.length) {
          setTargetIdxInRound((prev) => prev + 1);
        } else {
          setStepType('speak_moment');
        }
      }, 1500);
    } else {
      setFeedbackStatus('wrong');
      sfx.playGentleWrong();
      currentStatRef.current.firstTry = false;
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);

      setTimeout(() => {
        setFeedbackStatus('idle');
        setSelectedWordId(null);
      }, 800);

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
      } else {
        setHighlightTarget(true);
        currentStatRef.current.hints += 1;
        if (nextAttempts >= 3) {
          currentStatRef.current.assisted = true;
          setKokoSpeech(`Ở đây nè bé ơi! 👉`);
        }
        playTargetCommand(currentTarget);
      }
    }
  };

  const handleCompleteSpeakMoment = () => {
    sfx.playCorrect();
    currentStatRef.current.spoken = true;
    setStepType('gift_reward');
  };

  const handleOpenGift = () => {
    sfx.playStarFanfare();
    setTimeout(() => {
      if (currentRound + 1 < totalRounds) {
        setCurrentRound((prev) => prev + 1);
        setTargetIdxInRound(0);
        setStepType('tpr_find');
      } else {
        onCompleteStage();
      }
    }, 1500);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between min-h-0 relative select-none">
      {/* ── TOP: ProgressDots ── */}
      <div className="flex-shrink-0 w-full pt-1 pb-1 flex flex-col items-center">
        <ProgressDots
          total={items.length}
          current={currentRound * STAGE_CONFIG.WORDS_PER_ROUND + targetIdxInRound}
          color="teal"
        />
      </div>

      {/* ── MAIN 2-ZONE LAYOUT: (Left: Koko + Speaker | Right: Massive Cards) ── */}
      <div className="flex-1 w-full max-w-6xl min-h-0 px-3 sm:px-6 py-1 flex flex-col md:flex-row items-center justify-between gap-4 relative">
        {stepType === 'tpr_find' && (
          <>
            {/* ── LEFT ZONE: Koko Guide (>=96px) + Speaker Button (>=72px) ── */}
            <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-3 md:gap-5 w-full md:w-auto md:min-w-[180px]">
              <KokoMascot
                state={kokoState}
                size="md"
                interactive={true}
                onClick={() => playTargetCommand(currentTarget)}
              />

              {/* Big Audio Repeat Button (>= 72px) */}
              <button
                onClick={() => playTargetCommand(currentTarget)}
                type="button"
                aria-label="Nghe lại câu lệnh"
                style={{ width: 'clamp(72px, 14cqmin, 96px)', height: 'clamp(72px, 14cqmin, 96px)' }}
                className="rounded-3xl bg-teal-400 hover:bg-teal-300 border-b-6 border-teal-600 text-teal-950 flex items-center justify-center shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer animate-soft-bounce"
              >
                <Volume2 className="w-9 h-9 sm:w-11 sm:h-11" />
              </button>

              {subtitlesEnabled && kokoSpeech && (
                <div className="bg-white/95 border-2 border-teal-300 rounded-2xl px-3 py-1 shadow-sm max-w-[200px] text-center animate-fade-in">
                  <p className="text-xs font-black text-teal-950">{kokoSpeech}</p>
                </div>
              )}
            </div>

            {/* ── RIGHT ZONE: Massive Cards Area (Fills space via useFitGrid) ── */}
            <div
              ref={cardContainerRef}
              className="flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden p-1"
            >
              <div
                style={{ gap: `${gap}px` }}
                className="flex flex-wrap items-center justify-center my-auto"
              >
                {visibleItems
                  .filter((item): item is Vocabulary => !!item && !!item.english)
                  .map((item) => {
                    const isTarget = item.english === currentTarget?.english;
                    const isSelected = selectedWordId === item.english;
                    const cardStatus =
                      isSelected && feedbackStatus === 'correct'
                        ? 'correct'
                        : isSelected && feedbackStatus === 'wrong'
                        ? 'wrong'
                        : isTarget && highlightTarget
                        ? 'hint'
                        : 'idle';

                    return (
                      <ChoiceCard
                        key={item._id || item.english}
                        item={item}
                        size={cardSize}
                        isSelected={isSelected}
                        status={cardStatus}
                        onClick={() => handleTapItem(item)}
                        disabled={feedbackLock}
                        showCaption={showCaptions}
                        showVietnamese={showVietnamese}
                      />
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* ── SPEAK MOMENT ── */}
        {stepType === 'speak_moment' && (
          <div className="w-full h-full max-h-[460px] bg-gradient-to-b from-amber-50 to-orange-50 rounded-4xl border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in my-auto">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-950 mb-3">
              Cùng Koko đọc to từ này nhé! 🎤
            </h3>
            <p className="text-4xl sm:text-5xl font-black text-teal-800 uppercase tracking-wide mb-6">
              {currentTarget?.english}
            </p>

            <button
              onClick={handleCompleteSpeakMoment}
              type="button"
              aria-label="Đọc theo Koko"
              style={{ width: '96px', height: '96px' }}
              className="rounded-4xl bg-pink-500 hover:bg-pink-400 border-b-6 border-pink-700 text-white flex items-center justify-center shadow-2xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer animate-soft-bounce"
            >
              <Mic className="w-12 h-12" />
            </button>
          </div>
        )}

        {/* ── GIFT REWARD BOX ── */}
        {stepType === 'gift_reward' && (
          <div className="w-full h-full max-h-[460px] bg-gradient-to-b from-purple-50 to-pink-50 rounded-4xl border-4 border-purple-300 shadow-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in my-auto">
            <h3 className="text-3xl font-black text-purple-950 mb-2">
              Bé hoàn thành vòng {currentRound + 1}! 🎉
            </h3>
            <p className="text-base font-bold text-purple-700 mb-6">
              Chạm hộp quà để nhận sticker lấp lánh!
            </p>

            <button
              onClick={handleOpenGift}
              type="button"
              aria-label="Mở hộp quà"
              className="p-8 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-4xl border-4 border-amber-500 shadow-2xl hover:scale-105 active:scale-95 transition-transform cursor-pointer animate-bounce"
            >
              <Gift className="w-24 h-24 text-amber-950" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 h-1" />
    </div>
  );
};
