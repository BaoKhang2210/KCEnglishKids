import React from 'react';
import { Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';

interface ListenChooseEngineProps {
  question: ActivityQuestion;
  selectedOptionId: string | null;
  feedbackState: 'idle' | 'correct' | 'wrong';
  onSelectOption: (option: ActivityOption) => void;
  onPlayPrompt: () => void;
}

export const ListenChooseEngine: React.FC<ListenChooseEngineProps> = ({
  question,
  selectedOptionId,
  feedbackState,
  onSelectOption,
  onPlayPrompt
}) => {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Big Prompt Audio Button */}
      <div className="flex flex-col items-center mb-8 text-center">
        <span className="inline-flex items-center gap-2 bg-sky-200 text-sky-950 font-black px-6 py-2 rounded-full text-base sm:text-lg mb-5 border-2 border-sky-300 shadow-sm animate-pulse">
          <Sparkles className="w-5 h-5 text-sky-600" />
          Chạm loa để nghe từ và chọn hình đúng nhé!
        </span>

        <button
          onClick={onPlayPrompt}
          className="btn-kid w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer ring-10 ring-sky-200/60"
        >
          <Volume2 className="w-16 h-16 sm:w-22 sm:h-22" />
        </button>

        <span className="mt-4 text-2xl sm:text-4xl font-black text-slate-800 bg-white/90 px-6 py-2 rounded-3xl border-2 border-slate-200 shadow-sm tracking-wide">
          "{question.promptText}"
        </span>
      </div>

      {/* Visual Choice Cards: Progressive Difficulty (2 -> 3 -> 4 choices) */}
      {(() => {
        const count = question.options.length;
        const gridClass = count <= 2
          ? 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
          : count === 3
          ? 'grid-cols-1 sm:grid-cols-3 max-w-5xl'
          : 'grid-cols-2 sm:grid-cols-4 max-w-6xl';

        return (
          <div className={`grid ${gridClass} gap-5 sm:gap-8 w-full mx-auto px-4`}>
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let cardStyle = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-103';

              if (isSelected) {
                if (feedbackState === 'correct') {
                  cardStyle = 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 animate-soft-bounce';
                } else if (feedbackState === 'wrong') {
                  cardStyle = 'border-rose-500 bg-rose-50 ring-8 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt)}
                  disabled={feedbackState !== 'idle'}
                  className={`btn-kid rounded-3xl sm:rounded-4xl border-4 p-5 sm:p-7 flex flex-col items-center text-center cursor-pointer shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group ${cardStyle}`}
                >
                  {/* Visual Card Image */}
                  <div className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-3xl bg-amber-50/70 group-hover:bg-amber-100 flex items-center justify-center p-4 mb-4 transition-colors">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <HelpCircle className="w-20 h-20 text-slate-300" />
                    )}
                  </div>

                  <span className="font-black text-2xl sm:text-3xl lg:text-4xl text-slate-800 capitalize leading-tight">
                    {opt.text}
                  </span>

                  {opt.vietnameseText && (
                    <span className="text-base sm:text-lg font-bold text-slate-400 mt-1">
                      ({opt.vietnameseText})
                    </span>
                  )}

                  {/* Checkmark overlay on correct */}
                  {isSelected && feedbackState === 'correct' && (
                    <div className="absolute top-4 right-4 w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                      <Check className="w-7 h-7 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
};
