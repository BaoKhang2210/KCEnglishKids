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
          className={`absolute z-20 px-4 py-2 rounded-2xl bg-white border-3 border-amber-300 shadow-lg text-slate-800 font-black text-sm animate-pop-in whitespace-nowrap pointer-events-none ${
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
          <rect x="28" y="38" width="104" height="92" rx="46" fill="#F59E0B" stroke="#D97706" strokeWidth="2.5" />

          {/* Cheerful Rosy Cheeks */}
          <ellipse cx="44" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.75" />
          <ellipse cx="116" cy="94" rx="9" ry="6" fill="#F472B6" fillOpacity="0.75" />

          {/* Snout Muzzle Area */}
          <ellipse cx="80" cy="95" rx="26" ry="20" fill="#FFFBEB" />

          {/* Nose */}
          <ellipse cx="80" cy="88" rx="8" ry="6" fill="#78350F" />
          <ellipse cx="78" cy="86" rx="2.5" ry="1.5" fill="#FFFFFF" fillOpacity="0.85" />

          {/* Eyes & Expressions based on Mascot State */}
          {state === 'thinking' ? (
            /* Curious Thinking Eyes (Glancing up & right) */
            <>
              {/* Left Eye */}
              <circle cx="58" cy="68" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="60.5" cy="65.5" r="3" fill="#FFFFFF" />
              <circle cx="55.5" cy="70.5" r="1.3" fill="#FFFFFF" />
              {/* Right Eye */}
              <circle cx="106" cy="67" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="108.5" cy="64.5" r="3" fill="#FFFFFF" />
              <circle cx="103.5" cy="69.5" r="1.3" fill="#FFFFFF" />
              {/* Curious small mouth */}
              <path d="M 76 100 Q 80 104 84 100" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              {/* Question Spark */}
              <text x="122" y="44" fontSize="24" fontWeight="black" fill="#D97706">?</text>
            </>
          ) : state === 'celebrating' ? (
            /* Joyful Vector Starry Eyes (Flicker-free vector SVGs, never lost on any screen) */
            <>
              {/* Left Star Eye */}
              <polygon
                points="56,61.5 58.8,67.5 65.4,68.2 60.5,72.8 61.8,79.2 56,75.8 50.2,79.2 51.5,72.8 46.6,68.2 53.2,67.5"
                fill="#FBBF24"
                stroke="#78350F"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="54.5" cy="68.5" r="2.2" fill="#FFFFFF" />
              <circle cx="58.5" cy="73.5" r="1.1" fill="#FFFFFF" />
              {/* Right Star Eye */}
              <polygon
                points="104,61.5 106.8,67.5 113.4,68.2 108.5,72.8 109.8,79.2 104,75.8 98.2,79.2 99.5,72.8 94.6,68.2 101.2,67.5"
                fill="#FBBF24"
                stroke="#78350F"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx="102.5" cy="68.5" r="2.2" fill="#FFFFFF" />
              <circle cx="106.5" cy="73.5" r="1.1" fill="#FFFFFF" />
              {/* Big Joyful Open Mouth */}
              <path d="M 70 96 Q 80 113 90 96 Z" fill="#EF4444" stroke="#78350F" strokeWidth="2.5" />
              <path d="M 74 103 Q 80 109 86 103" fill="#FCA5A5" />
              {/* Party Crown / Cone */}
              <polygon points="68,26 80,4 92,26" fill="#EC4899" stroke="#DB2777" strokeWidth="1.5" />
              <circle cx="80" cy="4" r="4.5" fill="#FBBF24" />
            </>
          ) : state === 'encouraging' ? (
            /* Winking / Encouraging Eyes — clear expressive curved wink + wide sparkling right eye */
            <>
              {/* Left Eye: Clear bold wink arc with eyelash detail */}
              <path d="M 46 72 Q 56 61 66 72" stroke="#291809" strokeWidth="4.5" strokeLinecap="round" fill="none" />
              <path d="M 64 69 L 68 66" stroke="#291809" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="56" cy="65" r="1.5" fill="#FBBF24" />
              {/* Right Eye: Big, wide open, sparkling */}
              <circle cx="104" cy="71" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="106.5" cy="68.5" r="3" fill="#FFFFFF" />
              <circle cx="101.5" cy="73.5" r="1.3" fill="#FFFFFF" />
              {/* Confident Smile */}
              <path d="M 73 97 Q 80 107 87 97" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </>
          ) : state === 'listening' ? (
            /* Listening with Headphone Vibes */
            <>
              {/* Left Eye */}
              <circle cx="56" cy="71" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="58.5" cy="68.5" r="3" fill="#FFFFFF" />
              <circle cx="53.5" cy="73.5" r="1.3" fill="#FFFFFF" />
              {/* Right Eye */}
              <circle cx="104" cy="71" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="106.5" cy="68.5" r="3" fill="#FFFFFF" />
              <circle cx="101.5" cy="73.5" r="1.3" fill="#FFFFFF" />
              {/* Smile */}
              <path d="M 72 97 Q 80 105 88 97" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Headphones Band */}
              <path d="M 28 66 A 52 52 0 0 1 132 66" stroke="#0284C7" strokeWidth="8" strokeLinecap="round" fill="none" />
              <rect x="22" y="58" width="12" height="24" rx="6" fill="#0284C7" />
              <rect x="126" y="58" width="12" height="24" rx="6" fill="#0284C7" />
              <circle cx="28" cy="70" r="3" fill="#38BDF8" />
              <circle cx="132" cy="70" r="3" fill="#38BDF8" />
            </>
          ) : state === 'reading' ? (
            /* Sweet Reading Eyes with cute study glasses */
            <>
              {/* Left Eye */}
              <circle cx="56" cy="73" r="6.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="58" cy="71.5" r="2.2" fill="#FFFFFF" />
              {/* Right Eye */}
              <circle cx="104" cy="73" r="6.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="106" cy="71.5" r="2.2" fill="#FFFFFF" />
              {/* Glasses Frame */}
              <circle cx="56" cy="72" r="15" stroke="#0369A1" strokeWidth="3" fill="none" opacity="0.9" />
              <circle cx="104" cy="72" r="15" stroke="#0369A1" strokeWidth="3" fill="none" opacity="0.9" />
              <path d="M 71 72 Q 80 67 89 72" stroke="#0369A1" strokeWidth="3" strokeLinecap="round" fill="none" />
              {/* Smile */}
              <path d="M 74 97 Q 80 104 86 97" stroke="#78350F" strokeWidth="3" strokeLinecap="round" fill="none" />
            </>
          ) : (
            /* Default Happy / Waving Eyes — Big, deep glossy eyes with dual catchlights */
            <>
              {/* Left Eye */}
              <circle cx="56" cy="71" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="58.5" cy="68.5" r="3" fill="#FFFFFF" />
              <circle cx="53.5" cy="73.5" r="1.3" fill="#FFFFFF" />
              {/* Right Eye */}
              <circle cx="104" cy="71" r="7.5" fill="#291809" stroke="#451A03" strokeWidth="1" />
              <circle cx="106.5" cy="68.5" r="3" fill="#FFFFFF" />
              <circle cx="101.5" cy="73.5" r="1.3" fill="#FFFFFF" />
              {/* Cheerful Friendly Smile */}
              <path d="M 72 97 Q 80 106 88 97" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            </>
          )}

          {/* Waving Paw Animation */}
          {state === 'waving' && (
            <g className="animate-mascot-wave">
              <ellipse cx="138" cy="78" rx="13" ry="10" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
              <circle cx="138" cy="78" r="6" fill="#FDE68A" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
