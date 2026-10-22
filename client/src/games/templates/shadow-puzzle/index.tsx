import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

export const ShadowPuzzleGame: React.FC<GameComponentProps> = ({
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
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(false);
    setDragging(null);
  }, [targetVocab._id]);

  const dropOn = (shadow: Vocabulary) => {
    if (locked || !dragging) return;
    if (dragging._id === targetVocab._id && shadow._id === targetVocab._id) {
      setLocked(true);
      setDragging(null);
      onCorrect();
      return;
    }
    setWobbleId(shadow._id);
    scheduleTimeout(() => setWobbleId(null), 400);
    onWrong(dragging._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (!dragging) return;
        const dropId = hitDropId(e.clientX, e.clientY);
        const shadow = options.find((v) => v._id === dropId);
        if (shadow) dropOn(shadow);
      }}
    >
      <GamePrompt
        text={
          <>
            Match <span className="text-amber-300 capitalize">{targetVocab.english}</span> with the shadow! 👤
          </>
        }
      />
      <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 place-content-center p-4">
        {options.map((vocab) => {
          const glow = (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
          return (
            <button
              key={`shadow_${vocab._id}`}
              type="button"
              data-drop-id={vocab._id}
              onClick={() => dragging && dropOn(vocab)}
              className={`min-h-[96px] rounded-3xl bg-white/10 border-4 border-dashed border-white/30 flex items-center justify-center ${
                glow ? 'ring-8 ring-amber-300' : ''
              } ${wobbleId === vocab._id ? 'animate-gentle-wobble' : ''}`}
            >
              <VocabImage vocab={vocab} silhouette className="w-[70%] h-[70%]" />
            </button>
          );
        })}
      </div>
      <div className="h-[28%] flex items-center justify-center gap-3 px-3">
        {options.map((vocab) => (
          <button
            key={`piece_${vocab._id}`}
            type="button"
            onPointerDown={(e) => {
              setDragging(vocab);
              setPos({ x: e.clientX, y: e.clientY });
            }}
            onClick={() => setDragging(vocab)}
            className="min-w-[72px] min-h-[72px] w-[clamp(72px,14vmin,110px)] h-[clamp(72px,14vmin,110px)] rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center cursor-grab"
          >
            <VocabImage vocab={vocab} className="w-[80%] h-[80%]" />
          </button>
        ))}
      </div>
      {dragging && (
        <div
          className="pointer-events-none fixed z-[10000] w-24 h-24 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <VocabImage vocab={dragging} className="w-full h-full" />
        </div>
      )}
    </div>
  );
};

export default ShadowPuzzleGame;
