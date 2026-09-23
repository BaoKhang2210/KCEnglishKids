import React, { useEffect, useState } from 'react';
import { Star, RotateCcw, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { sfx } from '../../utils/audio';
import { KokoMascot } from './KokoMascot';
import { useAuth } from '../../context/AuthContext';
import { stickerService, type StickerItem } from '../../data/stickers';

interface ResultModalProps {
  score: number;
  maxScore: number;
  stars: number;
  correctCount: number;
  totalQuestions: number;
  onRetry: () => void;
  onFinish: () => void;
  nextActivityId?: string | null;
  nextActivityTitle?: string | null;
  onPlayNext?: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  score,
  maxScore,
  stars,
  correctCount,
  totalQuestions,
  onRetry,
  onFinish,
  nextActivityId,
  nextActivityTitle,
  onPlayNext
}) => {
  const { user } = useAuth();
  const childId = user?._id || user?.id || 'child_guest';
  const [awardedSticker, setAwardedSticker] = useState<StickerItem | null>(null);

  useEffect(() => {
    if (stars > 0) {
      sfx.playStarFanfare();
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#F59E0B', '#10B981', '#38BDF8', '#EC4899', '#8B5CF6']
        });
      } catch (e) {}

      if (stars >= 2) {
        const sticker = stickerService.awardRandomSticker(childId);
        if (sticker) {
          setAwardedSticker(sticker);
        }
      }
    }
  }, [stars, childId]);

  const getEncouragement = () => {
    if (stars === 3) {
      return {
        title: '🌟 Tuyệt đỉnh xuất sắc! 🌟',
        subtitle: 'Bé đã trả lời đúng hết tất cả các câu!',
        mascotBubble: 'Bé thông minh tuyệt vời! 🎉'
      };
    }
    if (stars === 2) {
      return {
        title: '🎉 Rất giỏi con ơi! 🎉',
        subtitle: 'Bé đã làm rất tốt, cùng luyện tập thêm nhé!',
        mascotBubble: 'Hoan hô bé yêu! 👏'
      };
    }
    if (stars === 1) {
      return {
        title: '👏 Hoan hô cố gắng! 👏',
        subtitle: 'Bé hãy thử lại một lần nữa để đạt 3 sao nhé!',
        mascotBubble: 'Cố lên nào bé ơi! 💪'
      };
    }
    return {
      title: '💪 Cố lên nào bé ơi! 💪',
      subtitle: 'Mình cùng thử lại một lần nữa nhé!',
      mascotBubble: 'Koko luôn cổ vũ bé! 🐻'
    };
  };

  const message = getEncouragement();

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl border-4 border-amber-300 shadow-2xl max-w-lg w-full p-6 sm:p-8 text-center animate-pop-in relative overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot Center Stage */}
        <div className="flex justify-center -mt-16 mb-2 relative z-10">
          <KokoMascot
            state="celebrating"
            size="lg"
            speechBubble={message.mascotBubble}
            onClick={() => sfx.playPop()}
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 mb-1.5 tracking-tight relative z-10">
          {message.title}
        </h2>
        <p className="text-slate-500 font-bold text-sm sm:text-base mb-5 relative z-10">
          {message.subtitle}
        </p>

        {/* 3 Large Glowing Animated Stars */}
        <div className="flex items-center justify-center gap-4 my-6 relative z-10">
          {[1, 2, 3].map(num => {
            const earned = stars >= num;
            return (
              <div
                key={num}
                className={`transition-all duration-700 transform ${
                  earned ? 'scale-110 animate-star-celebrate' : 'scale-85 opacity-25'
                }`}
                style={{ animationDelay: `${num * 220}ms` }}
              >
                <Star
                  className={`w-16 h-16 sm:w-20 sm:h-20 ${
                    earned
                      ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_8px_16px_rgba(251,191,36,0.6)]'
                      : 'text-slate-300'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Score & Correct Answer Stats Pill */}
        <div className="bg-amber-50/80 border-2 border-amber-200/90 rounded-2xl p-4 mb-4 flex justify-around relative z-10">
          <div>
            <span className="text-xs font-black text-slate-400 block uppercase tracking-wider">
              Điểm số
            </span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600">
              {score}/{maxScore}
            </span>
          </div>
          <div className="w-px bg-amber-200" />
          <div>
            <span className="text-xs font-black text-slate-400 block uppercase tracking-wider">
              Câu đúng
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">
              {correctCount}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Unlocked Sticker Reward Banner */}
        {awardedSticker && (
          <div className="mb-5 p-3 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 border-2 border-amber-300 rounded-2xl flex items-center gap-3 relative z-10 shadow-xs animate-pop-in">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${awardedSticker.bgGradient} flex items-center justify-center text-2xl shadow-md flex-shrink-0 animate-bounce`}>
              {awardedSticker.icon}
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                🎁 Quà tặng Sticker mới!
              </span>
              <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                {awardedSticker.name}
              </h4>
              <p className="text-[10px] font-bold text-slate-500 truncate">
                {awardedSticker.desc}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 relative z-10">
          {nextActivityId && onPlayNext && (
            <button
              onClick={() => {
                sfx.playPop();
                onPlayNext();
              }}
              className="btn-3d-emerald w-full py-4 px-6 rounded-2xl text-white font-black text-lg sm:text-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <span>Chơi tiếp: {nextActivityTitle || 'Bài tiếp theo'}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                sfx.playPop();
                onRetry();
              }}
              className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-base flex items-center justify-center gap-2 cursor-pointer border-2 border-slate-300 active:scale-95 transition-transform"
            >
              <RotateCcw className="w-5 h-5 stroke-[2.5]" />
              <span>Chơi lại</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                onFinish();
              }}
              className={`py-3.5 px-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-transform ${
                nextActivityId
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-2 border-slate-300'
                  : 'btn-3d-amber text-amber-950'
              }`}
            >
              <span>{nextActivityId ? 'Về bài học' : 'Hoàn thành 🎉'}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
