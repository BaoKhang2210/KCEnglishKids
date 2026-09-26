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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white rounded-4xl border-4 border-amber-300 shadow-2xl max-w-xl sm:max-w-2xl w-full p-8 sm:p-12 text-center animate-pop-in relative overflow-hidden">
        {/* Soft decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* Mascot Center Stage */}
        <div className="flex justify-center -mt-20 mb-3 relative z-10">
          <KokoMascot
            state="celebrating"
            size="lg"
            speechBubble={message.mascotBubble}
            onClick={() => sfx.playPop()}
          />
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 mb-2 tracking-tight relative z-10">
          {message.title}
        </h2>
        <p className="text-slate-600 font-bold text-base sm:text-xl mb-6 relative z-10">
          {message.subtitle}
        </p>

        {/* 3 Large Glowing Animated Stars */}
        <div className="flex items-center justify-center gap-6 my-6 relative z-10">
          {[1, 2, 3].map(num => {
            const earned = stars >= num;
            return (
              <div
                key={num}
                className={`transition-all duration-700 transform ${
                  earned ? 'scale-115 animate-star-celebrate' : 'scale-85 opacity-25'
                }`}
                style={{ animationDelay: `${num * 220}ms` }}
              >
                <Star
                  className={`w-20 h-20 sm:w-28 sm:h-28 ${
                    earned
                      ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_10px_20px_rgba(251,191,36,0.65)]'
                      : 'text-slate-300'
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Score & Correct Answer Stats Pill */}
        <div className="bg-amber-50/90 border-3 border-amber-200 rounded-3xl p-5 sm:p-6 mb-6 flex justify-around relative z-10 shadow-xs">
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-400 block uppercase tracking-wider mb-1">
              Điểm số
            </span>
            <span className="text-3xl sm:text-5xl font-black text-amber-600">
              {score}/{maxScore}
            </span>
          </div>
          <div className="w-0.5 bg-amber-200" />
          <div>
            <span className="text-xs sm:text-sm font-black text-slate-400 block uppercase tracking-wider mb-1">
              Câu đúng
            </span>
            <span className="text-3xl sm:text-5xl font-black text-emerald-600">
              {correctCount}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* Unlocked Sticker Reward Banner */}
        {awardedSticker && (
          <div className="mb-6 p-4 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-100 border-3 border-amber-300 rounded-3xl flex items-center gap-4 relative z-10 shadow-sm animate-pop-in">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${awardedSticker.bgGradient} flex items-center justify-center text-3xl sm:text-4xl shadow-md flex-shrink-0 animate-bounce`}>
              {awardedSticker.icon}
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 block">
                🎁 Quà tặng Sticker mới!
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-800 truncate">
                {awardedSticker.name}
              </h4>
              <p className="text-xs font-bold text-slate-500 truncate">
                {awardedSticker.desc}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 relative z-10">
          {nextActivityId && onPlayNext && (
            <button
              onClick={() => {
                sfx.playPop();
                onPlayNext();
              }}
              className="btn-3d-emerald w-full py-5 px-8 rounded-3xl text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 cursor-pointer shadow-xl active:scale-95"
            >
              <span>Chơi tiếp: {nextActivityTitle || 'Bài tiếp theo'}</span>
              <ArrowRight className="w-7 h-7 stroke-[3.5]" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                sfx.playPop();
                onRetry();
              }}
              className="py-4 sm:py-5 px-6 rounded-3xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-lg sm:text-xl flex items-center justify-center gap-2.5 cursor-pointer border-3 border-slate-300 active:scale-95 transition-transform shadow-xs"
            >
              <RotateCcw className="w-6 h-6 stroke-[3]" />
              <span>Chơi lại</span>
            </button>

            <button
              onClick={() => {
                sfx.playPop();
                onFinish();
              }}
              className={`py-4 sm:py-5 px-6 rounded-3xl font-black text-lg sm:text-xl flex items-center justify-center gap-2.5 cursor-pointer shadow-lg active:scale-95 transition-transform ${
                nextActivityId
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-3 border-slate-300'
                  : 'btn-3d-amber text-amber-950'
              }`}
            >
              <span>{nextActivityId ? 'Về bài học' : 'Hoàn thành 🎉'}</span>
              <ArrowRight className="w-6 h-6 stroke-[3]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
