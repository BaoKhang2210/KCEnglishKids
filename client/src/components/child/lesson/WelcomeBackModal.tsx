import React from 'react';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { KokoMascot } from '../KokoMascot';

interface WelcomeBackModalProps {
  stageName: string;
  activityTitle: string;
  wordName?: string;
  onResume: () => void;
  onClose: () => void;
}

export const WelcomeBackModal: React.FC<WelcomeBackModalProps> = ({
  stageName,
  activityTitle,
  wordName,
  onResume,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-4xl border-4 border-indigo-200 p-8 sm:p-10 max-w-md w-full text-center shadow-2xl relative animate-pop-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="flex justify-center mb-4">
          <KokoMascot state="waving" size="lg" interactive={false} />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3.5 py-1 rounded-full text-xs font-black mb-3">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          Tiếp tục bài học dở dang
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-2">
          Chào mừng bé quay lại! 👋
        </h3>

        <p className="text-slate-600 font-bold text-sm sm:text-base mb-6 leading-relaxed">
          Koko vẫn giữ nguyên vị trí ở <strong>{stageName}</strong>: {activityTitle}
          {wordName ? ` (từ "${wordName}")` : ''}. Cùng học tiếp nhé!
        </p>

        <button
          onClick={onResume}
          className="btn-3d-indigo w-full py-4 px-6 rounded-2xl font-black text-white text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
        >
          <span>Tiếp tục học ngay</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
