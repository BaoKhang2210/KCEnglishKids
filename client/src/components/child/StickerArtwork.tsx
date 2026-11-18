import type { StickerItem } from '../../data/stickers';
import { LockKeyhole, Sparkles } from 'lucide-react';
import { RewardArtwork } from './RewardArtwork';
import '../../styles/rewards.css';

/** Shared decal rendering for the album, showcase and chest reveal. */
export function StickerArtwork({ sticker, unlocked, size = 'md', playful = false }: {
  sticker: StickerItem; unlocked: boolean; size?: 'sm' | 'md' | 'lg' | 'xl'; playful?: boolean;
}) {
  return (
    <span className={`reward-decal reward-decal--${size} ${unlocked ? '' : 'reward-decal--locked'} ${playful ? 'reward-decal--playful' : ''}`} data-rarity={sticker.rarity}>
      <span className="reward-decal__mat" aria-hidden="true" />
      <span className="reward-decal__orbit" aria-hidden="true"><Sparkles size={16} /></span>
      <RewardArtwork symbol={sticker.icon} label={unlocked ? sticker.name : 'Sticker đang chờ khám phá'} className="reward-decal__image" />
      {!unlocked && <span className="reward-decal__lock"><LockKeyhole size={18} /></span>}
      {unlocked && <span className="reward-decal__peel" aria-hidden="true" />}
    </span>
  );
}
