import React, { useRef, useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { ChoiceCard } from '../common/ChoiceCard';
import { KokoMascot } from '../KokoMascot';
import { useFitGrid } from '../../../hooks/useFitGrid';

interface ListenChooseEngineProps {
  question: ActivityQuestion;
  selectedOptionId: string | null;
  feedbackState: 'idle' | 'correct' | 'wrong';
  onSelectOption: (option: ActivityOption) => void;
  onPlayPrompt: () => void;
  showPromptWordText?: boolean; // Parent toggle (defaults to false to prevent leaking answer)
  showCaptions?: boolean;
  showVietnamese?: boolean;
}

/**
 * ListenChooseEngine: 2-Zone massive layout (Left: Speaker + Koko | Right: Giant ChoiceCards).
 * - Removes the revealing text chip "teacher" by default.
 * - Computes maximum card size using useFitGrid (at 1316x655, 3 cards reach >= 280px).
 * - Integrates WordImage masking without internal SVG label pills.
 */
export const ListenChooseEngine: React.FC<ListenChooseEngineProps> = ({
  question,
  selectedOptionId,
  feedbackState,
  onSelectOption,
  onPlayPrompt,
  showPromptWordText = false,
  showCaptions = true,
  showVietnamese = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 800, h: 420 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDims({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const { cardSize, gap } = useFitGrid(
    question.options.length,
    dims.w,
    dims.h,
    440
  );

  return (
    <div className="w-full h-full flex flex-col md:flex-row justify-between items-center select-none py-1 px-2 sm:px-6 gap-4">
      {/* ── LEFT ZONE: Massive Speaker Button (clamp 96px..160px) + Koko Mascot ── */}
      <div className="flex-shrink-0 flex flex-row md:flex-col items-center justify-center gap-4 md:gap-6 w-full md:w-auto md:min-w-[200px]">
        {/* Giant Speaker Button */}
        <button
          onClick={onPlayPrompt}
          type="button"
          aria-label="Nghe lại câu hỏi"
          style={{
            width: 'clamp(96px, 18cqmin, 150px)',
            height: 'clamp(96px, 18cqmin, 150px)',
          }}
          className="rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer ring-10 ring-sky-200/70 animate-soft-bounce"
        >
          <Volume2 className="w-12 h-12 sm:w-16 sm:h-16" />
        </button>

        <KokoMascot state="happy" size="md" interactive={false} />

        {/* Optional prompt word text (Only shown if enabled in Parent Sheet) */}
        {showPromptWordText && (
          <span className="text-xl sm:text-2xl font-black text-slate-800 bg-white/95 px-4 py-1.5 rounded-2xl border-2 border-slate-200 shadow-xs tracking-wide">
            "{question.promptText}"
          </span>
        )}
      </div>

      {/* ── RIGHT ZONE: Giant Choice Cards (Filled via useFitGrid) ── */}
      <div
        ref={containerRef}
        className="flex-1 w-full h-full min-h-0 flex items-center justify-center overflow-hidden p-1"
      >
        <div
          style={{ gap: `${gap}px` }}
          className="flex flex-wrap items-center justify-center my-auto"
        >
          {question.options.map((opt) => {
            const isSelected = selectedOptionId === opt.id;
            const status =
              isSelected && feedbackState === 'correct'
                ? 'correct'
                : isSelected && feedbackState === 'wrong'
                ? 'wrong'
                : 'idle';

            return (
              <ChoiceCard
                key={opt.id}
                item={{
                  english: opt.text,
                  vietnamese: opt.vietnameseText,
                  imageUrl: opt.imageUrl,
                }}
                size={cardSize}
                isSelected={isSelected}
                status={status}
                onClick={() => onSelectOption(opt)}
                disabled={feedbackState !== 'idle'}
                showCaption={showCaptions}
                showVietnamese={showVietnamese}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
