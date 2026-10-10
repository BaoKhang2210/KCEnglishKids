import React from 'react';
import { ArrowRight, Home, Star } from 'lucide-react';
import { KokoMascot } from '../KokoMascot';

interface StageCompleteScreenProps {
  stage: 1 | 2 | 3;
  stars?: number;
  onNextStage: () => void;
  onGoHome?: () => void;
}

export const StageCompleteScreen: React.FC<StageCompleteScreenProps> = ({
  stage,
  stars = 3,
  onNextStage,
  onGoHome,
}) => {
  const isFinal = stage === 3;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center animate-fade-in relative z-20">
      {/* Celebration Stars Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <span className="absolute text-5xl animate-bounce" style={{ top: '15%', left: '20%' }}>🌟</span>
        <span className="absolute text-4xl animate-pulse" style={{ top: '25%', right: '25%' }}>🎉</span>
        <span className="absolute text-5xl animate-bounce" style={{ bottom: '20%', left: '25%' }}>✨</span>
        <span className="absolute text-4xl animate-pulse" style={{ bottom: '25%', right: '20%' }}>⭐</span>
      </div>

      {/* Mascot Celebration */}
      <div className="mb-4">
        <KokoMascot state="celebrating" size="lg" interactive={false} />
      </div>

      {/* Title */}
      <h2 className="text-2xl sm:text-3xl font-black text-amber-950 mb-2">
        {isFinal ? 'Bé đã hoàn thành bài học!' : `Hoàn thành Chặng ${stage}!`}
      </h2>

      {/* Stars display */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {Array.from({ length: stars }).map((_, i) => (
          <Star
            key={i}
            className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 fill-amber-400 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      {/* Single Big Action Button (Child-Friendly, >= 72px) */}
      {isFinal ? (
        <button
          onClick={onGoHome || onNextStage}
          type="button"
          aria-label="Về trang chủ"
          style={{ minHeight: '72px', minWidth: '220px' }}
          className="rounded-3xl bg-emerald-500 hover:bg-emerald-400 border-b-6 border-emerald-700 text-white font-black text-xl flex items-center justify-center gap-3 px-8 shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
        >
          <Home className="w-8 h-8" />
          <span>Về trang chủ</span>
        </button>
      ) : (
        <button
          onClick={onNextStage}
          type="button"
          aria-label={`Tiếp tục sang Chặng ${stage + 1}`}
          style={{ minHeight: '72px', minWidth: '220px' }}
          className="rounded-3xl bg-amber-400 hover:bg-amber-300 border-b-6 border-amber-600 text-amber-950 font-black text-xl flex items-center justify-center gap-3 px-8 shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
        >
          <span>Sang Chặng {stage + 1}</span>
          <ArrowRight className="w-8 h-8 stroke-[3]" />
        </button>
      )}
    </div>
  );
};
