import React, { useState } from 'react';
import { Volume2, Sparkles, Check, HelpCircle } from 'lucide-react';
import type { ActivityQuestion, ActivityOption } from '../../../types';
import { sfx, playWordAudio } from '../../../utils/audio';

interface ColorRecognitionEngineProps {
  question: ActivityQuestion;
  onAnswer: (isCorrect: boolean, optionId: string) => void;
  disabled?: boolean;
}

// Color map for vibrant decorative halos & badges
const COLOR_HEX_MAP: Record<string, { bg: string; border: string; text: string; labelVi: string }> = {
  red: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', labelVi: 'Màu Đỏ' },
  blue: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF', labelVi: 'Màu Xanh Dương' },
  yellow: { bg: '#FEF9C3', border: '#EAB308', text: '#854D0E', labelVi: 'Màu Vàng' },
  green: { bg: '#DCFCE7', border: '#22C55E', text: '#166534', labelVi: 'Màu Xanh Lá' },
  orange: { bg: '#FFEDD5', border: '#F97316', text: '#9A3412', labelVi: 'Màu Cam' },
  pink: { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D', labelVi: 'Màu Hồng' },
  purple: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8', labelVi: 'Màu Tím' },
  brown: { bg: '#EFEBE9', border: '#8D6E63', text: '#4E342E', labelVi: 'Màu Nâu' },
  black: { bg: '#F1F5F9', border: '#0F172A', text: '#0F172A', labelVi: 'Màu Đen' },
  white: { bg: '#FFFFFF', border: '#CBD5E1', text: '#334155', labelVi: 'Màu Trắng' }
};

export const ColorRecognitionEngine: React.FC<ColorRecognitionEngineProps> = ({
  question,
  onAnswer,
  disabled
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  const targetColorRaw = (question.metadata?.targetColor || question.correctAnswer || question.promptText || '').toLowerCase().trim();
  // Extract color name cleanly if prompt is like "Which one is red?"
  const targetColorMatch = targetColorRaw.match(/(red|blue|yellow|green|orange|pink|purple|brown|black|white)/i);
  const targetColorKey = targetColorMatch ? targetColorMatch[1].toLowerCase() : targetColorRaw;
  const colorTheme = COLOR_HEX_MAP[targetColorKey] || { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', labelVi: targetColorKey };

  const handlePlayAudio = () => {
    sfx.playPop();
    playWordAudio(question.promptText || targetColorKey, question.promptAudioUrl);
  };

  const handleSelectOption = (opt: ActivityOption) => {
    if (disabled || selectedOptionId !== null) return;
    setSelectedOptionId(opt.id);
    onAnswer(opt.isCorrect, opt.id);

    setTimeout(() => {
      setSelectedOptionId(null);
    }, 1100);
  };

  const optionCount = question.options.length;
  const gridColsClass = optionCount <= 2 ? 'grid-cols-2 max-w-3xl' : optionCount === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-5xl' : 'grid-cols-2 sm:grid-cols-4 max-w-6xl';

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto text-center select-none animate-pop-in my-auto h-full max-h-full">
      {/* Playful Banner */}
      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-amber-900/60 text-amber-200 font-black px-5 py-1.5 rounded-full text-xs sm:text-sm md:text-base mb-3 sm:mb-4 border border-amber-500/30 shadow-md">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
        Bé hãy quan sát và chọn đúng đồ vật có màu sắc nhé!
      </span>

      {/* Prominent Speaker & Color Target Pill */}
      <div className="flex flex-col items-center mb-3 sm:mb-5">
        <button
          onClick={handlePlayAudio}
          className="btn-kid w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-rose-500 via-amber-500 to-emerald-500 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl cursor-pointer transition-all ring-6 sm:ring-8 ring-amber-400/40"
          title="Bấm để nghe lại tên màu"
        >
          <Volume2 className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14" />
        </button>

        <div
          className="mt-2.5 sm:mt-3 inline-flex items-center gap-2 sm:gap-3 px-5 py-1.5 rounded-2xl border-2 shadow-md bg-[#1f1b16]"
          style={{ borderColor: colorTheme.border }}
        >
          <span
            className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-white/40 shadow-inner"
            style={{ backgroundColor: colorTheme.border }}
          />
          <span
            className="text-xl sm:text-2xl font-black capitalize"
            style={{ color: colorTheme.border }}
          >
            {targetColorKey}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-300">
            ({colorTheme.labelVi})
          </span>
        </div>
      </div>

      {/* Options Grid: Progressive Difficulty (2 -> 3 -> 4 choices) */}
      <div className={`grid ${gridColsClass} gap-3 sm:gap-6 w-full mx-auto px-2 sm:px-4 max-h-[52vh]`}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let cardStyle = 'border-[#382f25] bg-[#221c16] hover:border-amber-400 shadow-xl hover:scale-102';

          if (isSelected) {
            cardStyle = opt.isCorrect
              ? 'border-emerald-400 bg-emerald-950/80 ring-6 ring-emerald-400 scale-104 shadow-2xl animate-soft-bounce'
              : 'border-rose-400 bg-rose-950/80 ring-6 ring-rose-400 animate-gentle-wobble';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid rounded-2xl sm:rounded-3xl border-3 p-3 sm:p-5 flex flex-col items-center justify-center cursor-pointer transition-all relative group overflow-hidden ${cardStyle}`}
            >
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-2 flex items-center justify-center p-2 rounded-2xl bg-[#181410] group-hover:bg-[#2b241c] transition-colors">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <HelpCircle className="w-12 h-12 text-slate-500" />
                )}
              </div>

              <span className="font-black text-lg sm:text-2xl text-amber-100 capitalize leading-tight">
                {opt.text}
              </span>

              {opt.vietnameseText && (
                <span className="text-xs sm:text-sm font-bold text-slate-400 mt-0.5">
                  {opt.vietnameseText}
                </span>
              )}

              {/* Checkmark overlay on correct */}
              {isSelected && opt.isCorrect && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-pop-in">
                  <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
