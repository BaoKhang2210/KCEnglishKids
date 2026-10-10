import React from 'react';
import { Star, Play, RotateCcw } from 'lucide-react';
import type { Activity } from '../../../types';
import { KokoMascot } from '../KokoMascot';
import { sfx, playWordAudio } from '../../../utils/audio';
import { getCleanGameTitle, getGameIllustration } from '../games/gameRegistry';

interface Stage3GameListProps {
  games: Activity[];
  onSelectGame: (gameId: string) => void;
}

/**
 * Stage3GameList: Enlarged Preschool Layout (100dvh viewport-locked, no scrolling).
 * - Cards occupy >= 50% of viewport content height.
 * - Massive distinct illustrations (>=96px) for each game.
 * - Short names (>= 28px) without truncated ellipsis.
 * - Big stars (>= 40px) and round play button (>= 56px).
 * - Koko >= 96px with animated icon bubble (🎮 + sound waves) without text chips.
 */
export const Stage3GameList: React.FC<Stage3GameListProps> = ({
  games,
  onSelectGame,
}) => {
  const handleGameCardClick = (game: Activity) => {
    sfx.playPop();
    const cleanTitle = getCleanGameTitle(game);
    playWordAudio(cleanTitle);
    onSelectGame(game._id);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between items-center min-h-0 select-none px-3 sm:px-6 py-2">
      {/* ── Top Guide: Koko Mascot >= 96px with animated game icon bubble ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-3 mb-1">
        <KokoMascot state="happy" size="md" interactive={false} />
        {/* Animated Icon Bubble (🎮 + 🎵 sound wave, NO text chip) */}
        <div className="bg-purple-100 border-3 border-purple-300 px-4 py-2 rounded-full shadow-md flex items-center gap-2 animate-soft-bounce">
          <span className="text-2xl sm:text-3xl">🎮</span>
          <span className="text-xl sm:text-2xl animate-pulse">✨</span>
        </div>
      </div>

      {/* ── Main Game Cards Grid: Height >= 50% of content zone, max 3-4 cards ── */}
      <div className="flex-1 w-full max-w-6xl min-h-0 flex items-center justify-center py-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8 w-full justify-items-center items-center h-full max-h-[460px]">
          {games.slice(0, 3).map((g, idx) => {
            const isCompleted = (g as any).completed;
            const isNextSuggested = idx === 0 && !isCompleted;
            const cleanTitle = getCleanGameTitle(g);
            const { icon, emoji, color } = getGameIllustration(g);

            return (
              <button
                key={g._id}
                onClick={() => handleGameCardClick(g)}
                type="button"
                aria-label={`Trò chơi ${cleanTitle}. ${isCompleted ? 'Đã hoàn thành. Chạm để chơi lại' : 'Chưa chơi'}`}
                style={{
                  height: 'clamp(210px, 52cqh, 340px)',
                  minHeight: '200px',
                }}
                className={`w-full max-w-[340px] rounded-4xl border-5 p-4 sm:p-6 flex flex-col justify-between items-center text-center cursor-pointer transition-all duration-300 shadow-xl active:scale-95 group relative overflow-hidden ${
                  isNextSuggested
                    ? 'border-purple-400 bg-purple-50/90 ring-6 ring-purple-200 animate-soft-bounce'
                    : isCompleted
                    ? 'border-amber-300 bg-amber-50/70 hover:bg-white'
                    : 'border-slate-200 bg-white hover:border-purple-300 hover:scale-102'
                }`}
              >
                {/* 1. Header Status & Star >= 40px */}
                <div className="w-full flex justify-between items-center">
                  <span className="text-3xl sm:text-4xl">{icon}</span>
                  {isCompleted ? (
                    <div className="flex items-center gap-1 bg-amber-100 px-3 py-1 rounded-full border-2 border-amber-300">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      <RotateCcw className="w-4 h-4 text-amber-800" />
                    </div>
                  ) : (
                    <span className="text-3xl text-slate-300">☆</span>
                  )}
                </div>

                {/* 2. Distinct Center Illustration (>= 96px) */}
                <div
                  style={{ width: '96px', height: '96px' }}
                  className={`rounded-3xl bg-gradient-to-tr ${color} border-3 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform my-auto`}
                >
                  <span style={{ fontSize: '52px' }} className="select-none filter drop-shadow">
                    {emoji}
                  </span>
                </div>

                {/* 3. Short, bold game title (>= 28px, no truncation) */}
                <h3
                  style={{ fontSize: 'clamp(22px, 3.5vmin, 28px)', lineHeight: 1.2 }}
                  className="font-black text-slate-800 group-hover:text-purple-700 transition-colors uppercase tracking-tight"
                >
                  {cleanTitle}
                </h3>

                {/* 4. Action Button: Circular Play (>= 56px) */}
                <div className="mt-2 flex items-center justify-center">
                  <div
                    style={{ width: '56px', height: '56px' }}
                    className={`rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 ${
                      isCompleted ? 'bg-amber-400 text-amber-950' : 'bg-purple-500 text-white'
                    }`}
                  >
                    {isCompleted ? (
                      <RotateCcw className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <Play className="w-7 h-7 fill-current translate-x-0.5" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom spacer guard */}
      <div className="flex-shrink-0 h-1" />
    </div>
  );
};
