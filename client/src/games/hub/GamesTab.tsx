import React, { useMemo } from 'react';
import { Star } from 'lucide-react';
import type { Vocabulary } from '../../types';
import { getAvailableLessonGames } from '../registry';
import { GameCard } from './GameCard';
import { KokoMascot } from '../../components/child/KokoMascot';

export const REQUIRED_GAMES_TO_COMPLETE = 2;
const EMPTY_VOCABULARY: Vocabulary[] = [];

interface GamesTabProps {
  vocabularyList: Vocabulary[];
  unitNumber?: number;
  lessonNumber?: number;
  completedGameIds: string[];
  isStage3Completed?: boolean;
  onSelectGame: (gameId: string) => void;
}

export const GamesTab: React.FC<GamesTabProps> = ({
  vocabularyList = EMPTY_VOCABULARY,
  unitNumber = 1,
  lessonNumber = 1,
  completedGameIds = [],
  isStage3Completed = false,
  onSelectGame,
}) => {
  // 4 games được chọn theo xoay vòng cho Lesson
  const games = useMemo(() => {
    return getAvailableLessonGames(vocabularyList || [], unitNumber, lessonNumber);
  }, [unitNumber, lessonNumber, vocabularyList]);

  const completedCount = completedGameIds.length;
  const suggestedGameId = games.find(g => !completedGameIds.includes(g.id))?.id;

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-4 overflow-hidden relative select-none">
      {/* ── TOP: Tiến độ Stage 3 (2 ô sao x/2) ── */}
      <div className="shrink-0 w-full flex items-center justify-between bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-indigo-400/30 text-white">
        <div className="flex items-center gap-2">
          <KokoMascot state={isStage3Completed ? 'celebrating' : 'happy'} size="sm" interactive={false} />
          <div>
            <h2 className="text-xs sm:text-sm font-black text-amber-300">
              {isStage3Completed ? 'Stage 3 Complete! 🎉' : 'Play & Practice Minigames'}
            </h2>
            <p className="text-[11px] text-indigo-200">
              Complete {REQUIRED_GAMES_TO_COMPLETE} games to finish this lesson!
            </p>
          </div>
        </div>

        {/* 2 Ngôi sao tiến độ */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-full border border-amber-300/40">
          {[1, 2].map(idx => {
            const filled = completedCount >= idx;
            return (
              <Star
                key={idx}
                className={`w-5 h-5 sm:w-6 sm:h-6 ${
                  filled ? 'text-amber-400 fill-amber-400 animate-soft-bounce' : 'text-slate-600'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* ── CENTER: 4 Game Cards Grid (2x2) ── */}
      <div className="flex-1 min-h-0 w-full grid grid-cols-2 grid-rows-2 gap-2 sm:gap-4 my-2">
        {games.map(game => (
          <GameCard
            key={game.id}
            game={game}
            isCompleted={completedGameIds.includes(game.id)}
            isSuggested={game.id === suggestedGameId}
            onSelect={onSelectGame}
          />
        ))}
      </div>
    </div>
  );
};
