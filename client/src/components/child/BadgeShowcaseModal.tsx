import React, { useEffect, useState } from 'react';
import { X, Sparkles, Trophy, Lock, Bell, ArrowRight } from 'lucide-react';
import type { BadgeItem } from '../../data/badges';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { CuteRosetteMedal } from './CuteRosetteMedal';

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
    setTimeout(() => setIsJiggling(false), 550);
  };

  const reqValue = badge.requirement;
  const progressPercent = Math.min(100, Math.round((currentProgress / reqValue) * 100));
  const remaining = Math.max(0, reqValue - currentProgress);

  const getReqLabel = () => {
    if (badge.reqType === 'star') return `${badge.requirement} Ngôi sao vàng ⭐`;
    if (badge.reqType === 'unit') return `${badge.requirement} Unit bài học 🎒`;
    return `${badge.requirement} Bài học đã hoàn thành 📚`;
  };

  const getTierColor = () => {
    if (badge.tier === 'diamond') return 'bg-purple-100 text-purple-900 border-purple-300';
    if (badge.tier === 'gold') return 'bg-amber-100 text-amber-900 border-amber-300';
    if (badge.tier === 'silver') return 'bg-sky-100 text-sky-900 border-sky-300';
    return 'bg-orange-100 text-orange-900 border-orange-300';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[36px] border-4 border-amber-300 shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 relative overflow-hidden animate-pop-in text-center">
        {/* Sunburst glowing background when unlocked */}
        {badge.unlocked && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none opacity-25 animate-sunburst">
            <div className="w-full h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 blur-2xl" />
          </div>
        )}

        {/* Soft pastel corner decors */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-100/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-orange-100/60 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors z-30 shadow-xs"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header Tags: Category & Tier */}
        <div className="flex items-center justify-center gap-2 mb-4 relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs bg-amber-100 text-amber-900 border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>{badge.categoryName}</span>
          </span>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${getTierColor()}`}>
            <span>{badge.tierName}</span>
          </span>
        </div>

        {/* 3D Rosette Medal with Ribbon Tails */}
        <div
          onClick={handleShakeBadge}
          className="relative my-4 pb-4 flex justify-center items-center cursor-pointer group"
          title="Bấm vào huy chương để rung chuông leng keng!"
        >
          <CuteRosetteMedal
            badge={badge}
            unlocked={badge.unlocked}
            size="lg"
            showRibbons={true}
            isJiggling={isJiggling}
            className="group-hover:scale-108 transition-transform"
          />
        </div>

        {/* Certificate Style Box */}
        <div className="relative z-10 bg-gradient-to-b from-amber-50/70 via-white to-orange-50/50 rounded-2xl p-4 border-2 border-amber-200/80 shadow-xs mb-4">
          <div className="flex items-center justify-center gap-1 text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1">
            <span>🌿</span>
            <span>CHỨNG NHẬN DANH DỰ</span>
            <span>🌿</span>
          </div>

          {/* Badge Title */}
          <h3 className="text-2xl sm:text-3xl font-black text-amber-950 font-display leading-tight mb-1">
            {badge.name}
          </h3>

          {/* Badge Description */}
          <p className="text-sm font-extrabold text-slate-600 max-w-xs mx-auto">
            {badge.desc}
          </p>
        </div>

        {/* Status Box */}
        {badge.unlocked ? (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl p-3.5 mb-4 text-emerald-800 flex items-center justify-center gap-2 shadow-xs">
            <Trophy className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-black">Bé đã xuất sắc chinh phục huy hiệu này! 🎉</span>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 mb-4 text-left shadow-inner">
            <div className="flex justify-between items-center text-xs font-black mb-1.5">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                Nhiệm vụ cần đạt:
              </span>
              <span className="text-amber-600 font-extrabold">{progressPercent}%</span>
            </div>
            <p className="text-xs font-extrabold text-slate-800 mb-2.5">
              {getReqLabel()}
            </p>

            {/* Candy Jelly Progress Bar */}
            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1.5 text-[11px] font-bold text-slate-500">
              <span>Đã có: {currentProgress}</span>
              <span className="text-amber-700 font-extrabold">Còn thiếu: {remaining} nữa thôi!</span>
            </div>
          </div>
        )}

        {/* Mascot Speech Bubble */}
        <div className="flex items-center justify-center gap-3 my-2 relative z-10">
          <KokoMascot
            state={badge.unlocked ? 'celebrating' : 'encouraging'}
            size="sm"
            speechBubble={
              badge.unlocked
                ? 'Huy hiệu lấp lánh quá bé ơi! 🌟'
                : `Bé cố lên nhé! Sắp mở khóa được rồi! 💪`
            }
          />
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-3 relative z-10">
          {badge.unlocked ? (
            <button
              onClick={handleShakeBadge}
              className="btn-3d-amber text-amber-950 font-black text-sm sm:text-base py-3 px-6 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md w-full justify-center active:scale-95 transition-all"
            >
              <Bell className="w-4 h-4 fill-current animate-bounce" />
              <span>Rung chuông leng keng 🔔</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sfx.playPop();
                onClose();
              }}
              className="btn-3d-sky text-white font-black text-sm sm:text-base py-3 px-6 rounded-2xl flex items-center gap-2 cursor-pointer shadow-md w-full justify-center active:scale-95 transition-all"
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
