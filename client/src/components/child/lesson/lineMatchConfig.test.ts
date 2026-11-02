import { describe, it, expect } from 'vitest';
import {
  LINE_MATCH_MAX_PAIRS,
  LINE_MATCH_HINT_ATTEMPTS,
  LINE_MATCH_REVEAL_ATTEMPTS,
  maxPairsThatFit,
  partitionRoundTwoBoards,
  boardOwnSizes,
  boardIndexForQuestionIndex,
  boardStartIndex,
  shuffleRightColumn,
  markAbstractRoundTwoWords,
  rowHeightFor,
  selectLineMatchDistractors,
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
    expect(partitionRoundTwoBoards(3, 2)).toEqual([[0, 1], [2]]);
  });

  it('never duplicates a target to fill a small board', () => {
    expect(partitionRoundTwoBoards(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
    expect(partitionRoundTwoBoards(7, 2)).toEqual([[0, 1], [2, 3], [4, 5], [6]]);
  });

  it('covers every word at least once and keeps boards small', () => {
    for (const [total, max] of [[5, 2], [6, 3], [11, 3], [8, 4], [7, 2], [4, 3]] as const) {
      const boards = partitionRoundTwoBoards(total, max);
      const covered = new Set(boards.flat());
      expect(covered.size).toBe(total);
      expect([...covered].sort((a, b) => a - b)).toEqual(Array.from({ length: total }, (_, i) => i));
      for (const board of boards) expect(board.length).toBeLessThanOrEqual(max);
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
    expect(LINE_MATCH_MAX_PAIRS['5-6']).toBe(3);
  });
});

describe('age-sensitive help', () => {
  it('shows hints later for older learners and keeps an extra attempt after the 4–5 hint', () => {
    expect(LINE_MATCH_HINT_ATTEMPTS).toEqual({ '3-4': 2, '4-5': 3, '5-6': Number.POSITIVE_INFINITY });
    expect(LINE_MATCH_REVEAL_ATTEMPTS).toEqual({ '3-4': 3, '4-5': 4, '5-6': 3 });
  });
});

describe('selectLineMatchDistractors', () => {
  it('excludes board targets, duplicate meanings and duplicate artwork', () => {
    const board = [word('father', '/father.png')];
    const candidates = [
      word('dad', '/dad.png'),
      word('father', '/other-father.png'),
      word('kitten', '/kitten.png'),
      word('dog', '/dog.png'),
      word('wolf', '/dog.png'),
      word('bird', '/bird.png'),
    ];
    const chosen = selectLineMatchDistractors(board, candidates, 3);
    expect(chosen.map((entry) => entry._id)).toEqual(expect.arrayContaining(['dog', 'bird']));
    expect(chosen).toHaveLength(3);
    expect(new Set(chosen.map((entry) => entry.imageUrl)).size).toBe(3);
    expect(chosen.some((entry) => ['dad', 'father'].includes(String(entry._id)))).toBe(false);
  });
});
