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

  const displayImage = question.metadata?.image || question.promptImageUrl;

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto text-center">
      {/* Prompt Banner */}
      <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-900 font-black px-4 py-1.5 rounded-full text-sm mb-4 border border-emerald-300 animate-pulse">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        Đúng hay Sai? Chạm vào nút xanh hoặc đỏ nhé!
      </span>

      {/* Main Image Card with Audio button */}
      <div className="relative bg-white rounded-3xl border-4 border-amber-300 p-6 shadow-xl mb-6 w-full max-w-md flex flex-col items-center">
        {displayImage && (
          <div className="w-48 h-48 sm:w-56 sm:h-56 mb-4 flex items-center justify-center">
            <img
              src={displayImage}
              alt=""
              className="w-full h-full object-contain filter drop-shadow-md"
            />
          </div>
        )}

        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black px-5 py-2.5 rounded-2xl shadow-md cursor-pointer transition-all active:scale-95"
        >
          <Volume2 className="w-6 h-6" />
          <span className="text-lg">"{question.promptText}"</span>
        </button>
      </div>

      {/* Two Huge Tactile Kid-Friendly Buttons */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-md">
        {/* YES / TRUE Button */}
        <button
          onClick={() => handleChoose(true)}
          disabled={disabled || selectedVal !== null}
          className={`btn-kid py-6 px-4 rounded-3xl border-4 border-emerald-500 bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-white font-black text-2xl flex flex-col items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-emerald-200 ${
            selectedVal === 'true' ? 'scale-95 ring-8 ring-emerald-400' : ''
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <span>ĐÚNG (YES)</span>
        </button>

        {/* NO / FALSE Button */}
        <button
          onClick={() => handleChoose(false)}
          disabled={disabled || selectedVal !== null}
          className={`btn-kid py-6 px-4 rounded-3xl border-4 border-rose-500 bg-gradient-to-b from-rose-400 to-rose-500 hover:from-rose-300 hover:to-rose-400 text-white font-black text-2xl flex flex-col items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-95 transition-all cursor-pointer ring-4 ring-rose-200 ${
            selectedVal === 'false' ? 'scale-95 ring-8 ring-rose-400' : ''
          }`}
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <X className="w-10 h-10 stroke-[3]" />
          </div>
          <span>SAI (NO)</span>
        </button>
      </div>
    </div>
  );
};
