import React from 'react';
import { Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';

interface ListenChooseEngineProps {
  question: ActivityQuestion;
  selectedOptionId: string | null;
  feedbackState: 'idle' | 'correct' | 'wrong';
  onSelectOption: (option: ActivityOption) => void;
  onPlayPrompt: () => void;
  practiceMode?: boolean;
  revealOptionId?: string | null;
  disabledOptionIds?: string[];
  textChoiceMode?: boolean;
}

export const ListenChooseEngine: React.FC<ListenChooseEngineProps> = ({
  question,
  selectedOptionId,
  feedbackState,
  onSelectOption,
  onPlayPrompt,
  practiceMode = false,
  revealOptionId = null,
  disabledOptionIds = [],
  textChoiceMode = false,
}) => {
  return (
    <div className="practice-a-layout flex h-full min-h-0 flex-col items-center justify-center gap-0 w-full max-w-[1320px] mx-auto">
      {/* Big Prompt Audio Button */}
      <div className="practice-a-speaker mb-7 flex shrink-0 flex-col items-center text-center">
        {!practiceMode && <span className="inline-flex items-center gap-2 bg-sky-200 text-sky-950 font-black px-5 py-2 rounded-full text-lg sm:text-2xl mb-3 border-2 border-sky-300 shadow-sm">
          <Sparkles className="w-5 h-5 text-sky-600" />
          {practiceMode ? 'Listen and choose!' : 'Chạm loa để nghe từ và chọn hình đúng nhé!'}
        </span>}

        <button
          onClick={onPlayPrompt}
          aria-label="Nghe lại từ"
          className="btn-kid w-[clamp(88px,22vh,120px)] h-[clamp(88px,22vh,120px)] rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 hover:from-sky-300 hover:to-indigo-500 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-sky-200/60"
        >
          <Volume2 className="w-12 h-12 sm:w-14 sm:h-14" />
        </button>

        {!practiceMode && <span className="mt-4 text-2xl sm:text-4xl font-black text-slate-800 bg-white/90 px-6 py-2 rounded-3xl border-2 border-slate-200 shadow-sm tracking-wide">"{question.promptText}"</span>}
      </div>

      {/* Visual Choice Cards: Progressive Difficulty (2 -> 3 -> 4 choices) */}
      {(() => {
        const count = question.options.length;
        const gridClass = count <= 2
          ? 'grid-cols-2 max-w-3xl'
          : count === 3
          ? 'grid-cols-3 max-w-5xl'
          : 'grid-cols-4 max-w-6xl';

        return (
          <div className={`practice-a-choices mt-7 grid ${gridClass} grid-rows-1 gap-3 sm:gap-5 w-full mx-auto px-2 max-h-[min(42vh,280px)]`}>
            {question.options.map((opt, optionIndex) => {
              const isSelected = selectedOptionId === opt.id;
              const isRevealed = revealOptionId === opt.id && feedbackState === 'idle';
              let cardStyle = 'border-amber-200 hover:border-amber-400 bg-white hover:scale-103';

              if (isRevealed) {
                cardStyle = 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 animate-pulse';
              } else if (isSelected) {
                if (feedbackState === 'correct') {
                  cardStyle = 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 animate-soft-bounce';
                } else if (feedbackState === 'wrong') {
                  cardStyle = practiceMode
                    ? 'border-amber-500 bg-amber-50 ring-8 ring-amber-300 animate-gentle-wobble'
                    : 'border-rose-500 bg-rose-50 ring-8 ring-rose-300 animate-gentle-wobble';
                }
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => onSelectOption(opt)}
                  disabled={feedbackState !== 'idle' || disabledOptionIds.includes(opt.id)}
                  aria-label={practiceMode && feedbackState === 'idle' && !isRevealed ? `Lựa chọn hình ${optionIndex + 1}` : opt.text || 'Chọn hình'}
                  className={`btn-kid min-w-0 min-h-[96px] h-full rounded-3xl border-4 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group ${cardStyle}`}
                >
                  {/* Visual Card Image */}
                  {!textChoiceMode && <div className="flex-1 min-h-0 w-full max-h-[min(28vh,210px)] aspect-square rounded-3xl bg-amber-50/70 group-hover:bg-amber-100 flex items-center justify-center p-3 transition-colors">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={practiceMode ? '' : opt.text}
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <HelpCircle className="w-20 h-20 text-slate-300" />
                    )}
                  </div>}
                  {textChoiceMode && <span className="flex-1 flex items-center justify-center text-3xl font-black text-slate-800 capitalize">{opt.text}</span>}

                  {(!practiceMode || (feedbackState === 'correct' && opt.isCorrect)) && <span className="font-black text-2xl sm:text-3xl lg:text-4xl text-slate-800 capitalize leading-tight">{opt.text}</span>}

                  {opt.vietnameseText && (!practiceMode || (feedbackState === 'correct' && opt.isCorrect)) && (
                    <span className="text-base sm:text-lg font-bold text-slate-500 leading-snug">
                      ({opt.vietnameseText})
                    </span>
                  )}

                  {/* Checkmark overlay on correct */}
                  {(isSelected && feedbackState === 'correct' || isRevealed) && (
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
