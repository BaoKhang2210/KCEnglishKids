import React, { useState, useEffect } from 'react';
import { Volume2, Layers } from 'lucide-react';
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

  if (!words.length) {
    return (
      <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-center text-xs text-amber-800">
        Bài học này chưa có danh sách từ vựng hoạt động để xem trước.
      </div>
    );
  }

  // Calculate balanced column layout based on number of vocabulary words
  const gridColClass =
    words.length <= 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : words.length === 5
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6';

  return (
    <div className="space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2.5 pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-teal-100 text-teal-800 font-black text-xs">
            <Layers size={15} />
          </span>
          <div className="flex items-baseline gap-2">
            <h4 className="text-xs sm:text-sm font-black text-slate-900">
              Bộ Thẻ Flashcard Bài Học ({words.length} thẻ tranh)
            </h4>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              — Bấm vào thẻ hoặc nút loa để nghe thử phát âm chuẩn &amp; xem tranh
            </span>
          </div>
        </div>
      </div>

      {/* Grid View: Tự động cân đối 1 hàng (hoặc 2 hàng nếu nhiều từ), không cần cuộn dọc */}
      <div className={`grid ${gridColClass} gap-2.5 sm:gap-3`}>
        {words.map((w, idx) => {
          const isPlaying = playingWord === w.english;
          const isPlayingSlow = playingWord === w.english + '_slow';

          return (
            <div
              key={w._id || w.english + idx}
              onClick={() => {
                void handlePlaySound(null, w);
              }}
              className={`group relative rounded-2xl border-2 bg-white p-2.5 text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between ${
                isPlaying || isPlayingSlow
                  ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-200'
                  : 'border-slate-200 hover:border-teal-300'
              }`}
              title="Bấm để nghe phát âm"
            >
              {/* Image Container */}
              <div className="relative w-full h-24 sm:h-28 rounded-xl bg-slate-50 flex items-center justify-center p-1.5 mb-1.5 overflow-hidden border border-slate-100 group-hover:bg-amber-50/30 transition-colors">
                {w.imageUrl ? (
                  <img
                    src={w.imageUrl}
                    alt={w.english}
                    className="w-full h-full object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-2xl">✨</span>
                )}

                {/* Top-Right Badge: Number */}
                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/90 text-[10px] font-black text-slate-400 border border-slate-200">
                  #{idx + 1}
                </span>
              </div>

              {/* English Word */}
              <h5 className="text-xs sm:text-sm font-black text-slate-900 capitalize tracking-tight group-hover:text-teal-800 transition-colors truncate">
                {w.english}
              </h5>

              {/* Vietnamese Meaning */}
              <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                {w.vietnamese || '—'}
              </p>

              {/* Audio Buttons */}
              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={(e) => void handlePlaySound(e, w, false)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-teal-600 text-white animate-pulse'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-600 hover:text-white'
                  }`}
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 size={12} />
                  <span>Nghe</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => void handlePlaySound(e, w, true)}
                  className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
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
    </div>
  );
};
