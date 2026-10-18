import React, { useState } from 'react';
import { Volume2, Sparkles, Check, RotateCcw } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';

interface RecognitionCheckProps {
  vocabulary: Vocabulary[];
  onComplete: (score: number) => void;
  onRetry?: () => void;
}

export const RecognitionCheck: React.FC<RecognitionCheckProps> = ({
  vocabulary,
  onComplete,
  onRetry
}) => {
  // Use up to 3 questions for quick recognition check
  const questions = React.useMemo(() => {
    if (!vocabulary || vocabulary.length === 0) return [];
    const pool = [...vocabulary];
    const generated = [];
    const count = Math.min(3, pool.length);

    for (let i = 0; i < count; i++) {
      const target = pool[i];
      // Pick 2 distractors
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
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const currentQ = questions[currentIndex];

  const handlePlayPrompt = () => {
    if (!currentQ) return;
    sfx.playPop();
    playWordAudio(`Where is the ${currentQ.target.english}?`, currentQ.target.audioUrl);
  };

  const handleSelect = (vocab: Vocabulary) => {
    if (selectedId !== null || !currentQ) return;
    const isCorrect = (vocab._id || vocab.english) === (currentQ.target._id || currentQ.target.english);
    setSelectedId(vocab._id || vocab.english);

    if (isCorrect) {
      sfx.playSuccess();
      setCorrectAnswers(prev => prev + 1);
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
      <div className="bg-white rounded-3xl border-4 border-emerald-300 p-8 text-center max-w-lg mx-auto shadow-xl animate-pop-in">
        <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-5xl mx-auto mb-4">
          🎉
        </div>
        <h3 className="text-2xl font-black text-slate-800 mb-2">
          Xuất sắc! Bé nhận diện rất nhanh!
        </h3>
        <p className="text-slate-500 font-bold mb-6">
          Đã đúng {correctAnswers} / {questions.length} câu hỏi nhận diện từ.
        </p>

        <div className="flex gap-4 justify-center">
          {onRetry && (
            <button
              onClick={() => {
                setCurrentIndex(0);
                setCorrectAnswers(0);
                setIsDone(false);
                onRetry();
              }}
              className="btn-3d-amber py-3 px-6 rounded-2xl font-black text-amber-950 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Làm lại</span>
            </button>
          )}
          <button
            onClick={() => onComplete(Math.round((correctAnswers / questions.length) * 100))}
            className="btn-3d-emerald py-3 px-8 rounded-2xl font-black text-white flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <span>Tiến tới Chặng 3 ➔</span>
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="bg-gradient-to-b from-sky-50 to-indigo-50/50 rounded-3xl border-4 border-sky-300 p-6 sm:p-8 text-center max-w-2xl mx-auto shadow-md">
      <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-900 border border-sky-300 px-4 py-1.5 rounded-full text-xs font-black mb-4">
        <Sparkles className="w-4 h-4 text-sky-600" />
        Kiểm tra nhận diện: Câu {currentIndex + 1} / {questions.length}
      </div>

      <div className="flex flex-col items-center mb-6">
        <button
          onClick={handlePlayPrompt}
          className="btn-kid w-20 h-20 rounded-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white flex items-center justify-center shadow-lg cursor-pointer transition-all mb-3"
          title="Nghe câu hỏi"
        >
          <Volume2 className="w-10 h-10" />
        </button>

        <h3 className="text-2xl sm:text-3xl font-black text-slate-800">
          Where is the <span className="text-sky-600 uppercase underline decoration-sky-300">{currentQ.target.english}</span>?
        </h3>
        <p className="text-xs font-bold text-slate-500 mt-1">
          Bé hãy bấm vào loa để nghe và chọn hình đúng nhé!
        </p>
      </div>

      {/* 3 Large Picture Choices */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentQ.options.map((opt) => {
          const optId = opt._id || opt.english;
          const isSelected = selectedId === optId;
          const isTarget = (opt._id || opt.english) === (currentQ.target._id || currentQ.target.english);

          let style = 'border-slate-200 bg-white hover:border-sky-400 hover:scale-102';
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
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-50 flex items-center justify-center p-2 mb-2">
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
