import React from 'react';
import { STAGE_CONFIG } from '../../../config/kcStageConfig';

interface StageStepperProps {
  currentStage: 1 | 2 | 3;
  completedStages: {
    1: boolean;
    2: boolean;
    3: boolean;
  };
  onSelectStage?: (stage: 1 | 2 | 3) => void;
  interactive?: boolean;
}

/**
 * StageStepper: Sized >= 56px in height with >= 32px icons.
 * Allows tapping on completed stages for review, locks unreached stages.
 */
export const StageStepper: React.FC<StageStepperProps> = ({
  currentStage,
  completedStages,
  onSelectStage,
  interactive = STAGE_CONFIG.STEPPER_INTERACTIVE,
}) => {
  const stages: Array<{ id: 1 | 2 | 3; label: string; icon: string }> = [
    { id: 1, label: 'Chặng 1: Khám phá', icon: '📖' },
    { id: 2, label: 'Chặng 2: Luyện tập', icon: '🎯' },
    { id: 3, label: 'Chặng 3: Trò chơi', icon: '🎮' },
  ];

  return (
    <nav
      aria-label="Tiến trình 3 chặng bài học"
      style={{ height: '56px', minHeight: '56px' }}
      className="flex items-center gap-2 sm:gap-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border-2 border-amber-300 shadow-sm"
    >
      {stages.map((st, idx) => {
        const isCurrent = currentStage === st.id;
        const isDone = completedStages[st.id];
        // Allow clicking current stage or any completed stage (review mode)
        const canClick = interactive && (isCurrent || isDone);

        return (
          <React.Fragment key={st.id}>
            {idx > 0 && (
              <div
                className={`w-3 sm:w-6 h-1 rounded-full transition-colors ${
                  completedStages[(st.id - 1) as 1 | 2]
                    ? 'bg-emerald-400'
                    : 'bg-slate-200'
                }`}
              />
            )}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onSelectStage?.(st.id)}
              aria-label={`Chặng ${st.id} trên 3: ${st.label}. ${
                isDone ? 'Đã hoàn thành. Chạm để ôn lại' : isCurrent ? 'Đang học' : 'Chưa mở'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              style={{ minHeight: '44px', minWidth: '44px' }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black transition-all ${
                isCurrent
                  ? 'bg-amber-400 text-amber-950 shadow-md ring-3 ring-amber-300 scale-105 cursor-pointer'
                  : isDone
                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer active:scale-95 shadow-xs'
                  : 'bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed'
              }`}
            >
              <span style={{ fontSize: '24px' }} className="leading-none select-none">
                {st.icon}
              </span>

              {/* Current stage expands with readable label (>=16px) */}
              {isCurrent ? (
                <span className="text-sm sm:text-base font-black whitespace-nowrap">
                  Chặng {st.id}
                </span>
              ) : isDone ? (
                <span className="text-xs text-emerald-700 font-black">✓</span>
              ) : (
                <span className="text-xs opacity-70">🔒</span>
              )}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
