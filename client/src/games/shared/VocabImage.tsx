import React, { useState } from 'react';
import type { Vocabulary } from '../../types';
import { isTransparentImage } from '../core/targetSelector';
import { wordArt } from '../../utils/learningArt';

interface VocabImageProps {
  vocab: Vocabulary;
  silhouette?: boolean;
  className?: string;
  alt?: string;
}

export const VocabImage: React.FC<VocabImageProps> = ({
  vocab,
  silhouette = false,
  className = '',
  alt,
}) => {
  const [failedUrl, setFailedUrl] = useState('');
  const src = !vocab.imageUrl || vocab.imageUrl.startsWith('data:image/svg+xml') ? wordArt(vocab.english)?.url || vocab.imageUrl : vocab.imageUrl;
  if (!src || failedUrl === src) {
    return (
      <span className={`inline-flex items-center justify-center text-3xl ${className}`} aria-hidden>
        {silhouette ? '⬛' : '🌟'}
      </span>
    );
  }

  return (
    <img
      src={src}
      onError={() => setFailedUrl(src)}
      alt={alt ?? vocab.english}
      draggable={false}
      className={`max-w-full max-h-full object-contain pointer-events-none ${className}`}
      style={
        silhouette
          ? {
              filter: isTransparentImage(vocab)
                ? 'brightness(0) drop-shadow(0 4px 6px rgba(0,0,0,0.2))'
                : 'brightness(0) contrast(2)',
            }
          : { filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))' }
      }
    />
  );
};
