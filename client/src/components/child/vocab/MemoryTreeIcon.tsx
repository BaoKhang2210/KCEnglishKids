import React from 'react';

interface MemoryTreeIconProps {
  level: number;
  maxLevel: number;
  mastered: boolean;
  className?: string;
}

/**
 * Memory growth is shown as a tree, never a number:
 * seed → sprout → small tree → big tree → flower → fruit (mastered).
 */
export const MemoryTreeIcon: React.FC<MemoryTreeIconProps> = ({ level, maxLevel, mastered, className = '' }) => {
  const stage = mastered || level >= maxLevel ? 5 : Math.max(0, Math.min(4, level));
  return (
    <span className={`inline-grid place-items-center ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" className="h-full w-full" fill="none" focusable="false">
        <ellipse cx="16" cy="28" rx="10" ry="2.6" fill="#A16207" opacity="0.25" />
        {stage === 0 && (
          <>
            <ellipse cx="16" cy="25.5" rx="4.2" ry="3" fill="#B45309" />
            <path d="M16 22.5c0-1.6.9-2.7 2.4-3" stroke="#65A30D" strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {stage >= 1 && (
          <path d="M16 26V15" stroke="#92400E" strokeWidth={stage === 1 ? 1.8 : 2.6} strokeLinecap="round" />
        )}
        {stage >= 1 && (
          <>
            <path d="M16 19c-3.6 0-6-2.2-6-5.4 3.4-.4 6 1.7 6 5.4Z" fill="#65A30D" />
            <path d="M16 17c3.2 0 5.4-2 5.4-4.8-3-.4-5.4 1.5-5.4 4.8Z" fill="#84CC16" />
          </>
        )}
        {stage >= 2 && <circle cx="16" cy="11.5" r={stage === 2 ? 4.6 : 6.2} fill="#4D7C0F" />}
        {stage >= 3 && <circle cx="11" cy="9" r="3.6" fill="#65A30D" />}
        {stage >= 3 && <circle cx="21" cy="9" r="3.6" fill="#65A30D" />}
        {stage === 4 && (
          <>
            <circle cx="12" cy="7.5" r="2" fill="#F9A8D4" />
            <circle cx="16" cy="6" r="2.1" fill="#F472B6" />
            <circle cx="20" cy="7.5" r="2" fill="#F9A8D4" />
            <circle cx="16" cy="9.4" r="1.7" fill="#FDE68A" />
          </>
        )}
        {stage === 5 && (
          <>
            <circle cx="11.5" cy="9.5" r="2.1" fill="#F97316" />
            <circle cx="19.5" cy="8.6" r="2.3" fill="#EF4444" />
            <circle cx="16" cy="13.2" r="2" fill="#F59E0B" />
          </>
        )}
      </svg>
    </span>
  );
};

const STAGE_LABELS = ['Hạt mầm', 'Mầm non', 'Cây nhỏ', 'Cây lớn', 'Ra hoa', 'Quả ngọt'];

export const memoryTreeLabel = (level: number, maxLevel: number, mastered: boolean) =>
  STAGE_LABELS[mastered || level >= maxLevel ? 5 : Math.max(0, Math.min(4, level))];
