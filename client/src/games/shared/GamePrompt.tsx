import React from 'react';

interface GamePromptProps {
  text: React.ReactNode;
}

export const GamePrompt: React.FC<GamePromptProps> = ({ text }) => (
  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[90%]">
    <div className="bg-slate-950/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-white font-black text-sm sm:text-base text-center shadow-lg">
      {text}
    </div>
  </div>
);
