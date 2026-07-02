export interface Scheduler {
  schedule: (callback: () => void, delay: number) => number;
  clear: () => void;
}

export function createScheduler(): Scheduler {
  const timers = new Set<number>();

  return {
    schedule(callback, delay) {
      let timer = 0;
      timer = window.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.add(timer);
      return timer;
    },
    clear() {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    },
  };
}
