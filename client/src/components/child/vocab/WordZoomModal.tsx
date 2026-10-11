import React, { useEffect } from 'react';
import { Volume2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { WordImage } from '../common/WordImage';
import { playWordAudio, sfx } from '../../../utils/audio';
import { formatPronunciation } from '../../../services/vocabStateSelector';
import type { WordMasteryDetail } from '../../../services/vocabMasteryService';

interface WordZoomModalProps {
  words: (WordMasteryDetail & { state: 'learning' | 'mastered' | 'review' })[];
  currentIndex: number;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
}

export const WordZoomModal: React.FC<WordZoomModalProps> = ({
  words,
  currentIndex,
  onClose,
  onIndexChange,
}) => {
  const currentWord = words[currentIndex];

  useEffect(() => {
    if (currentWord) {
      playWordAudio(currentWord.english, currentWord.audioUrl);
    }
  }, [currentIndex, currentWord]);

  if (!currentWord) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playPop();
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    } else {
      onIndexChange(words.length - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playPop();
    if (currentIndex < words.length - 1) {
      onIndexChange(currentIndex + 1);
    } else {
      onIndexChange(0);
    }
  };

  const handlePlayAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    sfx.playPop();
    playWordAudio(currentWord.english, currentWord.audioUrl);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Xem từ vựng: ${currentWord.english}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-lg sm:max-w-xl max-h-[92dvh] flex flex-col items-center p-5 sm:p-7 shadow-2xl border-4 border-amber-300 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Nút đóng to chuẩn mầm non (>= 56px) */}
        <button
          type="button"
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng xem chi tiết"
          style={{ minWidth: '56px', minHeight: '56px' }}
          className="absolute top-3 right-3 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-sm z-20"
        >
          <X className="w-8 h-8 stroke-[3]" />
        </button>

        {/* Huy hiệu trạng thái lớn ở góc trái */}
        <div className="absolute top-4 left-4 z-20">
          {currentWord.state === 'mastered' ? (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-900 font-black text-sm shadow-xs">
              <span className="text-xl">⭐</span>
              <span>Đã thuộc</span>
            </span>
          ) : currentWord.state === 'review' ? (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-100 border-2 border-sky-300 text-sky-900 font-black text-sm shadow-xs">
              <span className="text-xl">💧</span>
              <span>Cần ôn</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-900 font-black text-sm shadow-xs">
              <span className="text-xl">🌱</span>
              <span>Đang học</span>
            </span>
          )}
        </div>

        {/* Khung ảnh lớn trung tâm (không nhãn trong hình) */}
        <div
          onClick={handlePlayAudio}
          className="w-full h-56 sm:h-72 rounded-3xl bg-gradient-to-b from-amber-50 to-orange-50 border-3 border-amber-200 flex items-center justify-center p-4 mt-10 mb-4 relative cursor-pointer group shadow-inner"
        >
          <div className="w-full h-full group-hover:scale-105 transition-transform duration-300">
            <WordImage word={currentWord} />
          </div>

          {/* Nút loa phát âm to nổi trên góc ảnh */}
          <div
            style={{ minWidth: '56px', minHeight: '56px' }}
            className="absolute bottom-3 right-3 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Volume2 className="w-8 h-8 stroke-[2.5]" />
          </div>
        </div>

        {/* Chữ tiếng Anh cực lớn & phiên âm */}
        <div className="text-center w-full mb-4">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 capitalize tracking-wide font-display mb-1">
            {currentWord.english}
          </h2>
          {currentWord.pronunciation && (
            <p className="text-sm sm:text-base font-extrabold text-slate-400 font-mono mb-2">
              {formatPronunciation(currentWord.pronunciation)}
            </p>
          )}
          <span className="bg-amber-100 text-amber-950 font-black px-5 py-2 rounded-2xl text-lg sm:text-xl inline-block border-2 border-amber-300 shadow-xs">
            {currentWord.vietnamese}
          </span>
        </div>

        {/* Thanh điều hướng Trước / Sau cho bé */}
        <div className="w-full flex items-center justify-between gap-4 mt-auto pt-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={words.length <= 1}
            aria-label="Từ trước đó"
            style={{ minWidth: '60px', minHeight: '56px' }}
            className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-black text-base flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40"
          >
            <ChevronLeft className="w-6 h-6 stroke-[3]" />
            <span className="hidden sm:inline">Từ trước</span>
          </button>

          <span className="text-sm sm:text-base font-black text-slate-500 whitespace-nowrap">
            {currentIndex + 1} / {words.length}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={words.length <= 1}
            aria-label="Từ tiếp theo"
            style={{ minWidth: '60px', minHeight: '56px' }}
            className="flex-1 rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-black text-base flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-40"
          >
            <span className="hidden sm:inline">Tiếp theo</span>
            <ChevronRight className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
