import React, { useState } from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio } from '../../../utils/audio';

interface ImageWordMatchEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const ImageWordMatchEngine: React.FC<ImageWordMatchEngineProps> = ({
  question,
  onAnswer,
  disabled
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleSelectOption = (opt: ActivityOption) => {
    if (disabled || selectedOptionId !== null) return;
    setSelectedOptionId(opt.id);
    onAnswer(opt.isCorrect, opt.id);

    setTimeout(() => {
      setSelectedOptionId(null);
    }, 1100);
  };

  const targetImage = question.metadata?.imageUrl || question.metadata?.image || question.promptImageUrl;
  const targetWord = question.metadata?.word || question.promptText.replace(/^Match the word:\s*/i, '');

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto text-center select-none animate-fade-in">
      {/* Banner */}
      <span className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 text-amber-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-amber-300 shadow-md animate-pulse">
        <Sparkles className="w-6 h-6 text-amber-600" />
        Bé nhìn tranh và chọn từ tiếng Anh tương ứng nhé! 🔤
      </span>

      {/* Target Image Card at Top */}
      <div className="bg-white rounded-4xl border-4 border-amber-400 p-6 sm:p-8 shadow-2xl mb-8 w-full max-w-md flex flex-col items-center">
        <div className="w-52 h-52 sm:w-64 sm:h-64 mb-4 flex items-center justify-center p-3 rounded-3xl bg-amber-50/60 border-2 border-amber-200">
          {targetImage ? (
            <img
              src={targetImage}
              alt={targetWord}
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          ) : (
            <span className="text-7xl">🖼️</span>
          )}
        </div>

        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 font-black px-7 py-3 rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 text-lg sm:text-xl"
        >
          <Volume2 className="w-6 h-6" />
          <span>Nghe phát âm: "{targetWord}"</span>
        </button>
      </div>

      {/* Choice Cards (2, 3, or 4 options) - Big Clear Word Blocks for 5-6 yo */}
      <div className={`grid ${question.options.length <= 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl' : question.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-5xl' : 'grid-cols-2 sm:grid-cols-4 max-w-6xl'} gap-5 sm:gap-7 w-full mx-auto px-4`}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 hover:scale-104 shadow-lg';

          if (isSelected) {
            cardStyle = opt.isCorrect
              ? 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 scale-105 shadow-2xl animate-soft-bounce'
              : 'border-rose-500 bg-rose-50 ring-8 ring-rose-300 animate-gentle-wobble';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid rounded-3xl sm:rounded-4xl border-4 p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition-all relative group ${cardStyle}`}
            >
              <span className="font-black text-3xl sm:text-4xl text-slate-800 capitalize font-display tracking-wide mb-1">
                {opt.text}
              </span>

              {opt.vietnameseText && (
                <span className="text-base sm:text-lg font-bold text-slate-400">
                  ({opt.vietnameseText})
                </span>
              )}

              {isSelected && opt.isCorrect && (
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
