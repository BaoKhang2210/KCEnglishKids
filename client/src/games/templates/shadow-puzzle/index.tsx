import React, { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '../../core/types';
import { VocabImage } from '../../shared/VocabImage';
import { GamePrompt } from '../../shared/GamePrompt';
import { useManagedTimeout } from '../../shared/useManagedTimeout';
import { speakText } from '../../core/audioPhrases';
import { sfx } from '../../../utils/audio';
import type { Vocabulary } from '../../../types';

const HIDING_SPOTS = [
  { x: 24, y: 34, label: '🌲 Sau gốc thông' },
  { x: 76, y: 32, label: '🌙 Dưới ánh trăng' },
  { x: 26, y: 72, label: '🍄 Cạnh nấm phát sáng' },
  { x: 74, y: 70, label: '🌿 Trong bụi đom đóm' },
];

export const ShadowPuzzleGame: React.FC<GameComponentProps> = ({
  targetVocab,
  options,
  attemptCount,
  isAssisted,
  onCorrect,
  onWrong,
  onReplayAudio,
}) => {
  const scheduleTimeout = useManagedTimeout();
  const arenaRef = useRef<HTMLDivElement | null>(null);
  // Sticky Spotlight position in percentage (0-100) so it works across all screen sizes and never turns off when finger lifts
  const [beamPos, setBeamPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [illuminatedId, setIlluminatedId] = useState<string | null>(null);
  const [foundTarget, setFoundTarget] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  useEffect(() => {
    setFoundTarget(false);
    setIlluminatedId(null);
    setWrongId(null);
    setBeamPos({ x: 50, y: 50 });
  }, [targetVocab._id]);

  const updateSpotlightFromEvent = (clientX: number, clientY: number) => {
    const rect = arenaRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const x = Math.max(8, Math.min(92, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100));
    setBeamPos({ x, y });

    // Check if spotlight beam is close to any hiding spot
    options.forEach((vocab, idx) => {
      const spot = HIDING_SPOTS[idx % HIDING_SPOTS.length];
      const dist = Math.hypot(x - spot.x, y - spot.y);
      if (dist < 22 && illuminatedId !== vocab._id) {
        setIlluminatedId(vocab._id);
      }
    });
  };

  const handleSelectHiddenFriend = (vocab: Vocabulary, idx: number) => {
    if (foundTarget) return;
    const spot = HIDING_SPOTS[idx % HIDING_SPOTS.length];
    setBeamPos({ x: spot.x, y: spot.y });
    setIlluminatedId(vocab._id);
    void speakText(vocab.english, vocab.audioUrl);

    if (vocab._id === targetVocab._id) {
      setFoundTarget(true);
      sfx.playSuccess();
      scheduleTimeout(onCorrect, 850);
    } else {
      setWrongId(vocab._id);
      scheduleTimeout(() => setWrongId(null), 500);
      onWrong(vocab._id);
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col justify-between py-1 select-none overflow-hidden">
      <GamePrompt
        text={
          <>
            Shine the Magic Flashlight on <span className="text-amber-300 font-black capitalize">{targetVocab.english}</span>! 🔦
          </>
        }
        subtext={`Lia đèn pin hoặc chạm vào bóng tối để tìm "${targetVocab.english}" (${targetVocab.vietnamese || 'bạn đang trốn'})!`}
        onSpeak={onReplayAudio}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              const targetIdx = options.findIndex((o) => o._id === targetVocab._id);
              if (targetIdx >= 0) {
                const spot = HIDING_SPOTS[targetIdx % HIDING_SPOTS.length];
                setBeamPos({ x: spot.x, y: spot.y });
                setIlluminatedId(targetVocab._id);
              }
            }}
            className="px-3 py-1.5 rounded-full bg-amber-400/25 hover:bg-amber-400/40 border border-amber-300/50 text-xs font-black text-amber-200 cursor-pointer"
          >
            🔦 Gợi ý rọi đèn
          </button>
        }
      />

      {/* Night Safari Arena */}
      <div
        ref={arenaRef}
        onPointerDown={(e) => updateSpotlightFromEvent(e.clientX, e.clientY)}
        onPointerMove={(e) => updateSpotlightFromEvent(e.clientX, e.clientY)}
        className={`relative flex-1 w-full max-w-4xl mx-auto my-1.5 rounded-3xl border-4 overflow-hidden shadow-2xl transition-colors duration-500 touch-none ${
          foundTarget
            ? 'border-amber-300 bg-gradient-to-b from-indigo-800 via-emerald-800 to-teal-900'
            : 'border-indigo-400/40 bg-slate-950'
        }`}
      >
        {/* Ambient Fireflies */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[
            { left: '15%', top: '20%' },
            { left: '82%', top: '18%' },
            { left: '48%', top: '26%' },
            { left: '18%', top: '80%' },
            { left: '84%', top: '78%' },
            { left: '52%', top: '74%' },
          ].map((f, i) => (
            <span
              key={i}
              style={{ left: f.left, top: f.top, animationDelay: `${i * 0.35}s` }}
              className="absolute w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-[0_0_12px_4px_rgba(253,224,71,0.85)] animate-ping"
            />
          ))}
        </div>

        {/* Dynamic Sticky Flashlight Overlay */}
        {!foundTarget && (
          <div
            className="pointer-events-none absolute inset-0 z-10 transition-all duration-75"
            style={{
              background: `radial-gradient(circle 145px at ${beamPos.x}% ${beamPos.y}%, rgba(254, 240, 138, 0.28) 0%, rgba(30, 27, 75, 0.68) 62%, rgba(2, 6, 23, 0.93) 100%)`,
            }}
          />
        )}

        {/* Hidden Friends in the Night Forest */}
        {options.map((vocab, idx) => {
          const spot = HIDING_SPOTS[idx % HIDING_SPOTS.length];
          const isTarget = vocab._id === targetVocab._id;
          const dist = Math.hypot(beamPos.x - spot.x, beamPos.y - spot.y);
          const isLit =
            foundTarget ||
            illuminatedId === vocab._id ||
            dist < 25 ||
            ((attemptCount >= 2 || isAssisted) && isTarget);
          const isWrong = wrongId === vocab._id;

          return (
            <button
              key={vocab._id}
              type="button"
              onClick={() => handleSelectHiddenFriend(vocab, idx)}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 w-[clamp(110px,22vmin,155px)] h-[clamp(120px,24vmin,168px)] rounded-3xl border-4 flex flex-col items-center justify-between p-2.5 cursor-pointer transition-all duration-300 ${
                foundTarget && isTarget
                  ? 'bg-amber-300/30 border-amber-300 ring-8 ring-amber-300/60 scale-115 shadow-[0_0_40px_rgba(251,191,36,0.8)]'
                  : isWrong
                  ? 'bg-rose-500/30 border-rose-400 animate-gentle-wobble'
                  : isLit
                  ? 'bg-amber-200/20 border-amber-300/90 shadow-[0_0_30px_rgba(253,224,71,0.55)] scale-105'
                  : 'bg-slate-900/75 border-indigo-400/30 hover:border-amber-200/60'
              }`}
            >
              <span className="text-[10px] font-black text-amber-200/90 bg-slate-950/70 px-2 py-0.5 rounded-full truncate max-w-full">
                {spot.label}
              </span>

              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center my-auto">
                <VocabImage
                  vocab={vocab}
                  silhouette={!isLit}
                  className={`w-full h-full transition-all duration-300 ${
                    isLit ? 'scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]' : 'opacity-65'
                  }`}
                />
                {!isLit && (
                  <span className="pointer-events-none absolute text-lg animate-pulse">👀</span>
                )}
              </div>

              <span
                className={`w-full rounded-xl px-2 py-1 text-xs sm:text-sm font-black capitalize truncate transition-colors ${
                  isLit
                    ? 'bg-amber-300 text-slate-950 shadow-sm'
                    : 'bg-slate-950/80 text-indigo-200/75'
                }`}
              >
                {isLit ? vocab.english : '???'}
              </span>
            </button>
          );
        })}

        {/* Flashlight Handle Indicator at Bottom */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-slate-900/85 border border-amber-300/40 px-4 py-1 text-xs font-black text-amber-200 shadow-lg">
          <span>🔦 Đèn Pin Phép Thuật</span>
          <span className="text-indigo-200 font-bold">
            {foundTarget ? '• Đã tìm thấy! 🎉' : '• Chạm hoặc lia đèn để soi sáng'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ShadowPuzzleGame;
