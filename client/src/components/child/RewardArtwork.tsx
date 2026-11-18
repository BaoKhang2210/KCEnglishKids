import { useState } from 'react';
import { rewardArt } from '../../data/rewardArt';
import { LearningSymbol } from '../common/LearningSymbol';

export function RewardArtwork({ symbol, artKey, label, className = '' }: { symbol: string; artKey?: string; label: string; className?: string }) {
  const [failed, setFailed] = useState('');
  const src = rewardArt(artKey || symbol);
  return src && failed !== src
    ? <img src={src} alt={label} width={256} height={256} decoding="async" draggable={false} onError={() => setFailed(src)} className={`inline-block object-contain ${className}`} />
    : <LearningSymbol symbol={symbol} label={label} className={className} />;
}
