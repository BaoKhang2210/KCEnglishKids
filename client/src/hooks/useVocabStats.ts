import { useState, useEffect, useCallback } from 'react';
import {
  vocabStatsService,
  type ChildVocabStatsMap,
  type WordStats,
  type ActivityType,
  type ActivityId,
} from '../services/vocabStatsService';
import type { Vocabulary } from '../types';

export function useVocabStats(childId: string) {
  const [statsMap, setStatsMap] = useState<ChildVocabStatsMap>(() =>
    vocabStatsService.getStats(childId)
  );

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e.detail?.childId === childId) {
        setStatsMap(vocabStatsService.getStats(childId));
      }
    };
    window.addEventListener('kc_vocab_stats_updated', handleUpdate);
    return () => {
      window.removeEventListener('kc_vocab_stats_updated', handleUpdate);
    };
  }, [childId]);

  const recordAttempt = useCallback(
    (
      wordId: string,
      payload: {
        type: ActivityType;
        activityId?: ActivityId;
        round?: number;
        affectsMastery?: boolean;
        ok: boolean;
        isFirstTry: boolean;
        usedHint?: boolean;
        chosenDistractorId?: string;
        vocab?: Vocabulary;
      }
    ): WordStats => {
      return vocabStatsService.recordAttempt(childId, wordId, payload);
    },
    [childId]
  );

  const getWordStats = useCallback(
    (wordId: string): WordStats => {
      return vocabStatsService.getWordStats(childId, wordId);
    },
    [childId]
  );

  const getWeakWords = useCallback(
    (vocabulary: Vocabulary[]): Vocabulary[] => {
      return vocabStatsService.getWeakWords(childId, vocabulary);
    },
    [childId]
  );

  const getKnownWords = useCallback(
    (vocabulary: Vocabulary[]): Vocabulary[] => {
      return vocabStatsService.getKnownWords(childId, vocabulary);
    },
    [childId]
  );

  const clearStats = useCallback(() => {
    vocabStatsService.clearPracticeStats(childId);
  }, [childId]);

  return {
    statsMap,
    recordAttempt,
    getWordStats,
    getWeakWords,
    getKnownWords,
    clearStats,
  };
}
