import React from 'react';
import { Trophy, BookOpen, Volume2, Gamepad2, Star, X } from 'lucide-react';
import { sfx } from '../../../utils/audio';

interface CompletedUnitHubModalProps {
  unitName: string;
  unitNumber: number | string;
  topicIcon?: string;
  onSelectAction: (action: 'vocab' | 'listen' | 'games' | 'quickReview') => void;
  onClose: () => void;
}

export const CompletedUnitHubModal: React.FC<CompletedUnitHubModalProps> = ({
  unitName,
  unitNumber,
  topicIcon = '🎒',
  onSelectAction,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-4xl border-4 border-amber-300 p-6 sm:p-8 max-w-2xl w-full text-center shadow-2xl relative animate-pop-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-1.5 rounded-full text-xs font-black mb-3">
          <Trophy className="w-4 h-4 text-emerald-600" />
          UNIT {unitNumber} • ĐÃ HOÀN THÀNH 100% ✓
        </div>

        <div className="text-5xl mb-2">{topicIcon}</div>
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1">
          {unitName}
        </h3>
        <p className="text-sm font-bold text-slate-500 mb-6 max-w-md mx-auto">
          Xuất sắc lắm bé ơi! Bé có thể tự do luyện tập hoặc thử thách bản thân bất cứ lúc nào!
        </p>

        {/* 4 Large Action Cards in Row / Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          {/* Card 1: Từ vựng */}
          <button
            onClick={() => { sfx.playPop(); onSelectAction('vocab'); }}
            className="p-4 rounded-3xl border-3 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 hover:scale-102 flex flex-col items-center justify-between text-center cursor-pointer transition-all min-h-[160px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl mb-2 text-indigo-700">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Từ vựng</h4>
              <span className="text-[11px] font-bold text-slate-500">Xem lại thẻ từ</span>
            </div>
            <span className="text-xs font-black text-indigo-600 mt-2">Mở ➔</span>
          </button>

          {/* Card 2: Nghe nói */}
          <button
            onClick={() => { sfx.playPop(); onSelectAction('listen'); }}
            className="p-4 rounded-3xl border-3 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/70 hover:scale-102 flex flex-col items-center justify-between text-center cursor-pointer transition-all min-h-[160px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl mb-2 text-emerald-700">
              <Volume2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Nghe nói</h4>
              <span className="text-[11px] font-bold text-slate-500">Luyện câu mẫu</span>
            </div>
            <span className="text-xs font-black text-emerald-600 mt-2">Mở ➔</span>
          </button>

          {/* Card 3: Mini-games */}
          <button
            onClick={() => { sfx.playPop(); onSelectAction('games'); }}
            className="p-4 rounded-3xl border-3 border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 hover:scale-102 flex flex-col items-center justify-between text-center cursor-pointer transition-all min-h-[160px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl mb-2 text-purple-700">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Trò chơi</h4>
              <span className="text-[11px] font-bold text-slate-500">Khu vui chơi</span>
            </div>
            <span className="text-xs font-black text-purple-600 mt-2">Mở ➔</span>
          </button>

          {/* Card 4: Ôn nhanh */}
          <button
            onClick={() => { sfx.playPop(); onSelectAction('quickReview'); }}
            className="p-4 rounded-3xl border-3 border-amber-300 bg-amber-50 hover:bg-amber-100 hover:scale-102 flex flex-col items-center justify-between text-center cursor-pointer transition-all min-h-[160px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-200 flex items-center justify-center text-2xl mb-2 text-amber-800">
              <Star className="w-7 h-7 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">Ôn nhanh</h4>
              <span className="text-[11px] font-bold text-slate-500">5 câu hỏi tốc độ</span>
            </div>
            <span className="text-xs font-black text-amber-800 mt-2">Bắt đầu ➔</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="text-xs sm:text-sm font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
        >
          Đóng cửa sổ
        </button>
      </div>
    </div>
  );
};
