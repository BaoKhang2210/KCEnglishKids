import React from 'react';
import { LockKeyhole } from 'lucide-react';
import type { StickerItem } from '../../data/stickers';

interface CuteStickerCardProps {
  sticker: StickerItem;
  isUnlocked: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CuteStickerCard: React.FC<CuteStickerCardProps> = ({
  sticker,
  isUnlocked,
  onClick,
  size = 'md',
  className = ''
}) => {
  const rarityConfig = {
    common: {
      label: 'Phổ Thông',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      sparkleIcon: '🌱'
    },
    rare: {
      label: 'Hiếm',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
      sparkleIcon: '💎'
    },
    epic: {
      label: 'Sử Thi',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      sparkleIcon: '🔮'
    },
    legendary: {
      label: 'Huyền Thoại',
      badgeColor: 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-950 border-amber-400 ring-2 ring-amber-300',
      sparkleIcon: '👑'
    }
  };

  const rarityInfo = rarityConfig[sticker.rarity] || rarityConfig.common;

  const sizeClasses = {
    sm: {
      box: 'w-20 h-20 sm:w-24 sm:h-24',
      icon: 'text-3xl sm:text-4xl',
      title: 'text-[11px]',
      desc: 'text-[9px]'
    },
    md: {
      box: 'w-24 h-24 sm:w-28 sm:h-28',
      icon: 'text-4xl sm:text-5xl',
      title: 'text-xs sm:text-sm',
      desc: 'text-[10px]'
    },
    lg: {
      box: 'w-32 h-32 sm:w-36 sm:h-36',
      icon: 'text-5xl sm:text-6xl',
      title: 'text-sm sm:text-base',
      desc: 'text-xs'
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      onClick={onClick}
      className={`rounded-3xl p-3.5 sm:p-4 text-center flex flex-col items-center justify-between transition-all select-none cursor-pointer group relative ${
        isUnlocked
          ? 'bg-gradient-to-b from-white via-rose-50/30 to-amber-50/40 border-3 border-rose-200/90 hover:border-rose-400 hover:shadow-xl hover:-translate-y-1.5 active:scale-95'
          : 'bg-slate-50/80 border-3 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
      } ${className}`}
    >
      {/* 3D Puffy Die-Cut Sticker Graphic */}
      <div className="relative my-1">
        <div
          className={`rounded-3xl flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-110 ${
            currentSize.box
          } ${
            isUnlocked
              ? sticker.rarity === 'legendary'
                ? 'puffy-sticker holographic-foil'
                : `puffy-sticker bg-gradient-to-tr ${sticker.bgGradient}`
              : 'bg-slate-200/80 border-2 border-dashed border-slate-300 text-slate-400'
          }`}
        >
          {/* Top gloss arc light reflection for puffy resin effect */}
          {isUnlocked && (
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/45 via-white/15 to-transparent rounded-t-3xl pointer-events-none" />
          )}

          {/* Center sticker emoji / lock */}
          <div className={`${currentSize.icon} filter drop-shadow-md select-none`}>
            {isUnlocked ? (
              <span>{sticker.icon}</span>
            ) : (
              <LockKeyhole className="w-8 h-8 text-slate-400/80" />
            )}
          </div>

          {/* Sparkle badge for Epic and Legendary stickers */}
          {isUnlocked && (sticker.rarity === 'legendary' || sticker.rarity === 'epic') && (
            <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-xs shadow-xs animate-soft-bounce">
              <span>{rarityInfo.sparkleIcon}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sticker Title & Description */}
      <div className="w-full mt-2">
        <h4
          className={`font-black text-slate-800 ${currentSize.title} mb-0.5 leading-snug group-hover:text-rose-700 transition-colors line-clamp-1`}
        >
          {isUnlocked ? sticker.name : 'Sticker Bí Mật'}
        </h4>
        <p className={`font-bold text-slate-500 leading-tight ${currentSize.desc} line-clamp-2 mb-2`}>
          {isUnlocked ? sticker.desc : 'Đạt 2–3 sao trong trò chơi để bóc sticker!'}
        </p>
      </div>

      {/* Rarity & Status Badge */}
      {isUnlocked ? (
        <span
          className={`mt-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border shadow-2xs ${rarityInfo.badgeColor}`}
        >
          <span>{rarityInfo.sparkleIcon}</span>
          <span>{rarityInfo.label}</span>
        </span>
      ) : (
        <span className="mt-auto inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          <span>🔒 Chưa mở</span>
        </span>
      )}
    </div>
  );
};
