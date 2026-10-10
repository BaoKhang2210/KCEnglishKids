import React, { useEffect, useState } from "react";
import { X, Sparkles, Heart, Lock, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import type { StickerItem } from "../../data/stickers";
import { sfx } from "../../utils/audio";

/**
 * StickerShowcaseModal — chi tiet sticker
 *
 * Layout: flex-col thuan tuy, KHONG co KokoMascot speech bubble nao.
 *
 *  ┌──────────────────────────────┐
 *  │  [X] Close                   │
 *  ├──────────────────────────────┤
 *  │  SCROLLABLE BODY             │
 *  │   · Rarity badge pill        │
 *  │   · STICKER HERO (big icon)  │
 *  │   · Title + Description      │
 *  │   · Status / Unlock guide    │
 *  ├──────────────────────────────┤
 *  │  FIXED FOOTER                │
 *  │   · Single CTA button        │
 *  └──────────────────────────────┘
 */

interface StickerShowcaseModalProps {
  sticker: StickerItem | null;
  isUnlocked: boolean;
  onClose: () => void;
}

export const StickerShowcaseModal: React.FC<StickerShowcaseModalProps> = ({
  sticker,
  isUnlocked,
  onClose,
}) => {
  const [isPeeling, setIsPeeling] = useState(false);

  useEffect(() => {
    if (!sticker) return;
    if (isUnlocked) {
      sfx.playStarFanfare();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#F43F5E", "#EC4899", "#A855F7", "#38BDF8", "#FBBF24"],
        });
      } catch {}
    } else {
      sfx.playPop();
    }
  }, [sticker?.id, isUnlocked]);

  if (!sticker) return null;

  const handlePeel = () => {
    sfx.playPop();
    setIsPeeling(true);
    setTimeout(() => setIsPeeling(false), 500);
  };

  const rarityMap: Record<string, { label: string; pill: string; icon: string }> = {
    common:    { label: "Sticker Thường",      pill: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: "🌱" },
    rare:      { label: "Sticker Hiếm",        pill: "bg-sky-100 text-sky-800 border-sky-300",             icon: "💎" },
    epic:      { label: "Sticker Sử Thi",      pill: "bg-purple-100 text-purple-800 border-purple-300",    icon: "🔮" },
    legendary: { label: "Sticker Huyền Thoại", pill: "bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-950 border-amber-400", icon: "👑" },
  };
  const rarity = rarityMap[sticker.rarity] || rarityMap.common;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      {/* Modal card */}
      <div className="bg-white rounded-[32px] border-4 border-rose-300 shadow-2xl max-w-sm sm:max-w-md w-full relative animate-pop-in flex flex-col max-h-[92dvh]">

        {/* Decorative background auras — pointer-events-none */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-100/60 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-amber-100/50 rounded-full blur-2xl pointer-events-none" />

        {/* ── Close button (only absolute element) ── */}
        <button
          onClick={() => { sfx.playPop(); onClose(); }}
          aria-label="Đóng"
          className="absolute top-4 right-4 z-30 w-10 h-10 rounded-2xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* ── SCROLLABLE BODY ── */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-3 flex flex-col items-center gap-4">

          {/* 1. Rarity pill */}
          <span className={"inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm " + rarity.pill}>
            <Sparkles className="w-3.5 h-3.5" />
            {rarity.icon} {rarity.label}
          </span>

          {/* 2. STICKER HERO — tap to peel */}
          <button
            onClick={handlePeel}
            title="Bấm vào sticker để bóc dán vui nhộn!"
            className="flex justify-center items-center cursor-pointer group focus:outline-none active:scale-95 transition-transform"
          >
            <div
              className={
                "w-36 h-36 sm:w-44 sm:h-44 rounded-4xl flex items-center justify-center relative overflow-hidden shadow-2xl transition-transform duration-300 " +
                (isUnlocked
                  ? sticker.rarity === "legendary"
                    ? "puffy-sticker holographic-foil"
                    : "puffy-sticker bg-gradient-to-tr " + sticker.bgGradient
                  : "bg-slate-100 border-4 border-dashed border-slate-300") +
                " " + (isPeeling ? "animate-jelly" : "group-hover:scale-110 group-hover:rotate-[-3deg]")
              }
            >
              {/* Gloss overlay */}
              {isUnlocked && (
                <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/45 via-white/15 to-transparent pointer-events-none" />
              )}
              <span className="text-7xl sm:text-8xl filter drop-shadow-lg select-none">
                {isUnlocked ? sticker.icon : "🔒"}
              </span>
              {/* Peel corner fold */}
              {isUnlocked && (
                <div className="absolute bottom-0 right-0 w-7 h-7 bg-white/35 backdrop-blur-xs rounded-tl-2xl pointer-events-none" />
              )}
            </div>
          </button>

          {/* 3. Title */}
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-tight">
            {isUnlocked ? sticker.name : "Sticker Bí Ẩn 🔒"}
          </h3>

          {/* 4. Description */}
          <p className="text-sm font-bold text-slate-600 text-center max-w-xs leading-relaxed">
            {isUnlocked
              ? sticker.desc
              : "Sticker này đang trốn trong hộp quà bí ẩn! Bé hãy chơi Trò chơi và đạt 2–3 ngôi sao để mở khóa nhé!"}
          </p>

          {/* 5. Status card */}
          {isUnlocked ? (
            <div className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 rounded-2xl px-4 py-3 shadow-sm text-rose-800">
              <Heart className="w-4 h-4 text-rose-600 fill-rose-500 flex-shrink-0 animate-soft-bounce" />
              <span className="text-xs font-black">Đã dán vào Sổ Bộ Sưu Tập của bé! 💖</span>
            </div>
          ) : (
            <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-left shadow-sm space-y-1">
              <p className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                Cách mở khóa:
              </p>
              <p className="text-xs font-bold text-slate-700 leading-relaxed">
                Vào mục Trò chơi, trả lời các câu hỏi từ vựng và giành 2–3 sao vàng để sưu tầm thêm sticker mới nhé!
              </p>
            </div>
          )}

        </div>
        {/* /SCROLLABLE BODY */}

        {/* ── FIXED FOOTER: single CTA — always visible ── */}
        <div className="flex-shrink-0 px-6 pb-5 pt-2 border-t border-slate-100 bg-white rounded-b-[32px]">
          <button
            onClick={() => { sfx.playPop(); onClose(); }}
            className="btn-3d-amber w-full py-3.5 rounded-2xl text-amber-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
          >
            Tiếp tục sưu tập thêm sticker! 🎁
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

      </div>
    </div>
  );
};
