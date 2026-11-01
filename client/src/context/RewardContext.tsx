import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { RewardSummary, RevealedChest } from '../types';
import { rewardsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { learningOutbox } from '../services/learningOutbox';

/**
 * §1.2.11 — RewardContext: the single place that fetches reward state.
 * One call `getRewards(childId)` serves the header stars, badges progress,
 * sticker collection AND the chest shelf — no more re-computing in 3 places.
 * The server is the single source of truth (stars include unit bonuses).
 */
interface RewardContextType {
  rewards: RewardSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  revealChest: (unitId: string) => Promise<RevealedChest | null>;
}

const RewardContext = createContext<RewardContextType | undefined>(undefined);

export const RewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const childId = user?.role === 'CHILD' ? user?.id || user?._id : null;

  const [rewards, setRewards] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    if (!childId) {
      setRewards(null);
      setError(null);
      return;
    }
    // Dedupe concurrent refreshes (provider auto-load + page mount)
    if (inFlightRef.current) return inFlightRef.current;

    const fetchPromise = (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await rewardsApi.getChildRewards(childId);
        if (mountedRef.current && res.success) {
          setRewards(res.data as RewardSummary);
        }
      } catch (e) {
        console.warn('Could not load rewards:', e);
        if (mountedRef.current) setError('Chưa tải được tiến độ sao. Bé thử lại nhé.');
      } finally {
        if (mountedRef.current) setLoading(false);
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = fetchPromise;
    return fetchPromise;
  }, [childId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!childId) return;
    const sync = () => {
      if (!learningOutbox.pending(childId).length) void refresh();
    };
    window.addEventListener('kc_learning_sync', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('kc_learning_sync', sync);
      window.removeEventListener('focus', sync);
    };
  }, [childId, refresh]);

  /** §1.2.14 — reveal is COSMETIC: the animation plays even if the API fails. */
  const revealChest = useCallback(
    async (unitId: string): Promise<RevealedChest | null> => {
      if (!childId) return null;
      try {
        const res = await rewardsApi.revealChest(childId, unitId);
        if (res.success) {
          refresh();
          return res.data as RevealedChest;
        }
        return null;
      } catch (e) {
        console.warn('Reveal chest failed (cosmetic only):', e);
        return null;
      }
    },
    [childId, refresh]
  );

  return (
    <RewardContext.Provider value={{ rewards, loading, error, refresh, revealChest }}>
      {children}
    </RewardContext.Provider>
  );
};

export const useRewards = () => {
  const context = useContext(RewardContext);
  if (!context) throw new Error('useRewards must be used within a RewardProvider');
  return context;
};
