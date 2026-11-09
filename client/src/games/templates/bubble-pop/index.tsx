import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { BUBBLE_POP_PARAMS } from './params';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl, SPEED_OPTIONS, type SpeedTier } from '../../shared/GameSpeedControl';
import { shuffleArray } from '../../core/targetSelector';
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
  const [speed, setSpeed] = useState<SpeedTier>(config.ageGroup === '3-4' ? 0 : 1);
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [locked, setLocked] = useState(false);

  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const speedMul = SPEED_OPTIONS[speed].mul;

  useEffect(() => {
    setLocked(false);
    const others = shuffleArray(options.filter((v) => v._id !== targetVocab._id)).slice(0, 4);
    const deck = shuffleArray([targetVocab, ...others]);
    const spacing = 100 / (deck.length + 1);
    setBubbles(
      deck.map((v, idx) => {
        const durationVariation = Math.sin(idx * 1.5) * 1.1;
        return {
          id: `${v._id}_${idx}`,
          vocab: v,
          isTarget: v._id === targetVocab._id,
          leftPercent: Math.max(8, Math.min(84, spacing * (idx + 1) + Math.sin(idx) * 3)),
          delaySec: idx * 0.35,
          floatDurationSec: Math.max(4.5, params.floatDurationSec + durationVariation),
          swayAmpPx: reducedMotion ? 4 : 12 + (idx % 3) * 6,
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
      scheduleTimeout(onCorrect, 420);
      return;
    }

    stopWordAudio();
    void playWordAudio(b.vocab.english, b.vocab.audioUrl);
    setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setBubbles((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: false } : item)));
    }, 500);
    onWrong(b.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Pop the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🫧
          </>
        }
        subtext={targetVocab.vietnamese ? `Chạm nổ bóng "${targetVocab.vietnamese}"` : 'Chạm đúng bong bóng nhé!'}
        rightSlot={<GameSpeedControl value={speed} onChange={setSpeed} />}
      />

      {bubbles.map((b) => {
        const glow = (attemptCount >= 2 || isAssisted) && b.isTarget;
        const effectiveDuration = (b.floatDurationSec / speedMul).toFixed(2);

        return (
          <div
            key={b.id}
            style={{
              position: 'absolute',
              left: `${b.leftPercent}%`,
              bottom: '-20%',
              width: `clamp(104px, ${params.sizeVmin}vmin, 162px)`,
              height: `clamp(104px, ${params.sizeVmin}vmin, 162px)`,
              animationName: 'stage3-bubble-float',
              animationDuration: `${effectiveDuration}s`,
              animationDelay: `-${b.delaySec}s`,
              animationTimingFunction: 'linear',
              animationIterationCount: 'infinite',
              pointerEvents: b.popped ? 'none' : 'auto',
            }}
            className="z-10"
          >
            <button
              type="button"
              onClick={() => handleBubbleClick(b)}
              aria-label={`Bong bóng ${b.vocab.english}`}
              style={{
                width: '100%',
                height: '100%',
                transition: 'transform 260ms ease-out, opacity 260ms ease-out',
                opacity: b.popped ? 0 : 1,
                transform: b.popped ? (reducedMotion ? 'scale(1)' : 'scale(1.3)') : undefined,
              }}
              className={`relative rounded-full border-4 flex flex-col items-center justify-center p-2 cursor-pointer shadow-[inset_0_-10px_22px_rgba(56,189,248,0.35),0_10px_24px_rgba(15,23,42,0.35)] bg-gradient-to-br from-sky-300/45 via-indigo-400/25 to-purple-500/35 backdrop-blur-xs active:scale-95 ${
                b.wobbling ? 'animate-gentle-wobble border-rose-400 ring-4 ring-rose-300/60' : 'border-sky-200/85'
              } ${glow ? 'ring-8 ring-amber-300 border-amber-300' : ''}`}
            >
              {/* Vệt sáng bóng kính chuẩn kidscards */}
              <div className="absolute top-2.5 left-3.5 w-5 h-2.5 rounded-full bg-white/80 rotate-[-28deg] pointer-events-none" />
              <div className="absolute bottom-3 right-3.5 w-2.5 h-2.5 rounded-full bg-white/55 pointer-events-none" />

              <VocabImage vocab={b.vocab} className="w-[66%] h-[66%] object-contain" />
              <span className="mt-0.5 text-[11px] sm:text-xs font-black text-white drop-shadow capitalize truncate max-w-[90%]">
                {b.vocab.english}
              </span>

              {b.popped && (
                <span className="absolute inset-0 pointer-events-none">
                  {[0, 1, 2, 3, 4, 5].map((ray) => (
                    <i
                      key={ray}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '8px',
                        height: '20px',
                        borderRadius: '999px',
                        background: '#fde047',
                        transform: `translate(-50%, -50%) rotate(${ray * 60}deg) translateY(-48px)`,
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default BubblePopGame;
