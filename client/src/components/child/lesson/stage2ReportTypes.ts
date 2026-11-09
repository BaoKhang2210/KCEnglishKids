export type Stage2ReportRating = 'SECURE' | 'PRACTICE' | 'REVIEW';

export interface Stage2ReportRound {
  code?: number;
  key?: string;
  name?: string;
  rating: Stage2ReportRating;
  isCorrect: boolean;
  wrongAttemptCount: number | null;
  usedHint: boolean | null;
}

export interface Stage2WordReview {
  level: number;
  maxLevel: number;
  dueOn: string | null;
  dueAt: string | null;
  status: 'LEARNING' | 'PRACTICE' | 'REVIEW' | 'MASTERED';
  mastered: boolean;
  lastOutcome: Stage2ReportRating | null;
  lastPromotionOn?: string | null;
  demotionCount?: number;
}

export interface Stage2ReportWord {
  wordId: string;
  english: string;
  vietnamese?: string;
  imageUrl?: string;
  audioUrl?: string;
  rating: Stage2ReportRating | null;
  rounds: Stage2ReportRound[];
  /** Server-owned Leitner snapshot attached to confirmed reports. */
  review?: Stage2WordReview | null;
}

export interface Stage2ServerReport {
  version: number;
  confirmed: boolean;
  legacy?: boolean;
  starsEarned: number;
  starsBest: number;
  starsAdded: number;
  words: Stage2ReportWord[];
  stageStars?: { stage1: number; stage2: number; stage3: number };
  completedStage?: number;
}

export interface Stage2EvidenceAnswer {
  wordId: string;
  round: number;
  selectedId: string | null;
  wrongAttemptCount?: number;
  usedHint?: boolean;
}
