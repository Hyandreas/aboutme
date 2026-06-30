let decided = false;
let willPlayMemo = false;

export const COLD_OPEN_SEEN_KEY = 'hy:introSeenSession';

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
  if (!decided) {
    decided = true;
    willPlayMemo = coldOpenCanPlay();
    try {
      sessionStorage.setItem(COLD_OPEN_SEEN_KEY, '1');
    } catch {
      /* noop */
    }
  }
  return willPlayMemo;
}
