import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';

interface Card {
  id: string;
  wordId: string;
  vocab: Vocabulary;
  face: 'image' | 'word';
}

export const MemoryMatchGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const pairCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;

  const selectedVocabList = useMemo(() => {
    const others = (options || []).filter((v) => v._id !== targetVocab._id);
    const shuffledOthers = shuffleArray(others);
    return [targetVocab, ...shuffledOthers].slice(0, pairCount);
  }, [targetVocab, options, pairCount]);

  const cards = useMemo<Card[]>(() => {
    const nextCards: Card[] = selectedVocabList.flatMap((v) => {
      const youngChild = config.ageGroup === '3-4';
      return [
        { id: `${v._id}_a`, wordId: v._id, vocab: v, face: 'image' as const },
        { id: `${v._id}_b`, wordId: v._id, vocab: v, face: youngChild ? ('image' as const) : ('word' as const) },
      ];
    });
    return shuffleArray(nextCards);
  }, [selectedVocabList, config.ageGroup]);

  const [openIds, setOpenIds] = useState<string[]>([]);
  const [matchedWordIds, setMatchedWordIds] = useState<string[]>([]);
  const [flips, setFlips] = useState(0);
  const [busy, setBusy] = useState(true);
  const handledTargetRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setOpenIds(cards.map((c) => c.id));
    setMatchedWordIds([]);
    setFlips(0);
    setBusy(true);
    handledTargetRef.current = null;

    timerRef.current = window.setTimeout(() => {
      setOpenIds([]);
      setBusy(false);
    }, 1600);

    return () => {
      window.clearTimeout(timerRef.current);
      stopWordAudio();
    };
  }, [cards]);

  useEffect(() => {
    if (!isAssisted || handledTargetRef.current === targetVocab._id) return;
    handledTargetRef.current = targetVocab._id;
    setMatchedWordIds((prev) => (prev.includes(targetVocab._id) ? prev : [...prev, targetVocab._id]));
    timerRef.current = window.setTimeout(onCorrect, 600);
    return () => window.clearTimeout(timerRef.current);
  }, [isAssisted, targetVocab._id, onCorrect]);

  const handleFlip = (card: Card) => {
    const isAlreadyFlipped = openIds.includes(card.id);
    const isAlreadyMatched = matchedWordIds.includes(card.wordId);
    if (busy || isAlreadyFlipped || isAlreadyMatched || openIds.length >= 2) return;

    sfx.playPop();
    // Đọc từ ngay khi lật thẻ như kidscards.vercel.app
    stopWordAudio();
    void playWordAudio(card.vocab.english, card.vocab.audioUrl);

    const nextOpen = [...openIds, card.id];
    setOpenIds(nextOpen);

    if (nextOpen.length < 2) return;

    setFlips((f) => f + 1);
    setBusy(true);
    const [firstId, secondId] = nextOpen;
    const first = cards.find((item) => item.id === firstId);
    const second = cards.find((item) => item.id === secondId);
    const matched = !!first && !!second && first.wordId === second.wordId && first.id !== second.id;

    timerRef.current = window.setTimeout(() => {
      if (matched && first) {
        sfx.playSuccess();
        const nextMatched = [...matchedWordIds, first.wordId];
        setMatchedWordIds(nextMatched);
        setOpenIds([]);
        setBusy(false);

        if (
          (first.wordId === targetVocab._id || nextMatched.length >= selectedVocabList.length) &&
          handledTargetRef.current !== targetVocab._id
        ) {
          handledTargetRef.current = targetVocab._id;
          onCorrect();
        }
      } else {
        setOpenIds([]);
        setBusy(false);
        onWrong(second?.wordId);
      }
    }, matched ? 550 : 950);
  };

  return (
    <div className="w-full h-full relative flex flex-col select-none pt-8">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Match the <span className="text-amber-300 capitalize">{targetVocab.english}</span> pair! 🃏
          </>
        }
        subtext={`Đã lật ${flips} lượt · Tìm cặp "${targetVocab.vietnamese || targetVocab.english}"`}
      />
      <div
        className="flex-1 min-h-0 grid gap-3.5 place-content-center p-3 mx-auto w-full max-w-4xl"
        style={{
          gridTemplateColumns: `repeat(${pairCount}, minmax(76px, clamp(86px, 18vmin, 160px)))`,
        }}
      >
        {cards.map((card) => {
          const isFlipped = openIds.includes(card.id);
          const isMatched = matchedWordIds.includes(card.wordId);
          const show = isFlipped || isMatched;
          const glow = (attemptCount >= 2 || isAssisted) && card.wordId === targetVocab._id;

          return (
            <button
              key={card.id}
              type="button"
              disabled={busy || isMatched}
              onClick={() => handleFlip(card)}
              aria-label={
                show
                  ? `Thẻ hình ${card.vocab.english}${isMatched ? ' đã ghép đúng' : ''}`
                  : 'Thẻ bài úp'
              }
              className={`aspect-[3/4] min-h-[76px] rounded-3xl border-4 shadow-xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center p-2.5 ${
                show
                  ? isMatched
                    ? 'bg-gradient-to-b from-emerald-400/90 to-teal-600/90 border-emerald-200 ring-4 ring-emerald-300 scale-105'
                    : 'bg-white/95 border-amber-300 shadow-amber-300/20'
                  : 'bg-gradient-to-br from-indigo-700 via-purple-800 to-slate-900 border-indigo-300/70 hover:border-amber-300 active:scale-95'
              } ${glow ? 'ring-6 ring-amber-300 border-amber-300' : ''}`}
            >
              {show ? (
                card.face === 'image' ? (
                  <>
                    <VocabImage vocab={card.vocab} className="w-[76%] h-[76%] object-contain" />
                    <span className="mt-0.5 text-[11px] font-black text-slate-800 capitalize truncate max-w-full">
                      {card.vocab.english}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-900 font-black capitalize text-base sm:text-xl text-center break-words px-1">
                    {card.vocab.english}
                  </span>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-1">
                  <span className="text-3xl sm:text-4xl text-amber-300 font-black drop-shadow" aria-hidden>
                    ★
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryMatchGame;
