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
    <div className="flex flex-col items-center">
      {/* Big Prompt Audio Button */}
      <div className="flex flex-col items-center mb-8 text-center">
        <span className="inline-flex items-center gap-2 bg-sky-200 text-sky-900 font-extrabold px-4 py-1.5 rounded-full text-sm mb-4 border border-sky-300 animate-pulse">
          <Sparkles className="w-4 h-4 text-sky-600" />
          Chạm loa để nghe từ và chọn hình đúng nhé!
        </span>

        <button
          onClick={onPlayPrompt}
          className="btn-kid w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer ring-8 ring-sky-200/60"
        >
          <Volume2 className="w-14 h-14 sm:w-18 sm:h-18" />
        </button>

        <span className="mt-3 text-lg sm:text-xl font-black text-slate-700 bg-white/80 px-4 py-1 rounded-full border border-slate-200 shadow-sm">
          "{question.promptText}"
        </span>
      </div>

      {/* Visual Choice Cards: Progressive Difficulty (2 -> 3 -> 4 choices) */}
      {(() => {
        const count = question.options.length;
        const gridClass = count <= 2
          ? 'grid-cols-1 sm:grid-cols-2 max-w-lg'
          : count === 3
          ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl'
          : 'grid-cols-2 sm:grid-cols-4 max-w-3xl';

        return (
          <div className={`grid ${gridClass} gap-4 sm:gap-5 w-full mx-auto`}>
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let cardStyle = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-103';

              if (isSelected) {
                if (feedbackState === 'correct') {
                  cardStyle = 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 animate-soft-bounce';
                } else if (feedbackState === 'wrong') {
                  cardStyle = 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt)}
                  disabled={feedbackState !== 'idle'}
                  className={`btn-kid rounded-3xl border-4 p-4 flex flex-col items-center text-center cursor-pointer shadow-lg hover:shadow-xl transition-all relative overflow-hidden group ${cardStyle}`}
                >
                  {/* Visual Card Image */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-amber-50/70 group-hover:bg-amber-100 flex items-center justify-center p-3 mb-2 transition-colors">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <HelpCircle className="w-16 h-16 text-slate-300" />
                    )}
                  </div>

                  <span className="font-extrabold text-lg sm:text-xl text-slate-800 capitalize leading-tight">
                    {opt.text}
                  </span>

                  {opt.vietnameseText && (
                    <span className="text-xs font-bold text-slate-400 mt-0.5">
                      ({opt.vietnameseText})
                    </span>
                  )}

                  {/* Checkmark overlay on correct */}
                  {isSelected && feedbackState === 'correct' && (
                    <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
                      <Check className="w-5 h-5" />
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
