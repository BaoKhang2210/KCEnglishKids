import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { KokoMascot } from '../../../components/child/KokoMascot';
import type { Vocabulary } from '../../../types';
import { hitDropId } from '../../shared/dropTarget';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';

export const KokosDeliveryGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [selectedVocab, setSelectedVocab] = useState<Vocabulary | null>(null);
  const [dragging, setDragging] = useState<Vocabulary | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [delivered, setDelivered] = useState(false);
  const [locked, setLocked] = useState(false);
  const [wobble, setWobble] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  useEffect(() => {
    setLocked(false);
    setDelivered(false);
    setSelectedVocab(null);
    setDragging(null);
    setWrongId(null);
  }, [targetVocab._id]);

  const deliverItem = (vocab: Vocabulary) => {
    if (locked) return;
    if (vocab._id === targetVocab._id) {
      setDelivered(true);
      setLocked(true);
      setSelectedVocab(null);
      setDragging(null);
      void speakText(targetVocab.english, targetVocab.audioUrl);
      scheduleTimeout(onCorrect, 550);
      return;
    }
    setWobble(true);
    setWrongId(vocab._id);
    scheduleTimeout(() => {
      setWobble(false);
      setWrongId(null);
    }, 450);
    onWrong(vocab._id);
    setDragging(null);
  };

  return (
    <div
      className="w-full h-full relative flex flex-col justify-between py-1 select-none"
      onPointerMove={(e) => dragging && setPos({ x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        if (!dragging) return;
        if (hitDropId(e.clientX, e.clientY) === 'koko-basket') {
          deliverItem(dragging);
        } else {
          setDragging(null);
        }
      }}
    >
      <GamePrompt
        text={
          <>
            Deliver the <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span> to Koko! 🧺
          </>
        }
        subtext={
          selectedVocab
            ? `Chạm vào giỏ của Koko để giao "${selectedVocab.english}"!`
            : `Chạm hoặc kéo "${targetVocab.english}" (${targetVocab.vietnamese || 'vật phẩm đúng'}) vào giỏ của Koko`
        }
        onSpeak={onReplayAudio}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
        <KokoMascot
          state={delivered ? 'celebrating' : isAssisted ? 'encouraging' : 'happy'}
          size="md"
          interactive={false}
          speechBubble={
            delivered
              ? `Yummy ${targetVocab.english}! 🎉`
              : `Give me the ${targetVocab.english}, please!`
          }
        />
        <button
          type="button"
          data-drop-id="koko-basket"
          onClick={() => selectedVocab && deliverItem(selectedVocab)}
          className={`relative w-[min(52vmin,240px)] h-[min(24vmin,130px)] rounded-[40px] border-4 bg-gradient-to-b from-amber-700/85 to-amber-900/90 flex flex-col items-center justify-center gap-1 shadow-2xl transition-all cursor-pointer ${
            delivered
              ? 'border-emerald-300 ring-8 ring-emerald-400/50 scale-105'
              : selectedVocab || attemptCount >= 2 || isAssisted
              ? 'ring-8 ring-amber-300 border-amber-200 animate-pulse'
              : 'border-amber-300/80 hover:scale-105'
          } ${wobble ? 'animate-gentle-wobble border-rose-400' : ''}`}
        >
          {delivered ? (
            <VocabImage vocab={targetVocab} className="w-16 h-16 animate-bounce" />
          ) : (
            <VocabImage vocab={targetVocab} silhouette className="w-14 h-14 opacity-65" />
          )}
          <span className="text-xs font-black text-amber-100 uppercase tracking-wider">
            {delivered ? 'Delivered! ✨' : selectedVocab ? 'Chạm vào giỏ để thả!' : "Koko's Basket 🧺"}
          </span>
        </button>
      </div>

      <div className="min-h-[115px] flex items-center justify-center gap-3 px-3 pb-2 flex-wrap">
        {options.map((vocab) => {
          const isTarget = vocab._id === targetVocab._id;
          const isSelected = selectedVocab?._id === vocab._id || dragging?._id === vocab._id;
          const isWrong = wrongId === vocab._id;
          return (
            <button
              key={vocab._id}
              type="button"
              onPointerDown={(e) => {
                if (locked) return;
                setSelectedVocab(vocab);
                setDragging(vocab);
                setPos({ x: e.clientX, y: e.clientY });
              }}
              onClick={() => {
                if (locked) return;
                void speakText(vocab.english, vocab.audioUrl);
                if (selectedVocab?._id === vocab._id) {
                  deliverItem(vocab);
                } else {
                  setSelectedVocab(vocab);
                }
              }}
              className={`min-w-[84px] min-h-[96px] w-[clamp(84px,16vmin,120px)] h-[clamp(96px,18vmin,132px)] rounded-2xl bg-white/15 border-3 flex flex-col items-center justify-center gap-1 p-2 cursor-grab transition-all ${
                isSelected
                  ? 'border-amber-300 ring-4 ring-amber-300 bg-amber-400/25 -translate-y-2 scale-105'
                  : (attemptCount >= 2 || isAssisted) && isTarget
                  ? 'border-amber-300 ring-6 ring-amber-300 animate-pulse'
                  : 'border-white/30 hover:bg-white/25'
              } ${isWrong ? 'animate-gentle-wobble border-rose-400 bg-rose-500/30' : ''}`}
            >
              <VocabImage vocab={vocab} className="w-14 h-14 pointer-events-none" />
              <span className="text-xs font-black text-white capitalize truncate max-w-full">
                {vocab.english}
              </span>
            </button>
          );
        })}
      </div>

      {dragging && (
        <div
          className="pointer-events-none fixed z-[10000] w-20 h-20 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          <VocabImage vocab={dragging} className="w-full h-full drop-shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default KokosDeliveryGame;
