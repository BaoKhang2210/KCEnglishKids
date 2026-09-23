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
  const initialItems = [...visibleObjects, missingName].filter(Boolean);

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
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto text-center select-none animate-pop-in">
      {/* Banner / Header */}
      {stage === 'MEMORIZING' ? (
        <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-950 font-black px-4 py-1.5 rounded-full text-xs sm:text-sm mb-4 border border-purple-300 shadow-xs animate-pulse">
          <Eye className="w-4 h-4 text-purple-600" />
          <span>Bé quan sát thật kỹ và ghi nhớ các món đồ này nhé!</span>
          <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-black ml-1">
            {timeLeft}s
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-950 font-black px-4 py-1.5 rounded-full text-xs sm:text-sm mb-4 border border-amber-300 shadow-xs animate-bounce-short">
          <span>🎩✨ Úm ba la! Món đồ nào vừa biến mất rồi?</span>
        </div>
      )}

      {/* Observation Table / Scene Tray */}
      <div className="w-full bg-gradient-to-b from-amber-50 to-orange-50/60 rounded-3xl border-4 border-amber-300 p-5 sm:p-6 shadow-xl mb-6 relative overflow-hidden">
        {/* Timer Bar during memorization */}
        {stage === 'MEMORIZING' && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-amber-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(timeLeft / 4) * 100}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 min-h-[160px] py-2">
          {stage === 'MEMORIZING' ? (
            // Phase 1: Show all initial items
            initialItems.map((item, idx) => {
              const matchedOpt = question.options.find(o => (o.text || '').toLowerCase() === item.toLowerCase());
              const imgUrl = matchedOpt?.imageUrl;

              return (
                <div
                  key={idx}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-3 border-purple-300 p-2 flex flex-col items-center justify-center shadow-md animate-pop-in"
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-3xl">🎁</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-700 capitalize mt-1 truncate max-w-[90px]">
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
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-3 border-amber-200 p-2 flex flex-col items-center justify-center shadow-sm opacity-90"
                  >
                    <div className="w-16 h-16 flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-3xl">🎁</span>
                      )}
                    </div>
                    <span className="text-xs font-black text-slate-600 capitalize mt-1 truncate max-w-[90px]">
                      {item}
                    </span>
                  </div>
                );
              })}

              {/* Sparkling Missing Placeholder */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-400 to-purple-500 text-white border-3 border-dashed border-white flex flex-col items-center justify-center shadow-xl animate-soft-bounce ring-4 ring-amber-300">
                <span className="text-3xl sm:text-4xl animate-pulse">❓</span>
                <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">Biến mất</span>
              </div>
            </>
          )}
        </div>

        {/* Quick skip button if child is ready */}
        {stage === 'MEMORIZING' && (
          <button
            type="button"
            onClick={handleSkipTimer}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black cursor-pointer shadow transition-all active:scale-95"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>Bé đã nhớ xong! Bắt đầu ngay 🚀</span>
          </button>
        )}
      </div>

      {/* Phase 3: Options to pick the missing object */}
      {stage === 'GUESSING' && (
        <div className="w-full">
          <p className="text-sm font-black text-slate-600 mb-3">
            Chạm vào món đồ bé nghĩ vừa biến mất nhé:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-w-xl mx-auto">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 shadow-sm hover:shadow-md';

              if (isSelected) {
                cardStyle = opt.isCorrect
                  ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 shadow-xl animate-soft-bounce'
                  : 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.text) playWordAudio(opt.text);
                    handleSelectOption(opt);
                  }}
                  disabled={disabled || (selectedOptionId !== null && opt.isCorrect)}
                  className={`btn-kid rounded-2xl border-3 p-3 flex flex-col items-center justify-center cursor-pointer transition-all relative group ${cardStyle}`}
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mb-1 flex items-center justify-center">
                    {opt.imageUrl ? (
                      <img
                        src={opt.imageUrl}
                        alt={opt.text}
                        className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <HelpCircle className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <span className="font-black text-sm sm:text-base text-slate-800 capitalize truncate max-w-[120px]">
                    {opt.text}
                  </span>

                  {isSelected && opt.isCorrect && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow animate-pop-in">
                      <Check className="w-4 h-4 stroke-[3]" />
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
