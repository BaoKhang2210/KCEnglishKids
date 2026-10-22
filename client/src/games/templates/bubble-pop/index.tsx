import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { BUBBLE_POP_PARAMS } from './params';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface BubbleItem {
  id: string;
  vocab: Vocabulary;
  isTarget: boolean;
  leftPercent: number;
  delaySec: number;
  popped: boolean;
  wobbling: boolean;
}

export const BubblePopGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const params = BUBBLE_POP_PARAMS[config.ageGroup] || BUBBLE_POP_PARAMS['3-4'];
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
    const spacing = 100 / (options.length + 1);
    setBubbles(
      options.map((v, idx) => ({
        id: `${v._id}_${idx}`,
        vocab: v,
        isTarget: v._id === targetVocab._id,
        leftPercent: spacing * (idx + 1),
        delaySec: idx * 0.35,
        popped: false,
        wobbling: false,
      }))
    );
  }, [options, targetVocab._id]);

  const handleBubbleClick = (b: BubbleItem) => {
    if (b.popped || locked) return;

    if (b.isTarget) {
      sfx.playPop();
      setLocked(true);
      setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, popped: true } : item)));
      scheduleTimeout(onCorrect, 500);
      return;
    }

    setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: false } : item)));
    }, 500);
    onWrong(b.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <GamePrompt
        text={
          <>
            Pop the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🫧
          </>
        }
      />
      {bubbles.map((b) => {
        const glow = (attemptCount >= 2 || isAssisted) && b.isTarget;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => handleBubbleClick(b)}
            style={{
              left: `${b.leftPercent}%`,
              width: `clamp(96px, ${params.sizeVmin}vmin, 160px)`,
              height: `clamp(96px, ${params.sizeVmin}vmin, 160px)`,
              animationDuration: `${params.floatDurationSec}s`,
              animationDelay: `-${b.delaySec}s`,
              opacity: b.popped ? 0 : 1,
              transform: b.popped ? 'scale(1.4)' : undefined,
            }}
            className={`absolute rounded-full border-4 flex items-center justify-center p-2 cursor-pointer shadow-xl bg-gradient-to-br from-sky-400/40 via-indigo-500/25 to-purple-600/30 backdrop-blur-xs stage3-bubble-float ${
              b.wobbling ? 'animate-gentle-wobble border-amber-400' : 'border-sky-300/80'
            } ${glow ? 'ring-8 ring-amber-300 border-amber-300' : ''}`}
          >
            <VocabImage vocab={b.vocab} className="w-[78%] h-[78%]" />
            <div className="absolute top-2 left-3 w-4 h-2 rounded-full bg-white/70 rotate-[-30deg] pointer-events-none" />
          </button>
        );
      })}
    </div>
  );
};

export default BubblePopGame;
