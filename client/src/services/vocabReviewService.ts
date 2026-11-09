import { vocabReviewApi } from './api';
import type { VocabDueList, VocabNotebook, VocabReviewSnapshot } from '../types';

export interface ReviewInput {
  isCorrect: boolean;
  wrongAttempts?: number;
  independent?: boolean;
  submissionId?: string;
  activityType?: string;
}

export interface ReviewResult {
  /** True when the answer is queued locally and not yet confirmed by the server. */
  pending: boolean;
  /** Server snapshot; the only source for level and due date. */
  snapshot: VocabReviewSnapshot | null;
  /** A replay of the same submission with different data; refresh from server. */
  conflict?: boolean;
}

type PendingEntry = {
  childId: string;
  vocabId: string;
  payload: { isCorrect: boolean; wrongAttempts: number; independent: boolean; submissionId: string; activityType?: string };
  error?: string;
};

const OUTBOX_KEY = 'kc_vocab_review_outbox_v1';
let running: Promise<void> | null = null;

const read = (): PendingEntry[] => {
  try {
    const rows = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(rows)
      ? rows.filter((row) => row?.childId && row?.vocabId && row?.payload?.submissionId)
      : [];
  } catch {
    return [];
  }
};

const save = (rows: PendingEntry[]) => localStorage.setItem(OUTBOX_KEY, JSON.stringify(rows));
const notify = (childId: string) =>
  window.dispatchEvent(new CustomEvent('kc_vocab_mastery_updated', { detail: { childId } }));

const newSubmissionId = () =>
  globalThis.crypto?.randomUUID?.() || `qr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const isTransient = (error: any) => {
  const status = Number(error?.status) || 0;
  return !status || status === 500 || status === 502 || status === 503 || status === 504 || error?.name === 'TypeError';
};

export const vocabReviewService = {
  async getNotebook(childId: string): Promise<VocabNotebook> {
    const response = await vocabReviewApi.getNotebook(childId);
    return response.data;
  },

  async getDue(childId: string, limit?: number): Promise<VocabDueList> {
    const response = await vocabReviewApi.getDue(childId, limit);
    return response.data;
  },

  /** Send one quick-review answer; server owns the resulting level and due date. */
  async record(childId: string, vocabId: string, input: ReviewInput): Promise<ReviewResult> {
    const payload = {
      isCorrect: input.isCorrect,
      wrongAttempts: input.wrongAttempts || 0,
      independent: input.independent ?? true,
      submissionId: input.submissionId || newSubmissionId(),
      activityType: input.activityType || 'QUICK_REVIEW'
    };
    try {
      const response = await vocabReviewApi.record(childId, vocabId, payload);
      notify(childId);
      return { pending: false, snapshot: response.data };
    } catch (error: any) {
      const status = Number(error?.status) || 0;
      if (isTransient(error)) {
        const rows = read();
        if (!rows.some((row) => row.payload.submissionId === payload.submissionId)) {
          rows.push({ childId, vocabId, payload });
          save(rows);
        }
        return { pending: true, snapshot: null };
      }
      // 409 means this submission id was already used with different data.
      // The server keeps the earlier answer, so the client only refreshes.
      if (status === 409) {
        notify(childId);
        return { pending: false, snapshot: null, conflict: true };
      }
      throw error;
    }
  },

  pending(childId: string) {
    return read().filter((row) => row.childId === childId);
  },

  async flush(childId: string) {
    if (running) {
      await running;
      if (!this.pending(childId).length) return;
    }
    running = (async () => {
      for (const row of this.pending(childId)) {
        if (row.error) continue;
        try {
          await vocabReviewApi.record(row.childId, row.vocabId, row.payload);
          save(read().filter((item) => item.payload.submissionId !== row.payload.submissionId));
          notify(childId);
        } catch (error: any) {
          if (isTransient(error)) break;
          // 409 is already applied; any other 4xx cannot succeed on retry.
          save(read().filter((item) => item.payload.submissionId !== row.payload.submissionId));
          notify(childId);
        }
      }
    })();
    try {
      await running;
    } catch {
      /* The queue keeps unconfirmed entries for the next mount. */
    } finally {
      running = null;
    }
  }
};
