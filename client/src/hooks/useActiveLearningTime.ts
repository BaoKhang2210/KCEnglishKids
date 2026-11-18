import { useEffect, useRef } from 'react';

// Count foreground learning only; background tabs and time before content loads
// are excluded. Durations are frozen into the durable submission for retries.
export function useActiveLearningTime(scope: string, enabled: boolean) {
  const clock = useRef({ elapsed: 0, since: 0 });
  useEffect(() => {
    clock.current = { elapsed: 0, since: 0 };
    const checkpoint = () => {
      const now = performance.now();
      if (clock.current.since) clock.current.elapsed += now - clock.current.since;
      clock.current.since = enabled && document.visibilityState === 'visible' && document.hasFocus() ? now : 0;
    };
    checkpoint();
    document.addEventListener('visibilitychange', checkpoint);
    window.addEventListener('focus', checkpoint); window.addEventListener('blur', checkpoint);
    return () => { document.removeEventListener('visibilitychange', checkpoint); window.removeEventListener('focus', checkpoint); window.removeEventListener('blur', checkpoint); };
  }, [scope, enabled]);
  return () => {
    const now = performance.now();
    const elapsed = clock.current.elapsed + (clock.current.since ? now - clock.current.since : 0);
    clock.current.elapsed = elapsed % 1000;
    if (clock.current.since) clock.current.since = now;
    return Math.min(7200, Math.floor(elapsed / 1000));
  };
}
