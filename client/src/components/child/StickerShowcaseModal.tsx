import React, { useEffect, useState } from 'react';
import { X, Sparkles, Heart, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { StickerItem } from '../../data/stickers';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';

interface StickerShowcaseModalProps {
  sticker: StickerItem | null;
  isUnlocked: boolean;
  onClose: () => void;
}

export const StickerShowcaseModal: React.FC<StickerShowcaseModalProps> = ({
  sticker,
  isUnlocked,
  onClose
}) => {
  const [isPeeling, setIsPeeling] = useState(false);

  useEffect(() => {
    if (sticker) {
      if (isUnlocked) {
        sfx.playStarFanfare();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#F43F5E', '#EC4899', '#A855F7', '#38BDF8', '#FBBF24']
          });
        } catch {}
      } else {
        sfx.playPop();
      }
    }
  }, [sticker?.id, isUnlocked]);

  if (!sticker) return null;

  const handlePeel = () => {
    sfx.playPop();
    setIsPeeling(true);
    setTimeout(() => setIsPeeling(false), 500);
  };

  const rarityMap = {
    common: { label: 'Sticker Phổ Thông', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: '🌱' },
    rare: { label: 'Sticker Hiếm', badge: 'bg-sky-100 text-sky-800 border-sky-300', icon: '💎' },
    epic: { label: 'Sticker Sử Thi', badge: 'bg-purple-100 text-purple-800 border-purple-300', icon: '🔮' },
    legendary: { label: 'Sticker Huyền Thoại', badge: 'bg-gradient-to-r from-amber-200 to-yellow-300 text-amber-950 border-amber-400', icon: '👑' }
  };

  const rarityInfo = rarityMap[sticker.rarity] || rarityMap.common;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[36px] border-4 border-rose-300 shadow-2xl max-w-sm sm:max-w-md w-full p-6 sm:p-8 relative overflow-hidden animate-pop-in text-center">
        {/* Soft pastel aura background */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-rose-100/70 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-44 h-44 bg-amber-100/60 rounded-full blur-2xl pointer-events-none" />

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

        {/* Top Rarity Badge */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4 shadow-2xs border bg-rose-50 text-rose-900 border-rose-200">
          <Sparkles className="w-3.5 h-3.5 text-rose-600 fill-rose-500" />
          <span>{rarityInfo.icon} {rarityInfo.label}</span>
        </div>

        {/* Big 3D Puffy Vinyl Sticker with Peel Physics */}
        <div
          onClick={handlePeel}
          className="relative my-4 flex justify-center items-center cursor-pointer group"
          title="Bấm vào sticker để bóc dán vui nhộn!"
        >
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-4xl flex items-center justify-center relative overflow-hidden shadow-2xl transition-transform duration-300 ${
              isUnlocked
                ? sticker.rarity === 'legendary'
                  ? 'puffy-sticker holographic-foil'
                  : `puffy-sticker bg-gradient-to-tr ${sticker.bgGradient}`
                : 'bg-slate-200 border-4 border-dashed border-slate-300 text-slate-400'
            } ${isPeeling ? 'animate-jelly' : 'group-hover:scale-108 group-hover:rotate-[-3deg]'}`}
          >
            {/* Top Gloss Arc Light Reflection */}
            {isUnlocked && (
              <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/45 via-white/15 to-transparent rounded-t-4xl pointer-events-none" />
            )}

            {/* Sticker Icon */}
            <span className="text-7xl sm:text-8xl filter drop-shadow-lg select-none">
              {isUnlocked ? sticker.icon : '🔒'}
            </span>

            {/* Peel corner fold effect in bottom-right */}
            {isUnlocked && (
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-white/40 backdrop-blur-xs rounded-tl-2xl shadow-xs pointer-events-none" />
            )}
          </div>
        </div>

        {/* Sticker Title */}
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-display mt-2 mb-1">
          {isUnlocked ? sticker.name : 'Sticker Bí Mật'}
        </h3>

        {/* Sticker Meaning Story */}
        <p className="text-sm font-bold text-slate-600 max-w-xs mx-auto mb-4 leading-relaxed">
          {isUnlocked
            ? sticker.desc
            : 'Sticker này đang được cất kỹ trong hộp quà bí mật! Bé hãy chơi các bài mini-game đạt 2–3 sao để mở khóa nhé!'}
        </p>

        {/* Status card */}
        {isUnlocked ? (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-300 rounded-2xl p-3 mb-4 text-rose-800 flex items-center justify-center gap-2 shadow-xs">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-500 flex-shrink-0 animate-soft-bounce" />
            <span className="text-sm font-black">Đã dán vào Sổ Bộ Sưu Tập của bé! 💖</span>
          </div>
        ) : (
          <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 mb-4 text-slate-600 text-xs font-extrabold text-left shadow-inner">
            <span className="block font-black text-amber-700 mb-1">💡 Làm sao để mở khóa sticker này?</span>
            <span>Vào mục Trò chơi (12 Mini-Games), trả lời đúng các từ vựng và giành 2-3 sao vàng để hệ thống tặng ngẫu nhiên một sticker mới tinh!</span>
          </div>
        )}

        {/* Mascot cheer */}
        <div className="flex items-center justify-center my-2">
          <KokoMascot
            state={isUnlocked ? 'celebrating' : 'thinking'}
            size="sm"
            speechBubble={
              isUnlocked
                ? 'Sticker siêu đáng yêu luôn bé ơi! 🌟'
                : 'Bé chơi trò chơi để rinh sticker này về nhé! 🎮'
            }
          />
        </div>

        {/* Action button */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => {
              sfx.playPop();
              onClose();
            }}
            className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            <span>Tiếp tục sưu tập thêm sticker! 🎁</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
