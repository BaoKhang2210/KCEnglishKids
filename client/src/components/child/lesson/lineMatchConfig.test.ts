import { describe, it, expect } from 'vitest';
import {
  LINE_MATCH_MAX_PAIRS,
  maxPairsThatFit,
  partitionRoundTwoBoards,
  boardOwnSizes,
  boardIndexForQuestionIndex,
  boardStartIndex,
  shuffleRightColumn,
  markAbstractRoundTwoWords,
  rowHeightFor,
} from './lineMatchConfig';
import type { Vocabulary } from '../../../types';

const word = (id: string, imageUrl?: string): Vocabulary =>
  ({ _id: id, english: id, vietnamese: id, ...(imageUrl ? { imageUrl } : {}) } as Vocabulary);

describe('partitionRoundTwoBoards', () => {
  it('matches the spec examples', () => {
    expect(partitionRoundTwoBoards(5, 4)).toEqual([[0, 1, 2], [3, 4]]);
    expect(partitionRoundTwoBoards(6, 4)).toEqual([[0, 1, 2], [3, 4, 5]]);
    expect(partitionRoundTwoBoards(7, 4)).toEqual([[0, 1, 2, 3], [4, 5, 6]]);
    expect(partitionRoundTwoBoards(2, 2)).toEqual([[0, 1]]);
    // 3 words & max 2 → singleton board borrows one word (appears twice)
    expect(partitionRoundTwoBoards(3, 2)).toEqual([[0, 1], [2, 1]]);
  });

  it('borrows so every board has at least 2 items when possible', () => {
    // 5 words & max 2 → [[0,1],[2,3],[4,3]] — the singleton board borrows index 3
    expect(partitionRoundTwoBoards(5, 2)).toEqual([[0, 1], [2, 3], [4, 3]]);
    // 7 words & max 2 → [[0,1],[2,3],[4,5],[6,5]]
    expect(partitionRoundTwoBoards(7, 2)).toEqual([[0, 1], [2, 3], [4, 5], [6, 5]]);
  });

  it('covers every word at least once and keeps boards small', () => {
    for (const [total, max] of [[5, 2], [6, 3], [11, 3], [8, 4], [7, 2], [4, 3]] as const) {
      const boards = partitionRoundTwoBoards(total, max);
      const covered = new Set(boards.flat());
      expect(covered.size).toBe(total);
      expect([...covered].sort((a, b) => a - b)).toEqual(Array.from({ length: total }, (_, i) => i));
      // A board exceeds maxPairs only by the single borrowed word.
      for (const board of boards) {
        expect(board.length).toBeLessThanOrEqual(max + 1);
      }
    }
  });

  it('handles a single board when total fits the max', () => {
    expect(partitionRoundTwoBoards(4, 4)).toEqual([[0, 1, 2, 3]]);
    expect(partitionRoundTwoBoards(2, 4)).toEqual([[0, 1]]);
  });
});

describe('boardOwnSizes', () => {
  it('keeps flat index ranges contiguous per board', () => {
    expect(boardOwnSizes(5, 2)).toEqual([2, 2, 1]);
    expect(boardOwnSizes(5, 4)).toEqual([3, 2]);
    expect(boardIndexForQuestionIndex(3, boardOwnSizes(5, 4))).toBe(1);
    expect(boardStartIndex(1, boardOwnSizes(5, 4))).toBe(3);
  });
});

describe('board index helpers', () => {
  it('maps flat question indexes to boards and back', () => {
    const sizes = [3, 2];
    expect(boardIndexForQuestionIndex(0, sizes)).toBe(0);
    expect(boardIndexForQuestionIndex(2, sizes)).toBe(0);
    expect(boardIndexForQuestionIndex(3, sizes)).toBe(1);
    expect(boardIndexForQuestionIndex(4, sizes)).toBe(1);
    expect(boardStartIndex(1, sizes)).toBe(3);
    expect(boardStartIndex(0, sizes)).toBe(0);
  });
});

describe('shuffleRightColumn', () => {
  it('is never the identity order', () => {
    const left = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 30; i += 1) {
      const order = shuffleRightColumn(left);
      expect(order.join()).not.toBe(left.join());
      expect([...order].sort().join()).toEqual([...left].sort().join());
    }
  });

  it('keeps at most 1 horizontally aligned item', () => {
    const left = ['a', 'b', 'c'];
    for (let i = 0; i < 30; i += 1) {
      const order = shuffleRightColumn(left);
      const aligned = order.filter((id, index) => id === left[index]).length;
      expect(aligned).toBeLessThanOrEqual(1);
    }
  });
});

describe('maxPairsThatFit / rowHeightFor', () => {
  it('drops to fewer pairs when the height cannot fit ≥72px rows', () => {
    // contentH 211 ≈ landscape phone (375 - 56 - 40 - 44 - padding): n=2 fits, n=3 does not
    expect(maxPairsThatFit(211, 4)).toBe(2);
    expect(maxPairsThatFit(600, 4)).toBe(4);
    expect(maxPairsThatFit(160, 4)).toBe(2);
  });

  it('clamps row height between 72 and 132', () => {
    expect(rowHeightFor(1000, 2)).toBe(132);
    expect(rowHeightFor(211, 2)).toBe(99.5);
    expect(rowHeightFor(100, 4)).toBe(72);
  });
});

describe('markAbstractRoundTwoWords', () => {
  it('flags explicit abstract words and duplicated artwork', () => {
    const words = [
      { ...word('monday'), visualType: 'abstract' as const },
      word('tuesday'),
      word('pencil', '/img/pencil.png'),
      word('pen', '/img/pencil.png'),
      word('book', '/img/book.png'),
    ];
    const abstract = markAbstractRoundTwoWords(words);
    expect(abstract.has('monday')).toBe(true);
    expect(abstract.has('pencil')).toBe(true);
    expect(abstract.has('pen')).toBe(true);
    expect(abstract.has('book')).toBe(false);
    expect(abstract.has('tuesday')).toBe(false);
  });
});

describe('LINE_MATCH_MAX_PAIRS', () => {
  it('matches the age hypotheses', () => {
    expect(LINE_MATCH_MAX_PAIRS['3-4']).toBe(2);
    expect(LINE_MATCH_MAX_PAIRS['4-5']).toBe(3);
    expect(LINE_MATCH_MAX_PAIRS['5-6']).toBe(4);
  });
});
