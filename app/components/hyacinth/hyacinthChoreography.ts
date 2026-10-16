export interface HyacinthJourneyState {
  at: number;
  blooms: [number, number, number, number];
  focusSlot: number;
  focusWeight: number;
  energy: number;
  flow: number;
  ripple: number;
  quiet: number;
}

type Key = readonly [number, number];
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };

/** Scroll-authored envelopes: stopping holds the action and reversing rewinds it. */
function track(at: number, keys: readonly Key[]) {
  if (at <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (at <= keys[i][0]) {
      const [start, a] = keys[i - 1], [end, b] = keys[i];
      return a + (b - a) * ease((at - start) / (end - start));
    }
  }
  return keys[keys.length - 1][1];
}

export function sampleHyacinthJourney(progress: number, reducedMotion = false): HyacinthJourneyState {
  const at = (Number.isFinite(progress) ? clamp(progress) : 0) * 44;
  const upper = track(at, [[0, 0], [4, 0], [5.5, -.12], [8.5, 1], [10, .72], [14, .32], [22, .12], [44, .12]]);
  const passage = track(at, [[0, 0], [13, 0], [14.5, -.09], [18, .75], [20, 1], [22, .45], [26, .16], [44, .12]]);
  const lower = track(at, [[0, 0], [27, 0], [28.5, -.12], [32, 1], [34, .62], [38, .22], [44, .15]]);
  const finale = track(at, [[0, 0], [38.5, 0], [40, .22], [42.8, .9], [44, .48]]);
  const energy = track(at, [[0, 0], [3, .08], [5.5, .12], [8.5, .95], [11, .36], [14, .24], [18, .60], [20.5, 1], [23, .22], [26, .055], [28.5, .12], [32, .96], [34, .48], [38, .30], [42.5, 1], [44, .20]]);
  const flow = track(at, [[0, 0], [4, .22], [8.5, .72], [13, .45], [20, 1], [26, .12], [32, .80], [37, .75], [42, .55], [44, .16]]);
  const ripple = track(at, [[0, 0], [7, 0], [9.5, 1], [13, 0], [18, 0], [21.5, .9], [25, 0], [30, 0], [33.5, 1], [37, 0], [40, 0], [43, 1], [44, .25]]);
  const focusSlot = at < 14 ? 0 : at < 27 ? 1 : at < 38 ? 2 : 3;
  const focusWeight = at < 14
    ? track(at, [[0, 0], [4, .15], [6, .72], [10, .72], [14, 0]])
    : at < 27
      ? track(at, [[14, 0], [17, .55], [21, .55], [26, 0]])
      : track(at, [[27, 0], [30, .65], [33, .65], [37, 0]]);
  return {
    at, blooms: reducedMotion ? [0, 0, 0, 0] : [upper, passage, lower, finale],
    focusSlot, focusWeight: reducedMotion ? 0 : focusWeight,
    energy: reducedMotion ? energy * .12 : energy,
    flow: reducedMotion ? flow * .12 : flow,
    ripple: reducedMotion ? 0 : ripple,
    quiet: 1 - energy,
  };
}
