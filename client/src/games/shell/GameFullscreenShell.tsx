import React, { useRef } from 'react';
import { ArrowLeft, Star, Volume2 } from 'lucide-react';
import { sfx } from '../../utils/audio';

interface GameFullscreenShellProps {
  title: string;
  categoryIcon: React.ReactNode;
  currentIndex: number;
  totalTargets: number;
  stars: number;
  onBack: () => void;
  onReplayAudio?: () => void;
  children: React.ReactNode;
}

/**
 * GameFullscreenShell: In-flow container inside LessonShell.
 * Top bar of the lesson remains visible and accessible above.
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

  const handleBack = () => {
    sfx.playPop();
    onBack();
  };

  return (
    <div
      id="game-fullscreen-shell"
      className="relative flex flex-col flex-1 min-h-0 w-full h-full overflow-hidden text-slate-100 select-none rounded-2xl"
      style={{
        background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 100%)',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* ── GAME INNER BAR (50px) ── */}
      <header
        style={{ height: '50px', minHeight: '50px' }}
        className="w-full px-3 sm:px-6 flex items-center justify-between border-b border-indigo-500/30 bg-slate-900/80 backdrop-blur-md flex-shrink-0 z-10"
      >
        {/* Left: Nút quay lại danh sách game (>= 48px tap area) */}
        <button
          onClick={handleBack}
          type="button"
          aria-label="Quay lại danh sách trò chơi"
          title="Quay lại danh sách game"
          className="min-w-[48px] min-h-[48px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black cursor-pointer active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-amber-300 stroke-[3]" />
          <span className="text-xs font-black text-amber-200 hidden sm:inline">Danh sách game</span>
        </button>

        {/* Center: Game Title & Icon */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
            {typeof categoryIcon === 'string' ? <span className="text-xl sm:text-2xl">{categoryIcon}</span> : categoryIcon}
          </div>
          <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">{title}</h2>
        </div>

        {/* Right: Progress dots + Stars */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs font-black text-indigo-200 bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-400/40">
            {Math.min(currentIndex + 1, totalTargets)} / {totalTargets}
          </span>
          <div className="flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-400/50">
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
          style={{ height: '56px', minHeight: '56px' }}
          className="w-full px-4 flex items-center justify-center shrink-0 z-10 pb-2 pointer-events-none"
        >
          <button
            onClick={() => {
              sfx.playPop();
              onReplayAudio();
            }}
            type="button"
            aria-label="Nghe lại phát âm"
            className="pointer-events-auto min-w-[72px] sm:min-w-[96px] min-h-[48px] h-12 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border-2 border-amber-200"
          >
            <Volume2 className="w-6 h-6 stroke-[2.5]" />
            <span className="text-xs sm:text-sm font-black hidden xs:inline">Nghe lại</span>
          </button>
        </footer>
      )}
    </div>
  );
};