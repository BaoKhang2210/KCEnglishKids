import gameRules from '../../../shared/learningGames.json';
import { selectGames } from '../utils/gameSelection';
import type { GameDefinition, GameId } from './core/types';
import type { Vocabulary } from '../types';
import { getWordType, isTransparentImage } from './core/targetSelector';
import { vocabularyMeaning } from '../utils/vocabularySemantics';

const loaders: Record<GameId, GameDefinition['load']> = {
  'bubble-pop': () => import('./templates/bubble-pop'),
  'balloon-float': () => import('./templates/balloon-float'),
  'tunnel-runner': () => import('./templates/tunnel-runner'),
  'prize-wheel': () => import('./templates/prize-wheel'),
  'koko-says': () => import('./templates/koko-says'),
  'memory-match': () => import('./templates/memory-match'),
  'shadow-puzzle': () => import('./templates/shadow-puzzle'),
  'peek-a-boo': () => import('./templates/peek-a-boo'),
  'feed-the-monsters': () => import('./templates/feed-the-monsters'),
  'mystery-boxes': () => import('./templates/mystery-boxes'),
  'picture-builder': () => import('./templates/picture-builder'),
  'kokos-delivery': () => import('./templates/kokos-delivery'),
};

// Metadata is shared with the server; only module loading belongs in the client.
export const GAME_REGISTRY = Object.fromEntries(gameRules.map(rule => [rule.id, {
  ...rule, load: loaders[rule.id as GameId],
}])) as Record<GameId, GameDefinition>;

/**
 * Chọn 4 game theo công thức xoay vòng cho mỗi lesson:
 * r = unitIndex * 4 + lessonIndex
 * 2 Tap & Pop, 1 Find & Match, 1 Build & Make
 */
export function getLessonGames(unitNumber: number = 1, lessonNumber: number = 1): GameDefinition[] {
  const games = Object.values(GAME_REGISTRY);
  return selectGames(games, games.map(game => game.id), unitNumber, lessonNumber);
}

export function getAvailableLessonGames(
  vocabularyList: Vocabulary[],
  unitNumber: number = 1,
  lessonNumber: number = 1,
  allowedGameIds?: string[],
): GameDefinition[] {
  const pool = Object.values(GAME_REGISTRY);
  const eligible = pool.filter(game => {
    const usableWords = vocabularyList.filter(word =>
      game.supportedWordTypes.includes(getWordType(word)) &&
      (!game.requiresImage || Boolean(word.imageUrl)) &&
      (!game.requiresTransparentImage || isTransparentImage(word))
    );
    return new Set(usableWords.map(vocabularyMeaning)).size >= game.minVocab;
  }).map(game => game.id);
  // API IDs already carry catalog selection and order; an empty list stays empty.
  if (allowedGameIds) return [...new Set(allowedGameIds)].filter(id => eligible.includes(id as GameId)).map(id => GAME_REGISTRY[id as GameId]).filter(Boolean);
  return selectGames(pool, eligible, unitNumber, lessonNumber);
}
