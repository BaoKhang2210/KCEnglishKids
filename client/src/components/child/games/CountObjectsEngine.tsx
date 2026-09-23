import React, { useState } from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';

interface CountObjectsEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const CountObjectsEngine: React.FC<CountObjectsEngineProps> = ({
  question,
  onAnswer,
  disabled
}) => {
  const quantity = question.metadata?.quantity || 1;
  const [tappedIndices, setTappedIndices] = useState<number[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleTapObject = (index: number) => {
    if (tappedIndices.includes(index)) return;
    sfx.playPop();
    setTappedIndices(prev => [...prev, index]);
  };

  const handleSelectOption = (opt: ActivityOption) => {
    if (disabled || selectedOptionId !== null) return;
    setSelectedOptionId(opt.id);
    onAnswer(opt.isCorrect, opt.id);

    setTimeout(() => {
      setSelectedOptionId(null);
      setTappedIndices([]);
    }, 1000);
  };

  const objectImage = question.metadata?.image || question.promptImageUrl;

  // Create array of items to count (up to 10 items)
  const items = Array.from({ length: Math.max(1, Math.min(quantity, 10)) });

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto text-center">
      {/* Banner */}
      <span className="inline-flex items-center gap-2 bg-purple-100 text-purple-900 font-black px-4 py-1.5 rounded-full text-sm mb-4 border border-purple-300 animate-pulse">
        <Sparkles className="w-4 h-4 text-purple-600" />
        Chạm vào từng hình để đếm, rồi chọn số đúng nhé!
      </span>

      {/* Audio Prompt button */}
      <div className="mb-6">
        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black px-6 py-3 rounded-full shadow-lg cursor-pointer transition-all active:scale-95"
        >
          <Volume2 className="w-6 h-6" />
          <span className="text-xl">"{question.promptText}"</span>
        </button>
      </div>

      {/* Interactive Counting Area */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl border-4 border-purple-200 p-6 shadow-xl mb-6 w-full flex flex-wrap items-center justify-center gap-5 min-h-[180px]">
        {items.map((_, idx) => {
          const isCounted = tappedIndices.includes(idx);
          const countNum = tappedIndices.indexOf(idx) + 1;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTapObject(idx)}
              className={`relative btn-kid w-28 h-28 sm:w-32 sm:h-32 rounded-3xl border-4 p-2 flex items-center justify-center cursor-pointer transition-all ${
                isCounted
                  ? 'border-emerald-400 bg-emerald-50 scale-105 shadow-md'
                  : 'border-purple-200 bg-purple-50/50 hover:border-purple-400 hover:scale-105 shadow-xs'
              }`}
            >
              {objectImage ? (
                <img
                  src={objectImage}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow"
                />
              ) : (
                <span className="text-4xl">⭐</span>
              )}

              {/* Number Badge when tapped */}
              {isCounted && (
                <div className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-emerald-500 text-white font-black text-lg flex items-center justify-center shadow-lg border-2 border-white animate-pop-in">
                  {countNum}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3 Large Colorful Number Bubbles */}
      <div className="flex flex-wrap items-center justify-center gap-5 w-full">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let bubbleStyle = 'bg-white border-purple-300 hover:border-purple-500 text-purple-900';

          if (isSelected) {
            bubbleStyle = opt.isCorrect
              ? 'bg-emerald-500 border-emerald-600 text-white ring-4 ring-emerald-300 scale-110'
              : 'bg-rose-500 border-rose-600 text-white ring-4 ring-rose-300';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 font-black text-3xl sm:text-4xl flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer relative ${bubbleStyle}`}
            >
              <span>{opt.text}</span>
              {isSelected && opt.isCorrect && (
                <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow">
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
