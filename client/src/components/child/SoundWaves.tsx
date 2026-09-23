import React from 'react';

interface SoundWavesProps {
  isPlaying: boolean;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SoundWaves: React.FC<SoundWavesProps> = ({
  isPlaying,
  color = '#0284C7',
  size = 'md'
}) => {
  if (!isPlaying) return null;

  const barHeights = {
    sm: 'h-4',
    md: 'h-7',
    lg: 'h-10'
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 select-none pointer-events-none">
      <span
        className={`w-1.5 ${barHeights[size]} rounded-full animate-pulse`}
        style={{ backgroundColor: color, animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <span
        className={`w-1.5 ${barHeights[size]} rounded-full animate-pulse`}
        style={{ backgroundColor: color, animationDelay: '150ms', animationDuration: '450ms' }}
      />
      <span
        className={`w-1.5 ${barHeights[size]} rounded-full animate-pulse`}
        style={{ backgroundColor: color, animationDelay: '300ms', animationDuration: '700ms' }}
      />
      <span
        className={`w-1.5 ${barHeights[size]} rounded-full animate-pulse`}
        style={{ backgroundColor: color, animationDelay: '450ms', animationDuration: '500ms' }}
      />
    </div>
  );
};
