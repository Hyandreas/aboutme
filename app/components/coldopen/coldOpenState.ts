export const COLD_OPEN_SEEN_KEY = 'hy:introSeenSession';

let runStartedInThisRuntime = false;
let runFinishedInThisRuntime = false;

export function coldOpenSeenInSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return !!sessionStorage.getItem(COLD_OPEN_SEEN_KEY);
  } catch {
    return false;
  }
}

export function coldOpenCanPlay(): boolean {
  if (typeof window === 'undefined') return false;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !reduce && !coldOpenSeenInSession();
}

export function coldOpenWillPlay(): boolean {
  if (typeof window === 'undefined') return false;

  if (runStartedInThisRuntime) {
    return !runFinishedInThisRuntime;
  }

  if (!coldOpenCanPlay()) {
    return false;
  }

  runStartedInThisRuntime = true;
  try {
    sessionStorage.setItem(COLD_OPEN_SEEN_KEY, '1');
  } catch {
    /* noop */
  }

  return true;
}

export function coldOpenMarkFinished(): void {
  runFinishedInThisRuntime = true;
}
