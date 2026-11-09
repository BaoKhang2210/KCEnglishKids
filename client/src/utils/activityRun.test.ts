import { afterEach, describe, expect, it, vi } from 'vitest';
import { createActivityRun } from './activityRun';

afterEach(() => vi.useRealTimers());

describe('activity attempt lifecycle', () => {
  it('cancels delayed answer, audio and completion callbacks when leaving an attempt', () => {
    vi.useFakeTimers();
    const run = createActivityRun();
    const answer = vi.fn();
    const audio = vi.fn();
    const complete = vi.fn();
    run.schedule(answer, 500);
    run.schedule(audio, 1000);
    run.schedule(complete, 1300);
    run.cancel();
    vi.runAllTimers();
    expect(answer).not.toHaveBeenCalled();
    expect(audio).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(run.active).toBe(false);
  });

  it('cancels nested memory completion and allows a new replay to complete', () => {
    vi.useFakeTimers();
    const oldRun = createActivityRun();
    const complete = vi.fn();
    oldRun.schedule(() => oldRun.schedule(complete, 1000), 500);
    vi.advanceTimersByTime(500);
    oldRun.cancel();
    const replay = createActivityRun();
    replay.schedule(complete, 1500);
    vi.advanceTimersByTime(1000);
    expect(complete).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('ignores stale asynchronous results and new work after cancellation', async () => {
    vi.useFakeTimers();
    const run = createActivityRun();
    const update = vi.fn();
    const pending = Promise.resolve().then(() => { if (run.active) update(); });
    run.cancel();
    await pending;
    run.schedule(update, 1);
    vi.runAllTimers();
    expect(update).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
