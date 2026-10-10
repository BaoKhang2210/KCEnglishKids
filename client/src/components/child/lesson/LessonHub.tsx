import React from 'react';
import { Home, RotateCcw, ArrowRight, Star } from 'lucide-react';
import { KokoMascot } from '../KokoMascot';
import { sfx } from '../../../utils/audio';

interface LessonHubProps {
  lessonTitle: string;
  totalStars?: number;
  onReviewStage: (stage: 1 | 2 | 3) => void;
  onGoHome: () => void;
  nextLessonId?: string;
  onGoNextLesson?: () => void;
}

/**
 * LessonHub: Full Lesson Completion Summary Screen.
 * Displays when child finishes all 3 stages, or when accessed from ParentSheet.
 * Provides 3 large review hubs (>=140px) 📖 🎯 🎮, Home button, and Next Lesson if available.
 */
export const LessonHub: React.FC<LessonHubProps> = ({
  lessonTitle,
  totalStars = 9,
  onReviewStage,
  onGoHome,
  nextLessonId,
  onGoNextLesson,
}) => {
  const hubs: Array<{ stage: 1 | 2 | 3; icon: string; title: string; color: string; border: string }> = [
    {
      stage: 1,
      icon: '📖',
      title: 'Khám phá từ vựng',
      color: 'bg-amber-100 hover:bg-amber-200 text-amber-950',
      border: 'border-amber-400',
    },
    {
      stage: 2,
      icon: '🎯',
      title: 'Luyện tập TPR',
      color: 'bg-teal-100 hover:bg-teal-200 text-teal-950',
      border: 'border-teal-400',
    },
    {
      stage: 3,
      icon: '🎮',
      title: 'Vườn trò chơi',
      color: 'bg-purple-100 hover:bg-purple-200 text-purple-950',
      border: 'border-purple-400',
    },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-6 text-center select-none relative animate-fade-in overflow-hidden">
      {/* Background festive celebration sparkles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <span className="absolute text-5xl animate-bounce" style={{ top: '10%', left: '15%' }}>🌟</span>
        <span className="absolute text-5xl animate-pulse" style={{ top: '15%', right: '15%' }}>🎉</span>
        <span className="absolute text-6xl animate-bounce" style={{ bottom: '15%', left: '10%' }}>⭐</span>
        <span className="absolute text-6xl animate-pulse" style={{ bottom: '15%', right: '10%' }}>✨</span>
      </div>

      {/* Top: Koko & Congratulation Banner */}
      <div className="flex flex-col items-center z-10 pt-2">
        <KokoMascot state="celebrating" size="lg" interactive={false} />
        <h2 className="text-3xl sm:text-4xl font-black text-amber-950 mt-2 mb-1">
          Bé là nhà vô địch! 🏆
        </h2>
        <p className="text-sm sm:text-base font-bold text-slate-600">
          Đã hoàn thành xuất sắc bài học: <span className="text-amber-800">{lessonTitle}</span>
        </p>

        {/* Stars tally */}
        <div className="flex items-center gap-2 mt-2 bg-amber-100 px-4 py-1.5 rounded-full border-2 border-amber-300">
          <Star className="w-6 h-6 text-amber-500 fill-amber-500 animate-spin-slow" />
          <span className="font-black text-amber-950 text-lg sm:text-xl">
            {totalStars} Sao vàng rực rỡ
          </span>
        </div>
      </div>

      {/* Center: 3 Giant Stage Review Hubs (>=140px) */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 z-10 my-auto">
        {hubs.map((hub) => (
          <button
            key={hub.stage}
            onClick={() => {
              sfx.playPop();
              onReviewStage(hub.stage);
            }}
            type="button"
            aria-label={`Ôn lại ${hub.title}`}
            style={{ minHeight: '140px' }}
            className={`rounded-4xl border-4 p-4 flex flex-col items-center justify-between cursor-pointer transition-all active:scale-95 shadow-xl hover:scale-103 group ${hub.color} ${hub.border}`}
          >
            <span style={{ fontSize: '48px' }} className="leading-none group-hover:scale-110 transition-transform">
              {hub.icon}
            </span>
            <span className="font-black text-base sm:text-lg">
              {hub.title}
            </span>
            <div className="inline-flex items-center gap-1.5 bg-white/90 px-3 py-1 rounded-full text-xs font-black shadow-xs">
              <RotateCcw className="w-3.5 h-3.5 text-slate-700" />
              <span>Chạm để ôn lại</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Actions: Big Home button & Optional Next Lesson (>= 72px) */}
      <div className="flex flex-wrap items-center justify-center gap-4 z-10 pb-2">
        <button
          onClick={() => {
            sfx.playPop();
            onGoHome();
          }}
          type="button"
          aria-label="Về trang chủ"
          style={{ minHeight: '72px', minWidth: '220px' }}
          className="rounded-3xl bg-emerald-500 hover:bg-emerald-400 border-b-6 border-emerald-700 text-white font-black text-xl flex items-center justify-center gap-3 px-8 shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
        >
          <Home className="w-8 h-8" />
          <span>Về trang chủ 🏠</span>
        </button>

        {nextLessonId && onGoNextLesson && (
          <button
            onClick={() => {
              sfx.playPop();
              onGoNextLesson();
            }}
            type="button"
            aria-label="Bài học tiếp theo"
            style={{ minHeight: '72px', minWidth: '220px' }}
            className="rounded-3xl bg-amber-400 hover:bg-amber-300 border-b-6 border-amber-600 text-amber-950 font-black text-xl flex items-center justify-center gap-3 px-8 shadow-xl active:translate-y-1 active:border-b-2 transition-all cursor-pointer"
          >
            <span>Bài tiếp theo</span>
            <ArrowRight className="w-8 h-8 stroke-[3]" />
          </button>
        )}
      </div>
    </div>
  );
};
