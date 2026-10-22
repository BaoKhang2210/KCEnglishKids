import React, { useEffect } from 'react';
import { Star, RotateCcw, Home, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Vocabulary } from '../../types';
import { sfx } from '../../utils/audio';
import { KokoMascot } from '../../components/child/KokoMascot';
import { playPraiseAudio } from '../core/audioPhrases';

interface GameCompleteScreenProps {
  stars: number;
  practicedWords: Vocabulary[];
  onPlayAgain: () => void;
  onHome: () => void;
  onNextGame?: () => void;
}

export const GameCompleteScreen: React.FC<GameCompleteScreenProps> = ({
  stars,
  practicedWords,
  onPlayAgain,
  onHome,
  onNextGame,
}) => {
  useEffect(() => {
    playPraiseAudio();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FBBF24', '#F472B6', '#60A5FA', '#34D399'],
      });
    } catch {}
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 max-w-2xl mx-auto text-center select-none">
      {/* Top: Mascot & Celebration */}
      <div className="flex flex-col items-center gap-2 mt-2">
        <KokoMascot state="celebrating" size="lg" interactive={false} />
        <h2 className="text-2xl sm:text-3xl font-black text-amber-300 drop-shadow-md">
          Great Job! 🎉
        </h2>
        <div className="flex items-center gap-1.5 mt-1">
          {Array.from({ length: Math.min(stars, 6) }).map((_, i) => (
            <Star
              key={i}
              className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400 fill-amber-400 animate-soft-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Middle: Practiced Words Grid */}
      <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-white/20 my-2">
        <p className="text-xs sm:text-sm font-bold text-indigo-200 mb-2">Words you practiced:</p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-h-[30vh] overflow-hidden">
          {practicedWords.map((v) => (
            <div
              key={v._id}
              className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-2xl border border-white/20 shadow-xs"
            >
              {v.imageUrl && (
                <img src={v.imageUrl} alt={v.english} className="w-7 h-7 object-contain rounded-lg" />
              )}
              <span className="text-xs sm:text-sm font-black text-white capitalize">{v.english}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Action Buttons (Touch Target >= 64px) */}
      <div className="w-full flex items-center justify-center gap-3 mb-2 flex-wrap">
        <button
          onClick={() => {
            sfx.playPop();
            onPlayAgain();
          }}
          type="button"
          className="min-h-[52px] sm:min-h-[58px] px-5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black flex items-center gap-2 border border-white/30 cursor-pointer active:scale-95 transition-all text-sm sm:text-base"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Play again 🔁</span>
        </button>

        <button
          onClick={() => {
            sfx.playPop();
            onHome();
          }}
          type="button"
          className="min-h-[52px] sm:min-h-[58px] px-5 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-black flex items-center gap-2 border border-white/30 cursor-pointer active:scale-95 transition-all text-sm sm:text-base"
        >
          <Home className="w-5 h-5" />
          <span>Games 🏠</span>
        </button>

        {onNextGame && (
          <button
            onClick={() => {
              sfx.playPop();
              onNextGame();
            }}
            type="button"
            className="min-h-[52px] sm:min-h-[58px] px-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-black flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all text-sm sm:text-base border-2 border-amber-200"
          >
            <span>Next game</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
