import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import type { StickerItem } from '../../data/stickers';
import { sfx } from '../../utils/audio';
import { StickerArtwork } from './StickerArtwork';

// §1.3.3 — playful onomatopoeia per sticker: tap an unlocked sticker to hear it
const STICKER_CRIES: Record<string, { text: string; pitch: number; rate: number }> = {
  '🦁': { text: 'Roar! Roar!', pitch: 0.3, rate: 0.65 },
  '🐯': { text: 'Grrrow! Grrrow!', pitch: 0.3, rate: 0.6 },
  '🐼': { text: 'Groowl, groowl...', pitch: 0.4, rate: 0.55 },
  '🐬': { text: 'Eee! Eee! Eee!', pitch: 1.9, rate: 1.5 },
  '🦄': { text: 'Neigh! Neigh!', pitch: 1.4, rate: 0.9 },
  '🦖': { text: 'Rooooar!', pitch: 0.2, rate: 0.5 },
  '⭐': { text: 'Twinkle, twinkle!', pitch: 1.8, rate: 1.1 },
  '🍎': { text: 'Crunch, crunch!', pitch: 1.1, rate: 0.9 },
  '🍓': { text: 'Yummy, yummy!', pitch: 1.6, rate: 1.1 },
  '🎈': { text: 'Pop! Pop! Pop!', pitch: 1.7, rate: 1.3 },
  '🚀': { text: 'Whoosh!', pitch: 0.9, rate: 1.2 },
  '🏆': { text: 'Hooray! Hooray!', pitch: 1.3, rate: 1.0 },
  '🌈': { text: 'Wow, so pretty!', pitch: 1.5, rate: 0.95 },
  '🎨': { text: 'Swish, swish, paint!', pitch: 1.2, rate: 1.0 },
  '👑': { text: 'Ta-da!', pitch: 1.3, rate: 0.9 }
};

interface CuteStickerCardProps {
  sticker: StickerItem; isUnlocked: boolean; onClick?: () => void;
  size?: 'sm' | 'md' | 'lg'; className?: string;
}
const rarityLabels = { common: 'Thường', rare: 'Hiếm', epic: 'Kỳ diệu', legendary: 'Huyền thoại' };

export function CuteStickerCard({ sticker, isUnlocked, onClick, size = 'md', className = '' }: CuteStickerCardProps) {
  const reducedMotion = useReducedMotion();
  const [isJiggly, setIsJiggly] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const handleCardTap = () => {
    if (isUnlocked) {
      sfx.playPop();
      setIsJiggly(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIsJiggly(false), 650);
      const cry = STICKER_CRIES[sticker.icon];
      if (cry && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cry.text);
        utter.lang = 'en-US'; utter.pitch = cry.pitch; utter.rate = cry.rate;
        window.speechSynthesis.speak(utter);
      }
    } else sfx.playPop();
    onClick?.();
  };
  return (
    <motion.button type="button" onClick={handleCardTap} className={'reward-sticker-card ' + className}
      data-locked={!isUnlocked} aria-label={isUnlocked ? sticker.name : 'Sticker chưa mở: ' + sticker.name}
      whileHover={reducedMotion ? undefined : { y: -4, rotate: -1 }}
      whileTap={reducedMotion ? undefined : { scale: .96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}>
      <StickerArtwork sticker={sticker} unlocked={isUnlocked} size={size} playful={isJiggly && !reducedMotion} />
      <span className="reward-sticker-card__name">{isUnlocked ? sticker.name : 'Chờ bé khám phá'}</span>
      <span className="reward-sticker-card__description">{isUnlocked ? sticker.desc : 'Hoàn thành Unit, mở rương nhận quà.'}</span>
      <span className="reward-rarity" data-rarity={isUnlocked ? sticker.rarity : undefined}>
        <Sparkles size={11} />{isUnlocked ? rarityLabels[sticker.rarity] : 'Chưa mở khóa'}
      </span>
    </motion.button>
  );
}
