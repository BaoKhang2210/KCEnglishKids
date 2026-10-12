import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Lock, Star, Sparkles } from 'lucide-react';
import { sfx } from '../../utils/audio';
import type { RewardSummary, RewardChest } from '../../types';
import { ALL_STICKERS } from '../../data/stickers';

/**
 * Màn 1 (§1.2.13) — Kệ rương: every unit is a chest with 3 visual states:
 *  - LOCKED:  unit not completed yet → gray chest + lesson progress
 *  - GRANTED: unit completed, chest NOT opened → golden chest + blinking dot
 *  - OPENED:  chest revealed → opened chest showing its sticker + stars
 */

export interface ShelfUnit {
  _id: string;
  unitNumber: number;
  topicName?: string;
  completedLessons: number;
  totalLessons: number;
  isCompleted: boolean;
}

interface ChestShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: ShelfUnit[];
  rewards: RewardSummary | null;
  onOpenChest: (chest: RewardChest) => void;
}

export const ChestShelfModal: React.FC<ChestShelfModalProps> = ({
  isOpen,
  onClose,
  units,
  rewards,
  onOpenChest
}) => {
  useEffect(() => {
    if (isOpen) sfx.playPop();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.35 },
          colors: ['#F59E0B', '#FBBF24', '#F97316']
        });
      } catch {
        /* cosmetic only */
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const grantableCount = units.filter(u => {
    const chest = rewards?.chests.find(c => String(c.unitId) === String(u._id));
    return u.isCompleted && chest && !chest.revealedAt;
  }).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gradient-to-b from-amber-50 via-white to-orange-50 rounded-[36px] border-4 border-amber-300 shadow-2xl max-w-3xl w-full p-6 sm:p-8 relative overflow-hidden animate-pop-in max-h-[90vh] flex flex-col">
        {/* Decorative glows */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng"
          className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center cursor-pointer transition-colors z-20 border-2 border-slate-200"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 font-black text-xs px-3 py-1 rounded-full mb-2 border border-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Kho báu hành trình của bé
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-800 font-display">
            🎁 Kệ Rương Báu
          </h3>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
            {grantableCount > 0
              ? `Bé có ${grantableCount} rương quà đang chờ mở đó! ✨`
              : 'Hoàn thành trọn vẹn các Lesson của một Unit để mở rương quà nhé!'}
          </p>
        </div>

        {/* Chest Shelf Grid */}
        <div className="overflow-y-auto custom-scrollbar pr-1 flex-1 relative z-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {units.map(unit => {
              const chest = rewards?.chests.find(c => String(c.unitId) === String(unit._id));
              const isOpened = !!chest?.revealedAt;
              const isGranted = unit.isCompleted && !!chest && !isOpened;
              const sticker = chest?.rewards.stickerId
                ? ALL_STICKERS.find(s => s.id === chest.rewards.stickerId)
                : null;
              const percent = unit.totalLessons > 0
                ? Math.round((unit.completedLessons / unit.totalLessons) * 100)
                : 0;

              return (
                <button
                  key={unit._id}
                  type="button"
                  disabled={!isGranted}
                  onClick={() => {
                    if (!isGranted || !chest) return;
                    sfx.playPop();
                    onOpenChest(chest);
                  }}
                  className={`relative rounded-[28px] border-4 p-4 flex flex-col items-center text-center transition-all select-none ${
                    isGranted
                      ? 'bg-gradient-to-b from-yellow-100 via-amber-50 to-orange-100 border-amber-400 shadow-lg cursor-pointer hover:-translate-y-1.5 hover:shadow-2xl active:scale-95 animate-active-stone'
                      : isOpened
                      ? 'bg-white border-emerald-300 shadow-sm cursor-default'
                      : 'bg-slate-100/90 border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {/* Blinking "new reward" dot */}
                  {isGranted && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-6 w-6 z-20">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-6 w-6 bg-rose-500 border-2 border-white items-center justify-center text-[11px] font-black text-white">
                        !
                      </span>
                    </span>
                  )}

                  {/* Unit tag */}
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border mb-2 ${
                      isGranted
                        ? 'bg-amber-400 text-amber-950 border-amber-500'
                        : isOpened
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-500 border-slate-300'
                    }`}
                  >
                    Unit {unit.unitNumber}
                  </span>

                  {/* Chest / Sticker visual */}
                  {isOpened ? (
                    <div className="my-1 flex flex-col items-center">
                      <div className="text-4xl sm:text-5xl mb-1">🎁</div>
                      {sticker && (
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${sticker.bgGradient} border-2 border-white shadow-md flex items-center justify-center text-2xl`}
                        >
                          {sticker.icon}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`my-1 text-4xl sm:text-5xl transition-transform ${
                        isGranted ? 'animate-bounce' : 'grayscale opacity-50'
                      }`}
                    >
                      {isGranted ? '🎁' : '🧰'}
                    </div>
                  )}

                  {/* Status line */}
                  {isOpened ? (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        +{chest?.rewards.stars || 0} sao • Đã mở
                      </span>
                    </div>
                  ) : isGranted ? (
                    <span className="mt-1 text-[11px] sm:text-xs font-black text-amber-900 bg-amber-300 px-2.5 py-0.5 rounded-full animate-pulse">
                      Mở quà ngay! ✨
                    </span>
                  ) : (
                    <div className="w-full mt-1 space-y-1">
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden p-0.5 border border-slate-300">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 flex items-center justify-center gap-1">
                        <Lock className="w-3 h-3" />
                        {unit.completedLessons}/{unit.totalLessons} Lesson
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-amber-200/70 relative z-10 flex-shrink-0">
          <button
            onClick={() => {
              sfx.playPop();
              onClose();
            }}
            className="btn-3d-amber w-full py-3.5 rounded-2xl text-amber-950 font-black text-base cursor-pointer"
          >
            Bé tiếp tục phiêu lưu nhé! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
