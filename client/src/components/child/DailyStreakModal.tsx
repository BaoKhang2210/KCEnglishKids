import React, { useState, useEffect } from 'react';
import { X, Trophy, Flame, Sparkles, ChevronRight, Award } from 'lucide-react';
import { StreakFlameIcon } from './StreakFlameIcon';
import { KokoMascot } from './KokoMascot';
import { sfx } from '../../utils/audio';
import type { ChildStreakData } from '../../types';

interface DailyStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: ChildStreakData | null;
  onStreakUpdate?: (updatedData: ChildStreakData) => void;
}

const STREAK_LEVEL_CONFIG: Record<number, { level: number; title: string; englishTitle: string; badge: string; description: string }> = {
  1: {
    level: 1,
    title: 'Đốm Lửa Ấm Áp',
    englishTitle: 'Warm Spark',
    badge: '✨',
    description: 'Khởi đầu tuyệt đẹp! Bé đang thắp lên ngọn lửa chăm ngoan mỗi ngày!'
  },
  2: {
    level: 2,
    title: 'Ngọn Lửa Bùng Cháy',
    englishTitle: 'Blazing Fire',
    badge: '🔥',
    description: 'Nhiệt huyết tuyệt vời! Ngọn lửa đỏ cam đang bùng cháy rực rỡ!'
  },
  3: {
    level: 3,
    title: 'Lửa Phượng Hoàng Hoàng Kim',
    englishTitle: 'Phoenix Gold Flame',
    badge: '⚡',
    description: 'Chăm chỉ suốt cả tuần! Ngọn lửa hoàng kim mang sức mạnh phượng hoàng!'
  },
  4: {
    level: 4,
    title: 'Lửa Vũ Trụ Cực Quang',
    englishTitle: 'Cosmic Rainbow Flame',
    badge: '👑',
    description: 'Huyền thoại học tập! Ngọn lửa cầu vồng ngân hà bất khả chiến bại!'
  }
};

const getLevelFromDays = (days: number): number => {
  if (days >= 14) return 4;
  if (days >= 7) return 3;
  if (days >= 3) return 2;
  return 1;
};

const getNextMilestoneForDays = (days: number) => {
  if (days < 3) return { target: 3, rewardStars: 10, label: '3 Ngày' };
  if (days < 7) return { target: 7, rewardStars: 25, label: '7 Ngày (1 Tuần)' };
  if (days < 14) return { target: 14, rewardStars: 50, label: '14 Ngày (2 Tuần)' };
  if (days < 30) return { target: 30, rewardStars: 100, label: '30 Ngày (1 Tháng)' };
  return { target: days + 7, rewardStars: 100, label: `${days + 7} Ngày` };
};

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({
  isOpen,
  onClose,
  streakData
}) => {
  // Local preview state: purely visual, never mutates real database streak
  const [previewDays, setPreviewDays] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewDays(null);
    }
  }, [isOpen]);

  if (!isOpen || !streakData) return null;

  const {
    streak = 1,
    longestStreak = 1,
    levelInfo: realLevelInfo,
    nextMilestone: realNextMilestone,
    weekDays = []
  } = streakData;

  const isPreviewing = previewDays !== null;
  const displayDays = isPreviewing ? previewDays : streak;
  const displayLevel = getLevelFromDays(displayDays);
  const displayLevelInfo = isPreviewing
    ? STREAK_LEVEL_CONFIG[displayLevel]
    : (realLevelInfo || STREAK_LEVEL_CONFIG[getLevelFromDays(streak)]);
  const displayNextMilestone = isPreviewing
    ? getNextMilestoneForDays(displayDays)
    : (realNextMilestone || getNextMilestoneForDays(streak));

  // Handle previewing higher streak levels (visual only, no DB mutation)
  const handlePreviewLevel = (targetDays: number) => {
    sfx.playStarFanfare();
    if (previewDays === targetDays) {
      setPreviewDays(null);
    } else {
      setPreviewDays(targetDays);
    }
  };

  // Progress towards next milestone
  const prevTarget = displayLevel === 1 ? 0 : displayLevel === 2 ? 3 : displayLevel === 3 ? 7 : 14;
  const targetDiff = (displayNextMilestone?.target || 3) - prevTarget;
  const currentDiff = Math.max(0, displayDays - prevTarget);
  const progressPercent = Math.min(100, Math.round((currentDiff / (targetDiff || 1)) * 100));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gradient-to-b from-[#fffbf0] via-white to-amber-50 rounded-[32px] border-4 border-amber-300 shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: "'Quicksand', 'Nunito', sans-serif" }}
      >
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 p-4 sm:p-5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center border-2 border-white/40 shadow-inner">
              <StreakFlameIcon level={displayLevel} size="md" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight flex items-center gap-2">
                Chuỗi Ngày Học 🔥
              </h2>
              <p className="text-xs sm:text-sm font-bold text-amber-100">
                Chăm chỉ mỗi ngày — Bé thông minh hơn!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sfx.playPop();
              onClose();
            }}
            className="w-10 h-10 rounded-2xl bg-black/15 hover:bg-black/25 flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-105 active:scale-95"
            aria-label="Đóng"
          >
            <X className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4">
          {/* Main Flame Hero Showcase */}
          <div className={`relative p-5 sm:p-6 rounded-[28px] border-3 text-center overflow-hidden transition-all shadow-md ${
            displayLevel >= 4
              ? 'bg-gradient-to-br from-purple-100 via-pink-100 to-cyan-100 border-fuchsia-300'
              : displayLevel === 3
              ? 'bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200 border-amber-400'
              : displayLevel === 2
              ? 'bg-gradient-to-br from-orange-100 via-amber-100 to-rose-100 border-orange-300'
              : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300'
          }`}>
            {/* Background sparkle accents */}
            <div className="absolute top-2 left-3 text-amber-400 opacity-60">✨</div>
            <div className="absolute bottom-3 right-4 text-orange-400 opacity-60">✦</div>

            {/* Giant Flame Icon */}
            <div className="flex justify-center mb-2">
              <StreakFlameIcon level={displayLevel} size="xl" />
            </div>

            {/* Big Streak Day Number */}
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {displayDays} <span className="text-2xl sm:text-3xl text-orange-600">Ngày</span>
            </div>

            {/* Flame Title & Description */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-amber-200 shadow-xs mb-2">
              <span className="text-base">{displayLevelInfo?.badge || '🔥'}</span>
              <span className="text-sm font-black text-amber-950">
                {displayLevelInfo?.title || 'Đốm Lửa Ấm Áp'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-sm mx-auto leading-relaxed">
              {displayLevelInfo?.description || 'Bé hãy duy trì học tập mỗi ngày để ngọn lửa ngày càng bùng cháy rực rỡ nhé!'}
            </p>

            {/* Milestone Progress bar */}
            {displayNextMilestone && (
              <div className="mt-4 pt-3 border-t border-black/10 text-left">
                <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Mục tiêu tiếp theo: {displayNextMilestone.label}
                  </span>
                  <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full font-black text-[11px]">
                    +{displayNextMilestone.rewardStars} ⭐ Thưởng
                  </span>
                </div>
                <div className="w-full h-3 bg-white/80 rounded-full border border-amber-200 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-1 text-right">
                  Còn {Math.max(1, displayNextMilestone.target - displayDays)} ngày nữa để mở khóa!
                </p>
              </div>
            )}
          </div>

          {/* 7-Day Week Calendar Strip */}
          <div className="bg-white rounded-[24px] p-4 border-2 border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                Đuốc Lửa Tuần Này
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Thứ 2 — Chủ Nhật
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map((day) => {
                const isActive = day.isActive;
                const isToday = day.isToday;
                const isPast = day.isPast;

                return (
                  <div
                    key={day.dayIndex}
                    className={`flex flex-col items-center p-2 rounded-2xl border-2 transition-transform ${
                      isToday
                        ? 'bg-amber-100/80 border-orange-400 shadow-md ring-2 ring-orange-300 scale-105'
                        : isActive
                        ? 'bg-amber-50 border-amber-300 shadow-xs'
                        : isPast
                        ? 'bg-slate-100/80 border-slate-200 opacity-60'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className={`text-[11px] sm:text-xs font-black ${
                      isToday ? 'text-orange-950 font-black' : 'text-slate-600'
                    }`}>
                      {day.label}
                    </span>

                    {/* Torch Icon / Flame */}
                    <div className="my-1.5 flex items-center justify-center">
                      {isActive ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shadow-xs">
                          <StreakFlameIcon level={displayLevel} size="sm" />
                        </div>
                      ) : isPast ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs">
                          ☁️
                        </div>
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-xs">
                          🔒
                        </div>
                      )}
                    </div>

                    <span className={`text-[9px] font-black uppercase ${
                      isToday
                        ? 'text-orange-600 font-extrabold'
                        : isActive
                        ? 'text-amber-700'
                        : 'text-slate-400'
                    }`}>
                      {isToday ? 'Hôm nay' : isActive ? 'Đã học' : 'Chưa'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Records & Stats Pill */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border-2 border-amber-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/30 flex items-center justify-center text-amber-700 flex-shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Kỷ lục dài nhất</span>
                <span className="text-lg font-black text-slate-800 leading-tight">
                  {longestStreak} Ngày
                </span>
              </div>
            </div>

            <div className="bg-orange-50/70 p-3.5 rounded-2xl border-2 border-orange-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-400/30 flex items-center justify-center text-orange-700 flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">Cấp độ ngọn lửa</span>
                <span className="text-base font-black text-slate-800 leading-tight">
                  Cấp {displayLevel} / 4
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Level Switcher (Xem thử hiệu ứng trực quan — không ảnh hưởng chuỗi thật) */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Xem Thử 4 Cấp Độ Lửa Huyền Thoại:
              </span>
              <span className="text-[10px] font-bold text-amber-700">Xem thử trực quan (Không đổi chuỗi thật)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { days: 1, label: 'Cấp 1: Đốm Lửa', icon: '✨', bg: 'bg-amber-200 text-amber-900 hover:bg-amber-300' },
                { days: 3, label: 'Cấp 2: Bùng Cháy', icon: '🔥', bg: 'bg-orange-200 text-orange-950 hover:bg-orange-300' },
                { days: 7, label: 'Cấp 3: Phượng Hoàng', icon: '⚡', bg: 'bg-yellow-200 text-amber-950 hover:bg-yellow-300' },
                { days: 14, label: 'Cấp 4: Vũ Trụ Cực Quang', icon: '👑', bg: 'bg-purple-200 text-purple-950 hover:bg-purple-300' }
              ].map((lvl) => {
                const isSelected = displayDays === lvl.days;
                return (
                  <button
                    key={lvl.days}
                    type="button"
                    onClick={() => handlePreviewLevel(lvl.days)}
                    className={`p-2 rounded-xl text-left border-2 shadow-xs cursor-pointer transition-all hover:scale-102 active:scale-98 ${lvl.bg} ${
                      isSelected ? 'border-orange-500 ring-3 ring-orange-400 font-black shadow-md scale-102' : 'border-black/10'
                    }`}
                  >
                    <div className="text-sm font-black flex items-center justify-between">
                      <span>{lvl.icon} {lvl.days} Ngày</span>
                      {isSelected && <span className="text-[10px] bg-white/70 px-1 rounded-sm">Đang xem</span>}
                    </div>
                    <span className="text-[10px] block font-bold leading-tight mt-0.5 opacity-80">
                      {lvl.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Call To Action */}
        <div className="p-4 bg-white border-t-2 border-amber-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-400 p-0.5 flex-shrink-0">
              <KokoMascot state="celebrating" size="sm" interactive={false} />
            </div>
            <span className="text-xs font-black text-amber-900 hidden sm:inline">
              Mỗi bài học hôm nay đều giữ ấm ngọn lửa!
            </span>
          </div>

          <button
            onClick={() => {
              sfx.playStarFanfare();
              onClose();
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black text-sm shadow-[0_4px_0_#b45309] hover:scale-105 active:scale-95 transition-transform cursor-pointer flex items-center gap-1.5 ml-auto"
          >
            <span>Học tiếp ngay nào!</span>
            <ChevronRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

      </div>
    </div>
  );
};
