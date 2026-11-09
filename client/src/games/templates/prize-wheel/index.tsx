import React, { useEffect, useMemo, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { RotateCw } from 'lucide-react';
import { sfx, playWordAudio, stopWordAudio } from '../../../utils/audio';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import type { Vocabulary } from '../../../types';
import { useManagedTimeout } from '../../shared/useManagedTimeout';

const WHEEL_COLORS = ['#ff8fab', '#ffc857', '#8ce99a', '#6ec8ff', '#c8a2ff', '#ffa46e'];

/**
 * Prize Wheel chuẩn kidscards.vercel.app:
 * Vòng quay conic-gradient nhiều múi màu sắc với kim chỉ ở đỉnh,
 * các thẻ từ giữ thẳng đứng khi bánh xe quay, nút tâm "Spin!" tương tác.
 */
export const PrizeWheelGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [wheelDeg, setWheelDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wobbleId, setWobbleId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const slices = useMemo(() => {
    const others = options.filter((v) => v._id !== targetVocab._id);
    const list = [targetVocab, ...others].slice(0, Math.min(6, Math.max(3, options.length)));
    return list;
  }, [options, targetVocab]);

  const sliceAngle = 360 / slices.length;
  const targetIdx = Math.max(0, slices.findIndex((s) => s._id === targetVocab._id));

  const spinWheel = () => {
    if (spinning || locked) return;
    sfx.playPop();
    setSpinning(true);
    // Quay ít nhất 2 vòng và dừng gần vị trí của từ mục tiêu ở đỉnh
    const targetStopAngle = -(targetIdx * sliceAngle);
    const nextDeg = wheelDeg - 720 + ((targetStopAngle - (wheelDeg % 360)) % 360);
    setWheelDeg(nextDeg);
    scheduleTimeout(() => {
      setSpinning(false);
      setHasSpun(true);
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
    }, 1150);
  };

  useEffect(() => {
    setLocked(false);
    setWobbleId(null);
    setHasSpun(false);
    setSpinning(true);
    const stopAngle = -(targetIdx * sliceAngle) - 360;
    setWheelDeg(stopAngle);
    const t = scheduleTimeout(() => {
      setSpinning(false);
      setHasSpun(true);
    }, 1100);
    return () => window.clearTimeout(t);
  }, [targetVocab._id, targetIdx, sliceAngle]);

  const handlePick = (vocab: Vocabulary) => {
    if (spinning || locked) return;
    if (vocab._id === targetVocab._id) {
      sfx.playSuccess();
      stopWordAudio();
      void playWordAudio(targetVocab.english, targetVocab.audioUrl);
      setLocked(true);
      scheduleTimeout(onCorrect, 420);
      return;
    }
    stopWordAudio();
    void playWordAudio(vocab.english, vocab.audioUrl);
    setWobbleId(vocab._id);
    scheduleTimeout(() => setWobbleId(null), 450);
    onWrong(vocab._id);
  };

  const gradientStops = slices
    .map((_, idx) => {
      const color = WHEEL_COLORS[idx % WHEEL_COLORS.length];
      return `${color} ${idx * sliceAngle}deg ${(idx + 1) * sliceAngle}deg`;
    })
    .join(', ');

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-center gap-3 select-none pt-8">
      <GamePrompt
        onSpeak={() => void playWordAudio(targetVocab.english, targetVocab.audioUrl)}
        text={
          <>
            Spin &amp; tap the <span className="text-amber-300 capitalize">{targetVocab.english}</span>! 🎡
          </>
        }
        subtext={
          spinning
            ? 'Vòng quay đang xoay…'
            : hasSpun
              ? `Chạm vào thẻ "${targetVocab.vietnamese || targetVocab.english}" trên vòng quay!`
              : 'Bấm Spin để xoay vòng quay!'
        }
      />

      <div className="relative w-[min(68vmin,350px)] h-[min(68vmin,350px)] flex items-center justify-center">
        {/* Kim chỉ đỉnh vòng quay chuẩn kidscards */}
        <div
          aria-hidden="true"
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        />

        {/* Đĩa vòng quay conic-gradient */}
        <div
          style={{
            transform: `rotate(${wheelDeg}deg)`,
            transition: spinning ? 'transform 1.1s cubic-bezier(0.18, 0.82, 0.22, 1)' : 'none',
            background: `conic-gradient(from -${sliceAngle / 2}deg, ${gradientStops})`,
          }}
          className="relative w-full h-full rounded-full border-8 border-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.55)]"
        >
          {slices.map((vocab, idx) => {
            const angle = idx * sliceAngle;
            const glow = !spinning && (attemptCount >= 2 || isAssisted) && vocab._id === targetVocab._id;
            return (
              <div
                key={vocab._id}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-102px)`,
                }}
              >
                <button
                  type="button"
                  disabled={spinning}
                  aria-label={`Ô ${vocab.english}`}
                  onClick={() => handlePick(vocab)}
                  style={{
                    transform: `rotate(${-(wheelDeg + angle)}deg)`,
                    transition: spinning ? 'transform 1.1s cubic-bezier(0.18, 0.82, 0.22, 1)' : 'transform 0.2s',
                  }}
                  className={`w-[82px] h-[82px] sm:w-[92px] sm:h-[92px] rounded-2xl bg-white/95 border-3 flex flex-col items-center justify-center p-1.5 shadow-lg cursor-pointer hover:scale-105 active:scale-95 ${
                    wobbleId === vocab._id ? 'animate-gentle-wobble border-rose-500 ring-4 ring-rose-300' : 'border-white'
                  } ${glow ? 'ring-6 ring-amber-300 border-amber-400 scale-110' : ''}`}
                >
                  <VocabImage vocab={vocab} className="w-11 h-11 sm:w-12 sm:h-12 object-contain" />
                  <span className="text-[11px] font-black text-slate-800 capitalize truncate max-w-[92%]">
                    {vocab.english}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Nút tâm Spin! */}
        <button
          type="button"
          disabled={spinning}
          onClick={spinWheel}
          aria-label="Xoay vòng quay"
          className="absolute z-20 w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 border-4 border-white shadow-xl flex flex-col items-center justify-center text-slate-950 font-black cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-70"
        >
          <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
          <span className="text-xs uppercase tracking-wider">Spin!</span>
        </button>
      </div>
    </div>
  );
};

export default PrizeWheelGame;
