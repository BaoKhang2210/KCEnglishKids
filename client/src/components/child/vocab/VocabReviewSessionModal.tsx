import React, { useState } from 'react';
import { X, Volume2 } from 'lucide-react';
import { ChoiceCard } from '../common/ChoiceCard';
import { KokoMascot } from '../KokoMascot';
import { vocabMasteryService, type WordMasteryDetail } from '../../../services/vocabMasteryService';
import { playWordAudio, sfx } from '../../../utils/audio';
import type { ActivityOption } from '../../../types';

interface VocabReviewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: (WordMasteryDetail & { state: 'learning' | 'mastered' | 'review' })[];
  childId: string;
  onCompleted: () => void;
}

export const VocabReviewSessionModal: React.FC<VocabReviewSessionModalProps> = ({
  isOpen,
  onClose,
  words,
  childId,
  onCompleted,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!isOpen || words.length === 0) return null;

  const targetWord = words[currentIdx % words.length];

  // Tạo các lựa chọn từ pool (gồm targetWord + các từ khác)
  const options: ActivityOption[] = words.map(w => ({
    id: w.vocabId || w._id,
    text: w.english,
    vietnamese: w.vietnamese,
    imageUrl: w.imageUrl,
    audioUrl: w.audioUrl,
    isCorrect: (w.vocabId || w._id) === (targetWord.vocabId || targetWord._id),
  }));

  const handleSelectOption = (opt: ActivityOption) => {
    if (feedback !== 'idle') return;
    setSelectedId(opt.id);

    if (opt.isCorrect) {
      setFeedback('correct');
      sfx.playCorrect();
      vocabMasteryService.recordGameResult(childId, targetWord.vocabId || targetWord._id, true);

      setTimeout(() => {
        setFeedback('idle');
        setSelectedId(null);
        if (currentIdx + 1 < words.length) {
          setCurrentIdx(prev => prev + 1);
        } else {
          sfx.playSuccess();
          onCompleted();
          onClose();
        }
      }, 1400);
    } else {
      setFeedback('wrong');
      sfx.playGentleWrong();
      vocabMasteryService.recordGameResult(childId, targetWord.vocabId || targetWord._id, false);

      setTimeout(() => {
        setFeedback('idle');
        setSelectedId(null);
      }, 1000);
    }
  };

  const handlePlayPrompt = () => {
    playWordAudio(targetWord.english, targetWord.audioUrl);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập từ vựng"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="bg-amber-50 rounded-3xl w-full max-w-4xl h-[92dvh] flex flex-col shadow-2xl border-4 border-amber-300 overflow-hidden relative">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-amber-200/70 border-b-2 border-amber-300 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="font-black text-amber-950 text-base sm:text-lg">
              Ôn từ cùng Koko ({currentIdx + 1}/{words.length})
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Thoát phiên ôn từ"
            style={{ minWidth: '48px', minHeight: '48px' }}
            className="rounded-full bg-white/80 hover:bg-white text-slate-700 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <X className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Nội dung ôn tập trực quan Nghe & Chọn */}
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-between p-4 sm:p-8 gap-6 overflow-hidden">
          {/* Cột trái: Koko & Nút loa to */}
          <div className="flex flex-col items-center justify-center gap-4 flex-shrink-0">
            <div className="w-28 h-28 sm:w-36 sm:h-36">
              <KokoMascot state={feedback === 'correct' ? 'celebrating' : 'happy'} size="lg" />
            </div>

            <button
              type="button"
              onClick={handlePlayPrompt}
              aria-label="Nghe lại phát âm"
              style={{ minWidth: '72px', minHeight: '72px' }}
              className="rounded-full bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 flex items-center justify-center shadow-lg border-3 border-white transition-all cursor-pointer"
            >
              <Volume2 className="w-10 h-10 stroke-[2.5]" />
            </button>
            <span className="text-sm font-black text-amber-900">Chạm để nghe âm thanh 🔊</span>
          </div>

          {/* Cột phải: Các thẻ lựa chọn ChoiceCard */}
          <div className="flex-1 w-full grid grid-cols-2 gap-4 h-full max-h-[460px] items-center justify-items-center">
            {options.map((opt) => (
              <ChoiceCard
                key={opt.id}
                item={{
                  english: opt.text || '',
                  vietnamese: opt.vietnameseText || '',
                  imageUrl: opt.imageUrl,
                }}
                isSelected={selectedId === opt.id}
                status={feedback === 'correct' && opt.isCorrect ? 'correct' : feedback === 'wrong' && selectedId === opt.id ? 'wrong' : 'idle'}
                onClick={() => handleSelectOption(opt)}
                size={220}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
