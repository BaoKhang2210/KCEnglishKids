import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

/**
 * Shadow Puzzle chuẩn kidscards.vercel.app:
 * Hỗ trợ KÉP:
 * 1) Chạm chọn hình ở khay dưới (Tap a friend) -> Chạm bóng đen tương ứng ở hàng trên (Tap its shadow)
 * 2) Kéo thả trực tiếp hình lên bóng đen (Drag & Drop)
 */
export const ShadowPuzzleGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [selected, setSelected] = useState<Vocabulary | null>(null);
  const [dragging, setDragging] = useState<Vocabulary | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [filledId, setFilledId] = useState<string | null>(null);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const activeItem = dragging || selected;

  useEffect(() => {
    setLocked(false);
    setSelected(null);
    setDragging(null);
    setFilledId(null);
    setWobbleId(null);
  }, [targetVocab._id]);

  const attemptMatch = (friend: Vocabulary, shadow: Vocabulary) => {
    if (locked) return;
    if (friend._id === targetVocab._id && shadow._id === targetVocab._id) {
      sfx.playSuccess();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      setFilledId(shadow._id);
      setSelected(null);
      setDragging(null);
      scheduleTimeout(onCorrect, 520);
      return;
    }

    setWobbleId(shadow._id);
    scheduleTimeout(() => setWobbleId(null), 450);
    onWrong(friend._id !== targetVocab._id ? friend._id : shadow._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col justify-between pt-10 pb-2 select-none"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (!dragging) return;
        const dropId = hitDropId(e.clientX, e.clientY);
        const shadow = options.find((v) => v._id === dropId);
        if (shadow) {
          attemptMatch(dragging, shadow);
        } else {
          setDragging(null);
        }
      }}
    >
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Match <span className="text-amber-300 capitalize">{targetVocab.english}</span> with its shadow! 👤
          </>
        }
        subtext={
          activeItem
            ? `Bây giờ chạm vào chiếc bóng của "${activeItem.english}" ở hàng trên!`
            : `Chạm chọn "${targetVocab.vietnamese || targetVocab.english}" ở dưới rồi ghép vào bóng đen!`
        }
      />

      {/* Hàng bóng đen phía trên (shadow-row) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-3">
        <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          {options.map((vocab) => {
            const isFilled = filledId === vocab._id;
            const glow = (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
            const isTargetable = Boolean(activeItem) && !isFilled;

            return (
              <button
                key={`shadow_${vocab._id}`}
                type="button"
                data-drop-id={vocab._id}
                aria-label={`Bóng của ${vocab.english}`}
                onClick={() => activeItem && attemptMatch(activeItem, vocab)}
                className={`w-[clamp(108px,21vmin,162px)] h-[clamp(108px,21vmin,162px)] rounded-3xl border-4 flex flex-col items-center justify-center p-3 transition-all cursor-pointer ${
                  isFilled
                    ? 'bg-emerald-400/25 border-emerald-300 scale-105 ring-4 ring-emerald-300'
                    : isTargetable
                      ? 'bg-slate-900/55 border-dashed border-amber-300/85 hover:scale-105'
                      : 'bg-slate-950/50 border-dashed border-white/30'
                } ${wobbleId === vocab._id ? 'animate-gentle-wobble border-rose-400' : ''} ${
                  glow ? 'ring-8 ring-amber-300 border-amber-300' : ''
                }`}
              >
                <VocabImage
                  vocab={vocab}
                  silhouette={!isFilled}
                  className="w-[78%] h-[78%] object-contain transition-all duration-300"
                />
                {isFilled && (
                  <span className="mt-1 text-xs font-black text-emerald-200 capitalize">{vocab.english}</span>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs font-black text-indigo-200/90 tracking-wide">
          {activeItem ? '👆 Chạm vào chiếc bóng khớp hình ở trên!' : '👇 Chạm hoặc kéo hình bên dưới lên chiếc bóng!'}
        </p>
      </div>

      {/* Khay hình màu phía dưới (sort-tray) */}
      <div className="h-[30%] flex items-center justify-center gap-4 sm:gap-6 px-3">
        {options.map((vocab) => {
          const isSelected = selected?._id === vocab._id || dragging?._id === vocab._id;
          return (
            <button
              key={`piece_${vocab._id}`}
              type="button"
              aria-label={`Chọn ${vocab.english}`}
              aria-pressed={isSelected}
              onPointerDown={(e) => {
                if (locked) return;
                sfx.playPop();
                stopWordAudio();
                void playWordAudio(vocab.english, vocab.audioUrl);
                setSelected(vocab);
                setDragging(vocab);
                setPos({ x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                if (locked) return;
                setSelected((prev) => (prev?._id === vocab._id ? null : vocab));
              }}
              className={`w-[clamp(96px,18vmin,142px)] h-[clamp(104px,19vmin,150px)] rounded-3xl border-4 p-2.5 flex flex-col items-center justify-between transition-all cursor-grab shadow-xl ${
                isSelected
                  ? 'bg-amber-100 border-amber-400 ring-6 ring-amber-300 -translate-y-2 scale-105'
                  : 'bg-white/95 border-indigo-200 hover:border-amber-300'
              }`}
            >
              <VocabImage vocab={vocab} className="w-[74%] h-[74%] object-contain" />
              <span className="text-xs font-black text-slate-800 capitalize truncate max-w-full">
                {vocab.english}
              </span>
            </button>
          );
        })}
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
