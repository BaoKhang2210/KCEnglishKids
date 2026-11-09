import React, { useState } from 'react';

export const ANIMAL_AVATARS: Record<string, { emoji: string; symbolUrl: string; bg: string }> = {
  lion: { emoji: '🦁', symbolUrl: '/images/symbols/1f981.svg', bg: 'bg-amber-100 text-amber-950 border-amber-300' },
  panda: { emoji: '🐼', symbolUrl: '/images/symbols/1f43c.svg', bg: 'bg-teal-100 text-teal-950 border-teal-300' },
  rabbit: { emoji: '🐰', symbolUrl: '/images/symbols/1f430.svg', bg: 'bg-pink-100 text-pink-950 border-pink-300' },
  bear: { emoji: '🐻', symbolUrl: '/images/symbols/1f43b.svg', bg: 'bg-amber-100 text-amber-950 border-amber-300' },
  fox: { emoji: '🦊', symbolUrl: '/images/symbols/1f98a.svg', bg: 'bg-orange-100 text-orange-950 border-orange-300' },
  koala: { emoji: '🐨', symbolUrl: '/images/symbols/1f43b.svg', bg: 'bg-slate-100 text-slate-900 border-slate-300' },
  cat: { emoji: '🐱', symbolUrl: '/images/symbols/1f431.svg', bg: 'bg-purple-100 text-purple-950 border-purple-300' },
  elephant: { emoji: '🐘', symbolUrl: '/images/symbols/1f418.svg', bg: 'bg-sky-100 text-sky-950 border-sky-300' },
  tiger: { emoji: '🐯', symbolUrl: '/images/symbols/1f42f.svg', bg: 'bg-orange-100 text-orange-950 border-orange-300' },
  dog: { emoji: '🐶', symbolUrl: '/images/rewards/fluent-3d/dog_face_3d.png', bg: 'bg-yellow-100 text-yellow-950 border-yellow-300' },
  monkey: { emoji: '🐒', symbolUrl: '/images/symbols/1f412.svg', bg: 'bg-amber-100 text-amber-950 border-amber-300' },
};

export const getStudentEmoji = (avatarKey?: string): string => {
  if (!avatarKey) return '🦁';
  const norm = String(avatarKey).toLowerCase().trim();
  if (ANIMAL_AVATARS[norm]) return ANIMAL_AVATARS[norm].emoji;
  // If it's already an emoji character, return it directly
  if (/\p{Emoji}/u.test(avatarKey)) return avatarKey;
  return '🦁';
};

export const getStudentAvatarUrl = (student?: { avatar?: string; avatarUrl?: string } | null): string => {
  if (!student) return '/images/symbols/1f981.svg';
  if (student.avatarUrl && typeof student.avatarUrl === 'string' && student.avatarUrl.trim().length > 0) {
    return student.avatarUrl;
  }
  const norm = String(student.avatar || 'lion').toLowerCase().trim();
  return ANIMAL_AVATARS[norm]?.symbolUrl || '/images/symbols/1f981.svg';
};

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export interface StudentAvatarProps {
  student?: {
    name?: string;
    avatar?: string;
    avatarUrl?: string;
  } | null;
  name?: string;
  avatar?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  rounded?: string;
  showBorder?: boolean;
}

const SIZE_MAP: Record<string, { box: string; img: string; text: string }> = {
  xs: { box: 'h-6 w-6', img: 'h-4 w-4', text: 'text-[11px]' },
  sm: { box: 'h-8 w-8', img: 'h-5 w-5', text: 'text-sm' },
  md: { box: 'h-10 w-10', img: 'h-7 w-7', text: 'text-lg' },
  lg: { box: 'h-12 w-12', img: 'h-8 w-8', text: 'text-2xl' },
  xl: { box: 'h-16 w-16', img: 'h-11 w-11', text: 'text-3xl' },
  '2xl': { box: 'h-20 w-20', img: 'h-14 w-14', text: 'text-4xl' },
};

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  student,
  name: propName,
  avatar: propAvatar,
  avatarUrl: propAvatarUrl,
  size = 'md',
  className = '',
  rounded = 'rounded-2xl',
  showBorder = true,
}) => {
  const [imgError, setImgError] = useState(false);

  const effectiveName = student?.name || propName || '';
  const effectiveAvatar = student?.avatar || propAvatar || 'lion';
  const effectiveAvatarUrl = student?.avatarUrl || propAvatarUrl || getStudentAvatarUrl({ avatar: effectiveAvatar });

  const sizeCfg = SIZE_MAP[size] || SIZE_MAP.md;
  const avatarMeta = ANIMAL_AVATARS[String(effectiveAvatar).toLowerCase().trim()] || ANIMAL_AVATARS.lion;
  const emoji = getStudentEmoji(effectiveAvatar);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden select-none transition-transform ${
        sizeCfg.box
      } ${rounded} ${avatarMeta.bg} ${showBorder ? 'border' : ''} shadow-2xs ${className}`}
      title={effectiveName || emoji}
    >
      {!imgError && effectiveAvatarUrl ? (
        <img
          src={effectiveAvatarUrl}
          alt={effectiveName || emoji}
          onError={() => setImgError(true)}
          className={`object-contain pointer-events-none ${sizeCfg.img}`}
          loading="lazy"
        />
      ) : (
        <span className={`leading-none pointer-events-none ${sizeCfg.text}`} role="img" aria-label={effectiveAvatar}>
          {emoji || initials(effectiveName)}
        </span>
      )}
    </div>
  );
};

