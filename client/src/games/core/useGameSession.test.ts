import { describe, it, expect } from 'vitest';
import { gameSessionReducer, targetKey } from './useGameSession';
import type { GameSessionState } from './types';

const initial = (): GameSessionState => ({ status: 'playing', targetOrder: ['cat', 'dog', 'cat'], targetIndex: 0, attemptsPerTarget: {}, assistedPerTarget: {}, wrongVocabIdsPerTarget: {}, stars: 0 });
describe('game rounds', () => {
  it('repeated words get independent attempts and assistance', () => {
    let state = gameSessionReducer(initial(), { type: 'RECORD_ATTEMPT', wordId: 'cat', wrongVocabId: 'dog' });
    state = gameSessionReducer(state, { type: 'SET_ASSISTED', wordId: 'cat' });
    state = gameSessionReducer(state, { type: 'TARGET_COMPLETED', wordId: 'cat' });
    state = gameSessionReducer(state, { type: 'TARGET_COMPLETED', wordId: 'dog' });
    expect(state.attemptsPerTarget[targetKey(0, 'cat')]).toBe(1);
    expect(state.attemptsPerTarget[targetKey(2, 'cat')]).toBeUndefined();
    expect(state.assistedPerTarget[targetKey(2, 'cat')]).toBeUndefined();
  });
  it('late events from an old target cannot advance or damage the next round', () => {
    const state = gameSessionReducer(initial(), { type: 'TARGET_COMPLETED', wordId: 'cat' });
    expect(gameSessionReducer(state, { type: 'TARGET_COMPLETED', wordId: 'cat' })).toBe(state);
    expect(gameSessionReducer(state, { type: 'RECORD_ATTEMPT', wordId: 'cat' })).toBe(state);
  });
  it('a completed session ignores extra scoring callbacks', () => {
    let state = initial();
    for (const wordId of state.targetOrder) state = gameSessionReducer(state, { type: 'TARGET_COMPLETED', wordId });
    expect(state.status).toBe('complete');
    expect(state.stars).toBe(3);
    expect(gameSessionReducer(state, { type: 'TARGET_COMPLETED', wordId: 'cat' })).toBe(state);
  });
});
