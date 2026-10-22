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
  vocabStatsService,
  type Stage2PracticeSession,
  type WordPracticeResult
} from '../../../services/vocabStatsService';
import { buildPracticePlan } from './buildPracticePlan';
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
  lessonId: string;
  stage2Completed?: boolean;
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
  lessonId,
  stage2Completed = false,
  ageGroup,
  ageGroupCode,
  onComplete,
  onBackToStage1,
  onParentOpen,
}) => {
  const effectiveAgeGroup: AgeGroupCode = (ageGroup || ageGroupCode || '4-5') as AgeGroupCode;
  const { user } = useAuth();
  const childId = (user as any)?._id || (user as any)?.id || 'child_guest';
  const [showSavedSummary, setShowSavedSummary] = useState(stage2Completed);
  const { statsMap, recordAttempt } = useVocabStats(childId);

  const plan = useMemo(
    () => buildPracticePlan(vocabulary, effectiveAgeGroup, statsMap),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vocabulary, effectiveAgeGroup],
  );

  const questions = plan.questions;
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
  const [kokoBubble, setKokoBubble] = useState<string | undefined>('Lắng nghe Koko nhé! 👂');

  // Scoring & Accuracy tracking
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalWrongAttempts, setTotalWrongAttempts] = useState(0);
  const [sessionWordStats, setSessionWordStats] = useState<Record<string, { firstTryCorrect: number; retryAttempts: number }>>({});

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
    if (!currentQ || isCompleted || showSavedSummary) return;
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
      setKokoBubble('Nghe và chạm! 👆');
    }
    setKokoMood('listening');

    const t = setTimeout(playPrompt, 350);
    return () => clearTimeout(t);
  }, [currentIdx, currentQ, isCompleted, showSavedSummary, playPrompt]);

  const handleCorrect = useCallback(() => {
    sfx.playCorrect();
    setShowCheck(true);
    setKokoMood('celebrating');
    setKokoBubble(`${randomPraise()} ${currentQ.targetVocab.english}! 🎉`);

    const firstTry = wrongCount === 0;
    if (firstTry) {
      setSessionWordStats((previous) => ({
        ...previous,
        [currentQ.wordId]: {
          firstTryCorrect: (previous[currentQ.wordId]?.firstTryCorrect || 0) + 1,
          retryAttempts: previous[currentQ.wordId]?.retryAttempts || 0,
        },
      }));
    }
    recordAttempt(currentQ.wordId, {
      type: currentQ.type,
      ok: true,
      isFirstTry: firstTry,
      usedHint: wrongCount >= 3,
      vocab: currentQ.targetVocab,
    });

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
    setTotalWrongAttempts((p) => p + 1);
    setSessionWordStats((previous) => ({
      ...previous,
      [currentQ.wordId]: {
        firstTryCorrect: previous[currentQ.wordId]?.firstTryCorrect || 0,
        retryAttempts: (previous[currentQ.wordId]?.retryAttempts || 0) + 1,
      },
    }));

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
      setKokoBubble('Không sao, thử lại nhé! 😊');
    } else if (newCount === 2) {
      setKokoMood('thinking');
      setKokoBubble('Nghe kỹ nhé! 👂');
      if (chosenId) setDisabledIds((p) => new Set([...p, chosenId]));
      setTimeout(playPrompt, 300);
    } else if (newCount === 3) {
      setKokoMood('thinking');
      setKokoBubble('Nghe thêm nhé! 🎵');
      if (chosenId) setDisabledIds((p) => new Set([...p, chosenId]));
      setTimeout(playPrompt, 300);
    } else {
      setKokoMood('happy');
      setKokoBubble('Tìm thêm đi! 💡');
      setBounceCorrect(true);
      setTimeout(playPrompt, 300);
    }
  }, [currentQ, wrongCount, playPrompt, recordAttempt]);

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
    setKokoBubble('Đưa cho Koko nào! 🤲');
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

  // Session tracking: startedAt and sessionId
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());
  const [currentSession, setCurrentSession] = useState<Stage2PracticeSession | null>(null);

  // Get previous session for comparison (if any)
  const previousSession = useMemo<Stage2PracticeSession | null>(() => {
    const list = vocabStatsService.getStage2Sessions(childId, lessonId);
    if (!list || list.length === 0) return null;
    // If we just finished a session, previous is list[1], else list[0]
    if (currentSession && list.length > 1 && list[0].sessionId === currentSession.sessionId) {
      return list[1];
    }
    return list[0] || null;
  }, [childId, lessonId, currentSession]);

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
        isConfident: stats.firstTryCorrect > 0 && stats.retryAttempts === 0
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
      words
    };
  }, [vocabulary, sessionWordStats, lessonId, sessionStartTime, childId, totalQ, totalWrongAttempts]);

  useEffect(() => {
    if (!isCompleted) return;
    const session = buildCurrentSession();
    setCurrentSession(session);
    vocabStatsService.saveStage2Session(session);
  }, [isCompleted, buildCurrentSession]);

  const startPracticeAgain = () => {
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
    setSessionStartTime(Date.now());
    setCurrentSession(null);
    setIsCompleted(false);
  };

  const handleFinish = () => {
    if (!currentSession) {
      const session = buildCurrentSession();
      vocabStatsService.saveStage2Session(session);
    }
    onComplete({ score: 100, stars: 3 });
  };

  // ── Completion screen ──────────────────────────────────────────────────────

  if (isCompleted || showSavedSummary) {
    // If showing saved summary, load latest saved session or fallback
    const latestSavedList = vocabStatsService.getStage2Sessions(childId, lessonId);
    const activeSession: Stage2PracticeSession | null =
      currentSession || (latestSavedList.length > 0 ? latestSavedList[0] : null);

    const wordsToDisplay = activeSession?.words || vocabulary.map((word) => {
      const id = word._id || (word as any).id || word.english;
      return {
        wordId: id,
        english: word.english,
        vietnamese: word.vietnamese || '',
        imageUrl: word.imageUrl,
        emoji: getWordEmoji(word),
        firstTryCorrect: 0,
        wrongCount: 0,
        isConfident: true
      };
    });

    // Comparison with previous completed session
    let comparisonText: string | null = null;
    if (previousSession && activeSession && previousSession.sessionId !== activeSession.sessionId) {
      const prevFirstTry = previousSession.firstTryCorrectTotal;
      const curFirstTry = activeSession.firstTryCorrectTotal;
      if (curFirstTry > prevFirstTry) {
        comparisonText = `Tiến bộ vượt trội! Lần trước bé đúng ngay ${prevFirstTry} từ, lần này đạt ${curFirstTry} từ! 🌟`;
      } else if (curFirstTry === prevFirstTry) {
        comparisonText = `Bé duy trì phong độ rất tốt! Giữ vững sự chăm chỉ nhé! 👏`;
      } else {
        comparisonText = `Bé đã rất nỗ lực luyện tập! Cùng ôn lại để nhớ lâu hơn nhé! 💖`;
      }
    }

    return (
      <div className="w-full h-full min-h-0 flex flex-col bg-gradient-to-b from-amber-50 via-sky-50 to-indigo-50 text-slate-800 select-none overflow-hidden p-2 sm:p-4">
        {/* Top Celebration Header with Koko Mascot */}
        <div className="shrink-0 flex flex-col items-center justify-center text-center gap-1.5 pt-1">
          <KokoMascot
            state="celebrating"
            size="md"
            speechBubble="Bé làm tốt lắm! 🎉"
            bubblePosition="top"
            interactive={true}
          />
          <h2 className="text-xl sm:text-2xl font-black text-indigo-950 leading-tight">
            Hoàn thành buổi Luyện tập!
          </h2>
          <p className="text-sm sm:text-base font-bold text-slate-600 max-w-md">
            Bé vừa hoàn thành các câu hỏi luyện tập cho <span className="text-indigo-700 font-black">{wordsToDisplay.length}</span> từ vựng của bài học!
          </p>

          {/* Gentle comparison note if previous session exists */}
          {comparisonText && (
            <div className="mt-1 px-4 py-1.5 rounded-2xl bg-indigo-100/80 border border-indigo-200 text-indigo-900 text-xs sm:text-sm font-black shadow-2xs animate-fade-in">
              {comparisonText}
            </div>
          )}
        </div>

        {/* Word Grid: Fits cleanly without small scroll area */}
        <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto flex items-center justify-center p-2">
          <div
            className={`w-full max-h-full grid gap-2.5 sm:gap-3.5 overflow-y-auto p-1 ${
              wordsToDisplay.length <= 2
                ? 'grid-cols-1 sm:grid-cols-2 max-w-md'
                : wordsToDisplay.length <= 4
                ? 'grid-cols-2 max-w-lg'
                : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
            }`}
          >
            {wordsToDisplay.map((w) => {
              const needsReview = w.wrongCount > 0;
              return (
                <div
                  key={w.wordId}
                  className={`flex flex-col items-center text-center rounded-2xl p-2.5 sm:p-3 border-3 shadow-sm transition-all duration-200 bg-white/95 ${
                    needsReview
                      ? 'border-amber-300 hover:border-amber-400'
                      : 'border-emerald-300 hover:border-emerald-400'
                  }`}
                >
                  {/* Word Image or Emoji */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-50 flex items-center justify-center p-1.5 mb-1.5 border border-slate-100 shadow-inner">
                    {w.imageUrl ? (
                      <img
                        src={w.imageUrl}
                        alt={w.english}
                        className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                      />
                    ) : (
                      <span className="text-3xl select-none">{w.emoji || '🌟'}</span>
                    )}
                  </div>

                  {/* Word English Name */}
                  <p className="font-black text-slate-800 text-base sm:text-lg capitalize leading-tight truncate w-full">
                    {w.english}
                  </p>

                  {/* Gentle review hint tag for 1-star / needs review words */}
                  <div className="mt-1.5">
                    {needsReview ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs border border-amber-300">
                        Luyện thêm
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs border border-emerald-300">
                        Rất giỏi! ✨
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions: Làm lại Chặng 2 & Sang Chặng 3 */}
        <div className="shrink-0 w-full max-w-md mx-auto flex items-center justify-center gap-3 pt-2 pb-1">
          <button
            type="button"
            onClick={startPracticeAgain}
            aria-label="Làm lại Chặng 2"
            className="flex-1 min-h-13 sm:min-h-14 rounded-2xl bg-white hover:bg-amber-50 active:bg-amber-100 text-slate-700 border-3 border-amber-300 font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <span aria-hidden>🔄</span>
            <span>Làm lại Chặng 2</span>
          </button>

          <button
            type="button"
            onClick={handleFinish}
            aria-label="Sang Chặng 3 Vui chơi"
            className="flex-1 min-h-13 sm:min-h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer ring-3 ring-emerald-300/60 animate-soft-bounce"
          >
            <span>Sang Chặng 3</span>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
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
          aria-label="Thoát, lưu tiến độ"
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer active:scale-90 transition-all"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex items-center gap-2 flex-1 mx-3 max-w-xs">
          <span className="text-base select-none">⭐</span>
          <div className="flex-1 h-3.5 bg-white/15 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(6, progressRatio)}%` }}
            />
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-bold text-amber-300 shrink-0">
            {currentQ.turn === 'bonus' ? 'Ôn tập' : `Vòng ${currentQ.turn}/3`}
          </span>
        </div>

        <button
          type="button"
          onClick={onParentOpen}
          aria-label="Thông tin phụ huynh"
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
            aria-label="Nghe lại"
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
                  aria-label="Đúng"
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
                  aria-label="Không"
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
