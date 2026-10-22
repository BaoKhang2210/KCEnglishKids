import React, { useState } from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio } from '../../../utils/audio';

interface ImageWordMatchEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
  practiceMode?: boolean;
  revealOptionId?: string | null;
  vietnameseGloss?: string;
  disabledOptionIds?: string[];
}

export const ImageWordMatchEngine: React.FC<ImageWordMatchEngineProps> = ({
  question,
  onAnswer,
  disabled,
  practiceMode = false,
  revealOptionId = null,
  vietnameseGloss = '',
  disabledOptionIds = [],
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const targetImage = question.metadata?.imageUrl || question.metadata?.image || question.promptImageUrl;
  const targetWord = question.metadata?.word || question.promptText.replace(/^Match the word:\s*/i, '');

  const handlePlayAudio = () => playWordAudio(targetWord, question.promptAudioUrl);

  const handleSelectOption = (opt: ActivityOption) => {
    if (disabled || selectedOptionId !== null) return;
    setSelectedOptionId(opt.id);
    onAnswer(opt.isCorrect, opt.id);

    setTimeout(() => {
      setSelectedOptionId(null);
    }, 1100);
  };

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-0 w-full max-w-6xl mx-auto text-center select-none animate-fade-in">
      {/* Banner */}
      {!practiceMode && <span className="shrink-0 inline-flex items-center gap-3 bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 text-amber-950 font-black px-6 py-2 rounded-full text-lg sm:text-2xl border-3 border-amber-300 shadow-md">
        <Sparkles className="w-6 h-6 text-amber-600" />
        {practiceMode ? 'Look! Choose the word.' : 'Bé nhìn tranh và chọn từ tiếng Anh tương ứng nhé! 🔤'}
      </span>}

      {/* Target Image Card at Top */}
      <div className={practiceMode
        ? 'relative mb-5 shrink-0 bg-white rounded-4xl border-4 border-amber-400 p-3 sm:p-4 shadow-2xl w-[min(40vh,240px)] aspect-square flex items-center justify-center'
        : 'mb-5 bg-white rounded-4xl border-4 border-amber-400 p-6 sm:p-8 shadow-2xl w-full max-w-md flex flex-col items-center'}>
        <div className={practiceMode
          ? 'w-full h-full flex items-center justify-center p-3 rounded-3xl bg-amber-50/60 border-2 border-amber-200'
          : 'w-52 h-52 sm:w-64 sm:h-64 mb-4 flex items-center justify-center p-3 rounded-3xl bg-amber-50/60 border-2 border-amber-200'}>
          {targetImage ? (
            <img
              src={targetImage}
              alt={practiceMode ? '' : targetWord}
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          ) : (
            <span className="text-7xl">🖼️</span>
          )}
        </div>
        {practiceMode ? <button
          type="button"
          onClick={handlePlayAudio}
          aria-label="Chạm để nghe từ trong hình"
          title="Chạm để nghe từ trong hình"
          className="absolute inset-3 cursor-pointer rounded-4xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-sky-400"
        >
          <span aria-hidden="true" className="absolute bottom-2 right-2 grid h-12 w-12 place-items-center rounded-full border-2 border-white bg-sky-500 text-white shadow-lg">
            <Volume2 className="h-7 w-7" />
          </span>
        </button> : <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 font-black px-7 py-3 rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 text-lg sm:text-xl"
        >
          <Volume2 className="w-6 h-6" />
          <span>Nghe phát âm: "{targetWord}"</span>
        </button>}
      </div>
      {practiceMode && selectedOptionId && question.options.find((option) => option.id === selectedOptionId)?.isCorrect && (
        <div className="mt-3 mb-3 shrink-0 text-2xl font-black text-white capitalize leading-snug" aria-live="polite">
          {targetWord}{vietnameseGloss ? ` · ${vietnameseGloss}` : ''}
        </div>
      )}

      {/* Choice Cards (2, 3, or 4 options) - Big Clear Word Blocks for 5-6 yo */}
      <div className={`mt-5 grid ${question.options.length <= 2 ? 'grid-cols-2 max-w-3xl' : question.options.length === 3 ? 'grid-cols-3 max-w-5xl' : 'grid-cols-4 max-w-6xl'} grid-rows-1 gap-3 sm:gap-5 w-full mx-auto px-2`}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const isRevealed = revealOptionId === opt.id && !isSelected;
          let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 hover:scale-104 shadow-lg';

          if (isRevealed) {
            cardStyle = 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 animate-pulse shadow-2xl';
          } else if (isSelected) {
            cardStyle = opt.isCorrect
              ? 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 scale-105 shadow-2xl animate-soft-bounce'
              : practiceMode ? 'border-amber-500 bg-amber-50 ring-8 ring-amber-300 animate-gentle-wobble' : 'border-rose-500 bg-rose-50 ring-8 ring-rose-300 animate-gentle-wobble';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null || disabledOptionIds.includes(opt.id)}
              aria-label={opt.text || 'Chọn từ'}
              className={`btn-kid min-w-0 min-h-[clamp(96px,14vh,150px)] rounded-3xl border-4 p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all relative group ${cardStyle}`}
            >
              <span className="font-black text-3xl sm:text-4xl text-slate-800 capitalize font-display tracking-wide mb-1">
                {opt.text}
              </span>

              {opt.vietnameseText && (!practiceMode || (isSelected && opt.isCorrect)) && (
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
