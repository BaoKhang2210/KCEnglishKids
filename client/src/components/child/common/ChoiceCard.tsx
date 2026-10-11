import React from 'react';
import { Check } from 'lucide-react';
import { WordImage } from './WordImage';
import type { Vocabulary } from '../../../types';

interface ChoiceCardProps {
  item: Vocabulary | { english: string; vietnamese?: string; imageUrl?: string };
  size: number; // width and height in px computed from useFitGrid
  isSelected?: boolean;
  status?: 'idle' | 'hint' | 'correct' | 'wrong';
  onClick: () => void;
  disabled?: boolean;
  showCaption?: boolean; // English caption
  showVietnamese?: boolean;
}

/**
 * ChoiceCard: Massive responsive touch card designed specifically for 3-4yo toddlers.
 * - Side length >= 120px (often 240px - 380px based on container).
 * - Image area occupies >= 75% of height.
 * - Caption label (English) occupies >= 22% of height, size >= 24px - 36px.
 * - Vietnamese caption is hidden by default to avoid visual clutter.
 * - Glowing hint border >= 8px with gentle pulse, never spills over neighbours.
 */
export const ChoiceCard: React.FC<ChoiceCardProps> = ({
  item,
  size,
  isSelected = false,
  status = 'idle',
  onClick,
  disabled = false,
  showCaption = true,
  showVietnamese = false,
}) => {
  // Compute caption font size based on card size: clamp(22px, 0.13 * size, 38px)
  const fontSize = Math.max(22, Math.min(38, Math.round(size * 0.13)));

  // Status-based styling
  let borderStyle = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-102';
  let extraEffect = '';

  if (status === 'hint') {
    // 8px glowing beacon without spilling
    borderStyle = 'border-amber-400 bg-amber-50 ring-8 ring-amber-300 shadow-xl';
    extraEffect = 'animate-soft-bounce';
  } else if (status === 'correct' || (isSelected && status === 'correct')) {
    borderStyle = 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 shadow-2xl';
    extraEffect = 'scale-104';
  } else if (status === 'wrong' || (isSelected && status === 'wrong')) {
    borderStyle = 'border-slate-300 bg-slate-100 opacity-60';
    extraEffect = 'animate-gentle-wobble';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Chọn ${item.english}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      className={`rounded-4xl border-4 p-3 sm:p-4 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 relative overflow-hidden select-none shadow-lg group ${borderStyle} ${extraEffect}`}
    >
      {/* ── 1. Image Area (>= 75% of card size) ── */}
      <div className="w-full flex-1 min-h-0 flex items-center justify-center p-1.5 overflow-hidden rounded-2xl bg-amber-50/50 group-hover:bg-amber-100/60 transition-colors">
        <WordImage word={item} />
      </div>

      {/* ── 2. Caption Area (>= 22% of card size, text >= 24px) ── */}
      {showCaption && (
        <div className="w-full flex flex-col items-center justify-center pt-2 min-h-[38px] flex-shrink-0">
          <span
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.15 }}
            className="font-black text-slate-800 uppercase tracking-tight text-center truncate max-w-full"
          >
            {item.english}
          </span>

          {showVietnamese && item.vietnamese && (
            <span className="text-xs sm:text-sm font-bold text-slate-500 truncate mt-0.5">
              {item.vietnamese}
            </span>
          )}
        </div>
      )}

      {/* Correct checkmark badge */}
      {status === 'correct' && (
        <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
          <Check className="w-6 h-6 stroke-[3.5]" />
        </div>
      )}
    </button>
  );
};
