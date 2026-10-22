import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { GamePrompt } from '../../shared/GamePrompt';
import { shuffleArray } from '../../core/targetSelector';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface Piece {
  id: number;
  placed: boolean;
}

export const PictureBuilderGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const pieceCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;
  const cols = pieceCount === 3 ? 3 : 2;
  const [order, setOrder] = useState<number[]>([]);
  const [slots, setSlots] = useState<(number | null)[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);
  const assistedTargetRef = useRef<string | null>(null);
  const assistTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const ids = Array.from({ length: pieceCount }, (_, i) => i);
    setOrder(shuffleArray(ids));
    setSlots(Array(pieceCount).fill(null));
    setDragging(null);
    assistedTargetRef.current = null;
    window.clearTimeout(assistTimerRef.current);
  }, [targetVocab._id, pieceCount]);

  useEffect(() => {
    if (!isAssisted || assistedTargetRef.current === targetVocab._id) return;
    assistedTargetRef.current = targetVocab._id;
    const ids = Array.from({ length: pieceCount }, (_, i) => i);
    setSlots(ids);
    assistTimerRef.current = window.setTimeout(onCorrect, 600);
    return () => window.clearTimeout(assistTimerRef.current);
  }, [isAssisted, pieceCount, onCorrect, targetVocab._id]);

  const positions = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pieceCount === 2 ? (i === 0 ? 0 : 100) : pieceCount === 3 ? i * 50 : col * 100;
        const y = pieceCount === 4 ? row * 100 : 0;
        return { x, y };
      }),
    [pieceCount, cols]
  );

  const place = (slotIndex: number) => {
    if (dragging === null || slots[slotIndex] !== null) return;
    if (dragging === slotIndex) {
      const next = [...slots];
      next[slotIndex] = dragging;
      setSlots(next);
      setOrder((prev) => prev.filter((id) => id !== dragging));
      setDragging(null);
      if (next.every((v) => v !== null)) {
        scheduleTimeout(onCorrect, 400);
      }
      return;
    }
    onWrong();
    setDragging(null);
  };

  const imageUrl = targetVocab.imageUrl;

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center gap-4">
      <GamePrompt
        text={
          <>
            Put the <span className="text-amber-300 capitalize">{targetVocab.english}</span> puzzle together! 🧩
          </>
        }
      />
      <div
        className={`grid gap-1 w-[min(70vmin,320px)] h-[min(70vmin,320px)] bg-white/10 border-4 rounded-2xl overflow-hidden ${
          attemptCount >= 2 ? 'ring-8 ring-amber-300' : 'border-white/20'
        }`}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {slots.map((value, idx) => (
          <button
            key={idx}
            type="button"
            onPointerUp={() => place(idx)}
            className="relative min-h-[72px] bg-slate-900/40 border border-white/10"
          >
            {value !== null && imageUrl && (
              <div
                className="absolute inset-0 bg-contain bg-no-repeat"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: pieceCount === 3 ? '300% 100%' : pieceCount === 2 ? '200% 100%' : '200% 200%',
                  backgroundPosition: `${positions[value].x}% ${positions[value].y}%`,
                }}
              />
            )}
          </button>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap justify-center">
        {order.map((id) => (
          <button
            key={id}
            type="button"
            onPointerDown={() => setDragging(id)}
            className={`w-[clamp(72px,16vmin,110px)] h-[clamp(96px,26vmin,220px)] rounded-xl border-2 border-white/30 overflow-hidden cursor-grab ${
              dragging === id ? 'ring-4 ring-amber-300' : ''
            }`}
          >
            {imageUrl && (
              <div
                className="w-full h-full bg-no-repeat"
                style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: pieceCount === 3 ? '300% 100%' : pieceCount === 2 ? '200% 100%' : '200% 200%',
                  backgroundPosition: `${positions[id].x}% ${positions[id].y}%`,
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PictureBuilderGame;
