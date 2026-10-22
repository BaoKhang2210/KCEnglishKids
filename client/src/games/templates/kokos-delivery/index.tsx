import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const KokosDeliveryGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [dragging, setDragging] = useState<Vocabulary | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [delivered, setDelivered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [wobble, setWobble] = useState(false);

  useEffect(() => {
    setLocked(false);
    setDelivered(false);
    setDragging(null);
  }, [targetVocab._id]);

  const dropOnBasket = () => {
    if (locked || !dragging) return;
    if (dragging._id === targetVocab._id) {
      setDelivered(true);
      setLocked(true);
      setDragging(null);
      scheduleTimeout(onCorrect, 500);
      return;
    }
    setWobble(true);
    scheduleTimeout(() => setWobble(false), 400);
    onWrong(dragging._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (dragging && hitDropId(e.clientX, e.clientY) === 'koko-basket') dropOnBasket();
      }}
    >
      <GamePrompt
        text={
          <>
            Deliver the <span className="text-amber-300 capitalize">{targetVocab.english}</span> to Koko! 🧺
          </>
        }
      />
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <KokoMascot
          state={delivered ? 'celebrating' : isAssisted ? 'encouraging' : 'happy'}
          size="lg"
          interactive={false}
        />
        <button
          type="button"
          data-drop-id="koko-basket"
          onClick={() => dragging && dropOnBasket()}
          className={`w-[min(46vmin,220px)] h-[min(22vmin,120px)] rounded-[40px] border-4 bg-amber-800/70 flex items-center justify-center ${
            attemptCount >= 2 || isAssisted ? 'ring-8 ring-amber-300 border-amber-300' : 'border-amber-200'
          } ${wobble ? 'animate-gentle-wobble' : ''}`}
        >
          {delivered ? (
            <VocabImage vocab={targetVocab} className="w-16 h-16" />
          ) : (
            <VocabImage vocab={targetVocab} silhouette className="w-16 h-16 opacity-70" />
          )}
        </button>
      </div>
      <div className="h-[26%] flex items-center justify-center gap-3 px-3">
        {options.map((vocab) => (
          <button
            key={vocab._id}
            type="button"
            onPointerDown={(e) => {
              setDragging(vocab);
              setPos({ x: e.clientX, y: e.clientY });
            }}
            onClick={() => setDragging(vocab)}
            className="min-w-[72px] min-h-[72px] w-[clamp(72px,14vmin,110px)] h-[clamp(72px,14vmin,110px)] rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center cursor-grab"
          >
            <VocabImage vocab={vocab} className="w-[80%] h-[80%]" />
          </button>
        ))}
      </div>
      {dragging && (
        <div
          className="pointer-events-none fixed z-[10000] w-20 h-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <VocabImage vocab={dragging} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default KokosDeliveryGame;
