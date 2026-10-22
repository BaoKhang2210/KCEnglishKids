import type { GameDefinition, GameId } from './core/types';
import type { Vocabulary } from '../types';
import { getWordType, isTransparentImage } from './core/targetSelector';

export const GAME_REGISTRY: Record<GameId, GameDefinition> = {
  'bubble-pop': {
    id: 'bubble-pop',
    category: 'tap_pop',
    title: 'Bubble Pop',
    subtitle: 'Pop the bubble!',
    icon: '🫧',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color', 'adjective'],
    instructionPhrase: 'pop_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/bubble-pop'),
  },
  'balloon-float': {
    id: 'balloon-float',
    category: 'tap_pop',
    title: 'Balloon Float',
    subtitle: 'Find all matching balloons!',
    icon: '🎈',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color', 'adjective'],
    instructionPhrase: 'pop_the',
    targetCountByAge: { '3-4': 3, '4-5': 4, '5-6': 5 },
    load: () => import('./templates/balloon-float'),
  },
  'tunnel-runner': {
    id: 'tunnel-runner',
    category: 'tap_pop',
    title: 'Tunnel Runner',
    subtitle: 'Help Koko catch the item!',
    icon: '🚇',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'number', 'color'],
    instructionPhrase: 'get_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/tunnel-runner'),
  },
  'prize-wheel': {
    id: 'prize-wheel',
    category: 'tap_pop',
    title: 'Prize Wheel',
    subtitle: 'Spin and pick the word!',
    icon: '🎡',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color'],
    instructionPhrase: 'touch_the',
    targetCountByAge: { '3-4': 3, '4-5': 4, '5-6': 5 },
    load: () => import('./templates/prize-wheel'),
  },
  'koko-says': {
    id: 'koko-says',
    category: 'tap_pop',
    title: 'Koko Says',
    subtitle: 'Listen and touch!',
    icon: '🐻',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color', 'adjective'],
    instructionPhrase: 'touch_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/koko-says'),
  },
  'memory-match': {
    id: 'memory-match',
    category: 'find_match',
    title: 'Memory Match',
    subtitle: 'Flip and match pairs!',
    icon: '🃏',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color'],
    instructionPhrase: 'match_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/memory-match'),
  },
  'shadow-puzzle': {
    id: 'shadow-puzzle',
    category: 'find_match',
    title: 'Shadow Puzzle',
    subtitle: 'Match with the shadow!',
    icon: '👤',
    gesture: 'drag',
    minVocab: 4,
    supportedWordTypes: ['noun', 'number'],
    requiresTransparentImage: true,
    instructionPhrase: 'match_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/shadow-puzzle'),
  },
  'peek-a-boo': {
    id: 'peek-a-boo',
    category: 'find_match',
    title: 'Peek-a-Boo',
    subtitle: 'Open the door to find it!',
    icon: '🚪',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'verb', 'number', 'color'],
    instructionPhrase: 'where_is_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/peek-a-boo'),
  },
  'feed-the-monsters': {
    id: 'feed-the-monsters',
    category: 'find_match',
    title: 'Feed the Monsters',
    subtitle: 'Sort treats to monsters!',
    icon: '👾',
    gesture: 'drag',
    minVocab: 4,
    supportedWordTypes: ['noun', 'color', 'number'],
    instructionPhrase: 'feed_the',
    targetCountByAge: { '3-4': 4, '4-5': 6, '5-6': 6 },
    load: () => import('./templates/feed-the-monsters'),
  },
  'mystery-boxes': {
    id: 'mystery-boxes',
    category: 'find_match',
    title: 'Mystery Boxes',
    subtitle: 'Which box holds the prize?',
    icon: '🎁',
    gesture: 'tap',
    minVocab: 4,
    supportedWordTypes: ['noun', 'number', 'color'],
    instructionPhrase: 'find_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/mystery-boxes'),
  },
  'picture-builder': {
    id: 'picture-builder',
    category: 'build_make',
    title: 'Picture Builder',
    subtitle: 'Put the puzzle together!',
    icon: '🧩',
    gesture: 'drag',
    minVocab: 4,
    supportedWordTypes: ['noun'],
    requiresImage: true,
    instructionPhrase: 'look_at_this',
    targetCountByAge: { '3-4': 4, '4-5': 4, '5-6': 5 },
    load: () => import('./templates/picture-builder'),
  },
  'kokos-delivery': {
    id: 'kokos-delivery',
    category: 'build_make',
    title: "Koko's Delivery",
    subtitle: 'Deliver items to Koko!',
    icon: '🧺',
    gesture: 'drag',
    minVocab: 4,
    supportedWordTypes: ['noun', 'number', 'color'],
    instructionPhrase: 'give_me_the',
    targetCountByAge: { '3-4': 4, '4-5': 5, '5-6': 6 },
    load: () => import('./templates/kokos-delivery'),
  },
};

/**
 * Chọn 4 game theo công thức xoay vòng cho mỗi lesson:
 * r = unitIndex * 4 + lessonIndex
 * 2 Tap & Pop, 1 Find & Match, 1 Build & Make
 */
export function getLessonGames(unitNumber: number = 1, lessonNumber: number = 1): GameDefinition[] {
  const r = (Math.max(1, unitNumber) - 1) * 4 + (Math.max(1, lessonNumber) - 1);

  const tapPops: GameId[] = ['bubble-pop', 'balloon-float', 'tunnel-runner', 'prize-wheel', 'koko-says'];
  const findMatches: GameId[] = ['memory-match', 'shadow-puzzle', 'peek-a-boo', 'feed-the-monsters', 'mystery-boxes'];
  const buildMakes: GameId[] = ['picture-builder', 'kokos-delivery'];

  const ids: GameId[] = [
    tapPops[r % tapPops.length],
    tapPops[(r + 2) % tapPops.length],
    findMatches[r % findMatches.length],
    buildMakes[r % buildMakes.length],
  ];

  return ids.map((id) => GAME_REGISTRY[id]).filter(Boolean);
}

export function getAvailableLessonGames(
  vocabularyList: Vocabulary[],
  unitNumber: number = 1,
  lessonNumber: number = 1,
): GameDefinition[] {
  return getLessonGames(unitNumber, lessonNumber).filter(game => {
    const usableWords = vocabularyList.filter(word =>
      game.supportedWordTypes.includes(getWordType(word)) &&
      (!game.requiresImage || Boolean(word.imageUrl)) &&
      (!game.requiresTransparentImage || isTransparentImage(word))
    );
    return usableWords.length >= game.minVocab;
  });
}
