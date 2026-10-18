/**
 * Stage2PracticeFlow.tsx
 * =======================
 * Child-First Stage 2 (Hoc & Luyen tap) – redesigned for 3-6 year olds.
 *
 * Layout: 2-panel immersive
 *   LEFT  (30%) : Koko mascot + speech bubble + audio replay button
 *   RIGHT (70%) : FIXED 2x2 or 2x1 option grid (always 2 or 4 cards — never 3 or 5)
 *
 * Rules:
 *  - Always 2 or 4 cards (never odd numbers)
 *  - Wrong answer: wiggle only -> replay audio -> no hint/reveal until 4th wrong
 *  - 4th wrong: audio repeat + gentle bounce on correct card (no highlight banner)
 *  - Koko bubble appears ABOVE Koko, never overlaps card area
 *  - Top bar: X, stars progress bar, Parent Drawer button
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Volume2, ArrowRight, Check, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { Vocabulary, AgeGroupCode } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';
import { useAuth } from '../../../context/AuthContext';
import { useVocabStats } from '../../../hooks/useVocabStats';
import {
  buildPracticePlan,
  type PracticeQuestion,
} from './buildPracticePlan';
import { KokoMascot, type MascotState } from '../KokoMascot';

// ── Constants & Reward Config ──────────────────────────────────────────────────

export const STAGE2_REWARDS = {
  FIRST_TRY_CORRECT_STARS: 2,
  SECOND_TRY_CORRECT_STARS: 1,
  HINT_ASSISTED_STARS: 0,
  MAX_TOTAL_STARS: 3,
};

const PRAISES = ['Great!', 'Yes!', 'Awesome!', 'Super!', 'Good job!', 'Wow!', 'Perfect!'];
function randomPraise() { return PRAISES[Math.floor(Math.random() * PRAISES.length)]; }

const EMOJI_FALLBACK: Record<string, string> = {
  pencil: '✏️', book: '📖', eraser: '🧼', ruler: '📏', bag: '🎒',
  crayon: '🖍️', scissors: '✂️', desk: '🪑', school: '🏫',
  animal: '🐾', fruit: '🍎', color: '🎨',
};

function getWordEmoji(vocab: Vocabulary): string {
  const key = (vocab.english || '').toLowerCase();
  return EMOJI_FALLBACK[key] ?? EMOJI_FALLBACK[(vocab as any).category] ?? '🌟';
}

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
        <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-amber-50/20 border-2 border-dashed border-amber-400/40">
          <span className="text-[clamp(2.5rem,8vh,5rem)] select-none leading-none">{getWordEmoji(vocab)}</span>
        </div>
      )}
    </div>
  );
};

// ── Props ──────────────────────────────────────────────────────────────────────

export interface Stage2PracticeFlowProps {
  vocabulary: Vocabulary[];
  lessonTitle?: string;
  ageGroup?: AgeGroupCode;
  ageGroupCode?: string;
  onComplete: (stats?: { score: number; stars: number }) => void;
  onBackToStage1?: () => void;
  onParentOpen: () => void;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export const Stage2PracticeFlow: React.FC<Stage2PracticeFlowProps> = ({
  vocabulary,
  ageGroup,
  ageGroupCode,
  onComplete,
  onBackToStage1,
  onParentOpen,
}) => {
  const effectiveAgeGroup: AgeGroupCode = (ageGroup || ageGroupCode || '4-5') as AgeGroupCode;
  const { user } = useAuth();
  const childId = (user as any)?._id || (user as any)?.id || 'child_guest';
  const { statsMap, recordAttempt, getKnownWords } = useVocabStats(childId);

  const plan = useMemo(
    () => buildPracticePlan(vocabulary, effectiveAgeGroup, statsMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocabulary, effectiveAgeGroup],
  );

  const [questions, setQuestions] = useState<PracticeQuestion[]>(plan.questions);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Per-question state
  const [wrongCount, setWrongCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());
  const [bounceCorrect, setBounceCorrect] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [wiggling, setWiggling] = useState(false);

  // GK: tap item -> tap Koko
  const [gkPicked, setGkPicked] = useState<string | null>(null);

  // Koko
  const [kokoMood, setKokoMood] = useState<MascotState>('happy');
  const [kokoBubble, setKokoBubble] = useState<string | undefined>('Lang nghe Koko nhe! 👂');

  // Scoring
  const [starsEarned, setStarsEarned] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = questions[currentIdx];
  const totalQ = questions.length;

  const playPrompt = useCallback(() => {
    if (!currentQ) return;
    if (currentQ.type === 'YN') {
      playWordAudio(`Is it a ${currentQ.claimedWord || currentQ.targetVocab.english}?`, currentQ.targetVocab.audioUrl);
    } else if (currentQ.type === 'SS') {
      const ph = currentQ.startingSound?.phoneme ?? '/p/';
      playWordAudio(currentQ.targetVocab.english + '... ' + ph + '! Which one starts with ' + ph + '?', currentQ.targetVocab.audioUrl);
    } else if (currentQ.type === 'GK') {
      playWordAudio(`Give Koko the ${currentQ.targetVocab.english}!`, currentQ.targetVocab.audioUrl);
    } else {
      playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);
    }
  }, [currentQ]);

  useEffect(() => {
    if (!currentQ || isCompleted) return;
    setWrongCount(0);
    setSelectedId(null);
    setDisabledIds(new Set());
    setBounceCorrect(false);
    setShowCheck(false);
    setWiggling(false);
    setGkPicked(null);

    if (currentQ.type === 'GK') {
      setKokoBubble(`Cho Koko: ${currentQ.targetVocab.english}! 🤲`);
    } else if (currentQ.type === 'YN') {
      setKokoBubble(`Is it a ${currentQ.claimedWord}? 🤔`);
    } else if (currentQ.type === 'SS') {
      setKokoBubble(`Âm ${currentQ.startingSound?.phoneme}! 🔤`);
    } else {
      setKokoBubble('Nghe va cham! 👆');
    }
    setKokoMood('listening');

    const t = setTimeout(playPrompt, 350);
    return () => clearTimeout(t);
  }, [currentIdx, currentQ, isCompleted, playPrompt]);

  const handleCorrect = useCallback(() => {
    sfx.playCorrect();
    setShowCheck(true);
    setKokoMood('celebrating');
    setKokoBubble(`${randomPraise()} ${currentQ.targetVocab.english}! 🎉`);

    const firstTry = wrongCount === 0;
    recordAttempt(currentQ.wordId, {
      type: currentQ.type,
      ok: true,
      isFirstTry: firstTry,
      usedHint: wrongCount >= 3,
      vocab: currentQ.targetVocab,
    });

    const add = firstTry
      ? STAGE2_REWARDS.FIRST_TRY_CORRECT_STARS
      : wrongCount === 1
      ? STAGE2_REWARDS.SECOND_TRY_CORRECT_STARS
      : STAGE2_REWARDS.HINT_ASSISTED_STARS;
    setStarsEarned((p) => p + add);

    setTimeout(() => {
      playWordAudio(currentQ.targetVocab.english, currentQ.targetVocab.audioUrl);
    }, 500);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((p) => p + 1);
      } else {
        setIsCompleted(true);
        sfx.playSuccess();
      }
    }, 1500);
  }, [currentQ, wrongCount, currentIdx, questions.length, recordAttempt]);

  const handleWrong = useCallback((chosen?: Vocabulary) => {
    sfx.playGentleWrong();
    setWiggling(true);
    setTimeout(() => setWiggling(false), 500);

    const newCount = wrongCount + 1;
    setWrongCount(newCount);

    const chosenId = chosen ? (chosen._id ?? (chosen as any).id ?? chosen.english) : undefined;
    recordAttempt(currentQ.wordId, {
      type: currentQ.type,
      ok: false,
      isFirstTry: false,
      chosenDistractorId: chosenId,
      vocab: currentQ.targetVocab,
    });

    if (newCount === 1) {
      setKokoMood('encouraging');
      setKokoBubble('Oops! Thu lai nhe 😊');
    } else if (newCount === 2) {
      setKokoMood('thinking');
      setKokoBubble('Nghe ky nhe 👂');
      if (chosenId) setDisabledIds((p) => new Set([...p, chosenId]));
      setTimeout(playPrompt, 300);
    } else if (newCount === 3) {
      setKokoMood('thinking');
      setKokoBubble('Nghe them nhe! 🎵');
      if (chosenId) setDisabledIds((p) => new Set([...p, chosenId]));
      setTimeout(playPrompt, 300);
    } else {
      setKokoMood('happy');
      setKokoBubble('Tim them di! 💡');
      setBounceCorrect(true);
      setTimeout(playPrompt, 300);
    }

    if (newCount === 1) {
      const requeue: PracticeQuestion = {
        ...currentQ,
        id: `retry_${currentQ.id}_${Date.now()}`,
        turn: 'bonus',
        type: currentQ.type === 'LT' ? 'GK' : 'LT',
      };
      setQuestions((prev) => {
        const list = [...prev];
        list.splice(Math.min(list.length, currentIdx + 3), 0, requeue);
        return list;
      });
    }
  }, [currentQ, wrongCount, currentIdx, playPrompt, recordAttempt]);

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

  const handleGkItem = (vocab: Vocabulary) => {
    if (showCheck) return;
    sfx.playPop();
    setGkPicked(vocab._id ?? vocab.english);
    setKokoBubble('Dua cho Koko nao! 🤲');
  };

  const handleKokoTap = () => {
    if (!gkPicked || showCheck) return;
    const picked = currentQ.options.find((v) => (v._id ?? v.english) === gkPicked);
    if (!picked) return;
    const targetId = currentQ.targetVocab._id ?? (currentQ.targetVocab as any).id ?? currentQ.targetVocab.english;
    const pickedId = picked._id ?? (picked as any).id ?? picked.english;
    if (pickedId === targetId) handleCorrect();
    else { handleWrong(picked); setGkPicked(null); }
  };

  const handleFinish = () => {
    const finalStars = Math.min(3, Math.max(1, Math.round((starsEarned / Math.max(1, totalQ * 2)) * 3)));
    onComplete({ score: 100, stars: finalStars });
  };

  // ── Completion screen ──────────────────────────────────────────────────────

  if (isCompleted) {
    const knownWords = getKnownWords(vocabulary);
    return (
      <div className="w-full h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 text-white select-none overflow-hidden">
        <div className="shrink-0 text-center pt-2">
          <span className="text-5xl animate-bounce inline-block">👑</span>
          <h2 className="text-[clamp(1.5rem,4vh,2.5rem)] font-black text-amber-300 drop-shadow mt-1">
            Kho Bau Mo Ra! 🎉
          </h2>
        </div>

        <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-4 max-w-xl">
          <div className="text-[clamp(4rem,12vh,7rem)] filter drop-shadow-2xl animate-pop-in">🎁</div>
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <span key={s} className="text-[clamp(2rem,6vh,3.5rem)] animate-soft-bounce">⭐</span>
            ))}
          </div>
          {knownWords.length > 0 && (
            <div className="w-full bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-amber-300/40 max-w-sm">
              <p className="text-xs font-black text-amber-200 text-center mb-2">🌟 Tu be nho sieu dinh:</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {knownWords.slice(0, 6).map((w) => (
                  <div key={w._id ?? w.english} className="flex flex-col items-center bg-white/15 rounded-xl px-3 py-2 border border-white/20">
                    <span className="text-2xl">{getWordEmoji(w)}</span>
                    <span className="text-xs font-black capitalize text-amber-200 mt-0.5">{w.english}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 w-full max-w-sm pb-2">
          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-[clamp(1.1rem,3vh,1.5rem)] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all cursor-pointer"
          >
            <span>Tien toi Khu Vui Choi 🚀</span>
            <ArrowRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const progressRatio = (currentIdx / Math.max(1, totalQ)) * 100;
  const optCount = currentQ.options.length;
  const isDouble = optCount > 2;

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden select-none bg-slate-900 text-slate-100">

      {/* TOP BAR */}
      <div className="shrink-0 h-[7dvh] min-h-[48px] max-h-[60px] px-3 flex items-center justify-between border-b border-white/10 bg-slate-950/60 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => { sfx.playPop(); if (onBackToStage1) onBackToStage1(); else onComplete(); }}
          aria-label="Thoat luu tien do"
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer active:scale-90 transition-all"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2 flex-1 mx-3 max-w-xs">
          <span className="text-base">⭐</span>
          <div className="flex-1 h-3 bg-white/15 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progressRatio}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-300 tabular-nums">
            <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-amber-300">
              {currentQ.turn === 'bonus' ? 'Ôn tập' : `Vòng ${currentQ.turn}/3`}
            </span>
            <span>Câu {Math.min(currentIdx + 1, totalQ)}/{totalQ}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onParentOpen}
          aria-label="Thong tin phu huynh"
          className="w-10 h-10 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 flex items-center justify-center text-lg cursor-pointer active:scale-90 transition-all border border-indigo-400/40"
        >
          👨‍👩‍👧
        </button>
      </div>

      {/* MAIN: Left Koko + Right Cards */}
      <div className="flex-1 min-h-0 flex overflow-hidden">

        {/* LEFT PANEL: Koko + Audio (fixed width, never overlaps cards) */}
        <div
          className="shrink-0 flex flex-col items-center justify-center gap-3 px-2 py-2 border-r border-white/10 bg-slate-950/30"
          style={{ width: 'clamp(88px, 26%, 170px)' }}
          onClick={currentQ.type === 'GK' ? handleKokoTap : undefined}
        >
          <div
            className={`transition-transform ${currentQ.type === 'GK' && gkPicked ? 'ring-4 ring-amber-400 rounded-full cursor-pointer scale-110 animate-soft-bounce' : ''}`}
          >
            <KokoMascot
              state={kokoMood}
              size="md"
              speechBubble={kokoBubble}
              bubblePosition="right"
              interactive={false}
            />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); sfx.playPop(); playPrompt(); }}
            aria-label="Nghe lai"
            className="w-[clamp(44px,10vw,68px)] h-[clamp(44px,10vw,68px)] rounded-full bg-sky-500 hover:bg-sky-400 active:scale-90 text-white flex items-center justify-center shadow-lg border-2 border-sky-300 cursor-pointer transition-all"
          >
            <Volume2 className="w-[45%] h-[45%]" />
          </button>
        </div>

        {/* RIGHT PANEL: Answer Cards */}
        <div className="flex-1 min-w-0 p-2 sm:p-3 overflow-hidden flex items-center justify-center">

          {currentQ.type === 'YN' ? (
            // YES/NO layout
            <div className="w-full h-full max-w-sm flex flex-col items-center justify-center gap-3">
              <div className="flex-1 min-h-0 w-full max-h-[45%] bg-white/10 rounded-3xl border-4 border-amber-300/60 p-2 shadow-xl flex flex-col items-center justify-center">
                <VocabImage vocab={currentQ.targetVocab} className="w-full h-full" />
                <span className="shrink-0 font-black text-amber-200 capitalize mt-1" style={{ fontSize: 'clamp(1rem,3vh,1.5rem)' }}>
                  {currentQ.targetVocab.english.toLowerCase()}
                </span>
              </div>
              <div className="shrink-0 w-full grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleYesNo(true)}
                  disabled={showCheck}
                  aria-label="Dung"
                  className="h-[clamp(56px,14vh,96px)] rounded-3xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black flex items-center justify-center gap-2 border-4 border-emerald-400 shadow-xl cursor-pointer transition-all"
                  style={{ fontSize: 'clamp(1.3rem,4vh,2rem)' }}
                >
                  <ThumbsUp className="w-7 h-7 stroke-[2.5]" />
                  Yes!
                </button>
                <button
                  type="button"
                  onClick={() => handleYesNo(false)}
                  disabled={showCheck}
                  aria-label="Khong"
                  className="h-[clamp(56px,14vh,96px)] rounded-3xl bg-orange-600 hover:bg-orange-500 active:scale-95 text-white font-black flex items-center justify-center gap-2 border-4 border-orange-400 shadow-xl cursor-pointer transition-all"
                  style={{ fontSize: 'clamp(1.3rem,4vh,2rem)' }}
                >
                  <ThumbsDown className="w-7 h-7 stroke-[2.5]" />
                  No!
                </button>
              </div>
            </div>
          ) : (
            // Image card grid (always 2 or 4 cards, 2 columns)
            <div
              className={`w-full h-full grid gap-2 sm:gap-3 grid-cols-2 ${isDouble ? 'grid-rows-2' : 'grid-rows-1 max-h-[70%]'}`}
            >
              {currentQ.options.map((opt) => {
                const optId = opt._id ?? (opt as any).id ?? opt.english;
                const targetId = currentQ.targetVocab._id ?? (currentQ.targetVocab as any).id ?? currentQ.targetVocab.english;
                const isTarget = optId === targetId;
                const isDisabled = disabledIds.has(optId);
                const isGkPicked = gkPicked === optId;
                const isWrongSel = selectedId === optId && wiggling;
                const isPulsing = bounceCorrect && isTarget;

                let cardCls = 'border-white/20 bg-white/10 hover:border-amber-400 hover:bg-white/15 hover:scale-[1.02]';
                if (showCheck && isTarget) {
                  cardCls = 'border-emerald-400 bg-emerald-500/30 ring-4 ring-emerald-400 scale-[1.03]';
                } else if (isGkPicked) {
                  cardCls = 'border-teal-400 bg-teal-500/30 ring-4 ring-teal-400 scale-[1.03]';
                } else if (isWrongSel) {
                  cardCls = 'border-orange-400 bg-orange-500/20 ring-2 ring-orange-400 animate-gentle-wobble';
                } else if (isDisabled) {
                  cardCls = 'border-white/5 bg-white/5 opacity-25 pointer-events-none';
                }

                return (
                  <button
                    key={optId}
                    type="button"
                    onClick={() => currentQ.type === 'GK' ? handleGkItem(opt) : handleCardClick(opt)}
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
                        style={{ fontSize: 'clamp(1rem,3.5vh,1.6rem)' }}
                      >
                        {opt.english.toLowerCase()}
                      </span>
                    </div>

                    {showCheck && isTarget && (
                      <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20 rounded-3xl animate-pop-in pointer-events-none">
                        <div className="w-[clamp(42px,9vh,70px)] h-[clamp(42px,9vh,70px)] rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl">
                          <Check className="w-[55%] h-[55%] stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
