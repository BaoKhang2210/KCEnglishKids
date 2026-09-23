import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { playWordAudio } from '../../utils/audio';
import { SoundWaves } from './SoundWaves';

interface AudioButtonProps {
  word: string;
  audioUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AudioButton: React.FC<AudioButtonProps> = ({
  word,
  audioUrl,
  size = 'md',
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      await playWordAudio(word, audioUrl);
    } catch (err) {
      console.warn('Audio play error:', err);
    } finally {
      setIsPlaying(false);
    }
  };

  const sizeClasses = {
    sm: 'w-11 h-11 text-sm',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 text-xl'
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Sound Ripple Animation Behind Button when playing */}
      {isPlaying && (
        <div className="absolute inset-0 -m-3 pointer-events-none flex items-center justify-center">
          <div className="absolute w-full h-full rounded-full bg-sky-400/30 animate-ping" />
          <div className="absolute w-full h-full rounded-full bg-amber-400/20 animate-pulse" />
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={isPlaying}
        aria-label={`Nghe phát âm từ ${word}`}
        className={`btn-3d-sky rounded-full text-white flex items-center justify-center cursor-pointer select-none transition-all active:scale-95 ${
          sizeClasses[size]
        } ${isPlaying ? 'ring-4 ring-amber-300 ring-offset-2 scale-105' : 'hover:scale-105'} ${className}`}
      >
        {isPlaying ? (
          <SoundWaves isPlaying={isPlaying} color="#ffffff" size={size} />
        ) : (
          <Volume2 className={`${iconSizes[size]} transition-transform duration-200`} />
        )}
      </button>
    </div>
  );
};

