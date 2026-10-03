import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Sparkles,
  Check,
  ChevronLeft,
  RefreshCw,
  Mic
} from 'lucide-react';
import type { Vocabulary } from '../../types';
import { AudioButton } from './AudioButton';
import { sfx, playWordAudio } from '../../utils/audio';
import { useAuth } from '../../context/AuthContext';
import { vocabMasteryService } from '../../services/vocabMasteryService';

interface BigInteractiveFlashcardProps {
  items: Vocabulary[];
  initialIndex?: number;
  childId?: string;
  onStudyComplete?: (masteredCount: number, reviewCount: number) => void;
  onCompleteStep?: () => void;
}

export const BigInteractiveFlashcard: React.FC<BigInteractiveFlashcardProps> = ({
  items,
  initialIndex = 0,
  childId,
  onStudyComplete,
  onCompleteStep
}) => {
  const { user } = useAuth();
  const effectiveChildId = childId || (user as any)?.id || (user as any)?._id || 'guest';

  // Active study deck (can expand if words needing review are re-queued)
  const [deck, setDeck] = useState<Vocabulary[]>(items || []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSpeakingAlong, setIsSpeakingAlong] = useState(false);

  // Swipe & Drag states
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  // Stats for current study session
  const [sessionMastered, setSessionMastered] = useState<string[]>([]);
  const [sessionReview, setSessionReview] = useState<string[]>([]);

  const handleSpeakAlong = (word: string, audio?: string) => {
    if (isSpeakingAlong) return;
    sfx.playPop();
    setIsSpeakingAlong(true);
    playWordAudio(word, audio);
    setTimeout(() => {
      sfx.playCorrect();
      setTimeout(() => {
        setIsSpeakingAlong(false);
      }, 1000);
    }, 2200);
  };

  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isPointerDownRef = useRef(false);

  // Sync deck when items change
  useEffect(() => {
    if (items && items.length > 0) {
      setDeck(items);
      setCurrentIndex(0);
      setIsFlipped(false);
      setExitDirection(null);
    }
  }, [items]);

  useEffect(() => {
    // Reset flip and exit state when card changes
    setIsFlipped(false);
    setExitDirection(null);
    setDragOffset(0);
  }, [currentIndex]);

  if (!deck || deck.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border-3 border-dashed border-amber-200">
        <p className="text-slate-500 font-bold">Không có từ vựng nào để hiển thị.</p>
      </div>
    );
  }

  // Session Completed Screen
  if (currentIndex >= deck.length) {
    const uniqueMastered = new Set(sessionMastered).size;
    const uniqueReview = new Set(sessionReview).size;

    return (
      <div className="w-full max-w-lg mx-auto bg-gradient-to-b from-amber-50 via-white to-emerald-50 rounded-3xl border-4 border-amber-300 p-8 text-center shadow-xl">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-4xl mb-4 shadow-sm">
          🏆
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
          Bé đã hoàn thành lượt học! 🎉
        </h3>
        <p className="text-sm sm:text-base font-extrabold text-slate-500 mb-6">
          Bé đã khám phá tất cả các từ vựng trong bài học này!
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 text-center">
            <span className="text-3xl font-black text-emerald-600 block mb-1">
              {uniqueMastered}
            </span>
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">
              💚 Đã nhớ tốt
            </span>
          </div>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 text-center">
            <span className="text-3xl font-black text-amber-600 block mb-1">
              {uniqueReview}
            </span>
            <span className="text-xs font-black text-amber-800 uppercase tracking-wide">
              💡 Cần nhắc lại
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {onCompleteStep && (
            <button
              type="button"
              onClick={() => {
                sfx.playSuccess();
                onCompleteStep();
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-sm sm:text-base py-3 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <span>Tiến tới phần Luyện tập 🚀</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              sfx.playPop();
              setDeck(items);
              setCurrentIndex(0);
              setIsFlipped(false);
              setSessionMastered([]);
              setSessionReview([]);
            }}
            className="w-full sm:w-auto btn-3d-amber text-amber-950 font-black text-sm sm:text-base py-3 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Học lại từ đầu</span>
          </button>
        </div>
      </div>
    );
  }

  const currentItem = deck[currentIndex];

  const handleFlip = () => {
    sfx.playPop();
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    // Auto-play audio when flipping
    playWordAudio(currentItem.english, currentItem.audioUrl);
  };

  // Swipe Right = Đã nhớ
  const handleRemember = () => {
    sfx.playCorrect();
    setExitDirection('right');

    // Save to mastery service
    vocabMasteryService.markMastered(effectiveChildId, currentItem);
    setSessionMastered(prev => [...prev, currentItem._id]);

    setTimeout(() => {
      setExitDirection(null);
      setDragOffset(0);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (nextIdx < deck.length) {
        playWordAudio(deck[nextIdx].english, deck[nextIdx].audioUrl);
      } else if (onStudyComplete) {
        onStudyComplete(sessionMastered.length + 1, sessionReview.length);
      }
    }, 280);
  };

  // Swipe Left = Chưa nhớ (Re-queue to end for spaced repetition)
  const [showEncouragement, setShowEncouragement] = useState(false);

  const handleReview = () => {
    sfx.playGentleWrong();
    setExitDirection('left');
    setShowEncouragement(true);
    setTimeout(() => setShowEncouragement(false), 2200);

    // Save to mastery service as review
    vocabMasteryService.markReview(effectiveChildId, currentItem);
    setSessionReview(prev => [...prev, currentItem._id]);

    // Re-queue this word to the end of study deck so child repeats it
    setDeck(prev => [...prev, currentItem]);

    setTimeout(() => {
      setExitDirection(null);
      setDragOffset(0);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (nextIdx < deck.length + 1) {
        // audio for next
        const nextWord = deck[nextIdx] || currentItem;
        playWordAudio(nextWord.english, nextWord.audioUrl);
      }
    }, 280);
  };

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (exitDirection) return;
    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    currentXRef.current = e.clientX;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    currentXRef.current = e.clientX;
    const diff = currentXRef.current - startXRef.current;
    setDragOffset(diff);
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);

    const diff = currentXRef.current - startXRef.current;

    // If threshold crossed (> 75px) -> Trigger Swipe action
    if (diff > 75) {
      handleRemember();
    } else if (diff < -75) {
      handleReview();
    } else {
      // Tap or small drag -> Flip card if barely moved (< 10px)
      if (Math.abs(diff) < 10) {
        handleFlip();
      }
      // Snap back to center
      setDragOffset(0);
    }
  };

  const handlePointerCancel = () => {
    isPointerDownRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      sfx.playPop();
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      playWordAudio(deck[prevIdx].english, deck[prevIdx].audioUrl);
    }
  };

  // Calculate transform for drag / exit
  let cardTransform = '';
  if (exitDirection === 'right') {
    cardTransform = 'translateX(450px) rotate(18deg)';
  } else if (exitDirection === 'left') {
    cardTransform = 'translateX(-450px) rotate(-18deg)';
  } else if (dragOffset !== 0) {
    const rotation = (dragOffset / 300) * 15;
    cardTransform = `translateX(${dragOffset}px) rotate(${rotation}deg)`;
  }

  // Visual cues opacity based on drag
  const rightBadgeOpacity = Math.min(1, Math.max(0, (dragOffset - 20) / 60));
  const leftBadgeOpacity = Math.min(1, Math.max(0, (-dragOffset - 20) / 60));

  const isMasteredWord = vocabMasteryService.isMastered(effectiveChildId, currentItem._id);
  const isReviewWord = vocabMasteryService.isReview(effectiveChildId, currentItem._id);

  return (
    <div className="w-full flex flex-col items-center relative">
      {/* Encouragement banner – inline, no fixed/overflow */}
      {showEncouragement && (
        <div className="w-full flex items-center gap-3 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black px-5 py-3 rounded-2xl shadow-md border-2 border-white animate-pop-in mb-3">
          <span className="text-xl flex-shrink-0">💪</span>
          <span className="text-sm">Bé cố lên nhé! Thử lại từ này ở cuối lượt học nào! ✨</span>
        </div>
      )}

      {/* Top Header & Instruction info */}
      <div className="w-full max-w-lg flex items-center justify-between mb-3 px-2">
        <span className="bg-amber-100 text-amber-900 text-sm font-black px-4 py-1.5 rounded-full border-2 border-amber-300 shadow-xs flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
          Thẻ {currentIndex + 1} / {deck.length}
        </span>

        {/* Current Word Status Badge */}
        {isMasteredWord ? (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-3 py-1.5 rounded-full border border-emerald-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" /> Đã nhớ
          </span>
        ) : isReviewWord ? (
          <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-full border border-amber-300 flex items-center gap-1">
            💡 Cần ôn lại
          </span>
        ) : (
          <span className="text-xs font-extrabold text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
            Quẹt để ghi nhớ 👆
          </span>
        )}
      </div>

      {/* 3D Flip & Swipe Card Container */}
      <div
        className="w-full max-w-lg sm:max-w-xl md:max-w-2xl h-[480px] sm:h-[540px] md:h-[580px] relative touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="w-full h-full perspective-1000 cursor-grab active:cursor-grabbing"
          style={{
            transform: cardTransform,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Swiping Visual Feedback Overlays */}
          {/* Right Swipe Indicator: ĐÃ NHỚ 🎉 */}
          <div
            className="absolute top-6 left-6 z-30 pointer-events-none transition-opacity duration-150"
            style={{ opacity: exitDirection === 'right' ? 1 : rightBadgeOpacity }}
          >
            <div className="bg-emerald-500 text-white font-black text-base sm:text-lg px-4 py-2 rounded-2xl border-3 border-white shadow-xl flex items-center gap-2 rotate-[-12deg] animate-pulse">
              <Check className="w-6 h-6 stroke-[3]" />
              <span>ĐÃ NHỚ RỒI! 🎉</span>
            </div>
          </div>

          {/* Left Swipe Indicator: CHƯA NHỚ 💡 */}
          <div
            className="absolute top-6 right-6 z-30 pointer-events-none transition-opacity duration-150"
            style={{ opacity: exitDirection === 'left' ? 1 : leftBadgeOpacity }}
          >
            <div className="bg-amber-500 text-white font-black text-base sm:text-lg px-4 py-2 rounded-2xl border-3 border-white shadow-xl flex items-center gap-2 rotate-[12deg] animate-pulse">
              <span>CẦN ÔN LẠI 💡</span>
            </div>
          </div>

          {/* Actual 3D Flip Card */}
          <div
            className={`relative w-full h-full duration-500 transform-style-preserve-3d transition-transform ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* FRONT SIDE (English) */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-[38px] border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden">
              {/* Soft background decor */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-amber-100/70 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-orange-100/70 rounded-full blur-2xl pointer-events-none" />

              {/* Front Header */}
              <div className="w-full flex-shrink-0 flex items-center justify-between relative z-10 mb-1">
                <span className="bg-amber-100 text-amber-900 border-2 border-amber-300 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <span>🇬🇧</span>
                  <span>Tiếng Anh</span>
                </span>
                <div onPointerDown={e => e.stopPropagation()} className="relative z-20">
                  <AudioButton word={currentItem.english} audioUrl={currentItem.audioUrl} size="md" />
                </div>
              </div>

              {/* Flexible Illustration Box - NEVER pushes text out */}
              <div className="relative z-10 flex-1 min-h-[140px] max-h-[220px] sm:max-h-[250px] w-full max-w-[320px] sm:max-w-[400px] mx-auto flex items-center justify-center p-3 rounded-3xl bg-gradient-to-b from-amber-50/90 via-orange-50/50 to-amber-100/60 border-2 border-amber-200/90 shadow-inner my-1">
                {currentItem.imageUrl ? (
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.english}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-7xl select-none">🐾</span>
                )}
              </div>

              {/* English Word & Pronunciation Area - ALWAYS FULLY VISIBLE & CENTERED */}
              <div className="flex-shrink-0 w-full text-center relative z-10 py-1 flex flex-col items-center justify-center">
                <h3
                  className={`font-black text-amber-950 uppercase tracking-wider font-display drop-shadow-xs break-words max-w-full leading-tight select-none my-1 ${
                    currentItem.english.length > 10
                      ? 'text-3xl sm:text-4xl md:text-5xl'
                      : currentItem.english.length > 6
                      ? 'text-4xl sm:text-5xl md:text-6xl'
                      : 'text-4xl sm:text-5xl md:text-6xl'
                  }`}
                >
                  {currentItem.english}
                </h3>
                <div onPointerDown={e => e.stopPropagation()} className="inline-block mt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpeakAlong(currentItem.english, currentItem.audioUrl);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer shadow-xs active:scale-95 ${
                      isSpeakingAlong
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-200'
                        : 'bg-white hover:bg-rose-50 text-rose-600 border-rose-200'
                    }`}
                    title="Nghe mẫu phát âm rồi bé nói nhắc lại theo cô nhé!"
                  >
                    <Mic className={`w-4 h-4 ${isSpeakingAlong ? 'animate-bounce' : ''}`} />
                    <span>{isSpeakingAlong ? `Bé đọc: "${currentItem.english}" 🗣️` : 'Bé đọc theo cô 🎤'}</span>
                  </button>
                </div>
              </div>

              {/* Flip hint */}
              <div className="flex-shrink-0 relative z-10 flex items-center gap-2 text-xs sm:text-sm font-black text-amber-800 bg-amber-100/90 px-5 py-2 rounded-full border border-amber-200 mt-2 shadow-2xs">
                <RotateCw className="w-4 h-4 text-amber-600" />
                <span>Chạm để lật xem nghĩa tiếng Việt 🇻🇳</span>
              </div>
            </div>

            {/* BACK SIDE (Vietnamese & Redesigned Context) */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 rounded-[38px] border-4 border-emerald-300 shadow-2xl flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden">
              {/* Soft background decor */}
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-100/70 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-100/70 rounded-full blur-2xl pointer-events-none" />

              {/* Back Header */}
              <div className="w-full flex-shrink-0 flex items-center justify-between relative z-10 mb-1">
                <span className="bg-emerald-100 text-emerald-900 border-2 border-emerald-300 text-xs sm:text-sm font-black px-4 py-1.5 rounded-full shadow-2xs flex items-center gap-1.5">
                  <span>🇻🇳</span>
                  <span>Tiếng Việt</span>
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                  Nghĩa của từ
                </span>
              </div>

              {/* Flexible Illustration on Back Side */}
              <div className="relative z-10 flex-1 min-h-[140px] max-h-[220px] sm:max-h-[250px] w-full max-w-[320px] sm:max-w-[400px] mx-auto flex items-center justify-center p-3 rounded-3xl bg-white/90 border-2 border-emerald-200/90 shadow-inner my-1">
                {currentItem.imageUrl ? (
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.english}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-7xl select-none">🐾</span>
                )}
              </div>

              {/* Main Vietnamese Meaning & English Word Reference */}
              <div className="flex-shrink-0 w-full text-center relative z-10 py-1 flex flex-col items-center justify-center">
                <h3
                  className={`font-black text-emerald-700 drop-shadow-xs tracking-tight break-words max-w-full leading-tight my-1 select-none ${
                    currentItem.vietnamese.length > 14
                      ? 'text-2xl sm:text-3xl md:text-4xl'
                      : currentItem.vietnamese.length > 8
                      ? 'text-3xl sm:text-4xl md:text-5xl'
                      : 'text-4xl sm:text-5xl md:text-6xl'
                  }`}
                >
                  {currentItem.vietnamese}
                </h3>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => playWordAudio(currentItem.english, currentItem.audioUrl)}
                  className="mt-1 px-5 py-2 rounded-full bg-white hover:bg-emerald-50 border-2 border-emerald-300 flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 text-slate-700"
                  title="Bấm để nghe lại phát âm tiếng Anh"
                >
                  <span className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-800">
                    🔊 {currentItem.english}
                  </span>
                </button>
              </div>

              {/* Flip hint */}
              <div className="flex-shrink-0 relative z-10 flex items-center gap-2 text-xs sm:text-sm font-black text-emerald-800 bg-emerald-100/90 px-5 py-2 rounded-full border border-emerald-200 mt-2 shadow-2xs">
                <RotateCw className="w-4 h-4 text-emerald-600" />
                <span>Chạm để lật lại mặt tiếng Anh 🇬🇧</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Big Tactile Action Buttons: Chưa nhớ (Trái) - Lật thẻ (Giữa) - Đã nhớ (Phải) */}
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl grid grid-cols-3 gap-3 sm:gap-5 mt-6">
        {/* Nút Chưa Nhớ (Trái) */}
        <button
          type="button"
          onClick={handleReview}
          className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-4 px-3 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-100 hover:from-amber-100 hover:to-orange-200 border-b-6 border-orange-300 text-orange-950 font-black text-xs sm:text-base shadow-md active:translate-y-1 active:border-b-2 transition-all cursor-pointer select-none"
        >
          <span className="text-xl sm:text-2xl">🧡</span>
          <span className="text-center font-display">Chưa nhớ</span>
          <span className="text-[10px] text-orange-800 font-extrabold hidden md:inline">(Trái)</span>
        </button>

        {/* Nút Lật Thẻ (Giữa) */}
        <button
          type="button"
          onClick={handleFlip}
          className="btn-3d-amber text-amber-950 font-black text-xs sm:text-base py-3.5 sm:py-4 px-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md select-none"
        >
          <RotateCw className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span className="font-display">{isFlipped ? 'Mặt Anh' : 'Lật nghĩa'}</span>
        </button>

        {/* Nút Đã Nhớ (Phải) */}
        <button
          type="button"
          onClick={handleRemember}
          className="btn-3d-emerald text-white font-black text-xs sm:text-base py-3.5 sm:py-4 px-3 rounded-2xl flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-md select-none"
        >
          <span className="text-xl sm:text-2xl">💚</span>
          <span className="text-center font-display">Đã nhớ!</span>
          <span className="text-[10px] text-emerald-100 font-extrabold hidden md:inline">(Phải)</span>
        </button>
      </div>

      {/* Previous / Next Card Helper */}
      <div className="w-full max-w-2xl sm:max-w-3xl flex items-center justify-between text-xs sm:text-sm font-bold text-slate-400 mt-4 px-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1.5 ${
            currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-slate-700 cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Quay lại từ trước</span>
        </button>
        <span className="text-slate-400 text-xs sm:text-sm">
          Vuốt trái: Chưa nhớ • Vuốt phải: Đã nhớ
        </span>
      </div>

      {/* Advance to Practice Button */}
      {onCompleteStep && (
        <div className="w-full max-w-2xl sm:max-w-3xl mt-4">
          <button
            type="button"
            onClick={() => {
              sfx.playSuccess();
              onCompleteStep();
            }}
            className="w-full py-4 sm:py-5 px-6 rounded-3xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base sm:text-lg shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer border-3 border-emerald-400"
          >
            <span>Bé đã sẵn sàng! Chuyển sang Luyện tập</span>
            <span className="text-2xl">🚀</span>
          </button>
        </div>
      )}

      {/* Mini Thumbnails Carousel with Mastery status dots */}
      {items.length > 1 && (
        <div className="w-full max-w-2xl sm:max-w-3xl mt-6 bg-white/70 border-3 border-amber-200/80 rounded-3xl p-4 shadow-xs">
          <p className="text-xs font-black uppercase text-amber-800 tracking-wider mb-3 px-2 flex items-center justify-between">
            <span>Danh sách từ bài học ({items.length})</span>
            <span className="text-[10px] text-slate-500 font-bold">
              💚 Đã nhớ • 💡 Cần ôn
            </span>
          </p>
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 px-1 scrollbar-none">
            {items.map((vocab, idx) => {
              const isSelected = idx === currentIndex;
              const isItemMastered = vocabMasteryService.isMastered(effectiveChildId, vocab._id);
              const isItemReview = vocabMasteryService.isReview(effectiveChildId, vocab._id);

              return (
                <button
                  key={vocab._id || idx}
                  onClick={() => {
                    sfx.playPop();
                    setCurrentIndex(idx);
                    playWordAudio(items[idx].english, items[idx].audioUrl);
                  }}
                  className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-amber-400 bg-amber-100 shadow-sm scale-105 ring-2 ring-amber-300'
                      : 'border-slate-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center overflow-hidden relative">
                    {vocab.imageUrl ? (
                      <img src={vocab.imageUrl} alt={vocab.english} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs">🐾</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-800 capitalize">{vocab.english}</span>

                  {/* Indicator Dot */}
                  {isItemMastered ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Đã nhớ" />
                  ) : isItemReview ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" title="Cần ôn lại" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
