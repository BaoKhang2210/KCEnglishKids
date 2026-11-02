import { api } from './api';
type Entry = { childId: string; lessonId: string; payload: Record<string, unknown>; error?: string };
const key = 'kc_learning_outbox_v1';
let running: Promise<void> | null = null;
const read = (): Entry[] => { try { const rows=JSON.parse(localStorage.getItem(key) || '[]');return Array.isArray(rows)?rows.filter(row=>row?.childId&&row?.lessonId&&row?.payload):[]; } catch { return []; } };
const notify = () => window.dispatchEvent(new Event('kc_learning_sync'));
const save = (rows: Entry[]) => localStorage.setItem(key, JSON.stringify(rows));
async function ensureStage2Token(row: Entry): Promise<Entry> {
  if (row.payload.stage !== 2 || row.payload.attemptToken) return row;
  const plan = await api.get(`/children/${row.childId}/progress/${row.lessonId}/plan`);
  const attemptToken = plan?.data?.stage2Token;
  if (!attemptToken) throw new Error('Chưa nhận được kế hoạch luyện tập để đồng bộ.');
  const updated = { ...row, payload: { ...row.payload, attemptToken }, error: undefined };
  save(read().map(item => item.payload.submissionId === row.payload.submissionId ? updated : item));
  notify();
  return updated;
}
export const learningOutbox = {
  async enqueueMastery(childId: string, vocabId: string, outcome: boolean | {
    isCorrect: boolean;
    independent?: boolean;
    wrongAttempts?: number;
    activityType?: string;
    sessionId?: string;
    submissionId?: string;
  }) {
    const payload = typeof outcome === 'boolean' ? { isCorrect: outcome } : outcome;
    return this.enqueue(childId, 'mastery:' + vocabId, payload);
  },
  pending(childId: string) { return read().filter(row => row.childId === childId); },
  rejected(childId: string) { return read().find(row => row.childId === childId && row.error)?.error || ''; },
  async enqueue(childId: string, lessonId: string, payload: Record<string, unknown>) {
    const submissionId = payload.submissionId || globalThis.crypto?.randomUUID?.() || 'op-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const entries = read();
    if(!entries.some(row=>row.payload.submissionId===submissionId))entries.push({ childId, lessonId, payload: { ...payload, submissionId } });
    // If storage is unavailable do not claim the result has been saved.
    localStorage.setItem(key, JSON.stringify(entries));
    notify();
    try {
      await this.flush(childId);
    } catch {
      // Background network/502 errors handled gracefully, outbox retains entry
    }
    const rejected=read().find(row=>row.payload.submissionId===submissionId && row.error);
    if(rejected)throw new Error(rejected.error);
    const stillPending = read().some(row => row.payload.submissionId === submissionId);
    return { success: true, offline: stillPending };
  },
  async flush(childId: string) {
    if (running) { await running; if (!this.pending(childId).length) return; }
    running = (async () => {
      const blocked = new Set<string>();
      for (const row of this.pending(childId)) {
        // A 4xx response is a permanent rejection until the lesson/evidence is
        // corrected. Keep it on-device for recovery, but don't resend it on
        // every mount, online event, or unrelated sync notification.
        if (row.error) continue;
        if(blocked.has(row.lessonId))continue;
        try {
          const token = localStorage.getItem('kc_token');
          const owner = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id : '';
          if (owner !== childId) return;
          if (row.lessonId.startsWith('mastery:')) await api.post(`/children/${childId}/vocabulary-mastery/${row.lessonId.slice(8)}/record`, row.payload);
          else if(row.lessonId.startsWith('activity:'))await api.post('/learning/activity-results',row.payload);
          else {
            const readyRow = await ensureStage2Token(row);
            await api.put(`/children/${childId}/progress/${readyRow.lessonId}/stage`, readyRow.payload);
          }
          // Re-read so entries enqueued while the request was pending survive.
          localStorage.setItem(key, JSON.stringify(read().filter(item => item.payload.submissionId !== row.payload.submissionId)));
          notify();
        } catch (error: any) {
          const status = Number(error?.status) || 0;
          const message = error instanceof Error ? error.message : String(error ?? 'Lỗi kết nối khi đồng bộ kết quả.');
          if (status === 502 || status === 500 || status === 503 || status === 504 || error?.name === 'TypeError') {
            if (import.meta.env?.DEV) {
              console.warn(`[ProgressService] Server ${status || 'offline'}, saved to LocalStorage`);
            }
            break;
          }
          if(status>=400&&status<500){
            localStorage.setItem(key,JSON.stringify(read().map(item=>item.payload.submissionId===row.payload.submissionId?{...item,error:message}:item)));
            blocked.add(row.lessonId);notify();
            if(status===401)break;
          }else break;
        } // Keep evidence; one invalid lesson must not block unrelated vocabulary.
      }
    })();
    try { await running; } catch (error) {
      // Unexpected sync failures must leave the outbox intact without creating
      // an unhandled rejection from fire-and-forget retry/focus handlers.
      if (import.meta.env?.DEV) console.warn('[ProgressService] Sync deferred; result remains in LocalStorage.', error);
    } finally { running = null; notify(); }
  },
  async retryRejected(childId: string) {
    save(read().map(row =>
      row.childId === childId && row.error ? { ...row, error: undefined } : row
    ));
    notify();
    await this.flush(childId);
  },
};
