import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Star, Volume2 } from 'lucide-react';
import { sfx } from '../../utils/audio';

interface GameFullscreenShellProps {
  title: string;
  categoryIcon: string;
  currentIndex: number;
  totalTargets: number;
  stars: number;
  onBack: () => void;
  onReplayAudio?: () => void;
  children: React.ReactNode;
}

/**
 * GameFullscreenShell: Rendered via Portal at document.body
 * - position: fixed; inset: 0; z-index: 9999; height: 100dvh
 * - Locks body scroll, overscroll-behavior: none, user-select: none
 * - Handles browser popstate (Back button) to exit gracefully
 */
export const GameFullscreenShell: React.FC<GameFullscreenShellProps> = ({
  title,
  categoryIcon,
  currentIndex,
  totalTargets,
  stars,
  onBack,
  onReplayAudio,
  children,
}) => {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  // Push state to browser history for native back button support
  useEffect(() => {
    window.history.pushState({ stage3GameOpen: true }, '');

    const handlePopState = () => {
      onBackRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Lock body scroll and set touch actions
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.overscrollBehavior = origOverscroll;
    };
  }, []);

  const handleBack = () => {
    sfx.playPop();
    window.history.back();
  };

  return (
    <div
      id="game-fullscreen-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100dvh',
        width: '100vw',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="text-slate-100 select-none"
    >
      {/* ── TOPBAR (56px) ── */}
      <header
        style={{ height: '56px', minHeight: '56px' }}
        className="w-full px-3 sm:px-6 flex items-center justify-between border-b border-indigo-500/30 bg-slate-900/80 backdrop-blur-md flex-shrink-0 z-30"
      >
        {/* Left: Back button (>= 64px tap area) */}
        <button
          onClick={handleBack}
          type="button"
          aria-label="Back to games"
          className="min-w-[64px] min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black cursor-pointer active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-amber-300 stroke-[3]" />
        </button>

        {/* Center: Game Title & Icon */}
        <div className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl">{categoryIcon}</span>
          <h2 className="text-sm sm:text-base font-black text-white tracking-wide">{title}</h2>
        </div>

        {/* Right: Progress dots + Stars */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-black text-indigo-200 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-400/40">
            {Math.min(currentIndex + 1, totalTargets)} / {totalTargets}
          </span>
          <div className="flex items-center gap-1 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-400/50">
            <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span className="text-xs font-black text-amber-200">{stars}</span>
          </div>
        </div>
      </header>

      {/* ── MAIN PLAY AREA (100% Fit, zero scroll) ── */}
      <main className="flex-1 w-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        <div className="w-full max-w-5xl h-full flex flex-col items-center justify-center min-h-0 relative">
          {children}
        </div>
      </main>

      {/* ── FOOTER BAR (Audio Replay Button) ── */}
      {onReplayAudio && (
        <footer
          style={{ height: '64px', minHeight: '64px' }}
          className="w-full px-4 flex items-center justify-center shrink-0 z-30 pb-2 pointer-events-none"
        >
          <button
            onClick={() => {
              sfx.playPop();
              onReplayAudio();
            }}
            type="button"
            aria-label="Replay audio"
            className="pointer-events-auto min-w-[72px] sm:min-w-[96px] h-12 sm:h-14 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-amber-200"
          >
            <Volume2 className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs sm:text-sm font-black hidden xs:inline">Listen</span>
          </button>
        </footer>
      )}
    </div>
  );
};
