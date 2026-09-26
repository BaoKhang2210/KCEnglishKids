import React, { useState } from 'react';
import { Volume2, Sparkles, Check } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface BubblePopEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

export const BubblePopEngine: React.FC<BubblePopEngineProps> = ({
  question,
  onAnswer,
  disabled = false
}) => {
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const bubbleColors = [
    'from-pink-300/90 via-rose-300/80 to-purple-400/90 border-pink-300 shadow-pink-200',
    'from-sky-300/90 via-cyan-300/80 to-blue-400/90 border-sky-300 shadow-sky-200',
    'from-emerald-300/90 via-teal-300/80 to-green-400/90 border-emerald-300 shadow-emerald-200',
    'from-amber-300/90 via-yellow-300/80 to-orange-400/90 border-amber-300 shadow-amber-200'
  ];

  const handlePlayAudio = () => {
    playWordAudio(question.promptText, question.promptAudioUrl);
  };

  const handlePop = (opt: ActivityOption) => {
    if (disabled || poppedId) return;

    sfx.playPop();

    if (opt.isCorrect) {
      setPoppedId(opt.id);
      setTimeout(() => {
        onAnswer(true, opt.id);
      }, 700);
    } else {
      setWrongId(opt.id);
      setTimeout(() => {
        setWrongId(null);
        onAnswer(false, opt.id);
      }, 600);
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-5xl mx-auto px-4">
      {/* Title & Instructions Banner */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-sky-100 via-teal-100 to-emerald-100 text-teal-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-teal-300 shadow-md animate-pulse-glow">
        <Sparkles className="w-6 h-6 text-teal-600 fill-teal-400" />
        <span>Bong bóng bay! Chạm vỡ bong bóng đúng từ nhé! 🫧</span>
      </div>

      {/* Target Word & Audio Prompt Card */}
      <div className="mb-8 flex items-center gap-4 bg-white px-8 py-4 rounded-3xl border-4 border-teal-200 shadow-xl">
        <button
          onClick={handlePlayAudio}
          type="button"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-sky-400 to-teal-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
          title="Bấm nghe phát âm"
        >
          <Volume2 className="w-8 h-8" />
        </button>
        <div>
          <span className="text-xs sm:text-sm font-bold text-slate-400 block uppercase">Tìm bong bóng:</span>
          <span className="text-4xl sm:text-5xl font-black text-teal-900 uppercase tracking-wide">
            {question.promptText}
          </span>
        </div>
      </div>

      {/* Floating Bubbles Stage */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 w-full justify-items-center py-4">
        {question.options.map((opt, i) => {
          const isPopped = poppedId === opt.id;
          const isWrong = wrongId === opt.id;
          const colorClass = bubbleColors[i % bubbleColors.length];

          if (isPopped) {
            return (
              <div
                key={opt.id}
                className="w-38 h-38 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full flex flex-col items-center justify-center animate-ping opacity-75 bg-emerald-300"
              >
                <Check className="w-16 h-16 text-white" />
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              onClick={() => handlePop(opt)}
              disabled={disabled || !!poppedId}
              className={`w-38 h-38 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-full bg-gradient-to-br ${colorClass} border-4 shadow-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xs group active:scale-90 hover:scale-108 animate-float ${
                isWrong ? 'animate-gentle-wobble ring-4 ring-rose-400' : ''
              }`}
              style={{
                animationDelay: `${i * 0.4}s`
              }}
            >
              {/* Bubble Highlight reflection glare */}
              <div className="absolute top-3 left-4 w-10 h-5 rounded-full bg-white/60 rotate-[-30deg] pointer-events-none" />

              {/* Inside Bubble Image */}
              <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center p-1">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform pointer-events-none"
                  />
                ) : (
                  <span className="text-4xl">🫧</span>
                )}
              </div>

              {/* Word Text */}
              <span className="font-black text-base sm:text-xl text-slate-800 capitalize leading-tight drop-shadow-xs bg-white/80 px-3 py-1 rounded-full mt-1">
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
