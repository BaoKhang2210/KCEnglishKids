import React from 'react';

interface LessonShellProps {
  children: React.ReactNode;
  className?: string;
  stage?: 1 | 2 | 3;
}

/**
 * LessonShell: Single Viewport-Locked Container (100dvh, fallback 100vh)
 * Prevents any outer scroll and enforces strict preschool safe-area constraints.
 */
export const LessonShell: React.FC<LessonShellProps> = ({
  children,
  className = '',
  stage = 1,
}) => {
  const bgGradients = {
    1: 'from-amber-50 via-orange-50/40 to-sky-50/30',
    2: 'from-teal-50 via-sky-50/40 to-emerald-50/30',
    3: 'from-purple-50 via-pink-50/30 to-indigo-50/20',
  };

  return (
    <div
      style={{
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        overscrollBehavior: 'none',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
      className={`w-full bg-gradient-to-br ${bgGradients[stage]} flex flex-col select-none relative ${className}`}
    >
      {children}
    </div>
  );
};
