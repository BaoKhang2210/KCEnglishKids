import { api } from './api';
type Entry = { childId: string; lessonId: string; payload: Record<string, unknown>; error?: string };
const key = 'kc_learning_outbox_v1';
let running: Promise<void> | null = null;
const read = (): Entry[] => { try { const rows=JSON.parse(localStorage.getItem(key) || '[]');return Array.isArray(rows)?rows.filter(row=>row?.childId&&row?.lessonId&&row?.payload):[]; } catch { return []; } };
const notify = () => window.dispatchEvent(new Event('kc_learning_sync'));
export const learningOutbox = {
  async enqueueMastery(childId: string, vocabId: string, isCorrect: boolean) {
    return this.enqueue(childId, 'mastery:' + vocabId, { isCorrect });
  },
  pending(childId: string) { return read().filter(row => row.childId === childId); },
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
        if(blocked.has(row.lessonId))continue;
        try {
          const token = localStorage.getItem('kc_token');
          const owner = token ? JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).id : '';
          if (owner !== childId) return;
          if (row.lessonId.startsWith('mastery:')) await api.post(`/children/${childId}/vocabulary-mastery/${row.lessonId.slice(8)}/record`, row.payload);
          else if(row.lessonId.startsWith('activity:'))await api.post('/learning/activity-results',row.payload);
          else await api.put(`/children/${childId}/progress/${row.lessonId}/stage`, row.payload);
          // Re-read so entries enqueued while the request was pending survive.
          localStorage.setItem(key, JSON.stringify(read().filter(item => item.payload.submissionId !== row.payload.submissionId)));
          notify();
        } catch (error: any) {
          const status = error?.status;
          if (status === 502 || status === 500 || status === 503 || status === 504 || error?.name === 'TypeError') {
            if (import.meta.env?.DEV) {
              console.warn(`[ProgressService] Server ${status || 'offline'}, saved to LocalStorage`);
            }
            break;
          }
          if(error.status>=400&&error.status<500){
            localStorage.setItem(key,JSON.stringify(read().map(item=>item.payload.submissionId===row.payload.submissionId?{...item,error:error.message}:item)));
            blocked.add(row.lessonId);notify();
            if(error.status===401)break;
          }else break;
        } // Keep evidence; one invalid lesson must not block unrelated vocabulary.
      }
    })();
    try { await running; } finally { running = null; notify(); }
  },
};
