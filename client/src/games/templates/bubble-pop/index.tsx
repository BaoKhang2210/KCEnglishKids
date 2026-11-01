import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { BUBBLE_POP_PARAMS } from './params';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface BubbleItem {
  id: string;
  vocab: Vocabulary;
  isTarget: boolean;
  leftPercent: number;
  delaySec: number;
  floatDurationSec: number;
  swayAmpPx: number;
  swayDelaySec: number;
  popped: boolean;
  wobbling: boolean;
}

export const BubblePopGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const params = BUBBLE_POP_PARAMS[config.ageGroup] || BUBBLE_POP_PARAMS['3-4'];
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [locked, setLocked] = useState(false);

  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    setLocked(false);
    const spacing = 100 / (options.length + 1);
    setBubbles(
      options.map((v, idx) => {
        // Sinh ngẫu nhiên biên độ đung đưa và tốc độ bay tự nhiên cho mỗi bóng
        const durationVariation = (Math.sin(idx * 1.5) * 1.2);
        return {
          id: `${v._id}_${idx}`,
          vocab: v,
          isTarget: v._id === targetVocab._id,
          leftPercent: Math.max(10, Math.min(85, spacing * (idx + 1) + (Math.sin(idx) * 4))),
          delaySec: idx * 0.4,
          floatDurationSec: Math.max(4.5, params.floatDurationSec + durationVariation),
          swayAmpPx: reducedMotion ? 4 : 12 + ((idx % 3) * 6),
          swayDelaySec: (idx * 0.7) % 2.5,
          popped: false,
          wobbling: false,
        };
      })
    );
  }, [options, targetVocab._id, params.floatDurationSec, reducedMotion]);

  const handleBubbleClick = (b: BubbleItem) => {
    if (b.popped || locked) return;

    if (b.isTarget) {
      sfx.playPop();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);

      setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, popped: true } : item)));
      scheduleTimeout(onCorrect, 350);
      return;
    }

    setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: false } : item)));
    }, 450);
    onWrong(b.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <GamePrompt
        text={
          <>
            Pop the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🫧
          </>
        }
      />
      {bubbles.map((b) => {
        const glow = (attemptCount >= 2 || isAssisted) && b.isTarget;

        return (
          /* Lớp ngoài: Bay từ dưới lên */
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.leftPercent}%`,
              bottom: '-20%',
              width: `clamp(100px, ${params.sizeVmin}vmin, 160px)`,
              height: `clamp(100px, ${params.sizeVmin}vmin, 160px)`,
              animationName: 'stage3-bubble-float',
              animationDuration: `${b.floatDurationSec}s`,
              animationDelay: `-${b.delaySec}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              pointerEvents: b.popped ? 'none' : 'auto',
            }}
            className="z-10"
          >
            {/* Lớp trong: Đung đưa nhẹ + hiệu ứng bấm bóng */}
            <button
              type="button"
              onClick={() => handleBubbleClick(b)}
              aria-label={`Bong bóng từ ${b.vocab.english}`}
              style={{
                width: '100%',
                height: '100%',
                transition: 'transform 260ms ease-out, opacity 260ms ease-out',
                opacity: b.popped ? 0 : 1,
                transform: b.popped
                  ? (reducedMotion ? 'scale(1)' : 'scale(1.25)')
                  : undefined,
              }}
              className={`relative rounded-full border-4 flex items-center justify-center p-2 cursor-pointer shadow-xl bg-gradient-to-br from-sky-400/40 via-indigo-500/25 to-purple-600/30 backdrop-blur-xs active:scale-95 ${
                b.wobbling ? 'animate-gentle-wobble border-amber-400 ring-4 ring-amber-300/60' : 'border-sky-300/80'
              } ${glow ? 'ring-8 ring-amber-300 border-amber-300' : ''}`}
            >
              <VocabImage vocab={b.vocab} className="w-[78%] h-[78%] object-contain" />
              <div className="absolute top-2.5 left-3 w-4 h-2.5 rounded-full bg-white/70 rotate-[-30deg] pointer-events-none" />
              <div className="absolute bottom-2.5 right-3 w-2 h-2 rounded-full bg-white/50 pointer-events-none" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default BubblePopGame;