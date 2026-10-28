import { learningArt } from '../data/learningArt';

const vocabulary = learningArt.vocabulary as Record<string, { english: string; url: string; animationUrl: string; isTransparent: boolean; visualType: string }>;
const symbols = learningArt.symbols as Record<string, string>;
export const artKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
export const wordArt = (word: string) => vocabulary[artKey(word)];
export const symbolArt = (symbol: string) => symbols[symbol];
export const topicArt = (slug?: string) => slug ? (learningArt.topics as Record<string, { url: string }>)[slug]?.url : undefined;

const byLength = Object.values(vocabulary).sort((a, b) => b.english.length - a.english.length);
export function sentenceArt(text = '', fallback?: string | null, isAnswer = false): string {
  if (fallback && !fallback.startsWith('data:image/svg+xml')) return fallback;
  if (isAnswer && /^\s*yes\b/i.test(text)) return symbols['👍'];
  if (isAnswer && /^\s*no\b/i.test(text)) return symbols['✋'];
  const phrase = byLength.find(v => new RegExp('(?:^|\\W)' + v.english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=$|\\W)', 'i').test(text));
  return phrase?.url || symbols[text.includes('?') ? '❓' : '💬'];
}
