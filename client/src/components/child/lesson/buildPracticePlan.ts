/**
 * buildPracticePlan
 * -----------------
 * Generates an adaptive, non-reading practice plan across 5 child-friendly activity types:
 *  - LT: Listen & Tap (Nghe & chạm)
 *  - FS: Find in Scene (Tìm trong lớp)
 *  - GK: Give to Koko (Đưa cho Koko)
 *  - YN: Yes/No (Đúng hay không)
 *  - SS: Starting Sound (Âm đầu)
 *
 * Rules:
 *  1. Every word appears EXACTLY 3 turns with 3 different activity types:
 *     - Turn 1: LT (warm-up / confidence builder)
 *     - Turn 2: FS or GK
 *     - Turn 3: YN (4-6), SS (5-6 or 4-5 easy), or advanced LT
 *  2. Interleaving:
 *     - No same word asked 2 consecutive questions
 *     - No same activity type >= 2 consecutive questions
 *     - Correct answer position is randomized
 *  3. Distractor selection:
 *     - Prioritize: (1) child's previous confusions, (2) same category/semantics, (3) other words in lesson
 *  4. Weak words priority:
 *     - Words with trouble=true in vocabStats appear earlier in turn 1 and receive a bonus review turn.
 */

import type { Vocabulary, AgeGroupCode } from '../../../types';
import type { WordStats } from '../../../services/vocabStatsService';
import { PRACTICE_ROUNDS_PER_LESSON } from '../../../config/lessonConfig';

export { PRACTICE_ROUNDS_PER_LESSON };

export type ActivityType = 'LT' | 'FS' | 'GK' | 'YN' | 'SS';

export interface PracticeQuestion {
  id: string;
  wordId: string;
  targetVocab: Vocabulary;
  type: ActivityType;
  turn: 1 | 2 | 3 | 'bonus';
  /** All options shown on screen, target included */
  options: Vocabulary[];
  /** For YN: whether Koko's claim is true or false */
  isTrueClaim?: boolean;
  /** For YN: the word Koko says in "Is it a [word]?" */
  claimedWord?: string;
  /** For SS: the starting sound phoneme (e.g. '/p/') and letter */
  startingSound?: { phoneme: string; letter: string };
  /** Is this an introductory auto-run card (3s intro for unseen words) */
  isIntroCard?: boolean;
  /** Distractor options count */
  optionsCount: number;
}

export interface PracticePlanConfig {
  questions: PracticeQuestion[];
  wordMap: Record<string, Vocabulary>;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Max options allowed by age group */
export function getAgeOptionsLimits(ageGroup: AgeGroupCode): {
  ltStart: number;
  ltMax: number;
  fsCount: number;
  gkCount: number;
  allowsYN: boolean;
  allowsSS: boolean;
} {
  // NOTE: Only even counts (2 or 4) are allowed so the 2-column grid is always uniform
  if (ageGroup === '3-4') {
    return { ltStart: 2, ltMax: 2, fsCount: 4, gkCount: 2, allowsYN: false, allowsSS: false };
  }
  if (ageGroup === '4-5') {
    return { ltStart: 2, ltMax: 4, fsCount: 4, gkCount: 4, allowsYN: true, allowsSS: false };
  }
  // 5-6
  return { ltStart: 4, ltMax: 4, fsCount: 4, gkCount: 4, allowsYN: true, allowsSS: true };
}

/** Extract phonetic starting letter/sound */
export function getStartingSound(word: string): { phoneme: string; letter: string } {
  const clean = (word || '').trim().toLowerCase();
  const letter = clean.charAt(0).toUpperCase() || 'A';
  return {
    letter,
    phoneme: `/${letter.toLowerCase()}/`,
  };
}

/** Smart distractor picker */
export function pickDistractors(
  target: Vocabulary,
  pool: Vocabulary[],
  count: number,
  confusions?: Record<string, number>
): Vocabulary[] {
  const targetId = target._id || (target as any).id || target.english;
  const available = pool.filter(
    (v) => (v._id || (v as any).id || v.english) !== targetId
  );

  if (available.length === 0) return [];

  // Sort by:
  // 1. Confusions count descending
  // 2. Same category match
  // 3. Random shuffle
  const scored = available.map((v) => {
    const vId = v._id || (v as any).id || v.english;
    const confusionScore = confusions?.[vId] || 0;
    const sameCat = (v as any).category && (v as any).category === (target as any).category ? 2 : 0;
    return {
      vocab: v,
      score: confusionScore * 5 + sameCat + Math.random(),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.vocab);
}

/**
 * Re-order questions so:
 * - No same wordId in 2 consecutive questions
 * - No same activity type in > 2 consecutive questions
 */
export function interleaveQuestions(questions: PracticeQuestion[]): PracticeQuestion[] {
  if (questions.length <= 2) return questions;
  const list = [...questions];

  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const cur = list[i];
    const prevPrev = i >= 2 ? list[i - 2] : null;

    const sameWord = cur.wordId === prev.wordId;
    const sameTypeTriple = prevPrev && cur.type === prev.type && cur.type === prevPrev.type;

    if (sameWord || sameTypeTriple) {
      // Find a swap target further ahead
      const swapIdx = list.findIndex(
        (cand, j) =>
          j > i &&
          cand.wordId !== prev.wordId &&
          (!prevPrev || cand.type !== prev.type || cand.type !== prevPrev.type)
      );
      if (swapIdx !== -1) {
        [list[i], list[swapIdx]] = [list[swapIdx], list[i]];
      }
    }
  }

  return list;
}

/**
 * buildPracticeQuestions / buildPracticePlan
 * -----------------------------------------
 * Standardized question generator for Stage 2 (Practice Stage).
 * Formula: TOTAL_PRACTICE_QUESTIONS = LESSON_WORDS_COUNT * PRACTICE_ROUNDS_COUNT (default = 3)
 * Sequence: Each round iterates strictly through words in sequential order (Word 0 -> Word N-1).
 *   Round 1: LT (Listen & Tap)
 *   Round 2: GK (Give to Koko)
 *   Round 3: YN (Yes/No) / SS (Starting Sound) / LT (advanced) based on age constraints
 */
export function buildPracticeQuestions(
  vocabulary: Vocabulary[],
  ageGroup: AgeGroupCode = '4-5',
  vocabStats: Record<string, WordStats> = {},
  seenWordIds?: Set<string>,
  roundsCount: number = PRACTICE_ROUNDS_PER_LESSON
): PracticePlanConfig {
  if (!vocabulary || vocabulary.length === 0) {
    return { questions: [], wordMap: {} };
  }

  // Deduplicate words preserving original lesson order
  const seen = new Set<string>();
  const words = vocabulary.filter((v) => {
    const id = v._id || (v as any).id || v.english;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const wordMap: Record<string, Vocabulary> = {};
  words.forEach((w) => {
    const id = w._id || (w as any).id || w.english;
    wordMap[id] = w;
  });

  const limits = getAgeOptionsLimits(ageGroup);
  const questions: PracticeQuestion[] = [];

  // Traverse in sequential order: Word 1 -> Word N for each round
  // ROUND 1: RECOGNIZE (LT - Listen & Choose)
  words.forEach((word) => {
    const wordId = word._id || (word as any).id || word.english;
    const stat = vocabStats[wordId];
    const confusions = stat?.confusions;
    const isNewUnseen = seenWordIds ? !seenWordIds.has(wordId) : false;

    const lt1DistractorCount = Math.min(limits.ltStart - 1, words.length - 1);
    const ltDistractors = pickDistractors(word, words, lt1DistractorCount, confusions);
    const ltTotalRaw = [word, ...ltDistractors];
    const ltTotal = ltTotalRaw.length % 2 !== 0 ? ltTotalRaw.slice(0, ltTotalRaw.length - 1) : ltTotalRaw;
    const ltOptions = shuffle(ltTotal.length >= 2 ? ltTotal : [word, ltDistractors[0] ?? word]);

    questions.push({
      id: `t1_${wordId}`,
      wordId,
      targetVocab: word,
      type: 'LT',
      turn: 1,
      options: ltOptions,
      optionsCount: ltOptions.length,
      isIntroCard: isNewUnseen,
    });
  });

  // ROUND 2: CONNECT (GK - Give to Koko / FS)
  words.forEach((word) => {
    const wordId = word._id || (word as any).id || word.english;
    const stat = vocabStats[wordId];
    const confusions = stat?.confusions;

    const t2DistractorCount = Math.min(limits.gkCount - 1, words.length - 1);
    const t2Distractors = pickDistractors(word, words, t2DistractorCount, confusions);
    const t2Raw = [word, ...t2Distractors];
    const t2Total = t2Raw.length % 2 !== 0 ? t2Raw.slice(0, t2Raw.length - 1) : t2Raw;
    const t2Options = shuffle(t2Total.length >= 2 ? t2Total : [word, t2Distractors[0] ?? word]);

    questions.push({
      id: `t2_${wordId}`,
      wordId,
      targetVocab: word,
      type: 'GK',
      turn: 2,
      options: t2Options,
      optionsCount: t2Options.length,
    });
  });

  // ROUND 3: USE (Puppet claim YN, SS, or contextual choice)
  words.forEach((word) => {
    const wordId = word._id || (word as any).id || word.english;
    const stat = vocabStats[wordId];
    const confusions = stat?.confusions;

    let turn3Type: ActivityType = 'LT';
    if (limits.allowsYN && (!limits.allowsSS || Math.random() > 0.5)) {
      turn3Type = 'YN';
    } else if (limits.allowsSS) {
      turn3Type = 'SS';
    }

    if (turn3Type === 'YN') {
      const isTrueClaim = Math.random() > 0.5;
      let claimedWord = word.english;
      if (!isTrueClaim) {
        const dist = pickDistractors(word, words, 1, confusions)[0];
        claimedWord = dist ? dist.english : 'pencil';
      }
      questions.push({
        id: `t3_${wordId}`,
        wordId,
        targetVocab: word,
        type: 'YN',
        turn: 3,
        options: [word],
        optionsCount: 2,
        isTrueClaim,
        claimedWord,
      });
    } else if (turn3Type === 'SS') {
      const targetSound = getStartingSound(word.english);
      const otherWordsWithDiffSound = words.filter(
        (v) => getStartingSound(v.english).letter !== targetSound.letter
      );
      const ssDistractorCount = Math.min(limits.ltStart - 1, words.length - 1);
      const ssDistractors = pickDistractors(
        word,
        otherWordsWithDiffSound.length > 0 ? otherWordsWithDiffSound : words,
        ssDistractorCount,
        confusions
      );
      const ssRaw = [word, ...ssDistractors];
      const ssTotal = ssRaw.length % 2 !== 0 ? ssRaw.slice(0, ssRaw.length - 1) : ssRaw;
      const ssOptions = shuffle(ssTotal.length >= 2 ? ssTotal : [word, ssDistractors[0] ?? word]);

      questions.push({
        id: `t3_${wordId}`,
        wordId,
        targetVocab: word,
        type: 'SS',
        turn: 3,
        options: ssOptions,
        optionsCount: ssOptions.length,
        startingSound: targetSound,
      });
    } else {
      // Advanced LT
      const t3DistractorCount = Math.min(limits.ltMax - 1, words.length - 1);
      const t3Distractors = pickDistractors(word, words, t3DistractorCount, confusions);
      const t3Raw = [word, ...t3Distractors];
      const t3Total = t3Raw.length % 2 !== 0 ? t3Raw.slice(0, t3Raw.length - 1) : t3Raw;
      const t3Options = shuffle(t3Total.length >= 2 ? t3Total : [word, t3Distractors[0] ?? word]);

      questions.push({
        id: `t3_${wordId}`,
        wordId,
        targetVocab: word,
        type: 'LT',
        turn: 3,
        options: t3Options,
        optionsCount: t3Options.length,
      });
    }
  });

  return {
    questions,
    wordMap,
  };
}

/**
 * Backward compatibility alias for buildPracticePlan
 */
export const buildPracticePlan = buildPracticeQuestions;

