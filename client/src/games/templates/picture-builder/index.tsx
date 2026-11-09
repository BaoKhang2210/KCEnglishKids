import React, { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { GamePrompt } from '../../shared/GamePrompt';
import { VocabImage } from '../../shared/VocabImage';
import { shuffleArray } from '../../core/targetSelector';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';

export const PictureBuilderGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const pieceCount = config.ageGroup === '3-4' ? 2 : 4;
  const cols = 2;
  const rows = pieceCount === 2 ? 1 : 2;

  const [order, setOrder] = useState<number[]>([]);
  const [slots, setSlots] = useState<(number | null)[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [draggingPiece, setDraggingPiece] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [peeking, setPeeking] = useState(false);
  const [wobbleSlot, setWobbleSlot] = useState<number | null>(null);
  const assistedTargetRef = useRef<string | null>(null);
  const assistTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const ids = Array.from({ length: pieceCount }, (_, i) => i);
    setOrder(shuffleArray(ids));
    setSlots(Array(pieceCount).fill(null));
    setSelectedPiece(null);
    setDraggingPiece(null);
    setPeeking(false);
    setWobbleSlot(null);
    assistedTargetRef.current = null;
    window.clearTimeout(assistTimerRef.current);
  }, [targetVocab._id, pieceCount]);

  useEffect(() => {
    if (!isAssisted || assistedTargetRef.current === targetVocab._id) return;
    assistedTargetRef.current = targetVocab._id;
    const ids = Array.from({ length: pieceCount }, (_, i) => i);
    setSlots(ids);
    setOrder([]);
    assistTimerRef.current = window.setTimeout(onCorrect, 650);
    return () => window.clearTimeout(assistTimerRef.current);
  }, [isAssisted, pieceCount, onCorrect, targetVocab._id]);

  const placePiece = (pieceId: number, slotIndex: number) => {
    if (slots[slotIndex] !== null) return;
    if (pieceId === slotIndex) {
      const next = [...slots];
      next[slotIndex] = pieceId;
      setSlots(next);
      setOrder((prev) => prev.filter((id) => id !== pieceId));
      setSelectedPiece(null);
      setDraggingPiece(null);
      if (next.every((v) => v !== null)) {
        void speakText(targetVocab.english, targetVocab.audioUrl);
        scheduleTimeout(onCorrect, 550);
      }
      return;
    }
    setWobbleSlot(slotIndex);
    scheduleTimeout(() => setWobbleSlot(null), 400);
    onWrong();
    setDraggingPiece(null);
  };

  const handlePeek = () => {
    if (peeking) return;
    setPeeking(true);
    void speakText(targetVocab.english, targetVocab.audioUrl);
    scheduleTimeout(() => setPeeking(false), 1200);
  };

  const renderTileArt = (pieceId: number) => {
    const col = pieceId % cols;
    const row = Math.floor(pieceId / cols);
    return (
      <div className="relative w-full h-full overflow-hidden pointer-events-none select-none bg-indigo-950/60">
        <div
          className="absolute top-0 left-0 flex items-center justify-center p-3"
          style={{
            width: `${cols * 100}%`,
            height: `${rows * 100}%`,
            transform: `translate(-${(col / cols) * 100}%, -${(row / rows) * 100}%)`,
          }}
        >
          <VocabImage vocab={targetVocab} className="w-[86%] h-[86%]" />
        </div>
      </div>
    );
  };

  const placedCount = slots.filter((s) => s !== null).length;
  const isComplete = placedCount === pieceCount;

  return (
    <div
      className="w-full h-full relative flex flex-col items-center justify-between py-1 select-none"
      onPointerMove={(e) => {
        if (draggingPiece !== null) {
          setDragPos({ x: e.clientX, y: e.clientY });
        }
      }}
      onPointerUp={(e) => {
        if (draggingPiece === null) return;
        const dropId = hitDropId(e.clientX, e.clientY);
        if (dropId && dropId.startsWith('puzzle-slot-')) {
          const slotIndex = Number(dropId.replace('puzzle-slot-', ''));
          placePiece(draggingPiece, slotIndex);
        } else {
          setDraggingPiece(null);
        }
      }}
    >
      <GamePrompt
        text={
          <>
            Build the <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span> picture! 🧩
          </>
        }
        subtext={
          selectedPiece !== null
            ? `Chạm vào ô số ${selectedPiece + 1} trên khung để lắp mảnh ghép (${placedCount}/${pieceCount})`
            : `Chạm hoặc kéo từng mảnh ghép vào đúng vị trí (${placedCount}/${pieceCount})`
        }
        onSpeak={onReplayAudio}
        rightSlot={
          <button
            type="button"
            onClick={handlePeek}
            className="px-3 py-1.5 rounded-full bg-indigo-500/40 hover:bg-indigo-500/60 border border-indigo-300/40 text-xs font-black text-white cursor-pointer flex items-center gap-1"
          >
            👁️ Xem mẫu
          </button>
        }
      />

      {/* Puzzle Board */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
        <div
          className={`relative grid gap-1.5 p-2 w-[min(64vmin,280px)] ${
            rows === 1 ? 'h-[min(34vmin,150px)]' : 'h-[min(64vmin,280px)]'
          } bg-slate-900/70 border-4 rounded-3xl overflow-hidden shadow-2xl transition-all ${
            isComplete
              ? 'border-emerald-300 ring-8 ring-emerald-400/40 scale-105'
              : attemptCount >= 2
              ? 'border-amber-300 ring-6 ring-amber-300/40'
              : 'border-white/30'
          }`}
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {/* Ghost guide or Peek full image */}
          <div
            className={`pointer-events-none absolute inset-2 flex items-center justify-center transition-opacity duration-300 z-0 ${
              peeking ? 'opacity-90 z-20 bg-indigo-950/90 rounded-2xl' : 'opacity-20'
            }`}
          >
            <VocabImage vocab={targetVocab} className="w-[82%] h-[82%]" />
          </div>

          {slots.map((value, idx) => {
            const isTargetSlotForSelected =
              selectedPiece !== null && (attemptCount >= 1 || isAssisted) && selectedPiece === idx;
            return (
              <button
                key={idx}
                type="button"
                data-drop-id={`puzzle-slot-${idx}`}
                onClick={() => {
                  if (selectedPiece !== null) {
                    placePiece(selectedPiece, idx);
                  }
                }}
                className={`relative z-10 rounded-xl overflow-hidden border-2 transition-all cursor-pointer flex items-center justify-center ${
                  value !== null
                    ? 'border-emerald-300/70 shadow-inner'
                    : isTargetSlotForSelected
                    ? 'border-amber-300 bg-amber-300/20 ring-4 ring-amber-300 animate-pulse'
                    : selectedPiece !== null
                    ? 'border-dashed border-amber-200/70 bg-white/10 hover:bg-white/20'
                    : 'border-dashed border-white/25 bg-slate-950/40'
                } ${wobbleSlot === idx ? 'animate-gentle-wobble border-rose-400' : ''}`}
              >
                {value !== null ? (
                  renderTileArt(value)
                ) : (
                  <span className="text-white/45 font-black text-xl">{idx + 1}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="px-4 py-1 rounded-full bg-white/10 border border-white/20 text-white font-black text-sm tracking-wide capitalize">
          {targetVocab.english} {targetVocab.vietnamese ? `• ${targetVocab.vietnamese}` : ''}
        </div>
      </div>

      {/* Piece Tray */}
      <div className="min-h-[96px] flex items-center justify-center gap-3 px-4 pb-2 flex-wrap">
        {order.map((id) => {
          const isSelected = selectedPiece === id || draggingPiece === id;
          return (
            <button
              key={id}
              type="button"
              onPointerDown={(e) => {
                setSelectedPiece(id);
                setDraggingPiece(id);
                setDragPos({ x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                setSelectedPiece((prev) => (prev === id ? null : id));
              }}
              className={`relative w-[clamp(74px,16vmin,105px)] ${
                rows === 1 ? 'h-[clamp(74px,16vmin,105px)]' : 'h-[clamp(74px,16vmin,105px)]'
              } rounded-2xl border-3 overflow-hidden shadow-lg cursor-grab transition-transform ${
                isSelected
                  ? 'border-amber-300 ring-4 ring-amber-300 -translate-y-2 scale-105'
                  : 'border-white/40 hover:scale-105'
              }`}
            >
              {renderTileArt(id)}
              <span className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/75 text-[11px] font-black text-amber-300">
                #{id + 1}
              </span>
            </button>
          );
        })}
      </div>

      {draggingPiece !== null && (
        <div
          className="pointer-events-none fixed z-[10000] w-24 h-24 rounded-2xl border-3 border-amber-300 overflow-hidden shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragPos.x, top: dragPos.y }}
        >
          {renderTileArt(draggingPiece)}
        </div>
      )}
    </div>
  );
};

export default PictureBuilderGame;
