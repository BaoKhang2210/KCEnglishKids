import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Sparkles,
  Hand
} from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { playWordAudio, stopWordAudio, sfx } from '../../../utils/audio';
import { KokoMascot } from '../KokoMascot';

/**
 * CẤU HÌNH PHÁT ÂM KHI CHUYỂN THẺ
 * - 'tu_dong': phát âm ngay khi chuyển sang thẻ mới (mặc định)
 * - 'sau_khi_lat': chỉ phát âm sau khi trẻ lật sang mặt sau (dành cho bé đoán trước)
 */
export const CHE_DO_PHAT_AM_KHI_CHUYEN_THE: 'tu_dong' | 'sau_khi_lat' = 'tu_dong';

interface ExploreSceneStageProps {
  vocabulary: Vocabulary[];
  bigQuestion?: string;
  storyTitle?: string;
  onComplete: () => void;
}

// Bảng màu pastel / vibrant vui tươi dành cho trẻ em làm điểm nhấn nhẹ
const CARD_THEMES = [
  {
    pill: 'bg-amber-100 text-amber-900 border-amber-300',
    audioBtn: 'bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-amber-500/50',
    accentBorder: 'border-amber-400/60',
    accentGlow: 'bg-amber-400/15',
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/40'
  },
  {
    pill: 'bg-sky-100 text-sky-900 border-sky-300',
    audioBtn: 'bg-gradient-to-tr from-sky-500 to-blue-500 text-white shadow-sky-500/50',
    accentBorder: 'border-sky-400/60',
    accentGlow: 'bg-sky-400/15',
    btn: 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-sky-500/40'
  },
  {
    pill: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    audioBtn: 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-emerald-500/50',
    accentBorder: 'border-emerald-400/60',
    accentGlow: 'bg-emerald-400/15',
    btn: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/40'
  },
  {
    pill: 'bg-rose-100 text-rose-900 border-rose-300',
    audioBtn: 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-rose-500/50',
    accentBorder: 'border-rose-400/60',
    accentGlow: 'bg-rose-400/15',
    btn: 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/40'
  },
  {
    pill: 'bg-purple-100 text-purple-900 border-purple-300',
    audioBtn: 'bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-purple-500/50',
    accentBorder: 'border-purple-400/60',
    accentGlow: 'bg-purple-400/15',
    btn: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-500/40'
  }
];

const EMOJI_MAP: Record<string, string> = {
  pencil: '✏️', book: '📖', eraser: '🧼', ruler: '📏', bag: '🎒',
  crayon: '🖍️', scissors: '✂️', desk: '🪑', school: '🏫', apple: '🍎',
  cat: '🐱', dog: '🐶', bird: '🐦', lion: '🦁', fish: '🐟',
  duck: '🦆', cow: '🐮', frog: '🐸', monkey: '🐵', red: '🔴',
  blue: '🔵', yellow: '🟡', green: '🟢', orange: '🟠', purple: '🟣'
};

// ── SUB-COMPONENT 1: NÚT LOA ÂM THANH Ở GÓC PHẢI ─────────────────────────────
interface SoundButtonProps {
  isPlaying: boolean;
  needsHint: boolean;
  themeClass: string;
  onPlay: (e: React.MouseEvent) => void;
  wordLabel: string;
}

const SoundButton: React.FC<SoundButtonProps> = ({
  isPlaying,
  needsHint,
  themeClass,
  onPlay,
  wordLabel
}) => (
  <button
    type="button"
    onClick={onPlay}
    aria-label={`Nghe lại phát âm từ ${wordLabel}`}
    title="Chạm để nghe phát âm"
    className={`
      w-13 h-13 sm:w-15 sm:h-15 rounded-full flex items-center justify-center cursor-pointer
      transition-all duration-200 active:scale-90 border-3 border-white shadow-lg relative shrink-0 z-30 select-none
      ${themeClass}
      ${needsHint ? 'animate-bounce ring-4 ring-amber-300' : ''}
      ${isPlaying ? 'scale-105 ring-4 ring-amber-300/90' : 'hover:scale-105'}
    `}
  >
    {/* Sound waves animation while playing */}
    {isPlaying && (
      <span className="absolute inset-0 rounded-full animate-ping opacity-75 bg-white/40 pointer-events-none" />
    )}
    <Volume2 className={`w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5] ${isPlaying ? 'animate-pulse' : ''}`} />
  </button>
);

// ── SUB-COMPONENT 2: THANH TIẾN ĐỘ TRÊN CÙNG ─────────────────────────────────
interface StageProgressBarProps {
  currentIndex: number;
  totalWords: number;
}

const StageProgressBar: React.FC<StageProgressBarProps> = ({
  currentIndex,
  totalWords
}) => {
  const percent = totalWords > 0 ? Math.round(((currentIndex + 1) / totalWords) * 100) : 0;
  return (
    <div className="w-full max-w-md shrink-0 flex items-center gap-3 px-3">
      <div className="flex-1 h-3.5 sm:h-4 bg-slate-800/90 rounded-full border-2 border-slate-700/80 p-0.5 overflow-hidden shadow-inner">
        <div
          className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="shrink-0 bg-slate-900/90 px-3.5 py-0.5 rounded-full border-2 border-slate-700/80 shadow-md">
        <span className="font-black text-xs sm:text-sm text-amber-300 tracking-wider font-display">
          {currentIndex + 1} / {totalWords}
        </span>
      </div>
    </div>
  );
};

// ── SUB-COMPONENT 3: MÀN HÌNH HOÀN THÀNH ─────────────────────────────────────
interface CompletionViewProps {
  totalWords: number;
  onContinue: () => void;
  onRestart: () => void;
}

const CompletionView: React.FC<CompletionViewProps> = ({
  totalWords,
  onContinue,
  onRestart
}) => (
  <div className="w-full h-full min-h-0 flex items-center justify-center p-3 animate-fade-in select-none">
    <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 rounded-3xl border-4 border-amber-400/80 p-5 sm:p-7 text-center shadow-2xl flex flex-col items-center gap-3 text-slate-100">
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
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs sm:text-sm font-extrabold mb-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Hoàn thành Chặng 1: Khám phá</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
          Bé đã khám phá xuất sắc! 🌟
        </h2>
        <p className="text-sm sm:text-base font-bold text-slate-300 mt-1">
          Bé đã làm quen trọn vẹn <span className="text-emerald-400 font-black">{totalWords}</span> từ vựng mới của bài.
        </p>
      </div>

      {/* Action buttons: Sang Chặng 2 (Chính) & Học lại (Phụ) */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mt-2">
        <button
          type="button"
          onClick={() => {
            sfx.playSuccess();
            onContinue();
          }}
          aria-label="Sang Chặng 2 Luyện tập"
          className="w-full sm:flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg hover:scale-103 active:scale-95 transition-all cursor-pointer ring-3 ring-emerald-300/60"
        >
          <span>Sang Chặng 2 Luyện tập</span>
          <ArrowRight className="w-5 h-5 stroke-[3]" />
        </button>

        <button
          type="button"
          onClick={onRestart}
          aria-label="Học lại từ đầu Chặng 1"
          className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-amber-300 font-black text-base border-2 border-slate-600 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>Học lại</span>
        </button>
      </div>
    </div>
  </div>
);

// ── COMPONENT CHÍNH: EXPLORE SCENE STAGE (CHẶNG 1 KHÁM PHÁ) ───────────────────
export const ExploreSceneStage: React.FC<ExploreSceneStageProps> = ({
  vocabulary = [],
  bigQuestion: _bigQuestion = 'What do we do at school?',
  storyTitle: _storyTitle,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [needsGestureHint, setNeedsGestureHint] = useState(false);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev' | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [hasInteracted, setHasInteracted] = useState<boolean>(() => {
    return localStorage.getItem('kc_flashcard_flip_guided') === 'true';
  });

  // Touch gesture
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const totalWords = vocabulary.length;
  const currentWord: Vocabulary | undefined = vocabulary[currentIndex];
  const isFirstWord = currentIndex === 0;
  const isLastWord = currentIndex === totalWords - 1;
  const currentTheme = CARD_THEMES[currentIndex % CARD_THEMES.length];

  // Kiểm tra cài đặt giảm chuyển động của hệ điều hành
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener?.('change', listener);
    return () => mediaQuery.removeEventListener?.('change', listener);
  }, []);

  // Cleanup: dừng âm thanh và giải phóng tài nguyên khi unmount
  useEffect(() => {
    return () => {
      stopWordAudio();
    };
  }, []);

  // Tải trước hình ảnh và âm thanh của từ kế tiếp
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

  // Hàm phát âm thanh dùng chung duy nhất
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
          // Trình duyệt chặn autoplay khi chưa có tương tác người dùng
          setNeedsGestureHint(true);
        }
      });
  }, []);

  // Phát âm thanh khi đổi thẻ theo biến cấu hình CHE_DO_PHAT_AM_KHI_CHUYEN_THE
  useEffect(() => {
    if (isCompleted || !currentWord) return;

    if (CHE_DO_PHAT_AM_KHI_CHUYEN_THE === 'tu_dong') {
      const timer = setTimeout(() => {
        handlePronounce(currentWord, true);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, isCompleted, currentWord, handlePronounce]);

  // Lật thẻ
  const handleFlipCard = () => {
    sfx.playPop();
    const willBeFlipped = !isFlipped;
    setIsFlipped(willBeFlipped);

    if (!hasInteracted) {
      setHasInteracted(true);
      try {
        localStorage.setItem('kc_flashcard_flip_guided', 'true');
      } catch {
        /* storage fallback */
      }
    }

    // Khi trẻ lật từ mặt trước sang mặt sau -> phát âm từ đó
    if (willBeFlipped && currentWord) {
      handlePronounce(currentWord);
    }
  };

  // Nút loa: bấm không làm lật thẻ, chặn nổi bọt
  const handleAudioButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playPop();
    if (currentWord) {
      handlePronounce(currentWord);
    }
  };

  // Chuyển sang từ trước
  const handlePrev = useCallback(() => {
    if (isFirstWord) return;
    sfx.playPop();
    stopWordAudio();
    setIsFlipped(false);
    setSlideDirection('prev');
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setTimeout(() => setSlideDirection(null), 280);
  }, [isFirstWord]);

  // Chuyển sang từ tiếp theo hoặc Hoàn thành
  const handleNext = useCallback(() => {
    if (isLastWord) {
      sfx.playSuccess();
      sfx.playApplause();
      stopWordAudio();
      setIsCompleted(true);
      return;
    }
    sfx.playPop();
    stopWordAudio();
    setIsFlipped(false);
    setSlideDirection('next');
    setCurrentIndex(prev => Math.min(totalWords - 1, prev + 1));
    setTimeout(() => setSlideDirection(null), 280);
  }, [isLastWord, totalWords]);

  // Học lại từ đầu
  const handleRestart = () => {
    sfx.playPop();
    stopWordAudio();
    setIsCompleted(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSlideDirection(null);
  };

  // Điều khiển bằng bàn phím
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlipCard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCompleted, handleNext, handlePrev, isFlipped, currentWord]);

  // Vuốt chạm cảm ứng trái / phải
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Ngưỡng vuốt ngang: > 45px và góc ngang trội hơn dọc
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Xử lý khi bài không có từ vựng
  if (!vocabulary || vocabulary.length === 0) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-4">
        <div className="bg-slate-900/95 text-slate-100 rounded-3xl p-6 sm:p-8 text-center border-4 border-dashed border-amber-400/60 max-w-md shadow-2xl">
          <span className="text-5xl block mb-3">🔍</span>
          <h3 className="text-xl font-black text-white mb-1">Đang chuẩn bị từ vựng...</h3>
          <p className="text-slate-400 font-bold text-sm mb-5">Bài học này chưa có danh sách từ vựng.</p>
          <button
            type="button"
            onClick={onComplete}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-base shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Tiếp tục bài học
          </button>
        </div>
      </div>
    );
  }

  // Màn hình hoàn thành Chặng 1
  if (isCompleted) {
    return (
      <CompletionView
        totalWords={totalWords}
        onContinue={onComplete}
        onRestart={handleRestart}
      />
    );
  }

  const wordKey = (currentWord?.english || '').toLowerCase().trim();
  const fallbackEmoji = EMOJI_MAP[wordKey] || (currentWord as any)?.category || '🌟';
  const hasImage = Boolean(currentWord?.imageUrl && !imageErrorMap[currentWord._id || currentWord.english]);

  // Animation trượt ngang khi chuyển thẻ
  let slideClass = '';
  if (slideDirection === 'next') {
    slideClass = 'animate-slide-in-right';
  } else if (slideDirection === 'prev') {
    slideClass = 'animate-fade-in';
  }

  return (
    <div
      className="w-full h-full min-h-0 flex flex-col items-center justify-between gap-1 sm:gap-2 overflow-hidden select-none py-1 px-2 sm:px-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. THANH TIẾN ĐỘ TRÊN CÙNG */}
      <StageProgressBar currentIndex={currentIndex} totalWords={totalWords} />

      {/* 2. KHU VỰC THẺ HAI MẶT LỚN Ở GIỮA */}
      <div className="flex-1 min-h-0 w-full max-w-md sm:max-w-lg flex flex-col items-center justify-center relative px-2">
        {/* Vỏ bọc Perspective 3D */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleFlipCard}
          aria-label={`Thẻ từ vựng: ${currentWord.english}. ${isFlipped ? 'Đang mở mặt sau có chữ và nghĩa.' : 'Đang mở mặt trước có hình ảnh.'} Nhấn Enter hoặc Space để lật thẻ.`}
          aria-expanded={isFlipped}
          className={`
            w-full aspect-[3/4] max-h-[500px] min-h-[300px] perspective-1000 cursor-pointer outline-none select-none relative
            ${slideClass}
          `}
        >
          {/* Nút loa tròn ở góc trên bên phải - luôn hiển thị cố định ở cả hai mặt thẻ */}
          <div className="absolute top-4 right-4 z-40">
            <SoundButton
              isPlaying={isPlayingAudio}
              needsHint={needsGestureHint}
              themeClass={currentTheme.audioBtn}
              onPlay={handleAudioButtonClick}
              wordLabel={currentWord.english}
            />
          </div>

          {/* Vỏ lật thẻ 3D quanh trục dọc */}
          <div
            className={`
              relative w-full h-full rounded-[32px] transform-style-preserve-3d shadow-2xl
              ${prefersReducedMotion
                ? 'transition-opacity duration-300'
                : 'transition-transform duration-500 ease-in-out'
              }
              ${isFlipped ? (prefersReducedMotion ? 'opacity-100' : 'rotate-y-180') : 'opacity-100'}
            `}
          >
            {/* ── MẶT TRƯỚC: HÌNH ẢNH MINH HỌA LỚN ────────────── */}
            <div
              className={`
                absolute inset-0 w-full h-full backface-hidden rounded-[32px] p-4 sm:p-6 flex flex-col items-center justify-center
                bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-4 ${currentTheme.accentBorder}
                shadow-2xl overflow-hidden
                ${prefersReducedMotion && isFlipped ? 'invisible' : 'visible'}
              `}
            >
              {/* Hiệu ứng đốm sáng nền nhẹ phía sau */}
              <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentTheme.accentGlow}`} />
              <div className={`absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentTheme.accentGlow}`} />

              {/* Viền nét đứt bên trong theo thiết kế tham khảo kidscards */}
              <div className="absolute inset-2.5 sm:inset-3 rounded-[24px] border-2 border-dashed border-amber-300/40 pointer-events-none z-10" />

              {/* Hình ảnh minh họa lớn ở giữa thẻ */}
              <div className="relative z-20 flex-1 min-h-0 w-full flex items-center justify-center p-3">
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
                      max-h-full max-w-full object-contain filter drop-shadow-2xl transition-transform duration-200
                      ${isPlayingAudio ? 'scale-105' : 'hover:scale-102'}
                    `}
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span
                      className="select-none filter drop-shadow-2xl transition-transform hover:scale-105"
                      style={{ fontSize: 'clamp(5rem, 16vh, 8rem)' }}
                    >
                      {fallbackEmoji}
                    </span>
                  </div>
                )}
              </div>

              {/* Hướng dẫn lật thẻ lần đầu (chỉ xuất hiện khi trẻ chưa chạm lật lần nào) */}
              {!hasInteracted && (
                <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-end pb-5 sm:pb-7">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border-2 border-amber-300 text-amber-200 text-xs sm:text-sm font-black shadow-xl animate-bounce backdrop-blur-xs">
                    <Hand className="w-4 h-4 text-amber-300 stroke-[2.5]" />
                    <span>Chạm vào thẻ để lật nhé!</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── MẶT SAU: HÌNH THU NHỎ Ở TRÊN & CHỮ TIẾNG ANH LỚN Ở DƯỚI ── */}
            <div
              className={`
                absolute inset-0 w-full h-full backface-hidden rounded-[32px] p-5 sm:p-7 flex flex-col items-center justify-center gap-4 sm:gap-6
                bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-4 ${currentTheme.accentBorder}
                shadow-2xl overflow-hidden
                ${prefersReducedMotion ? (isFlipped ? 'visible' : 'invisible') : 'rotate-y-180'}
              `}
            >
              {/* Hiệu ứng đốm sáng nền nhẹ */}
              <div className={`absolute -top-16 -left-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentTheme.accentGlow}`} />
              <div className={`absolute -bottom-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentTheme.accentGlow}`} />

              {/* Viền nét đứt bên trong */}
              <div className="absolute inset-2.5 sm:inset-3 rounded-[24px] border-2 border-dashed border-amber-300/40 pointer-events-none z-10" />

              {/* Hình ảnh thu nhỏ ở phía trên mặt sau */}
              <div className="relative z-20 w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-slate-800/60 border-2 border-slate-700/70 p-3 flex items-center justify-center shadow-inner shrink-0">
                {hasImage ? (
                  <img
                    src={currentWord.imageUrl}
                    alt={currentWord.english}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    draggable={false}
                  />
                ) : (
                  <span className="text-5xl select-none">{fallbackEmoji}</span>
                )}
              </div>

              {/* Tên từ tiếng Anh chữ rất lớn và đậm ở giữa */}
              <div className="relative z-20 shrink-0 w-full flex items-center justify-center text-center px-2">
                <h2
                  className="font-black text-amber-300 tracking-tight leading-none uppercase font-display drop-shadow-md break-words max-w-full"
                  style={{
                    fontSize:
                      currentWord.english.length > 10
                        ? 'clamp(2rem, 5.5vh, 2.8rem)'
                        : 'clamp(2.5rem, 7vh, 3.8rem)'
                  }}
                >
                  {currentWord.english}
                </h2>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. KHU VỰC ĐIỀU HƯỚNG BÊN DƯỚI: NÚT TRƯỚC / NÚT TIẾP HOẶC HOÀN THÀNH */}
      <div className="w-full max-w-md sm:max-w-lg shrink-0 flex items-center justify-between gap-3 px-3 pt-1 pb-1">
        {/* Nút Trước (ẩn nếu bài chỉ có 1 từ; mờ/disabled khi ở từ đầu tiên) */}
        {totalWords > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstWord}
            aria-label="Từ trước đó"
            title="Từ trước đó"
            className={`
              h-13 w-13 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border-2 transition-all select-none
              ${isFirstWord
                ? 'bg-slate-800/50 border-slate-700/40 text-slate-500 opacity-40 cursor-not-allowed shadow-none'
                : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border-slate-600 text-amber-300 shadow-md active:scale-95 cursor-pointer'
              }
            `}
          >
            <ArrowLeft className="w-6 h-6 stroke-[3]" />
          </button>
        )}

        {/* Nhãn gợi ý điều hướng ở giữa (dành cho màn hình rộng) */}
        <div className="flex-1 text-center hidden xs:block">
          <span className="text-xs font-bold text-slate-400">
            {totalWords > 1 ? 'Chạm thẻ để lật • Dùng ⬅️ ➡️' : 'Chạm thẻ để lật'}
          </span>
        </div>

        {/* Nút Tiếp theo hoặc Hoàn thành */}
        <button
          type="button"
          onClick={handleNext}
          aria-label={isLastWord ? 'Hoàn thành Chặng 1' : 'Từ tiếp theo'}
          className={`
            h-13 sm:h-14 px-6 sm:px-8 rounded-2xl font-black text-base sm:text-lg text-white
            flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 cursor-pointer select-none
            ${isLastWord
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ring-3 ring-emerald-300/70 animate-soft-bounce'
              : `${currentTheme.btn}`
            }
          `}
          style={{ minWidth: isLastWord ? '150px' : '130px' }}
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
