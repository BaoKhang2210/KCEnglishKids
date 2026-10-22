import React, { useEffect, useMemo, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface Balloon {
  id: string;
  vocab: Vocabulary;
  isTarget: boolean;
  leftPercent: number;
  popped: boolean;
  wobbling: boolean;
}

export const BalloonFloatGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const remaining = balloons.filter((b) => b.isTarget && !b.popped).length;

  const deck = useMemo(() => {
    const extras = options.filter((v) => v._id === targetVocab._id);
    const others = options.filter((v) => v._id !== targetVocab._id);
    return [...extras, targetVocab, ...others].slice(0, Math.max(3, options.length + 1));
  }, [options, targetVocab]);

  useEffect(() => {
    const spacing = 100 / (deck.length + 1);
    setBalloons(
      deck.map((v, idx) => ({
        id: `${v._id}_${idx}`,
        vocab: v,
        isTarget: v._id === targetVocab._id,
        leftPercent: spacing * (idx + 1),
        popped: false,
        wobbling: false,
      }))
    );
  }, [deck, targetVocab._id]);

  const handleClick = (b: Balloon) => {
    if (b.popped) return;
    if (b.isTarget) {
      sfx.playPop();
      const next = balloons.map((item) => (item.id === b.id ? { ...item, popped: true } : item));
      setBalloons(next);
      if (next.filter((item) => item.isTarget && !item.popped).length === 0) {
        scheduleTimeout(onCorrect, 450);
      }
      return;
    }
    setBalloons((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setBalloons((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: false } : item)));
    }, 450);
    onWrong(b.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <GamePrompt
        text={
          <>
            Find all <span className="text-pink-300 capitalize">{targetVocab.english}</span> balloons! 🎈
          </>
        }
      />
      {balloons.map((b, idx) => {
        const glow = (attemptCount >= 2 || isAssisted) && b.isTarget && !b.popped;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => handleClick(b)}
            style={{
              left: `${b.leftPercent}%`,
              animationDuration: `${9 + idx}s`,
              animationDelay: `-${idx * 0.8}s`,
              opacity: b.popped ? 0 : 1,
            }}
            className={`absolute w-[clamp(88px,18vmin,140px)] h-[clamp(110px,22vmin,170px)] flex flex-col items-center cursor-pointer stage3-balloon-rise ${
              b.wobbling ? 'animate-gentle-wobble' : ''
            }`}
          >
            <div
              className={`w-full aspect-square rounded-full border-4 bg-gradient-to-br from-rose-400/70 to-fuchsia-600/50 flex items-center justify-center shadow-lg ${
                glow ? 'ring-8 ring-amber-300 border-amber-300' : 'border-white/40'
              }`}
            >
              <VocabImage vocab={b.vocab} className="w-[70%] h-[70%]" />
            </div>
            <div className="w-0.5 h-10 bg-white/50" />
          </button>
        );
      })}
      <p className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-black text-white/80">
        {remaining} left
      </p>
    </div>
  );
};

export default BalloonFloatGame;
