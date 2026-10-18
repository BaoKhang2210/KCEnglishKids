import { describe, it, expect } from 'vitest';
import {
  buildPracticeQuestions,
  buildPracticePlan,
  PRACTICE_ROUNDS_PER_LESSON,
} from './buildPracticePlan';
import type { Vocabulary, AgeGroupCode } from '../../../types';
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

  it('guarantees sequential order Word 1 -> Word N for all 3 rounds', () => {
    const subset = mockVocabs.slice(0, 5);
    const expectedIds = subset.map((w) => w._id);
    const plan = buildPracticeQuestions(subset, '4-5');

    // Round 1 (index 0 to 4)
    const round1Ids = plan.questions.slice(0, 5).map((q) => q.wordId);
    expect(round1Ids).toEqual(expectedIds);
    plan.questions.slice(0, 5).forEach((q) => expect(q.turn).toBe(1));

    // Round 2 (index 5 to 9)
    const round2Ids = plan.questions.slice(5, 10).map((q) => q.wordId);
    expect(round2Ids).toEqual(expectedIds);
    plan.questions.slice(5, 10).forEach((q) => expect(q.turn).toBe(2));

    // Round 3 (index 10 to 14)
    const round3Ids = plan.questions.slice(10, 15).map((q) => q.wordId);
    expect(round3Ids).toEqual(expectedIds);
    plan.questions.slice(10, 15).forEach((q) => expect(q.turn).toBe(3));
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
});
