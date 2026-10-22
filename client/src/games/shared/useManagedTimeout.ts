import { useCallback, useEffect, useRef } from 'react';

/** Schedule game feedback and clear pending callbacks when a game unmounts. */
export function useManagedTimeout() {
  const timers = useRef(new Set<number>());

  const schedule = useCallback((callback: () => void, delay: number) => {
    let timer = 0;
    timer = window.setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
    return timer;
  }, []);

  useEffect(() => () => {
    timers.current.forEach(timer => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  return schedule;
}
