import React from 'react';
import { Volume2, Check, HelpCircle } from 'lucide-react';
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
  onPlayPrompt,
}) => {
  return (
    <div className="w-full h-full flex flex-col justify-around items-center select-none py-1">
      {/* Audio question prompt area */}
      <div className="flex flex-col items-center">
        <button
          onClick={onPlayPrompt}
          type="button"
          aria-label="Nghe câu hỏi"
          style={{ width: 'clamp(64px, 15vh, 96px)', height: 'clamp(64px, 15vh, 96px)' }}
          className="rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer ring-6 ring-sky-200/60"
        >
          <Volume2 className="w-8 h-8 sm:w-12 sm:h-12" />
        </button>

        <span className="mt-2 text-xl sm:text-2xl font-black text-slate-800 bg-white/90 px-4 py-1 rounded-2xl border-2 border-slate-200 shadow-xs tracking-wide">
          "{question.promptText}"
        </span>
      </div>

      {/* Answer options cards: Responsive flex/grid fitted to container */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 w-full max-w-4xl px-2">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let cardStyle = 'border-amber-200 hover:border-amber-400 bg-white';

          if (isSelected) {
            if (feedbackState === 'correct') {
              cardStyle = 'border-emerald-500 bg-emerald-50 ring-6 ring-emerald-300 animate-soft-bounce';
            } else if (feedbackState === 'wrong') {
              cardStyle = 'border-rose-500 bg-rose-50 ring-6 ring-rose-300 animate-gentle-wobble';
            }
          }

          return (
            <button
              key={opt.id}
              onClick={() => onSelectOption(opt)}
              disabled={feedbackState !== 'idle'}
              type="button"
              style={{
                width: 'clamp(110px, 24vw, 180px)',
                height: 'clamp(110px, 24vh, 180px)',
              }}
              className={`rounded-3xl border-4 p-2 sm:p-3 flex flex-col items-center justify-between text-center cursor-pointer shadow-lg transition-all relative overflow-hidden group active:scale-95 ${cardStyle}`}
            >
              <div className="w-full flex-1 flex items-center justify-center p-1 overflow-hidden">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-105 transition-transform pointer-events-none"
                  />
                ) : (
                  <HelpCircle className="w-12 h-12 text-slate-300" />
                )}
              </div>

              <span className="font-black text-xs sm:text-sm text-slate-800 capitalize leading-tight">
                {opt.text}
              </span>

              {isSelected && feedbackState === 'correct' && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
