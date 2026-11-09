import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl, SPEED_OPTIONS, type SpeedTier } from '../../shared/GameSpeedControl';
import { shuffleArray } from '../../core/targetSelector';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

const BALLOON_HUES = [
  'from-rose-400 via-red-500 to-rose-700 border-rose-200',
  'from-amber-300 via-amber-400 to-orange-500 border-amber-100',
  'from-emerald-400 via-green-500 to-teal-700 border-emerald-200',
  'from-sky-400 via-blue-500 to-indigo-600 border-sky-200',
  'from-fuchsia-400 via-purple-500 to-indigo-700 border-fuchsia-200',
];

interface Balloon {
  id: string;
  vocab: Vocabulary;
  isTarget: boolean;
  leftPercent: number;
  hueClass: string;
  durSec: number;
  delaySec: number;
  popped: boolean;
  wobbling: boolean;
}

export const BalloonFloatGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [speed, setSpeed] = useState<SpeedTier>(config.ageGroup === '3-4' ? 0 : 1);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [locked, setLocked] = useState(false);
  const speedMul = SPEED_OPTIONS[speed].mul;

  useEffect(() => {
    setLocked(false);
    // Chuẩn kidscards.vercel.app: mỗi vòng 1 bóng mục tiêu + các bóng gây nhiễu khác nhau
    const distractors = shuffleArray(options.filter((v) => v._id !== targetVocab._id)).slice(0, 4);
    const deck = shuffleArray([targetVocab, ...distractors]);
    const spacing = 100 / (deck.length + 1);

    setBalloons(
      deck.map((v, idx) => ({
        id: `${v._id}_${idx}`,
        vocab: v,
        isTarget: v._id === targetVocab._id,
        leftPercent: Math.max(8, Math.min(84, spacing * (idx + 1) + (idx % 2 === 0 ? -2 : 2))),
        hueClass: BALLOON_HUES[idx % BALLOON_HUES.length],
        durSec: 8.5 + (idx % 3) * 1.8,
        delaySec: idx * 0.55,
        popped: false,
        wobbling: false,
      }))
    );
  }, [options, targetVocab._id]);

  const handleClick = (b: Balloon) => {
    if (b.popped || locked) return;
    if (b.isTarget) {
      sfx.playPop();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      setBalloons((prev) => prev.map((item) => (item.id === b.id ? { ...item, popped: true } : item)));
      scheduleTimeout(onCorrect, 450);
      return;
    }

    stopWordAudio();
    void playWordAudio(b.vocab.english, b.vocab.audioUrl);
    setBalloons((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setBalloons((prev) => prev.map((item) => (item.id === b.id ? { ...item, wobbling: false } : item)));
    }, 450);
    onWrong(b.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden select-none">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Pop the <span className="text-amber-300 capitalize">{targetVocab.english}</span> balloon! 🎈
          </>
        }
        subtext={targetVocab.vietnamese ? `Tìm bóng bay "${targetVocab.vietnamese}"` : 'Chạm đúng quả bóng bay nhé!'}
        rightSlot={<GameSpeedControl value={speed} onChange={setSpeed} />}
      />

      {balloons.map((b) => {
        const glow = (attemptCount >= 2 || isAssisted) && b.isTarget && !b.popped;
        return (
          <button
            key={b.id}
            type="button"
            disabled={b.popped}
            aria-label={`Bóng bay ${b.vocab.english}`}
            onClick={() => handleClick(b)}
            style={{
              left: `${b.leftPercent}%`,
              animationDuration: `${(b.durSec / speedMul).toFixed(2)}s`,
              animationDelay: `-${b.delaySec}s`,
              opacity: b.popped ? 0 : 1,
              transform: b.popped ? 'scale(1.3)' : undefined,
              transition: 'opacity 250ms ease, transform 250ms ease',
            }}
            className={`absolute w-[clamp(96px,18vmin,144px)] h-[clamp(132px,25vmin,194px)] flex flex-col items-center cursor-pointer stage3-balloon-rise ${
              b.wobbling ? 'animate-gentle-wobble' : ''
            }`}
          >
            {/* Bầu bóng bay */}
            <div
              className={`relative w-full aspect-square rounded-[50%_50%_48%_48%/55%_55%_45%_45%] border-4 bg-gradient-to-br ${b.hueClass} flex flex-col items-center justify-center p-2 shadow-xl ${
                glow ? 'ring-8 ring-amber-300 border-amber-200 scale-105' : ''
              }`}
            >
              <div className="absolute top-2.5 left-3.5 w-4 h-7 rounded-full bg-white/40 rotate-[-25deg] pointer-events-none" />
              <div className="w-[68%] h-[68%] rounded-full bg-white/90 p-1.5 flex items-center justify-center shadow-inner">
                <VocabImage vocab={b.vocab} className="w-full h-full object-contain" />
              </div>
              <span className="mt-0.5 text-[11px] font-black text-white drop-shadow capitalize truncate max-w-[90%]">
                {b.vocab.english}
              </span>
            </div>
            {/* Nút thắt & dây bóng bay liền mạch */}
            <div className="w-3 h-2 bg-amber-200/90 clip-triangle -mt-0.5" />
            <div className="w-0.5 h-8 bg-white/70 rounded-full" />
          </button>
        );
      })}
    </div>
  );
};

export default BalloonFloatGame;
