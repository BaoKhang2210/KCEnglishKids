import React from 'react';
import { Star } from 'lucide-react';
import type { GameDefinition } from '../core/types';
import { sfx } from '../../utils/audio';
import { GameIcon } from './GameIcon';

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
  const gameGradients: Record<string, string> = {
    'bubble-pop': 'from-sky-500 via-blue-600 to-indigo-800',
    'balloon-float': 'from-rose-500 via-pink-600 to-purple-800',
    'tunnel-runner': 'from-cyan-500 via-blue-600 to-indigo-900',
    'prize-wheel': 'from-amber-500 via-orange-600 to-rose-700',
    'koko-says': 'from-amber-600 via-amber-700 to-amber-950',
    'memory-match': 'from-violet-500 via-purple-600 to-indigo-900',
    'shadow-puzzle': 'from-indigo-600 via-slate-800 to-slate-950',
    'peek-a-boo': 'from-amber-700 via-orange-800 to-stone-900',
    'feed-the-monsters': 'from-emerald-500 via-teal-600 to-emerald-900',
    'mystery-boxes': 'from-fuchsia-600 via-purple-700 to-indigo-950',
    'picture-builder': 'from-blue-500 via-indigo-600 to-purple-800',
    'kokos-delivery': 'from-orange-500 via-amber-600 to-yellow-800',
  };

  const bgGradient = gameGradients[game.id] || 'from-indigo-600 via-blue-700 to-slate-900';

  return (
    <button
      onClick={() => {
        sfx.playPop();
        onSelect(game.id);
      }}
      type="button"
      aria-label={`Chơi trò chơi ${game.title}: ${game.subtitle}`}
      className={`group relative w-full h-full min-h-[140px] sm:min-h-[160px] rounded-3xl overflow-hidden flex flex-col justify-between p-3.5 sm:p-5 text-left transition-all duration-200 active:scale-95 hover:scale-[1.02] shadow-xl hover:shadow-2xl cursor-pointer bg-gradient-to-br ${bgGradient} border-2 ${
        isSuggested
          ? 'border-amber-300 ring-4 ring-amber-300/70'
          : 'border-white/30 hover:border-amber-200'
      }`}
    >
      <div className="absolute inset-0 bg-black/15 pointer-events-none" />

      {/* TOP ROW: Icon SVG trong khung rounded-2xl + Huy hiệu */}
      <div className="relative w-full flex items-start justify-between z-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center p-2 shadow-inner group-hover:scale-105 transition-transform shrink-0">
          <GameIcon gameId={game.id} className="w-12 h-12 sm:w-16 sm:h-16" />
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          {isCompleted && (
            <div className="bg-amber-400 text-slate-950 rounded-full px-2.5 py-1 flex items-center gap-1 shadow-md border border-amber-200">
              <Star className="w-4 h-4 fill-slate-950 stroke-[2.5]" />
              <span className="text-[11px] font-black uppercase">Đã xong</span>
            </div>
          )}
          {isSuggested && !isCompleted && (
            <div className="bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-full shadow-md animate-soft-bounce border border-amber-200">
              Chơi ngay ✨
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM INFO: Tên và mô tả tương phản cao */}
      <div className="relative z-10 mt-2 bg-slate-950/40 backdrop-blur-sm rounded-2xl p-2.5 sm:p-3 border border-white/10">
        <h3 className="text-white font-black text-base sm:text-xl drop-shadow-md leading-tight line-clamp-1">
          {game.title}
        </h3>
        <p className="text-white/90 font-bold text-xs sm:text-sm drop-shadow-sm mt-0.5 line-clamp-1">
          {game.subtitle}
        </p>
      </div>
    </button>
  );
};