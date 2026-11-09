import React, { useEffect, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { GameSpeedControl } from '../../shared/GameSpeedControl';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';
import { sfx } from '../../../utils/audio';
import type { Vocabulary } from '../../../types';

const BUBBLE_RING_COLORS = [
  'from-sky-400/85 to-blue-600/85 border-sky-200',
  'from-rose-400/85 to-pink-600/85 border-rose-200',
  'from-amber-400/85 to-orange-600/85 border-amber-200',
  'from-emerald-400/85 to-teal-600/85 border-emerald-200',
];

export const PrizeWheelGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const [speed, setSpeed] = useState<number>(1);
  const [splashedId, setSplashedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [cannonAngle, setCannonAngle] = useState<number>(0);
  const [shooting, setShooting] = useState(false);

  useEffect(() => {
    setSplashedId(null);
    setWrongId(null);
    setCannonAngle(0);
    setShooting(false);
  }, [targetVocab._id]);

  const count = Math.max(options.length, 1);
  const spinDurationSec = Math.round(14 / speed);

  const handleSplashTarget = (vocab: Vocabulary, idx: number) => {
    if (splashedId) return;
    // Aim cannon subtly toward tapped target
    const angleOffset = (idx - (count - 1) / 2) * 18;
    setCannonAngle(angleOffset);
    setShooting(true);
    scheduleTimeout(() => setShooting(false), 320);

    sfx.playPop();
    void speakText(vocab.english, vocab.audioUrl);

    if (vocab._id === targetVocab._id) {
      setSplashedId(vocab._id);
      sfx.playSuccess();
      scheduleTimeout(onCorrect, 750);
    } else {
      setWrongId(vocab._id);
      scheduleTimeout(() => setWrongId(null), 480);
      onWrong(vocab._id);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col items-center justify-between py-1 select-none overflow-hidden">
      <style>{`
        @keyframes kc-wheel-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes kc-wheel-counter-orbit {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
      `}</style>

      <GamePrompt
        text={
          <>
            Splash the <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span> on the Water Wheel! 💦
          </>
        }
        subtext={`Chạm trực tiếp vào "${targetVocab.english}" (${targetVocab.vietnamese || 'mục tiêu'}) đang quay để bắn pháo nước!`}
        onSpeak={onReplayAudio}
        rightSlot={<GameSpeedControl speed={speed} onChange={setSpeed} />}
      />

      {/* Rotating Carnival Water Wheel */}
      <div className="relative flex-1 flex items-center justify-center w-full min-h-0">
        <div className="relative w-[min(64vmin,320px)] h-[min(64vmin,320px)] flex items-center justify-center">
          {/* Outer Water Wheel Rim & Spokes */}
          <div
            className="relative w-full h-full rounded-full border-8 border-cyan-300/70 bg-gradient-to-br from-sky-500/20 via-indigo-900/40 to-cyan-500/20 shadow-[0_0_40px_rgba(56,189,248,0.35)]"
            style={{
              animation: `kc-wheel-orbit ${spinDurationSec}s linear infinite`,
              animationPlayState: splashedId ? 'paused' : 'running',
            }}
          >
            {/* Wheel Spokes */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-full h-1.5 bg-cyan-300/40" />
              <div className="h-full w-1.5 bg-cyan-300/40" />
            </div>

            {/* Orbiting Bubble Targets */}
            {options.map((vocab, idx) => {
              const angleRad = ((idx * (360 / count) - 90) * Math.PI) / 180;
              const radiusPct = 38;
              const x = 50 + Math.cos(angleRad) * radiusPct;
              const y = 50 + Math.sin(angleRad) * radiusPct;
              const isTarget = vocab._id === targetVocab._id;
              const isSplashed = splashedId === vocab._id;
              const isWrong = wrongId === vocab._id;
              const showHint = (attemptCount >= 2 || isAssisted) && isTarget;
              const colorCls = BUBBLE_RING_COLORS[idx % BUBBLE_RING_COLORS.length];

              return (
                <button
                  key={vocab._id}
                  type="button"
                  onClick={() => handleSplashTarget(vocab, idx)}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    animation: `kc-wheel-counter-orbit ${spinDurationSec}s linear infinite`,
                    animationPlayState: splashedId ? 'paused' : 'running',
                  }}
                  className={`absolute w-[clamp(86px,18vmin,118px)] h-[clamp(86px,18vmin,118px)] rounded-full border-4 bg-gradient-to-br ${colorCls} flex flex-col items-center justify-center p-2 shadow-2xl cursor-pointer transition-transform ${isSplashed
                    ? 'scale-125 ring-8 ring-cyan-200 border-white z-30'
                    : showHint
                      ? 'ring-8 ring-amber-300 border-amber-200 scale-110'
                      : isWrong
                        ? 'border-rose-400 bg-rose-600/80'
                        : 'hover:scale-110 active:scale-95'
                    }`}
                >
                  <span className="pointer-events-none absolute top-1.5 left-3 w-6 h-2.5 rounded-full bg-white/60 -rotate-12" />
                  <VocabImage vocab={vocab} className="w-12 h-12 sm:w-14 sm:h-14 pointer-events-none" />
                  <span className="mt-0.5 px-2 py-0.5 rounded-full bg-slate-950/75 text-[10px] sm:text-xs font-black text-white capitalize truncate max-w-[92%]">
                    {vocab.english}
                  </span>

                  {/* Water Splash Burst on Hit */}
                  {isSplashed && (
                    <div className="pointer-events-none absolute -inset-4 flex items-center justify-center text-3xl animate-ping">
                      💦
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center Hub Emblem */}
          <div className="pointer-events-none absolute w-20 h-20 rounded-full border-4 border-amber-200 bg-gradient-to-b from-amber-300 to-orange-500 shadow-xl flex flex-col items-center justify-center text-slate-950 font-black text-xs">
            <span className="text-xl leading-none">🎡</span>
            <span>SPLASH!</span>
          </div>
        </div>
      </div>

      {/* Bottom Water Cannon Turret */}
      <div className="relative z-20 flex flex-col items-center pb-1">
        {shooting && (
          <div className="pointer-events-none -mb-2 text-2xl animate-bounce">🫧💦🫧</div>
        )}
        <div
          style={{ transform: `rotate(${cannonAngle}deg)` }}
          className="w-16 h-12 rounded-t-3xl border-4 border-cyan-200 bg-gradient-to-b from-cyan-400 to-blue-600 shadow-lg flex flex-col items-center justify-center transition-transform duration-200"
        >
          <span className="text-lg leading-none">🔫</span>
          <span className="text-[9px] font-black text-white uppercase">Pháo Nước</span>
        </div>
      </div>
    </div>
  );
};

export default PrizeWheelGame;
