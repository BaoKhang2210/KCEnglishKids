import React, { useState } from 'react';
import { X, Trophy, Flame, Sparkles, ChevronRight, Award } from 'lucide-react';
import { StreakFlameIcon } from './StreakFlameIcon';
import { KokoMascot } from './KokoMascot';
import { sfx } from '../../utils/audio';
import type { ChildStreakData } from '../../types';
import { streakApi } from '../../services/api';

interface DailyStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakData: ChildStreakData | null;
  onStreakUpdate?: (updatedData: ChildStreakData) => void;
}

export const DailyStreakModal: React.FC<DailyStreakModalProps> = ({
  isOpen,
  onClose,
  streakData,
  onStreakUpdate
}) => {
  const [testingStreak, setTestingStreak] = useState(false);

  if (!isOpen || !streakData) return null;

  const {
    streak = 1,
    longestStreak = 1,
    levelInfo,
    nextMilestone,
    weekDays = []
  } = streakData;

  const currentLevel = levelInfo?.level || 1;

  // Handle testing higher streak levels
  const handleTestLevel = async (targetDays: number) => {
    try {
      setTestingStreak(true);
      sfx.playStarFanfare();
      const res = await streakApi.testStreakLevel(streakData.childId, targetDays);

      if (res.success && res.data && onStreakUpdate) {
        onStreakUpdate(res.data);
      }
    } catch (err) {
      console.error('Failed to test streak level:', err);
    } finally {
      setTestingStreak(false);
    }
  };

  // Progress towards next milestone
  const prevTarget = currentLevel === 1 ? 0 : currentLevel === 2 ? 3 : currentLevel === 3 ? 7 : 14;
  const targetDiff = (nextMilestone?.target || 3) - prevTarget;
  const currentDiff = Math.max(0, streak - prevTarget);
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
              <StreakFlameIcon level={currentLevel} size="md" />
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
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Main Flame Hero Showcase */}
          <div className={`relative p-5 sm:p-6 rounded-[28px] border-3 text-center overflow-hidden transition-all shadow-md ${
            currentLevel >= 4
              ? 'bg-gradient-to-br from-purple-100 via-pink-100 to-cyan-100 border-fuchsia-300'
              : currentLevel === 3
              ? 'bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-200 border-amber-400'
              : currentLevel === 2
              ? 'bg-gradient-to-br from-orange-100 via-amber-100 to-rose-100 border-orange-300'
              : 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300'
          }`}>
            {/* Background sparkle accents */}
            <div className="absolute top-2 left-3 text-amber-400 opacity-60">✨</div>
            <div className="absolute bottom-3 right-4 text-orange-400 opacity-60">✦</div>

            {/* Giant Flame Icon */}
            <div className="flex justify-center mb-2">
              <StreakFlameIcon level={currentLevel} size="xl" />
            </div>

            {/* Big Streak Day Number */}
            <div className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none mb-1">
              {streak} <span className="text-2xl sm:text-3xl text-orange-600">Ngày</span>
            </div>

            {/* Flame Title & Description */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 backdrop-blur-xs border border-amber-200 shadow-xs mb-2">
              <span className="text-base">{levelInfo?.badge || '🔥'}</span>
              <span className="text-sm font-black text-amber-950">
                {levelInfo?.title || 'Đốm Lửa Ấm Áp'}
              </span>
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-sm mx-auto leading-relaxed">
              {levelInfo?.description || 'Bé hãy duy trì học tập mỗi ngày để ngọn lửa ngày càng bùng cháy rực rỡ nhé!'}
            </p>

            {/* Milestone Progress bar */}
            {nextMilestone && (
              <div className="mt-4 pt-3 border-t border-black/10 text-left">
                <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Mục tiêu tiếp theo: {nextMilestone.label}
                  </span>
                  <span className="text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full font-black text-[11px]">
                    +{nextMilestone.rewardStars} ⭐ Thưởng
                  </span>
                </div>
                <div className="w-full h-3 bg-white/80 rounded-full border border-amber-200 overflow-hidden p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 shadow-sm"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-500 mt-1 text-right">
                  Còn {Math.max(1, nextMilestone.target - streak)} ngày nữa để mở khóa!
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
                          <StreakFlameIcon level={currentLevel} size="sm" />
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
                  Cấp {currentLevel} / 4
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Level Switcher (Cho bé & người đánh giá thử các cấp độ lửa) */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border-2 border-amber-300 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Trải nghiệm 4 Cấp Độ Lửa Huyền Thoại:
              </span>
              <span className="text-[10px] font-bold text-amber-700">Click để thử hiệu ứng</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { days: 1, label: 'Cấp 1: Đốm Lửa', icon: '✨', bg: 'bg-amber-200 text-amber-900 hover:bg-amber-300' },
                { days: 3, label: 'Cấp 2: Bùng Cháy', icon: '🔥', bg: 'bg-orange-200 text-orange-950 hover:bg-orange-300' },
                { days: 7, label: 'Cấp 3: Phượng Hoàng', icon: '⚡', bg: 'bg-yellow-200 text-amber-950 hover:bg-yellow-300' },
                { days: 14, label: 'Cấp 4: Vũ Trụ Cực Quang', icon: '👑', bg: 'bg-purple-200 text-purple-950 hover:bg-purple-300' }
              ].map((lvl) => (
                <button
                  key={lvl.days}
                  disabled={testingStreak}
                  onClick={() => handleTestLevel(lvl.days)}
                  className={`p-2 rounded-xl text-left border-2 border-black/10 shadow-xs cursor-pointer transition-transform hover:scale-102 active:scale-98 ${lvl.bg} ${
                    streak === lvl.days ? 'ring-2 ring-amber-500 font-black' : ''
                  }`}
                >
                  <div className="text-sm font-black flex items-center justify-between">
                    <span>{lvl.icon} {lvl.days} Ngày</span>
                  </div>
                  <span className="text-[10px] block font-bold leading-tight mt-0.5 opacity-80">
                    {lvl.label}
                  </span>
                </button>
              ))}
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
