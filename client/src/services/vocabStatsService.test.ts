import { describe, it, expect } from 'vitest';
import { computeMastery, type WordStats } from './vocabStatsService';

describe('computeMastery algorithm', () => {
  it('returns new when 0 attempts', () => {
    const res = computeMastery({ attempts: 0 });
    expect(res.mastery).toBe('new');
    expect(res.trouble).toBe(false);
  });

  it('detects trouble when >= 2 wrongs in last 4 attempts', () => {
    const res = computeMastery({
      attempts: 4,
      wrong: 2,
      last6: [
        { ok: false, type: 'LT', ts: 1 },
        { ok: true, type: 'FS', ts: 2 },
        { ok: false, type: 'GK', ts: 3 },
        { ok: true, type: 'LT', ts: 4 },
      ],
    });
    expect(res.trouble).toBe(true);
    expect(res.mastery).toBe('learning');
  });

  it('detects trouble when session wrong >= 3', () => {
    const res = computeMastery({
      attempts: 5,
      wrong: 3,
      last6: [
        { ok: true, type: 'LT', ts: 1 },
        { ok: true, type: 'FS', ts: 2 },
        { ok: true, type: 'GK', ts: 3 },
      ],
    });
    expect(res.trouble).toBe(true);
  });

  it('detects known when last 3 attempts are ok across >= 2 types', () => {
    const res = computeMastery({
      attempts: 3,
      wrong: 0,
      sessionDaysCount: 1,
      last6: [
        { ok: true, type: 'LT', ts: 1 },
        { ok: true, type: 'FS', ts: 2 },
        { ok: true, type: 'GK', ts: 3 },
      ],
    });
    expect(res.mastery).toBe('known');
    expect(res.trouble).toBe(false);
  });

  it('does NOT mark known if last 3 attempts were all the SAME activity type', () => {
    const res = computeMastery({
      attempts: 3,
      wrong: 0,
      sessionDaysCount: 1,
      last6: [
        { ok: true, type: 'LT', ts: 1 },
        { ok: true, type: 'LT', ts: 2 },
        { ok: true, type: 'LT', ts: 3 },
      ],
    });
    expect(res.mastery).toBe('learning');
    expect(res.trouble).toBe(false);
  });

  it('detects strong when known criteria met across >= 2 distinct session days', () => {
    const res = computeMastery({
      attempts: 5,
      wrong: 0,
      sessionDaysCount: 2,
      last6: [
        { ok: true, type: 'LT', ts: 1 },
        { ok: true, type: 'FS', ts: 2 },
        { ok: true, type: 'YN', ts: 3 },
      ],
    });
    expect(res.mastery).toBe('strong');
    expect(res.trouble).toBe(false);
  });
});
