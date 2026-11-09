import React, { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl, SPEED_OPTIONS, type SpeedTier } from '../../shared/GameSpeedControl';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface TunnelFlyer {
  key: string;
  vocab: Vocabulary;
  isTarget: boolean;
  xPercent: number;
  yPercent: number;
  hit: boolean;
  wobbling: boolean;
}

/**
 * Tunnel Runner chuẩn kidscards.vercel.app:
 * Sân khấu đường hầm 3D với các vòng tròn đồng tâm phát sáng (tunnel-ring)
 * và các thẻ từ bay từ tâm đường hầm ra ngoài để bé chạm bắt.
 */
export const TunnelRunnerGame: React.FC<GameComponentProps> = ({
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
  const [flyers, setFlyers] = useState<TunnelFlyer[]>([]);
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;

  const speedMul = SPEED_OPTIONS[speed].mul;
  const pool = options.length > 0 ? options : [targetVocab];

  // Sinh đợt thẻ bay đầu tiên ngay khi vào lượt và bổ sung định kỳ như kidscards
  useEffect(() => {
    setLocked(false);
    lockedRef.current = false;

    const createWave = (): TunnelFlyer[] => {
      const slots = [
        { x: 24, y: 34 },
        { x: 74, y: 34 },
        { x: 28, y: 68 },
        { x: 72, y: 68 },
      ];
      const others = pool.filter((v) => v._id !== targetVocab._id);
      const waveVocabs = [
        targetVocab,
        others[0] || targetVocab,
        others[1] || targetVocab,
        others[2] || others[0] || targetVocab,
      ].slice(0, Math.min(4, Math.max(2, pool.length)));

      return waveVocabs.map((v, idx) => ({
        key: `${Date.now()}_${idx}_${v._id}`,
        vocab: v,
        isTarget: v._id === targetVocab._id,
        xPercent: slots[idx % slots.length].x + (Math.random() * 8 - 4),
        yPercent: slots[idx % slots.length].y + (Math.random() * 6 - 3),
        hit: false,
        wobbling: false,
      }));
    };

    setFlyers(createWave());
    const intervalMs = Math.round(3600 / speedMul);
    const interval = window.setInterval(() => {
      if (lockedRef.current) return;
      setFlyers(createWave());
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [targetVocab._id, options, speedMul]);

  const handleTap = (flyer: TunnelFlyer) => {
    if (locked || flyer.hit) return;

    if (flyer.isTarget) {
      sfx.playPop();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      setFlyers((prev) => prev.map((item) => (item.key === flyer.key ? { ...item, hit: true } : item)));
      scheduleTimeout(onCorrect, 420);
      return;
    }

    stopWordAudio();
    void playWordAudio(flyer.vocab.english, flyer.vocab.audioUrl);
    setFlyers((prev) => prev.map((item) => (item.key === flyer.key ? { ...item, wobbling: true } : item)));
    scheduleTimeout(() => {
      setFlyers((prev) => prev.map((item) => (item.key === flyer.key ? { ...item, wobbling: false } : item)));
    }, 450);
    onWrong(flyer.vocab._id);
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center select-none">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Tap every <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🚇
          </>
        }
        subtext={targetVocab.vietnamese ? `Chạm bắt "${targetVocab.vietnamese}" trong đường hầm` : 'Chạm bắt hình bay ra nhé!'}
        rightSlot={<GameSpeedControl value={speed} onChange={setSpeed} />}
      />

      {/* Sân khấu đường hầm đồng tâm 3D chuẩn kidscards */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {[0, 1, 2, 3].map((ringIdx) => (
          <span
            key={ringIdx}
            aria-hidden="true"
            style={{
              width: `${(ringIdx + 1) * 22}vmin`,
              height: `${(ringIdx + 1) * 22}vmin`,
              animationDelay: `${ringIdx * 0.8}s`,
            }}
            className="pointer-events-none absolute rounded-full border-4 border-cyan-400/25 shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-pulse"
          />
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none w-20 h-20 rounded-full bg-cyan-400/15 blur-xl"
        />

        {/* Các thẻ bay trong đường hầm */}
        {flyers.map((flyer) => {
          const glow = (attemptCount >= 2 || isAssisted) && flyer.isTarget;
          return (
            <button
              key={flyer.key}
              type="button"
              disabled={flyer.hit}
              aria-label={`Thẻ ${flyer.vocab.english}`}
              onClick={() => handleTap(flyer)}
              style={{
                left: `${flyer.xPercent}%`,
                top: `${flyer.yPercent}%`,
                transform: `translate(-50%, -50%) ${flyer.hit ? 'scale(1.35)' : 'scale(1)'}`,
                opacity: flyer.hit ? 0 : 1,
                transition: 'transform 320ms ease, opacity 320ms ease',
              }}
              className={`absolute z-10 w-[clamp(96px,19vmin,148px)] h-[clamp(96px,19vmin,148px)] rounded-3xl bg-white/95 border-4 flex flex-col items-center justify-center p-2.5 shadow-[0_12px_30px_rgba(8,145,178,0.45)] cursor-pointer active:scale-95 ${
                flyer.wobbling ? 'animate-gentle-wobble border-rose-400 ring-4 ring-rose-300' : 'border-cyan-300'
              } ${glow ? 'ring-8 ring-amber-300 border-amber-300 scale-105' : ''}`}
            >
              <VocabImage vocab={flyer.vocab} className="w-[70%] h-[70%] object-contain" />
              <span className="mt-0.5 text-xs font-black text-slate-800 capitalize truncate max-w-[92%]">
                {flyer.vocab.english}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TunnelRunnerGame;
