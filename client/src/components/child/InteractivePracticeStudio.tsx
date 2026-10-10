/**
 * InteractivePracticeStudio — Chặng 2 "Luyện tập"
 *
 * Layout architecture (viewport-locked, no outer scroll):
 *
 *  ┌────────────────────────────────────────────────────┐
 *  │  HEADER: [← back-icon] [● ● ● ● ●] [ⓘ parent]   │  flex-shrink-0, ≤48px
 *  ├────────────────────────────────────────────────────┤
 *  │                                                    │
 *  │  STAGE: image + word + meaning          flex-1     │  min-h-0
 *  │  (2-col on wide screens via CSS grid)              │
 *  │                                                    │
 *  ├────────────────────────────────────────────────────┤
 *  │  ACTION BAR: [🔊] [🎤] [→]                        │  flex-shrink-0, ≥64px
 *  └────────────────────────────────────────────────────┘
 *
 * Rules:
 * - No px heights for images/containers. Use flex-1 + min-h-0 + object-contain.
 * - clamp() / dvh / cqmin for all dynamic sizes.
 * - Koko is placed inside the stage (not fixed/absolute on page).
 * - All text in child zone ≥ 20px; actions ≥ 64px tall; gap ≥ 16px.
 * - Parent Sheet contains: phonetics, stage chip, back-to-stage1 link.
 * - CTA "Tiếp" always enabled (no dead-end), pulses after first interaction.
 * - Mic: always gives positive feedback; gracefully hides if unavailable.
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Gamepad2,
  Info,
  Mic,
  RotateCcw,
  Star,
  Volume2,
  X,
} from 'lucide-react';
import type { Vocabulary } from '../../types';
import { sfx, playWordAudio, stopWordAudio } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface InteractivePracticeStudioProps {
  vocabulary: Vocabulary[];
  lessonTitle?: string;
  ageGroupCode?: string;
  onComplete: (stats: { score: number; stars: number }) => void;
  onBackToStage1: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// ParentSheet — bottom-sheet with info for parents/teachers
// ─────────────────────────────────────────────────────────────────────────────
interface ParentSheetProps {
  word: Vocabulary;
  ageGroupCode: string;
  wordIdx: number;
  totalWords: number;
  onClose: () => void;
  onBackToStage1: () => void;
}

const ParentSheet: React.FC<ParentSheetProps> = ({
  word, ageGroupCode, wordIdx, totalWords, onClose, onBackToStage1
}) => (
  // Overlay
  <div
    className="fixed inset-0 z-50 flex flex-col justify-end"
    style={{ background: 'rgba(0,0,0,0.5)' }}
    onClick={onClose}
  >
    <div
      className="bg-white rounded-t-3xl border-t-4 border-amber-300 shadow-2xl flex flex-col"
      style={{ maxHeight: '70dvh' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Handle bar */}
      <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
        <div className="w-10 h-1.5 rounded-full bg-slate-200" />
      </div>

      {/* Sheet header */}
      <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0 border-b border-slate-100">
        <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-600" />
          Thông tin bài học
        </h3>
        <button
          onClick={onClose}
          style={{ minWidth: '44px', minHeight: '44px' }}
          className="rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* Sheet body — scrollable */}
      <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
        {/* Word detail */}
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4">
          <p className="text-xs font-black text-amber-700 uppercase tracking-wide mb-2">Từ đang học</p>
          <div className="flex items-center gap-3">
            {word.imageUrl && (
              <img src={word.imageUrl} alt={word.english}
                className="w-14 h-14 rounded-xl object-contain bg-white border border-amber-200" />
            )}
            <div>
              <p className="font-black text-2xl text-slate-800">{word.english}</p>
              <p className="font-bold text-slate-600">{word.vietnamese}</p>
              {word.pronunciation && (
                <p className="text-sm font-mono text-slate-400">{word.pronunciation}</p>
              )}
            </div>
          </div>
          {word.exampleSentence && (
            <p className="mt-3 text-sm font-bold text-slate-600 bg-white rounded-xl px-3 py-2 border border-amber-100">
              "{word.exampleSentence}"
            </p>
          )}
        </div>

        {/* Progress info */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Tiến độ</p>
          <p className="font-bold text-slate-700">Từ {wordIdx + 1} / {totalWords}</p>
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: totalWords }).map((_, i) => (
              <div key={i}
                className={`h-2 flex-1 rounded-full ${i <= wordIdx ? 'bg-amber-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        {/* Age group info */}
        <div className="bg-sky-50 rounded-2xl border border-sky-200 p-4">
          <p className="text-xs font-black text-sky-600 uppercase tracking-wide mb-1">Nhóm tuổi</p>
          <p className="font-bold text-sky-800">
            {ageGroupCode === '3-4' ? 'Nhóm Mầm (3–4 tuổi) — Xưởng Giác Quan & Bóng Đổ'
              : ageGroupCode === '4-5' ? 'Nhóm Chồi (4–5 tuổi) — Xưởng Săn Âm Phonics'
                : 'Nhóm Lá (5–6 tuổi) — Xưởng Ghép Chữ & Câu'}
          </p>
        </div>

        {/* Back to stage 1 */}
        <button
          onClick={() => { onClose(); onBackToStage1(); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm cursor-pointer transition-colors"
          style={{ minHeight: '48px' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại Flashcard (Chặng 1)
        </button>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// StarBurst — positive feedback overlay (no layout impact)
// ─────────────────────────────────────────────────────────────────────────────
const StarBurst: React.FC = () => (
  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-pop-in">
    <div className="flex gap-2">
      {[0, 1, 2].map(i => (
        <Star key={i} className="w-10 h-10 text-amber-400 fill-amber-400"
          style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export const InteractivePracticeStudio: React.FC<InteractivePracticeStudioProps> = ({
  vocabulary,
  ageGroupCode = '3-4',
  onComplete,
  onBackToStage1,
}) => {
  // ── Data ──────────────────────────────────────────────────────────────────
  const words: Vocabulary[] = vocabulary.length > 0 ? vocabulary : [{
    _id: 'sample_1', english: 'Apple', vietnamese: 'Quả táo',
    pronunciation: '/ˈæp.əl/',
    imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&auto=format&fit=crop&q=80',
    exampleSentence: 'This is an apple.',
  }];

  const isMamAge = ageGroupCode === '3-4';
  const isChoiAge = ageGroupCode === '4-5';

  // ── State ─────────────────────────────────────────────────────────────────
  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [subStep, setSubStep] = useState<1 | 2>(1);
  const [isAwakened, setIsAwakened] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [starsEarned, setStarsEarned] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [showParentSheet, setShowParentSheet] = useState(false);
  // Pulse "Tiếp" button after first interaction
  const [hasInteracted, setHasInteracted] = useState(false);
  // Star burst feedback
  const [showStarBurst, setShowStarBurst] = useState(false);
  // Encouragement (wrong answer)
  const [showEncouragement, setShowEncouragement] = useState(false);
  // 5-6 speller
  const [spelledLetters, setSpelledLetters] = useState<string[]>([]);

  const currentWord = words[currentWordIdx] || words[0];

  // ── Auto-play audio on word/step change ───────────────────────────────────
  useEffect(() => {
    setIsAwakened(false);
    setSelectedOptionId(null);
    setFeedbackState('idle');
    setSpelledLetters([]);
    setHasInteracted(false);
    stopWordAudio();

    if (!isMamAge || subStep === 2) {
      const t = setTimeout(() => playWordAudio(currentWord.english, currentWord.audioUrl), 350);
      return () => clearTimeout(t);
    }
  }, [currentWordIdx, subStep, isMamAge]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const triggerCorrect = (delayMs = 1400) => {
    setFeedbackState('correct');
    sfx.playCorrect();
    setStarsEarned(p => p + 1);
    setShowStarBurst(true);
    setTimeout(() => setShowStarBurst(false), 900);
    return delayMs;
  };

  const triggerWrong = () => {
    setFeedbackState('wrong');
    sfx.playGentleWrong();
    setShowEncouragement(true);
    setTimeout(() => {
      setFeedbackState('idle');
      setSelectedOptionId(null);
      setShowEncouragement(false);
    }, 1800);
  };

  const advanceToNextWordOrFinish = () => {
    if (currentWordIdx + 1 < words.length) {
      setCurrentWordIdx(p => p + 1);
      setSubStep(1);
    } else {
      sfx.playStarFanfare();
      setIsFinished(true);
    }
  };

  const getDistractors = (count: number) => {
    const others = words.filter(w => w.english !== currentWord.english);
    return others.length >= count
      ? [...others].sort(() => 0.5 - Math.random()).slice(0, count)
      : others;
  };

  const handlePlayAudio = () => {
    setHasInteracted(true);
    playWordAudio(currentWord.english, currentWord.audioUrl);
  };

  const handleMicSimulate = () => {
    if (isRecording) return;
    setHasInteracted(true);
    sfx.playPop();
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      sfx.playCorrect();
      setShowStarBurst(true);
      setTimeout(() => setShowStarBurst(false), 900);
    }, 2200);
  };

  const handleNext = () => {
    sfx.playPop();
    if (subStep === 1 && isMamAge && isAwakened) {
      setSubStep(2);
    } else if (subStep === 1 && !isMamAge) {
      setSubStep(2);
    } else {
      advanceToNextWordOrFinish();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Completion screen
  // ─────────────────────────────────────────────────────────────────────────
  if (isFinished) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-4 text-center">
        <span style={{ fontSize: 'clamp(2.5rem, 8dvh, 4.5rem)' }}>🏆</span>
        <div>
          <h2 className="font-black text-slate-800" style={{ fontSize: 'clamp(1.1rem, 3.5dvh, 1.6rem)' }}>
            Bé giỏi quá! Đã xong hết từ! 🎉
          </h2>
          <p className="text-slate-500 font-bold mt-1" style={{ fontSize: 'clamp(0.8rem, 2dvh, 0.95rem)' }}>
            Chặng 3 — Mini-game đang chờ bé!
          </p>
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <Star key={i} className="text-amber-400 fill-amber-400"
              style={{ width: 'clamp(1.5rem, 5dvh, 2.5rem)', height: 'clamp(1.5rem, 5dvh, 2.5rem)' }} />
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button onClick={() => { sfx.playPop(); setCurrentWordIdx(0); setSubStep(1); setIsFinished(false); setStarsEarned(0); }}
            style={{ minHeight: '52px' }}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm cursor-pointer transition-colors">
            <RotateCcw className="w-4 h-4" /> Luyện lại
          </button>
          <button
            onClick={() => onComplete({ score: starsEarned * 20, stars: 3 })}
            style={{ minHeight: '52px' }}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-sm cursor-pointer shadow-lg active:scale-95 transition-all border-2 border-purple-400">
            <Gamepad2 className="w-4 h-4" /> Chặng 3 🚀
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stage content renderers
  // Each renderer returns JSX that fills flex-1, no fixed heights.
  // ─────────────────────────────────────────────────────────────────────────

  /** MẦM SubStep 1: Tap-to-awaken egg → reveal word card */
  const renderMamStep1 = () => (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
      {!isAwakened ? (
        // Egg button — size via clamp on dvh
        <button
          onClick={() => {
            setIsAwakened(true);
            setHasInteracted(true);
            sfx.playBadgeChime();
            playWordAudio(currentWord.english, currentWord.audioUrl);
          }}
          style={{ width: 'clamp(120px,28dvh,200px)', height: 'clamp(120px,28dvh,200px)' }}
          className="rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-orange-400 text-white flex flex-col items-center justify-center cursor-pointer shadow-2xl hover:scale-105 active:scale-95 animate-soft-bounce border-4 border-white select-none"
          aria-label="Chạm để mở từ mới"
        >
          <span style={{ fontSize: 'clamp(2.5rem, 10dvh, 4.5rem)' }}>🎁</span>
          <span className="font-black text-amber-950 bg-white/80 px-3 py-1 rounded-full shadow-xs"
            style={{ fontSize: 'clamp(0.7rem, 2dvh, 0.875rem)' }}>
            Chạm để mở! ✨
          </span>
        </button>
      ) : (
        // Revealed word card — no fixed height, flex-col proportional
        <div className="w-full max-w-xs bg-white rounded-3xl border-4 border-amber-300 shadow-xl flex flex-col items-center overflow-hidden animate-pop-in"
          style={{ flex: '1 1 0', minHeight: 0 }}>
          {/* Image — flex-1, never overflows */}
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-3">
            {currentWord.imageUrl ? (
              <img src={currentWord.imageUrl} alt={currentWord.english}
                className="max-h-full max-w-full object-contain rounded-2xl drop-shadow-md"
                loading="lazy" />
            ) : (
              <span style={{ fontSize: 'clamp(3rem,14dvh,6rem)' }}>🐾</span>
            )}
          </div>
          {/* Word + meaning */}
          <div className="flex-shrink-0 text-center px-4 pb-4">
            <h4 className="font-black text-amber-950 uppercase"
              style={{ fontSize: `clamp(1.5rem,${currentWord.english.length > 8 ? '5' : '7'}dvh,3rem)` }}>
              {currentWord.english}
            </h4>
            <p className="font-extrabold text-amber-700"
              style={{ fontSize: 'clamp(0.95rem,2.5dvh,1.2rem)' }}>
              {currentWord.vietnamese}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  /** MẦM SubStep 2: Shadow silhouette match */
  const renderMamStep2 = () => {
    const distractors = getDistractors(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const handleSelect = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);
      setHasInteracted(true);
      if (word.english === currentWord.english) {
        const delay = triggerCorrect();
        setTimeout(advanceToNextWordOrFinish, delay);
      } else {
        triggerWrong();
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
        {/* Shadow target */}
        <div className="relative flex-shrink-0"
          style={{ width: 'clamp(80px,18dvh,130px)', height: 'clamp(80px,18dvh,130px)' }}>
          <div className="w-full h-full rounded-3xl bg-slate-100 border-4 border-dashed border-slate-300 flex items-center justify-center overflow-hidden">
            {feedbackState === 'correct' ? (
              <img src={currentWord.imageUrl} alt={currentWord.english}
                className="w-full h-full object-contain animate-pop-in" />
            ) : (
              <img src={currentWord.imageUrl} alt="bóng bí ẩn"
                className="w-full h-full object-contain filter brightness-0 opacity-75" />
            )}
          </div>
          <div className="absolute bottom-1 inset-x-1 flex justify-center">
            <span className="bg-slate-800/80 text-white font-black rounded-full px-2 py-0.5"
              style={{ fontSize: 'clamp(0.6rem,1.5dvh,0.75rem)' }}>
              {feedbackState === 'correct' ? currentWord.english : '❓'}
            </span>
          </div>
        </div>

        {/* 3 option cards */}
        <div className="flex gap-3 flex-shrink-0 w-full max-w-sm justify-center">
          {options.map(opt => {
            const isSel = selectedOptionId === opt._id;
            return (
              <button key={opt._id} onClick={() => handleSelect(opt)}
                disabled={feedbackState !== 'idle'}
                style={{ flex: '1 1 0', minHeight: 'clamp(72px,16dvh,110px)' }}
                className={`rounded-3xl border-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all select-none overflow-hidden ${isSel && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSel && feedbackState === 'wrong'
                      ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                      : 'border-amber-200 bg-white hover:border-amber-400 hover:scale-105 active:scale-95'
                  }`}
              >
                {opt.imageUrl && (
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1.5">
                    <img src={opt.imageUrl} alt={opt.english}
                      className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <span className="flex-shrink-0 font-black text-slate-700 pb-1"
                  style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>
                  {opt.vietnamese}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /** CHỒI SubStep 1: Initial phonics catch */
  const renderChoiStep1 = () => {
    const first = currentWord.english.trim().charAt(0).toUpperCase();
    const rest = currentWord.english.trim().slice(1);
    const distractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
      .filter(l => l !== first).sort(() => 0.5 - Math.random()).slice(0, 2);
    const choices = [first, ...distractors].sort(() => 0.5 - Math.random());

    const handleSelect = (letter: string) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(letter);
      setHasInteracted(true);
      if (letter === first) {
        const delay = triggerCorrect(1400);
        playWordAudio(currentWord.english, currentWord.audioUrl);
        setTimeout(() => setSubStep(2), delay);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => { setFeedbackState('idle'); setSelectedOptionId(null); }, 1000);
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
        {/* Word with hidden first letter */}
        <div className="bg-white rounded-3xl border-4 border-sky-300 shadow-md flex flex-col items-center overflow-hidden"
          style={{ width: 'min(100%, 280px)', flex: '1 1 0', minHeight: 0 }}>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-3">
            {currentWord.imageUrl
              ? <img src={currentWord.imageUrl} alt={currentWord.english}
                className="max-h-full max-w-full object-contain" loading="lazy" />
              : <span style={{ fontSize: 'clamp(3rem,12dvh,5rem)' }}>🐾</span>}
          </div>
          <div className="flex-shrink-0 flex items-center justify-center gap-2 pb-4 px-3">
            <div
              style={{
                width: 'clamp(40px,7dvh,56px)',
                height: 'clamp(40px,7dvh,56px)',
                fontSize: 'clamp(1.2rem,4dvh,2rem)',
              }}
              className={`rounded-2xl flex items-center justify-center font-black border-4 transition-all ${feedbackState === 'correct'
                  ? 'bg-emerald-500 text-white border-emerald-600 animate-star-celebrate'
                  : 'bg-sky-50 text-sky-700 border-dashed border-sky-400'
                }`}
            >
              {feedbackState === 'correct' ? first : '?'}
            </div>
            <span className="font-black text-slate-800"
              style={{ fontSize: 'clamp(1.5rem,5dvh,2.5rem)' }}>
              {rest}
            </span>
          </div>
        </div>

        {/* 3 letter bubbles */}
        <div className="flex-shrink-0 flex gap-4 justify-center">
          {choices.map(letter => {
            const isSel = selectedOptionId === letter;
            return (
              <button key={letter} onClick={() => handleSelect(letter)}
                disabled={feedbackState !== 'idle'}
                style={{
                  width: 'clamp(52px,12dvh,72px)',
                  height: 'clamp(52px,12dvh,72px)',
                  fontSize: 'clamp(1.2rem,4dvh,2rem)',
                }}
                className={`rounded-full font-black flex items-center justify-center cursor-pointer shadow-lg transition-all select-none ${isSel && feedbackState === 'correct'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-300 scale-110'
                    : isSel && feedbackState === 'wrong'
                      ? 'bg-rose-500 text-white animate-gentle-wobble'
                      : 'bg-gradient-to-tr from-amber-400 to-orange-400 text-white hover:scale-110 active:scale-95'
                  }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /** CHỒI SubStep 2: Picture-in-context */
  const renderChoiStep2 = () => {
    const distractors = getDistractors(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());

    const handleSelect = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);
      setHasInteracted(true);
      if (word.english === currentWord.english) {
        const delay = triggerCorrect();
        playWordAudio(currentWord.english, currentWord.audioUrl);
        setTimeout(advanceToNextWordOrFinish, delay);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => { setFeedbackState('idle'); setSelectedOptionId(null); }, 1000);
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
        {/* Scene canvas — flex proportional */}
        <div className="relative w-full max-w-xs bg-gradient-to-b from-sky-200 via-amber-100 to-emerald-100 rounded-3xl border-4 border-teal-300 shadow-md flex items-center justify-center overflow-hidden"
          style={{ flex: '1 1 0', minHeight: 0 }}>
          <span className="absolute top-3 left-5 text-3xl opacity-60">☀️</span>
          <span className="absolute top-5 right-6 text-2xl opacity-60">🌈</span>
          <span className="absolute bottom-2 left-4 text-2xl opacity-60">🌿</span>
          {feedbackState === 'correct'
            ? <div className="animate-pop-in flex flex-col items-center gap-1">
              <img src={currentWord.imageUrl} alt={currentWord.english}
                className="object-contain drop-shadow-md"
                style={{ maxHeight: 'clamp(60px,14dvh,100px)', maxWidth: '80%' }} />
              <span className="font-black text-emerald-800 bg-white/90 px-3 py-0.5 rounded-full text-sm">{currentWord.english} ⭐</span>
            </div>
            : <div className="flex flex-col items-center gap-1">
              <span style={{ fontSize: 'clamp(2rem,8dvh,3.5rem)' }} className="animate-pulse">✨</span>
              <span className="font-black text-teal-800 text-xs">Đặt vào đây</span>
            </div>
          }
        </div>

        {/* 3 choices */}
        <div className="flex-shrink-0 flex gap-3 w-full max-w-sm justify-center">
          {options.map(opt => {
            const isSel = selectedOptionId === opt._id;
            return (
              <button key={opt._id} onClick={() => handleSelect(opt)}
                disabled={feedbackState !== 'idle'}
                style={{ flex: '1 1 0', minHeight: 'clamp(68px,15dvh,100px)' }}
                className={`rounded-3xl border-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all select-none overflow-hidden ${isSel && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSel && feedbackState === 'wrong'
                      ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                      : 'border-slate-200 bg-white hover:border-teal-400 hover:scale-105 active:scale-95'
                  }`}
              >
                {opt.imageUrl && (
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                    <img src={opt.imageUrl} alt={opt.english}
                      className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <span className="flex-shrink-0 font-black text-slate-800 pb-1"
                  style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>
                  {opt.english}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  /** LÁ SubStep 1: Train speller */
  const renderLaStep1 = () => {
    const letters = currentWord.english.toUpperCase().split('');
    const nextIdx = spelledLetters.length;
    const isCompleted = spelledLetters.length === letters.length;
    const scrambled = [...letters].sort(() => 0.5 - Math.random());

    const handleTap = (letter: string) => {
      if (feedbackState !== 'idle' || isCompleted) return;
      setHasInteracted(true);
      if (letter === letters[nextIdx]) {
        sfx.playCorrect();
        const updated = [...spelledLetters, letter];
        setSpelledLetters(updated);
        if (updated.length === letters.length) {
          triggerCorrect(1600);
          playWordAudio(currentWord.english, currentWord.audioUrl);
          setTimeout(() => setSubStep(2), 1600);
        }
      } else {
        sfx.playGentleWrong();
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
        {/* Word image */}
        <div className="flex-shrink-0"
          style={{ width: 'clamp(64px,14dvh,96px)', height: 'clamp(64px,14dvh,96px)' }}>
          {currentWord.imageUrl
            ? <img src={currentWord.imageUrl} alt={currentWord.english}
              className="w-full h-full object-contain rounded-2xl shadow-md border-3 border-purple-200" />
            : <span style={{ fontSize: 'clamp(2.5rem,10dvh,4rem)' }}>🐾</span>}
        </div>

        {/* Train track letter slots */}
        <div className="flex-shrink-0 bg-purple-50/80 border-4 border-purple-200 rounded-3xl px-4 py-3 max-w-full">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span style={{ fontSize: 'clamp(1.5rem,5dvh,2rem)' }}>🚂</span>
            {letters.map((_c, i) => {
              const filled = spelledLetters[i];
              return (
                <div key={i}
                  style={{
                    width: 'clamp(32px,6dvh,48px)',
                    height: 'clamp(36px,7dvh,52px)',
                    fontSize: 'clamp(1rem,3.5dvh,1.5rem)',
                  }}
                  className={`rounded-xl flex items-center justify-center font-black border-4 transition-all ${filled
                      ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md animate-pop-in'
                      : i === nextIdx
                        ? 'bg-white border-purple-400 border-dashed animate-pulse ring-2 ring-purple-300'
                        : 'bg-white/60 border-slate-300'
                    }`}
                >
                  {filled || ''}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrambled letter buttons */}
        <div className="flex-shrink-0 flex gap-3 flex-wrap justify-center">
          {scrambled.map((char, i) => (
            <button key={`${char}_${i}`} onClick={() => handleTap(char)}
              disabled={isCompleted}
              style={{
                width: 'clamp(40px,9dvh,56px)',
                height: 'clamp(40px,9dvh,56px)',
                fontSize: 'clamp(1rem,3.5dvh,1.6rem)',
              }}
              className="rounded-2xl bg-white border-4 border-purple-300 hover:border-purple-500 font-black text-purple-900 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 active:scale-95 transition-all"
            >
              {char}
            </button>
          ))}
        </div>
      </div>
    );
  };

  /** LÁ SubStep 2: Mini sentence builder */
  const renderLaStep2 = () => {
    const distractors = getDistractors(2);
    const options = [currentWord, ...distractors].sort(() => 0.5 - Math.random());
    const template = currentWord.exampleSentence
      ? currentWord.exampleSentence.replace(new RegExp(currentWord.english, 'i'), '[ ... ]')
      : `Look! This is a [ ... ].`;
    const full = currentWord.exampleSentence || `Look! This is a ${currentWord.english}.`;

    const handleSelect = (word: Vocabulary) => {
      if (feedbackState !== 'idle') return;
      setSelectedOptionId(word._id);
      setHasInteracted(true);
      if (word.english === currentWord.english) {
        const delay = triggerCorrect(1800);
        playWordAudio(full);
        setTimeout(advanceToNextWordOrFinish, delay);
      } else {
        setFeedbackState('wrong');
        sfx.playGentleWrong();
        setTimeout(() => { setFeedbackState('idle'); setSelectedOptionId(null); }, 1000);
      }
    };

    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-hidden">
        {/* Sentence card */}
        <div className="w-full max-w-xs bg-white rounded-3xl border-4 border-pink-300 shadow-md flex flex-col items-center overflow-hidden"
          style={{ flex: '1 1 0', minHeight: 0 }}>
          <div className="flex-1 min-h-0 w-full flex items-center justify-center p-3">
            {currentWord.imageUrl
              ? <img src={currentWord.imageUrl} alt={currentWord.english}
                className="max-h-full max-w-full object-contain rounded-2xl" loading="lazy" />
              : <span style={{ fontSize: 'clamp(3rem,12dvh,5rem)' }}>🐾</span>}
          </div>
          <div className="flex-shrink-0 px-4 pb-4 text-center">
            <p className="font-black text-slate-800"
              style={{ fontSize: 'clamp(0.85rem,2.5dvh,1.1rem)' }}>
              {feedbackState === 'correct'
                ? <span className="text-emerald-600">{full}</span>
                : template}
            </p>
          </div>
        </div>

        {/* 3 word choices */}
        <div className="flex-shrink-0 flex gap-3 w-full max-w-sm justify-center">
          {options.map(opt => {
            const isSel = selectedOptionId === opt._id;
            return (
              <button key={opt._id} onClick={() => handleSelect(opt)}
                disabled={feedbackState !== 'idle'}
                style={{ flex: '1 1 0', minHeight: 'clamp(52px,11dvh,72px)' }}
                className={`rounded-2xl border-4 flex flex-col items-center justify-center cursor-pointer transition-all select-none ${isSel && feedbackState === 'correct'
                    ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300'
                    : isSel && feedbackState === 'wrong'
                      ? 'border-rose-400 bg-rose-50 animate-gentle-wobble'
                      : 'border-slate-200 bg-white hover:border-pink-300 hover:scale-105 active:scale-95'
                  }`}
              >
                <span className="font-black text-slate-800"
                  style={{ fontSize: 'clamp(0.75rem,2.2dvh,1rem)' }}>{opt.english}</span>
                <span className="text-slate-400 font-bold"
                  style={{ fontSize: 'clamp(0.6rem,1.5dvh,0.7rem)' }}>{opt.vietnamese}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — main layout
  // ─────────────────────────────────────────────────────────────────────────
  return (
    /*
     * This component fills whatever height its parent gives it (flex-1).
     * Internal layout: flex column, no outer scroll.
     *
     * Parent (LessonDetailPage Zone 4) gives us:
     *   flex-1 min-h-0 overflow-hidden
     *
     * We add:
     *   h-full flex flex-col → fills parent exactly
     */
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── HEADER: progress dots + parent info ── */}
      {/*
       * flex-shrink-0, ≤48px.
       * Contains only: progress dots (large) + ⓘ button.
       * Stage/chip labels moved to ParentSheet.
       */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-1 pb-2"
        style={{ minHeight: '36px' }}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-2" role="progressbar"
          aria-label={`Từ ${currentWordIdx + 1} trên ${words.length}`}
          aria-valuenow={currentWordIdx + 1} aria-valuemin={1} aria-valuemax={words.length}>
          {words.map((_, i) => (
            <div key={i}
              style={{
                width: i === currentWordIdx ? 'clamp(14px,3dvh,20px)' : 'clamp(10px,2.5dvh,16px)',
                height: i === currentWordIdx ? 'clamp(14px,3dvh,20px)' : 'clamp(10px,2.5dvh,16px)',
                transition: 'width 0.2s, height 0.2s',
              }}
              className={`rounded-full transition-colors ${i === currentWordIdx ? 'bg-amber-400 ring-4 ring-amber-200 shadow-sm'
                  : i < currentWordIdx ? 'bg-emerald-500'
                    : 'bg-slate-200'
                }`}
            />
          ))}
          <span className="font-bold text-slate-500 ml-1"
            style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>
            {currentWordIdx + 1}/{words.length}
          </span>
        </div>

        {/* Parent sheet trigger */}
        <button
          onClick={() => setShowParentSheet(true)}
          aria-label="Xem thông tin bài học"
          style={{ minWidth: '40px', minHeight: '40px' }}
          className="rounded-xl bg-slate-100 hover:bg-amber-100 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Info className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* ── STAGE: image + interaction — flex-1 min-h-0 ── */}
      {/*
       * This is the heart of the viewport fix.
       * flex-1 min-h-0 → takes all remaining height between header and action bar.
       * relative → contains the StarBurst overlay.
       */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        {/* Encouragement overlay — absolute, no layout shift */}
        {showEncouragement && (
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-amber-400 text-amber-950 font-black px-4 py-2 rounded-2xl text-xs shadow-lg animate-pop-in pointer-events-none">
            <span>💪</span>
            <span>Cố lên bé nhé! Thử lại nào! ✨</span>
          </div>
        )}

        {/* Star burst — absolute, no layout shift */}
        {showStarBurst && <StarBurst />}

        {/* Stage content */}
        {isMamAge ? (
          subStep === 1 ? renderMamStep1() : renderMamStep2()
        ) : isChoiAge ? (
          subStep === 1 ? renderChoiStep1() : renderChoiStep2()
        ) : (
          subStep === 1 ? renderLaStep1() : renderLaStep2()
        )}

        {/*
         * Koko mascot — positioned inside stage bottom-right.
         * Small (48px), does NOT use fixed/absolute on document.
         * Tooltip uses KokoMascot's built-in bubble which is absolute
         * inside the mascot — constrained by stage container.
         */}
        <div className="absolute bottom-1 right-1 z-10">
          <KokoMascot
            state="happy"
            size="sm"
            interactive={false}
          />
        </div>
      </div>

      {/* ── ACTION BAR: 3 large buttons ── */}
      {/*
       * flex-shrink-0. Height ≥ 64px. Touch targets ≥ 48×48px each.
       * Gap ≥ 16px between buttons.
       * "Tiếp →" pulses after first interaction (hasInteracted).
       * prefers-reduced-motion: animate-pulse suppressed by Tailwind's
       * motion-safe: prefix (or we use CSS animation directly).
       */}
      <div
        className="flex-shrink-0 grid grid-cols-3 pt-2"
        style={{ gap: 'clamp(8px,2dvh,16px)', minHeight: '64px' }}
      >
        {/* 🔊 Nghe */}
        <button
          onClick={handlePlayAudio}
          aria-label="Nghe phát âm"
          style={{ minHeight: 'clamp(64px,12dvh,80px)' }}
          className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-sky-100 hover:bg-sky-200 text-sky-900 border-b-4 border-sky-300 font-black cursor-pointer shadow-md active:translate-y-0.5 active:border-b-2 transition-all select-none"
        >
          <Volume2 style={{ width: 'clamp(1.2rem,4dvh,1.8rem)', height: 'clamp(1.2rem,4dvh,1.8rem)' }}
            className="text-sky-600" />
          <span style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>Nghe</span>
        </button>

        {/* 🎤 Đọc theo */}
        <button
          onClick={handleMicSimulate}
          aria-label="Bé đọc theo"
          style={{ minHeight: 'clamp(64px,12dvh,80px)' }}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl font-black cursor-pointer shadow-md active:translate-y-0.5 transition-all select-none border-b-4 ${isRecording
              ? 'bg-rose-500 text-white border-rose-700 animate-pulse'
              : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
            }`}
        >
          <Mic style={{ width: 'clamp(1.2rem,4dvh,1.8rem)', height: 'clamp(1.2rem,4dvh,1.8rem)' }}
            className={isRecording ? 'animate-bounce text-white' : 'text-emerald-600'} />
          <span style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>
            {isRecording ? '🎤...' : 'Đọc theo'}
          </span>
        </button>

        {/* ➜ Tiếp */}
        <button
          onClick={handleNext}
          aria-label="Tiếp theo"
          style={{ minHeight: 'clamp(64px,12dvh,80px)' }}
          className={`flex flex-col items-center justify-center gap-1 rounded-2xl text-white font-black cursor-pointer shadow-md active:translate-y-0.5 active:border-b-2 transition-all select-none border-b-4 ${hasInteracted
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-orange-600 motion-safe:animate-pulse shadow-amber-300/60 shadow-lg'
              : 'bg-slate-300 border-slate-400 text-slate-600'
            }`}
        >
          <ArrowRight style={{ width: 'clamp(1.2rem,4dvh,1.8rem)', height: 'clamp(1.2rem,4dvh,1.8rem)' }}
            className="stroke-[3]" />
          <span style={{ fontSize: 'clamp(0.65rem,1.8dvh,0.8rem)' }}>Tiếp</span>
        </button>
      </div>

      {/* Parent Sheet */}
      {showParentSheet && (
        <ParentSheet
          word={currentWord}
          ageGroupCode={ageGroupCode}
          wordIdx={currentWordIdx}
          totalWords={words.length}
          onClose={() => setShowParentSheet(false)}
          onBackToStage1={onBackToStage1}
        />
      )}
    </div>
  );
};
