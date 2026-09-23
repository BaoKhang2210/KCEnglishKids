import React, { useState } from 'react';
import { sfx } from '../../utils/audio';

export type MascotState =
  | 'waving'
  | 'happy'
  | 'thinking'
  | 'encouraging'
  | 'celebrating'
  | 'listening'
  | 'reading';

interface KokoMascotProps {
  state?: MascotState;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speechBubble?: string;
  bubblePosition?: 'top' | 'right' | 'left';
  interactive?: boolean;
  className?: string;
  onClick?: () => void;
}

export const KokoMascot: React.FC<KokoMascotProps> = ({
  state = 'happy',
  size = 'md',
  speechBubble,
  bubblePosition = 'top',
  interactive = true,
  className = '',
  onClick
}) => {
  const [isGiggling, setIsGiggling] = useState(false);

  const handleTap = () => {
    if (interactive) {
      sfx.playPop();
      setIsGiggling(true);
      setTimeout(() => setIsGiggling(false), 800);
    }
    if (onClick) onClick();
  };

  const sizeMap = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24 sm:w-28 sm:h-28',
    lg: 'w-32 h-32 sm:w-40 sm:h-40',
    xl: 'w-48 h-48 sm:w-56 sm:h-56'
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      {/* Speech Bubble */}
      {speechBubble && (
        <div
          className={`absolute z-20 px-4 py-2 rounded-2xl bg-white border-3 border-amber-300 shadow-lg text-slate-800 font-black text-xs sm:text-sm animate-pop-in whitespace-nowrap pointer-events-none ${
            bubblePosition === 'top'
              ? '-top-12 left-1/2 -translate-x-1/2 after:content-[""] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-white'
              : bubblePosition === 'right'
              ? 'left-full ml-3 top-1/2 -translate-y-1/2 after:content-[""] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-transparent after:border-r-white'
              : 'right-full mr-3 top-1/2 -translate-y-1/2 after:content-[""] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-8 after:border-transparent after:border-l-white'
          }`}
        >
          {speechBubble}
        </div>
      )}

      {/* Mascot Vector Illustration Container */}
      <div
        onClick={handleTap}
        className={`${sizeMap[size]} transition-transform duration-200 ${
          interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
        } ${isGiggling ? 'animate-gentle-wobble scale-110' : ''}`}
      >
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full filter drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Outer Glow */}
          <circle cx="80" cy="80" r="76" fill="#FEF3C7" fillOpacity="0.4" />

          {/* Bear Left Ear */}
          <circle cx="42" cy="46" r="22" fill="#D97706" />
          <circle cx="42" cy="46" r="13" fill="#FDE68A" />

          {/* Bear Right Ear */}
          <circle cx="118" cy="46" r="22" fill="#D97706" />
          <circle cx="118" cy="46" r="13" fill="#FDE68A" />

          {/* Bear Head */}
          <rect x="28" y="38" width="104" height="92" rx="46" fill="#F59E0B" />

          {/* Cheerful Rosy Cheeks */}
          <ellipse cx="44" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.75" />
          <ellipse cx="116" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.75" />

          {/* Snout Muzzle Area */}
          <ellipse cx="80" cy="95" rx="26" ry="20" fill="#FFFBEB" />

          {/* Nose */}
          <ellipse cx="80" cy="88" rx="8" ry="6" fill="#78350F" />
          <ellipse cx="78" cy="86" rx="2.5" ry="1.5" fill="#FFFFFF" fillOpacity="0.8" />

          {/* Eyes & Expressions based on Mascot State */}
          {state === 'thinking' ? (
            /* Curious Thinking Eyes (Looking up right) */
            <>
              <circle cx="56" cy="70" r="6" fill="#78350F" />
              <circle cx="58" cy="68" r="2.5" fill="#FFFFFF" />
              <circle cx="104" cy="68" r="6" fill="#78350F" />
              <circle cx="106" cy="66" r="2.5" fill="#FFFFFF" />
              {/* Curious small mouth */}
              <path d="M 76 100 Q 80 104 84 100" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
              {/* Question Spark */}
              <text x="122" y="44" fontSize="24" fontWeight="black" fill="#F59E0B">?</text>
            </>
          ) : state === 'celebrating' ? (
            /* Starry Happy Eyes */
            <>
              <text x="50" y="76" fontSize="18" textAnchor="middle">⭐</text>
              <text x="110" y="76" fontSize="18" textAnchor="middle">⭐</text>
              {/* Big Joyful Open Mouth */}
              <path d="M 70 96 Q 80 112 90 96 Z" fill="#EF4444" stroke="#78350F" strokeWidth="2" />
              <path d="M 74 102 Q 80 108 86 102" fill="#FCA5A5" />
              {/* Party Crown / Cone */}
              <polygon points="68,26 80,4 92,26" fill="#EC4899" />
              <circle cx="80" cy="4" r="4" fill="#FBBF24" />
            </>
          ) : state === 'encouraging' ? (
            /* Winking / Encouraging Eyes */
            <>
              <path d="M 50 72 Q 56 64 62 72" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
              <circle cx="104" cy="72" r="6" fill="#78350F" />
              <circle cx="106" cy="70" r="2.5" fill="#FFFFFF" />
              {/* Confident Smile */}
              <path d="M 73 97 Q 80 107 87 97" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
            </>
          ) : state === 'listening' ? (
            /* Listening with Headphone Vibes */
            <>
              <circle cx="56" cy="72" r="6" fill="#78350F" />
              <circle cx="58" cy="70" r="2.5" fill="#FFFFFF" />
              <circle cx="104" cy="72" r="6" fill="#78350F" />
              <circle cx="106" cy="70" r="2.5" fill="#FFFFFF" />
              <path d="M 72 97 Q 80 105 88 97" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
              {/* Headphones Band */}
              <path d="M 28 66 A 52 52 0 0 1 132 66" stroke="#0284C7" strokeWidth="8" strokeLinecap="round" fill="none" />
              <rect x="22" y="58" width="12" height="24" rx="6" fill="#0284C7" />
              <rect x="126" y="58" width="12" height="24" rx="6" fill="#0284C7" />
              <circle cx="28" cy="70" r="3" fill="#38BDF8" />
              <circle cx="132" cy="70" r="3" fill="#38BDF8" />
            </>
          ) : (
            /* Default Happy / Waving Eyes */
            <>
              <circle cx="56" cy="72" r="6" fill="#78350F" />
              <circle cx="58" cy="70" r="2.5" fill="#FFFFFF" />
              <circle cx="104" cy="72" r="6" fill="#78350F" />
              <circle cx="106" cy="70" r="2.5" fill="#FFFFFF" />
              {/* Cheerful Friendly Smile */}
              <path d="M 72 97 Q 80 106 88 97" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
            </>
          )}

          {/* Waving Paw Animation */}
          {state === 'waving' && (
            <g className="animate-mascot-wave">
              <ellipse cx="138" cy="78" rx="13" ry="10" fill="#F59E0B" />
              <circle cx="138" cy="78" r="6" fill="#FDE68A" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
