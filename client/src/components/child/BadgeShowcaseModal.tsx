import React, { useEffect, useState } from 'react';
import { X, Sparkles, Star, Trophy, Lock, Bell, ArrowRight } from 'lucide-react';
import type { BadgeItem } from '../../data/badges';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';

interface BadgeShowcaseModalProps {
  badge: (BadgeItem & { unlocked: boolean }) | null;
  onClose: () => void;
  currentProgress?: number;
}

export const BadgeShowcaseModal: React.FC<BadgeShowcaseModalProps> = ({
  badge,
  onClose,
  currentProgress = 0
}) => {
  const [isJiggling, setIsJiggling] = useState(false);

  useEffect(() => {
    if (badge) {
      if (badge.unlocked) {
        sfx.playBadgeChime();
      } else {
        sfx.playPop();
      }
    }
  }, [badge?.id]);

  if (!badge) return null;

  const handleShakeBadge = () => {
    sfx.playBadgeChime();
    setIsJiggling(true);
    setTimeout(() => setIsJiggling(false), 500);
  };

  const reqValue = badge.requirement;
  const progressPercent = Math.min(100, Math.round((currentProgress / reqValue) * 100));
  const remaining = Math.max(0, reqValue - currentProgress);

  const getReqLabel = () => {
    if (badge.reqType === 'star') return `${badge.requirement} Ngôi sao vàng ⭐`;
    if (badge.reqType === 'unit') return `${badge.requirement} Unit bài học 🎒`;
    return `${badge.requirement} Bài học đã hoàn thành 📚`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 relative overflow-hidden animate-pop-in text-center">
        {/* Sunburst glowing background when unlocked */}
        {badge.unlocked && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none opacity-20 animate-sunburst">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 blur-xl" />
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors z-20"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Category Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4 shadow-xs bg-amber-100 text-amber-900 border border-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>{badge.categoryName}</span>
        </div>

        {/* 3D Big Badge Icon with Float and Jiggle */}
        <div className="relative my-3 flex justify-center items-center">
          <div
            onClick={handleShakeBadge}
            className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center text-5xl sm:text-6xl cursor-pointer select-none transition-all shadow-xl relative ${
              badge.unlocked
                ? `bg-gradient-to-tr ${badge.color} text-white ring-4 ring-amber-300 animate-badge-float hover:scale-105`
                : 'bg-slate-100 text-slate-400 border-4 border-dashed border-slate-300'
            } ${isJiggling ? 'animate-jelly' : ''}`}
          >
            {badge.unlocked ? badge.icon : '🔒'}

            {badge.unlocked && (
              <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-950 p-1.5 rounded-full shadow-md animate-bounce-subtle">
                <Star className="w-5 h-5 fill-amber-300" />
              </div>
            )}
          </div>
        </div>

        {/* Badge Title */}
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mt-2 mb-1">
          {badge.name}
        </h3>

        {/* Badge Description */}
        <p className="text-sm font-bold text-slate-600 max-w-xs mx-auto mb-4">
          {badge.desc}
        </p>

        {/* Status Box */}
        {badge.unlocked ? (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3.5 mb-4 text-emerald-800 flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-black">Bé đã xuất sắc chinh phục huy hiệu này! 🎉</span>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 text-left">
            <div className="flex justify-between items-center text-xs font-black mb-1.5">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Nhiệm vụ cần đạt:
              </span>
              <span className="text-amber-600 font-extrabold">{progressPercent}%</span>
            </div>
            <p className="text-xs font-extrabold text-slate-700 mb-2.5">
              {getReqLabel()}
            </p>

            {/* Jelly Candy Progress Bar */}
            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px] font-bold text-slate-500">
              <span>Đã có: {currentProgress}</span>
              <span>Còn thiếu: {remaining}</span>
            </div>
          </div>
        )}

        {/* Mascot Speech Bubble */}
        <div className="flex items-center justify-center gap-3 my-2">
          <KokoMascot
            state={badge.unlocked ? 'celebrating' : 'encouraging'}
            size="sm"
            speechBubble={
              badge.unlocked
                ? 'Huy hiệu lấp lánh quá bé ơi! 🌟'
                : `Bé cố lên nhé! Sắp được rồi! 💪`
            }
          />
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3">
          {badge.unlocked ? (
            <button
              onClick={handleShakeBadge}
              className="btn-3d-amber text-amber-950 font-black text-sm py-3 px-6 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md w-full justify-center"
            >
              <Bell className="w-4 h-4 fill-current" />
              <span>Rung chuông leng keng 🔔</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sfx.playPop();
                onClose();
              }}
              className="btn-3d-sky text-white font-black text-sm py-3 px-6 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md w-full justify-center"
            >
              <span>Vào học để mở khóa ngay 🚀</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
