import React, { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl, SPEED_OPTIONS, type SpeedTier } from '../../shared/GameSpeedControl';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

interface HolePop {
  vocab: Vocabulary;
  key: string;
  leaving: boolean;
  caught: boolean;
}

/**
 * Peek-a-Boo chuẩn kidscards.vercel.app (Yg):
 * 4 hố cỏ xanh (peek-hole) nơi các bạn nhỏ nhô lên (peek-pop) rồi thụt xuống ngẫu nhiên.
 * Bé quan sát và chạm nhanh khi từ mục tiêu nhô lên khỏi bụi cỏ!
 */
export const PeekABooGame: React.FC<GameComponentProps> = ({
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
  const [holes, setHoles] = useState<Record<number, HolePop | null>>({});
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  lockedRef.current = locked;

  const speedMul = SPEED_OPTIONS[speed].mul;
  const pool = options.length > 0 ? options : [targetVocab];

  useEffect(() => {
    setLocked(false);
    lockedRef.current = false;
    setHoles({
      0: { vocab: targetVocab, key: `init_${targetVocab._id}`, leaving: false, caught: false },
    });

    const spawnInterval = window.setInterval(() => {
      if (lockedRef.current) return;
      setHoles((prev) => {
        const freeHoles = [0, 1, 2, 3].filter((idx) => !prev[idx]);
        if (freeHoles.length === 0) return prev;
        const holeIdx = freeHoles[Math.floor(Math.random() * freeHoles.length)];
        const hasTargetUp = Object.values(prev).some((h) => h && h.vocab._id === targetVocab._id);
        const pick =
          !hasTargetUp || Math.random() < 0.55
            ? targetVocab
            : pool[Math.floor(Math.random() * pool.length)];
        const popKey = `${Date.now()}_${holeIdx}`;

        window.setTimeout(() => {
          setHoles((cur) =>
            cur[holeIdx]?.key === popKey && !cur[holeIdx]?.caught
              ? { ...cur, [holeIdx]: { ...cur[holeIdx]!, leaving: true } }
              : cur
          );
        }, Math.round(1650 / speedMul));

        window.setTimeout(() => {
          setHoles((cur) =>
            cur[holeIdx]?.key === popKey && !cur[holeIdx]?.caught ? { ...cur, [holeIdx]: null } : cur
          );
        }, Math.round(1950 / speedMul));

        return {
          ...prev,
          [holeIdx]: { vocab: pick, key: popKey, leaving: false, caught: false },
        };
      });
    }, Math.round(850 / speedMul));

    return () => window.clearInterval(spawnInterval);
  }, [targetVocab, pool, speedMul]);

  const handleTapHole = (holeIdx: number) => {
    const pop = holes[holeIdx];
    if (!pop || pop.leaving || pop.caught || locked) return;

    if (pop.vocab._id === targetVocab._id) {
      sfx.playPop();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      setHoles((prev) => ({
        ...prev,
        [holeIdx]: { ...pop, caught: true },
      }));
      scheduleTimeout(onCorrect, 520);
      return;
    }

    stopWordAudio();
    void playWordAudio(pop.vocab.english, pop.vocab.audioUrl);
    setHoles((prev) => ({
      ...prev,
      [holeIdx]: { ...pop, leaving: true },
    }));
    scheduleTimeout(() => {
      setHoles((prev) => ({ ...prev, [holeIdx]: null }));
    }, 300);
    onWrong(pop.vocab._id);
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center pt-10 select-none">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Peek-a-Boo! Tap the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 👀
          </>
        }
        subtext={
          targetVocab.vietnamese
            ? `Chạm nhanh khi "${targetVocab.vietnamese}" nhô lên khỏi bụi cỏ!`
            : 'Chạm nhanh khi bạn nhỏ nhô lên nhé!'
        }
        rightSlot={<GameSpeedControl value={speed} onChange={setSpeed} />}
      />

      {/* Sân cỏ 4 hố chuẩn peek-field của kidscards */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:gap-x-14 sm:gap-y-8 p-4 max-w-2xl w-full place-items-center">
        {[0, 1, 2, 3].map((holeIdx) => {
          const pop = holes[holeIdx];
          const isTarget = pop?.vocab._id === targetVocab._id;
          const glow = (attemptCount >= 2 || isAssisted) && isTarget;

          return (
            <div
              key={holeIdx}
              className="relative w-[clamp(132px,26vmin,190px)] h-[clamp(124px,24vmin,175px)] flex flex-col items-center justify-end overflow-hidden"
            >
              {/* Bóng miệng hố phía sau */}
              <div
                aria-hidden="true"
                className="absolute bottom-3 w-[88%] h-9 rounded-full bg-slate-950/85 border-2 border-emerald-900/60 shadow-inner"
              />

              {/* Nhân vật/Từ vựng nhô lên (peek-pop) */}
              {pop && (
                <button
                  type="button"
                  aria-label={pop.vocab.english}
                  onClick={() => handleTapHole(holeIdx)}
                  className={`relative z-10 mb-5 w-[clamp(96px,19vmin,136px)] h-[clamp(96px,19vmin,136px)] rounded-3xl bg-white/95 border-4 flex flex-col items-center justify-center p-2 shadow-xl cursor-pointer transition-all duration-300 ${pop.caught
                    ? 'scale-125 bg-amber-100 border-amber-400 ring-8 ring-amber-300 -translate-y-3'
                    : pop.leaving
                      ? 'translate-y-16 opacity-0 scale-75'
                      : 'translate-y-0 opacity-100 hover:scale-105 active:scale-95 border-emerald-300'
                    } ${glow ? 'ring-8 ring-amber-300 border-amber-300' : ''}`}
                >
                  <VocabImage vocab={pop.vocab} className="w-[72%] h-[72%] object-contain" />
                  <span className="text-[11px] font-black text-slate-800 capitalize truncate max-w-full">
                    {pop.vocab.english}
                  </span>
                </button>
              )}

              {/* Bụi cỏ che phía trước hố (hole-grass) */}
              <div
                aria-hidden="true"
                className="relative z-20 pointer-events-none w-full h-9 rounded-t-3xl rounded-b-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 border-t-4 border-emerald-300 shadow-lg flex items-center justify-around px-4"
              >
                <span className="w-3 h-3 rounded-full bg-emerald-200/60" />
                <span className="text-xs font-black text-emerald-950/60">🌿</span>
                <span className="w-3 h-3 rounded-full bg-emerald-200/60" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PeekABooGame;
