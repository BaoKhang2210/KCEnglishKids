import type { Vocabulary } from '../types';
import { vocabMasteryApi } from './api';

let syncTimeout: any = null;

export interface WordMasteryDetail {
  _id: string;
  vocabId: string;
  english: string;
  vietnamese: string;
  pronunciation?: string;
  imageUrl?: string;
  audioUrl?: string;
  exampleSentence?: string;
  exampleSentenceVietnamese?: string;
  category?: string;
  topicName?: string;
  status: 'MASTERED' | 'REVIEW' | 'LEARNING';
  rememberCount: number;
  reviewCount: number;
  gamesPlayedCount: number;
  gamesCorrectCount: number;
  lastPracticedAt: number;
  masteryScore: number; // 0 - 100%
  source: 'JOURNEY' | 'TOPIC';
}

export interface VocabMasteryRecord {
  masteredIds: string[];
  reviewIds: string[];
  vocabDetails: Record<string, WordMasteryDetail>;
  lastUpdated: number;
}

const STORAGE_KEY_PREFIX = 'kc_vocab_mastery_';

function calculateScore(item: Partial<WordMasteryDetail>): number {
  const rem = item.rememberCount || 0;
  const rev = item.reviewCount || 0;
  const gamePlayed = item.gamesPlayedCount || 0;
  const gameCorrect = item.gamesCorrectCount || 0;

  if (rem === 0 && rev === 0 && gamePlayed === 0) {
    return item.status === 'MASTERED' ? 85 : 50;
  }

  const flashcardRate = (rem + 1) / (rem + rev * 1.2 + 1);
  const gameRate = gamePlayed > 0 ? gameCorrect / gamePlayed : flashcardRate;
  const blended = flashcardRate * 0.6 + gameRate * 0.4;
  return Math.min(100, Math.max(15, Math.round(blended * 100)));
}

export const vocabMasteryService = {
  getStorageKey(childId: string): string {
    return `${STORAGE_KEY_PREFIX}${childId || 'default'}`;
  },

  getMastery(childId: string): VocabMasteryRecord {
    try {
      const raw = localStorage.getItem(this.getStorageKey(childId));
      if (!raw) {
        return { masteredIds: [], reviewIds: [], vocabDetails: {}, lastUpdated: Date.now() };
      }
      const parsed = JSON.parse(raw);
      // Ensure structure integrity
      if (!parsed.masteredIds) parsed.masteredIds = [];
      if (!parsed.reviewIds) parsed.reviewIds = [];
      if (!parsed.vocabDetails) parsed.vocabDetails = {};
      return parsed;
    } catch (e) {
      console.warn('Failed to parse vocab mastery data:', e);
      return { masteredIds: [], reviewIds: [], vocabDetails: {}, lastUpdated: Date.now() };
    }
  },

  saveMastery(childId: string, record: VocabMasteryRecord): void {
    try {
      record.lastUpdated = Date.now();
      localStorage.setItem(this.getStorageKey(childId), JSON.stringify(record));
      window.dispatchEvent(new CustomEvent('kc_vocab_mastery_updated', { detail: { childId } }));

      // Debounced background sync to Backend DB
      if (childId && childId !== 'default' && childId !== 'guest') {
        if (syncTimeout) clearTimeout(syncTimeout);
        syncTimeout = setTimeout(() => {
          const records = Object.values(record.vocabDetails)
            .filter((v) => v.vocabId && v.vocabId.length === 24)
            .map((v) => ({
              vocabularyId: v.vocabId,
              correctCount: (v.rememberCount || 0) + (v.gamesCorrectCount || 0),
              wrongCount: (v.reviewCount || 0) + Math.max(0, (v.gamesPlayedCount || 0) - (v.gamesCorrectCount || 0)),
              attemptCount: (v.rememberCount || 0) + (v.reviewCount || 0) + (v.gamesPlayedCount || 0),
              streak: v.status === 'MASTERED' ? 3 : (v.rememberCount > 0 ? 1 : 0)
            }));
          if (records.length > 0) {
            vocabMasteryApi.syncMastery(childId, records).catch((err) => {
              console.warn('[vocabMastery] Background sync error:', err);
            });
          }
        }, 2000);
      }
    } catch (e) {
      console.error('Failed to save vocab mastery:', e);
    }
  },

  async syncWithBackend(childId: string): Promise<void> {
    if (!childId || childId === 'default' || childId === 'guest') return;
    try {
      const res = await vocabMasteryApi.getChildMastery(childId);
      const serverRecords: any[] = res.data?.data || res.data || [];
      if (!Array.isArray(serverRecords) || serverRecords.length === 0) return;

      const local = this.getMastery(childId);
      let updated = false;

      for (const sr of serverRecords) {
        const v = sr.vocabulary;
        if (!v) continue;
        const vId = v._id || v.id || sr.vocabulary;
        if (!vId) continue;

        if (!local.vocabDetails[vId]) {
          local.vocabDetails[vId] = {
            _id: vId,
            vocabId: vId,
            english: v.english || '',
            vietnamese: v.vietnamese || '',
            pronunciation: v.pronunciation || '',
            imageUrl: v.imageUrl || '',
            audioUrl: v.audioUrl || '',
            exampleSentence: v.exampleSentence || '',
            exampleSentenceVietnamese: v.exampleSentenceVietnamese || '',
            status: sr.masteryLevel >= 3 ? 'MASTERED' : sr.masteryLevel >= 2 ? 'LEARNING' : 'REVIEW',
            rememberCount: sr.correctCount || 0,
            reviewCount: sr.wrongCount || 0,
            gamesPlayedCount: sr.attemptCount || 0,
            gamesCorrectCount: sr.correctCount || 0,
            lastPracticedAt: sr.lastReviewedAt ? new Date(sr.lastReviewedAt).getTime() : Date.now(),
            masteryScore: sr.masteryLevel >= 3 ? 90 : Math.round(((sr.correctCount || 0) / Math.max(1, sr.attemptCount || 1)) * 100),
            source: 'TOPIC'
          };
          if (sr.masteryLevel >= 3 && !local.masteredIds.includes(vId)) {
            local.masteredIds.push(vId);
          }
          updated = true;
        }
      }

      if (updated) {
        localStorage.setItem(this.getStorageKey(childId), JSON.stringify(local));
        window.dispatchEvent(new CustomEvent('kc_vocab_mastery_updated', { detail: { childId } }));
      }
    } catch (e) {
      console.warn('[vocabMastery] Failed to fetch mastery from backend:', e);
    }
  },

  /**
   * Record interactive flashcard study action (Remember or Review)
   */
  recordStudyAction(
    childId: string,
    vocab: Vocabulary,
    action: 'remember' | 'review',
    source: 'JOURNEY' | 'TOPIC' = 'TOPIC'
  ): void {
    if (!vocab || (!vocab._id && !(vocab as any).id)) return;
    const vId = vocab._id || (vocab as any).id;
    const data = this.getMastery(childId);

    const existing: WordMasteryDetail = data.vocabDetails[vId] || {
      _id: vId,
      vocabId: vId,
      english: vocab.english,
      vietnamese: vocab.vietnamese,
      pronunciation: vocab.pronunciation,
      imageUrl: vocab.imageUrl,
      audioUrl: vocab.audioUrl,
      exampleSentence: vocab.exampleSentence,
      exampleSentenceVietnamese: vocab.exampleSentenceVietnamese,
      category: (vocab as any).category,
      topicName: (vocab as any).topicName,
      status: 'LEARNING',
      rememberCount: 0,
      reviewCount: 0,
      gamesPlayedCount: 0,
      gamesCorrectCount: 0,
      lastPracticedAt: Date.now(),
      masteryScore: 50,
      source
    };

    // Update metadata if fresher
    existing.english = vocab.english || existing.english;
    existing.vietnamese = vocab.vietnamese || existing.vietnamese;
    if (vocab.imageUrl) existing.imageUrl = vocab.imageUrl;
    if (vocab.audioUrl) existing.audioUrl = vocab.audioUrl;
    if (vocab.exampleSentence) existing.exampleSentence = vocab.exampleSentence;
    if (vocab.exampleSentenceVietnamese) existing.exampleSentenceVietnamese = vocab.exampleSentenceVietnamese;

    if (action === 'remember') {
      existing.rememberCount = (existing.rememberCount || 0) + 1;
      existing.status = 'MASTERED';
      if (!data.masteredIds.includes(vId)) {
        data.masteredIds.push(vId);
      }
      data.reviewIds = data.reviewIds.filter(id => id !== vId);
    } else {
      existing.reviewCount = (existing.reviewCount || 0) + 1;
      existing.status = 'REVIEW';
      if (!data.reviewIds.includes(vId)) {
        data.reviewIds.push(vId);
      }
      data.masteredIds = data.masteredIds.filter(id => id !== vId);
    }

    existing.lastPracticedAt = Date.now();
    existing.masteryScore = calculateScore(existing);
    data.vocabDetails[vId] = existing;

    this.saveMastery(childId, data);
  },

  /**
   * Backwards compatible aliases
   */
  markMastered(childId: string, vocab: Vocabulary): void {
    this.recordStudyAction(childId, vocab, 'remember');
  },

  markReview(childId: string, vocab: Vocabulary): void {
    this.recordStudyAction(childId, vocab, 'review');
  },

  /**
   * Toggle status directly from the Notebook UI
   */
  toggleWordStatus(childId: string, vocabId: string): void {
    const data = this.getMastery(childId);
    const item = data.vocabDetails[vocabId];
    if (!item) return;

    if (item.status === 'MASTERED') {
      item.status = 'REVIEW';
      item.reviewCount = (item.reviewCount || 0) + 1;
      data.masteredIds = data.masteredIds.filter(id => id !== vocabId);
      if (!data.reviewIds.includes(vocabId)) data.reviewIds.push(vocabId);
    } else {
      item.status = 'MASTERED';
      item.rememberCount = (item.rememberCount || 0) + 1;
      data.reviewIds = data.reviewIds.filter(id => id !== vocabId);
      if (!data.masteredIds.includes(vocabId)) data.masteredIds.push(vocabId);
    }

    item.lastPracticedAt = Date.now();
    item.masteryScore = calculateScore(item);
    data.vocabDetails[vocabId] = item;
    this.saveMastery(childId, data);
  },

  /**
   * Record mini-game practice result
   */
  recordGameResult(childId: string, vocabId: string, isCorrect: boolean): void {
    const data = this.getMastery(childId);
    const item = data.vocabDetails[vocabId];
    if (!item) return;

    item.gamesPlayedCount = (item.gamesPlayedCount || 0) + 1;
    if (isCorrect) {
      item.gamesCorrectCount = (item.gamesCorrectCount || 0) + 1;
      // If performed well in game, solidify mastery
      if (item.gamesCorrectCount >= 2 && item.status !== 'MASTERED') {
        item.status = 'MASTERED';
        if (!data.masteredIds.includes(vocabId)) data.masteredIds.push(vocabId);
        data.reviewIds = data.reviewIds.filter(id => id !== vocabId);
      }
    }

    item.lastPracticedAt = Date.now();
    item.masteryScore = calculateScore(item);
    data.vocabDetails[vocabId] = item;
    this.saveMastery(childId, data);
  },

  /**
   * Register words taught in Journey lessons so they automatically enter the child's vocabulary pool
   */
  registerJourneyWords(childId: string, vocabs: Vocabulary[]): void {
    if (!vocabs || vocabs.length === 0) return;
    const data = this.getMastery(childId);
    let changed = false;

    vocabs.forEach(v => {
      const vId = v._id || (v as any).id;
      if (!vId) return;

      if (!data.vocabDetails[vId]) {
        const detail: WordMasteryDetail = {
          _id: vId,
          vocabId: vId,
          english: v.english,
          vietnamese: v.vietnamese,
          pronunciation: v.pronunciation,
          imageUrl: v.imageUrl,
          audioUrl: v.audioUrl,
          exampleSentence: v.exampleSentence,
          exampleSentenceVietnamese: v.exampleSentenceVietnamese,
          category: (v as any).category,
          topicName: (v as any).topicName,
          status: 'LEARNING',
          rememberCount: 1,
          reviewCount: 0,
          gamesPlayedCount: 0,
          gamesCorrectCount: 0,
          lastPracticedAt: Date.now(),
          masteryScore: 65,
          source: 'JOURNEY'
        };
        data.vocabDetails[vId] = detail;
        if (!data.masteredIds.includes(vId)) {
          data.masteredIds.push(vId);
        }
        changed = true;
      }
    });

    if (changed) {
      this.saveMastery(childId, data);
    }
  },

  /**
   * Retrieve all words that the child has actually learned/interacted with
   */
  getAllLearnedWords(childId: string): WordMasteryDetail[] {
    const data = this.getMastery(childId);
    return Object.values(data.vocabDetails)
      .map(item => ({ ...item, _id: item._id || item.vocabId }))
      .sort((a, b) => b.lastPracticedAt - a.lastPracticedAt);
  },

  getMasteredWords(childId: string): WordMasteryDetail[] {
    const data = this.getMastery(childId);
    return Object.values(data.vocabDetails)
      .filter(v => v.status === 'MASTERED' || data.masteredIds.includes(v.vocabId))
      .map(item => ({ ...item, _id: item._id || item.vocabId }))
      .sort((a, b) => (b.masteryScore || 0) - (a.masteryScore || 0));
  },

  getReviewWords(childId: string): WordMasteryDetail[] {
    const data = this.getMastery(childId);
    return Object.values(data.vocabDetails)
      .filter(v => v.status === 'REVIEW' || data.reviewIds.includes(v.vocabId))
      .map(item => ({ ...item, _id: item._id || item.vocabId }))
      .sort((a, b) => a.lastPracticedAt - b.lastPracticedAt);
  },

  isMastered(childId: string, vocabId: string): boolean {
    const data = this.getMastery(childId);
    const item = data.vocabDetails[vocabId];
    return item ? item.status === 'MASTERED' : data.masteredIds.includes(vocabId);
  },

  isReview(childId: string, vocabId: string): boolean {
    const data = this.getMastery(childId);
    const item = data.vocabDetails[vocabId];
    return item ? item.status === 'REVIEW' : data.reviewIds.includes(vocabId);
  }
};
