import React from 'react';
import { Shield, Sparkles, BookOpen } from 'lucide-react';
import { KokoMascot } from '../KokoMascot';

interface ChildAlbumHeaderProps {
  masteredCount: number;
  totalCount: number;
  onOpenReviewSession: () => void;
  onOpenParentSheet: () => void;
  reviewCount: number;
}

export const ChildAlbumHeader: React.FC<ChildAlbumHeaderProps> = ({
  masteredCount,
  totalCount,
  onOpenReviewSession,
  onOpenParentSheet,
  reviewCount,
}) => {
  const percent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

  return (
    <header
      style={{ minHeight: '84px', maxHeight: '112px' }}
      className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 border-3 border-amber-200 shadow-md flex items-center justify-between gap-3 sm:gap-6 flex-shrink-0 select-none mb-4"
    >
      {/* 1. Linh vật Koko >= 72px, giọng nói/âm thanh thay bong bóng chữ */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <div
          style={{ width: '76px', height: '76px' }}
          className="flex-shrink-0 flex items-center justify-center -my-2"
        >
          <KokoMascot state="happy" size="md" />
        </div>
      </div>

      {/* 2. Thanh tiến độ trực quan: ⭐ 14/19 (số >= 24px, thanh dày >= 16px) */}
      <div className="flex-1 max-w-md flex flex-col justify-center min-w-0">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-500">⭐</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none">
              {masteredCount} / {totalCount}
            </span>
          </div>
          <span className="text-xs sm:text-sm font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
            Đã thuộc
          </span>
        </div>

        {/* Thanh dày >= 16px */}
        <div className="w-full h-4 sm:h-4.5 bg-slate-100 rounded-full border-2 border-slate-200 overflow-hidden relative shadow-inner">
          <div
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full transition-all duration-500 shadow-xs"
          />
        </div>
      </div>

      {/* 3. Nút Ôn từ (>= 56px cao) & Nút Phụ huynh (🛡, >= 44px) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Nút Ôn từ 🎮 */}
        <button
          type="button"
          onClick={onOpenReviewSession}
          aria-label="Chơi trò chơi ôn từ"
          style={{ minHeight: '56px' }}
          className="px-4 sm:px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-amber-950 font-black text-base sm:text-lg flex items-center gap-2 cursor-pointer shadow-lg border-2 border-amber-300 transition-all flex-shrink-0"
        >
          <span className="text-2xl">🎮</span>
          <span className="font-display tracking-wide">Ôn từ</span>
          {reviewCount > 0 && (
            <span className="bg-white text-orange-600 text-xs px-2 py-0.5 rounded-full font-black shadow-xs">
              {reviewCount}
            </span>
          )}
        </button>

        {/* Nút Phụ huynh (🛡, >= 44px) */}
        <button
          type="button"
          onClick={onOpenParentSheet}
          aria-label="Mở sổ tay phụ huynh"
          style={{ minWidth: '46px', minHeight: '46px' }}
          className="rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 border-2 border-slate-300 flex items-center justify-center cursor-pointer transition-all shadow-xs flex-shrink-0"
          title="Dành cho Phụ huynh"
        >
          <Shield className="w-6 h-6 text-slate-600" />
        </button>
      </div>
    </header>
  );
};
