import React, { useEffect, useState } from "react";
import { X, Sparkles, Trophy, Lock, Bell, ArrowRight } from "lucide-react";
import type { BadgeItem } from "../../data/badges";
import { sfx } from "../../utils/audio";
import { CuteRosetteMedal } from "./CuteRosetteMedal";

/**
 * BadgeShowcaseModal — chi tiet huy hieu
 *
 * Layout: flex-col don gian, khong co position:absolute cho bat ky text/tooltip nao.
 * KokoMascot va speech bubble da duoc XOA HOAN TOAN khoi modal nay.
 *
 *  ┌──────────────────────────────┐
 *  │  [X] Close                   │  absolute top-right (only safe absolute)
 *  ├──────────────────────────────┤
 *  │  SCROLLABLE BODY             │
 *  │   · Category + Tier tags     │
 *  │   · BADGE HERO (Rosette)     │
 *  │   · Certificate box          │
 *  │   · Status / Progress bar    │
 *  ├──────────────────────────────┤
 *  │  FIXED FOOTER                │
 *  │   · Single CTA button        │
 *  └──────────────────────────────┘
 */

interface BadgeShowcaseModalProps {
  badge: (BadgeItem & { unlocked: boolean }) | null;
  onClose: () => void;
  currentProgress?: number;
}

export const BadgeShowcaseModal: React.FC<BadgeShowcaseModalProps> = ({
  badge,
  onClose,
  currentProgress = 0,
}) => {
  const [isJiggling, setIsJiggling] = useState(false);

  useEffect(() => {
    if (!badge) return;
    if (badge.unlocked) { sfx.playBadgeChime(); } else { sfx.playPop(); }
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
    if (badge.reqType === "star") return badge.requirement + " ngôi sao vàng ⭐";
    if (badge.reqType === "unit") return badge.requirement + " Unit đã hoàn thành 🎒";
    return badge.requirement + " Lesson đã hoàn thành 📚";
  };

  const getTierColor = () => {
    if (badge.tier === "diamond") return "bg-purple-100 text-purple-900 border-purple-300";
    if (badge.tier === "gold")    return "bg-amber-100 text-amber-900 border-amber-300";
    if (badge.tier === "silver")  return "bg-sky-100 text-sky-900 border-sky-300";
    return "bg-orange-100 text-orange-900 border-orange-300";
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      {/* Modal card: flex-col, max-h limits height on short screens */}
      <div className="bg-white rounded-[32px] border-4 border-amber-300 shadow-2xl max-w-sm sm:max-w-md w-full relative animate-pop-in flex flex-col max-h-[92dvh]">

        {/* Decorative background glows — pointer-events-none, never block taps */}
        {badge.unlocked && (
          <div className="absolute inset-0 rounded-[32px] pointer-events-none overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] opacity-20 animate-sunburst">
              <div className="w-full h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 blur-2xl" />
            </div>
          </div>
        )}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-100/60 rounded-full blur-2xl pointer-events-none" />

        {/* ── Close button (only absolute element, z-30) ── */}
        <button
          onClick={() => { sfx.playPop(); onClose(); }}
          aria-label="Đóng"
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-3 flex flex-col items-center gap-3">

          {/* 1. Category + Tier tags */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              {badge.categoryName}
            </span>
            <span className={"inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border " + getTierColor()}>
              {badge.tierName}
            </span>
          </div>

          {/* 2. BADGE HERO — tap to jiggle */}
          <button
            onClick={handleShakeBadge}
            title="Bấm vào huy chương để rung chuông leng keng!"
            className="flex justify-center items-center cursor-pointer group focus:outline-none active:scale-95 transition-transform"
          >
            <CuteRosetteMedal
              badge={badge}
              unlocked={badge.unlocked}
              size="lg"
              showRibbons={true}
              isJiggling={isJiggling}
              className="group-hover:scale-110 transition-transform duration-200"
            />
          </button>

          {/* 3. Certificate / Name + Description box */}
          <div className="w-full bg-gradient-to-b from-amber-50/80 via-white to-orange-50/60 rounded-2xl px-4 py-3.5 border-2 border-amber-200/80 shadow-sm text-center">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
              🌿 CHỨNG NHẬN PHẦN THƯỞNG 🌿
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-amber-950 leading-tight mb-1">
              {badge.name}
            </h3>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              {badge.desc}
            </p>
          </div>

          {/* 4. Status: unlocked banner OR progress bar */}
          {badge.unlocked ? (
            <div className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl px-4 py-3 shadow-sm text-emerald-800">
              <Trophy className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs font-black">Tuyệt vời! Bé đã xuất sắc nhận được huy hiệu này! 🎉</span>
            </div>
          ) : (
            <div className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-4 py-3.5 shadow-inner text-left space-y-2">
              <div className="flex justify-between items-center text-xs font-black">
                <span className="text-slate-600 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Mục tiêu cần đạt:
                </span>
                <span className="text-amber-600">{progressPercent}%</span>
              </div>
              <p className="text-xs font-extrabold text-slate-800">{getReqLabel()}</p>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 rounded-full transition-all duration-700"
                  style={{ width: progressPercent + "%" }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500">
                <span>Đã có: {currentProgress}</span>
                <span className="text-amber-700 font-extrabold">Còn thiếu {remaining} nữa thôi!</span>
              </div>
            </div>
          )}

        </div>
        {/* /SCROLLABLE BODY */}

        {/* ── FIXED FOOTER: CTA button — never scrolled away ── */}
        <div className="flex-shrink-0 px-6 pb-5 pt-2 border-t border-slate-100 bg-white rounded-b-[32px]">
          {badge.unlocked ? (
            <button
              onClick={handleShakeBadge}
              className="btn-3d-amber w-full py-3.5 rounded-2xl text-amber-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              <Bell className="w-4 h-4 fill-current animate-bounce" />
              Rung chuông leng keng 🔔
            </button>
          ) : (
            <button
              onClick={() => { sfx.playPop(); onClose(); }}
              className="btn-3d-sky w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
            >
              Vào học để mở khóa ngay 🚀
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
