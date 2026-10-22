/**
 * Stage2PracticeFlow.tsx
 * ======================
 * Chặng 2 — Luyện tập từ vựng tiếng Anh cho trẻ mầm non 3–6 tuổi.
 *
 * 4 dạng activity khác nhau, mỗi dạng có UI và cơ chế tương tác riêng:
 *  - LT  (Listen & Tap)  : nghe từ → chọn hình đúng trong lưới
 *  - GK  (Give to Koko)  : chọn đồ vật → chạm Koko để "đưa" cho Koko
 *  - YN  (Yes / No)      : Koko "cầm" hình → hệ thống đọc tên → trẻ xác nhận đúng/sai
 *  - SS  (Starting Sound): nhận biết âm đầu của từ, chọn từ bắt đầu bằng âm cho trước
 *
 * Layout: 2-panel
 *   LEFT  (≤28%) : Koko mascot + speech bubble + nút nghe lại
 *   RIGHT (≥72%) : vùng tương tác tùy loại activity
 *
 * Progress: hiển thị thanh tiến độ và nhãn vòng hiện tại (Vòng 1/2/3)
 * Completion: màn hình tổng kết với danh sách từ đã thuộc / cần ôn, nút ôn lại
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Volume2, ArrowRight, Check, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import type { Vocabulary, AgeGroupCode, ActivityQuestion } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';
import { useAuth } from '../../../context/AuthContext';
import { useVocabStats } from '../../../hooks/useVocabStats';
import {
  vocabStatsService,
  type Stage2PracticeSession,
  type WordPracticeResult,
} from '../../../services/vocabStatsService';
import { buildPracticePlan, getAgeOptionsLimits, roundOneVariantsByAge, shuffle, type PracticeQuestion } from './buildPracticePlan';
import {
  LINE_MATCH_MAX_PAIRS,
  boardIndexForQuestionIndex,
  boardOwnSizes,
  boardStartIndex,
  maxPairsThatFit,
  partitionRoundTwoBoards,
} from './lineMatchConfig';
import { LineMatchEngine, emptyLineMatchState, type LineMatchRoundState } from './LineMatchEngine';
import { KokoMascot, type MascotState } from '../KokoMascot';
import { ListenChooseEngine } from '../games/ListenChooseEngine';
import { ImageWordMatchEngine } from '../games/ImageWordMatchEngine';

// ── Constants ──────────────────────────────────────────────────────────────────

const PRAISES = ['Great!', 'Yes!', 'Awesome!', 'Super!', 'Good job!', 'Wow!', 'Perfect!'];
function randomPraise() { return PRAISES[Math.floor(Math.random() * PRAISES.length)]; }

// ── VocabImage ─────────────────────────────────────────────────────────────────

export const VocabImage: React.FC<{
  vocab: Vocabulary;
  className?: string;
  pulsing?: boolean;
}> = ({ vocab, className = '', pulsing = false }) => {
  const [imgErr, setImgErr] = useState(false);
  const hasImg = !!vocab.imageUrl && !imgErr;

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className} ${pulsing ? 'animate-bounce' : ''}`}>
      {hasImg ? (
        <img
          src={vocab.imageUrl}
          alt={vocab.english}
          className="max-w-full max-h-full object-contain select-none pointer-events-none drop-shadow-md"
          draggable={false}
          onError={() => setImgErr(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-white/10 border-2 border-dashed border-white/30">
          <span className="text-[clamp(2rem,6vh,4rem)] select-none leading-none">🌟</span>
          <span className="text-xs text-white/60 font-bold mt-1 capitalize">{vocab.english}</span>
        </div>
      )}
    </div>
  );
};

// ── getWordEmoji helper ────────────────────────────────────────────────────────

const EMOJI_FALLBACK: Record<string, string> = {
  pencil: '✏️', book: '📖', eraser: '🧼', ruler: '📏', bag: '🎒',
  crayon: '🖍️', scissors: '✂️', desk: '🪑', school: '🏫',
  animal: '🐾', fruit: '🍎', color: '🎨',
};

function getWordEmoji(vocab: Vocabulary): string {
  const key = (vocab.english || '').toLowerCase();
  return EMOJI_FALLBACK[key] ?? EMOJI_FALLBACK[(vocab as any).category] ?? '🌟';
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface Stage2PracticeFlowProps {
  vocabulary: Vocabulary[];
  lessonId: string;
  stage2Completed?: boolean;
  lessonTitle?: string;
  ageGroup?: AgeGroupCode;
  ageGroupCode?: string;
  unitNumber?: number;
  lessonNumber?: number;
  onComplete: (stats?: { score: number; stars: number }) => void;
  onBackToStage1?: () => void;
}

interface Stage2Checkpoint {
  lessonId: string;
  vocabularyIds: string[];
  questions: PracticeQuestion[];
  variantByWordId: Record<string, 'A' | 'B'>;
  requeuedWordIds?: string[];
  questionIndex: number;
  attemptCount: number;
  totalWrongAttempts: number;
  sessionWordStats: Record<string, { firstTryCorrect: number; retryAttempts: number }>;
  startedAt: number;
  /** Round 2 (Line Match) progress: matched pairs by wordId, right orders, attempts. */
  round2?: LineMatchRoundState;
}

// ── Subcomponent: LT Activity (Listen & Tap) ──────────────────────────────────

interface LTActivityProps {
  options: Vocabulary[];
  targetVocab: Vocabulary;
  selectedId: string | null;
  disabledIds: Set<string>;
  showCheck: boolean;
  bounceCorrect: boolean;
  wiggling: boolean;
  onSelect: (v: Vocabulary) => void;
}

const LTActivity: React.FC<LTActivityProps> = ({
  options, targetVocab, selectedId, disabledIds, showCheck, bounceCorrect, wiggling, onSelect
}) => {
  const isDouble = options.length > 2;

  return (
    <div
      className={`w-full h-full grid gap-2 sm:gap-3 grid-cols-2 ${isDouble ? 'grid-rows-2' : 'grid-rows-1 max-h-[65%]'}`}
    >
      {options.map((opt) => {
        const optId = opt._id ?? (opt as any).id ?? opt.english;
        const targetId = targetVocab._id ?? (targetVocab as any).id ?? targetVocab.english;
        const isTarget = optId === targetId;
        const isDisabled = disabledIds.has(optId);
        const isWrongSel = selectedId === optId && wiggling;
        const isPulsing = bounceCorrect && isTarget;

        let cardCls = 'border-white/20 bg-white/10 hover:border-amber-400 hover:bg-white/15 hover:scale-[1.02]';
        if (showCheck && isTarget) {
          cardCls = 'border-emerald-400 bg-emerald-500/30 ring-4 ring-emerald-400 scale-[1.03]';
        } else if (isWrongSel) {
          cardCls = 'border-orange-400 bg-orange-500/20 ring-2 ring-orange-400 animate-gentle-wobble';
        } else if (isDisabled) {
          cardCls = 'border-white/5 bg-white/5 opacity-25 pointer-events-none';
        }

        return (
          <button
            key={optId}
            type="button"
            onClick={() => onSelect(opt)}
            disabled={isDisabled || showCheck}
            aria-label={opt.english}
            className={`relative w-full h-full min-h-[64px] rounded-3xl border-4 p-1.5 sm:p-2 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 shadow-xl ${cardCls}`}
          >
            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
              <VocabImage vocab={opt} className="w-full h-full" pulsing={isPulsing} />
            </div>
            <div className="shrink-0 w-full text-center pb-0.5">
              <span
                className="font-black text-amber-100 capitalize leading-tight block"
                style={{ fontSize: 'clamp(0.9rem,3.2vh,1.5rem)' }}
              >
                {opt.english.toLowerCase()}
              </span>
            </div>
            {showCheck && isTarget && (
              <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-3xl animate-pop-in pointer-events-none">
                <div className="w-[clamp(38px,8vh,64px)] h-[clamp(38px,8vh,64px)] rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl">
                  <Check className="w-[55%] h-[55%] stroke-[3]" />
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

interface ActivityChallengeProps {
  question: PracticeQuestion;
  revealCorrect: boolean;
  onCorrect: () => void;
  onWrong: (vocab?: Vocabulary) => void;
}

/** Render the selected Round 2/3 interaction while keeping the common word answer flow.
 *  Exported so the dormant WIPE/MEMORY/TRACE/SLIDE branches stay reachable for reuse/tests. */
export const ActivityChallenge: React.FC<ActivityChallengeProps> = ({ question, revealCorrect, onCorrect, onWrong }) => {
  const [opened, setOpened] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [speakerId, setSpeakerId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [puppetFalse, setPuppetFalse] = useState(false);
  const targetId = question.wordId;
  const isTarget = (word: Vocabulary) => (word._id || (word as any).id || word.english) === targetId;
  const cardClass = (word: Vocabulary, extra = '') =>
    `relative min-h-[96px] min-w-[96px] rounded-3xl border-4 p-3 bg-white/10 text-white flex flex-col items-center justify-center gap-2 transition-all ${isTarget(word) && revealCorrect ? 'border-emerald-300 ring-4 ring-emerald-300/60 bg-emerald-400/20' : 'border-white/20'} ${extra}`;
  const image = (word: Vocabulary) => <VocabImage vocab={word} className="w-24 h-24" />;
  const matchAnswer = (word: Vocabulary) => isTarget(word) ? onCorrect() : onWrong(word);

  if (question.type === 'WIPE') return (
    <div className="grid w-full h-full grid-cols-2 gap-4">
      {question.options.map((word) => {
        const id = word._id || (word as any).id || word.english;
        const isOpen = opened.includes(question.options.indexOf(word));
        return <button key={id} type="button" onClick={() => { setOpened([question.options.indexOf(word)]); matchAnswer(word); }} aria-label={`Mở ô cửa ${word.english}`} className={cardClass(word, 'overflow-hidden')}>
          {isOpen || (revealCorrect && isTarget(word)) ? image(word) : <span className="text-6xl">🪟</span>}
        </button>;
      })}
    </div>
  );

  if (question.type === 'MEMORY') {
    const deck = question.options.flatMap((word, index) => [
      { word, index, face: 'picture' }, { word, index, face: 'audio' },
    ]);
    const flip = (cardIndex: number) => {
      if (opened.includes(cardIndex) || matched.includes(cardIndex) || opened.length >= 2) return;
      const next = [...opened, cardIndex]; setOpened(next);
      if (next.length === 2) {
        const first = deck[next[0]], second = deck[next[1]];
        if (first.index === second.index) {
          setMatched((items) => [...items, ...next]);
          setOpened([]);
          if (isTarget(first.word)) window.setTimeout(onCorrect, 350);
        } else {
          onWrong(first.word);
          window.setTimeout(() => setOpened([]), 900);
        }
      }
    };
    return <div className="grid w-full h-full grid-cols-4 grid-rows-2 gap-3">
      {deck.map((card, index) => {
        const isVisible = opened.includes(index) || matched.includes(index) || (revealCorrect && isTarget(card.word));
        return <button key={`${card.index}-${card.face}`} type="button" onClick={() => flip(index)} aria-label={isVisible ? card.word.english : 'Lật thẻ'} className={cardClass(card.word, 'text-4xl')}>
          {isVisible ? (card.face === 'picture' || question.optionsCount <= 2 ? image(card.word) : <Volume2 className="w-10 h-10" />) : '❔'}
        </button>;
      })}
    </div>;
  }

  if (question.type === 'TRACE') return (
    <div className="grid w-full h-full grid-cols-2 gap-6">
      <div className="grid gap-3">{question.options.map((word) => <button key={word._id} type="button" onClick={() => { setSpeakerId(word._id); playWordAudio(word.english, word.audioUrl); }} aria-label={`Nghe ${word.english}`} className={`${cardClass(word)} ${speakerId === word._id ? 'ring-4 ring-sky-300' : ''}`}><Volume2 className="w-9 h-9" /></button>)}</div>
      <div className="grid grid-cols-2 gap-3">{question.options.map((word) => <button key={word._id} type="button" onClick={() => { if (!speakerId) return; const selected = question.options.find((item) => item._id === speakerId); if (selected && isTarget(selected) === isTarget(word)) { if (isTarget(word)) onCorrect(); else setMatched((items) => [...items, question.options.indexOf(word)]); } else onWrong(word); setSpeakerId(null); }} aria-label={`Hình ${word.english}`} className={cardClass(word)}>{image(word)}</button>)}</div>
    </div>
  );

  if (question.type === 'SLIDE') {
    const word = question.options[slideIndex % question.options.length];
    return <div className="flex h-full w-full items-center justify-center gap-5">
      <button type="button" aria-label="Lùi hình" onClick={() => setSlideIndex((i) => (i - 1 + question.options.length) % question.options.length)} className="min-h-[96px] min-w-[96px] rounded-full bg-white/15 text-5xl">◀</button>
      <button type="button" onClick={() => matchAnswer(word)} aria-label={`Chọn hình ${word.english}`} className={`${cardClass(word, 'h-64 w-64 text-6xl')} ${isTarget(word) && revealCorrect ? 'animate-pulse' : ''}`}>{image(word)}</button>
      <button type="button" aria-label="Tiến hình" onClick={() => setSlideIndex((i) => (i + 1) % question.options.length)} className="min-h-[96px] min-w-[96px] rounded-full bg-white/15 text-5xl">▶</button>
    </div>;
  }

  if (question.type === 'DELIVER') return <div className="flex h-full w-full flex-col items-center justify-center gap-4">
    <p className="text-center text-3xl font-black text-white">I want a {question.targetVocab.english}!</p>
    <div className="flex w-full flex-wrap items-center justify-center gap-3">{question.options.map((word) => <button key={word._id} type="button" draggable onDragStart={(event) => event.dataTransfer.setData('text/plain', word._id)} onClick={() => setPickedId(word._id)} aria-label={`Chọn ${word.english}`} className={`${cardClass(word, 'h-40 w-40')} ${pickedId === word._id ? 'ring-4 ring-sky-300' : ''}`}>{image(word)}</button>)}</div>
    <button type="button" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const word = question.options.find((item) => item._id === event.dataTransfer.getData('text/plain')); if (word) matchAnswer(word); }} onClick={() => { const word = question.options.find((item) => item._id === pickedId); if (word) matchAnswer(word); }} aria-label="Đưa đồ vật cho Koko" className="min-h-[112px] min-w-[180px] rounded-3xl bg-amber-300 px-6 text-6xl">🐻</button>
  </div>;

  if (question.type === 'PUPPET') return puppetFalse ? <div className="grid h-full w-full grid-cols-2 gap-4">{question.options.map((word) => <button key={word._id} type="button" onClick={() => matchAnswer(word)} aria-label={`Chọn ${word.english}`} className={cardClass(word)}>{image(word)}</button>)}</div> : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5" onTouchStart={(event) => { (event.currentTarget as any).dataset.touchX = String(event.touches[0].clientX); }} onTouchEnd={(event) => { const start = Number((event.currentTarget as any).dataset.touchX || 0); const delta = event.changedTouches[0].clientX - start; if (Math.abs(delta) > 45) { const yes = delta > 0; if (yes === question.isTrueClaim) { if (yes) onCorrect(); else setPuppetFalse(true); } else onWrong(); } }}>
      <div className="flex items-center gap-5 rounded-3xl bg-white/10 p-5"><span className="text-8xl">🐵</span><div className="text-4xl font-black">{question.claimedWord}</div></div>
      <div className="flex gap-4"><button type="button" onClick={() => question.isTrueClaim ? onCorrect() : onWrong()} className="min-h-[96px] min-w-[160px] rounded-3xl bg-emerald-500 text-3xl font-black text-white">✅ Yes</button><button type="button" onClick={() => question.isTrueClaim ? onWrong() : setPuppetFalse(true)} className="min-h-[96px] min-w-[160px] rounded-3xl bg-sky-500 text-3xl font-black text-white">❌ No</button></div>
    </div>
  );

  if (question.type === 'SEQUENCE') {
    const sequence = question.sequenceWords || [question.targetVocab];
    return <div className="flex h-full w-full flex-col items-center justify-center gap-4"><p className="text-3xl font-black text-white">{sequence.map((word) => word.english).join('… then ')}</p><div className="flex flex-wrap justify-center gap-4">{question.options.map((word) => <button key={word._id} type="button" onClick={() => { if (word._id === sequence[sequenceIndex]?._id) { const next = sequenceIndex + 1; setSequenceIndex(next); if (next >= sequence.length) onCorrect(); } else onWrong(word); }} aria-label={`Bước ${sequenceIndex + 1}: ${word.english}`} className={cardClass(word)}>{image(word)}</button>)}</div></div>;
  }

  if (question.type === 'PATH') return <div className="flex h-full w-full items-center justify-center gap-3"><span className="text-7xl">🐻</span><span className="text-5xl">〰️</span><div className="grid grid-cols-2 gap-3">{question.options.map((word) => <button key={word._id} type="button" onClick={() => matchAnswer(word)} aria-label={`Đi theo nhánh đến ${word.english}`} className={cardClass(word)}>{image(word)}</button>)}</div></div>;

  return null;
};

const BreakDialog: React.FC<{ onClose: () => void; onSaveAndExit: () => void; returnFocusRef: React.RefObject<HTMLButtonElement | null> }> = ({ onClose, onSaveAndExit, returnFocusRef }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    };
  }, [onClose, returnFocusRef]);
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4" onClick={onClose}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="practice-break-title" tabIndex={-1} onClick={(event) => event.stopPropagation()} className="relative w-full max-w-md rounded-[2rem] border-4 border-amber-200 bg-white p-7 text-center text-slate-900 shadow-2xl">
        <div className="mb-3 text-7xl" aria-hidden>🐻</div>
        <h2 id="practice-break-title" className="mb-5 text-3xl font-black">Take a break?</h2>
        <button type="button" onClick={onClose} className="mb-3 min-h-[96px] w-full rounded-3xl bg-indigo-700 px-6 text-2xl font-black text-white shadow-lg">Keep going</button>
        <button type="button" onClick={onSaveAndExit} className="min-h-[96px] w-full rounded-3xl border-4 border-slate-200 bg-slate-50 px-6 text-xl font-black text-slate-800">Save & exit</button>
      </div>
    </div>
  );
};

// ── Subcomponent: GK Activity (Give to Koko) ──────────────────────────────────
// Trẻ chọn item → Koko sáng lên → chạm Koko để "đưa" cho Koko

interface GKActivityProps {
  options: Vocabulary[];
  targetVocab: Vocabulary;
  pickedId: string | null;
  disabledIds: Set<string>;
  showCheck: boolean;
  bounceCorrect: boolean;
  wiggling: boolean;
  onPickItem: (v: Vocabulary) => void;
  onGiveToKoko: () => void;
  kokoMood: MascotState;
  kokoBubble?: string;
}

const GKActivity: React.FC<GKActivityProps> = ({
  options, targetVocab, pickedId, disabledIds, showCheck,
  bounceCorrect, wiggling, onPickItem, onGiveToKoko, kokoMood, kokoBubble
}) => {
  const isDouble = options.length > 2;

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Koko banner with tap instruction */}
      <div
        className={`shrink-0 flex items-center justify-center gap-3 px-4 py-2 rounded-2xl border-2 transition-all cursor-pointer select-none
          ${pickedId
            ? 'border-teal-400 bg-teal-500/25 ring-2 ring-teal-300 animate-soft-bounce'
            : 'border-white/15 bg-white/5'
          }`}
        onClick={pickedId && !showCheck ? onGiveToKoko : undefined}
        role={pickedId ? 'button' : undefined}
        aria-label={pickedId ? 'Chạm vào Koko để đưa đồ vật' : undefined}
      >
        <KokoMascot
          state={pickedId ? 'happy' : kokoMood}
          size="sm"
          interactive={false}
          speechBubble={pickedId ? '📦 Đưa cho Koko!' : kokoBubble}
          bubblePosition="right"
        />
        <div className="flex flex-col">
          <span className="font-black text-white text-sm" style={{ fontSize: 'clamp(0.75rem,2vh,1rem)' }}>
            {pickedId ? '👆 Chạm vào đây để đưa cho Koko!' : 'Chọn đồ vật bên dưới'}
          </span>
          {!pickedId && (
            <span className="text-xs text-white/50 font-bold">Koko đang chờ...</span>
          )}
        </div>
      </div>

      {/* Item grid */}
      <div className={`flex-1 min-h-0 grid gap-2 sm:gap-3 grid-cols-2 ${isDouble ? 'grid-rows-2' : 'grid-rows-1'}`}>
        {options.map((opt) => {
          const optId = opt._id ?? (opt as any).id ?? opt.english;
          const targetId = targetVocab._id ?? (targetVocab as any).id ?? targetVocab.english;
          const isTarget = optId === targetId;
          const isDisabled = disabledIds.has(optId);
          const isPicked = pickedId === optId;
          const isPulsing = bounceCorrect && isTarget;
          const isWrong = !isPicked && wiggling && isDisabled;

          let cardCls = 'border-white/20 bg-white/10 hover:border-amber-300 hover:scale-[1.02]';
          if (showCheck && isTarget) {
            cardCls = 'border-emerald-400 bg-emerald-500/30 ring-4 ring-emerald-400 scale-[1.03]';
          } else if (isPicked) {
            cardCls = 'border-teal-400 bg-teal-500/25 ring-4 ring-teal-400 scale-[1.05]';
          } else if (isWrong) {
            cardCls = 'border-orange-400 bg-orange-500/20 opacity-40 pointer-events-none';
          } else if (isDisabled) {
            cardCls = 'border-white/5 bg-white/5 opacity-25 pointer-events-none';
          }

          return (
            <button
              key={optId}
              type="button"
              onClick={() => !showCheck && !isPicked && onPickItem(opt)}
              disabled={isDisabled || showCheck}
              aria-label={opt.english}
              className={`relative w-full h-full min-h-[60px] rounded-3xl border-4 p-1.5 sm:p-2 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 shadow-xl ${cardCls}`}
            >
              <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                <VocabImage vocab={opt} className="w-full h-full" pulsing={isPulsing} />
              </div>
              <div className="shrink-0 w-full text-center pb-0.5">
                <span
                  className="font-black text-amber-100 capitalize leading-tight block"
                  style={{ fontSize: 'clamp(0.85rem,3vh,1.4rem)' }}
                >
                  {opt.english.toLowerCase()}
                </span>
              </div>
              {isPicked && (
                <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-lg">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
              {showCheck && isTarget && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-3xl animate-pop-in pointer-events-none">
                  <div className="w-[clamp(36px,7vh,56px)] h-[clamp(36px,7vh,56px)] rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl">
                    <Check className="w-[55%] h-[55%] stroke-[3]" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Subcomponent: YN Activity (Yes or No) ─────────────────────────────────────
// Koko "cầm" hình → hệ thống đọc tên → trẻ chọn Yes/No

interface YNActivityProps {
  targetVocab: Vocabulary;
  claimedWord: string;
  showCheck: boolean;
  isWiggling: boolean;
  onAnswer: (yes: boolean) => void;
}

const YNActivity: React.FC<YNActivityProps> = ({
  targetVocab, claimedWord, showCheck, isWiggling, onAnswer
}) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      {/* Big image Koko is "holding" */}
      <div
        className={`flex-1 min-h-0 w-full max-w-sm bg-white/10 rounded-3xl border-4 border-amber-300/50 p-3 shadow-xl flex flex-col items-center justify-center gap-2 ${isWiggling ? 'animate-gentle-wobble' : ''}`}
      >
        <div className="flex-1 min-h-0 w-full max-h-[60%] flex items-center justify-center">
          <VocabImage vocab={targetVocab} className="w-full h-full" />
        </div>
        {/* Audio hint label */}
        <div className="shrink-0 bg-slate-800/60 rounded-2xl px-4 py-1.5 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-300 shrink-0" />
          <span
            className="font-black text-amber-200 capitalize"
            style={{ fontSize: 'clamp(1rem,3.5vh,1.6rem)' }}
          >
            {claimedWord}
          </span>
        </div>
      </div>

      {/* YES / NO buttons */}
      <div className="shrink-0 w-full max-w-sm grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onAnswer(true)}
          disabled={showCheck}
          aria-label="Yes, đúng rồi"
          className="h-[clamp(52px,12vh,88px)] rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black flex items-center justify-center gap-2 border-4 border-emerald-400 shadow-xl cursor-pointer transition-all"
          style={{ fontSize: 'clamp(1.1rem,3.5vh,1.8rem)' }}
        >
          <ThumbsUp className="w-6 h-6 stroke-[2.5]" />
          Yes!
        </button>
        <button
          type="button"
          onClick={() => onAnswer(false)}
          disabled={showCheck}
          aria-label="No, sai rồi"
          className="h-[clamp(52px,12vh,88px)] rounded-3xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black flex items-center justify-center gap-2 border-4 border-orange-400 shadow-xl cursor-pointer transition-all"
          style={{ fontSize: 'clamp(1.1rem,3.5vh,1.8rem)' }}
        >
          <ThumbsDown className="w-6 h-6 stroke-[2.5]" />
          No!
        </button>
      </div>
    </div>
  );
};

// ── Subcomponent: SS Activity (Starting Sound) ────────────────────────────────
// Nghe âm đầu → chọn từ bắt đầu bằng âm đó

interface SSActivityProps {
  options: Vocabulary[];
  targetVocab: Vocabulary;
  startingSound: { phoneme: string; letter: string };
  selectedId: string | null;
  disabledIds: Set<string>;
  showCheck: boolean;
  bounceCorrect: boolean;
  wiggling: boolean;
  onSelect: (v: Vocabulary) => void;
}

const SSActivity: React.FC<SSActivityProps> = ({
  options, targetVocab, startingSound, selectedId, disabledIds,
  showCheck, bounceCorrect, wiggling, onSelect
}) => {
  const isDouble = options.length > 2;

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Phoneme badge */}
      <div className="shrink-0 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-500/30 border-2 border-purple-400/70 shadow-lg">
          <span
            className="font-black text-purple-200"
            style={{ fontSize: 'clamp(0.85rem,2.5vh,1.2rem)' }}
          >
            Âm đầu:
          </span>
          <span
            className="font-black text-white bg-purple-600/60 rounded-xl px-3 py-0.5"
            style={{ fontSize: 'clamp(1.1rem,3.5vh,1.8rem)' }}
          >
            {startingSound.phoneme}
          </span>
          <span className="text-purple-300 font-black" style={{ fontSize: 'clamp(0.85rem,2vh,1rem)' }}>
            ({startingSound.letter})
          </span>
        </div>
      </div>

      {/* Options grid */}
      <div className={`flex-1 min-h-0 grid gap-2 sm:gap-3 grid-cols-2 ${isDouble ? 'grid-rows-2' : 'grid-rows-1'}`}>
        {options.map((opt) => {
          const optId = opt._id ?? (opt as any).id ?? opt.english;
          const targetId = targetVocab._id ?? (targetVocab as any).id ?? targetVocab.english;
          const isTarget = optId === targetId;
          const isDisabled = disabledIds.has(optId);
          const isWrongSel = selectedId === optId && wiggling;
          const isPulsing = bounceCorrect && isTarget;
          const startsWithSound = opt.english.toLowerCase().startsWith(startingSound.letter.toLowerCase());

          let cardCls = 'border-white/20 bg-white/10 hover:border-purple-400 hover:bg-white/15 hover:scale-[1.02]';
          if (showCheck && isTarget) {
            cardCls = 'border-emerald-400 bg-emerald-500/30 ring-4 ring-emerald-400 scale-[1.03]';
          } else if (isWrongSel) {
            cardCls = 'border-orange-400 bg-orange-500/20 ring-2 ring-orange-400 animate-gentle-wobble';
          } else if (isDisabled) {
            cardCls = 'border-white/5 bg-white/5 opacity-25 pointer-events-none';
          }

          return (
            <button
              key={optId}
              type="button"
              onClick={() => onSelect(opt)}
              disabled={isDisabled || showCheck}
              aria-label={opt.english}
              className={`relative w-full h-full min-h-[60px] rounded-3xl border-4 p-1.5 sm:p-2 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 shadow-xl ${cardCls}`}
            >
              <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                <VocabImage vocab={opt} className="w-full h-full" pulsing={isPulsing} />
              </div>
              <div className="shrink-0 w-full text-center pb-0.5">
                <span
                  className="font-black capitalize leading-tight"
                  style={{ fontSize: 'clamp(0.85rem,3vh,1.4rem)' }}
                >
                  {/* Highlight starting letter */}
                  {startsWithSound ? (
                    <>
                      <span className="text-purple-300">{opt.english[0]}</span>
                      <span className="text-amber-100">{opt.english.slice(1).toLowerCase()}</span>
                    </>
                  ) : (
                    <span className="text-amber-100">{opt.english.toLowerCase()}</span>
                  )}
                </span>
              </div>
              {showCheck && isTarget && (
                <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-3xl animate-pop-in pointer-events-none">
                  <div className="w-[clamp(36px,7vh,56px)] h-[clamp(36px,7vh,56px)] rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl">
                    <Check className="w-[55%] h-[55%] stroke-[3]" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────

export const Stage2PracticeFlow: React.FC<Stage2PracticeFlowProps> = ({
  vocabulary,
  lessonId,
  stage2Completed = false,
  ageGroup,
  ageGroupCode,
  unitNumber = 1,
  lessonNumber = 1,
  onComplete,
  onBackToStage1,
}) => {
  const effectiveAgeGroup: AgeGroupCode = (ageGroup || ageGroupCode || '4-5') as AgeGroupCode;
  const { user } = useAuth();
  const childId = (user as any)?._id || (user as any)?.id || 'child_guest';
  const checkpointKey = `kc_stage2_checkpoint_${childId}_${lessonId}`;
  const [checkpoint] = useState<Stage2Checkpoint | null>(() => {
    try {
      const raw = localStorage.getItem(checkpointKey);
      const saved = raw ? JSON.parse(raw) as Stage2Checkpoint : null;
      return saved?.lessonId === lessonId ? saved : null;
    } catch { return null; }
  });
  const [showSavedSummary, setShowSavedSummary] = useState(stage2Completed);
  const [showResumePrompt, setShowResumePrompt] = useState(Boolean(checkpoint && !stage2Completed));
  const [showSessionIntro, setShowSessionIntro] = useState(!checkpoint && !stage2Completed);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [roundTransition, setRoundTransition] = useState<{ kind: 'complete' | 'intro'; turn: 1 | 2 | 3 } | null>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const { statsMap, recordAttempt } = useVocabStats(childId);

  const plan = useMemo(
    () => {
      const storedVariants = checkpoint?.variantByWordId || Object.fromEntries(
        (checkpoint?.questions || []).filter((question) => question.turn === 1)
          .map((question) => [question.wordId, question.variant || (question.type === 'LOOK_WORD' ? 'B' : 'A')]),
      );
      return buildPracticePlan(vocabulary, effectiveAgeGroup, statsMap, undefined, 3, unitNumber, lessonNumber, storedVariants);
    },
    // Freeze the randomized question order for this lesson session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocabulary, effectiveAgeGroup, unitNumber, lessonNumber, checkpoint],
  );

  const activeVocabularyIds = useMemo(() => new Set(vocabulary.map((word) => word._id || (word as any).id || word.english)), [vocabulary]);
  const checkpointQuestions = useMemo(() => {
    if (!checkpoint?.questions.length) return plan.questions;
    const activeQuestions = checkpoint.questions.filter((question) => activeVocabularyIds.has(question.wordId)).map((question, index) => {
      const freshQuestion = index >= checkpoint.questionIndex
        ? plan.questions.find((candidate) => candidate.turn === question.turn && candidate.wordId === question.wordId)
        : undefined;
      const filteredOptions = question.options.filter((word) => activeVocabularyIds.has(word._id || (word as any).id || word.english));
      const options = filteredOptions.length >= 2 ? filteredOptions : (freshQuestion?.options || filteredOptions);
      if (question.turn !== 1) return { ...question, options, optionsCount: options.length };
      const variant = question.variant || (question.type === 'LOOK_WORD' ? 'B' : plan.variantByWordId[question.wordId] || 'A');
      return { ...question, options, optionsCount: options.length, variant, activityId: variant === 'B' ? 'look-choose-word' as const : 'listen-choose' as const, type: variant === 'B' ? 'LOOK_WORD' as const : 'LT' as const };
    });
    const existingIds = new Set(activeQuestions.map((question) => `${question.turn}:${question.wordId}`));
    const currentTurn = Number(checkpoint.questions[checkpoint.questionIndex]?.turn || 1);
    const additions = plan.questions.filter((question) => Number(question.turn) >= currentTurn && !existingIds.has(`${question.turn}:${question.wordId}`));
    for (const turn of [1, 2, 3]) {
      const forTurn = additions.filter((question) => question.turn === turn);
      if (!forTurn.length) continue;
      const lastIndex = activeQuestions.reduce((last, question, index) => question.turn === turn ? index : last, -1);
      activeQuestions.splice(lastIndex + 1, 0, ...forTurn);
    }
    return activeQuestions;
  }, [checkpoint, plan, activeVocabularyIds]);
  const questionsFromCheckpoint = !!checkpoint?.questions.length;
  const [questionOverride, setQuestionOverride] = useState<PracticeQuestion[] | null>(null);
  const questions = questionOverride || checkpointQuestions;
  const restoredIndex = checkpoint && questionsFromCheckpoint
    ? checkpoint.questions.slice(0, checkpoint.questionIndex).filter((question) => activeVocabularyIds.has(question.wordId)).length
    : 0;
  const [currentIdx, setCurrentIdx] = useState(Math.min(restoredIndex, Math.max(0, questions.length - 1)));
  const [requeuedWordIds, setRequeuedWordIds] = useState<Set<string>>(() => new Set(checkpoint?.requeuedWordIds || []));
  const variantByWordId = plan.variantByWordId;

  // ── Round 2: Line Match (boards of pairs; one activity for the whole round) ──
  const [round2State, setRound2State] = useState<LineMatchRoundState>(() => checkpoint?.round2 || emptyLineMatchState());
  /** Consumed once by the engine on mount; cleared by restart/practice-again. */
  const round2InitialRef = useRef<LineMatchRoundState | null>(checkpoint?.round2 || null);
  const [round2Feedback, setRound2Feedback] = useState('');
  const [round2ContentH, setRound2ContentH] = useState(0);
  const roundTwoQuestions = useMemo(() => questions.filter((question) => question.turn === 2), [questions]);
  const roundTwoStartIdx = useMemo(() => questions.findIndex((question) => question.turn === 2), [questions]);
  const roundTwoWordIdSet = useMemo(
    () => new Set(roundTwoQuestions.map((question) => question.wordId)),
    [roundTwoQuestions],
  );
  const roundTwoMatchedCount = useMemo(
    () => round2State.matchedWordIds.filter((wordId) => roundTwoWordIdSet.has(wordId)).length,
    [round2State.matchedWordIds, roundTwoWordIdSet],
  );
  // Quantize the measured height so the partition doesn't flap during drags.
  const roundTwoFitMax = round2ContentH > 0
    ? maxPairsThatFit(Math.round(round2ContentH / 16) * 16, LINE_MATCH_MAX_PAIRS[effectiveAgeGroup])
    : LINE_MATCH_MAX_PAIRS[effectiveAgeGroup];
  const roundTwoBoards = useMemo(
    () => partitionRoundTwoBoards(roundTwoQuestions.length, roundTwoFitMax),
    [roundTwoQuestions.length, roundTwoFitMax],
  );
  const roundTwoOwnSizes = useMemo(
    () => boardOwnSizes(roundTwoQuestions.length, roundTwoFitMax),
    [roundTwoQuestions.length, roundTwoFitMax],
  );
  const roundTwoBoardIndex = roundTwoStartIdx >= 0 && currentIdx >= roundTwoStartIdx
    ? boardIndexForQuestionIndex(currentIdx - roundTwoStartIdx, roundTwoOwnSizes)
    : 0;
  const lastRoundTwoIdx = roundTwoStartIdx >= 0 ? roundTwoStartIdx + Math.max(0, roundTwoQuestions.length - 1) : -1;

  const handleRound2StateChange = useCallback((next: LineMatchRoundState) => {
    setRound2State(next);
  }, []);

  // ONE answer per word for word status: recorded once when the word completes.
  const handleRound2WordMatched = useCallback((wordId: string, info: { firstTry: boolean; revealed: boolean; chosenWrongWordId?: string }) => {
    const word = roundTwoQuestions.find((question) => question.wordId === wordId)?.targetVocab;
    setSessionWordStats((prev) => ({
      ...prev,
      [wordId]: {
        firstTryCorrect: (prev[wordId]?.firstTryCorrect || 0) + (info.firstTry ? 1 : 0),
        retryAttempts: prev[wordId]?.retryAttempts || 0,
      },
    }));
    recordAttempt(wordId, {
      type: 'MATCH_LINES',
      activityId: 'match-lines',
      round: 2,
      affectsMastery: true,
      ok: true,
      isFirstTry: info.firstTry,
      usedHint: info.revealed || !info.firstTry,
      chosenDistractorId: info.chosenWrongWordId,
      vocab: word,
    });
  }, [roundTwoQuestions, recordAttempt]);

  // Wrong link attempts update the session summary only (no mastery answers);
  // the chosen wrong word is kept in round2State for the checkpoint.
  const handleRound2WordWrong = useCallback((wordId: string, _chosenWrongWordId: string) => {
    void _chosenWrongWordId;
    setSessionWordStats((prev) => ({
      ...prev,
      [wordId]: {
        firstTryCorrect: prev[wordId]?.firstTryCorrect || 0,
        retryAttempts: (prev[wordId]?.retryAttempts || 0) + 1,
      },
    }));
    setTotalWrongAttempts((count) => count + 1);
  }, []);

  const handleRound2BoardComplete = useCallback((nextBoardIndex: number) => {
    if (roundTwoStartIdx < 0) return;
    const nextStart = roundTwoStartIdx + boardStartIndex(nextBoardIndex, roundTwoOwnSizes);
    setCurrentIdx(Math.min(nextStart, Math.max(0, questions.length - 1)));
    setRound2Feedback(''); // don't carry the board-complete praise into the next board
  }, [roundTwoStartIdx, roundTwoOwnSizes, questions.length]);

  const handleRound2RoundComplete = useCallback(() => {
    if (lastRoundTwoIdx >= 0) setCurrentIdx(lastRoundTwoIdx);
    setRoundTransition({ kind: 'complete', turn: 2 });
  }, [lastRoundTwoIdx]);

  // Clear the round-2 feedback row whenever the board (question index) changes.
  useEffect(() => {
    setRound2Feedback('');
  }, [currentIdx]);

  // Per-question state
  const [wrongCount, setWrongCount] = useState(checkpoint?.attemptCount || 0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [bounceCorrect, setBounceCorrect] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [wiggling, setWiggling] = useState(false);

  // GK: tap item -> tap Koko banner
  const [gkPicked, setGkPicked] = useState<string | null>(null);

  // Koko
  const [kokoMood, setKokoMood] = useState<MascotState>('happy');
  const [kokoBubble, setKokoBubble] = useState<string | undefined>('Lắng nghe Koko nhé! 👂');

  // Scoring & accuracy tracking (per session)
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalWrongAttempts, setTotalWrongAttempts] = useState(checkpoint?.totalWrongAttempts || 0);
  const [sessionWordStats, setSessionWordStats] = useState<Record<string, { firstTryCorrect: number; retryAttempts: number }>>(checkpoint?.sessionWordStats || {});

  // Session timing
  const [sessionStartTime] = useState<number>(() => checkpoint?.startedAt || Date.now());
  const [currentSession, setCurrentSession] = useState<Stage2PracticeSession | null>(null);
  const sessionSavedRef = useRef(false);

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;
  const roundOneActivityQuestion: ActivityQuestion | null = currentQ?.turn === 1 ? {
    id: currentQ.id,
    promptText: currentQ.variant === 'B' ? 'What is this?' : currentQ.targetVocab.english,
    promptAudioUrl: currentQ.targetVocab.audioUrl,
    promptImageUrl: currentQ.targetVocab.imageUrl,
    correctAnswer: currentQ.targetVocab.english,
    options: currentQ.options.map((word) => ({
      id: word._id || (word as any).id || word.english,
      text: word.english,
      vietnameseText: word.vietnamese,
      imageUrl: word.imageUrl,
      isCorrect: (word._id || (word as any).id || word.english) === currentQ.wordId,
    })),
    metadata: { imageUrl: currentQ.targetVocab.imageUrl, word: currentQ.targetVocab.english },
  } : null;

  // ── Play prompt ──────────────────────────────────────────────────────────────

  const playPrompt = useCallback(() => {
    if (!currentQ) return;
    if (currentQ.turn === 1 && currentQ.variant === 'B') return;
    if (currentQ.type === 'YN' || currentQ.type === 'PUPPET') {
      playWordAudio(`Is it a ${currentQ.claimedWord}?`, currentQ.targetVocab.audioUrl);
    } else if (currentQ.type === 'SS') {
      const ph = currentQ.startingSound?.phoneme ?? '/p/';
      playWordAudio(`${ph}... ${ph}! Find the word!`, currentQ.targetVocab.audioUrl);
    } else if (currentQ.type === 'GK' || currentQ.type === 'DELIVER') {
      playWordAudio(`Give Koko the ${currentQ.targetVocab.english}!`, currentQ.targetVocab.audioUrl);
    } else if (currentQ.type === 'SEQUENCE' && currentQ.sequenceWords) {
      playWordAudio(currentQ.sequenceWords.map((word) => word.english).join(', then '));
    } else {
      playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);
    }
  }, [currentQ]);

  // ── Reset on question change ─────────────────────────────────────────────────

  useEffect(() => {
    if (!currentQ || isCompleted || showSavedSummary || showSessionIntro || showResumePrompt || roundTransition) return;
    setWrongCount(0);
    setSelectedId(null);
    setDisabledIds(new Set());
    setBounceCorrect(false);
    setShowCheck(false);
    setWiggling(false);
    setGkPicked(null);

    if (currentQ.type === 'MATCH_LINES') {
      // The Line Match engine owns audio and per-word attempts.
      setKokoBubble('Nối từ với tranh nhé! 🔗');
      setKokoMood('happy');
      return;
    }

    if (currentQ.type === 'GK' || currentQ.type === 'DELIVER') {
      setKokoBubble(`Cho Koko: ${currentQ.targetVocab.english}! 🤲`);
      setKokoMood('listening');
    } else if (currentQ.type === 'YN' || currentQ.type === 'PUPPET') {
      setKokoBubble(`Is it a ${currentQ.claimedWord}? 🤔`);
      setKokoMood('thinking');
    } else if (currentQ.type === 'SS') {
      setKokoBubble(`Âm ${currentQ.startingSound?.phoneme}! 🔤`);
      setKokoMood('happy');
    } else {
      setKokoBubble('Nghe và chạm! 👆');
      setKokoMood('listening');
    }

    const t = setTimeout(() => {
      if (currentQ.turn === 1 && currentQ.variant === 'B') {
        // Round 1 B now speaks its target when the picture + word choices appear.
        playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);
      } else {
        playPrompt();
      }
    }, 350);
    return () => { if (t) clearTimeout(t); };
  }, [currentIdx, currentQ, isCompleted, showSavedSummary, showSessionIntro, showResumePrompt, roundTransition, playPrompt]);

  useEffect(() => {
    if (!currentQ || currentQ.turn !== 1 || isCompleted || showSavedSummary || showSessionIntro || showResumePrompt || roundTransition || wrongCount) return;
    const timer = window.setTimeout(() => {
      setBounceCorrect(true);
      if (currentQ.variant !== 'B') playPrompt();
      window.setTimeout(() => setBounceCorrect(false), 1800);
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [currentQ, currentIdx, wrongCount, isCompleted, showSavedSummary, showSessionIntro, showResumePrompt, roundTransition, playPrompt]);

  useEffect(() => {
    if (isCompleted || showSavedSummary || showResumePrompt || showSessionIntro || roundTransition || !questions.length) return;
    try {
      localStorage.setItem(checkpointKey, JSON.stringify({
        lessonId,
        vocabularyIds: vocabulary.map((word) => word._id || (word as any).id || word.english),
        questions,
        variantByWordId,
        requeuedWordIds: [...requeuedWordIds],
        questionIndex: currentIdx,
        attemptCount: wrongCount,
        totalWrongAttempts,
        sessionWordStats,
        startedAt: sessionStartTime,
        round2: round2State,
      } satisfies Stage2Checkpoint));
    } catch { /* Continue practice when storage is unavailable. */ }
  }, [checkpointKey, lessonId, vocabulary, questions, variantByWordId, requeuedWordIds, currentIdx, wrongCount, totalWrongAttempts, sessionWordStats, sessionStartTime, isCompleted, showSavedSummary, showResumePrompt, showSessionIntro, roundTransition, round2State]);

  useEffect(() => {
    if (!roundTransition) return;
    const timer = window.setTimeout(() => {
      if (roundTransition.kind === 'complete') {
        if (roundTransition.turn === 3) setIsCompleted(true);
        else setRoundTransition({ kind: 'intro', turn: (roundTransition.turn + 1) as 2 | 3 });
      } else {
        setCurrentIdx((index) => Math.min(index + 1, questions.length - 1));
        setRoundTransition(null);
      }
    }, roundTransition.kind === 'complete' ? 2000 : 1500);
    return () => window.clearTimeout(timer);
  }, [roundTransition, questions.length]);

  // ── Correct handler ──────────────────────────────────────────────────────────

  const handleCorrect = useCallback(() => {
    sfx.playCorrect();
    setShowCheck(true);
    setKokoMood('celebrating');
    setKokoBubble(`${randomPraise()} ${currentQ.targetVocab.english}! 🎉`);

    const firstTry = wrongCount === 0 && !currentQ.isRequeue;
    const wId = currentQ.wordId;

    if (!currentQ.isRequeue) setSessionWordStats((prev) => ({
      ...prev,
      [wId]: {
        firstTryCorrect: (prev[wId]?.firstTryCorrect || 0) + (firstTry ? 1 : 0),
        retryAttempts: prev[wId]?.retryAttempts || 0,
      },
    }));

    recordAttempt(wId, {
      type: currentQ.type,
      activityId: currentQ.turn === 1 ? currentQ.activityId : undefined,
      round: Number(currentQ.turn),
      affectsMastery: !currentQ.isRequeue,
      ok: true,
      isFirstTry: firstTry,
      usedHint: wrongCount >= 2,
      vocab: currentQ.targetVocab,
    });

    // Speak immediately from the answer tap so mobile browsers allow playback.
    // Keep Round 1 open until pronunciation finishes so the next prompt cannot cut it off.
    const pronunciation = playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);

    const advanceAfterCorrect = () => {
      if (currentIdx + 1 < questions.length) {
        const nextQuestion = questions[currentIdx + 1];
        if (nextQuestion.turn !== currentQ.turn) {
          setRoundTransition({ kind: 'complete', turn: currentQ.turn as 1 | 2 | 3 });
        } else {
          setCurrentIdx((p) => p + 1);
        }
      } else {
        setRoundTransition({ kind: 'complete', turn: currentQ.turn as 1 | 2 | 3 });
        sfx.playSuccess();
      }
    };
    if (currentQ.turn === 1) {
      void pronunciation.then(() => window.setTimeout(advanceAfterCorrect, 400));
    } else {
      window.setTimeout(advanceAfterCorrect, 1500);
    }
  }, [currentQ, wrongCount, currentIdx, questions, recordAttempt]);

  // ── Wrong handler ────────────────────────────────────────────────────────────

  const handleWrong = useCallback((chosen?: Vocabulary) => {
    if (wrongCount >= 2 || showCheck) return;
    sfx.playGentleWrong();
    setWiggling(true);
    setTimeout(() => setWiggling(false), 500);

    const newCount = wrongCount + 1;
    setWrongCount(newCount);
    setTotalWrongAttempts((p) => p + 1);

    const wId = currentQ.wordId;
    if (!currentQ.isRequeue) setSessionWordStats((prev) => ({
      ...prev,
      [wId]: {
        firstTryCorrect: prev[wId]?.firstTryCorrect || 0,
        retryAttempts: (prev[wId]?.retryAttempts || 0) + 1,
      },
    }));

    const chosenId = chosen ? (chosen._id ?? (chosen as any).id ?? chosen.english) : undefined;
    recordAttempt(wId, {
      type: currentQ.type,
      activityId: currentQ.turn === 1 ? currentQ.activityId : undefined,
      round: Number(currentQ.turn),
      affectsMastery: !currentQ.isRequeue,
      ok: false,
      isFirstTry: false,
      chosenDistractorId: chosenId,
      vocab: currentQ.targetVocab,
    });

    if (newCount === 1) {
      setKokoMood('encouraging');
      setKokoBubble('Không sao, thử lại nhé! 😊');
    } else if (newCount >= 2) {
      setKokoMood('happy');
      setKokoBubble('Look, this one! 💡');
      if (chosenId) setDisabledIds((p) => new Set([...p, chosenId]));
      setBounceCorrect(true);
      setTimeout(() => {
        if (currentQ.turn === 1 && currentQ.variant === 'B') playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);
        else playPrompt();
      }, 300);
      if (currentQ.turn === 1 && !currentQ.isRequeue && !requeuedWordIds.has(currentQ.wordId)) {
        const otherVariant = currentQ.variant === 'A' ? 'B' : 'A';
        const allowed = roundOneVariantsByAge[effectiveAgeGroup] || ['A'];
        const retryVariant = allowed.includes(otherVariant) ? otherVariant : currentQ.variant || 'A';
        const retryType = retryVariant === 'B' ? 'LOOK_WORD' as const : 'LT' as const;
        const targetWord = currentQ.targetVocab;
        const retryCount = retryVariant === 'B' ? (effectiveAgeGroup === '3-4' ? 2 : 3) : getAgeOptionsLimits(effectiveAgeGroup).ltStart;
        const retryDistractors = shuffle(vocabulary.filter((word) => (word._id || (word as any).id || word.english) !== currentQ.wordId)).slice(0, retryCount - 1);
        const retryOptions = shuffle([targetWord, ...retryDistractors]);
        const retryQuestion: PracticeQuestion = {
          ...currentQ,
          id: `${currentQ.id}-retry`,
          type: retryType,
          variant: retryVariant,
          activityId: retryVariant === 'B' ? 'look-choose-word' : 'listen-choose',
          options: retryOptions,
          optionsCount: retryOptions.length,
          isRequeue: true,
        };
        setQuestionOverride((existing) => {
          const queue = existing || questions;
          const roundEnd = queue.findIndex((question, index) => index > currentIdx && question.turn !== 1);
          const insertAt = Math.min(currentIdx + 3, roundEnd < 0 ? queue.length : roundEnd);
          return [...queue.slice(0, insertAt), retryQuestion, ...queue.slice(insertAt)];
        });
        setRequeuedWordIds((previous) => new Set([...previous, currentQ.wordId]));
      }
    }
  }, [currentQ, wrongCount, playPrompt, recordAttempt, showCheck, requeuedWordIds, questions, currentIdx, effectiveAgeGroup, vocabulary]);

  // ── Interaction handlers ─────────────────────────────────────────────────────

  const handleCardClick = (vocab: Vocabulary) => {
    if (showCheck) return;
    const id = vocab._id ?? (vocab as any).id ?? vocab.english;
    const targetId = currentQ.targetVocab._id ?? (currentQ.targetVocab as any).id ?? currentQ.targetVocab.english;
    setSelectedId(id);
    if (id === targetId) handleCorrect();
    else handleWrong(vocab);
  };

  const handleYesNo = (yes: boolean) => {
    if (showCheck) return;
    if (yes === currentQ.isTrueClaim) handleCorrect();
    else handleWrong();
  };

  const handleGkPickItem = (vocab: Vocabulary) => {
    if (showCheck) return;
    sfx.playPop();
    setGkPicked(vocab._id ?? vocab.english);
    setKokoBubble('Đưa cho Koko nào! 🤲');
  };

  const handleGkGiveToKoko = () => {
    if (!gkPicked || showCheck) return;
    const picked = currentQ.options.find((v) => (v._id ?? v.english) === gkPicked);
    if (!picked) return;
    const targetId = currentQ.targetVocab._id ?? (currentQ.targetVocab as any).id ?? currentQ.targetVocab.english;
    const pickedId = picked._id ?? (picked as any).id ?? picked.english;
    if (pickedId === targetId) handleCorrect();
    else {
      handleWrong(picked);
      setGkPicked(null);
    }
  };

  // ── Build current session object ─────────────────────────────────────────────

  const buildCurrentSession = useCallback((): Stage2PracticeSession => {
    const words: WordPracticeResult[] = vocabulary.map((word) => {
      const id = word._id || (word as any).id || word.english;
      const stats = sessionWordStats[id] || { firstTryCorrect: 0, retryAttempts: 0 };
      return {
        wordId: id,
        english: word.english,
        vietnamese: word.vietnamese || '',
        imageUrl: word.imageUrl,
        emoji: getWordEmoji(word),
        firstTryCorrect: stats.firstTryCorrect,
        wrongCount: stats.retryAttempts,
        isConfident: stats.firstTryCorrect > 0 && stats.retryAttempts === 0,
      };
    }).sort((a, b) => b.wrongCount - a.wrongCount);

    return {
      sessionId: `${lessonId}_${sessionStartTime}`,
      childId,
      lessonId,
      startedAt: sessionStartTime,
      completedAt: Date.now(),
      totalQuestions: totalQ,
      firstTryCorrectTotal: words.reduce((sum, w) => sum + w.firstTryCorrect, 0),
      totalWrongAttempts,
      words,
    };
  }, [vocabulary, sessionWordStats, lessonId, sessionStartTime, childId, totalQ, totalWrongAttempts]);

  // Save session once on completion (no duplicate saves on re-render)
  useEffect(() => {
    if (!isCompleted || sessionSavedRef.current) return;
    sessionSavedRef.current = true;
    const session = buildCurrentSession();
    setCurrentSession(session);
    vocabStatsService.saveStage2Session(session);
  }, [isCompleted, buildCurrentSession]);

  // ── Practice again ───────────────────────────────────────────────────────────

  const startPracticeAgain = (weakWordsOnly = false) => {
    sfx.playPop();
    setShowSavedSummary(false);
    setCurrentIdx(0);
    setWrongCount(0);
    setSelectedId(null);
    setDisabledIds(new Set());
    setBounceCorrect(false);
    setShowCheck(false);
    setWiggling(false);
    setGkPicked(null);
    setTotalWrongAttempts(0);
    setSessionWordStats({});
    setRound2State(emptyLineMatchState());
    round2InitialRef.current = null;
    sessionSavedRef.current = false;
    setCurrentSession(null);
    setIsCompleted(false);
    // (weakWordsOnly is noted; in future we can filter questions by weak words)
    void weakWordsOnly;
  };

  const handleFinish = () => {
    if (!currentSession) {
      const session = buildCurrentSession();
      vocabStatsService.saveStage2Session(session);
    }
    onComplete({ score: 100, stars: 3 });
  };

  const saveAndExit = () => {
    try {
      localStorage.setItem(checkpointKey, JSON.stringify({
        lessonId,
        vocabularyIds: vocabulary.map((word) => word._id || (word as any).id || word.english),
        questions,
        variantByWordId,
        requeuedWordIds: [...requeuedWordIds],
        questionIndex: currentIdx,
        attemptCount: wrongCount,
        totalWrongAttempts,
        sessionWordStats,
        startedAt: sessionStartTime,
        round2: round2State,
      } satisfies Stage2Checkpoint));
    } catch { /* Saving is best effort; the child can still leave. */ }
    setShowBreakDialog(false);
    if (onBackToStage1) onBackToStage1();
    else onComplete();
  };

  const activeGameplay = !isCompleted && !showSavedSummary && !showSessionIntro && !showResumePrompt;
  const saveAndExitRef = useRef(saveAndExit);
  saveAndExitRef.current = saveAndExit;
  useEffect(() => {
    if (!activeGameplay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (window.history.state?.stage2Practice !== true) {
      window.history.pushState({ ...(window.history.state || {}), stage2Practice: true }, '');
    }
    exitButtonRef.current?.focus();
    const handleBrowserBack = () => saveAndExitRef.current();
    window.addEventListener('popstate', handleBrowserBack);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('popstate', handleBrowserBack);
    };
  }, [activeGameplay]);

  const advanceRoundTransition = () => {
    if (!roundTransition) return;
    if (roundTransition.kind === 'complete') {
      if (roundTransition.turn === 3) setIsCompleted(true);
      else setRoundTransition({ kind: 'intro', turn: (roundTransition.turn + 1) as 2 | 3 });
    } else {
      setCurrentIdx((index) => Math.min(index + 1, questions.length - 1));
      setRoundTransition(null);
    }
  };

  const startSession = () => {
    setShowResumePrompt(false);
    setShowSessionIntro(false);
  };

  const restartFromBeginning = () => {
    try { localStorage.removeItem(checkpointKey); } catch { /* optional storage */ }
    setCurrentIdx(0);
    setQuestionOverride(plan.questions);
    setRequeuedWordIds(new Set());
    setWrongCount(0);
    setTotalWrongAttempts(0);
    setSessionWordStats({});
    setRoundTransition(null);
    setShowResumePrompt(false);
    setShowSessionIntro(false);
    setRound2State(emptyLineMatchState());
    round2InitialRef.current = null;
    sessionSavedRef.current = false;
  };

  // ── Completion / Summary screen ──────────────────────────────────────────────

  if (isCompleted || showSavedSummary) {
    const latestSavedList = vocabStatsService.getStage2Sessions(childId, lessonId);
    const activeSession: Stage2PracticeSession | null = currentSession || (latestSavedList.length > 0 ? latestSavedList[0] : null);
    const wordsToDisplay: WordPracticeResult[] = activeSession?.words || vocabulary.map((word) => {
      const id = word._id || (word as any).id || word.english;
      return { wordId: id, english: word.english, vietnamese: word.vietnamese || '', imageUrl: word.imageUrl, emoji: getWordEmoji(word), firstTryCorrect: 0, wrongCount: 0, isConfident: false };
    });
    const sessionDateStr = activeSession?.completedAt
      ? new Date(activeSession.completedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('vi-VN');
    const firstTryCount = activeSession?.firstTryCorrectTotal ?? wordsToDisplay.filter((word) => word.firstTryCorrect > 0).length;
    const totalWrongCount = activeSession?.totalWrongAttempts ?? wordsToDisplay.reduce((sum, word) => sum + word.wrongCount, 0);
    const wordsConfident = wordsToDisplay.filter((word) => word.isConfident);
    const wordsNeedReview = wordsToDisplay.filter((word) => !word.isConfident);

    return (
      <div className="w-full h-full min-h-0 flex flex-col bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-slate-100 select-none overflow-hidden">
        <header className="shrink-0 px-3 pt-3 pb-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-1"><KokoMascot state="celebrating" size="sm" interactive={false} speechBubble="Bé giỏi quá! 🎉" bubblePosition="top" /></div>
          <h2 className="text-[clamp(1.3rem,3vh,1.8rem)] font-black text-white leading-tight">Hoàn thành Chặng 2!</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">{sessionDateStr} · {activeSession?.totalQuestions || totalQ} lượt luyện tập</p>
        </header>
        <div className="shrink-0 px-3 py-2"><div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          <div className="rounded-2xl border-2 border-sky-700/60 bg-sky-900/40 p-2 text-center"><span className="block text-xl" aria-hidden>📚</span><span className="block text-[10px] sm:text-xs font-bold text-sky-300">Số từ</span><strong className="text-base sm:text-lg font-black text-sky-200">{wordsToDisplay.length}</strong></div>
          <div className="rounded-2xl border-2 border-emerald-700/60 bg-emerald-900/40 p-2 text-center"><span className="block text-xl" aria-hidden>🎯</span><span className="block text-[10px] sm:text-xs font-bold text-emerald-300">Đúng ngay</span><strong className="text-base sm:text-lg font-black text-emerald-200">{firstTryCount}</strong></div>
          <div className="rounded-2xl border-2 border-amber-700/60 bg-amber-900/40 p-2 text-center"><span className="block text-xl" aria-hidden>🔁</span><span className="block text-[10px] sm:text-xs font-bold text-amber-300">Lần sai</span><strong className="text-base sm:text-lg font-black text-amber-200">{totalWrongCount}</strong></div>
        </div></div>
        <main className="flex-1 min-h-0 overflow-y-auto px-3 pb-1 space-y-2">
          {wordsConfident.length > 0 && <section><h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><span>✅</span> Đã ghi nhớ tốt ({wordsConfident.length})</h3><div className="space-y-1.5">{wordsConfident.map((word) => <article key={word.wordId} className="flex items-center gap-3 rounded-2xl border border-emerald-700/50 bg-emerald-900/30 px-3 py-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-800/60 text-2xl">{word.emoji || '🌟'}</span><div className="min-w-0 flex-1"><p className="text-sm sm:text-base font-black text-emerald-100 capitalize">{word.english}</p>{word.vietnamese && <p className="text-xs font-bold text-emerald-400/80">{word.vietnamese}</p>}</div><span className="shrink-0 rounded-xl px-2 py-0.5 text-xs font-black bg-emerald-700/60 text-emerald-200">Tự tin ✓</span></article>)}</div></section>}
          {wordsNeedReview.length > 0 && <section><h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5 flex items-center gap-1"><span>📌</span> Nên ôn lại ({wordsNeedReview.length})</h3><div className="space-y-1.5">{wordsNeedReview.map((word) => <article key={word.wordId} className="flex items-center gap-3 rounded-2xl border border-amber-700/50 bg-amber-900/25 px-3 py-2"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-800/50 text-2xl">{word.emoji || '🌟'}</span><div className="min-w-0 flex-1"><p className="text-sm sm:text-base font-black text-amber-100 capitalize">{word.english}</p>{word.vietnamese && <p className="text-xs font-bold text-amber-400/80">{word.vietnamese}</p>}</div><span className="shrink-0 rounded-xl px-2 py-0.5 text-xs font-black bg-amber-700/60 text-amber-200">{word.wrongCount > 0 ? `Sai ${word.wrongCount}×` : 'Ôn thêm'}</span></article>)}</div></section>}
        </main>
        <div className="shrink-0 px-3 pb-3 pt-2 flex items-center gap-2 max-w-sm mx-auto w-full">
          {wordsNeedReview.length > 0 && <button type="button" onClick={() => startPracticeAgain(true)} aria-label="Ôn lại từ cần ôn" className="flex-1 min-h-[52px] rounded-2xl bg-amber-600/80 hover:bg-amber-500/90 active:bg-amber-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 border-2 border-amber-400/70 shadow-lg active:scale-95 transition-all cursor-pointer"><RefreshCw className="w-4 h-4 stroke-[2.5]" /><span>Ôn lại</span></button>}
          <button type="button" onClick={handleFinish} aria-label="Đến Khu vui chơi" className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"><span>Khu vui chơi 🚀</span><ArrowRight className="w-4 h-4 stroke-[3]" /></button>
        </div>
      </div>
    );
  }
  if (showResumePrompt) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-indigo-950 to-slate-950 p-4 text-white">
        <div role="dialog" aria-modal="true" aria-labelledby="practice-resume-title" className="w-full max-w-lg rounded-[2rem] border-4 border-amber-200 bg-white p-8 text-center text-slate-900 shadow-2xl">
          <KokoMascot state="happy" size="md" interactive={false} speechBubble="Welcome back!" bubblePosition="top" />
          <h2 id="practice-resume-title" className="my-5 text-3xl font-black">Welcome back! 👋</h2>
          <div className="mb-6 flex justify-center gap-3" aria-label="Your practice rounds">
            {[1, 2, 3].map((turn) => { const resumeTurn = Number(checkpoint?.questions[checkpoint.questionIndex]?.turn || 1); return <span key={turn} className={`grid h-14 w-14 place-items-center rounded-full text-xl font-black ${turn < resumeTurn ? 'bg-emerald-200 text-emerald-800' : turn === resumeTurn ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400'}`}>{turn < resumeTurn ? '★' : turn}</span>; })}
          </div>
          <button type="button" onClick={startSession} className="mb-3 min-h-[96px] w-full rounded-3xl bg-indigo-700 text-2xl font-black text-white">Continue</button>
          <button type="button" onClick={restartFromBeginning} className="min-h-[88px] w-full rounded-3xl border-4 border-slate-200 text-xl font-black">Start over</button>
        </div>
      </div>
    );
  }

  if (showSessionIntro) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-indigo-950 to-slate-950 p-4 text-white">
        <div className="flex flex-col items-center gap-5 text-center">
          <KokoMascot state="happy" size="lg" interactive={false} speechBubble="Let's practice!" bubblePosition="top" />
          <h2 className="text-5xl font-black">Let's practice!</h2>
          <div className="text-5xl text-amber-300" aria-hidden>☆ ☆ ☆</div>
          <button type="button" onClick={startSession} className="min-h-[96px] min-w-[280px] rounded-3xl bg-indigo-700 px-10 text-3xl font-black text-white shadow-xl">Let's go!</button>
        </div>
      </div>
    );
  }

  if (roundTransition) {
    const isRoundComplete = roundTransition.kind === 'complete';
    return (
      <button type="button" onClick={advanceRoundTransition} className="flex h-full w-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-indigo-950 to-slate-950 p-6 text-center text-white">
        <div className="text-8xl" aria-hidden>{isRoundComplete ? '⭐' : roundTransition.turn === 2 ? '🧩' : '🎭'}</div>
        <h2 className="text-4xl font-black">{isRoundComplete ? 'Great job! 🎉' : `Round ${roundTransition.turn} · ${questions[currentIdx + 1]?.activityName || 'Practice'}`}</h2>
        <p className="text-2xl font-bold text-slate-200">Tap to continue</p>
      </button>
    );
  }

  if (!currentQ) return null;

  const roundQuestions = questions.filter((question) => question.turn === currentQ.turn && !question.isRequeue);
  const roundDone = questions.slice(0, currentIdx).filter((question) => question.turn === currentQ.turn && !question.isRequeue).length;
  // Round 2 (Line Match) progress = words correctly matched, not questions passed.
  const isLineMatch = currentQ.type === 'MATCH_LINES';
  const progressRatio = isLineMatch
    ? (roundTwoMatchedCount / Math.max(1, roundTwoQuestions.length)) * 100
    : (roundDone / Math.max(1, roundQuestions.length)) * 100;
  const progressLabel = isLineMatch
    ? `${roundTwoMatchedCount}/${roundTwoQuestions.length} words`
    : `${roundDone}/${roundQuestions.length} words`;

  const turnLabel =
    currentQ.turn === 1 ? 'Vòng 1: Nhận biết'
    : currentQ.turn === 2 ? 'Vòng 2: Kết nối'
    : currentQ.turn === 3 ? 'Vòng 3: Ứng dụng'
    : 'Ôn tập';

  const activityInstruction =
    currentQ.type === 'LT' ? 'Listen and choose a picture'
    : currentQ.type === 'LOOK_WORD' ? 'Look and choose the word'
    : currentQ.type === 'MATCH_LINES' ? (effectiveAgeGroup === '5-6' ? 'Match the word with the picture.' : 'Match the sound with the picture.')
    : currentQ.type === 'GK' || currentQ.type === 'DELIVER' ? 'Choose the object and give it to Koko'
    : currentQ.type === 'YN' || currentQ.type === 'PUPPET' ? 'Is Koko right or wrong?'
    : currentQ.type === 'WIPE' ? 'Wipe or tap a window'
    : currentQ.type === 'MEMORY' ? 'Find the matching pair'
    : currentQ.type === 'TRACE' ? 'Tap a speaker, then a picture'
    : currentQ.type === 'SLIDE' ? 'Slide and find the picture'
    : currentQ.type === 'SEQUENCE' ? 'Tap the pictures in order'
    : currentQ.type === 'PATH' ? 'Follow a path to the picture'
    : `Find the word that starts with ${currentQ.startingSound?.phoneme}`;

  const playScreen = (
    <div className="stage2-practice-shell fixed inset-0 z-[90] w-full h-[100dvh] min-h-0 flex flex-col overflow-hidden select-none bg-slate-900 text-slate-100" role="dialog" aria-modal="true" aria-label="Luyện tập Chặng 2">

      {/* TOP BAR */}
      <div className="shrink-0 h-14 min-h-14 px-3 flex items-center gap-3 border-b border-white/10 bg-slate-950/60 backdrop-blur-sm">
        <button
          type="button"
          ref={exitButtonRef}
          onClick={() => { sfx.playPop(); setShowBreakDialog(true); }}
          aria-label="Thoát"
          className="w-14 h-14 min-w-14 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer active:scale-90 transition-all shrink-0"
        >
          <X className="w-8 h-8 stroke-[2.5]" />
        </button>
        <span className="stage2-compact-instruction min-w-0 truncate text-base font-black text-slate-100" aria-hidden="true">{activityInstruction}</span>

        {/* Progress bar */}
        <div className="practice-progress flex-1 flex items-center gap-2 mx-1">
          <div className="flex-1 h-3 bg-white/15 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(4, progressRatio)}%` }}
            />
          </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-base sm:text-lg font-black text-amber-300 shrink-0 tracking-wide whitespace-nowrap">
            {progressLabel}
          </span>
        </div>

        {/* Round label */}
        <span className="shrink-0 px-2.5 py-1 rounded-full bg-indigo-700/60 border border-indigo-500/50 text-base sm:text-lg font-black text-indigo-200 whitespace-nowrap">
          {turnLabel}
        </span>
      </div>

      {/* INSTRUCTION BANNER */}
      <div className="stage2-instruction shrink-0 h-10 px-3 bg-slate-800/50 border-b border-white/5 flex items-center justify-center">
        <span className="text-lg sm:text-xl font-black text-slate-200 text-center truncate">
          {activityInstruction}
        </span>
      </div>

      <main className="flex-1 min-h-0 min-w-0 p-3 sm:px-6 flex items-center justify-center overflow-hidden">

          {/* LT: Listen & Tap */}
          {currentQ.turn === 1 && currentQ.variant === 'A' && roundOneActivityQuestion && (
            <ListenChooseEngine
              question={roundOneActivityQuestion}
              selectedOptionId={selectedId}
              feedbackState={showCheck ? 'correct' : wiggling ? 'wrong' : 'idle'}
              onSelectOption={(option) => {
                const selected = currentQ.options.find((word) => (word._id || (word as any).id || word.english) === option.id);
                if (selected) handleCardClick(selected);
              }}
              onPlayPrompt={playPrompt}
              practiceMode
              textChoiceMode={!!currentQ.isAbstractVisual && effectiveAgeGroup === '5-6'}
              revealOptionId={wrongCount >= 2 ? currentQ.wordId : null}
              disabledOptionIds={wrongCount >= 2 ? roundOneActivityQuestion.options.filter((option) => !option.isCorrect).map((option) => option.id) : []}
            />
          )}
          {currentQ.turn === 1 && currentQ.variant === 'B' && roundOneActivityQuestion && (
            <ImageWordMatchEngine
              question={roundOneActivityQuestion}
              practiceMode
              vietnameseGloss={currentQ.targetVocab.vietnamese || ''}
              revealOptionId={wrongCount >= 2 ? currentQ.wordId : null}
              disabledOptionIds={wrongCount >= 2 ? roundOneActivityQuestion.options.filter((option) => !option.isCorrect).map((option) => option.id) : []}
              disabled={showCheck}
              onAnswer={(_isCorrect, optionId) => {
                const selected = currentQ.options.find((word) => (word._id || (word as any).id || word.english) === optionId);
                if (selected) handleCardClick(selected);
              }}
            />
          )}

          {/* Round 2: Line Match — the single "Kết nối" activity */}
          {currentQ.type === 'MATCH_LINES' && (
            <LineMatchEngine
              key="round2-line-match"
              questions={roundTwoQuestions}
              boards={roundTwoBoards}
              boardIndex={roundTwoBoardIndex}
              ageGroup={effectiveAgeGroup}
              initialState={round2InitialRef.current}
              onStateChange={handleRound2StateChange}
              onWordMatched={handleRound2WordMatched}
              onWordWrong={handleRound2WordWrong}
              onBoardComplete={handleRound2BoardComplete}
              onRoundComplete={handleRound2RoundComplete}
              onFeedback={setRound2Feedback}
              onSizeMeasured={setRound2ContentH}
            />
          )}

          {/* GK: Give to Koko */}
          {currentQ.type === 'GK' && (
            <GKActivity
              options={currentQ.options}
              targetVocab={currentQ.targetVocab}
              pickedId={gkPicked}
              disabledIds={disabledIds}
              showCheck={showCheck}
              bounceCorrect={bounceCorrect}
              wiggling={wiggling}
              onPickItem={handleGkPickItem}
              onGiveToKoko={handleGkGiveToKoko}
              kokoMood={kokoMood}
              kokoBubble={kokoBubble}
            />
          )}

          {/* YN: Yes or No */}
          {currentQ.type === 'YN' && (
            <YNActivity
              targetVocab={currentQ.targetVocab}
              claimedWord={currentQ.claimedWord ?? currentQ.targetVocab.english}
              showCheck={showCheck}
              isWiggling={wiggling}
              onAnswer={handleYesNo}
            />
          )}

          {/* SS: Starting Sound */}
          {currentQ.type === 'SS' && currentQ.startingSound && (
            <SSActivity
              options={currentQ.options}
              targetVocab={currentQ.targetVocab}
              startingSound={currentQ.startingSound}
              selectedId={selectedId}
              disabledIds={disabledIds}
              showCheck={showCheck}
              bounceCorrect={bounceCorrect}
              wiggling={wiggling}
              onSelect={handleCardClick}
            />
          )}

          {['WIPE', 'MEMORY', 'TRACE', 'SLIDE', 'DELIVER', 'PUPPET', 'SEQUENCE', 'PATH'].includes(currentQ.type) && (
            <ActivityChallenge
              key={currentQ.id}
              question={currentQ}
              revealCorrect={wrongCount >= 2 || bounceCorrect}
              onCorrect={handleCorrect}
              onWrong={handleWrong}
            />
          )}

          {/* Fallback for unknown type (should not occur) */}
          {currentQ.type === 'FS' && (
            <LTActivity
              options={currentQ.options}
              targetVocab={currentQ.targetVocab}
              selectedId={selectedId}
              disabledIds={disabledIds}
              showCheck={showCheck}
              bounceCorrect={bounceCorrect}
              wiggling={wiggling}
              onSelect={handleCardClick}
            />
          )}
      </main>
      <div className="shrink-0 h-11 min-h-11 px-4 flex items-center justify-center text-xl font-black text-emerald-200" aria-live="polite">
        {showCheck ? kokoBubble : wiggling ? 'Try again! You can do it!' : currentQ.type === 'MATCH_LINES' ? round2Feedback : ''}
      </div>
      {showBreakDialog && <BreakDialog onClose={() => setShowBreakDialog(false)} onSaveAndExit={saveAndExit} returnFocusRef={exitButtonRef} />}
    </div>
  );
  return createPortal(playScreen, document.body);
};
