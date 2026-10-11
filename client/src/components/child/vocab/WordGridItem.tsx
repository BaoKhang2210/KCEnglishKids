import React from 'react';
import { WordImage } from '../common/WordImage';
import { playWordAudio } from '../../../utils/audio';
import type { WordMasteryDetail } from '../../../services/vocabMasteryService';

interface WordGridItemProps {
  word: WordMasteryDetail & { state: 'learning' | 'mastered' | 'review' };
  onClick: () => void;
}

export const WordGridItem: React.FC<WordGridItemProps> = ({ word, onClick }) => {
  const isMastered = word.state === 'mastered';
  const isReview = word.state === 'review';

  const handleClick = () => {
    playWordAudio(word.english, word.audioUrl);
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Từ vựng: ${word.english}, ${word.vietnamese}. Trạng thái: ${
        isMastered ? 'Đã thuộc' : isReview ? 'Cần ôn' : 'Đang học'
      }`}
      style={{ minWidth: '140px', minHeight: '140px' }}
      className={`group relative rounded-3xl p-3 flex flex-col items-center justify-between transition-all duration-200 cursor-pointer text-left select-none border-4 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 active:translate-y-0.5 active:scale-[0.98] ${
        isMastered
          ? 'border-amber-300 hover:border-amber-400 bg-gradient-to-b from-amber-50/50 to-white'
          : isReview
          ? 'border-sky-300 hover:border-sky-400 bg-gradient-to-b from-sky-50/50 to-white'
          : 'border-emerald-200 hover:border-emerald-300 bg-white'
      }`}
    >
      {/* Huy hiệu trạng thái lớn ở góc (>= 28px) phân biệt bằng hình dạng rõ rệt */}
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        {isMastered ? (
          <div
            title="Đã thuộc"
            aria-label="Đã thuộc"
            className="w-8 h-8 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-base shadow-sm border-2 border-white font-black"
          >
            ⭐
          </div>
        ) : isReview ? (
          <div
            title="Cần ôn"
            aria-label="Cần ôn"
            className="w-8 h-8 rounded-full bg-sky-400 text-sky-950 flex items-center justify-center text-base shadow-sm border-2 border-white font-black"
          >
            💧
          </div>
        ) : null}
      </div>

      {/* Khung ảnh WordImage chuẩn mầm non (>= 60% chiều cao ô, min 120px) */}
      <div className="w-full flex-1 min-h-[120px] rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 flex items-center justify-center p-2 mb-2 relative overflow-hidden group-hover:scale-105 transition-transform duration-200">
        <WordImage word={word} />
      </div>

      {/* Chữ tiếng Anh bên dưới: >= 20px, in đậm, 1-2 dòng, không cắt chữ */}
      <div className="w-full text-center px-1">
        <span
          style={{
            fontSize: 'clamp(20px, 3.5cqw, 24px)',
            lineHeight: 1.25,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          }}
          className="font-black text-slate-800 capitalize block truncate group-hover:text-amber-800 transition-colors"
        >
          {word.english}
        </span>
      </div>
    </button>
  );
};
