import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface Cart {
  id: string;
  vocab: Vocabulary;
  isTarget: boolean;
}

export const TunnelRunnerGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [locked, setLocked] = useState(false);
  const [wobbleId, setWobbleId] = useState<string | null>(null);

  useEffect(() => {
    setLocked(false);
    setCarts(
      options.map((v, idx) => ({
        id: `${v._id}_${idx}`,
        vocab: v,
        isTarget: v._id === targetVocab._id,
      }))
    );
  }, [options, targetVocab._id]);

  const handleTap = (cart: Cart) => {
    if (locked) return;
    if (cart.isTarget) {
      sfx.playPop();
      setLocked(true);
      scheduleTimeout(onCorrect, 400);
      return;
    }
    setWobbleId(cart.id);
    scheduleTimeout(() => setWobbleId(null), 400);
    onWrong(cart.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      <GamePrompt
        text={
          <>
            Help Koko catch the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🚇
          </>
        }
      />
      <div className="flex-1 flex items-end justify-center pb-6">
        <KokoMascot state={isAssisted ? 'encouraging' : 'happy'} size="md" interactive={false} />
      </div>
      <div className="h-[38%] relative bg-gradient-to-t from-slate-900 to-indigo-950 border-t-4 border-amber-400/40 overflow-hidden">
        <div className="absolute inset-x-0 top-6 h-16 bg-slate-800/80" />
        <div className="absolute inset-0 flex items-center stage3-conveyor gap-8 px-8">
          {[...carts, ...carts].map((cart, idx) => {
            const glow = (attemptCount >= 2 || isAssisted) && cart.isTarget;
            return (
              <button
                key={`${cart.id}_${idx}`}
                type="button"
                onClick={() => handleTap(cart)}
                className={`shrink-0 w-[clamp(88px,16vmin,132px)] h-[clamp(88px,16vmin,132px)] rounded-2xl bg-amber-200 border-4 border-amber-500 flex items-center justify-center shadow-lg cursor-pointer ${
                  glow ? 'ring-8 ring-amber-300' : ''
                } ${wobbleId === cart.id ? 'animate-gentle-wobble' : ''}`}
              >
                <VocabImage vocab={cart.vocab} className="w-[78%] h-[78%]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TunnelRunnerGame;
