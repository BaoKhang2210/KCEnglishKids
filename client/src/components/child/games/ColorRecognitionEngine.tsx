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
  const gridColsClass = optionCount <= 2 ? 'grid-cols-2 max-w-md' : optionCount === 3 ? 'grid-cols-1 sm:grid-cols-3 max-w-2xl' : 'grid-cols-2 sm:grid-cols-4 max-w-3xl';

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto text-center animate-pop-in">
      {/* Playful Banner */}
      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 via-rose-100 to-sky-100 text-slate-800 font-black px-4 py-1.5 rounded-full text-xs sm:text-sm mb-4 border border-amber-300 shadow-xs animate-pulse">
        <Sparkles className="w-4 h-4 text-amber-600" />
        Bé hãy quan sát và chọn đúng đồ vật có màu sắc nhé!
      </span>

      {/* Prominent Speaker & Color Target Pill */}
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={handlePlayAudio}
          className="btn-kid w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-rose-400 via-amber-400 to-emerald-400 hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-xl cursor-pointer transition-all ring-6 ring-amber-200/70"
          title="Bấm để nghe lại tên màu"
        >
          <Volume2 className="w-12 h-12 sm:w-14 sm:h-14" />
        </button>

        <div className="mt-3.5 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-2xl border-2 shadow-xs bg-white" style={{ borderColor: colorTheme.border }}>
          <span className="w-4 h-4 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: colorTheme.border }} />
          <span className="text-xl sm:text-2xl font-black capitalize" style={{ color: colorTheme.text }}>
            {targetColorKey}
          </span>
          <span className="text-xs font-extrabold text-slate-400">
            ({colorTheme.labelVi})
          </span>
        </div>
      </div>

      {/* Options Grid: Progressive Difficulty (2 -> 3 -> 4 choices) */}
      <div className={`grid ${gridColsClass} gap-4 sm:gap-5 w-full mx-auto`}>
        {question.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          let cardStyle = 'border-slate-200 bg-white hover:border-amber-400 shadow-md hover:shadow-lg hover:scale-103';

          if (isSelected) {
            cardStyle = opt.isCorrect
              ? 'border-emerald-500 bg-emerald-50 ring-4 ring-emerald-300 scale-105 shadow-xl animate-soft-bounce'
              : 'border-rose-500 bg-rose-50 ring-4 ring-rose-300 animate-gentle-wobble';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt)}
              disabled={disabled || selectedOptionId !== null}
              className={`btn-kid rounded-3xl border-4 p-4 flex flex-col items-center justify-center cursor-pointer transition-all relative group overflow-hidden ${cardStyle}`}
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 mb-2 flex items-center justify-center p-2 rounded-2xl bg-slate-50 group-hover:bg-amber-50/50 transition-colors">
                {opt.imageUrl ? (
                  <img
                    src={opt.imageUrl}
                    alt={opt.text}
                    className="w-full h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <HelpCircle className="w-16 h-16 text-slate-300" />
                )}
              </div>

              <span className="font-black text-base sm:text-lg text-slate-800 capitalize leading-tight">
                {opt.text}
              </span>

              {opt.vietnameseText && (
                <span className="text-xs font-bold text-slate-400 mt-0.5">
                  {opt.vietnameseText}
                </span>
              )}

              {/* Checkmark overlay on correct */}
              {isSelected && opt.isCorrect && (
                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md animate-pop-in">
                  <Check className="w-5 h-5 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
