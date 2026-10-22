import { describe, it, expect } from 'vitest';
import {
  buildPracticeQuestions,
  buildPracticePlan,
  assignRoundOneVariants,
  PRACTICE_ROUNDS_PER_LESSON,
} from './buildPracticePlan';
import type { Vocabulary } from '../../../types';
import type { WordStats } from '../../../services/vocabStatsService';

const mockVocabs: Vocabulary[] = [
  { _id: 'w1', english: 'pencil', vietnamese: 'bút chì', category: 'school' },
  { _id: 'w2', english: 'book', vietnamese: 'sách', category: 'school' },
  { _id: 'w3', english: 'eraser', vietnamese: 'cục tẩy', category: 'school' },
  { _id: 'w4', english: 'ruler', vietnamese: 'thước kẻ', category: 'school' },
  { _id: 'w5', english: 'bag', vietnamese: 'cặp sách', category: 'school' },
  { _id: 'w6', english: 'crayon', vietnamese: 'bút sáp', category: 'school' },
  { _id: 'w7', english: 'scissors', vietnamese: 'kéo', category: 'school' },
  { _id: 'w8', english: 'desk', vietnamese: 'bàn học', category: 'school' },
];

describe('buildPracticeQuestions & buildPracticePlan standardization', () => {
  it('strictly satisfies formula: questions.length = words.length * 3', () => {
    // 5 words (like Lesson 1) -> exactly 15 questions
    const lesson1Words = mockVocabs.slice(0, 5);
    const plan5 = buildPracticeQuestions(lesson1Words, '4-5');
    expect(plan5.questions.length).toBe(15);
    expect(plan5.questions.length).toBe(lesson1Words.length * PRACTICE_ROUNDS_PER_LESSON);

    // 4 words -> exactly 12 questions
    const plan4 = buildPracticeQuestions(mockVocabs.slice(0, 4), '4-5');
    expect(plan4.questions.length).toBe(12);

    // 6 words -> exactly 18 questions
    const plan6 = buildPracticeQuestions(mockVocabs.slice(0, 6), '4-5');
    expect(plan6.questions.length).toBe(18);

    // 8 words -> exactly 24 questions
    const plan8 = buildPracticeQuestions(mockVocabs, '4-5');
    expect(plan8.questions.length).toBe(24);
  });

  it('keeps every word once per round and shuffles without adjacent word repeats', () => {
    const subset = mockVocabs.slice(0, 5);
    const expectedIds = subset.map((w) => w._id);
    const plan = buildPracticeQuestions(subset, '4-5');

    for (const turn of [1, 2, 3]) {
      const round = plan.questions.filter((question) => question.turn === turn);
      expect(round.map((question) => question.wordId).sort()).toEqual([...expectedIds].sort());
    }
    for (let index = 1; index < plan.questions.length; index += 1) {
      expect(plan.questions[index].wordId).not.toBe(plan.questions[index - 1].wordId);
    }
  });

  it('assigns balanced Round 1 variants with no run of three and preserves checkpoint assignments', () => {
    for (const count of [5, 6, 7]) {
      const plan = buildPracticeQuestions(mockVocabs.slice(0, count), '4-5');
      const roundOne = plan.questions.filter((question) => question.turn === 1);
      const counts = roundOne.reduce((result, question) => {
        result[question.variant!] = (result[question.variant!] || 0) + 1;
        return result;
      }, {} as Record<string, number>);
      expect(Math.abs((counts.A || 0) - (counts.B || 0))).toBeLessThanOrEqual(1);
      expect(roundOne.every((question) => question.activityId === (question.variant === 'A' ? 'listen-choose' : 'look-choose-word'))).toBe(true);
      for (let index = 2; index < roundOne.length; index += 1) {
        expect(roundOne[index].variant === roundOne[index - 1].variant && roundOne[index].variant === roundOne[index - 2].variant).toBe(false);
      }
    }

    const saved = { w1: 'B', w2: 'A' } as const;
    const resumed = assignRoundOneVariants(['w1', 'w2', 'w3'], ['A', 'B'], saved);
    expect(resumed.w1).toBe('B');
    expect(resumed.w2).toBe('A');
    expect(['A', 'B']).toContain(resumed.w3);
    expect(assignRoundOneVariants(['w1', 'w2'], ['A']).w1).toBe('A');
  });

  it('skips abstract picture-choice questions for ages under five and flags them for older children', () => {
    const abstractWords = mockVocabs.slice(0, 5).map((word) => ({ ...word, visualType: 'abstract' as const }));
    const youngerPlan = buildPracticeQuestions(abstractWords, '4-5', {}, undefined, 1);
    expect(youngerPlan.questions.filter((question) => question.turn === 1 && question.variant === 'A')).toHaveLength(0);

    const olderPlan = buildPracticeQuestions(abstractWords, '5-6', {}, undefined, 1);
    expect(olderPlan.questions.filter((question) => question.turn === 1 && question.variant === 'A').every((question) => question.isAbstractVisual)).toBe(true);
  });

  it('detects identical choice artwork as abstract', () => {
    const sameArtwork = mockVocabs.slice(0, 5).map((word) => ({ ...word, imageUrl: '/same.svg' }));
    const plan = buildPracticeQuestions(sameArtwork, '5-6', {}, undefined, 1);
    expect(plan.questions.filter((question) => question.turn === 1 && question.variant === 'A').every((question) => question.isAbstractVisual)).toBe(true);
  });

  it('each word appears exactly 3 times across all 3 rounds', () => {
    const plan = buildPracticePlan(mockVocabs.slice(0, 5), '4-5');
    const wordCounts: Record<string, number> = {};

    plan.questions.forEach((q) => {
      wordCounts[q.wordId] = (wordCounts[q.wordId] || 0) + 1;
    });

    mockVocabs.slice(0, 5).forEach((v) => {
      expect(wordCounts[v._id]).toBe(3);
    });
  });

  it('respects 3-4 age group constraints (no YN, no SS in round 3)', () => {
    const plan = buildPracticePlan(mockVocabs.slice(0, 5), '3-4');
    plan.questions.forEach((q) => {
      expect(q.type).not.toBe('YN');
      expect(q.type).not.toBe('SS');
    });
  });

  it('does not inflate initial question count even when stats have trouble words', () => {
    const stats: Record<string, WordStats> = {
      w1: {
        attempts: 4,
        firstTryCorrect: 1,
        wrong: 3,
        hints: 1,
        last6: [],
        confusions: { w2: 2 },
        typesCorrect: [],
        updatedAt: 1,
        mastery: 'learning',
        trouble: true,
      },
    };
    const plan = buildPracticePlan(mockVocabs.slice(0, 5), '4-5', stats);
    // Must strictly remain 15 questions
    expect(plan.questions.length).toBe(15);
  });

  it('uses the single Line Match activity for every Round 2 question', () => {
    for (const count of [2, 5, 7]) {
      const plan = buildPracticeQuestions(mockVocabs.slice(0, count), '5-6');
      const roundTwo = plan.questions.filter((question) => question.turn === 2);
      expect(roundTwo).toHaveLength(count);
      expect(roundTwo.every((question) => question.type === 'MATCH_LINES')).toBe(true);
      expect(roundTwo.every((question) => question.activityId === 'match-lines')).toBe(true);
      expect(roundTwo.every((question) => question.activityName === 'Line Match')).toBe(true);
    }
  });

  it('skips abstract words in Round 2 under age five and flags them as text cards at 5-6', () => {
    const mixed: Vocabulary[] = [
      ...mockVocabs.slice(0, 3),
      { _id: 'mon', english: 'Monday', vietnamese: 'thứ hai', category: 'school', visualType: 'abstract' },
    ];
    const youngPlan = buildPracticeQuestions(mixed, '4-5');
    expect(youngPlan.questions.filter((question) => question.turn === 2 && question.wordId === 'mon')).toHaveLength(0);
    expect(youngPlan.questions.filter((question) => question.turn === 2)).toHaveLength(3);

    const olderPlan = buildPracticeQuestions(mixed, '5-6');
    const monday = olderPlan.questions.find((question) => question.turn === 2 && question.wordId === 'mon');
    expect(monday?.isAbstractVisual).toBe(true);
    expect(olderPlan.questions.filter((question) => question.turn === 2)).toHaveLength(4);
  });
});
