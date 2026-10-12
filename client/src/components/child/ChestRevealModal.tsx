import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Star, Sparkles } from 'lucide-react';
import { sfx } from '../../utils/audio';
import type { RewardChest, RevealedChest } from '../../types';
import { ALL_STICKERS } from '../../data/stickers';
import { useRewards } from '../../context/RewardContext';

/**
 * Màn 2 (§1.2.14) — Mở rương: shake animation → burst →
 * reveal the sticker + bonus stars.
 * The reveal API call is COSMETIC: the animation ALWAYS plays,
 * even when the network call fails (rewards were granted server-side).
 */

interface ChestRevealModalProps {
  chest: RewardChest | null;
  onClose: () => void;
}

export const ChestRevealModal: React.FC<ChestRevealModalProps> = ({ chest, onClose }) => {
  const { revealChest } = useRewards();
  const [phase, setPhase] = useState<'shaking' | 'revealed'>('shaking');
  const [apiResult, setApiResult] = useState<RevealedChest | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!chest) return;

    setPhase('shaking');
    setApiResult(null);

    // §1.2.14 — fire the (cosmetic) reveal; never block the show.
    if (chest.unitId) {
      revealChest(chest.unitId).then(res => {
        if (res) setApiResult(res);
      });
    }

    const t1 = window.setTimeout(() => {
      setPhase('revealed');
      sfx.playStarFanfare();
      try {
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#F59E0B', '#10B981', '#38BDF8', '#EC4899', '#8B5CF6']
        });
      } catch {
        /* cosmetic only */
      }
    }, 1400);

    timersRef.current.push(t1);
    return () => {
      timersRef.current.forEach(t => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, [chest, revealChest]);

  if (!chest) return null;

  const stickerId = apiResult?.rewards.stickerId || chest.rewards.stickerId;
  const stars = apiResult?.rewards.stars ?? chest.rewards.stars;
  const sticker = stickerId ? ALL_STICKERS.find(s => s.id === stickerId) : null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-gradient-to-b from-amber-50 via-yellow-50 to-orange-100 rounded-[40px] border-4 border-amber-400 shadow-2xl max-w-lg w-full p-8 sm:p-10 text-center relative overflow-hidden animate-pop-in">
        {/* Radiating glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%] bg-[radial-gradient(circle,rgba(251,191,36,0.35)_0%,transparent_65%)] pointer-events-none" />

        {phase === 'shaking' ? (
          /* ─── Phase 1: the chest shakes with excitement ─── */
          <div className="relative z-10 py-10">
            <div className="text-8xl sm:text-9xl chest-shake inline-block">🎁</div>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-900 mt-6 animate-pulse">
              Rương quà đang mở ra... 🥁
            </h3>
            <p className="text-sm font-bold text-amber-700 mt-2">
              Unit {chest.unitNumber} • Bé chờ một chút nhé!
            </p>
          </div>
        ) : (
          /* ─── Phase 2: reveal the rewards ─── */
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-950 font-black text-xs px-3 py-1 rounded-full mb-3 border-2 border-white shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Rương báu Unit {chest.unitNumber}
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-800 mb-1 font-display">
              🎉 Bé nhận được quà!
            </h2>
            <p className="text-sm font-bold text-slate-500 mb-6">
              Phần thưởng đã được lưu vào góc phần thưởng của bé
            </p>

            {/* Sticker reward */}
            {sticker && (
              <div
                className={`mx-auto w-32 h-32 sm:w-40 sm:h-40 rounded-[36px] bg-gradient-to-tr ${sticker.bgGradient} border-4 border-white shadow-2xl flex items-center justify-center text-7xl sm:text-8xl mb-4 animate-star-celebrate`}
              >
                {sticker.icon}
              </div>
            )}
            {sticker && (
              <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-1">
                {sticker.name}
              </h3>
            )}
            {sticker && (
              <p className="text-xs sm:text-sm font-bold text-slate-500 mb-5">
                {sticker.desc}
              </p>
            )}

            {/* Bonus stars pill */}
            <div className="inline-flex items-center gap-2 bg-white border-3 border-amber-300 rounded-3xl px-6 py-3 shadow-md mb-7">
              <Star className="w-7 h-7 text-amber-500 fill-amber-500 animate-star-celebrate" />
              <span className="text-2xl sm:text-3xl font-black text-amber-700">
                +{stars} Sao vàng
              </span>
            </div>

            <button
              onClick={() => {
                sfx.playPop();
                onClose();
              }}
              className="btn-3d-amber w-full py-4 sm:py-5 rounded-3xl text-amber-950 font-black text-xl sm:text-2xl cursor-pointer shadow-xl active:scale-95"
            >
              Tuyệt vời! Tiếp tục học 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
