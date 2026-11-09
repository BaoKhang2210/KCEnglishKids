import React from 'react';
import { ChildHeader } from '../child/ChildHeader';
import { ChildBottomNav } from '../child/ChildBottomNav';
import type { ChildStreakData } from '../../types';

interface ScreenShellProps {
  children: React.ReactNode;
  titleBar?: React.ReactNode;
  actionBar?: React.ReactNode;
  totalStars?: number;
  completedCount?: number;
  activeTab?: string;
  streakData?: ChildStreakData | null;
  onStreakUpdate?: (updated: ChildStreakData) => void;
  onTabChange?: (tab: string) => void;
  className?: string;
  hideBottomNav?: boolean;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  children,
  titleBar,
  actionBar,
  totalStars = 0,
  completedCount = 0,
  activeTab = 'path',
  streakData,
  onStreakUpdate,
  onTabChange,
  className = '',
  hideBottomNav = false
}) => {
  return (
    <div className={`h-dvh w-full flex flex-col overflow-hidden bg-[#fffaf0] select-none ${className}`}>
      {/* 1. Slim Fixed ChildHeader (Section A2: shrink-0) */}
      <div className="shrink-0 z-30">
        <ChildHeader
          totalStars={totalStars}
          completedCount={completedCount}
          activeTab={activeTab}
          streakData={streakData}
          onStreakUpdate={onStreakUpdate}
        />
      </div>

      {/* 2. Main Viewport Box (Flex-1 min-h-0, zero scroll) */}
      <main className="flex-1 min-h-0 w-full max-w-none px-4 sm:px-8 py-1.5 flex flex-col gap-1.5 overflow-hidden">
        {/* Title Bar (shrink-0, compact 1 row) */}
        {titleBar && (
          <div className="shrink-0 w-full z-20">
            {titleBar}
          </div>
        )}

        {/* Content Body: The ONLY area that expands & fits child items */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">
          {children}
        </div>

        {/* Action Bar (shrink-0, h-[3.8rem] max) */}
        {actionBar && (
          <div className="shrink-0 w-full z-20">
            {actionBar}
          </div>
        )}
      </main>

      {/* 3. In-flow Bottom Nav for tablet/mobile (Section A2: shrink-0, not fixed) */}
      {!hideBottomNav && (
        <div className="shrink-0 xl:hidden z-30">
          <ChildBottomNav
            totalStars={totalStars}
            completedCount={completedCount}
            activeTab={activeTab}
            onTabChange={onTabChange || (() => {})}
          />
        </div>
      )}
    </div>
  );
};
