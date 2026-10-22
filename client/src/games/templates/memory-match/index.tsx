import React, { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';

interface Card {
  id: string;
  vocab: Vocabulary;
  face: 'image' | 'word';
  flipped: boolean;
  matched: boolean;
}

export const MemoryMatchGame: React.FC<GameComponentProps> = ({
  config, targetVocab, options, attemptCount, isAssisted, onCorrect, onWrong,
}) => {
  const pairCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;
  const [cards, setCards] = useState<Card[]>([]);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(true);
  const handledTargetRef = useRef<string | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timerRef.current);
    const vocabSet = [targetVocab, ...options.filter(v => v._id !== targetVocab._id)]
      .filter((v, index, all) => all.findIndex(other => other._id === v._id) === index)
      .slice(0, pairCount);
    const nextCards: Card[] = vocabSet.flatMap(v => {
      const youngChild = config.ageGroup === '3-4';
      return [
        { id: `${v._id}_a`, vocab: v, face: 'image' as const, flipped: true, matched: false },
        { id: `${v._id}_b`, vocab: v, face: youngChild ? 'image' as const : 'word' as const, flipped: true, matched: false },
      ];
    });
    setCards(shuffleArray(nextCards));
    setOpenIds([]);
    setBusy(true);
    handledTargetRef.current = null;
    timerRef.current = window.setTimeout(() => {
      setCards(current => current.map(card => ({ ...card, flipped: false })));
      setBusy(false);
    }, 2000);
    return () => window.clearTimeout(timerRef.current);
  }, [targetVocab._id, options, pairCount, config.ageGroup]);

  useEffect(() => {
    if (!isAssisted || handledTargetRef.current === targetVocab._id) return;
    handledTargetRef.current = targetVocab._id;
    setCards(current => current.map(card => card.vocab._id === targetVocab._id
      ? { ...card, flipped: true, matched: true }
      : card));
    timerRef.current = window.setTimeout(onCorrect, 700);
    return () => window.clearTimeout(timerRef.current);
  }, [isAssisted, targetVocab._id, onCorrect]);

  const handleFlip = (card: Card) => {
    if (busy || card.flipped || card.matched || openIds.length >= 2) return;
    sfx.playPop();
    const nextOpen = [...openIds, card.id];
    setCards(current => current.map(item => item.id === card.id ? { ...item, flipped: true } : item));
    setOpenIds(nextOpen);
    if (nextOpen.length < 2) return;

    setBusy(true);
    const [firstId, secondId] = nextOpen;
    const first = cards.find(item => item.id === firstId);
    const second = cards.find(item => item.id === secondId);
    const matched = !!first && !!second && first.vocab._id === second.vocab._id && first.id !== second.id;
    timerRef.current = window.setTimeout(() => {
      if (matched && first && second) {
        setCards(current => current.map(item => item.vocab._id === first.vocab._id
          ? { ...item, matched: true, flipped: true }
          : item));
        if (first.vocab._id === targetVocab._id && handledTargetRef.current !== targetVocab._id) {
          handledTargetRef.current = targetVocab._id;
          onCorrect();
        }
      } else {
        setCards(current => current.map(item => nextOpen.includes(item.id) ? { ...item, flipped: false } : item));
        onWrong();
      }
      setOpenIds([]);
      setBusy(false);
    }, matched ? 700 : 1200);
  };

  return (
    <div className="w-full h-full relative flex flex-col">
      <GamePrompt text={<>Match the <span className="text-amber-300 capitalize">{targetVocab.english}</span> pair! 🃏</>} />
      <div
        className="flex-1 min-h-0 grid gap-3 place-content-center p-3 mx-auto w-full max-w-4xl"
        style={{ gridTemplateColumns: `repeat(${pairCount}, minmax(72px, clamp(72px, 18vmin, 156px)))` }}
      >
        {cards.map(card => {
          const show = card.flipped || card.matched;
          const glow = (attemptCount >= 2 || isAssisted) && card.vocab._id === targetVocab._id;
          return (
            <button
              key={card.id}
              type="button"
              disabled={busy || card.matched}
              onClick={() => handleFlip(card)}
              className={`aspect-[3/4] min-h-[72px] rounded-2xl border-4 shadow-lg transition-transform ${show ? 'bg-white/90 border-emerald-300' : 'bg-indigo-800 border-indigo-300'} ${glow ? 'ring-4 ring-amber-300' : ''}`}
            >
              {show ? card.face === 'image'
                ? <VocabImage vocab={card.vocab} className="mx-auto h-[80%] w-[80%]" />
                : <span className="text-slate-900 font-black capitalize text-sm sm:text-base">{card.vocab.english}</span>
                : <span className="text-3xl" aria-hidden>❓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MemoryMatchGame;
