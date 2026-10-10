import React, { useState } from 'react';
import { Volume2, Check } from 'lucide-react';
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
  disabled = false,
}) => {
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const bubbleColors = [
    'from-pink-300/90 to-purple-400/90 border-pink-300',
    'from-sky-300/90 to-blue-400/90 border-sky-300',
    'from-emerald-300/90 to-green-400/90 border-emerald-300',
    'from-amber-300/90 to-orange-400/90 border-amber-300',
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
    <div className="w-full h-full flex flex-col justify-around items-center select-none py-1">
      {/* Target prompt & Audio */}
      <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border-2 border-teal-200 shadow-sm">
        <button
          onClick={handlePlayAudio}
          type="button"
          aria-label="Nghe từ"
          className="w-10 h-10 rounded-full bg-teal-400 hover:bg-teal-300 text-teal-950 flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
        >
          <Volume2 className="w-5 h-5" />
        </button>
        <span className="text-xl sm:text-2xl font-black text-teal-900 uppercase">
          {question.promptText}
        </span>
      </div>

      {/* Floating Bubbles Stage */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 w-full max-w-2xl px-2">
        {question.options.map((opt, i) => {
          const isPopped = poppedId === opt.id;
          const isWrong = wrongId === opt.id;
          const colorClass = bubbleColors[i % bubbleColors.length];

          if (isPopped) {
            return (
              <div
                key={opt.id}
                style={{
                  width: 'clamp(84px, 20vw, 130px)',
                  height: 'clamp(84px, 20vw, 130px)',
                }}
                className="rounded-full flex items-center justify-center animate-ping opacity-75 bg-emerald-300"
              >
                <Check className="w-10 h-10 text-white" />
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              onClick={() => handlePop(opt)}
              disabled={disabled || !!poppedId}
              type="button"
              style={{
                width: 'clamp(84px, 20vw, 130px)',
                height: 'clamp(84px, 20vw, 130px)',
              }}
              className={`rounded-full bg-gradient-to-br ${colorClass} border-4 shadow-lg flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-xs group active:scale-90 hover:scale-105 animate-float ${
                isWrong ? 'animate-gentle-wobble ring-4 ring-rose-400' : ''
              }`}
            >
              {/* Highlight reflection */}
              <div className="absolute top-2 left-3 w-6 h-3 rounded-full bg-white/60 rotate-[-30deg] pointer-events-none" />

              {/* Inside bubble image */}
              <div className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center pointer-events-none">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="max-h-full max-w-full object-contain filter drop-shadow pointer-events-none"
                  />
                ) : (
                  <span className="text-2xl">🫧</span>
                )}
              </div>

              {/* Word text */}
              <span className="font-black text-xs sm:text-sm text-slate-800 capitalize bg-white/80 px-2 py-0.5 rounded-full mt-1 pointer-events-none">
                {opt.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
