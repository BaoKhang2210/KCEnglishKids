import React, { useState, useEffect } from 'react';
import { Eye, HelpCircle, Check, Timer } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';

interface MissingObjectEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

type Stage = 'MEMORIZING' | 'GUESSING';

export const MissingObjectEngine: React.FC<MissingObjectEngineProps> = ({
  question,
  onAnswer,
  disabled
}) => {
  const [stage, setStage] = useState<Stage>('MEMORIZING');
  const [timeLeft, setTimeLeft] = useState(4); // 4 seconds observation window
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const missingName = question.correctAnswer || question.metadata?.missingObject || '';
  const visibleObjects: string[] = question.metadata?.visibleObjects || [];

  // Full item list including the missing one for initial memorization
  const initialItems: string[] = (question.metadata?.initialObjects && question.metadata.initialObjects.length > 0)
    ? question.metadata.initialObjects
    : [...visibleObjects, missingName].filter(Boolean);

  // Countdown timer for memorization phase
  useEffect(() => {
    setStage('MEMORIZING');
    setTimeLeft(4);
    setSelectedOptionId(null);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          sfx.playPop();
          setStage('GUESSING');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question.correctAnswer]);

  const handleSkipTimer = () => {
    sfx.playPop();
    setTimeLeft(0);
    setStage('GUESSING');
  };

  const handleSelectOption = (opt: ActivityOption) => {
    if (disabled || selectedOptionId !== null || stage !== 'GUESSING') return;
    setSelectedOptionId(opt.id);
    onAnswer(opt.isCorrect, opt.id);

    if (!opt.isCorrect) {
      setTimeout(() => {
        setSelectedOptionId(null);
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto text-center select-none animate-pop-in">
      {/* Banner / Header */}
      {stage === 'MEMORIZING' ? (
        <div className="inline-flex items-center gap-3 bg-purple-100 text-purple-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-purple-300 shadow-md animate-pulse">
          <Eye className="w-6 h-6 text-purple-600" />
          <span>Bé quan sát thật kỹ và ghi nhớ các món đồ này nhé!</span>
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-black ml-2 shadow-sm">
            {timeLeft}s
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-3 bg-amber-100 text-amber-950 font-black px-8 py-3 rounded-full text-base sm:text-xl mb-6 border-3 border-amber-300 shadow-md animate-bounce-short">
          <span>🎩✨ Úm ba la! Món đồ nào vừa biến mất rồi?</span>
        </div>
      )}

      {/* Observation Table / Scene Tray */}
      <div className="w-full bg-gradient-to-b from-amber-50 to-orange-50/60 rounded-4xl border-4 border-amber-300 p-8 sm:p-10 shadow-2xl mb-8 relative overflow-hidden">
        {/* Timer Bar during memorization */}
        {stage === 'MEMORIZING' && (
          <div className="absolute top-0 left-0 right-0 h-3 bg-amber-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 4) * 100}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 min-h-[200px] py-4">
          {stage === 'MEMORIZING' ? (
            // Phase 1: Show all initial items
            initialItems.map((item, idx) => {
              const matchedOpt = question.options.find(o => (o.text || '').toLowerCase() === item.toLowerCase());
              const imgUrl = matchedOpt?.imageUrl;

              return (
                <div
                  key={idx}
                  className="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-white border-4 border-purple-300 p-3 flex flex-col items-center justify-center shadow-lg animate-pop-in"
                >
                  <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item} className="w-full h-full object-contain filter drop-shadow" />
                    ) : (
                      <span className="text-5xl">🎁</span>
                    )}
                  </div>
                  <span className="text-base sm:text-lg font-black text-slate-700 capitalize mt-2 truncate max-w-[130px]">
                    {item}
                  </span>
                </div>
              );
            })
          ) : (
            // Phase 2: Show visible items and 1 Mystery Hidden Box
            <>
              {visibleObjects.map((item, idx) => {
                const matchedOpt = question.options.find(o => (o.text || '').toLowerCase() === item.toLowerCase());
                const imgUrl = matchedOpt?.imageUrl;

                return (
                  <div
                    key={idx}
                    className="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-white border-4 border-amber-200 p-3 flex flex-col items-center justify-center shadow-md opacity-90"
                  >
                    <div className="w-20 h-20 sm:w-28 sm:h-28 flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item} className="w-full h-full object-contain filter drop-shadow" />
                      ) : (
                        <span className="text-5xl">🎁</span>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-black text-slate-600 capitalize mt-2 truncate max-w-[130px]">
                      {item}
                    </span>
                  </div>
                );
              })}

              {/* Sparkling Missing Placeholder */}
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-tr from-amber-400 via-rose-400 to-purple-500 text-white border-4 border-dashed border-white flex flex-col items-center justify-center shadow-2xl animate-soft-bounce ring-8 ring-amber-300">
                <span className="text-4xl sm:text-6xl animate-pulse">❓</span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider mt-1">Biến mất</span>
              </div>
            </>
          )}
        </div>

        {/* Quick skip button if child is ready */}
        {stage === 'MEMORIZING' && (
          <button
            type="button"
            onClick={handleSkipTimer}
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base font-black cursor-pointer shadow-md transition-all active:scale-95"
          >
            <Timer className="w-5 h-5" />
            <span>Bé đã nhớ xong! Bắt đầu ngay 🚀</span>
          </button>
        )}
      </div>

      {/* Phase 3: Options to pick the missing object */}
      {stage === 'GUESSING' && (
        <div className="w-full">
          <p className="text-lg sm:text-xl font-black text-slate-700 mb-5">
            Chạm vào món đồ bé nghĩ vừa biến mất nhé:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 sm:gap-6 max-w-4xl mx-auto px-4">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 shadow-md hover:shadow-xl';

              if (isSelected) {
                cardStyle = opt.isCorrect
                  ? 'border-emerald-500 bg-emerald-50 ring-8 ring-emerald-300 scale-105 shadow-2xl animate-soft-bounce'
                  : 'border-rose-500 bg-rose-50 ring-8 ring-rose-300 animate-gentle-wobble';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.text) playWordAudio(opt.text);
                    handleSelectOption(opt);
                  }}
                  disabled={disabled || (selectedOptionId !== null && opt.isCorrect)}
                  className={`btn-kid rounded-3xl sm:rounded-4xl border-4 p-5 sm:p-7 flex flex-col items-center justify-center cursor-pointer transition-all relative group ${cardStyle}`}
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 mb-2 flex items-center justify-center">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <HelpCircle className="w-16 h-16 text-slate-300" />
                    )}
                  </div>
                  <span className="font-black text-xl sm:text-2xl text-slate-800 capitalize truncate max-w-[160px]">
                    {opt.text}
                  </span>

                  {isSelected && opt.isCorrect && (
                    <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-pop-in">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
