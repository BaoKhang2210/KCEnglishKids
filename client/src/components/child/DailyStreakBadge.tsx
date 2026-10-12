import React from 'react';
import { StreakFlameIcon } from './StreakFlameIcon';

interface DailyStreakBadgeProps {
  streak?: number;
  level?: number;
  onClick?: () => void;
  className?: string;
}

export const DailyStreakBadge: React.FC<DailyStreakBadgeProps> = ({
  streak = 1,
  level = 1,
  onClick,
  className = ''
}) => {
  // Determine badge styles based on level
  const getBadgeStyle = () => {
    if (level >= 4) {
      return {
        bg: 'bg-gradient-to-r from-fuchsia-100 via-pink-100 via-amber-100 to-cyan-100',
        border: 'border-fuchsia-400 hover:border-fuchsia-500',
        shadow: 'shadow-[0_4px_0_#c026d3]',
        textColor: 'text-purple-950',
        subTextColor: 'text-fuchsia-700',
        glowRing: 'ring-2 ring-purple-300/60 ring-offset-1',
        title: 'Cực quang vũ trụ (14+ ngày)'
      };
    }
    if (level === 3) {
      return {
        bg: 'bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-200',
        border: 'border-amber-500 hover:border-amber-600',
        shadow: 'shadow-[0_4px_0_#b45309]',
        textColor: 'text-amber-950',
        subTextColor: 'text-amber-800',
        glowRing: 'ring-2 ring-amber-300/60 ring-offset-1',
        title: 'Phượng hoàng hoàng kim (7+ ngày)'
      };
    }
    if (level === 2) {
      return {
        bg: 'bg-gradient-to-r from-orange-100 via-amber-100 to-rose-100',
        border: 'border-orange-400 hover:border-orange-500',
        shadow: 'shadow-[0_4px_0_#ea580c]',
        textColor: 'text-orange-950',
        subTextColor: 'text-orange-700',
        glowRing: 'ring-2 ring-orange-300/40 ring-offset-1',
        title: 'Bùng cháy rực lửa (3+ ngày)'
      };
    }
    return {
      bg: 'bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-100',
      border: 'border-amber-300 hover:border-amber-400',
      shadow: 'shadow-[0_4px_0_#d97706]',
      textColor: 'text-amber-950',
      subTextColor: 'text-amber-700',
      glowRing: '',
      title: 'Đốm lửa ấm áp (1-2 ngày)'
    };
  };

  const style = getBadgeStyle();

  return (
    <button
      onClick={onClick}
      title={`Chuỗi học: ${streak} ngày liên tiếp • ${style.title}`}
      className={`group relative flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-[20px] border-[3px] ${style.bg} ${style.border} ${style.shadow} ${style.glowRing} cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0 ${className}`}
      style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
    >
      {/* Animated Flame Icon */}
      <div className="flex-shrink-0 flex items-center justify-center -my-1">
        <StreakFlameIcon level={level} size="sm" />
      </div>

      {/* Streak Number & Subtitle */}
      <div className="flex flex-col text-left whitespace-nowrap pr-0.5">
        <div className="flex items-baseline gap-1">
          <span className={`font-black text-[18px] sm:text-[22px] leading-none ${style.textColor}`}>
            {streak}
          </span>
          <span className={`text-[12px] sm:text-[13px] font-black leading-none ${style.subTextColor}`}>
            ngày
          </span>
        </div>
        <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider hidden xs:block mt-0.5 ${style.subTextColor}`}>
          Chuỗi học 🔥
        </span>
      </div>

      {/* Level badge pill for level 3 and 4 */}
      {level >= 3 && (
        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-white/70 backdrop-blur-xs text-amber-900 border border-amber-300/60 shadow-xs ml-0.5">
          {level >= 4 ? 'Vũ Trụ' : 'Tuần Lửa'}
        </span>
      )}
    </button>
  );
};
