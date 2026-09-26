import React, { useState } from 'react';
import { Volume2, Check, X, Sparkles } from 'lucide-react';
import type { ActivityQuestion } from '../../../types';
import { playWordAudio } from '../../../utils/audio';

interface TrueFalseEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const TrueFalseEngine: React.FC<TrueFalseEngineProps> = ({
  question,
  onAnswer,
  disabled
}) => {
  const [selectedVal, setSelectedVal] = useState<'true' | 'false' | null>(null);

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleChoose = (isYes: boolean) => {
    if (disabled || selectedVal !== null) return;
    setSelectedVal(isYes ? 'true' : 'false');

    // Find corresponding option
    const opt = question.options?.find(o =>
      isYes
        ? (o.text?.toLowerCase().includes('true') || o.text?.toLowerCase().includes('đúng'))
        : (o.text?.toLowerCase().includes('false') || o.text?.toLowerCase().includes('sai'))
    ) || question.options?.[isYes ? 0 : 1];

    const isCorrect = opt ? opt.isCorrect : (isYes ? question.correctAnswer?.toLowerCase() === 'true' : question.correctAnswer?.toLowerCase() === 'false');
    onAnswer(!!isCorrect, opt?.id || (isYes ? 'opt_true' : 'opt_false'));

    setTimeout(() => {
      setSelectedVal(null);
    }, 1000);
  };

  const displayImage = question.metadata?.imageUrl || question.metadata?.image || question.promptImageUrl;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto text-center select-none">
      {/* Prompt Banner */}
      <span className="inline-flex items-center gap-3 bg-emerald-100 text-emerald-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-emerald-300 shadow-md animate-pulse">
        <Sparkles className="w-6 h-6 text-emerald-600" />
        Đúng hay Sai? Chạm vào nút xanh hoặc đỏ nhé!
      </span>

      {/* Main Image Card with Audio button */}
      <div className="relative bg-white rounded-4xl border-4 border-amber-300 p-8 shadow-2xl mb-8 w-full max-w-2xl flex flex-col items-center">
        {displayImage && (
          <div className="w-64 h-64 sm:w-80 sm:h-80 mb-6 flex items-center justify-center">
            <img
              src={displayImage}
              alt=""
              className="w-full h-full object-contain filter drop-shadow-lg"
            />
          </div>
        )}

        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-8 py-4 rounded-3xl shadow-lg cursor-pointer transition-all active:scale-95 text-2xl sm:text-3xl"
        >
          <Volume2 className="w-8 h-8 sm:w-10 sm:h-10" />
          <span>"{question.promptText}"</span>
        </button>
      </div>

      {/* Two Huge Tactile Kid-Friendly Buttons */}
      <div className="grid grid-cols-2 gap-6 sm:gap-8 w-full max-w-2xl">
        {/* YES / TRUE Button */}
        <button
          onClick={() => handleChoose(true)}
          disabled={disabled || selectedVal !== null}
          className={`btn-kid py-8 sm:py-10 px-6 rounded-4xl border-4 border-emerald-500 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-white font-black text-2xl sm:text-4xl flex flex-col items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer ring-6 ring-emerald-200 ${
            selectedVal === 'true' ? 'scale-95 ring-10 ring-emerald-400' : ''
          }`}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
            <Check className="w-12 h-12 sm:w-14 sm:h-14 stroke-[3.5]" />
          </div>
          <span>ĐÚNG (YES)</span>
        </button>

        {/* NO / FALSE Button */}
        <button
          onClick={() => handleChoose(false)}
          disabled={disabled || selectedVal !== null}
          className={`btn-kid py-8 sm:py-10 px-6 rounded-4xl border-4 border-rose-500 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-300 hover:to-rose-400 text-white font-black text-2xl sm:text-4xl flex flex-col items-center justify-center gap-3 shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer ring-6 ring-rose-200 ${
            selectedVal === 'false' ? 'scale-95 ring-10 ring-rose-400' : ''
          }`}
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/25 flex items-center justify-center shadow-inner">
            <X className="w-12 h-12 sm:w-14 sm:h-14 stroke-[3.5]" />
          </div>
          <span>SAI (NO)</span>
        </button>
      </div>
    </div>
  );
};
