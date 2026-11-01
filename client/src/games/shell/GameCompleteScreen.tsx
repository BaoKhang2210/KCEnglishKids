import React, { useEffect } from 'react';
import { Star, RotateCcw, Home, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Vocabulary } from '../../types';
import { sfx } from '../../utils/audio';
import { StoryBackdrop } from '../../components/StoryScene';
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
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
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
    <div className="story-surface story-game-complete w-full h-full flex flex-col items-center justify-between p-4 text-center select-none">
      <StoryBackdrop scene="celebration"/>
      {/* Top: Mascot & Celebration */}
      <div className="story-completion-heading flex flex-col items-center gap-2 mt-2">
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
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
      <div className="story-completion-words w-full backdrop-blur-md my-2">
        <p className="text-xs sm:text-sm font-bold text-white mb-2">Words you practiced:</p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 max-h-[30vh] overflow-hidden">
          {practicedWords.map((v) => (
            <div
              key={v._id}
              className="story-practiced-word flex items-center gap-2 px-3 py-1.5 rounded-2xl shadow-xs"
            >
              {v.imageUrl && (
                <img src={v.imageUrl} alt={v.english} className="w-7 h-7 object-contain rounded-lg" />
              )}
              <span className="text-xs sm:text-sm font-black capitalize">{v.english}</span>
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
          className="story-action min-h-[52px] sm:min-h-[58px] px-5 rounded-2xl font-black flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-sm sm:text-base"
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
          className="story-action min-h-[52px] sm:min-h-[58px] px-5 rounded-2xl font-black flex items-center gap-2 cursor-pointer active:scale-95 transition-all text-sm sm:text-base"
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
            className="story-action is-primary min-h-[52px] sm:min-h-[58px] px-6 rounded-2xl font-black flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-all text-sm sm:text-base"
          >
            <span>Next game</span>
            <ArrowRight className="w-5 h-5 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
