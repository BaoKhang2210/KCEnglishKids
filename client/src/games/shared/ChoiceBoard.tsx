import React, { useRef } from 'react';
import type { Vocabulary } from '../../types';
import { VocabImage } from './VocabImage';
import { useFitGrid } from './useFitGrid';

interface ChoiceBoardProps {
  options: Vocabulary[];
  targetId: string;
  attemptCount: number;
  isAssisted: boolean;
  wobbleId?: string | null;
  onChoose: (vocab: Vocabulary) => void;
  shape?: 'round' | 'tile';
  accent?: string;
}

export const ChoiceBoard: React.FC<ChoiceBoardProps> = ({
  options,
  targetId,
  attemptCount,
  isAssisted,
  wobbleId,
  onChoose,
  shape = 'tile',
  accent = 'border-white/30',
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const { cols, cellSize } = useFitGrid(ref, options.length);

  return (
    <div ref={ref} className="w-full h-full min-h-0 flex items-center justify-center p-2">
      <div
        className="grid gap-3 place-items-center"
        style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
      >
        {options.map((vocab) => {
          const isTarget = vocab._id === targetId;
          const glow = (attemptCount >= 2 && isTarget) || (isAssisted && isTarget);
          const round = shape === 'round';
          return (
            <button
              key={vocab._id}
              type="button"
              onClick={() => onChoose(vocab)}
              style={{ width: cellSize, height: cellSize, minWidth: 72, minHeight: 72 }}
              className={`relative flex items-center justify-center p-2 cursor-pointer active:scale-95 transition-all shadow-xl border-4 bg-white/15 backdrop-blur-sm ${
                round ? 'rounded-full' : 'rounded-3xl'
              } ${accent} ${glow ? 'ring-8 ring-amber-300 scale-105 border-amber-300' : ''} ${
                wobbleId === vocab._id ? 'animate-gentle-wobble' : ''
              }`}
            >
              <VocabImage vocab={vocab} className="w-[80%] h-[80%]" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
