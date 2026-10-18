import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  Sparkles,
  Check,
  ChevronLeft,
  RefreshCw
} from 'lucide-react';
import type { Vocabulary } from '../../types';
import { AudioButton } from './AudioButton';
import { sfx, playWordAudio } from '../../utils/audio';
import { KokoSpeakingCoach } from './KokoSpeakingCoach';
import { useAuth } from '../../context/AuthContext';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { KokoMascot } from './KokoMascot';
import type { MascotState } from './KokoMascot';

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

  const [deck, setDeck] = useState<Vocabulary[]>(items || []);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFlipped, setIsFlipped] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const [sessionMastered, setSessionMastered] = useState<string[]>([]);
  const [sessionReview, setSessionReview] = useState<string[]>([]);
  const [showEncouragement, setShowEncouragement] = useState(false);

  const repeatCountRef = useRef<Record<string, number>>({});
  const [kokoMood, setKokoMood] = useState<MascotState>('happy');

  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isPointerDownRef = useRef(false);

  useEffect(() => {
    if (items && items.length > 0) {
      setDeck(items);
      setCurrentIndex(0);
      setIsFlipped(false);
      setExitDirection(null);
      repeatCountRef.current = {};
    }
  }, [items]);

  useEffect(() => {
    setIsFlipped(false);
    setExitDirection(null);
    setDragOffset(0);
  }, [currentIndex]);

  if (!deck || deck.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 text-center border-3 border-dashed border-amber-200">
          <p className="text-slate-500 font-bold">Không có từ vựng nào để hiển thị.</p>
        </div>
      </div>
    );
  }

  // Session Completed Screen
  if (currentIndex >= deck.length) {
    const uniqueMastered = new Set(sessionMastered).size;
    const uniqueReview = new Set(sessionReview).size;

    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-2">
        <div className="w-full max-w-md bg-gradient-to-b from-amber-50 via-white to-emerald-50 rounded-3xl border-4 border-amber-300 p-5 text-center shadow-xl flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-sm">
            🏆
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Bé đã hoàn thành! 🎉</h3>
            <p className="text-sm font-extrabold text-slate-500 mt-1">Đã khám phá tất cả từ vựng!</p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3 text-center">
              <span className="text-2xl font-black text-emerald-600 block">{uniqueMastered}</span>
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wide">💚 Đã nhớ</span>
            </div>
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-3 text-center">
              <span className="text-2xl font-black text-amber-600 block">{uniqueReview}</span>
              <span className="text-xs font-black text-amber-800 uppercase tracking-wide">💡 Cần ôn</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
            {onCompleteStep && (
              <button
                type="button"
                onClick={() => { sfx.playSuccess(); onCompleteStep(); }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm py-3 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <span>Tiến tới Luyện tập 🚀</span>
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
                repeatCountRef.current = {};
              }}
              className="w-full btn-3d-amber text-amber-950 font-black text-sm py-3 px-5 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Học lại từ đầu</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentItem = deck[currentIndex];

  const handleFlip = () => {
    sfx.playPop();
    setIsFlipped(prev => !prev);
    playWordAudio(currentItem.english, currentItem.audioUrl);
  };

  const handleRemember = () => {
    sfx.playCorrect();
    setExitDirection('right');
    vocabMasteryService.markMastered(effectiveChildId, currentItem);
    setSessionMastered(prev => [...prev, currentItem._id]);
    setKokoMood('celebrating');
    setTimeout(() => setKokoMood('happy'), 1600);
    setTimeout(() => {
      setExitDirection(null);
      setDragOffset(0);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (nextIdx < deck.length) playWordAudio(deck[nextIdx].english, deck[nextIdx].audioUrl);
      else if (onStudyComplete) onStudyComplete(sessionMastered.length + 1, sessionReview.length);
    }, 280);
  };

  const handleReview = () => {
    sfx.playGentleWrong();
    setExitDirection('left');
    setShowEncouragement(true);
    setTimeout(() => setShowEncouragement(false), 2200);
    vocabMasteryService.markReview(effectiveChildId, currentItem);
    setSessionReview(prev => [...prev, currentItem._id]);
    setKokoMood('encouraging');
    setTimeout(() => setKokoMood('happy'), 2200);
    const repeats = repeatCountRef.current[currentItem._id] || 0;
    if (repeats < 1) {
      repeatCountRef.current[currentItem._id] = repeats + 1;
      setDeck(prev => [...prev, currentItem]);
    }
    setTimeout(() => {
      setExitDirection(null);
      setDragOffset(0);
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      const nextWord = deck[nextIdx] || currentItem;
      playWordAudio(nextWord.english, nextWord.audioUrl);
    }, 280);
  };

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
    setDragOffset(currentXRef.current - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    setIsDragging(false);
    const diff = currentXRef.current - startXRef.current;
    if (diff > 75) handleRemember();
    else if (diff < -75) handleReview();
    else {
      if (Math.abs(diff) < 10) handleFlip();
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
      setCurrentIndex(currentIndex - 1);
      playWordAudio(deck[currentIndex - 1].english, deck[currentIndex - 1].audioUrl);
    }
  };

  let cardTransform = '';
  if (exitDirection === 'right') cardTransform = 'translateX(450px) rotate(18deg)';
  else if (exitDirection === 'left') cardTransform = 'translateX(-450px) rotate(-18deg)';
  else if (dragOffset !== 0) cardTransform = `translateX(${dragOffset}px) rotate(${(dragOffset / 300) * 15}deg)`;

  const rightBadgeOpacity = Math.min(1, Math.max(0, (dragOffset - 20) / 60));
  const leftBadgeOpacity = Math.min(1, Math.max(0, (-dragOffset - 20) / 60));

  const isMasteredWord = vocabMasteryService.isMastered(effectiveChildId, currentItem._id);
  const isReviewWord = vocabMasteryService.isReview(effectiveChildId, currentItem._id);

  return (
    // Root: fills the parent flex-1 min-h-0 container fully, no overflow
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden select-none">

      {/* Encouragement banner (inline, no fixed) */}
      {showEncouragement && (
        <div className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black px-4 py-2 rounded-xl shadow-md border-2 border-white animate-pop-in mb-1.5 text-xs">
          <span className="text-base flex-shrink-0">💪</span>
          <span>Bé cố lên nhé! Thử lại từ này ở cuối lượt học! ✨</span>
        </div>
      )}

      {/* Progress row */}
      <div className="shrink-0 w-full flex items-center justify-between mb-1.5 px-1">
        <span className="bg-amber-100 text-amber-900 text-xs font-black px-3 py-1 rounded-full border-2 border-amber-300 shadow-xs flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
          Thẻ {currentIndex + 1} / {deck.length}
        </span>
        {isMasteredWord ? (
          <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1">
            <Check className="w-3 h-3 stroke-[3]" /> Đã nhớ
          </span>
        ) : isReviewWord ? (
          <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full border border-amber-300">
            💡 Cần ôn
          </span>
        ) : (
          <span className="text-xs font-extrabold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
            Quẹt để ghi nhớ 👆
          </span>
        )}
      </div>

      {/* 3D Flip & Swipe Card — flex-1 to fill remaining space */}
      <div
        className="flex-1 min-h-0 w-full relative touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div
          className="w-full h-full perspective-1000 cursor-grab active:cursor-grabbing"
          style={{
            transform: cardTransform,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)',
          }}
        >
          {/* Swipe feedback overlays */}
          <div
            className="absolute top-4 left-4 z-30 pointer-events-none transition-opacity duration-150"
            style={{ opacity: exitDirection === 'right' ? 1 : rightBadgeOpacity }}
          >
            <div className="bg-emerald-500 text-white font-black text-sm px-3 py-1.5 rounded-2xl border-2 border-white shadow-xl flex items-center gap-1.5 rotate-[-12deg] animate-pulse">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>ĐÃ NHỚ! 🎉</span>
            </div>
          </div>
          <div
            className="absolute top-4 right-4 z-30 pointer-events-none transition-opacity duration-150"
            style={{ opacity: exitDirection === 'left' ? 1 : leftBadgeOpacity }}
          >
            <div className="bg-amber-500 text-white font-black text-sm px-3 py-1.5 rounded-2xl border-2 border-white shadow-xl flex items-center gap-1.5 rotate-[12deg] animate-pulse">
              <span>CHƯA NHỚ 💡</span>
            </div>
          </div>

          {/* 3D Flip container */}
          <div
            className={`relative w-full h-full duration-500 transform-style-preserve-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}
          >
            {/* FRONT SIDE */}
            <div className="absolute inset-0 w-full h-full backface-hidden bg-white rounded-[28px] border-4 border-amber-300 shadow-xl flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-amber-100/70 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-orange-100/70 rounded-full blur-2xl pointer-events-none" />

              {/* Front Header */}
              <div className="w-full shrink-0 flex items-center justify-between relative z-10">
                <span className="bg-amber-100 text-amber-900 border-2 border-amber-300 text-xs font-black px-3 py-1 rounded-full shadow-2xs flex items-center gap-1">
                  <span>🇬🇧</span><span>Tiếng Anh</span>
                </span>
                <div onPointerDown={e => e.stopPropagation()} className="relative z-20">
                  <AudioButton word={currentItem.english} audioUrl={currentItem.audioUrl} size="md" />
                </div>
              </div>

              {/* Image Box — flex-1 fills remaining space */}
              <div className="relative z-10 flex-1 min-h-0 w-full max-w-[85%] mx-auto flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-amber-50/90 to-amber-100/60 border-2 border-amber-200/90 shadow-inner my-2">
                {currentItem.imageUrl ? (
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.english}
                    className="max-h-full max-w-full object-contain filter drop-shadow-md pointer-events-none"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-6xl select-none">🐾</span>
                )}
              </div>

              {/* English word */}
              <div className="shrink-0 w-full text-center relative z-10 flex flex-col items-center">
                <h3 className={`font-black text-amber-950 uppercase tracking-wider drop-shadow-xs break-words leading-tight select-none ${
                  currentItem.english.length > 10 ? 'text-2xl sm:text-3xl' :
                  currentItem.english.length > 6 ? 'text-3xl sm:text-4xl' : 'text-3xl sm:text-4xl'
                }`}>
                  {currentItem.english}
                </h3>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 bg-amber-100/90 px-4 py-1 rounded-full border border-amber-200 mt-1.5 shadow-2xs">
                  <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chạm để lật nghĩa tiếng Việt</span>
                </div>
              </div>
            </div>

            {/* BACK SIDE */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 rounded-[28px] border-4 border-emerald-300 shadow-xl flex flex-col items-center justify-between p-3 sm:p-4 overflow-hidden">
              <div className="absolute -top-8 -right-8 w-36 h-36 bg-emerald-100/70 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-teal-100/70 rounded-full blur-2xl pointer-events-none" />

              {/* Back Header */}
              <div className="w-full shrink-0 flex items-center justify-between relative z-10">
                <span className="bg-emerald-100 text-emerald-900 border-2 border-emerald-300 text-xs font-black px-3 py-1 rounded-full shadow-2xs flex items-center gap-1">
                  <span>🇻🇳</span><span>Tiếng Việt</span>
                </span>
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">Nghĩa của từ</span>
              </div>

              {/* Image box */}
              <div className="relative z-10 flex-1 min-h-0 w-full max-w-[85%] mx-auto flex items-center justify-center p-2 rounded-2xl bg-white/90 border-2 border-emerald-200/90 shadow-inner my-2">
                {currentItem.imageUrl ? (
                  <img src={currentItem.imageUrl} alt={currentItem.english} className="max-h-full max-w-full object-contain filter drop-shadow-md pointer-events-none" loading="lazy" />
                ) : (
                  <span className="text-6xl select-none">🐾</span>
                )}
              </div>

              {/* Vietnamese meaning */}
              <div className="shrink-0 w-full text-center relative z-10 flex flex-col items-center">
                <h3 className={`font-black text-emerald-700 drop-shadow-xs tracking-tight break-words leading-tight select-none ${
                  currentItem.vietnamese.length > 14 ? 'text-xl sm:text-2xl' :
                  currentItem.vietnamese.length > 8 ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
                }`}>
                  {currentItem.vietnamese}
                </h3>
                <button
                  type="button"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => playWordAudio(currentItem.english, currentItem.audioUrl)}
                  className="mt-1 px-4 py-1.5 rounded-full bg-white hover:bg-emerald-50 border-2 border-emerald-300 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 text-slate-700"
                >
                  <span className="text-sm font-black uppercase tracking-wide text-slate-800">🔊 {currentItem.english}</span>
                </button>
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100/90 px-4 py-1 rounded-full border border-emerald-200 mt-1.5 shadow-2xs">
                  <RotateCw className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chạm để lật lại mặt tiếng Anh</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Koko coach + action row — shrink-0 at the bottom */}
      <div className="shrink-0 mt-1.5">
        <KokoSpeakingCoach
          targetWord={currentItem.english}
          audioUrl={currentItem.audioUrl}
          ageGroup={user?.ageGroupCode}
          contextKey={`flashcard:${effectiveChildId}:${currentIndex}:${isFlipped}`}
        />
      </div>

      {/* 3 action buttons + optional Koko mascot */}
      <div className="shrink-0 w-full flex items-end justify-center gap-2 sm:gap-3 mt-1.5">
        <div className="hidden sm:block flex-shrink-0 pb-0.5">
          <KokoMascot
            state={kokoMood}
            size="sm"
            interactive={false}
            speechBubble={
              kokoMood === 'celebrating' ? 'Bé giỏi quá! 🎉' :
              kokoMood === 'encouraging' ? 'Cố lên nhé! 💪' : undefined
            }
            bubblePosition="top"
          />
        </div>

        <div className="flex-1 max-w-md grid grid-cols-3 gap-2">
          {/* Chưa nhớ */}
          <button
            type="button"
            onClick={handleReview}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-2xl bg-gradient-to-b from-amber-50 to-orange-200 border-b-[6px] border-orange-400 text-orange-900 shadow-md active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden>🤔</span>
            <span className="text-[10px] sm:text-xs font-black">Chưa nhớ</span>
          </button>

          {/* Lật thẻ */}
          <button
            type="button"
            onClick={handleFlip}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-2xl bg-gradient-to-b from-sky-50 to-sky-200 border-b-[6px] border-sky-400 text-sky-900 shadow-md active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden>🔄</span>
            <span className="text-[10px] sm:text-xs font-black">{isFlipped ? 'Mặt Anh' : 'Lật nghĩa'}</span>
          </button>

          {/* Đã nhớ */}
          <button
            type="button"
            onClick={handleRemember}
            className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-300 border-b-[6px] border-emerald-500 text-emerald-950 shadow-md active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <span className="text-2xl sm:text-3xl leading-none" aria-hidden>💚</span>
            <span className="text-[10px] sm:text-xs font-black">Đã nhớ!</span>
          </button>
        </div>
      </div>

      {/* Prev/Next helper + advance button */}
      <div className="shrink-0 w-full flex items-center justify-between text-xs font-bold text-slate-400 mt-1.5 px-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={`flex items-center gap-1 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:text-slate-700 cursor-pointer'}`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Từ trước</span>
        </button>
        {onCompleteStep && (
          <button
            type="button"
            onClick={() => { sfx.playSuccess(); onCompleteStep(); }}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95 transition-all"
          >
            <span>Sang Luyện tập 🚀</span>
          </button>
        )}
        <span className="text-slate-400 text-[10px]">Vuốt ◀ Chưa nhớ • Đã nhớ ▶</span>
      </div>

      {/* Mini thumbnail strip — only if many items, no overflow */}
      {items.length > 1 && (
        <div className="shrink-0 w-full mt-1.5 bg-white/70 border-2 border-amber-200/80 rounded-2xl p-2 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {items.map((vocab, idx) => {
              const isSelected = idx === currentIndex;
              const isItemMastered = vocabMasteryService.isMastered(effectiveChildId, vocab._id);
              const isItemReview = vocabMasteryService.isReview(effectiveChildId, vocab._id);
              return (
                <button
                  key={vocab._id || idx}
                  onClick={() => { sfx.playPop(); setCurrentIndex(idx); playWordAudio(items[idx].english, items[idx].audioUrl); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-xl border-2 transition-all cursor-pointer relative ${
                    isSelected ? 'border-amber-400 bg-amber-100 shadow-xs scale-105 ring-2 ring-amber-300' : 'border-slate-200 bg-white hover:border-amber-300'
                  }`}
                >
                  <div className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center overflow-hidden">
                    {vocab.imageUrl ? <img src={vocab.imageUrl} alt={vocab.english} className="w-full h-full object-contain" /> : <span className="text-[10px]">🐾</span>}
                  </div>
                  <span className="text-[10px] font-black text-slate-800 capitalize">{vocab.english}</span>
                  {isItemMastered ? <span className="w-2 h-2 rounded-full bg-emerald-500" /> : isItemReview ? <span className="w-2 h-2 rounded-full bg-amber-500" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
