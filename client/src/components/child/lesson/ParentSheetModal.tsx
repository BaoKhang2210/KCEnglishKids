import React from 'react';
import { X, Volume2, Mic, Eye, CheckCircle, RotateCcw } from 'lucide-react';
import type { Vocabulary } from '../../../types';

interface ParentSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonTitle: string;
  vocabulary: Vocabulary[];
  currentStage: 1 | 2 | 3;
  onJumpToStage: (stage: 1 | 2 | 3) => void;
  // Stage 2 Stats
  tprStats?: Record<
    string,
    { firstTry: boolean; hints: number; assisted: boolean; spoken: boolean }
  >;
  // Preference switches
  autoAdvance: boolean;
  onToggleAutoAdvance: (val: boolean) => void;
  kokoVoice: boolean;
  onToggleKokoVoice: (val: boolean) => void;
  subtitles: boolean;
  onToggleSubtitles: (val: boolean) => void;
  muted: boolean;
  onToggleMute: (val: boolean) => void;
}

export const ParentSheetModal: React.FC<ParentSheetModalProps> = ({
  isOpen,
  onClose,
  lessonTitle,
  vocabulary,
  currentStage,
  onJumpToStage,
  tprStats = {},
  autoAdvance,
  onToggleAutoAdvance,
  kokoVoice,
  onToggleKokoVoice,
  subtitles,
  onToggleSubtitles,
  muted,
  onToggleMute,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '85dvh' }}
        className="w-full max-w-2xl bg-white rounded-t-3xl border-t-4 border-amber-300 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 text-base">Cổng Phụ Huynh & Cài Đặt</h3>
            <p className="text-xs text-slate-500 font-bold">{lessonTitle}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng bảng phụ huynh"
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto p-4 space-y-5">
          {/* 1. Stage Jumps */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Chuyển nhanh chặng học
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    onJumpToStage(st);
                    onClose();
                  }}
                  className={`py-2 px-3 rounded-2xl font-black text-xs border-2 flex items-center justify-center gap-1.5 transition-all ${
                    currentStage === st
                      ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span>{st === 1 ? '📖' : st === 2 ? '🎯' : '🎮'}</span>
                  <span>Chặng {st}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Audio & Accessibility Switches */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Tùy chọn tương tác & Giọng nói
            </h4>
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700">
                <span>Tự động chuyển từ (Auto Advance)</span>
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => onToggleAutoAdvance(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700">
                <span>Giọng dẫn dắt Koko</span>
                <input
                  type="checkbox"
                  checked={kokoVoice}
                  onChange={(e) => onToggleKokoVoice(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700">
                <span>Hiển thị phụ đề lời thoại</span>
                <input
                  type="checkbox"
                  checked={subtitles}
                  onChange={(e) => onToggleSubtitles(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-xs font-bold text-slate-700">
                <span>Tắt toàn bộ âm thanh (Mute)</span>
                <input
                  type="checkbox"
                  checked={muted}
                  onChange={(e) => onToggleMute(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500"
                />
              </label>
            </div>
          </div>

          {/* 3. Vocabulary & Learning Progress */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
              Danh sách từ vựng & Phân tích TPR ({vocabulary.length} từ)
            </h4>
            <div className="space-y-2">
              {vocabulary.map((w) => {
                const stat = tprStats[w.english.toLowerCase()];
                return (
                  <div
                    key={w._id || w.english}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      {w.imageUrl ? (
                        <img
                          src={w.imageUrl}
                          alt={w.english}
                          className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-0.5"
                        />
                      ) : (
                        <span className="text-xl">🐾</span>
                      )}
                      <div>
                        <p className="font-black text-xs text-slate-800">{w.english}</p>
                        <p className="text-[11px] font-bold text-slate-500">{w.vietnamese}</p>
                      </div>
                    </div>

                    {/* Stats Pill */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {stat ? (
                        stat.firstTry ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Thuộc ngay ✓
                          </span>
                        ) : stat.assisted ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            Có gợi ý ✨
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                            Đã luyện
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-medium">
                          Chưa bắt đầu
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
