import React from 'react';
import { Volume2 } from 'lucide-react';
import { sfx } from '../../utils/audio';

interface GamePromptProps {
  text: React.ReactNode;
  subtext?: React.ReactNode;
  onSpeak?: () => void;
  rightSlot?: React.ReactNode;
}

export const GamePrompt: React.FC<GamePromptProps> = ({ text, subtext, onSpeak, rightSlot }) => (
  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 max-w-[96%]">
    {onSpeak ? (
      <button
        type="button"
        onClick={() => {
          sfx.playPop();
          onSpeak();
        }}
        className="inline-flex items-center gap-2 bg-slate-950/80 hover:bg-slate-900/90 active:scale-95 backdrop-blur-md px-4 py-1.5 rounded-full border-2 border-white/25 text-white font-black text-sm sm:text-base text-center shadow-lg transition-all cursor-pointer"
      >
        <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 shrink-0" />
        <span className="leading-snug">{text}</span>
        {subtext && (
          <span className="hidden md:inline text-xs font-bold text-indigo-200/90 border-l border-white/20 pl-2">
            {subtext}
          </span>
        )}
      </button>
    ) : (
      <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border-2 border-white/20 text-white font-black text-sm sm:text-base text-center shadow-lg pointer-events-none">
        <span className="leading-snug">{text}</span>
        {subtext && (
          <span className="text-[11px] sm:text-xs font-bold text-indigo-200/90 sm:border-l sm:border-white/20 sm:pl-2">
            {subtext}
          </span>
        )}
      </div>
    )}
    {rightSlot}
  </div>
);
