import React from 'react';
import { Star } from 'lucide-react';
import type { GameDefinition } from '../core/types';
import { sfx } from '../../utils/audio';

interface GameCardProps {
  game: GameDefinition;
  isCompleted?: boolean;
  isSuggested?: boolean;
  onSelect: (gameId: string) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  isCompleted = false,
  isSuggested = false,
  onSelect,
}) => {
  // Màu nền theo danh mục đạt chuẩn tương phản chữ trắng >= 4.5:1
  const categoryBottomColors = {
    tap_pop: 'bg-[#D9480F]',      // Đỏ cam vui tươi
    find_match: 'bg-[#2F7D6B]',   // Xanh ngọc
    build_make: 'bg-[#4B44C9]',   // Chàm đậm
  };

  const bottomBg = categoryBottomColors[game.category] || 'bg-slate-800';

  return (
    <button
      onClick={() => {
        sfx.playPop();
        onSelect(game.id);
      }}
      type="button"
      className={`relative w-full h-full min-h-[160px] sm:min-h-[180px] rounded-3xl overflow-hidden flex flex-col text-left transition-all active:scale-95 shadow-xl cursor-pointer group border-3 ${
        isSuggested
          ? 'border-amber-300 ring-4 ring-amber-300/60 animate-soft-bounce'
          : 'border-white/30 hover:border-amber-200'
      }`}
    >
      {/* 65% TOP: Nền sóng hai tông mềm + Icon lớn */}
      <div className="h-[65%] w-full bg-gradient-to-b from-white/20 via-white/10 to-transparent flex items-center justify-center relative p-3 backdrop-blur-xs">
        <span className="text-[clamp(2.5rem,7vmin,4rem)] group-hover:scale-110 transition-transform">
          {game.icon}
        </span>

        {/* Trạng thái đã hoàn thành */}
        {isCompleted && (
          <div className="absolute top-2.5 right-2.5 bg-amber-400 text-slate-900 rounded-full p-1 shadow-md">
            <Star className="w-4 h-4 fill-slate-900 stroke-[2.5]" />
          </div>
        )}

        {/* Gợi ý chơi tiếp */}
        {isSuggested && !isCompleted && (
          <div className="absolute top-2 left-2 bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
            Try next ✨
          </div>
        )}
      </div>

      {/* 35% BOTTOM: Nền phẳng theo nhóm + Tên + Phụ đề */}
      <div className={`h-[35%] w-full ${bottomBg} px-3 py-2 flex flex-col justify-center`}>
        <h3 className="text-white font-black text-sm sm:text-base leading-tight truncate">
          {game.title}
        </h3>
        <p className="text-white/80 font-bold text-[11px] sm:text-xs truncate">
          {game.subtitle}
        </p>
      </div>
    </button>
  );
};
