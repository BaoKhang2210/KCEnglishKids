import React from 'react';
import { Star, LockKeyhole } from 'lucide-react';
import type { BadgeItem } from '../../data/badges';

interface CuteRosetteMedalProps {
  badge: BadgeItem;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showRibbons?: boolean;
  isJiggling?: boolean;
  className?: string;
}

export const CuteRosetteMedal: React.FC<CuteRosetteMedalProps> = ({
  badge,
  unlocked,
  size = 'md',
  showRibbons = true,
  isJiggling = false,
  className = ''
}) => {
  // Coin dimensions by size
  const sizeMap = {
    sm: {
      coin: 'w-16 h-16 sm:w-18 sm:h-18',
      iconText: 'text-2xl sm:text-3xl',
      borderRing: 'ring-3 border-2',
      ribbonWidth: 'w-3.5 sm:w-4',
      ribbonHeight: 'h-6 sm:h-8',
      starSize: 'w-3.5 h-3.5',
      starBox: 'w-4.5 h-4.5 -top-1 -right-1',
    },
    md: {
      coin: 'w-20 h-20 sm:w-24 sm:h-24',
      iconText: 'text-3xl sm:text-4xl',
      borderRing: 'ring-4 border-3',
      ribbonWidth: 'w-5 sm:w-6',
      ribbonHeight: 'h-9 sm:h-11',
      starSize: 'w-4 h-4',
      starBox: 'w-6 h-6 -top-1.5 -right-1.5',
    },
    lg: {
      coin: 'w-28 h-28 sm:w-32 sm:h-32',
      iconText: 'text-5xl sm:text-6xl',
      borderRing: 'ring-4 border-4',
      ribbonWidth: 'w-7 sm:w-8',
      ribbonHeight: 'h-12 sm:h-16',
      starSize: 'w-5 h-5',
      starBox: 'w-7 h-7 -top-2 -right-2',
    },
    xl: {
      coin: 'w-36 h-36 sm:w-44 sm:h-44',
      iconText: 'text-6xl sm:text-7xl',
      borderRing: 'ring-6 border-4',
      ribbonWidth: 'w-10 sm:w-12',
      ribbonHeight: 'h-16 sm:h-20',
      starSize: 'w-6 h-6',
      starBox: 'w-9 h-9 -top-2.5 -right-2.5',
    }
  };

  const currentSize = sizeMap[size];

  // Ribbon tail color mapping
  const ribbonBg = badge.ribbonColor || 'bg-amber-500';

  // Medal coin metallic gradient class based on tier
  const getCoinStyle = () => {
    if (!unlocked) {
      return 'medal-coin-locked border-slate-300 ring-slate-200 text-slate-400';
    }
    if (badge.tier === 'diamond') {
      return 'medal-coin-diamond border-purple-300 ring-fuchsia-300/80 text-white';
    }
    if (badge.tier === 'gold') {
      return 'medal-coin-gold border-amber-200 ring-yellow-400/80 text-white';
    }
    if (badge.tier === 'silver') {
      return 'medal-coin-silver border-slate-200 ring-sky-300/80 text-white';
    }
    // bronze default
    return 'medal-coin-bronze border-orange-200 ring-amber-400/70 text-white';
  };

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Rosette Ribbon Tails (Draping Below) */}
      {showRibbons && (
        <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-full flex justify-center pointer-events-none z-0">
          {/* Left Ribbon Tail */}
          <div
            className={`${currentSize.ribbonWidth} ${currentSize.ribbonHeight} ${
              unlocked ? `${ribbonBg} animate-ribbon-left shadow-md` : 'bg-slate-300 opacity-60'
            } ribbon-tail-left -mr-1`}
          />
          {/* Right Ribbon Tail */}
          <div
            className={`${currentSize.ribbonWidth} ${currentSize.ribbonHeight} ${
              unlocked ? `${ribbonBg} animate-ribbon-right shadow-md` : 'bg-slate-300 opacity-60'
            } ribbon-tail-right -ml-1`}
          />
        </div>
      )}

      {/* Main Medal Coin */}
      <div
        className={`relative z-10 rounded-full flex items-center justify-center transition-transform duration-300 ${
          currentSize.coin
        } ${currentSize.borderRing} ${getCoinStyle()} ${
          isJiggling ? 'animate-jelly' : unlocked ? 'animate-badge-float' : ''
        }`}
      >
        {/* Top-Half Glossy Curved Light Reflection */}
        <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/45 via-white/20 to-transparent rounded-t-full pointer-events-none" />

        {/* Inner Laurel Rim / Beaded Accent Ring */}
        <div className="absolute inset-1 rounded-full border border-white/40 pointer-events-none" />

        {/* Center Icon */}
        <div
          className={`${currentSize.iconText} filter drop-shadow-md flex items-center justify-center transition-transform group-hover:scale-115`}
        >
          {unlocked ? (
            <span>{badge.icon}</span>
          ) : (
            <LockKeyhole className="w-6 h-6 sm:w-8 sm:h-8 text-slate-400 drop-shadow-xs" />
          )}
        </div>

        {/* Corner Jewel Star Accent for Unlocked Medals */}
        {unlocked && (
          <div
            className={`absolute ${currentSize.starBox} rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border-2 border-white shadow-md flex items-center justify-center text-amber-950 animate-soft-bounce z-20`}
          >
            <Star className={`${currentSize.starSize} fill-amber-400 text-amber-900`} />
          </div>
        )}
      </div>
    </div>
  );
};
