import React from 'react';

interface StreakFlameIconProps {
  level?: number; // 1, 2, 3, 4
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export const StreakFlameIcon: React.FC<StreakFlameIconProps> = ({
  level = 1,
  size = 'md',
  animated = true,
  className = ''
}) => {
  // Dimensions mapping
  const sizeMap = {
    sm: { w: 28, h: 32, box: 'w-7 h-8' },
    md: { w: 40, h: 48, box: 'w-10 h-12' },
    lg: { w: 60, h: 72, box: 'w-15 h-18' },
    xl: { w: 90, h: 108, box: 'w-24 h-28' }
  };

  const dim = sizeMap[size] || sizeMap.md;

  // Level configuration
  // Level 1: Warm Spark (1-2 days)
  // Level 2: Blazing Fire (3-6 days)
  // Level 3: Phoenix Gold (7-13 days)
  // Level 4: Cosmic Rainbow Flame (14+ days)
  const safeLevel = Math.max(1, Math.min(4, level));

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${dim.box} ${className}`}>
      <style>{`
        @keyframes flameFlicker1 {
          0%, 100% { transform: scale(1) translateY(0) rotate(-1deg); }
          50% { transform: scale(1.05, 0.96) translateY(-2px) rotate(1.5deg); }
        }
        @keyframes flameFlicker2 {
          0%, 100% { transform: scale(1) translateY(0) rotate(0deg); }
          25% { transform: scale(1.08, 0.94) translateY(-3px) rotate(-2deg); }
          75% { transform: scale(0.96, 1.06) translateY(-1px) rotate(2deg); }
        }
        @keyframes phoenixWings {
          0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.7)); }
          50% { transform: scale(1.12, 1.05) translateY(-4px) rotate(1deg); filter: drop-shadow(0 0 18px rgba(234, 88, 12, 0.9)); }
        }
        @keyframes cosmicRainbow {
          0% { filter: hue-rotate(0deg) drop-shadow(0 0 12px rgba(168, 85, 247, 0.8)); transform: scale(1) rotate(-1deg); }
          50% { filter: hue-rotate(180deg) drop-shadow(0 0 22px rgba(236, 72, 153, 0.95)); transform: scale(1.14, 1.06) translateY(-5px) rotate(1.5deg); }
          100% { filter: hue-rotate(360deg) drop-shadow(0 0 12px rgba(168, 85, 247, 0.8)); transform: scale(1) rotate(-1deg); }
        }
        @keyframes emberFly1 {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          40% { opacity: 0.9; }
          100% { transform: translate(-8px, -24px) scale(0.2); opacity: 0; }
        }
        @keyframes emberFly2 {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translate(10px, -28px) scale(0.1); opacity: 0; }
        }
        @keyframes starTwinkle {
          0%, 100% { transform: scale(0.6) rotate(0deg); opacity: 0.3; }
          50% { transform: scale(1.2) rotate(45deg); opacity: 1; }
        }
        @keyframes crownHover {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-3px) scale(1.08); }
        }
      `}</style>

      {/* SVG Filters & Definitions */}
      <svg className="absolute w-0 h-0" aria-hidden="true" focusable="false">
        <defs>
          {/* Level 1 Gradients */}
          <linearGradient id="flameGradL1Outer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <linearGradient id="flameGradL1Inner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Level 2 Gradients */}
          <linearGradient id="flameGradL2Outer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="35%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
          <linearGradient id="flameGradL2Inner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>

          {/* Level 3 Gradients (Phoenix Gold) */}
          <linearGradient id="flameGradL3Outer" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7c2d12" />
            <stop offset="25%" stopColor="#c2410c" />
            <stop offset="60%" stopColor="#eab308" />
            <stop offset="85%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <linearGradient id="flameGradL3Wing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>

          {/* Level 4 Gradients (Cosmic Rainbow Galaxy) */}
          <linearGradient id="flameGradL4Outer" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7e22ce" />
            <stop offset="25%" stopColor="#db2777" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="75%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="flameGradL4Inner" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Outer Glow Halo according to level */}
      {safeLevel === 1 && (
        <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-md pointer-events-none" />
      )}
      {safeLevel === 2 && (
        <div className="absolute -inset-1 rounded-full bg-orange-500/35 blur-lg animate-pulse pointer-events-none" />
      )}
      {safeLevel === 3 && (
        <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400/40 via-orange-500/40 to-yellow-300/40 blur-xl animate-pulse pointer-events-none" />
      )}
      {safeLevel === 4 && (
        <div className="absolute -inset-2.5 rounded-full bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-cyan-400/50 blur-xl animate-pulse pointer-events-none" />
      )}

      {/* Floating Embers / Sparks */}
      {animated && safeLevel >= 2 && (
        <>
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-yellow-300 pointer-events-none"
            style={{
              bottom: '25%',
              left: '25%',
              animation: 'emberFly1 1.8s infinite ease-out'
            }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-orange-400 pointer-events-none"
            style={{
              bottom: '20%',
              right: '25%',
              animation: 'emberFly2 2.2s infinite ease-out 0.6s'
            }}
          />
        </>
      )}

      {/* Floating Stars for Level 3 & Level 4 */}
      {animated && safeLevel >= 3 && (
        <>
          <div
            className="absolute top-0 right-0 text-yellow-300 text-[10px] pointer-events-none"
            style={{ animation: 'starTwinkle 1.6s infinite ease-in-out' }}
          >
            ✦
          </div>
          <div
            className="absolute bottom-1 left-0 text-amber-200 text-[10px] pointer-events-none"
            style={{ animation: 'starTwinkle 2.0s infinite ease-in-out 0.8s' }}
          >
            ✨
          </div>
        </>
      )}

      {/* Extra Cosmic Stardust for Level 4 */}
      {animated && safeLevel === 4 && (
        <>
          <div
            className="absolute -top-1 left-0 text-cyan-300 text-[11px] pointer-events-none"
            style={{ animation: 'starTwinkle 1.4s infinite ease-in-out 0.3s' }}
          >
            ★
          </div>
          <div
            className="absolute -bottom-1 -right-1 text-pink-300 text-[11px] pointer-events-none"
            style={{ animation: 'starTwinkle 1.9s infinite ease-in-out 1.1s' }}
          >
            ★
          </div>
        </>
      )}

      {/* Main SVG Flame Body */}
      <svg
        width={dim.w}
        height={dim.h}
        viewBox="0 0 48 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 transition-transform duration-300"
        style={{
          animation: animated
            ? safeLevel === 1
              ? 'flameFlicker1 2.4s infinite ease-in-out'
              : safeLevel === 2
              ? 'flameFlicker2 1.5s infinite ease-in-out'
              : safeLevel === 3
              ? 'phoenixWings 1.6s infinite ease-in-out'
              : 'cosmicRainbow 2.6s infinite ease-in-out'
            : 'none'
        }}
      >
        {/* Phoenix Wings / Aura for Level 3 & 4 */}
        {safeLevel >= 3 && (
          <g opacity="0.85">
            {/* Left wing flare */}
            <path
              d="M10 38C4 32 2 24 5 18C7 22 10 26 14 30C12 24 13 18 17 14C17 20 20 25 22 28C17 33 13 36 10 38Z"
              fill={safeLevel === 4 ? 'url(#flameGradL4Outer)' : 'url(#flameGradL3Wing)'}
            />
            {/* Right wing flare */}
            <path
              d="M38 38C44 32 46 24 43 18C41 22 38 26 34 30C36 24 35 18 31 14C31 20 28 25 26 28C31 33 35 36 38 38Z"
              fill={safeLevel === 4 ? 'url(#flameGradL4Outer)' : 'url(#flameGradL3Wing)'}
            />
          </g>
        )}

        {/* Outer Flame Contour */}
        <path
          d="M24 2C24 2 29 11 29 17C29 19 32 17 34 14C34 14 36 20 34 26C38 23 41 20 41 20C41 20 44 26 43 33C42 43 34 52 24 52C14 52 6 43 5 33C4 26 8 20 8 20C8 20 11 23 14 26C12 20 14 14 14 14C16 17 19 19 19 17C19 11 24 2 24 2Z"
          fill={
            safeLevel === 1
              ? 'url(#flameGradL1Outer)'
              : safeLevel === 2
              ? 'url(#flameGradL2Outer)'
              : safeLevel === 3
              ? 'url(#flameGradL3Outer)'
              : 'url(#flameGradL4Outer)'
          }
        />

        {/* Mid Core Flame */}
        <path
          d="M24 16C24 16 28 23 28 28C28 30 30 28 32 26C32 26 33 31 31 35C33 33 35 31 35 31C35 31 36 36 35 40C34 47 29 50 24 50C19 50 14 47 13 40C12 36 13 31 13 31C13 31 15 33 17 35C15 31 16 26 16 26C18 28 20 30 20 28C20 23 24 16 24 16Z"
          fill={
            safeLevel === 1
              ? 'url(#flameGradL1Inner)'
              : safeLevel === 2
              ? 'url(#flameGradL2Inner)'
              : safeLevel === 3
              ? '#fde047'
              : 'url(#flameGradL4Inner)'
          }
          opacity="0.9"
        />

        {/* Inner Heart / Pure Spark */}
        <path
          d="M24 28C24 28 27 34 27 38C27 44 21 44 21 38C21 34 24 28 24 28Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </svg>

      {/* Floating Crown for Level 3 and Level 4 */}
      {safeLevel >= 3 && (
        <div
          className="absolute -top-2 z-20 pointer-events-none drop-shadow-md"
          style={{ animation: animated ? 'crownHover 2s infinite ease-in-out' : 'none' }}
        >
          {safeLevel === 4 ? (
            <span className="text-[14px] sm:text-[16px] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              👑
            </span>
          ) : (
            <span className="text-[12px] sm:text-[14px] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              ⚡
            </span>
          )}
        </div>
      )}
    </div>
  );
};
