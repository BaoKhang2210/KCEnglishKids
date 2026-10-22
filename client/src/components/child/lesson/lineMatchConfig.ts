/**
 * lineMatchConfig.ts
 * ------------------
 * Single params + pure-helper file for Stage 2 Round 2 ("Vòng 2: Kết nối") —
 * the LINE MATCHING activity (draw/tap lines between words and pictures).
 *
 * Difficulty hypotheses to validate with real children (pairs per board by age):
 *   3–4 → 2 pairs, 4–5 → 3 pairs, 5–6 → 4 pairs.
 * All tunable constants live here; the engine reads them, never hardcodes.
 */

import type { AgeGroupCode, Vocabulary } from '../../../types';
import { shuffle, type PracticeQuestion } from './buildPracticePlan';

export type LineMatchAgeGroup = AgeGroupCode;

/** Max word pairs shown on one board, per age group. */
export const LINE_MATCH_MAX_PAIRS: Record<LineMatchAgeGroup, number> = {
  '3-4': 2,
  '4-5': 3,
  '5-6': 4,
};

/** One line color per left item index (index = position of the left card). NEVER red. */
export const LINE_COLORS = ['#FBBF24', '#38BDF8', '#34D399', '#F472B6'] as const;

/** Line stroke width in px (main line; a +4px halo is drawn underneath). */
export function lineWidthForAge(ageGroup: LineMatchAgeGroup): number {
  return ageGroup === '3-4' ? 12 : 10;
}

/** Magnet snap distance in px (pointer → valid node center). */
export function magnetRadiusForAge(ageGroup: LineMatchAgeGroup): number {
  return ageGroup === '3-4' ? 72 : 56;
}

/** Layout constants (px). Channel width is a CSS clamp — mirrored here for measurement. */
export const LINE_MATCH_LAYOUT = {
  rowGap: 12,
  minRowHeight: 72,
  maxRowHeight: 132,
  /** clamp(96px, 18vw, 260px) — 96px floor covers portrait phones per spec. */
  channelWidthCss: 'clamp(96px, 18vw, 260px)',
  nodeVisibleDiameter: 28,
  nodeHitSize: 72,
  nodeHitSizeLarge: 96,
  largeScreenMinWidth: 1024,
  dragPointerDot: 24,
} as const;

/** Timing constants (ms) for transform/opacity/stroke-dashoffset animations. */
export const LINE_MATCH_TIMING = {
  snap: 120,
  correctDrawIn: 250,
  nodePing: 400,
  wrongRecoil: 350,
  boardWave: 600,
  tapLineDraw: 300,
  boardCompleteAdvance: 1200,
  idleHint: 8000,
} as const;

/** Wrong attempts on one word that trigger the pulsing correct-node hint. */
export const HINT_ATTEMPTS = 2;
/** Wrong attempts on one word after which the correct line is auto-drawn (still earns the star). */
export const REVEAL_ATTEMPTS = 3;

export const LINE_MATCH_PRAISES = ['Great job!', 'Good job!', 'Awesome!'];
export function randomLineMatchPraise(): string {
  return LINE_MATCH_PRAISES[Math.floor(Math.random() * LINE_MATCH_PRAISES.length)];
}

export const LINE_MATCH_WRONG_MESSAGES = [
  'Try again! You can do it!',
];

/**
 * How many pairs fit at ≥72px row height for a given content height.
 * rowHeight = clamp(72, (contentH − (n−1)*12) / n, 132). Returns the largest
 * n ≤ maxPairs whose unclamped height clears the 72px floor (n ≥ 1).
 */
export function maxPairsThatFit(contentHeight: number, maxPairs: number): number {
  for (let n = maxPairs; n >= 1; n -= 1) {
    const rowH = (contentHeight - (n - 1) * LINE_MATCH_LAYOUT.rowGap) / n;
    if (rowH >= LINE_MATCH_LAYOUT.minRowHeight) return n;
  }
  return 1;
}

/** Unclamped row height used for sizing the board rows. */
export function rowHeightFor(contentHeight: number, pairs: number): number {
  if (pairs <= 0) return LINE_MATCH_LAYOUT.minRowHeight;
  const raw = (contentHeight - (pairs - 1) * LINE_MATCH_LAYOUT.rowGap) / pairs;
  return Math.max(LINE_MATCH_LAYOUT.minRowHeight, Math.min(LINE_MATCH_LAYOUT.maxRowHeight, raw));
}

/**
 * Partition `total` round-2 words into k = ceil(total / maxPairs) boards whose
 * sizes are as equal as possible. Returns arrays of flat word indexes per board.
 *
 * Every board holds ≥ 2 items: if a board would end up with a single item, one
 * word is BORROWED — it appears a second time in that board (spec: "5 words &
 * max 2 → 2+2+(1 + 1 borrowed)"), so some indexes occur in two boards. Borrowed
 * copies are rendered pre-matched if the word was already matched elsewhere.
 * Examples: 5 & max 4 → [[0,1,2],[3,4]]; 6 → [[0,1,2],[3,4,5]]; 7 → [[0,1,2,3],[4,5,6]];
 *           5 & max 2 → [[0,1],[2,3],[4,3]].
 */
export function partitionRoundTwoBoards(total: number, maxPairs: number): number[][] {
  if (total <= 0) return [];
  const capped = Math.max(1, maxPairs);
  if (total <= capped) return [Array.from({ length: total }, (_, index) => index)];

  const k = Math.ceil(total / capped);
  const base = Math.floor(total / k);
  const remainder = total % k;
  const boards: number[][] = [];
  let next = 0;
  for (let board = 0; board < k; board += 1) {
    const size = base + (board < remainder ? 1 : 0);
    boards.push(Array.from({ length: size }, () => next++));
  }

  // Borrow one word for singleton boards (last item of the largest other board).
  for (let board = 0; board < boards.length; board += 1) {
    if (boards[board].length !== 1) continue;
    let donor = -1;
    for (let candidate = 0; candidate < boards.length; candidate += 1) {
      if (candidate === board) continue;
      if (donor === -1 || boards[candidate].length >= boards[donor].length) donor = candidate;
    }
    const donorBoard = donor >= 0 ? boards[donor] : undefined;
    if (donorBoard && donorBoard.length >= 2) boards[board].push(donorBoard[donorBoard.length - 1]);
  }
  return boards;
}

/**
 * Own (non-borrowed) word counts per board — flat question indexes advance in
 * this order, so a flat index maps to exactly one board via these sizes.
 */
export function boardOwnSizes(total: number, maxPairs: number): number[] {
  if (total <= 0) return [];
  const capped = Math.max(1, maxPairs);
  if (total <= capped) return [total];
  const k = Math.ceil(total / capped);
  const base = Math.floor(total / k);
  const remainder = total % k;
  return Array.from({ length: k }, (_, board) => base + (board < remainder ? 1 : 0));
}

/** Map a flat round-2 question index to its board index given board sizes. */
export function boardIndexForQuestionIndex(questionIndex: number, sizes: number[]): number {
  let acc = 0;
  for (let board = 0; board < sizes.length; board += 1) {
    acc += sizes[board];
    if (questionIndex < acc) return board;
  }
  return Math.max(0, sizes.length - 1);
}

/** First flat question index of a board given board sizes. */
export function boardStartIndex(boardIndex: number, sizes: number[]): number {
  return sizes.slice(0, boardIndex).reduce((sum, size) => sum + size, 0);
}

/**
 * Shuffle the right column so that AT MOST 1 right item is horizontally aligned
 * with its match, and the result is never the identity order. Rejection sampling
 * with a deterministic rotation fallback.
 */
export function shuffleRightColumn(leftWordIds: string[]): string[] {
  if (leftWordIds.length <= 1) return [...leftWordIds];
  const alignedCount = (order: string[]) => order.filter((id, i) => id === leftWordIds[i]).length;
  const identity = leftWordIds.join('\u0000');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = shuffle(leftWordIds);
    if (candidate.join('\u0000') !== identity && alignedCount(candidate) <= 1) return candidate;
  }
  // Fallback: rotate by one (guarantees zero alignment for length ≥ 2).
  return [...leftWordIds.slice(1), leftWordIds[0]];
}

export interface RoundTwoWordMeta {
  wordId: string;
  word: Vocabulary;
  /** Words without a distinct picture: text cards at 5–6, skipped under age 5. */
  isAbstract: boolean;
}

/**
 * Abstract detection for Round 2: explicit `visualType: 'abstract'`, or several
 * right-side pictures sharing the same asset within the round cohort.
 */
export function markAbstractRoundTwoWords(words: Vocabulary[]): Set<string> {
  const abstract = new Set<string>();
  const byUrl = new Map<string, string>();
  for (const word of words) {
    const id = word._id || (word as any).id || word.english;
    if (word.visualType === 'abstract') abstract.add(id);
    if (word.imageUrl) {
      const owner = byUrl.get(word.imageUrl);
      if (owner && owner !== id) {
        abstract.add(id);
        abstract.add(owner);
      } else {
        byUrl.set(word.imageUrl, id);
      }
    }
  }
  return abstract;
}

export const wordIdOf = (word: Vocabulary | PracticeQuestion): string => {
  if ('wordId' in word) return word.wordId;
  return word._id || (word as any).id || word.english;
};
