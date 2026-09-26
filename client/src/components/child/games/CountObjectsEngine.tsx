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

  const numberWords = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handleTapObject = (index: number) => {
    if (tappedIndices.includes(index)) return;
    sfx.playPop();
    const nextTapped = [...tappedIndices, index];
    setTappedIndices(nextTapped);
    const countNum = nextTapped.length;
    if (countNum <= numberWords.length) {
      playWordAudio(numberWords[countNum - 1]);
    }
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
  const objectEmoji = question.metadata?.objectEmoji || '⭐';

  // Create array of items to count (up to 10 items)
  const items = Array.from({ length: Math.max(1, Math.min(quantity, 10)) });

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto text-center select-none">
      {/* Banner */}
      <span className="inline-flex items-center gap-3 bg-purple-100 text-purple-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-purple-300 shadow-md animate-pulse">
        <Sparkles className="w-6 h-6 text-purple-600" />
        Chạm vào từng hình để đếm, rồi chọn số đúng nhé!
      </span>

      {/* Audio Prompt button */}
      <div className="mb-8">
        <button
          onClick={handlePlayAudio}
          className="btn-kid flex items-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black px-8 py-4 rounded-3xl shadow-xl cursor-pointer transition-all active:scale-95"
        >
          <Volume2 className="w-8 h-8 sm:w-10 sm:h-10" />
          <span className="text-2xl sm:text-3xl">"{question.promptText}"</span>
        </button>
      </div>

      {/* Interactive Counting Area */}
      <div className="bg-white/90 backdrop-blur-md rounded-4xl border-4 border-purple-300 p-8 sm:p-10 shadow-2xl mb-8 w-full flex flex-wrap items-center justify-center gap-6 sm:gap-8 min-h-[220px]">
        {items.map((_, idx) => {
          const isCounted = tappedIndices.includes(idx);
          const countNum = tappedIndices.indexOf(idx) + 1;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleTapObject(idx)}
              className={`relative btn-kid w-32 h-32 sm:w-44 sm:h-44 rounded-3xl sm:rounded-4xl border-4 p-3 flex items-center justify-center cursor-pointer transition-all ${
                isCounted
                  ? 'border-emerald-400 bg-emerald-50 scale-105 shadow-xl ring-6 ring-emerald-200'
                  : 'border-purple-200 bg-purple-50/50 hover:border-purple-400 hover:scale-105 shadow-sm'
              }`}
            >
              {objectImage ? (
                <img
                  src={objectImage}
                  alt=""
                  className="w-full h-full object-contain filter drop-shadow-md"
                />
              ) : (
                <span className="text-6xl sm:text-7xl filter drop-shadow-sm select-none">{objectEmoji}</span>
              )}

              {/* Number Badge when tapped */}
              {isCounted && (
                <div className="absolute -top-4 -right-4 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-emerald-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-xl border-3 border-white animate-pop-in">
                  {countNum}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3 Large Colorful Number Bubbles */}
      <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 w-full">
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let bubbleStyle = 'bg-white border-purple-300 hover:border-purple-500 text-purple-900';

          if (isSelected) {
            bubbleStyle = opt.isCorrect
              ? 'bg-emerald-500 border-emerald-600 text-white ring-8 ring-emerald-300 scale-110'
              : 'bg-rose-500 border-rose-600 text-white ring-8 ring-rose-300';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 font-black text-4xl sm:text-5xl flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer relative ${bubbleStyle}`}
            >
              <span>{opt.text}</span>
              {isSelected && opt.isCorrect && (
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center shadow-lg border-2 border-emerald-300">
                  <Check className="w-7 h-7 stroke-[3.5]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
