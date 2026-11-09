import React from 'react';
import { stage2WordStates, type Stage2WordState } from './stage2WordStatusConfig';

const FaceDrawing: React.FC<{ state: Stage2WordState }> = ({ state }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="h-full w-full">
    <circle cx="24" cy="24" r="19" fill="currentColor" opacity="0.16" />
    <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2.5" />
    {state === 'SECURE' && <>
      <path d="M16 21v-2m16 2v-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 27c2.2 4.5 5 6.5 8 6.5s5.8-2 8-6.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </>}
    {state === 'PRACTICE' && <>
      <circle cx="18" cy="20" r="1.8" fill="currentColor" />
      <circle cx="30" cy="20" r="1.8" fill="currentColor" />
      <path d="M17 29c2-2 4.3-3 7-3s5 1 7 3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </>}
    {state === 'REVIEW' && <>
      <circle cx="18" cy="20" r="2" fill="currentColor" />
      <circle cx="30" cy="20" r="2" fill="currentColor" />
      <path d="M18 30h12" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M37 15c0 2-2 3-2 4.5a2 2 0 1 0 4 0C39 18 37 17 37 15Z" fill="currentColor" />
    </>}
    {state === 'NOT_PRACTICED' && <>
      <circle cx="18" cy="20" r="2" fill="currentColor" />
      <circle cx="30" cy="20" r="2" fill="currentColor" />
      <ellipse cx="24" cy="30" rx="2.4" ry="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="37" r="1" fill="currentColor" />
      <circle cx="24" cy="37" r="1" fill="currentColor" />
      <circle cx="30" cy="37" r="1" fill="currentColor" />
    </>}
  </svg>
);

export const Stage2WordFace: React.FC<{ state: Stage2WordState; size?: 'sm' | 'md' | 'lg'; label?: string }> = ({ state, size = 'sm', label }) => {
  const data = stage2WordStates[state];
  const sizeClass = size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8';
  return <span role="img" aria-label={label || data.label} className={`grid shrink-0 place-items-center border-2 ${sizeClass} ${data.faceClass} ${state === 'SECURE' ? 'rounded-full' : state === 'PRACTICE' ? 'rounded-[35%]' : state === 'REVIEW' ? 'rounded-[48%_48%_48%_14%] rotate-[-8deg]' : 'rounded-xl border-dotted'}`}>
    <FaceDrawing state={state} />
  </span>;
};
