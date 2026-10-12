import React, { useEffect, useState } from 'react';
import { X, Flame, Sparkles, ChevronRight, Check } from 'lucide-react';
import { StreakFlameIcon } from './StreakFlameIcon';
import { KokoMascot } from './KokoMascot';
import { sfx } from '../../utils/audio';
import type { ChildStreakData } from '../../types';

interface DailyStreakBannerProps {
  streakData: ChildStreakData | null;
  onOpenModal?: () => void;
  autoDismissMs?: number; // default e.g. 10000ms
}

export const DailyStreakBanner: React.FC<DailyStreakBannerProps> = ({
  streakData,
  onOpenModal,
  autoDismissMs = 12000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  useEffect(() => {
    if (!streakData) return;

    // Check sessionStorage to show once per browser session
    const storageKey = `kc_streak_banner_shown_${streakData.childId}_${streakData.lastActiveDate}`;
    const alreadyShown = sessionStorage.getItem(storageKey);

    if (!alreadyShown) {
      // Play encouraging fanfare sound
      try {
        sfx.playStarFanfare();
      } catch (e) {
        // audio might require initial interaction
      }

      setIsVisible(true);
      sessionStorage.setItem(storageKey, 'true');

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
  }, [streakData, autoDismissMs]);

  if (!isVisible || hasDismissed || !streakData) return null;

  const {
    streak = 1,
    levelInfo,
    weekDays = []
  } = streakData;

  const currentLevel = levelInfo?.level || 1;

  const handleClose = () => {
    sfx.playPop();
    setIsVisible(false);
    setHasDismissed(true);
  };

  const handleCta = () => {
    sfx.playStarFanfare();
    setIsVisible(false);
    setHasDismissed(true);
    if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <div
      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg border-b-4 border-amber-300 relative z-40 animate-slide-down"
      style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Mascot & Streak Flame with greeting */}
        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-[280px]">
          {/* Flame Icon with subtle halo */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs border-2 border-white/40 flex items-center justify-center flex-shrink-0 shadow-inner">
            <StreakFlameIcon level={currentLevel} size="md" />
          </div>

          {/* Koko Mascot Mini */}
          <div className="hidden sm:flex w-11 h-11 rounded-2xl bg-amber-400 p-0.5 items-center justify-center flex-shrink-0 shadow-md">
            <KokoMascot state="celebrating" size="sm" interactive={false} />
          </div>


          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-amber-950/30 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black text-yellow-200 border border-white/20">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                {levelInfo?.title || 'Chuỗi Ngày Học'}
              </span>
              <span className="text-xs font-bold text-amber-100 hidden md:inline">
                • {streak >= 7 ? 'Siêu chăm ngoan cả tuần! 🌟' : 'Tiếp tục giữ lửa nhé! 🔥'}
              </span>
            </div>

            <h3 className="text-sm sm:text-lg font-black tracking-tight leading-tight mt-0.5">
              Bé đã học liên tiếp{' '}
              <span className="text-yellow-300 text-base sm:text-xl underline decoration-wavy decoration-yellow-400">
                {streak} ngày
              </span>{' '}
              rồi đó! Siêu tuyệt vời! 🎉
            </h3>
          </div>
        </div>

        {/* Center: Mini 7-day torch indicators (on tablet & desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-black/15 px-3 py-1.5 rounded-2xl border border-white/15">
          <span className="text-[11px] font-black text-amber-200 mr-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-yellow-300" />
            Tuần này:
          </span>
          {weekDays.map((d) => (
            <div
              key={d.dayIndex}
              title={`${d.label}: ${d.isActive ? 'Đã học' : d.isToday ? 'Hôm nay' : 'Chưa'}`}
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                d.isToday
                  ? 'bg-yellow-400 text-amber-950 ring-2 ring-white scale-110 shadow-sm'
                  : d.isActive
                  ? 'bg-emerald-400 text-white'
                  : 'bg-white/10 text-white/50'
              }`}
            >
              {d.isActive ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : d.label}
            </div>
          ))}
        </div>

        {/* Right side: Action Buttons & Close */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={handleCta}
            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 font-black text-xs sm:text-sm shadow-md hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5"
          >
            <span>Xem chuỗi lửa</span>
            <ChevronRight className="w-4 h-4 stroke-[3] text-orange-600" />
          </button>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-black/15 hover:bg-black/30 flex items-center justify-center text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng thanh chuỗi ngày"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
