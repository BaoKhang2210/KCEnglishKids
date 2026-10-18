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
  // 4 review activities / questions based on learned vocabulary
  const questions = React.useMemo(() => {
    if (!vocabulary || vocabulary.length === 0) return [];
    const pool = [...vocabulary];
    const generated = [];
    const count = Math.min(4, pool.length);

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

  if (isDone) {
    return (
      <div className="bg-gradient-to-b from-yellow-50 to-amber-50/50 rounded-3xl border-4 border-amber-300 p-8 text-center max-w-xl mx-auto shadow-2xl animate-pop-in">
        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg">
          🏆
        </div>
        <h3 className="text-3xl font-black text-slate-800 mb-2">
          Chúc mừng bé đã hoàn thành Chặng 4!
        </h3>
        <p className="text-slate-600 font-bold mb-4 text-base">
          Bé đã trả lời đúng {correctCount} / {questions.length} câu hỏi ôn tập tổng hợp.
        </p>

        <div className="bg-white/80 border-2 border-amber-200 rounded-2xl p-4 mb-6 text-sm font-black text-amber-900 inline-flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span>Nhận thêm 3 Sao Vàng & Mở rương phần thưởng Unit! ✨</span>
        </div>

        <div>
          <button
            onClick={() => onComplete(Math.round((correctCount / questions.length) * 100))}
            className="btn-3d-amber py-3.5 px-8 rounded-2xl font-black text-amber-950 text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-xl mx-auto"
          >
            <Trophy className="w-6 h-6" />
            <span>Hoàn thành trọn vẹn Unit ➔</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="bg-gradient-to-b from-amber-50 to-yellow-50/60 rounded-3xl border-4 border-amber-300 p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-lg animate-fade-in">
      <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 px-4 py-1.5 rounded-full text-xs font-black mb-4">
        <Sparkles className="w-4 h-4 text-amber-600" />
        Chặng 4: Ôn tập tổng hợp ({currentIndex + 1} / {questions.length})
      </div>

      <div className="flex flex-col items-center mb-6">
        <button
          onClick={handlePlayPrompt}
          className="btn-kid w-20 h-20 rounded-full bg-amber-500 hover:bg-amber-600 active:scale-95 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all mb-3 ring-4 ring-amber-300"
          title="Nghe câu hỏi"
        >
          <Volume2 className="w-10 h-10" />
        </button>

        <h3 className="text-2xl sm:text-3xl font-black text-slate-800">
          Find the <span className="text-amber-600 uppercase underline decoration-amber-300">{currentQ.target.english}</span>
        </h3>
        <p className="text-xs font-bold text-slate-500 mt-1">
          Bé hãy chạm vào hình ảnh tương ứng nhé!
        </p>
      </div>

      {/* Choice Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentQ.options.map((opt) => {
          const optId = opt._id || opt.english;
          const isSelected = selectedId === optId;
          const isTarget = (opt._id || opt.english) === (currentQ.target._id || currentQ.target.english);

          let style = 'border-slate-200 bg-white hover:border-amber-400 hover:scale-102';
          if (isSelected) {
            style = isTarget
              ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105'
              : 'border-amber-400 bg-amber-50 ring-4 ring-amber-300';
          }

          return (
            <button
              key={optId}
              onClick={() => handleSelect(opt)}
              disabled={selectedId !== null}
              className={`p-4 rounded-3xl border-3 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm relative ${style}`}
            >
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-amber-50/50 flex items-center justify-center p-2 mb-2">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.english}
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                ) : (
                  <span className="text-4xl">🌟</span>
                )}
              </div>

              <span className="font-black text-lg text-slate-800">
                {opt.english}
              </span>

              {isSelected && isTarget && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
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
