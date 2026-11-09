import React from 'react';

/** Small YouTube brand mark: lucide has no brand icon, so draw the play badge inline. */
export const YouTubeMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    <path
      fill="#FF0000"
      d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8Z"
    />
    <path fill="#fff" d="M9.6 15.6V8.4L15.8 12l-6.2 3.6Z" />
  </svg>
);

interface YouTubeBadgeProps {
  /** `md` matches the library cards, `sm` fits lesson rows and headers. */
  size?: 'sm' | 'md';
  className?: string;
}

export const YouTubeBadge: React.FC<YouTubeBadgeProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`inline-flex w-fit items-center rounded-full border-rose-200 bg-white font-black text-rose-600 ${
      size === 'sm'
        ? `gap-1 border px-2 py-0.5 text-[11px] ${className}`
        : `gap-1.5 border-2 px-3 py-1 text-sm ${className}`
    }`}
  >
    <YouTubeMark className={size === 'sm' ? 'h-3.5 w-3.5 shrink-0' : 'h-4 w-4 shrink-0'} />
    YouTube
  </span>
);
