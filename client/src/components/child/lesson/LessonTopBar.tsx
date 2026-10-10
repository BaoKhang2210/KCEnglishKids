import React from 'react';
import { ArrowLeft, Home, Shield } from 'lucide-react';
import { StageStepper } from './StageStepper';
import { STAGE_CONFIG } from '../../../config/kcStageConfig';

interface LessonTopBarProps {
  currentStage: 1 | 2 | 3;
  completedStages: {
    1: boolean;
    2: boolean;
    3: boolean;
  };
  lessonTitle?: string;
  onBack: () => void;
  onHome: () => void;
  onOpenParentSheet: () => void;
  onSelectStage?: (stage: 1 | 2 | 3) => void;
}

/**
 * LessonTopBar: Unified Header across all Stages & Game Stages.
 * Height: clamp(60px, 9dvh, 72px)
 * Buttons: Back & Home >= 56px, Stepper >= 56px.
 */
export const LessonTopBar: React.FC<LessonTopBarProps> = ({
  currentStage,
  completedStages,
  lessonTitle = 'Bài học tiếng Anh',
  onBack,
  onHome,
  onOpenParentSheet,
  onSelectStage,
}) => {
  return (
    <header
      style={{
        height: STAGE_CONFIG.SIZES.TOPBAR_HEIGHT,
        minHeight: '60px',
        maxHeight: '72px',
      }}
      className="flex-shrink-0 w-full bg-white/95 backdrop-blur-md border-b-3 border-amber-300 px-3 sm:px-6 flex items-center justify-between z-30 select-none shadow-xs"
    >
      {/* ── Left Navigation: Back (←) and Home (🏠) Buttons (>= 56px) ── */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Back button */}
        <button
          onClick={onBack}
          type="button"
          aria-label="Quay lại"
          style={{ width: '56px', height: '56px' }}
          className="rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-slate-800 cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <ArrowLeft className="w-7 h-7 stroke-[2.8]" />
        </button>

        {/* Home button (Available on every stage) */}
        <button
          onClick={onHome}
          type="button"
          aria-label="Về trang chủ"
          style={{ width: '56px', height: '56px' }}
          className="rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 cursor-pointer active:scale-95 transition-all shadow-sm"
        >
          <Home className="w-7 h-7 stroke-[2.6]" />
        </button>

        {/* Lesson title (Only visible on >=1280px) */}
        <span className="hidden xl:inline-block max-w-[220px] truncate font-black text-slate-700 text-sm pl-1">
          {lessonTitle}
        </span>
      </div>

      {/* ── Center: StageStepper (>=56px height) ── */}
      <div className="flex-1 flex justify-center px-1 sm:px-4">
        <StageStepper
          currentStage={currentStage}
          completedStages={completedStages}
          onSelectStage={onSelectStage}
        />
      </div>

      {/* ── Right: Parent Portal Button (>= 48px) ── */}
      <div className="flex items-center flex-shrink-0">
        <button
          onClick={onOpenParentSheet}
          type="button"
          aria-label="Cổng phụ huynh và cài đặt bài học"
          style={{ minHeight: '48px', minWidth: '48px' }}
          className="rounded-2xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 px-3 py-1.5 flex items-center gap-1.5 text-slate-700 cursor-pointer active:scale-95 transition-all shadow-xs"
        >
          <Shield className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="font-black text-xs hidden md:inline">Phụ huynh</span>
        </button>
      </div>
    </header>
  );
};
