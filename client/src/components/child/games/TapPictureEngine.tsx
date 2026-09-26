import React, { useEffect, useState } from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface TapPictureEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const TapPictureEngine: React.FC<TapPictureEngineProps> = ({
  question,
  onAnswer,
  disabled = false
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-play audio on question mount for 3-4 year olds
  useEffect(() => {
    setSelectedId(null);
    const timer = setTimeout(() => {
      playWordAudio(question.promptText, question.promptAudioUrl);
    }, 300);
    return () => clearTimeout(timer);
  }, [question.promptText]);

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleTap = (opt: ActivityOption) => {
    if (disabled || selectedId) return;

    setSelectedId(opt.id);
    sfx.playPop();

    if (opt.isCorrect) {
      setTimeout(() => {
        onAnswer(true, opt.id);
      }, 700);
    } else {
      setTimeout(() => {
        setSelectedId(null);
        onAnswer(false, opt.id);
      }, 600);
    }
  };

  // Limit to 2 or 3 choices max for toddlers 3-4 years old
  const displayOptions = question.options.slice(0, 3);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-5xl mx-auto px-4">
      {/* Friendly Toddler Instruction */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-950 font-black px-8 py-3 rounded-full text-lg sm:text-xl mb-6 border-3 border-amber-300 shadow-md animate-pulse-glow">
        <Sparkles className="w-7 h-7 text-amber-500 fill-amber-400" />
        <span>Bé chạm vào bức tranh đúng nhé! 👆</span>
      </div>

      {/* Massive Toddler Word Display & Big Speaker */}
      <div className="mb-8 flex items-center justify-center gap-6 bg-white px-10 py-5 rounded-4xl border-4 border-amber-300 shadow-2xl">
        <button
          onClick={handlePlayAudio}
          type="button"
          className="w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center shadow-xl active:scale-90 transition-transform cursor-pointer ring-8 ring-amber-200/60"
          title="Bấm loa nghe từ"
        >
          <Volume2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </button>
        <span className="text-5xl sm:text-7xl font-black text-amber-950 uppercase tracking-wider">
          {question.promptText}
        </span>
      </div>

      {/* Giant Picture Cards (2 or 3 columns) */}
      <div
        className={`grid ${
          displayOptions.length === 2 ? 'grid-cols-2 max-w-3xl' : 'grid-cols-2 sm:grid-cols-3 max-w-5xl'
        } gap-6 sm:gap-8 w-full`}
      >
        {displayOptions.map((opt) => {
          const isSelected = selectedId === opt.id;
          let cardStyle = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-104 shadow-xl';

          if (isSelected) {
            if (opt.isCorrect) {
              cardStyle = 'border-emerald-500 bg-emerald-50 ring-10 ring-emerald-300 scale-106 animate-soft-bounce';
            } else {
              cardStyle = 'border-rose-400 bg-rose-50 ring-10 ring-rose-200 animate-gentle-wobble';
            }
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleTap(opt)}
              disabled={disabled || (!!selectedId && opt.id !== selectedId)}
              className={`rounded-4xl border-4 p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 relative overflow-hidden active:scale-95 ${cardStyle}`}
            >
              {/* Huge Image Area */}
              <div className="w-44 h-44 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-3xl bg-amber-50/70 flex items-center justify-center p-4 mb-4">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow-md pointer-events-none"
                  />
                ) : (
                  <span className="text-7xl select-none">🖼️</span>
                )}
              </div>

              {/* Big Word Label */}
              <span className="font-black text-2xl sm:text-4xl text-slate-800 capitalize tracking-tight">
                {opt.text}
              </span>

              {/* Correct checkmark overlay */}
              {isSelected && opt.isCorrect && (
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
