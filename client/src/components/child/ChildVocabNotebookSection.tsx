import React, { useState, useMemo, useEffect } from 'react';
import { vocabMasteryService } from '../../services/vocabMasteryService';
import { useAuth } from '../../context/AuthContext';
import { sfx } from '../../utils/audio';
import { ChildAlbumHeader } from './vocab/ChildAlbumHeader';
import { WordGridItem } from './vocab/WordGridItem';
import { WordZoomModal } from './vocab/WordZoomModal';
import { ParentVocabSheetModal } from './vocab/ParentVocabSheetModal';
import { VocabReviewScreen } from './vocab/VocabReviewScreen';
import { ParentGate } from './ChildProfilePanel';

interface ChildVocabNotebookSectionProps {
  onNavigateTab: (tab: string) => void;
}

export const ChildVocabNotebookSection: React.FC<ChildVocabNotebookSectionProps> = ({
  onNavigateTab,
}) => {
  const { user } = useAuth();
  const childId = (user as any)?.id || (user as any)?._id || 'guest';

  const [tick, setTick] = useState(0);
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [showParentGate, setShowParentGate] = useState(false);
  const [showParentSheet, setShowParentSheet] = useState(false);
  const [showReviewSession, setShowReviewSession] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setTick(t => t + 1);
    window.addEventListener('kc_vocab_mastery_updated', handleUpdate);
    return () => window.removeEventListener('kc_vocab_mastery_updated', handleUpdate);
  }, []);

  // Single Source of Truth cho toàn bộ màn hình
  const summary = useMemo(() => {
    return vocabMasteryService.getVocabSummary(childId);
  }, [childId, tick]);

  const allWords = summary.words;

  const handleStartReview = () => {
    sfx.playPop();
    setShowReviewSession(true);
  };

  const handleOpenParentSheet = () => {
    sfx.playPop();
    setShowParentGate(true);
  };

  const handleUnlockParentGate = () => {
    setShowParentGate(false);
    setShowParentSheet(true);
  };

  return (
    <div className="w-full flex flex-col min-h-0 select-none pb-12">
      {/* ── LỚP CỦA BÉ: Header gọn <= 112px ── */}
      <ChildAlbumHeader
        masteredCount={summary.mastered}
        totalCount={summary.learned}
        reviewCount={summary.review}
        onOpenReviewSession={handleStartReview}
        onOpenParentSheet={handleOpenParentSheet}
      />

      {/* ── Trạng thái rỗng: khi bé chưa học từ nào ── */}
      {allWords.length === 0 && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 border-4 border-dashed border-amber-200 text-center space-y-4 my-6 shadow-sm">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-50 border-3 border-amber-300 flex items-center justify-center text-5xl shadow-inner">
            🌟
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 mb-1">
              Bé ơi, cùng đi học bài mới nhé!
            </h3>
            <p className="text-base font-extrabold text-slate-500 max-w-md mx-auto">
              Bé hãy vào Hành trình học hoặc khám phá các Chủ đề để tích lũy những từ đầu tiên vào Album nào!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
            <button
              type="button"
              onClick={() => onNavigateTab('path')}
              style={{ minHeight: '52px' }}
              className="px-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-amber-950 font-black text-base cursor-pointer shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🐾 Vào Hành trình học</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('topics')}
              style={{ minHeight: '52px' }}
              className="px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base cursor-pointer shadow-md active:scale-95 transition-all flex items-center gap-2"
            >
              <span>🌈 Khám phá Chủ đề</span>
            </button>
          </div>
        </div>
      )}

      {/* ── LƯỚI Ô TỪ CỦA BÉ (Album từ) ── */}
      {allWords.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px, 16vw, 200px), 1fr))',
            gap: 'clamp(12px, 2vw, 24px)',
          }}
          className="w-full"
        >
          {allWords.map((word, idx) => (
            <WordGridItem
              key={word.vocabId || word._id || idx}
              word={word}
              onClick={() => setSelectedWordIndex(idx)}
            />
          ))}
        </div>
      )}

      {/* ── MODAL PHÓNG TO TỪ (WordZoom) ── */}
      {selectedWordIndex !== null && (
        <WordZoomModal
          words={allWords}
          currentIndex={selectedWordIndex}
          onClose={() => setSelectedWordIndex(null)}
          onIndexChange={setSelectedWordIndex}
        />
      )}

      {/* ── CỔNG PHỤ HUYNH (ParentGate) ── */}
      {showParentGate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowParentGate(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border-4 border-amber-300 relative"
            onClick={e => e.stopPropagation()}
          >
            <ParentGate
              onUnlock={handleUnlockParentGate}
              onCancel={() => setShowParentGate(false)}
            />
          </div>
        </div>
      )}

      {/* ── LỚP PHỤ HUYNH: SỔ TAY THEO DÕI ── */}
      {showParentSheet && (
        <ParentVocabSheetModal
          isOpen={showParentSheet}
          onClose={() => setShowParentSheet(false)}
          childId={childId}
          summary={summary}
          onRefresh={() => setTick(t => t + 1)}
        />
      )}

      {/* ── PHIÊN ÔN TỪ (Review Session - Màn toàn khung) ── */}
      {showReviewSession && (
        <VocabReviewScreen
          words={allWords}
          childId={childId}
          scope="all"
          onExit={() => setShowReviewSession(false)}
          onGoHome={() => onNavigateTab('path')}
          onCompleted={() => setTick(t => t + 1)}
        />
      )}
    </div>
  );
};

export default ChildVocabNotebookSection;
