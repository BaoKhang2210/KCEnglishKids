/**
 * FlashcardView — component flashcard DÙNG CHUNG cho:
 *   - variant='lesson'  → Chặng 1 bài học: Koko dẫn dắt, tự phát âm, ◀🔊🎤➜
 *   - variant='topic'   → Trang Chủ đề:   tự học, thêm cặp 🧡💚, Koko tắt
 *
 * Điểm giống nhau (source of truth = Chặng 1):
 *   • Layout: grid 1-cột mobile / 2-cột md+
 *   • Card frame: max-w-4xl h-full max-h-[440px] bg-white rounded-3xl border-4 amber
 *   • LEFT: WordImage, nút 🔊 52×52px bottom-right, chạm hình = phát âm
 *   • RIGHT: Koko (sm) + từ clamp(36px,8vmin,68px) + nghĩa clamp(22px,4.5vmin,32px)
 *   • Footer: ◀ 60×60px | 🔊 74×74px | 🎤 74×74px | ➜ 74×74px (icon-only)
 *
 * Điểm khác biệt variant='topic' (ràng buộc nghiệp vụ):
 *   • Koko ở trạng thái 'happy' tĩnh, không state machine, không tự phát âm
 *   • Thêm cặp 🧡/💚 (≥64px) giữa nghĩa và footer
 *   • Swipe trái = 🧡 (cần ôn), swipe phải = 💚 (đã nhớ)
 *   • Cờ TOPIC_SELF_MARKING: tắt = ẩn cặp 🧡💚 (cho giai đoạn 2)
 *
 * Không thay đổi:
 *   • Toàn bộ logic đánh dấu nhớ/cần ôn (vocabMasteryService)
 *   • Phát âm (playWordAudio)
 *   • Tiến độ và đếm
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  PlayCircle,
  Volume2,
} from 'lucide-react';
import { KokoMascot } from '../KokoMascot';
import { WordImage } from '../common/WordImage';
import { ProgressDots } from './ProgressDots';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { vocabMasteryService } from '../../../services/vocabMasteryService';
import {
  KOKO_FLASHCARD_CONFIG,
  PROMPT_PHRASES,
} from '../../../config/kokoFlashcardConfig';
import type { Vocabulary } from '../../../types';

// ─── Config ────────────────────────────────────────────────────────────────

/** Tắt để ẩn cặp 🧡💚 khi chuyển đánh dấu sang kết quả game / Parent Sheet */
const TOPIC_SELF_MARKING = true;

// ─── Types ─────────────────────────────────────────────────────────────────

export type FlashcardVariant = 'lesson' | 'topic';

type KokoState =
  | 'INITIAL_SPEAK'
  | 'PROMPT_SAY'
  | 'WAIT_SPEAK'
  | 'PRAISING'
  | 'AUTO_ADVANCE'
  | 'SLEEPING';

type KokoExpression =
  | 'happy'
  | 'speaking'
  | 'listening'
  | 'celebrating'
  | 'sleeping';

export interface FlashcardViewProps {
  /** Danh sách từ vựng */
  items: Vocabulary[];
  childId: string;
  variant: FlashcardVariant;
  /** Callback khi xong toàn bộ deck (lesson → chuyển chặng, topic → màn hoàn thành) */
  onCompleteStep: () => void;
  /** Chỉ lesson: bật phụ đề lời Koko */
  subtitlesEnabled?: boolean;
}

// ─── FlashcardView ─────────────────────────────────────────────────────────

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  items,
  childId,
  variant,
  onCompleteStep,
  subtitlesEnabled = false,
}) => {
  const isLesson = variant === 'lesson';
  const isTopic  = variant === 'topic';

  // ── State ─────────────────────────────────────────────────────────────────
  const [deck, setDeck]   = useState<Vocabulary[]>(items);
  const [idx, setIdx]     = useState(0);

  // Lesson-only: Koko state machine
  const [kokoState, setKokoState]     = useState<KokoState>('INITIAL_SPEAK');
  const [kokoExpr, setKokoExpr]       = useState<KokoExpression>('happy');
  const [kokoText, setKokoText]       = useState('');
  const [passiveCount, setPassiveCount] = useState(0);
  const [, setHasInteracted]          = useState(false);

  // Shared
  const [isMicActive, setIsMicActive]           = useState(false);
  const [showAutoplayUnlock, setShowAutoplayUnlock] = useState(false);
  const [isWordSpeaking, setIsWordSpeaking]     = useState(false);
  const [celebrationStars, setCelebrationStars] = useState(false);

  // Topic-only: mastery state (re-read on each card change)
  const [masteryTick, setMasteryTick] = useState(0);

  // Topic-only: session counters for completion screen
  const [sessionMastered, setSessionMastered] = useState<string[]>([]);
  const [sessionReview, setSessionReview]     = useState<string[]>([]);

  // Topic-only: swipe/drag for 🧡💚
  const [dragOffset, setDragOffset]   = useState(0);
  const [isDragging, setIsDragging]   = useState(false);
  const [exitDir, setExitDir]         = useState<'left' | 'right' | null>(null);
  const startXRef   = useRef(0);
  const currentXRef = useRef(0);
  const ptrDownRef  = useRef(false);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimers = useCallback(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
  }, []);

  // ── Sync deck when items prop changes ─────────────────────────────────────
  useEffect(() => {
    setDeck(items);
    setIdx(0);
    setPassiveCount(0);
  }, [items]);

  // ── Reset drag on card change ─────────────────────────────────────────────
  useEffect(() => {
    setDragOffset(0);
    setExitDir(null);
    setMasteryTick(t => t + 1);
  }, [idx]);

  // ── Safe audio play ───────────────────────────────────────────────────────
  const playWordSafe = useCallback(async (text: string, audioUrl?: string) => {
    setIsWordSpeaking(true);
    try {
      await playWordAudio(text, audioUrl);
    } catch {
      setShowAutoplayUnlock(true);
    } finally {
      setIsWordSpeaking(false);
    }
  }, []);

  // ── Koko workflow (lesson only) ───────────────────────────────────────────
  useEffect(() => {
    if (!isLesson) return;
    if (!deck.length || idx >= deck.length) { clearTimers(); return; }

    const word = deck[idx];
    clearTimers();
    setHasInteracted(false);
    setIsMicActive(false);
    setCelebrationStars(false);

    if (passiveCount >= KOKO_FLASHCARD_CONFIG.PASSIVE_CARDS_BEFORE_SLEEP) {
      setKokoState('SLEEPING');
      setKokoExpr('sleeping');
      setKokoText('Koko đang ngủ tí... Chạm Koko để cùng học nhé! 💤');
      return;
    }

    setKokoState('INITIAL_SPEAK');
    setKokoExpr('speaking');
    setKokoText(`Cùng nghe từ "${word.english}" nhé!`);

    timers.current.wordDelay = setTimeout(async () => {
      await playWordSafe(word.english, word.audioUrl);
      setKokoExpr('happy');

      timers.current.promptDelay = setTimeout(() => {
        setKokoState('PROMPT_SAY');
        setKokoText(PROMPT_PHRASES[Math.floor(Math.random() * PROMPT_PHRASES.length)]);

        timers.current.speakWait = setTimeout(() => {
          setKokoState('WAIT_SPEAK');
          setKokoExpr('listening');
          setIsMicActive(true);

          timers.current.recordMax = setTimeout(() => {
            setIsMicActive(false);
            setKokoState('PRAISING');
            setKokoExpr('celebrating');
            setCelebrationStars(true);
            sfx.playCorrect();

            timers.current.praiseDuration = setTimeout(() => {
              setCelebrationStars(false);
              setKokoState('AUTO_ADVANCE');
              timers.current.autoAdvance = setTimeout(() => {
                goNext(true);
              }, KOKO_FLASHCARD_CONFIG.AUTO_ADVANCE_DELAY_MS);
            }, KOKO_FLASHCARD_CONFIG.PRAISE_MS);
          }, KOKO_FLASHCARD_CONFIG.RECORD_MAX_MS);
        }, KOKO_FLASHCARD_CONFIG.SPEAK_WAIT_MS);
      }, KOKO_FLASHCARD_CONFIG.PROMPT_SAY_DELAY_MS);
    }, KOKO_FLASHCARD_CONFIG.KOKO_WORD_DELAY_MS);

    return () => { clearTimers(); stopWordAudio(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, deck, passiveCount, isLesson]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback((isAuto = false) => {
    clearTimers();
    stopWordAudio();
    setPassiveCount(prev => isAuto ? prev + 1 : 0);
    if (idx + 1 < deck.length) {
      setIdx(prev => prev + 1);
    } else {
      onCompleteStep();
    }
  }, [clearTimers, idx, deck.length, onCompleteStep]);

  const goPrev = useCallback(() => {
    if (idx > 0) {
      clearTimers();
      stopWordAudio();
      setIdx(prev => prev - 1);
      setHasInteracted(true);
      setPassiveCount(0);
    }
  }, [clearTimers, idx]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const handleTapWord = useCallback(() => {
    if (!deck[idx]) return;
    setHasInteracted(true);
    setPassiveCount(0);
    sfx.playPop();
    playWordSafe(deck[idx].english, deck[idx].audioUrl);
  }, [deck, idx, playWordSafe]);

  const handleWakeKoko = useCallback(() => {
    sfx.playPop();
    setPassiveCount(0);
    setKokoExpr('happy');
    setKokoState('INITIAL_SPEAK');
    if (deck[idx]) playWordSafe(deck[idx].english, deck[idx].audioUrl);
  }, [deck, idx, playWordSafe]);

  const handleUnlockAudio = useCallback(() => {
    setShowAutoplayUnlock(false);
    if (deck[idx]) playWordSafe(deck[idx].english, deck[idx].audioUrl);
  }, [deck, idx, playWordSafe]);

  // ── Topic mastery handlers ────────────────────────────────────────────────
  const handleRemember = useCallback(() => {
    if (!deck[idx]) return;
    sfx.playCorrect();
    setExitDir('right');
    vocabMasteryService.markMastered(childId, deck[idx]);
    setMasteryTick(t => t + 1);
    setTimeout(() => {
      setExitDir(null);
      setDragOffset(0);
      goNext(false);
    }, 260);
  }, [childId, deck, idx, goNext]);

  const handleReview = useCallback(() => {
    if (!deck[idx]) return;
    sfx.playGentleWrong();
    setExitDir('left');
    vocabMasteryService.markReview(childId, deck[idx]);
    // Re-queue for spaced repetition
    setDeck(prev => [...prev, prev[idx]]);
    setMasteryTick(t => t + 1);
    setTimeout(() => {
      setExitDir(null);
      setDragOffset(0);
      goNext(false);
    }, 260);
  }, [childId, deck, idx, goNext]);

  // ── Swipe / drag (topic only) ─────────────────────────────────────────────
  const onPtrDown = useCallback((e: React.PointerEvent) => {
    if (!isTopic || exitDir) return;
    ptrDownRef.current = true;
    startXRef.current  = e.clientX;
    currentXRef.current = e.clientX;
    setIsDragging(true);
  }, [isTopic, exitDir]);

  const onPtrMove = useCallback((e: React.PointerEvent) => {
    if (!ptrDownRef.current) return;
    currentXRef.current = e.clientX;
    setDragOffset(currentXRef.current - startXRef.current);
  }, []);

  const onPtrUp = useCallback(() => {
    if (!ptrDownRef.current) return;
    ptrDownRef.current = false;
    setIsDragging(false);
    const diff = currentXRef.current - startXRef.current;
    if (diff > 75)       handleRemember();
    else if (diff < -75) handleReview();
    else                 setDragOffset(0);
  }, [handleRemember, handleReview]);

  const onPtrCancel = useCallback(() => {
    ptrDownRef.current = false;
    setIsDragging(false);
    setDragOffset(0);
  }, []);

  // ── Early returns ─────────────────────────────────────────────────────────
  if (!deck.length) return null;
  if (idx >= deck.length) {
    // Lesson → caller handles (onCompleteStep already called)
    return null;
  }

  const word = deck[idx];

  // Topic mastery status (read after masteryTick)
  const isMastered = isTopic && vocabMasteryService.isMastered(childId, word._id);
  const isNeedsReview = isTopic && vocabMasteryService.isReview(childId, word._id);

  // Swipe visual cues
  const rightOpacity = isTopic ? Math.min(1, Math.max(0, (dragOffset - 20) / 60)) : 0;
  const leftOpacity  = isTopic ? Math.min(1, Math.max(0, (-dragOffset - 20) / 60)) : 0;

  // Card transform (topic swipe)
  let cardTransform = '';
  if (exitDir === 'right')    cardTransform = 'translateX(450px) rotate(18deg)';
  else if (exitDir === 'left') cardTransform = 'translateX(-450px) rotate(-18deg)';
  else if (dragOffset !== 0)   cardTransform = `translateX(${dragOffset}px) rotate(${(dragOffset / 300) * 15}deg)`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 min-h-0 flex flex-col justify-between overflow-hidden relative select-none w-full"
      style={{ touchAction: isTopic ? 'pan-y' : undefined }}
    >
      {/* ── ProgressDots ── */}
      <div className="flex-shrink-0 w-full pt-1 pb-1 flex flex-col items-center">
        <ProgressDots total={deck.length} current={idx} color="amber" />
      </div>

      {/* ── CENTER: Flashcard Frame ── */}
      <main
        className="flex-1 min-h-0 w-full flex items-center justify-center px-3 sm:px-6 py-1 overflow-hidden relative"
        /* Swipe listeners on the whole center zone (topic only) */
        onPointerDown={isTopic ? onPtrDown : undefined}
        onPointerMove={isTopic ? onPtrMove : undefined}
        onPointerUp={isTopic   ? onPtrUp   : undefined}
        onPointerCancel={isTopic ? onPtrCancel : undefined}
      >
        {/* Koko sleeping overlay (lesson only) */}
        {isLesson && kokoState === 'SLEEPING' && (
          <div
            onClick={handleWakeKoko}
            className="absolute inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="bg-white/95 border-3 border-amber-400 rounded-3xl p-5 shadow-2xl flex flex-col items-center gap-3 animate-pop-in max-w-xs text-center mx-4">
              <KokoMascot state="sleeping" size="md" interactive={false} />
              <p className="font-black text-slate-800 text-sm">Koko đang chợp mắt tí xíu... 💤</p>
              <button onClick={handleWakeKoko} className="py-2.5 px-6 rounded-2xl bg-amber-400 font-black text-amber-950 text-sm">
                Chạm để đánh thức Koko ✨
              </button>
            </div>
          </div>
        )}

        {/* Autoplay unlock overlay */}
        {showAutoplayUnlock && (
          <div onClick={handleUnlockAudio} className="absolute inset-0 z-40 bg-amber-500/30 backdrop-blur-[2px] flex items-center justify-center cursor-pointer">
            <button onClick={handleUnlockAudio} className="bg-white border-4 border-amber-400 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-2 animate-soft-bounce">
              <PlayCircle className="w-16 h-16 text-amber-500 animate-pulse" />
              <span className="font-black text-amber-950 text-base">Chạm để nghe Koko đọc 🔊</span>
            </button>
          </div>
        )}

        {/* Topic swipe overlays */}
        {isTopic && (
          <>
            <div className="absolute top-6 left-6 z-30 pointer-events-none transition-opacity duration-150"
              style={{ opacity: exitDir === 'right' ? 1 : rightOpacity }}>
              <div className="bg-emerald-500 text-white font-black text-base px-4 py-2 rounded-2xl border-3 border-white shadow-xl flex items-center gap-2 rotate-[-12deg]">
                💚 ĐÃ NHỚ RỒI!
              </div>
            </div>
            <div className="absolute top-6 right-6 z-30 pointer-events-none transition-opacity duration-150"
              style={{ opacity: exitDir === 'left' ? 1 : leftOpacity }}>
              <div className="bg-amber-500 text-white font-black text-base px-4 py-2 rounded-2xl border-3 border-white shadow-xl flex items-center gap-2 rotate-[12deg]">
                🧡 CẦN ÔN LẠI
              </div>
            </div>
          </>
        )}

        {/*
         * Card frame — identical to Chặng 1.
         * Topic: wrap in drag-transform div.
         */}
        <div
          className="w-full max-w-4xl h-full max-h-[440px]"
          style={isTopic ? {
            transform: cardTransform,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2,0.8,0.2,1)',
            cursor: isDragging ? 'grabbing' : 'grab',
          } : undefined}
        >
          <div className="w-full h-full bg-white rounded-3xl border-4 border-amber-300 shadow-xl overflow-hidden flex flex-col justify-center p-3 sm:p-5 relative">
            {/* Celebration stars overlay */}
            {celebrationStars && (
              <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center overflow-hidden">
                <span className="absolute text-5xl animate-star-spin" style={{ top: '15%', left: '20%' }}>⭐</span>
                <span className="absolute text-4xl animate-star-spin" style={{ top: '25%', right: '20%' }}>✨</span>
                <span className="absolute text-5xl animate-star-spin" style={{ bottom: '20%', left: '25%' }}>🌟</span>
                <span className="absolute text-4xl animate-star-spin" style={{ bottom: '15%', right: '20%' }}>🎉</span>
              </div>
            )}

            {/* ── 2-column grid (1-col mobile, 2-col md+) ── */}
            <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 items-center justify-center min-h-0">

              {/* LEFT: hero image */}
              <div
                onClick={handleTapWord}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleTapWord()}
                aria-label={`Chạm để nghe phát âm ${word.english}`}
                className="w-full h-full max-h-[290px] md:max-h-full rounded-2xl bg-amber-50/70 border-2 border-amber-200/80 flex items-center justify-center relative cursor-pointer group active:scale-[0.98] transition-all overflow-hidden p-2"
              >
                <WordImage word={word} />

                {/* 🔊 corner button — 52×52px, stops drag propagation */}
                <button
                  onClick={e => { e.stopPropagation(); handleTapWord(); }}
                  onPointerDown={e => e.stopPropagation()}
                  aria-label={`Nghe phát âm ${word.english}`}
                  style={{ width: '52px', height: '52px' }}
                  className={`absolute bottom-3 right-3 rounded-2xl bg-white/95 border-2 border-amber-300 shadow-md flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                    isWordSpeaking ? 'ring-4 ring-amber-400 bg-amber-100 scale-110' : 'hover:bg-amber-50'
                  }`}
                >
                  <Volume2 className={`w-7 h-7 text-amber-700 ${isWordSpeaking ? 'animate-bounce' : ''}`} />
                </button>
              </div>

              {/* RIGHT: Koko + word + meaning [+ mastery buttons topic] */}
              <div className="w-full flex flex-col items-center md:items-start justify-center gap-2 px-2 text-center md:text-left min-h-0">

                {/* Koko */}
                <div className="flex items-center gap-2 mb-1">
                  <KokoMascot
                    state={isLesson ? kokoExpr : 'happy'}
                    size="sm"
                    interactive={true}
                    onClick={isLesson ? handleTapWord : handleTapWord}
                  />
                  {/* Subtitles (lesson only) */}
                  {isLesson && subtitlesEnabled && kokoText && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl px-3 py-1.5 shadow-xs max-w-xs">
                      <p className="font-black text-amber-950 text-xs leading-snug">{kokoText}</p>
                    </div>
                  )}
                </div>

                {/* English word */}
                <button
                  onClick={handleTapWord}
                  className="font-black text-amber-950 uppercase tracking-wide leading-none hover:text-amber-800 active:scale-95 transition-transform cursor-pointer"
                  style={{ fontSize: 'clamp(36px, 8vmin, 68px)', lineHeight: 1.1 }}
                >
                  {word.english}
                </button>

                {/* Vietnamese meaning */}
                {word.vietnamese && (
                  <p className="font-black text-emerald-700 tracking-normal"
                    style={{ fontSize: 'clamp(22px, 4.5vmin, 32px)' }}>
                    {word.vietnamese}
                  </p>
                )}

                {/* ── Mastery buttons (topic only, TOPIC_SELF_MARKING=true) ── */}
                {isTopic && TOPIC_SELF_MARKING && (
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleReview(); }}
                      onPointerDown={e => e.stopPropagation()}
                      aria-label="Chưa nhớ — đánh dấu cần ôn lại"
                      style={{ width: '64px', height: '64px' }}
                      className={`rounded-2xl flex items-center justify-center text-3xl cursor-pointer active:scale-95 transition-all shadow-md border-3 ${
                        isNeedsReview
                          ? 'bg-amber-400 border-amber-500 ring-3 ring-amber-300'
                          : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      🧡
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); handleRemember(); }}
                      onPointerDown={e => e.stopPropagation()}
                      aria-label="Đã nhớ — lưu vào danh sách đã thuộc"
                      style={{ width: '64px', height: '64px' }}
                      className={`rounded-2xl flex items-center justify-center text-3xl cursor-pointer active:scale-95 transition-all shadow-md border-3 ${
                        isMastered
                          ? 'bg-emerald-400 border-emerald-500 ring-3 ring-emerald-300'
                          : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      💚
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ACTION BAR ── */}
      {/*
       * Identical button layout/sizes for both variants:
       *   ◀ 60×60px | 🔊 74×74px | 🎤 74×74px | ➜ 74×74px
       * stopPropagation on all buttons so topic swipe doesn't fire.
       */}
      <footer className="flex-shrink-0 w-full flex items-center justify-center px-4 py-2 z-20">
        <div className="flex items-center justify-center gap-4 sm:gap-6">

          {/* ◀ Prev — 60×60px, ghost */}
          <button
            type="button"
            onClick={goPrev}
            onPointerDown={e => e.stopPropagation()}
            disabled={idx === 0}
            aria-label="Quay lại thẻ trước"
            style={{ width: '60px', height: '60px' }}
            className={`rounded-2xl border-2 flex items-center justify-center transition-all ${
              idx === 0
                ? 'opacity-30 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700 active:scale-95 cursor-pointer shadow-xs'
            }`}
          >
            <ArrowLeft className="w-7 h-7 stroke-[2.5]" />
          </button>

          {/* 🔊 Play — 74×74px, amber */}
          <button
            type="button"
            onClick={handleTapWord}
            onPointerDown={e => e.stopPropagation()}
            aria-label="Nghe phát âm từ"
            style={{ width: '74px', height: '74px' }}
            className="rounded-3xl bg-amber-400 hover:bg-amber-300 border-b-4 border-amber-600 text-amber-950 flex items-center justify-center shadow-lg active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <Volume2 className="w-9 h-9 stroke-[2.5]" />
          </button>

          {/* 🎤 Mic — 74×74px, pink */}
          <button
            type="button"
            onClick={handleTapWord}
            onPointerDown={e => e.stopPropagation()}
            aria-label="Bé đọc theo"
            style={{ width: '74px', height: '74px' }}
            className={`rounded-3xl flex items-center justify-center shadow-lg transition-all cursor-pointer ${
              isMicActive
                ? 'bg-rose-500 border-b-4 border-rose-700 text-white ring-4 ring-rose-300 animate-pulse'
                : 'bg-pink-400 hover:bg-pink-300 border-b-4 border-pink-600 text-white active:translate-y-1 active:border-b-2'
            }`}
          >
            <Mic className="w-9 h-9 stroke-[2.5]" />
          </button>

          {/* ➜ Next — 74×74px, emerald */}
          <button
            type="button"
            onClick={() => goNext(false)}
            onPointerDown={e => e.stopPropagation()}
            aria-label="Sang thẻ tiếp theo"
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
