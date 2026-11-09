import React from 'react';
import { sfx } from '../../utils/audio';

export type SpeedTier = 0 | 1 | 2;

export const SPEED_OPTIONS: Array<{ key: string; label: string; emoji: string; mul: number }> = [
  { key: 'slow', label: 'Slow', emoji: '🐢', mul: 0.65 },
  { key: 'norm', label: 'Normal', emoji: '🐰', mul: 1 },
  { key: 'fast', label: 'Fast', emoji: '⚡', mul: 1.55 },
];

interface GameSpeedControlProps {
  value?: SpeedTier;
  speed?: number;
  onChange: (next: any) => void;
  disabled?: boolean;
}

export const GameSpeedControl: React.FC<GameSpeedControlProps> = ({
  value,
  speed,
  onChange,
  disabled,
}) => {
  const activeTier: SpeedTier =
    value !== undefined
      ? value
      : speed !== undefined
      ? speed < 0.85
        ? 0
        : speed > 1.25
        ? 2
        : 1
      : 1;

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full bg-slate-950/75 border border-white/20 p-1 backdrop-blur-md shadow-md"
      role="group"
      aria-label="Tốc độ trò chơi"
    >
      {SPEED_OPTIONS.map((opt, idx) => {
        const active = activeTier === idx;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => {
              sfx.playPop();
              if (value !== undefined) {
                onChange(idx as SpeedTier);
              } else {
                onChange(opt.mul);
              }
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black transition-all cursor-pointer disabled:opacity-45 ${
              active
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'text-indigo-100 hover:bg-white/10'
            }`}
          >
            <span aria-hidden>{opt.emoji}</span>
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
