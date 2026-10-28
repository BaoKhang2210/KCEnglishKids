import { useState } from 'react';
import { symbolArt } from '../../utils/learningArt';

/** Locally packaged artwork; retain the original symbol when the image is unavailable. */
export function LearningSymbol({ symbol, className = '', label = '' }: { symbol: string; className?: string; label?: string }) {
  const [failedUrl, setFailedUrl] = useState('');
  const src = symbolArt(symbol);
  if (!src || failedUrl === src) return <span className={className} aria-label={label || undefined}>{symbol}</span>;
  return <img src={src} alt={label} draggable={false} onError={() => setFailedUrl(src)} className={`inline-block object-contain ${className}`} />;
}
