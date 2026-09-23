import React, { useEffect } from 'react';
import { Sparkles, X, ArrowRight, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';

interface UnitData {
  _id?: string;
  unitNumber?: number;
  order?: number;
  title?: string;
  topicName?: string;
  lessons?: any[];
  isCompleted?: boolean;
}

interface SecretGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitData | null;
  unitIndex: number;
  isCompleted: boolean;
  onContinue?: () => void;
}

export const SecretGiftModal: React.FC<SecretGiftModalProps> = ({
  isOpen,
  onClose,
  unit,
  unitIndex,
  isCompleted,
  onContinue
}) => {
  useEffect(() => {
    if (isOpen) {
      if (isCompleted) {
        sfx.playStarFanfare();
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#F59E0B', '#10B981', '#38BDF8', '#EC4899', '#8B5CF6']
          });
        } catch (e) {}
      } else {
        sfx.playPop();
      }
    }
  }, [isOpen, isCompleted]);

  if (!isOpen || !unit) return null;

  const handleClaim = () => {
    sfx.playPop();
    onClose();
    if (onContinue) onContinue();
  };

  const completedLessons = unit.lessons?.filter((l: any) => l.completed || l.isCompleted)?.length || 0;
  const totalLessons = unit.lessons?.length || 4;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl max-w-lg w-full p-6 sm:p-8 relative overflow-hidden animate-pop-in">
        {/* Soft Decorative Ambient Background */}
        <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-pink-200/40 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={() => {
            sfx.playPop();
            onClose();
          }}
          aria-label="Đóng hộp quà"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {isCompleted ? (
          /* ================= COMPLETED / UNLOCKED REWARD STATE ================= */
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Top Celebration Badge */}
            <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider shadow-sm mb-3 animate-soft-bounce">
              <Sparkles className="w-4 h-4 fill-amber-950" />
              <span>Rương Báu Mở Khóa! 🎉</span>
            </div>

            {/* Mascot celebration */}
            <div className="relative mb-2">
              <KokoMascot state="celebrating" size="md" interactive={true} onClick={() => sfx.playPop()} />
              <div className="absolute -bottom-2 -right-4 bg-white border-2 border-amber-300 rounded-full px-3 py-1 text-xs font-black text-amber-900 shadow-sm animate-pulse">
                Bé siêu quá! 🌟
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-1">
              Kho Báu Unit {unit.order || unitIndex + 1}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-emerald-700 mb-5">
              Chúc mừng bé đã hoàn thành xuất sắc toàn bộ bài học của: <span className="font-black text-slate-800">{unit.title}</span>!
            </p>

            {/* Rewards Collection Cards */}
            <div className="w-full grid grid-cols-3 gap-2.5 mb-6">
              {/* Reward 1: Stars */}
              <div className="bg-gradient-to-b from-amber-50 to-yellow-100/70 border-2 border-amber-300 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs hover:scale-105 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center text-xl mb-1 shadow-xs">
                  ⭐
                </div>
                <span className="text-xs font-black text-amber-950">+5 Sao Vàng</span>
                <span className="text-[10px] font-bold text-amber-800">Thưởng rương báu</span>
              </div>

              {/* Reward 2: Badge */}
              <div className="bg-gradient-to-b from-purple-50 to-pink-100/70 border-2 border-purple-300 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs hover:scale-105 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-purple-400 text-white flex items-center justify-center text-xl mb-1 shadow-xs">
                  🏆
                </div>
                <span className="text-xs font-black text-purple-950">Huy Hiệu Unit</span>
                <span className="text-[10px] font-bold text-purple-800">Nhà thám hiểm</span>
              </div>

              {/* Reward 3: Mystery Sticker */}
              <div className="bg-gradient-to-b from-sky-50 to-blue-100/70 border-2 border-sky-300 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs hover:scale-105 transition-transform">
                <div className="w-10 h-10 rounded-xl bg-sky-400 text-white flex items-center justify-center text-xl mb-1 shadow-xs">
                  🎁
                </div>
                <span className="text-xs font-black text-sky-950">Sticker Mới</span>
                <span className="text-[10px] font-bold text-sky-800">Bộ sưu tập</span>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleClaim}
              className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <span>Nhận Quà & Tiếp Tục Phiêu Lưu! 🚀</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        ) : (
          /* ================= LOCKED SNEAK PEEK STATE ================= */
          <div className="flex flex-col items-center text-center relative z-10">
            {/* Top Status Badge */}
            <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider shadow-xs mb-3">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Rương Báu Đang Chờ Bé Khám Phá! 🔒</span>
            </div>

            {/* Big Mystery Gift Box Animation */}
            <div className="relative mb-3 group cursor-pointer" onClick={() => sfx.playPop()}>
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 border-4 border-amber-400 flex items-center justify-center text-5xl sm:text-6xl shadow-xl animate-soft-bounce group-hover:scale-110 transition-transform">
                🎁
              </div>
              <div className="absolute -bottom-2 inset-x-0 flex justify-center">
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  Bấm để lắc hộp quà! 🌟
                </span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mb-1">
              Hộp Quà Bí Mật Unit {unit.order || unitIndex + 1}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-500 mb-4 max-w-sm">
              Kho báu tuyệt vời bên trong rương đang chờ đón bé khi hoàn thành tất cả các bài học của chủ đề: <span className="font-black text-amber-800">{unit.title}</span>!
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-3 mb-5">
              <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-1.5">
                <span>Tiến độ Unit của bé:</span>
                <span className="text-amber-800">{completedLessons}/{totalLessons} bài học</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round((completedLessons / totalLessons) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-2 text-left">
                💡 Bé chỉ cần hoàn thành thêm <span className="text-amber-600 font-black">{totalLessons - completedLessons} bài học</span> nữa thôi là rương báu sẽ bật mở!
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={() => {
                sfx.playPop();
                onClose();
                if (onContinue) onContinue();
              }}
              className="btn-3d-amber w-full py-3.5 px-6 rounded-2xl text-amber-950 font-black text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              <span>Vào Học Để Mở Rương Ngay! 🎒</span>
              <ArrowRight className="w-5 h-5 stroke-[3]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
