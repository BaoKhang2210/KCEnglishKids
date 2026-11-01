import React from 'react';
import type { GameId } from '../core/types';

interface GameIconProps {
  gameId: GameId | string;
  className?: string;
}

export const GameIcon: React.FC<GameIconProps> = ({ gameId, className = 'w-16 h-16' }) => {
  switch (gameId) {
    case 'bubble-pop':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Bong bóng">
          <circle cx="40" cy="40" r="32" fill="url(#bubble-base)" stroke="#BAE6FD" strokeWidth="3" />
          <ellipse cx="28" cy="24" rx="8" ry="4" transform="rotate(-35 28 24)" fill="white" fillOpacity="0.85" />
          <circle cx="48" cy="50" r="2.5" fill="white" fillOpacity="0.6" />
          <defs>
            <radialGradient id="bubble-base" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 28) rotate(48.8) scale(42.5)">
              <stop stopColor="#E0F2FE" stopOpacity="0.85" />
              <stop offset="0.6" stopColor="#38BDF8" stopOpacity="0.45" />
              <stop offset="0.95" stopColor="#818CF8" stopOpacity="0.7" />
              <stop offset="1" stopColor="#C084FC" stopOpacity="0.85" />
            </radialGradient>
          </defs>
        </svg>
      );

    case 'balloon-float':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Bóng bay">
          <ellipse cx="40" cy="34" rx="22" ry="26" fill="url(#balloon-grad)" stroke="#FECDD3" strokeWidth="2.5" />
          <ellipse cx="32" cy="22" rx="5" ry="9" transform="rotate(-25 32 22)" fill="white" fillOpacity="0.65" />
          <polygon points="40,60 36,66 44,66" fill="#F43F5E" />
          <path d="M40 66 Q42 72 38 76 Q35 79 40 82" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" fill="none" />
          <defs>
            <radialGradient id="balloon-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 24) rotate(55) scale(36)">
              <stop stopColor="#FDA4AF" />
              <stop offset="0.7" stopColor="#F43F5E" />
              <stop offset="1" stopColor="#BE123C" />
            </radialGradient>
          </defs>
        </svg>
      );

    case 'tunnel-runner':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Tàu tốc hành đường hầm">
          <rect x="18" y="22" width="44" height="42" rx="14" fill="#0EA5E9" stroke="#E0F2FE" strokeWidth="3" />
          <rect x="25" y="28" width="30" height="16" rx="6" fill="#38BDF8" />
          <circle cx="28" cy="52" r="5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
          <circle cx="52" cy="52" r="5" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1.5" />
          <line x1="10" y1="68" x2="70" y2="68" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" />
          <line x1="20" y1="74" x2="60" y2="74" stroke="#94A3B8" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" />
        </svg>
      );

    case 'prize-wheel':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Vòng quay may mắn">
          <circle cx="40" cy="40" r="30" fill="#38BDF8" stroke="#FEF08A" strokeWidth="4" />
          <path d="M40 40 L40 10 A30 30 0 0 1 66 25 Z" fill="#F43F5E" />
          <path d="M40 40 L66 25 A30 30 0 0 1 66 55 Z" fill="#F59E0B" />
          <path d="M40 40 L66 55 A30 30 0 0 1 40 70 Z" fill="#10B981" />
          <path d="M40 40 L40 70 A30 30 0 0 1 14 55 Z" fill="#8B5CF6" />
          <path d="M40 40 L14 55 A30 30 0 0 1 14 25 Z" fill="#EC4899" />
          <circle cx="40" cy="40" r="8" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
          <polygon points="40,6 36,14 44,14" fill="#FEF08A" stroke="#CA8A04" strokeWidth="1" />
        </svg>
      );

    case 'memory-match':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Thẻ bài ghi nhớ">
          <rect x="14" y="20" width="28" height="38" rx="6" fill="#6366F1" stroke="#C7D2FE" strokeWidth="2.5" transform="rotate(-8 14 20)" />
          <text x="24" y="44" fill="#FEF08A" fontSize="18" fontWeight="bold" transform="rotate(-8 24 44)">★</text>
          <rect x="36" y="20" width="28" height="38" rx="6" fill="#EC4899" stroke="#FCE7F3" strokeWidth="2.5" transform="rotate(8 36 20)" />
          <text x="46" y="44" fill="#FEF08A" fontSize="18" fontWeight="bold" transform="rotate(8 46 44)">★</text>
        </svg>
      );

    case 'koko-says':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Gấu Koko">
          <circle cx="22" cy="24" r="10" fill="#92400E" stroke="#FDE68A" strokeWidth="2" />
          <circle cx="22" cy="24" r="5" fill="#FBBF24" />
          <circle cx="58" cy="24" r="10" fill="#92400E" stroke="#FDE68A" strokeWidth="2" />
          <circle cx="58" cy="24" r="5" fill="#FBBF24" />
          <circle cx="40" cy="44" r="26" fill="#B45309" stroke="#FDE68A" strokeWidth="2.5" />
          <ellipse cx="40" cy="50" rx="14" ry="10" fill="#FDE68A" />
          <ellipse cx="40" cy="46" rx="5" ry="3.5" fill="#451A03" />
          <circle cx="30" cy="38" r="3.5" fill="#451A03" />
          <circle cx="50" cy="38" r="3.5" fill="#451A03" />
        </svg>
      );

    case 'shadow-puzzle':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Bóng bí ẩn">
          <circle cx="40" cy="40" r="30" fill="#1E1B4B" stroke="#818CF8" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle cx="40" cy="30" r="12" fill="#475569" />
          <path d="M22 60 C22 48 30 46 40 46 C50 46 58 48 58 60 Z" fill="#475569" />
          <path d="M46 22 L54 14" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
          <path d="M52 30 L62 28" stroke="#FDE047" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'peek-a-boo':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Cửa ú òa">
          <rect x="20" y="16" width="40" height="52" rx="4" fill="#78350F" stroke="#FDE68A" strokeWidth="2" />
          <rect x="24" y="20" width="16" height="44" rx="2" fill="#D97706" />
          <rect x="42" y="20" width="14" height="44" rx="2" fill="#B45309" />
          <circle cx="36" cy="44" r="2.5" fill="#FEF08A" />
          <circle cx="48" cy="38" r="4" fill="#FEF08A" />
          <circle cx="48" cy="38" r="2" fill="#451A03" />
        </svg>
      );

    case 'feed-the-monsters':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Quái vật ăn kẹo">
          <rect x="18" y="20" width="44" height="46" rx="16" fill="#10B981" stroke="#A7F3D0" strokeWidth="2.5" />
          <circle cx="30" cy="32" r="5" fill="white" />
          <circle cx="30" cy="32" r="2.5" fill="#065F46" />
          <circle cx="50" cy="32" r="5" fill="white" />
          <circle cx="50" cy="32" r="2.5" fill="#065F46" />
          <ellipse cx="40" cy="48" rx="12" ry="8" fill="#064E3B" />
          <polygon points="34,44 37,48 40,44" fill="white" />
          <polygon points="40,44 43,48 46,44" fill="white" />
        </svg>
      );

    case 'mystery-boxes':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Hộp quà bí mật">
          <rect x="20" y="32" width="40" height="34" rx="4" fill="#8B5CF6" stroke="#DDD6FE" strokeWidth="2" />
          <rect x="16" y="24" width="48" height="10" rx="3" fill="#A78BFA" stroke="#DDD6FE" strokeWidth="2" />
          <rect x="37" y="24" width="6" height="42" fill="#FDE047" />
          <path d="M40 24 C34 16 26 18 32 24 Z" fill="#FDE047" />
          <path d="M40 24 C46 16 54 18 48 24 Z" fill="#FDE047" />
        </svg>
      );

    case 'picture-builder':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Mảnh ghép tranh">
          <rect x="18" y="18" width="20" height="20" rx="3" fill="#3B82F6" stroke="#93C5FD" strokeWidth="2" />
          <rect x="42" y="18" width="20" height="20" rx="3" fill="#10B981" stroke="#A7F3D0" strokeWidth="2" />
          <rect x="18" y="42" width="20" height="20" rx="3" fill="#F59E0B" stroke="#FDE68A" strokeWidth="2" />
          <rect x="42" y="42" width="20" height="20" rx="3" fill="#EC4899" stroke="#FBCFE8" strokeWidth="2" />
          <circle cx="40" cy="28" r="4" fill="#3B82F6" />
          <circle cx="28" cy="40" r="4" fill="#F59E0B" />
        </svg>
      );

    case 'kokos-delivery':
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Giỏ quà Koko">
          <ellipse cx="40" cy="54" rx="24" ry="14" fill="#D97706" stroke="#FDE68A" strokeWidth="2" />
          <path d="M22 50 C22 26 58 26 58 50" stroke="#B45309" strokeWidth="4" fill="none" strokeLinecap="round" />
          <circle cx="34" cy="46" r="6" fill="#EF4444" />
          <circle cx="46" cy="46" r="6" fill="#10B981" />
          <circle cx="40" cy="40" r="6" fill="#F59E0B" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Trò chơi">
          <circle cx="40" cy="40" r="28" fill="#6366F1" stroke="#C7D2FE" strokeWidth="3" />
          <polygon points="34,26 54,40 34,54" fill="#FEF08A" />
        </svg>
      );
  }
};
