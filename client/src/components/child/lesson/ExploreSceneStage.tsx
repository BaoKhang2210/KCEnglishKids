import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, ArrowLeft, ArrowRight, RotateCcw, Check, Sparkles } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { playWordAudio, stopWordAudio, sfx } from '../../../utils/audio';
import { KokoMascot } from '../KokoMascot';

interface ExploreSceneStageProps {
  vocabulary: Vocabulary[];
  bigQuestion?: string;
  storyTitle?: string;
  onComplete: () => void;
}

// Pastel vibrant color schemes matching kid aesthetics
const CARD_THEMES = [
  {
    bg: 'from-amber-100/90 via-orange-50 to-amber-50',
    border: 'border-amber-300',
    ring: 'ring-amber-200',
    pill: 'bg-amber-100 text-amber-900 border-amber-300',
    btn: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-amber-300/60',
    audioBtn: 'bg-amber-500 text-white shadow-amber-300/60',
    audioPulse: 'bg-amber-400/30'
  },
  {
    bg: 'from-sky-100/90 via-blue-50 to-cyan-50',
    border: 'border-sky-300',
    ring: 'ring-sky-200',
    pill: 'bg-sky-100 text-sky-900 border-sky-300',
    btn: 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white shadow-sky-300/60',
    audioBtn: 'bg-sky-500 text-white shadow-sky-300/60',
    audioPulse: 'bg-sky-400/30'
  },
  {
    bg: 'from-emerald-100/90 via-teal-50 to-green-50',
    border: 'border-emerald-300',
    ring: 'ring-emerald-200',
    pill: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    btn: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-300/60',
    audioBtn: 'bg-emerald-500 text-white shadow-emerald-300/60',
    audioPulse: 'bg-emerald-400/30'
  },
  {
    bg: 'from-rose-100/90 via-pink-50 to-red-50',
    border: 'border-rose-300',
    ring: 'ring-rose-200',
    pill: 'bg-rose-100 text-rose-900 border-rose-300',
    btn: 'bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white shadow-rose-300/60',
    audioBtn: 'bg-rose-500 text-white shadow-rose-300/60',
    audioPulse: 'bg-rose-400/30'
  },
  {
    bg: 'from-purple-100/90 via-fuchsia-50 to-indigo-50',
    border: 'border-purple-300',
    ring: 'ring-purple-200',
    pill: 'bg-purple-100 text-purple-900 border-purple-300',
    btn: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white shadow-purple-300/60',
    audioBtn: 'bg-purple-500 text-white shadow-purple-300/60',
    audioPulse: 'bg-purple-400/30'
  }
];

const EMOJI_MAP: Record<string, string> = {
  pencil: '✏️', book: '📖', eraser: '🧼', ruler: '📏', bag: '🎒',
  crayon: '🖍️', scissors: '✂️', desk: '🪑', school: '🏫', apple: '🍎',
  cat: '🐱', dog: '🐶', bird: '🐦', lion: '🦁', fish: '🐟',
  duck: '🦆', cow: '🐮', frog: '🐸', monkey: '🐵', red: '🔴',
  blue: '🔵', yellow: '🟡', green: '🟢', orange: '🟠', purple: '🟣'
};

export const ExploreSceneStage: React.FC<ExploreSceneStageProps> = ({
  vocabulary = [],
  bigQuestion: _bigQuestion = 'What do we do at school?',
  storyTitle: _storyTitle,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [needsGestureHint, setNeedsGestureHint] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(false);

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalWords = vocabulary.length;
  const currentWord: Vocabulary | undefined = vocabulary[currentIndex];
  const isFirstWord = currentIndex === 0;
  const isLastWord = currentIndex === totalWords - 1;
  const currentTheme = CARD_THEMES[currentIndex % CARD_THEMES.length];

  // Stop audio and cleanup on unmount
  useEffect(() => {
    return () => {
      stopWordAudio();
    };
  }, []);

  // Preload next word image & audio
  useEffect(() => {
    if (totalWords <= 1) return;
    const nextIdx = (currentIndex + 1) % totalWords;
    const nextWord = vocabulary[nextIdx];
    if (nextWord?.imageUrl) {
      const img = new Image();
      img.src = nextWord.imageUrl;
    }
    if (nextWord?.audioUrl) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = nextWord.audioUrl;
    }
  }, [currentIndex, totalWords, vocabulary]);

  // Pronounce word with smooth state handling
  const handlePronounce = useCallback((vocab?: Vocabulary, isAutoPlay = false) => {
    if (!vocab) return;
    stopWordAudio();
    setIsPlayingAudio(true);

    playWordAudio(vocab.english, vocab.audioUrl)
      .then(() => {
        setIsPlayingAudio(false);
        setNeedsGestureHint(false);
      })
      .catch(() => {
        setIsPlayingAudio(false);
        if (isAutoPlay) {
          // Browser autoplay was likely prevented, show a friendly pulsing prompt on the speaker
          setNeedsGestureHint(true);
        }
      });
  }, []);

  // Auto-pronounce on card change
  useEffect(() => {
    if (isCompleted || !currentWord) return;

    // Small delay to allow card animation to begin
    const timer = setTimeout(() => {
      handlePronounce(currentWord, true);
    }, 180);

    return () => clearTimeout(timer);
  }, [currentIndex, isCompleted, currentWord, handlePronounce]);

  // Navigate to previous word
  const handlePrev = () => {
    if (isFirstWord || isAnimating) return;
    sfx.playPop();
    setDirection('prev');
    setIsAnimating(true);
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setTimeout(() => setIsAnimating(false), 280);
  };

  // Navigate to next word or complete
  const handleNext = () => {
    if (isAnimating) return;
    sfx.playPop();

    if (isLastWord) {
      sfx.playSuccess();
      sfx.playApplause();
      setIsCompleted(true);
      return;
    }

    setDirection('next');
    setIsAnimating(true);
    setCurrentIndex(prev => Math.min(totalWords - 1, prev + 1));
    setTimeout(() => setIsAnimating(false), 280);
  };

  // Reset to study again
  const handleRestart = () => {
    sfx.playPop();
    setIsCompleted(false);
    setCurrentIndex(0);
    setDirection('next');
  };

  // Keyboard navigation (Left / Right arrow)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isCompleted, isFirstWord, isLastWord, isAnimating]);

  // Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Horizontal swipe threshold: 45px and more horizontal than vertical
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        // Swiped left -> Next
        handleNext();
      } else {
        // Swiped right -> Prev
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Fallback for empty vocabulary
  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-4">
        <div className="bg-white/95 rounded-3xl p-6 sm:p-8 text-center border-4 border-dashed border-amber-200 max-w-md shadow-lg">
          <span className="text-5xl block mb-3">🔍</span>
          <h3 className="text-xl font-black text-slate-800 mb-1">Đang chuẩn bị từ vựng...</h3>
          <p className="text-slate-500 font-bold text-sm mb-5">Bài học này chưa có danh sách từ vựng.</p>
          <button
            onClick={onComplete}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            Tiếp tục bài học
          </button>
        </div>
      </div>
    );
  }

  // ── MÀN HÌNH HOÀN THÀNH CHẶNG 1 ───────────────────────────────────────────
  if (isCompleted) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-3 animate-fade-in select-none">
        <div className="w-full max-w-lg bg-gradient-to-b from-amber-50 via-white to-emerald-50 rounded-3xl border-4 border-amber-300 p-5 sm:p-7 text-center shadow-xl flex flex-col items-center gap-3">
          {/* Mascot Koko celebrating */}
          <div className="relative">
            <KokoMascot
              state="celebrating"
              size="lg"
              speechBubble="Bé giỏi quá! 🎉"
              bubblePosition="top"
              interactive={true}
            />
          </div>

          <div className="mt-1">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-extrabold mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Hoàn thành Chặng 1: Khám phá</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 leading-tight">
              Bé đã làm quen xuất sắc! 🌟
            </h2>
            <p className="text-sm sm:text-base font-bold text-slate-600 mt-1">
              Bé đã khám phá trọn vẹn <span className="text-emerald-600 font-black">{totalWords}</span> từ vựng mới của bài.
            </p>
          </div>

          {/* Action buttons: Sang Chặng 2 (Chính) & Học lại (Phụ) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mt-2">
            {/* Primary button: OnComplete to open Stage 2 */}
            <button
              onClick={() => {
                sfx.playSuccess();
                onComplete();
              }}
              aria-label="Sang Chặng 2 Luyện tập"
              className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-103 active:scale-95 transition-all cursor-pointer ring-3 ring-emerald-300/60"
            >
              <span>Sang Chặng 2 Luyện tập</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>

            {/* Secondary button: Re-study Chặng 1 */}
            <button
              onClick={handleRestart}
              aria-label="Học lại từ đầu Chặng 1"
              className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white hover:bg-amber-50 active:bg-amber-100 text-slate-700 font-black text-base border-3 border-amber-200 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[2.5]" />
              <span>Học lại</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── GIAO DIỆN FLASHCARD CHÍNH ─────────────────────────────────────────────
  const progressPercent = Math.round(((currentIndex + 1) / totalWords) * 100);
  const wordKey = (currentWord.english || '').toLowerCase().trim();
  const fallbackEmoji = EMOJI_MAP[wordKey] || (currentWord as any).category || '🌟';
  const hasImage = Boolean(currentWord.imageUrl && !imageErrorMap[currentWord._id || currentWord.english]);

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col items-center justify-between gap-1.5 sm:gap-2.5 overflow-hidden select-none py-1 px-1 sm:px-3"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. TOP PROGRESS BAR: Smooth bar & "x/y" counter */}
      <div className="w-full max-w-xl shrink-0 flex items-center gap-3 px-2">
        <div className="flex-1 h-3.5 sm:h-4 bg-amber-100/80 rounded-full border-2 border-amber-300/80 p-0.5 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="shrink-0 bg-white/95 px-3 py-0.5 rounded-full border-2 border-amber-200 shadow-2xs">
          <span className="font-black text-xs sm:text-sm text-slate-700 tracking-wide font-display">
            {currentIndex + 1} / {totalWords}
          </span>
        </div>
      </div>

      {/* 2. HERO FLASHCARD (Takes available height smoothly) */}
      <div className="flex-1 min-h-0 w-full max-w-xl flex items-center justify-center relative px-1">
        <div
          key={currentIndex}
          className={`
            w-full h-full max-h-[520px] rounded-3xl border-4 ${currentTheme.border}
            bg-gradient-to-b ${currentTheme.bg} shadow-lg flex flex-col overflow-hidden relative
            transition-transform duration-250 ease-out
            motion-reduce:transition-none
            ${direction === 'next' ? 'animate-fade-in' : 'animate-fade-in'}
          `}
          style={{ minHeight: '260px' }}
        >
          {/* Top-Right Big Sound Replay Button */}
          <div className="absolute top-2.5 right-2.5 z-20">
            <button
              onClick={() => handlePronounce(currentWord)}
              aria-label={`Nghe lại phát âm từ ${currentWord.english}`}
              title="Chạm để nghe phát âm"
              className={`
                w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center cursor-pointer
                transition-all duration-200 active:scale-90 border-3 border-white shadow-md relative
                ${currentTheme.audioBtn}
                ${needsGestureHint ? 'animate-bounce ring-4 ring-amber-300' : ''}
                ${isPlayingAudio ? 'scale-105 ring-4 ring-amber-300/80' : 'hover:scale-105'}
              `}
            >
              {/* Sound wave ripple while playing */}
              {isPlayingAudio && (
                <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${currentTheme.audioPulse}`} />
              )}
              <Volume2 className={`w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] ${isPlayingAudio ? 'animate-pulse' : ''}`} />
            </button>
          </div>

          {/* Card Top: Large Image (≥60% height), tap image to play audio */}
          <button
            type="button"
            onClick={() => handlePronounce(currentWord)}
            aria-label={`Hình ảnh của từ ${currentWord.english}. Bấm để nghe lại.`}
            className="flex-1 min-h-0 w-full flex items-center justify-center p-3 sm:p-5 relative cursor-pointer group active:scale-98 transition-transform"
          >
            {hasImage ? (
              <img
                src={currentWord.imageUrl}
                alt={currentWord.english}
                onError={() => {
                  setImageErrorMap(prev => ({
                    ...prev,
                    [currentWord._id || currentWord.english]: true
                  }));
                }}
                className={`
                  max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-200
                  ${isPlayingAudio ? 'scale-105' : 'group-hover:scale-103'}
                `}
                draggable={false}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <span
                  className="select-none filter drop-shadow-md transition-transform group-hover:scale-110"
                  style={{ fontSize: 'clamp(3.5rem, 12vh, 6rem)' }}
                >
                  {fallbackEmoji}
                </span>
              </div>
            )}

          </button>

          {/* Card Bottom: Word Details in High-Contrast White Surface */}
          <div className="shrink-0 w-full bg-white/95 backdrop-blur-md px-3 py-3 sm:py-4 text-center border-t-2 border-white/80 flex flex-col items-center justify-center shadow-sm">
            {/* English word - Big and bold */}
            <h2
              className="font-black text-slate-800 tracking-tight leading-none capitalize font-display truncate max-w-full px-2"
              style={{ fontSize: 'clamp(2rem, 5.5vh, 3.2rem)' }}
            >
              {currentWord.english}
            </h2>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION BAR: Prev Arrow & Next / Complete Button */}
      <div className="w-full max-w-xl shrink-0 flex items-center justify-between gap-3 px-2 pt-1 pb-1">
        {/* Previous Button (Hidden/Disabled when on 1st word) */}
        {totalWords > 1 && (
          <button
            onClick={handlePrev}
            disabled={isFirstWord}
            aria-label="Từ trước đó"
            title="Từ trước đó"
            className={`
              h-13 w-13 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border-2 transition-all
              ${isFirstWord
                ? 'bg-slate-100 border-slate-200 text-slate-300 opacity-40 cursor-not-allowed shadow-none'
                : 'bg-white hover:bg-amber-50 active:bg-amber-100 border-amber-300 text-slate-700 shadow-md active:scale-95 cursor-pointer'
              }
            `}
          >
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </button>
        )}

        {/* Center / Spacer */}
        <div className="flex-1 text-center hidden xs:block">
          <span className="text-xs font-bold text-slate-400">
            {totalWords > 1 ? 'Vuốt hoặc dùng phím ⬅️ ➡️' : ''}
          </span>
        </div>

        {/* Next or Finish Button */}
        <button
          onClick={handleNext}
          aria-label={isLastWord ? 'Hoàn thành Chặng 1' : 'Từ tiếp theo'}
          className={`
            h-13 sm:h-14 px-5 sm:px-7 rounded-2xl font-black text-base sm:text-lg text-white
            flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer
            ${isLastWord
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ring-3 ring-emerald-300/70 animate-soft-bounce'
              : `${currentTheme.btn}`
            }
          `}
          style={{ minWidth: isLastWord ? '150px' : '120px' }}
        >
          <span>{isLastWord ? 'Hoàn thành' : 'Tiếp theo'}</span>
          {isLastWord ? (
            <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          ) : (
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
          )}
        </button>
      </div>
    </div>
  );
};
