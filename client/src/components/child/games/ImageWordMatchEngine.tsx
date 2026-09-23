import React, { useState } from 'react';
import { Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
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

  const targetImage = question.metadata?.image || question.promptImageUrl;
  const targetWord = question.metadata?.word || question.promptText.replace(/^Match the word:\s*/i, '');

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto text-center">
      {/* Banner */}
      <span className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 font-black px-4 py-1.5 rounded-full text-sm mb-4 border border-amber-300 animate-pulse">
        <Sparkles className="w-4 h-4 text-amber-600" />
        Nối hình với từ vựng chính xác nhé bé!
      </span>

      {/* Target Image Card at Top */}
      <div className="bg-white rounded-3xl border-4 border-amber-400 p-5 shadow-xl mb-6 w-full max-w-xs flex flex-col items-center">
        {targetImage && (
          <div className="w-36 h-36 mb-2 flex items-center justify-center">
            <img
              src={targetImage}
              alt={targetWord}
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
        )}

        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-amber-950 font-black px-4 py-2 rounded-xl shadow cursor-pointer transition-all active:scale-95 text-sm"
        >
          <Volume2 className="w-4 h-4" />
          <span>Nghe: "{targetWord}"</span>
        </button>
      </div>

      {/* Choice Cards (2, 3, or 4 options) */}
      <div className={`grid ${question.options.length <= 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-lg' : question.options.length === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl'} gap-4 w-full mx-auto`}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 shadow-md';

          if (isSelected) {
            cardStyle = opt.isCorrect
              ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 shadow-xl'
              : 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid rounded-3xl border-4 p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative group ${cardStyle}`}
            >
              {opt.imageUrl ? (
                <div className="w-24 h-24 mb-2 flex items-center justify-center">
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  />
                </div>
              ) : (
                <HelpCircle className="w-12 h-12 text-slate-300 mb-2" />
              )}

              <span className="font-black text-xl text-slate-800 capitalize">
                {opt.text}
              </span>

              {opt.vietnameseText && (
                <span className="text-xs font-semibold text-slate-400 mt-0.5">
                  ({opt.vietnameseText})
                </span>
              )}

              {isSelected && opt.isCorrect && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-pop-in">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
