import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCw, Maximize2, Sparkles, Layers, Grid } from 'lucide-react';
import { playWordAudio, playWordAudioSlow, stopWordAudio } from '../../utils/audio';

interface VocabItem {
  _id?: string;
  english: string;
  vietnamese?: string;
  imageUrl?: string;
  audioUrl?: string;
  wordType?: string;
  status?: string;
}

interface LessonFlashcardPreviewProps {
  lesson: {
    _id?: string;
    title: string;
    vietnameseTitle?: string;
    vocabularyItems?: VocabItem[];
  };
}

export const LessonFlashcardPreview: React.FC<LessonFlashcardPreviewProps> = ({ lesson }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'slide'>('grid');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  const rawWords = lesson.vocabularyItems || [];
  const words = rawWords.filter(
    (w) => w?.english && !['INACTIVE', 'HIDDEN', 'DRAFT'].includes(w.status || '')
  );

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopWordAudio();
    };
  }, []);

  // Keyboard navigation for slide mode
  useEffect(() => {
    if (viewMode !== 'slide' || words.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, words.length]);

  const handlePlaySound = async (e: React.MouseEvent | null, word: VocabItem, slow = false) => {
    if (e) e.stopPropagation();
    try {
      setPlayingWord(word.english + (slow ? '_slow' : ''));
      if (slow) {
        await playWordAudioSlow(word.english);
      } else {
        await playWordAudio(word.english, word.audioUrl);
      }
    } finally {
      setPlayingWord(null);
    }
  };

  const handleNext = () => {
    if (words.length === 0) return;
    setIsFlipped(false);
    const nextIdx = (currentIndex + 1) % words.length;
    setCurrentIndex(nextIdx);
    void handlePlaySound(null, words[nextIdx]);
  };

  const handlePrev = () => {
    if (words.length === 0) return;
    setIsFlipped(false);
    const prevIdx = (currentIndex - 1 + words.length) % words.length;
    setCurrentIndex(prevIdx);
    void handlePlaySound(null, words[prevIdx]);
  };

  if (!words.length) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center text-xs text-amber-800">
        Bài học này chưa có danh sách từ vựng hoạt động để xem trước.
      </div>
    );
  }

  const activeWord = words[currentIndex] || words[0];

  return (
    <div className="space-y-4">
      {/* Header Bar with Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800 font-black text-xs">
            <Layers size={16} />
          </span>
          <div>
            <h4 className="text-sm font-black text-slate-900">
              Bộ Thẻ Flashcard Bài Học ({words.length} thẻ tranh)
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Bấm vào thẻ hoặc nút loa để nghe thử phát âm chuẩn &amp; xem tranh
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid size={13} /> Dạng lưới ({words.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('slide');
              void handlePlaySound(null, words[currentIndex]);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              viewMode === 'slide'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Maximize2 size={13} /> Trình chiếu thẻ
          </button>
        </div>
      </div>

      {/* MODE 1: GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto pr-1">
          {words.map((w, idx) => {
            const isPlaying = playingWord === w.english;
            const isPlayingSlow = playingWord === w.english + '_slow';

            return (
              <div
                key={w._id || w.english + idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setViewMode('slide');
                  void handlePlaySound(null, w);
                }}
                className={`group relative rounded-2xl border-2 bg-white p-3 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${
                  isPlaying || isPlayingSlow
                    ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-200'
                    : 'border-slate-200 hover:border-teal-300'
                }`}
                title="Bấm để mở trình chiếu thẻ lớn"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-square rounded-xl bg-slate-50 flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-100 group-hover:bg-amber-50/30 transition-colors">
                  {w.imageUrl ? (
                    <img
                      src={w.imageUrl}
                      alt={w.english}
                      className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl">✨</span>
                  )}

                  {/* Top-Right Badge: Number */}
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/90 text-[10px] font-black text-slate-400 border border-slate-200">
                    #{idx + 1}
                  </span>
                </div>

                {/* English Word */}
                <h5 className="text-sm font-black text-slate-900 capitalize tracking-tight group-hover:text-teal-800 transition-colors">
                  {w.english}
                </h5>

                {/* Vietnamese Meaning */}
                <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                  {w.vietnamese || '—'}
                </p>

                {/* Audio Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => void handlePlaySound(e, w, false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isPlaying
                        ? 'bg-teal-600 text-white animate-pulse'
                        : 'bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white'
                    }`}
                    title="Nghe phát âm chuẩn"
                  >
                    <Volume2 size={13} />
                    <span>Nghe</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => void handlePlaySound(e, w, true)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isPlayingSlow
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-900'
                    }`}
                    title="Nghe phát âm chậm rõ âm tiết"
                  >
                    0.6x
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE 2: INTERACTIVE SLIDE / SHOWCASE MODE */}
      {viewMode === 'slide' && (
        <div className="space-y-3">
          {/* Main Showcase Card */}
          <div className="relative mx-auto max-w-sm rounded-3xl border-2 border-teal-300 bg-linear-to-b from-teal-50/50 via-white to-amber-50/30 p-5 shadow-sm">
            {/* Top Indicator */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-3 pb-2 border-b border-slate-100">
              <span className="flex items-center gap-1 text-teal-800">
                <Sparkles size={14} /> Thẻ {currentIndex + 1} / {words.length}
              </span>
              <button
                type="button"
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer shadow-2xs"
              >
                <RotateCw size={12} className={isFlipped ? 'rotate-180 transition-transform' : ''} />
                <span>{isFlipped ? 'Xem mặt trước (Anh)' : 'Lật mặt sau (Việt)'}</span>
              </button>
            </div>

            {/* Clickable Card Content */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="group cursor-pointer select-none text-center"
              title="Bấm vào thẻ để lật mặt trước/sau"
            >
              {!isFlipped ? (
                /* Mặt Trước: Tranh & Tiếng Anh */
                <div className="space-y-3 py-2">
                  <div className="mx-auto w-44 h-44 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-xs flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    {activeWord.imageUrl ? (
                      <img
                        src={activeWord.imageUrl}
                        alt={activeWord.english}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-6xl">🌟</span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900 capitalize tracking-tight">
                      {activeWord.english}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-bold">
                      {activeWord.wordType ? `[${activeWord.wordType}]` : ''} · Chạm để lật nghĩa tiếng Việt
                    </p>
                  </div>
                </div>
              ) : (
                /* Mặt Sau: Nghĩa Tiếng Việt & Hướng Dẫn Tương Tác */
                <div className="space-y-3 py-6 min-h-[220px] flex flex-col justify-center items-center">
                  <span className="text-3xl">🇻🇳</span>
                  <div>
                    <h3 className="text-2xl font-black text-teal-900">
                      {activeWord.vietnamese || 'Chưa cập nhật nghĩa'}
                    </h3>
                    <p className="text-sm font-black text-slate-600 mt-1 capitalize">
                      Tiếng Anh: {activeWord.english}
                    </p>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-1 max-w-[280px]">
                    <b className="block font-bold">💡 Gợi ý tương tác mầm non:</b>
                    <p className="text-[11px] leading-relaxed">
                      Cô giơ tranh và hỏi: <em>&ldquo;What is this?&rdquo;</em> — Bé đồng thanh: <em>&ldquo;It&apos;s a {activeWord.english}!&rdquo;</em>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Audio Action Buttons on Card */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={(e) => void handlePlaySound(e, activeWord, false)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-all ${
                  playingWord === activeWord.english
                    ? 'bg-teal-700 text-white animate-pulse'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                <Volume2 size={16} />
                <span>Phát âm chuẩn</span>
              </button>

              <button
                type="button"
                onClick={(e) => void handlePlaySound(e, activeWord, true)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                  playingWord === activeWord.english + '_slow'
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Đọc chậm 0.6x rõ từng âm"
              >
                <span>🐢 Nghe chậm</span>
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between max-w-sm mx-auto pt-1">
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              <ChevronLeft size={16} /> Thẻ trước
            </button>

            {/* Thumbnails Navigator */}
            <div className="flex items-center gap-1 overflow-x-auto max-w-[170px] py-1 px-1">
              {words.map((w, idx) => (
                <button
                  key={w._id || w.english + idx}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                    void handlePlaySound(null, w);
                  }}
                  className={`w-6 h-6 rounded-md text-[10px] font-black shrink-0 transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'bg-teal-700 text-white scale-110 shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
            >
              Thẻ sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
