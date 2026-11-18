import { expect, it } from 'vitest';
import rules from '../../../shared/learningGames.json';
import { selectGames } from '../../../shared/gameSelection.cjs';
import { GAME_REGISTRY, getAvailableLessonGames } from './registry';
import type { Vocabulary } from '../types';

const words = ['cat', 'dog', 'bird', 'cow', 'duck', 'fish'].map((english, i) => ({ _id: String(i), english, imageUrl: '/'+english+'.png', isTransparent: true, wordType: 'noun', status: 'ACTIVE' })) as Vocabulary[];
it('client metadata exactly follows the server specification', () => {
  for (const rule of rules) { const { load: _load, ...metadata } = GAME_REGISTRY[rule.id as keyof typeof GAME_REGISTRY]; expect(metadata).toEqual(rule); }
});
it('catalog selection rotates without disabled games or duplicates', () => {
  const catalog = rules.map((game, i) => ({ ...game, enabled: i !== 0 }));
  const rounds = Array.from({ length: 8 }, (_, i) => selectGames(catalog, rules.map(game => game.id), 1, i + 1).map(game => game.id));
  expect(new Set(rounds.map(ids => ids.join(','))).size).toBeGreaterThan(1);
  for (const ids of rounds) { expect(ids).toHaveLength(4); expect(new Set(ids).size).toBe(4); expect(ids).not.toContain('bubble-pop'); }
});
it('API-issued game selection and its order remain authoritative, even when empty', () => {
  expect(getAvailableLessonGames(words, 1, 1, [])).toEqual([]);
  expect(getAvailableLessonGames(words, 1, 1, ['koko-says', 'bubble-pop']).map(game => game.id)).toEqual(['koko-says', 'bubble-pop']);
  expect(getAvailableLessonGames(words.map(word => ({ ...word, isTransparent: false })), 1, 1, ['shadow-puzzle'])).toEqual([]);
});
