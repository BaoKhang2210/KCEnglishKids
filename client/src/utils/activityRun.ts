/** Own delayed work for one play attempt. Cancelling also invalidates async responses. */
export function createActivityRun() {
  let active = true;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  return {
    get active() { return active; },
    schedule(callback: () => void, delay: number) {
      if (!active) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (active) callback();
      }, delay);
      timers.add(timer);
    },
    cancel() {
      active = false;
      timers.forEach(clearTimeout);
      timers.clear();
    },
  };
}
