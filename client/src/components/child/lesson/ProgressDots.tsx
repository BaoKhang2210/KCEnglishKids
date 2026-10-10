import React from 'react';

interface ProgressDotsProps {
  total: number;
  current: number;
  color?: 'amber' | 'teal' | 'purple';
  className?: string;
}

/**
 * ProgressDots: Located at the top of content area (NOT in TopBar).
 * Minimum size >= 16px, without confusing "1/8" text.
 * Switches to a progress bar if items > 10.
 */
export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  color = 'amber',
  className = '',
}) => {
  if (total <= 0) return null;

  const colorStyles = {
    amber: {
      active: 'bg-amber-400 border-amber-500 scale-110 shadow-xs ring-2 ring-amber-200',
      done: 'bg-emerald-400 border-emerald-500',
      inactive: 'bg-slate-200 border-slate-300',
    },
    teal: {
      active: 'bg-teal-400 border-teal-500 scale-110 shadow-xs ring-2 ring-teal-200',
      done: 'bg-emerald-400 border-emerald-500',
      inactive: 'bg-slate-200 border-slate-300',
    },
    purple: {
      active: 'bg-purple-500 border-purple-600 scale-110 shadow-xs ring-2 ring-purple-200',
      done: 'bg-emerald-400 border-emerald-500',
      inactive: 'bg-slate-200 border-slate-300',
    },
  };

  // If > 10 items, render clean progress bar
  if (total > 10) {
    const pct = Math.min(100, Math.round(((current + 1) / total) * 100));
    return (
      <div className={`w-full max-w-xs mx-auto py-2 px-4 ${className}`}>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={`Tiến độ: bước ${current + 1} trên ${total}`}
      className={`flex items-center justify-center gap-2 sm:gap-2.5 py-1.5 flex-shrink-0 ${className}`}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const isCurrent = idx === current;
        const isDone = idx < current;
        const style = isCurrent
          ? colorStyles[color].active
          : isDone
          ? colorStyles[color].done
          : colorStyles[color].inactive;

        return (
          <div
            key={idx}
            style={{ width: '16px', height: '16px' }}
            className={`rounded-full border-2 transition-all duration-300 ${style}`}
          />
        );
      })}
    </div>
  );
};
