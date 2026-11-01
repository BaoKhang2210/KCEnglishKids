import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
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
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      scheduleTimeout(onCorrect, 400);
      return;
    }
    setWobbleId(cart.id);
    scheduleTimeout(() => setWobbleId(null), 400);
    onWrong(cart.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col select-none">
      <GamePrompt
        text={
          <>
            Help Koko catch the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🚇
          </>
        }
      />
      <div className="flex-1 flex items-end justify-center pb-4 min-h-0">
        <KokoMascot state={isAssisted ? 'encouraging' : 'happy'} size="md" interactive={false} />
      </div>
      <div className="h-[40%] min-h-[140px] relative bg-gradient-to-t from-slate-900 to-indigo-950 border-t-4 border-amber-400/50 overflow-hidden flex flex-col justify-center">
        <div className="absolute inset-x-0 top-6 h-16 bg-slate-800/80 border-y border-slate-700/60" />
        <div className="absolute inset-0 flex items-center stage3-conveyor gap-8 px-8">
          {/* Nhân bản 2 lần danh sách xe cho hiệu ứng băng chuyền vô tận mượt mà, gán key duy nhất theo copy_0 và copy_1 */}
          {[0, 1].map((copyIndex) =>
            carts.map((cart) => {
              const uniqueKey = `copy_${copyIndex}_${cart.id}`;
              const glow = (attemptCount >= 2 || isAssisted) && cart.isTarget;
              return (
                <button
                  key={uniqueKey}
                  type="button"
                  onClick={() => handleTap(cart)}
                  aria-label={`Toa tàu chở hình ${cart.vocab.english}`}
                  className={`shrink-0 w-[clamp(90px,17vmin,136px)] h-[clamp(90px,17vmin,136px)] rounded-2xl bg-amber-200 border-4 border-amber-500 flex items-center justify-center shadow-xl cursor-pointer active:scale-95 transition-transform ${
                    glow ? 'ring-8 ring-amber-300 border-amber-300' : ''
                  } ${wobbleId === cart.id ? 'animate-gentle-wobble border-rose-500' : ''}`}
                >
                  <VocabImage vocab={cart.vocab} className="w-[78%] h-[78%] object-contain pointer-events-none" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TunnelRunnerGame;