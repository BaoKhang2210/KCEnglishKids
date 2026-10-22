import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const PrizeWheelGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [spinning, setSpinning] = useState(true);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const slices = options.slice(0, 4);

  useEffect(() => {
    setLocked(false);
    setSpinning(true);
    const t = scheduleTimeout(() => setSpinning(false), 1400);
    return () => window.clearTimeout(t);
  }, [targetVocab._id]);

  const handlePick = (vocab: Vocabulary) => {
    if (spinning || locked) return;
    if (vocab._id === targetVocab._id) {
      sfx.playPop();
      setLocked(true);
      scheduleTimeout(onCorrect, 400);
      return;
    }
    setWobbleId(vocab._id);
    scheduleTimeout(() => setWobbleId(null), 400);
    onWrong(vocab._id);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center gap-4">
      <GamePrompt
        text={
          <>
            Spin and pick the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🎡
          </>
        }
      />
      <div
        className={`relative w-[min(72vmin,340px)] h-[min(72vmin,340px)] rounded-full border-8 border-amber-300 bg-indigo-950 shadow-2xl grid grid-cols-2 grid-rows-2 overflow-hidden ${
          spinning ? 'stage3-wheel-spin' : ''
        }`}
      >
        {slices.map((vocab, idx) => {
          const glow = !spinning && (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          const bg = ['bg-rose-500/40', 'bg-sky-500/40', 'bg-emerald-500/40', 'bg-violet-500/40'][idx];
          return (
            <button
              key={vocab._id}
              type="button"
              disabled={spinning}
              onClick={() => handlePick(vocab)}
              className={`flex items-center justify-center p-3 cursor-pointer ${bg} ${
                glow ? 'ring-8 ring-amber-300 z-10' : ''
              } ${wobbleId === vocab._id ? 'animate-gentle-wobble' : ''}`}
            >
              <VocabImage vocab={vocab} className="w-[80%] h-[80%]" />
            </button>
          );
        })}
      </div>
      <p className="text-xs font-black text-indigo-200">{spinning ? 'Spinning...' : 'Tap the matching picture!'}</p>
    </div>
  );
};

export default PrizeWheelGame;
