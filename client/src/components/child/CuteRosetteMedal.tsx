import { LockKeyhole } from 'lucide-react';
import type { BadgeItem } from '../../data/badges';
import { RewardArtwork } from './RewardArtwork';
import '../../styles/rewards.css';

interface CuteRosetteMedalProps {
  badge: BadgeItem; unlocked: boolean; size?: 'sm' | 'md' | 'lg' | 'xl';
  showRibbons?: boolean; isJiggling?: boolean; className?: string;
}
/** The whole medal is an original illustration, including the enamel rim and ribbons. */
export function CuteRosetteMedal({ badge, unlocked, size = 'md', isJiggling = false, className = '' }: CuteRosetteMedalProps) {
  return (
    <span className={['reward-medal-art', 'reward-medal-art--' + size, unlocked ? 'is-earned' : 'is-locked', isJiggling ? 'is-jiggling' : '', className].join(' ')} data-tier={badge.tier}>
      <RewardArtwork symbol={badge.icon} artKey={badge.id} label={badge.name} className="reward-medal-art__image" />
      {!unlocked && <span className="reward-medal-art__lock" aria-hidden="true"><LockKeyhole size={16} /></span>}
    </span>
  );
}
