import React from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { sfx } from '../../../utils/audio';

interface GameFullscreenShellProps {
  currentRound: number;
  totalRounds: number;
  score: number;
  onBack: () => void;
  children: React.ReactNode;
}

/**
 * GameFullscreenShell: Isolated Fullscreen Overlay for Mini-Games.
 * - position: fixed; inset: 0; z-index: 9999;
 * - background: #13110e (clean, distraction-free preschool dark backdrop)
 * - Obscures app-wide header, navbars, and background tab texts 100%.
 * - Topbar <= 56px with "← Trở lại danh sách trò chơi" and round/score badges.
 * - Center content area with 100dvh NO-SCROLL guarantee.
 */
export const GameFullscreenShell: React.FC<GameFullscreenShellProps> = ({
  currentRound,
  totalRounds,
  score,
  onBack,
  children,
}) => {
  const handleBack = () => {
    sfx.playPop();
    onBack();
  };

  return (
    <div
      id="game-fullscreen-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#13110e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100dvh',
        maxHeight: '100dvh',
        width: '100vw',
      }}
      className="select-none text-slate-100"
    >
      {/* ── TOPBAR (Height <= 56px) ── */}
      <header
        style={{ height: '56px', minHeight: '56px', maxHeight: '56px' }}
        className="w-full px-3 sm:px-6 flex items-center justify-between border-b border-amber-500/20 bg-[#1c1813]/90 backdrop-blur-md flex-shrink-0 z-10"
      >
        {/* Left: Back button */}
        <button
          onClick={handleBack}
          type="button"
          aria-label="Trở lại danh sách trò chơi"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-[#26201a] hover:bg-[#342c23] border border-amber-500/30 text-amber-200 text-xs sm:text-sm font-black cursor-pointer shadow-sm active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400 stroke-[2.5]" />
          <span>Trở lại danh sách trò chơi</span>
        </button>

        {/* Right: Round & Score Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] sm:text-xs font-black text-amber-300 bg-amber-950/70 px-3 py-1 rounded-full border border-amber-500/40 shadow-xs">
            Vòng {currentRound + 1} / {totalRounds}
          </span>
          <div className="flex items-center gap-1.5 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/50 shadow-xs">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-[11px] sm:text-xs font-black text-amber-200">
              {score} điểm
            </span>
          </div>
        </div>
      </header>

      {/* ── PLAY AREA (Flex Center, 100% Fit NO-SCROLL) ── */}
      <main className="flex-1 w-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
};
