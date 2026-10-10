import React from 'react';
import { ArrowLeft, Home, Star, RotateCcw } from 'lucide-react';
import { ProgressDots } from '../lesson/ProgressDots';

interface GameStageProps {
  onBack: () => void;
  onHome: () => void;
  currentQuestionIndex: number;
  totalQuestions: number;
  starsCount?: number;
  children: React.ReactNode;
  isFinished?: boolean;
  onRetry?: () => void;
  onReturnToGames?: () => void;
}

/**
 * GameStage: Universal 100dvh viewport-locked wrapper for ALL mini-games.
 *
 * Sizing:
 * - Header: Height clamp(60px, 9dvh, 72px) with Back (←) and Home (🏠) buttons >= 56px.
 * - HUD: ProgressDots (>= 16px) and Stars counter.
 * - Play Area: flex-1, min-height 0, container-type size, no outer scroll.
 * - In-Frame Result Screen: Fits inside viewport without scrolling.
 */
export const GameStage: React.FC<GameStageProps> = ({
  onBack,
  onHome,
  currentQuestionIndex,
  totalQuestions,
  starsCount = 0,
  children,
  isFinished = false,
  onRetry,
  onReturnToGames,
}) => {
  return (
    <div
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))',
      }}
      className="w-full bg-gradient-to-b from-sky-100 via-amber-50/50 to-orange-50/40 flex flex-col justify-between select-none relative"
    >
      {/* ── 1. Top Bar / HUD with Back & Home Buttons (>= 56px) ── */}
      <header
        style={{
          height: 'clamp(60px, 9dvh, 72px)',
          minHeight: '60px',
          maxHeight: '72px',
        }}
        className="flex-shrink-0 w-full px-3 sm:px-6 flex items-center justify-between z-20 border-b-2 border-amber-200/80 bg-white/90 backdrop-blur-md"
      >
        {/* Navigation: Back (←) & Home (🏠) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onBack}
            type="button"
            aria-label="Quay lại danh sách trò chơi"
            style={{ width: '56px', height: '56px' }}
            className="rounded-2xl bg-white border-2 border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-800 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-7 h-7 stroke-[2.8]" />
          </button>

          <button
            onClick={onHome}
            type="button"
            aria-label="Về trang chủ"
            style={{ width: '56px', height: '56px' }}
            className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 flex items-center justify-center text-emerald-800 cursor-pointer shadow-sm active:scale-95 transition-all"
          >
            <Home className="w-7 h-7 stroke-[2.6]" />
          </button>
        </div>

        {/* HUD Center: ProgressDots */}
        <div className="flex-1 flex justify-center px-2">
          <ProgressDots
            total={totalQuestions}
            current={currentQuestionIndex}
            color="purple"
          />
        </div>

        {/* HUD Right: Stars Count */}
        <div
          style={{ minHeight: '48px', minWidth: '48px' }}
          className="px-3 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center gap-2 font-black text-amber-900 text-base shadow-xs"
        >
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <span>{starsCount}</span>
        </div>
      </header>

      {/* ── 2. Play Area (flex-1, min-height: 0, container-type: size) ── */}
      <main className="flex-1 w-full max-w-5xl mx-auto min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden relative">
        {isFinished ? (
          /* In-frame result screen */
          <div className="w-full h-full max-h-[440px] bg-white rounded-4xl border-4 border-amber-300 shadow-2xl flex flex-col items-center justify-center p-6 text-center animate-fade-in my-auto">
            <span className="text-6xl mb-2 animate-bounce">🏆</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
              Bé chơi giỏi quá!
            </h2>
            <div className="flex items-center gap-2 mb-6">
              {[...Array(3)].map((_, i) => (
                <Star
                  key={i}
                  className="w-9 h-9 text-amber-400 fill-amber-400 animate-spin-slow"
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              {onRetry && (
                <button
                  onClick={onRetry}
                  type="button"
                  style={{ minHeight: '64px', minWidth: '160px' }}
                  className="px-6 rounded-3xl bg-slate-100 hover:bg-slate-200 border-3 border-slate-300 font-black text-slate-800 text-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95 transition-all shadow-md"
                >
                  <RotateCcw className="w-6 h-6" />
                  <span>Chơi lại</span>
                </button>
              )}
              {onReturnToGames && (
                <button
                  onClick={onReturnToGames}
                  type="button"
                  style={{ minHeight: '64px', minWidth: '180px' }}
                  className="px-7 rounded-3xl bg-purple-500 hover:bg-purple-400 border-b-5 border-purple-700 font-black text-white text-lg flex items-center justify-center gap-2.5 shadow-xl cursor-pointer active:translate-y-1 active:border-b-2 transition-all"
                >
                  <span>Về danh sách 🎮</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};
