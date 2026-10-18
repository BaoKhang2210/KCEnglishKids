import React, { useState, useEffect } from 'react';
import { Volume2, ArrowRight } from 'lucide-react';
import type { Vocabulary } from '../../../types';
import { playWordAudio, sfx } from '../../../utils/audio';
import { FitGrid } from '../../layout/FitGrid';

interface ExploreSceneStageProps {
  vocabulary: Vocabulary[];
  bigQuestion?: string;
  storyTitle?: string;
  onComplete: () => void;
}

export const ExploreSceneStage: React.FC<ExploreSceneStageProps> = ({
  vocabulary,
  bigQuestion = 'What do we do at school?',
  onComplete
}) => {
  const [tappedIds, setTappedIds] = useState<Set<string>>(new Set());
  const [bouncingId, setBouncingId] = useState<string | null>(null);
  const [showKokoHint, setShowKokoHint] = useState(true);

  const minRequiredTaps = Math.min(4, vocabulary.length || 1);
  const isUnlockReady = tappedIds.size >= minRequiredTaps;

  // Hide Koko hint after first tap
  useEffect(() => {
    if (tappedIds.size > 0 && showKokoHint) {
      const t = setTimeout(() => setShowKokoHint(false), 1500);
      return () => clearTimeout(t);
    }
  }, [tappedIds.size, showKokoHint]);

  const handleTapItem = (vocab: Vocabulary) => {
    const id = vocab._id || (vocab as any).id || vocab.english;
    sfx.playPop();
    setTappedIds(prev => new Set([...prev, id]));
    setBouncingId(id);
    setTimeout(() => setBouncingId(null), 350);
    playWordAudio(vocab.english, vocab.audioUrl);
  };

  const handleListenQuestion = () => {
    sfx.playPop();
    playWordAudio(bigQuestion);
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-2 overflow-hidden select-none">

      {/* Grid of large cards — fills available space */}
      <div className="flex-1 min-h-0 w-full overflow-hidden relative">
        <FitGrid
          items={vocabulary}
          maxPerPage={8}
          renderItem={(vocab: Vocabulary) => {
            const id = vocab._id || (vocab as any).id || vocab.english;
            const isBouncing = bouncingId === id;

            return (
              <button
                onClick={() => handleTapItem(vocab)}
                aria-label={`Nghe từ: ${vocab.english}`}
                className={`
                  w-full h-full min-h-0 flex flex-col rounded-2xl border-4 border-amber-200 bg-white/95
                  hover:border-amber-400 shadow-md hover:shadow-lg overflow-hidden
                  cursor-pointer transition-all duration-150 relative group active:scale-95
                  ${isBouncing ? 'scale-95 ring-4 ring-amber-300/60' : 'scale-100'}
                `}
                style={{ minHeight: 64, minWidth: 64 }}
              >
                {/* Image area: ≥65% of card height via flex-1 */}
                <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 bg-gradient-to-b from-amber-50/60 to-transparent group-hover:from-amber-100/60 transition-colors">
                  {vocab.imageUrl ? (
                    <img
                      src={vocab.imageUrl}
                      alt={vocab.english}
                      className={`max-h-full max-w-full object-contain transition-transform duration-200 ${
                        isBouncing ? 'scale-110' : 'scale-100'
                      } filter drop-shadow`}
                      draggable={false}
                    />
                  ) : (
                    <span style={{ fontSize: '3rem' }}>🌟</span>
                  )}
                </div>

                {/* English word — big, single line, high contrast */}
                <div className="shrink-0 w-full px-2 pb-2.5 pt-1.5 text-center bg-white border-t border-amber-100 transition-colors">
                  <span
                    className="font-black leading-tight block truncate text-slate-800 group-hover:text-amber-700"
                    style={{ fontSize: 'clamp(1.1rem, 3vh, 1.6rem)' }}
                  >
                    {vocab.english}
                  </span>
                </div>
              </button>
            );
          }}
        />

        {/* Koko hint — overlays grid corner, auto-hides after first tap */}
        {showKokoHint && (
          <div className="absolute bottom-3 left-3 z-20 flex items-end gap-2 animate-fade-in pointer-events-none">
            <span className="text-[2.5rem]">🐨</span>
            <div className="bg-white border-2 border-amber-300 rounded-2xl px-3 py-2 shadow-lg">
              <span className="font-black text-slate-800" style={{ fontSize: '1rem' }}>
                Chạm nhé! 👆
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar — 1 row: listen question + CTA */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-1">

        {/* Spacer */}
        <div className="flex-1" />

        {/* Listen question button */}
        <button
          onClick={handleListenQuestion}
          aria-label="Nghe câu hỏi"
          className="w-14 h-14 rounded-full bg-amber-100 border-3 border-amber-300 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
        >
          <Volume2 className="w-7 h-7 text-amber-700" />
        </button>

        {/* CTA — only active when enough taps */}
        <button
          onClick={isUnlockReady ? onComplete : undefined}
          disabled={!isUnlockReady}
          aria-label={isUnlockReady ? 'Tiếp tục sang Chặng 2' : `Hãy chạm thêm ${minRequiredTaps - tappedIds.size} hình nữa`}
          className={`
            flex items-center gap-2 rounded-2xl font-black transition-all shrink-0
            ${isUnlockReady
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-lg animate-soft-bounce'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
          style={{
            minHeight: 56,
            paddingLeft: '1.25rem',
            paddingRight: '1.25rem',
            fontSize: 'clamp(1rem, 2.4vh, 1.25rem)',
          }}
        >
          <span>Tiếp tục</span>
          <ArrowRight className="w-6 h-6 stroke-[3]" />
        </button>
      </div>
    </div>
  );
};
