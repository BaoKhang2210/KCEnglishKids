import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl, SPEED_OPTIONS, type SpeedTier } from '../../shared/GameSpeedControl';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

/**
 * Mystery Boxes chuẩn kidscards.vercel.app (Jg):
 * Trò chơi 3 chiếc rương kho báu (Shell Game):
 * - Pha 'show' ("Watch closely…"): Mở nắp cho bé thấy rương nào chứa targetVocab
 * - Pha 'shuffle' ("Watch them dance!"): Đóng nắp và trượt đổi vị trí ngang mượt mà bằng translateX
 * - Pha 'guess' ("Where is the <word>?"): Bé chạm mở rương đang giấu từ mục tiêu!
 */
export const MysteryBoxesGame: React.FC<GameComponentProps> = ({
  config,
  targetVocab,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [speed, setSpeed] = useState<SpeedTier>(config.ageGroup === '3-4' ? 0 : 1);
  const [phase, setPhase] = useState<'show' | 'shuffle' | 'guess' | 'reveal'>('show');
  const [winningBoxIdx, setWinningBoxIdx] = useState<number>(1);
  // positions[boxIdx] là cột hiện tại (0, 1, 2) của chiếc rương thứ boxIdx
  const [positions, setPositions] = useState<number[]>([0, 1, 2]);
  const [openBoxes, setOpenBoxes] = useState<boolean[]>([true, true, true]);
  const [locked, setLocked] = useState(false);

  const speedMul = SPEED_OPTIONS[speed].mul;

  useEffect(() => {
    const startBox = Math.floor(Math.random() * 3);
    setWinningBoxIdx(startBox);
    setPositions([0, 1, 2]);
    setPhase('show');
    setOpenBoxes([true, true, true]);
    setLocked(false);

    const timers: number[] = [];
    const swapCount = config.ageGroup === '3-4' ? 2 : config.ageGroup === '4-5' ? 3 : 4;

    // Sau 1.7s: Đóng nắp bắt đầu tráo rương
    timers.push(
      scheduleTimeout(() => {
        setOpenBoxes([false, false, false]);
        setPhase('shuffle');
      }, Math.round(1700 / speedMul))
    );

    // Thực hiện các bước trượt đổi chỗ mượt mà
    for (let step = 0; step < swapCount; step++) {
      timers.push(
        scheduleTimeout(() => {
          sfx.playPop();
          setPositions((prev) => {
            const next = [...prev];
            const a = Math.floor(Math.random() * 3);
            const b = (a + 1 + Math.floor(Math.random() * 2)) % 3;
            [next[a], next[b]] = [next[b], next[a]];
            return next;
          });
        }, Math.round((2200 + step * 620) / speedMul))
      );
    }

    // Kết thúc tráo: chuyển sang pha đoán
    timers.push(
      scheduleTimeout(() => {
        setPhase('guess');
      }, Math.round((2350 + swapCount * 620) / speedMul))
    );

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [targetVocab._id, config.ageGroup, speedMul]);

  const handlePickBox = (boxIdx: number) => {
    if (phase !== 'guess' || locked) return;
    sfx.playPop();
    setOpenBoxes((prev) => prev.map((open, i) => (i === boxIdx ? true : open)));

    if (boxIdx === winningBoxIdx) {
      setLocked(true);
      setPhase('reveal');
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      scheduleTimeout(onCorrect, 650);
      return;
    }

    setLocked(true);
    scheduleTimeout(() => {
      setOpenBoxes((prev) => prev.map((open, i) => (i === boxIdx ? false : open)));
      setLocked(false);
    }, 750);
    onWrong();
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center pt-10 select-none">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Where is the <span className="text-amber-300 capitalize">{targetVocab.english}</span>? 🎁
          </>
        }
        subtext={
          phase === 'show'
            ? 'Watch closely… (Nhìn kỹ xem bạn nhỏ ở rương nào nhé!)'
            : phase === 'shuffle'
              ? 'Watch them dance! (Theo dõi các chiếc rương đổi chỗ!)'
              : `Chạm mở chiếc rương có "${targetVocab.vietnamese || targetVocab.english}"!`
        }
        rightSlot={<GameSpeedControl value={speed} onChange={setSpeed} disabled={phase === 'shuffle'} />}
      />

      {/* Sân khấu 3 chiếc rương trượt đổi vị trí chuẩn boxes-stage trên kidscards */}
      <div className="relative w-full max-w-2xl h-64 flex items-center justify-center">
        {[0, 1, 2].map((boxIdx) => {
          const isOpen =
            openBoxes[boxIdx] || (phase === 'guess' && isAssisted && boxIdx === winningBoxIdx);
          const isWinner = boxIdx === winningBoxIdx;
          const glow =
            phase === 'guess' && (attemptCount >= 2 || isAssisted) && isWinner;
          const offsetPx = (positions[boxIdx] - 1) * 126;

          return (
            <button
              key={boxIdx}
              type="button"
              disabled={phase !== 'guess'}
              aria-label={`Rương số ${boxIdx + 1}`}
              onClick={() => handlePickBox(boxIdx)}
              style={{
                transform: `translateX(${offsetPx}px)`,
                transition: `transform ${(0.52 / speedMul).toFixed(2)}s cubic-bezier(0.34, 1.46, 0.64, 1)`,
              }}
              className={`absolute w-[108px] sm:w-[120px] flex flex-col items-center cursor-pointer disabled:cursor-default ${
                glow ? 'ring-8 ring-amber-300 rounded-3xl p-1' : ''
              }`}
            >
              {/* Phần thưởng bên trong rương */}
              <div
                className={`h-20 w-full flex flex-col items-center justify-center transition-all duration-300 ${
                  isOpen ? 'opacity-100 -translate-y-1 scale-105' : 'opacity-0 translate-y-6 scale-75'
                }`}
              >
                {isWinner ? (
                  <div className="w-16 h-16 rounded-2xl bg-white/95 p-1.5 shadow-lg border-2 border-amber-300 flex items-center justify-center">
                    <VocabImage vocab={targetVocab} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <span className="text-2xl font-black text-slate-400">💨</span>
                )}
              </div>

              {/* Nắp rương (mbox-lid) */}
              <div
                className={`w-full h-7 rounded-t-2xl bg-gradient-to-b from-amber-400 to-amber-600 border-3 border-amber-200 shadow-md transition-transform duration-300 origin-bottom ${
                  isOpen ? '-translate-y-3 -rotate-12' : 'translate-y-0 rotate-0'
                }`}
              />

              {/* Thân rương (mbox-base) */}
              <div className="relative w-full h-20 rounded-b-2xl bg-gradient-to-b from-rose-500 via-rose-600 to-rose-800 border-3 border-amber-200 flex items-center justify-center shadow-xl">
                <div className="w-5 h-6 rounded-md bg-amber-300 border-2 border-amber-600 flex items-center justify-center">
                  <span className="w-1.5 h-2.5 rounded-full bg-amber-900" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs sm:text-sm font-black text-amber-200">
        {phase === 'show'
          ? '👀 Ghi nhớ chiếc rương nhé…'
          : phase === 'shuffle'
            ? '🔄 Các chiếc rương đang tráo đổi…'
            : '👆 Bé chạm chọn chiếc rương đúng nào!'}
      </p>
    </div>
  );
};

export default MysteryBoxesGame;
