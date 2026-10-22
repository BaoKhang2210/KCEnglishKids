import type { Vocabulary } from '../../types';
import type { WordType } from './types';

const NUMBER_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const COLOR_WORDS = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey'];
const VERB_HINTS = ['run', 'jump', 'eat', 'sleep', 'play', 'walk', 'sit', 'stand', 'clap', 'sing', 'dance', 'drink'];

const CATEGORY_WORD_TYPE: Record<string, WordType> = {
  colors: 'color',
  color: 'color',
  numbers: 'number',
  number: 'number',
  actions: 'verb',
  verbs: 'verb',
  action: 'verb',
};

export function getWordType(v: Vocabulary): WordType {
  if (v.wordType) return v.wordType;
  const word = (v.english || '').toLowerCase().trim();
  if (NUMBER_WORDS.includes(word)) return 'number';
  if (COLOR_WORDS.includes(word)) return 'color';
  if (VERB_HINTS.includes(word)) return 'verb';
  const cat = (v.category || '').toLowerCase().trim();
  if (CATEGORY_WORD_TYPE[cat]) return CATEGORY_WORD_TYPE[cat];
  return 'noun';
}

export function isTransparentImage(v: Vocabulary): boolean {
  if (typeof v.isTransparent === 'boolean') return v.isTransparent;
  const url = (v.imageUrl || '').split('?')[0].toLowerCase();
  return /\.(png|svg|webp)$/.test(url);
}

export function isCountable(v: Vocabulary): boolean {
  if (typeof v.countable === 'boolean') return v.countable;
  const type = getWordType(v);
  return type === 'noun' || type === 'number';
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Chọn danh sách target IDs cho bài chơi:
 * - Ưu tiên từ cần ôn (nếu có priorityWordIds)
 * - Mỗi từ xuất hiện 1 lần trước khi lặp lại
 * - Không bao giờ để 1 từ làm mục tiêu 2 lần liên tiếp
 */
export function buildTargetSequence(
  vocabList: Vocabulary[],
  targetCount: number,
  supportedWordTypes: WordType[],
  priorityWordIds?: string[]
): string[] {
  const eligible = vocabList.filter(v => supportedWordTypes.includes(getWordType(v)));
  const poolSource = eligible;
  if (poolSource.length === 0 || targetCount <= 0) return [];

  const prioritySet = new Set(priorityWordIds || []);
  const highPriority = poolSource.filter(v => prioritySet.has(v._id));
  const normal = poolSource.filter(v => !prioritySet.has(v._id));

  const pool = [...shuffleArray(highPriority), ...shuffleArray(normal)].map(v => v._id);
  const result: string[] = [];

  while (result.length < targetCount) {
    let added = false;
    for (const id of pool) {
      if (result.length >= targetCount) break;
      if (result.length > 0 && result[result.length - 1] === id && pool.length > 1) {
        continue;
      }
      result.push(id);
      added = true;
    }
    if (!added) break;
  }

  return result.slice(0, targetCount);
}

/**
 * Chọn từ nhiễu (distractors):
 * - Ưu tiên từ cùng lesson (khác target)
 * - Nếu thiếu lấy từ distractorPool (cùng unit)
 */
export function pickDistractors(
  targetId: string,
  lessonVocab: Vocabulary[],
  distractorPool: Vocabulary[] = [],
  neededCount: number
): Vocabulary[] {
  if (neededCount <= 0) return [];

  const othersInLesson = lessonVocab.filter(v => v._id !== targetId);
  const shuffledLesson = shuffleArray(othersInLesson);

  if (shuffledLesson.length >= neededCount) {
    return shuffledLesson.slice(0, neededCount);
  }

  const result = [...shuffledLesson];
  const neededFromPool = neededCount - result.length;

  const poolOthers = distractorPool.filter(
    v => v._id !== targetId && !result.some(r => r._id === v._id)
  );

  const shuffledPool = shuffleArray(poolOthers);
  result.push(...shuffledPool.slice(0, neededFromPool));

  return result;
}
