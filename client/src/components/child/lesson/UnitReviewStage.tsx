import React, { useState } from 'react';
import { Volume2, Sparkles, Check, Trophy } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface UnitReviewStageProps {
  vocabulary: Vocabulary[];
  onComplete: (score: number) => void;
}

export const UnitReviewStage: React.FC<UnitReviewStageProps> = ({
  vocabulary,
  onComplete
}) => {
  // Ôn lại nhẹ nhàng 3 câu (hoặc tối đa số từ bài học)
  const questions = React.useMemo(() => {
    if (!vocabulary || vocabulary.length === 0) return [];
    const pool = [...vocabulary];
    const generated = [];
    // Ôn tập nhẹ nhàng: tối đa 3 câu ngắn gọn, không gây áp lực
    const count = Math.min(3, pool.length);

    for (let i = 0; i < count; i++) {
      const target = pool[i];
      const distractors = pool.filter(v => (v._id || v.english) !== (target._id || target.english))
        .sort(() => 0.5 - Math.random())
        .slice(0, 2);

      const options = [target, ...distractors].sort(() => 0.5 - Math.random());
      generated.push({ target, options });
    }
    return generated;
  }, [vocabulary]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const currentQ = questions[currentIndex];

  const handlePlayPrompt = () => {
    if (!currentQ) return;
    sfx.playPop();
    playWordAudio(`Can you find the ${currentQ.target.english}?`, currentQ.target.audioUrl);
  };

  const handleSelect = (vocab: Vocabulary) => {
    if (selectedId !== null || !currentQ) return;
    const isCorrect = (vocab._id || vocab.english) === (currentQ.target._id || currentQ.target.english);
    setSelectedId(vocab._id || vocab.english);

    if (isCorrect) {
      sfx.playSuccess();
      setCorrectCount(prev => prev + 1);
    } else {
      sfx.playGentleWrong();
    }

    setTimeout(() => {
      setSelectedId(null);
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsDone(true);
      }
    }, 1100);
  };

  // Màn hình hoàn thành nhẹ nhàng
  if (isDone) {
    return (
      <div className="w-full h-full min-h-0 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        <div className="bg-gradient-to-b from-amber-50 to-orange-50/60 rounded-3xl border-4 border-amber-300 p-6 sm:p-8 text-center max-w-lg w-full shadow-2xl animate-pop-in flex flex-col items-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center text-4xl sm:text-5xl mb-3 shadow-lg animate-soft-bounce">
            🌟
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
            Bé giỏi quá! 🎉
          </h3>
          <p className="text-slate-600 font-bold mb-4 text-sm sm:text-base">
            Đã hoàn thành phần ôn tập nhẹ nhàng của bài học.
          </p>

          <div className="bg-white/90 border-2 border-amber-300 rounded-2xl px-4 py-3 mb-6 text-xs sm:text-sm font-black text-amber-900 inline-flex items-center gap-2 shadow-2xs">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Mở khóa Huy hiệu & Ngôi sao bài học! ✨</span>
          </div>

          <button
            onClick={() => onComplete(Math.round((correctCount / Math.max(1, questions.length)) * 100))}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-3 cursor-pointer shadow-xl active:scale-95 transition-all"
          >
            <Trophy className="w-6 h-6 shrink-0" />
            <span>Hoàn thành bài học ➔</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="w-full h-full min-h-0 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-none">
      <div className="w-full max-w-3xl h-full flex flex-col justify-between bg-gradient-to-b from-amber-50/90 to-yellow-50/70 rounded-3xl border-4 border-amber-300 p-4 sm:p-6 shadow-xl animate-fade-in">
        
        {/* HEADER: Title & Progress indicator */}
        <div className="shrink-0 flex items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-1 rounded-full text-xs sm:text-sm font-black">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Chặng 4: Ôn nhẹ nhàng</span>
          </div>

          {/* Dots progress indicator */}
          <div className="flex items-center gap-2">
            {questions.map((_, idx) => (
              <span
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  idx < currentIndex
                    ? 'bg-emerald-500 scale-100'
                    : idx === currentIndex
                    ? 'bg-amber-500 scale-125 ring-2 ring-amber-300'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* CENTER PROMPT: Big Speaker + Target Word */}
        <div className="shrink-0 flex flex-col items-center justify-center py-2 sm:py-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={handlePlayPrompt}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 active:scale-95 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all ring-4 ring-amber-300 shrink-0"
              title="Nghe lại"
            >
              <Volume2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </button>

            <div className="text-left">
              <span className="text-xs sm:text-sm font-black text-amber-800 uppercase tracking-wide block">
                Bé tìm hình:
              </span>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-800 uppercase tracking-tight">
                {currentQ.target.english}
              </h3>
            </div>
          </div>
        </div>

        {/* CARDS GRID: Super Big, High Visibility for 3-6 year olds */}
        <div className="flex-1 min-h-0 w-full grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 items-stretch py-2">
          {currentQ.options.map((opt) => {
            const optId = opt._id || opt.english;
            const isSelected = selectedId === optId;
            const isTarget = (opt._id || opt.english) === (currentQ.target._id || currentQ.target.english);

            let cardStyle = 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-xl';
            if (isSelected) {
              cardStyle = isTarget
                ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-102 shadow-2xl'
                : 'border-rose-400 bg-rose-50 ring-4 ring-rose-300 scale-98';
            }

            return (
              <button
                key={optId}
                onClick={() => handleSelect(opt)}
                disabled={selectedId !== null}
                className={`
                  w-full h-full min-h-[140px] sm:min-h-0 rounded-3xl border-4
                  flex flex-col items-center justify-between p-3 sm:p-4 cursor-pointer
                  transition-all duration-200 shadow-md relative overflow-hidden active:scale-95
                  ${cardStyle}
                `}
              >
                {/* Image Area - Maximum size for children */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2">
                  {opt.imageUrl ? (
                    <img
                      src={opt.imageUrl}
                      alt={opt.english}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-200"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-5xl sm:text-6xl">🌟</span>
                  )}
                </div>

                {/* Big English Word text label */}
                <div className="shrink-0 w-full py-1.5 px-2 bg-amber-50/80 rounded-2xl text-center border border-amber-200/60 mt-1">
                  <span className="font-black text-lg sm:text-xl text-slate-800 capitalize block truncate">
                    {opt.english}
                  </span>
                </div>

                {/* Check badge when chosen correctly */}
                {isSelected && isTarget && (
                  <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* FOOTER HINT */}
        <div className="shrink-0 text-center pt-1">
          <p className="text-xs sm:text-sm font-bold text-amber-800/80">
            Chạm vào hình ảnh đúng để cùng Koko hoàn thành nhé! ✨
          </p>
        </div>

      </div>
    </div>
  );
};
