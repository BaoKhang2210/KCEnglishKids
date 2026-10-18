import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Home, Play, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Activity } from '../../../types';
import { GAME_VISUALS } from '../../../data/stage3Games';
import { getGameLabel } from '../../../data/labels';
import { KokoMascot } from '../KokoMascot';
import { ALL_STICKERS } from '../../../data/stickers';
import { useRewards } from '../../../context/RewardContext';

type HubActivity = Activity & { completed?: boolean; stars?: number; score?: number };

interface Stage3ArcadeHubProps {
  games: HubActivity[];
  resumeGame?: HubActivity;
  completedCount: number;
  isCompleted: boolean;
  onStart: (activityId: string) => void;
  onBackToStage2: () => void;
  onHome: () => void;
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  return reduced;
};

const speakGameName = (label: string) => {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(label);
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis is optional; card interaction must still work.
  }
};

export const Stage3ArcadeHub: React.FC<Stage3ArcadeHubProps> = ({
  games,
  resumeGame,
  completedCount,
  isCompleted,
  onStart,
  onBackToStage2,
  onHome
}) => {
  const reducedMotion = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const [page, setPage] = useState(0);
  const [hasTouched, setHasTouched] = useState(false);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const [celebrated, setCelebrated] = useState(false);
  const { rewards } = useRewards();

  useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => setPage(0), [games.length]);

  useEffect(() => {
    if (!isCompleted || celebrated) return;
    setCelebrated(true);
    if (reducedMotion) return;
    try {
      confetti({
        particleCount: 70,
        spread: 72,
        origin: { y: 0.55 },
        colors: ['#FBBF24', '#F472B6', '#60A5FA', '#34D399']
      });
    } catch {
      // The completion summary remains usable when the animation is unavailable.
    }
  }, [isCompleted, celebrated, reducedMotion]);

  const perPage = compact ? 4 : 6;
  const pageCount = Math.max(1, Math.ceil(games.length / perPage));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleGames = games.slice(currentPage * perPage, (currentPage + 1) * perPage);
  const columns = compact
    ? visibleGames.length <= 3 ? Math.max(1, visibleGames.length) : 2
    :
    visibleGames.length <= 3 ? Math.max(1, visibleGames.length) : visibleGames.length === 4 ? 2 : 3;
  const rows = Math.ceil(visibleGames.length / columns);
  const nextGame = useMemo(
    () => resumeGame || games.find(game => !game.completed) || games[0],
    [games, resumeGame]
  );
  const progressStars = games.length > 0
    ? Math.ceil((completedCount / games.length) * 3)
    : 3;

  const stickerIds = new Set(['st_star', ...(rewards?.grantedStickerIds || [])]);
  const celebrationSticker = ALL_STICKERS.find(sticker => stickerIds.has(sticker.id)) || ALL_STICKERS[0];

  const handleGameStart = (game: HubActivity) => {
    if (animatingId) return;
    setHasTouched(true);
    setAnimatingId(game._id);
    speakGameName(getGameLabel(game.activityType));
    window.setTimeout(() => onStart(game._id), reducedMotion ? 0 : 300);
  };

  return (
    <section className="stage3-hub flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden" aria-label="Khu vui chơi">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-indigo-400/50 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-2 sm:p-3">
        {isCompleted ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-white">
            <KokoMascot state="celebrating" size="lg" interactive={false} className="stage3-koko" />
            {celebrationSticker && (
              <div className={`puffy-sticker flex h-[9dvh] min-h-16 w-[9dvh] min-w-16 items-center justify-center rounded-3xl border-2 border-white bg-gradient-to-tr ${celebrationSticker.bgGradient} text-[clamp(32px,6dvh,52px)] shadow-xl`} aria-label={`Sticker đã mở: ${celebrationSticker.name}`}>
                {celebrationSticker.icon}
              </div>
            )}
            <h2 className="text-[clamp(28px,4dvh,36px)] font-black">Bé chơi hết rồi! 🎉</h2>
            <p className="text-[clamp(20px,2.5dvh,24px)] font-bold text-indigo-100">Giỏi quá! 🏆</p>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 text-center text-white">
            <KokoMascot state="thinking" size="lg" interactive={false} />
            <p className="text-[clamp(20px,2.5dvh,24px)] font-black">Chưa có trò chơi phù hợp</p>
          </div>
        ) : (
          <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-2">
            <div
              className="stage3-game-grid grid min-h-0 w-full flex-1 content-center justify-center gap-x-2 gap-y-[2dvh] sm:gap-x-4"
              style={{
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(25dvh, ${rows === 1 ? '34dvh' : '27dvh'}))`,
                maxWidth: compact ? '96vw' : columns === 3 ? 'min(74rem, 66vw)' : columns === 2 ? 'min(54rem, 44vw)' : 'min(25rem, 22vw)'
              }}
            >
              {visibleGames.map((game) => {
                const isNext = game._id === nextGame?._id && !game.completed;
                const visuals = GAME_VISUALS[game.activityType] || GAME_VISUALS.DEFAULT;
                const label = getGameLabel(game.activityType);
                const stars = Math.max(0, Math.min(3, Number(game.stars) || 0));
                const showHand = isNext && !hasTouched && !reducedMotion;

                return (
                  <button
                    key={game._id}
                    type="button"
                    onClick={() => handleGameStart(game)}
                    aria-label={`${label}${game.completed ? ', đã hoàn thành' : isNext ? ', chơi tiếp' : ''}. ${stars} trên 3 sao`}
                    className={`stage3-game-card relative flex h-full min-h-[25dvh] w-full min-w-0 flex-col items-center justify-between overflow-visible rounded-[2rem] border-4 p-2 text-center text-white shadow-xl transition-transform focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${visuals.card} ${isNext ? 'stage3-next-card z-10 border-amber-200 ring-4 ring-amber-300/60' : 'border-white/75'} ${game.completed ? 'opacity-80' : ''} ${animatingId === game._id ? 'stage3-card-tap' : ''} ${reducedMotion ? 'motion-reduce:transform-none motion-reduce:animate-none' : ''}`}
                  >
                    {showHand && <span aria-hidden className="stage3-hand absolute -right-3 -top-4 z-20 text-[clamp(36px,6dvh,52px)]">👆</span>}
                    <span className={`flex w-full flex-1 items-center justify-center rounded-3xl ${visuals.art} text-[clamp(56px,12dvh,112px)] leading-none drop-shadow-lg`} aria-hidden>
                      {visuals.icon}
                    </span>
                    <span className="mt-1 w-full break-words text-[28px] font-black leading-tight drop-shadow-sm">{label}</span>
                    <span className="flex min-h-[4dvh] items-center justify-center gap-1" aria-label={`${stars} trên 3 sao`}>
                      {[0, 1, 2].map(index => (
                        <Star key={index} className={`h-[4dvh] min-h-7 w-[4dvh] min-w-7 ${index < stars ? 'fill-amber-300 text-amber-300' : 'fill-white/10 text-white/55'}`} />
                      ))}
                    </span>
                    <span className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/35 text-3xl" aria-hidden>
                      {game.completed ? <Check className="h-8 w-8 stroke-[3.5] text-emerald-200" /> : isNext ? <Play className="h-6 w-6 animate-pulse fill-current text-amber-100" /> : '•'}
                    </span>
                  </button>
                );
              })}
            </div>

            {pageCount > 1 && (
              <div className="flex shrink-0 items-center justify-center gap-3" aria-label="Trang trò chơi">
                <button type="button" onClick={() => setPage(value => Math.max(0, value - 1))} disabled={currentPage === 0} aria-label="Trang trước" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/60 bg-slate-800 text-3xl text-white disabled:opacity-40">◀</button>
                <span className="min-w-16 text-center text-lg font-black text-white">{currentPage + 1} / {pageCount}</span>
                <button type="button" onClick={() => setPage(value => Math.min(pageCount - 1, value + 1))} disabled={currentPage >= pageCount - 1} aria-label="Trang sau" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/60 bg-slate-800 text-3xl text-white disabled:opacity-40">▶</button>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="stage3-footer shrink-0 rounded-3xl border border-amber-300/60 bg-slate-900/95 px-2 py-2 text-white shadow-lg sm:px-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <KokoMascot
            state={isCompleted ? 'celebrating' : 'encouraging'}
            size="lg"
            interactive={false}
            speechBubble={isCompleted ? 'Giỏi quá! 🏆' : 'Chơi nào!'}
            bubblePosition="top"
            className="stage3-koko shrink-0"
          />
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-2" aria-label={`Tiến độ ${progressStars} trên 3`}>
              {[0, 1, 2].map(index => (
                <Star key={index} className={`h-8 w-8 ${index < progressStars ? 'fill-amber-300 text-amber-300' : 'fill-white/10 text-white/50'}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => isCompleted ? onHome() : nextGame && handleGameStart(nextGame)}
              disabled={!isCompleted && !nextGame}
              className="flex min-h-[10dvh] min-w-40 items-center justify-center gap-2 rounded-3xl border-4 border-amber-100 bg-gradient-to-b from-amber-300 to-orange-400 px-5 text-[24px] font-black text-slate-950 shadow-[0_6px_0_#b45309] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-60"
            >
              {isCompleted ? <><Home className="h-7 w-7" />Về nhà</> : <><Play className="h-7 w-7 fill-current" />Chơi</>}
            </button>
          </div>
          <div className="hidden shrink-0 flex-col gap-2 sm:flex-row sm:flex">
            <button type="button" onClick={onBackToStage2} aria-label="Quay lại Chặng 2" title="Chặng 2" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/50 bg-indigo-800 text-3xl text-white transition-transform active:scale-95"><ArrowLeft className="h-8 w-8" /></button>
            <button type="button" onClick={onHome} aria-label="Về trang chủ" title="Trang chủ" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/50 bg-indigo-800 text-3xl text-white transition-transform active:scale-95"><Home className="h-8 w-8" /></button>
          </div>
        </div>
        <div className="mt-1 flex justify-center gap-3 sm:hidden">
          <button type="button" onClick={onBackToStage2} aria-label="Quay lại Chặng 2" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/50 bg-indigo-800 text-3xl text-white"><ArrowLeft className="h-8 w-8" /></button>
          <button type="button" onClick={onHome} aria-label="Về trang chủ" className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/50 bg-indigo-800 text-3xl text-white"><Home className="h-8 w-8" /></button>
        </div>
      </footer>
    </section>
  );
};
