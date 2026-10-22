/**
 * vocabStatsService & computeMastery
 * -----------------------------------
 * Manages detailed tracking of child vocab performance across practice activities (LT, FS, GK, YN, SS).
 * Stores data in localStorage under `kc_vocab_stats_${childId}` and syncs to `vocabMasteryService`
 * ('known'/'strong' -> MASTERED / "Đã nhớ"; 'trouble'/'learning' -> REVIEW / "Cần ôn").
 */

import { vocabMasteryService } from './vocabMasteryService';
import type { Vocabulary } from '../types';

export type ActivityType = 'LT' | 'FS' | 'GK' | 'YN' | 'SS';

export interface RecentAttempt {
  ok: boolean;
  type: ActivityType;
  ts: number;
  chosenDistractorId?: string;
}

export type MasteryLevel = 'new' | 'learning' | 'known' | 'strong';

export interface WordStats {
  attempts: number;
  firstTryCorrect: number;
  wrong: number;
  hints: number;
  last6: RecentAttempt[];
  confusions: Record<string, number>; // wordId of chosen wrong options -> count
  typesCorrect: string[];
  updatedAt: number;
  lastPracticedDate?: string; // YYYY-MM-DD to detect multiple distinct session days
  sessionDaysCount?: number;
  mastery: MasteryLevel;
  trouble: boolean;
}

export type ChildVocabStatsMap = Record<string, WordStats>;

export interface WordPracticeResult {
  wordId: string;
  english: string;
  vietnamese: string;
  imageUrl?: string;
  emoji?: string;
  firstTryCorrect: number;
  wrongCount: number;
  isConfident: boolean; // firstTryCorrect > 0 && wrongCount === 0
}

export interface Stage2PracticeSession {
  sessionId: string;
  childId: string;
  lessonId: string;
  startedAt: number;
  completedAt: number;
  totalQuestions: number;
  firstTryCorrectTotal: number;
  totalWrongAttempts: number;
  words: WordPracticeResult[];
}

const STATS_KEY_PREFIX = 'kc_vocab_stats_';
const STAGE2_SESSIONS_PREFIX = 'kc_stage2_sessions_';

export function getStatsStorageKey(childId: string): string {
  return `${STATS_KEY_PREFIX}${childId || 'default'}`;
}

export function getStage2SessionsStorageKey(childId: string, lessonId: string): string {
  return `${STAGE2_SESSIONS_PREFIX}${childId || 'default'}_${lessonId || 'default'}`;
}

/**
 * Pure function: computeMastery
 * -----------------------------
 * Evaluates mastery level & trouble status based on attempts history:
 * - 'known': last 3 attempts are ALL first-try correct (ok === true) across >= 2 different activity types.
 * - 'strong': 'known' achieved across >= 2 different session days.
 * - 'trouble': >= 2 wrongs in last 4 attempts, OR session wrong >= 3.
 * - 'learning': has attempts, not yet known/strong, not trouble.
 * - 'new': attempts === 0.
 */
export function computeMastery(stats: Partial<WordStats>): { mastery: MasteryLevel; trouble: boolean } {
  const attempts = stats.attempts || 0;
  if (attempts === 0) {
    return { mastery: 'new', trouble: false };
  }

  const last6 = stats.last6 || [];
  const wrong = stats.wrong || 0;

  // Trouble check
  const last4 = last6.slice(-4);
  const wrongsInLast4 = last4.filter(a => !a.ok).length;
  const trouble = wrongsInLast4 >= 2 || wrong >= 3;

  if (trouble) {
    return { mastery: 'learning', trouble: true };
  }

  // Known check
  // 3 most recent attempts must be ok === true
  let isKnown = false;
  if (last6.length >= 3) {
    const last3 = last6.slice(-3);
    const all3Correct = last3.every(a => a.ok);
    const distinctTypes = new Set(last3.map(a => a.type)).size;
    if (all3Correct && distinctTypes >= 2) {
      isKnown = true;
    }
  }

  if (isKnown) {
    const sessionDays = stats.sessionDaysCount || 1;
    if (sessionDays >= 2) {
      return { mastery: 'strong', trouble: false };
    }
    return { mastery: 'known', trouble: false };
  }

  return { mastery: 'learning', trouble: false };
}

export const vocabStatsService = {
  getStats(childId: string): ChildVocabStatsMap {
    try {
      const raw = localStorage.getItem(getStatsStorageKey(childId));
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  getWordStats(childId: string, wordId: string): WordStats {
    const all = this.getStats(childId);
    return (
      all[wordId] || {
        attempts: 0,
        firstTryCorrect: 0,
        wrong: 0,
        hints: 0,
        last6: [],
        confusions: {},
        typesCorrect: [],
        updatedAt: Date.now(),
        mastery: 'new',
        trouble: false,
      }
    );
  },

  recordAttempt(
    childId: string,
    wordId: string,
    payload: {
      type: ActivityType;
      ok: boolean;
      isFirstTry: boolean;
      usedHint?: boolean;
      chosenDistractorId?: string;
      vocab?: Vocabulary;
    }
  ): WordStats {
    const all = this.getStats(childId);
    const cur = all[wordId] || {
      attempts: 0,
      firstTryCorrect: 0,
      wrong: 0,
      hints: 0,
      last6: [],
      confusions: {},
      typesCorrect: [],
      updatedAt: Date.now(),
      sessionDaysCount: 1,
      mastery: 'new',
      trouble: false,
    };

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!cur.lastPracticedDate) {
      cur.lastPracticedDate = todayStr;
      cur.sessionDaysCount = 1;
    } else if (cur.lastPracticedDate !== todayStr) {
      cur.lastPracticedDate = todayStr;
      cur.sessionDaysCount = (cur.sessionDaysCount || 1) + 1;
    }

    cur.attempts += 1;
    if (payload.isFirstTry && payload.ok) {
      cur.firstTryCorrect += 1;
    }
    if (!payload.ok) {
      cur.wrong += 1;
      if (payload.chosenDistractorId) {
        cur.confusions[payload.chosenDistractorId] =
          (cur.confusions[payload.chosenDistractorId] || 0) + 1;
      }
    }
    if (payload.usedHint) {
      cur.hints += 1;
    }

    if (payload.ok && !cur.typesCorrect.includes(payload.type)) {
      cur.typesCorrect.push(payload.type);
    }

    // append to last6
    cur.last6 = [
      ...cur.last6.slice(-5),
      {
        ok: payload.ok,
        type: payload.type,
        ts: Date.now(),
        chosenDistractorId: payload.chosenDistractorId,
      },
    ];

    // Compute updated mastery
    const computed = computeMastery(cur);
    cur.mastery = computed.mastery;
    cur.trouble = computed.trouble;
    cur.updatedAt = Date.now();

    all[wordId] = cur;
    try {
      localStorage.setItem(getStatsStorageKey(childId), JSON.stringify(all));
      window.dispatchEvent(
        new CustomEvent('kc_vocab_stats_updated', { detail: { childId, wordId, stats: cur } })
      );
    } catch (e) {
      console.warn('Failed to save vocab stats:', e);
    }

    // Two-way synchronization with legacy vocabMasteryService
    if (payload.vocab) {
      if (cur.mastery === 'known' || cur.mastery === 'strong') {
        vocabMasteryService.markMastered(childId, payload.vocab);
      } else if (cur.trouble || cur.mastery === 'learning') {
        vocabMasteryService.markReview(childId, payload.vocab);
      }
    }

    return cur;
  },

  getWeakWords(childId: string, vocabulary: Vocabulary[]): Vocabulary[] {
    const all = this.getStats(childId);
    return vocabulary.filter((v) => {
      const id = v._id || (v as any).id || v.english;
      const s = all[id];
      return s && (s.trouble || s.mastery === 'learning' || s.wrong > s.firstTryCorrect);
    });
  },

  getKnownWords(childId: string, vocabulary: Vocabulary[]): Vocabulary[] {
    const all = this.getStats(childId);
    return vocabulary.filter((v) => {
      const id = v._id || (v as any).id || v.english;
      const s = all[id];
      return s && (s.mastery === 'known' || s.mastery === 'strong');
    });
  },

  clearPracticeStats(childId: string): void {
    try {
      localStorage.removeItem(getStatsStorageKey(childId));
      window.dispatchEvent(
        new CustomEvent('kc_vocab_stats_updated', { detail: { childId, cleared: true } })
      );
    } catch (e) {
      console.warn('Failed to clear stats:', e);
    }
  },

  getStage2Sessions(childId: string, lessonId: string): Stage2PracticeSession[] {
    try {
      const raw = localStorage.getItem(getStage2SessionsStorageKey(childId, lessonId));
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  saveStage2Session(session: Stage2PracticeSession): void {
    try {
      const existing = this.getStage2Sessions(session.childId, session.lessonId);
      // Keep up to 20 recent sessions, newest first
      const updated = [session, ...existing.filter(s => s.sessionId !== session.sessionId)].slice(0, 20);
      localStorage.setItem(
        getStage2SessionsStorageKey(session.childId, session.lessonId),
        JSON.stringify(updated)
      );
      window.dispatchEvent(
        new CustomEvent('kc_stage2_session_saved', { detail: { session } })
      );
    } catch (e) {
      console.warn('Failed to save stage2 session:', e);
    }
  },
};
