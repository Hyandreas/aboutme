type Vector3 = readonly [number, number, number];
interface CameraOptions { mobile?: boolean; reducedMotion?: boolean }
export interface HyacinthCameraPose {
  position: Vector3;
  target: Vector3;
  /** Authored screen position: zero centers the focus; positive values move it right. */
  lensShift: number;
  /** Legacy canvas translation, released with the camera's central framing. */
  canvasShift: number;
  roll: number;
}
export const HYACINTH_SCROLL_VIEWPORTS = 44;
const azimuth = -24 * Math.PI / 180, elevation = 4 * Math.PI / 180;
export const HYACINTH_ENTRY_POSE: HyacinthCameraPose = {
  position: [Math.sin(azimuth) * Math.cos(elevation) * 10.8,
    1.85 + Math.sin(elevation) * 10.8, Math.cos(azimuth) * Math.cos(elevation) * 10.8],
  target: [-1.55 * Math.cos(azimuth), 1.85, 1.55 * Math.sin(azimuth)], lensShift: 0, canvasShift: .1, roll: 0,
};
// Native viewport distances. The eye descends; its target accompanies it
// instead of orbiting the flower centre. The close route stays in front of
// the actual petal surfaces, with a diagonal pass beside the central opening.
const STATIONS: readonly (Omit<HyacinthCameraPose, 'canvasShift'> & { at: number })[] = [
  { at: 0, ...HYACINTH_ENTRY_POSE },
  { at: 2, position: [-3.2, 2.54, 8], target: [-.76, 1.83, -.2], lensShift: .08, roll: 0 },
  { at: 4, position: [-1.8, 2.46, 5.3], target: [.25, 1.98, .12], lensShift: .18, roll: -.008 },
  { at: 6, position: [-.78, 2.36, 3.75], target: [.88, 2.05, .35], lensShift: .23, roll: -.018 },
  { at: 8.5, position: [-.22, 2.22, 3.35], target: [1.05, 1.98, .30], lensShift: .24, roll: -.012 },
  { at: 10, position: [-.40, 2.05, 3.9], target: [.92, 1.85, .25], lensShift: .25, roll: 0 },
  // Leave the opening's editorial framing and take the central passage head-on.
  { at: 13, position: [1.2, 1.70, 3.45], target: [.72, 1.40, .20], lensShift: .10, roll: .028 },
  { at: 16, position: [1.05, 1.20, 2.95], target: [1.0, .9, .25], lensShift: 0, roll: .012 },
  { at: 20, position: [-.55, .55, 2.85], target: [.9, .20, .20], lensShift: 0, roll: -.030 },
  { at: 24, position: [-1.1, -.30, 3.25], target: [.55, .20, .15], lensShift: 0, roll: -.012 },
  { at: 26, position: [-.65, -.80, 3.80], target: [.70, .10, .20], lensShift: 0, roll: 0 },
  // A smaller lateral excursion gives the lower bloom its own composition.
  { at: 28, position: [.15, -1.15, 3.70], target: [.70, -.65, .30], lensShift: .04, roll: .008 },
  { at: 30, position: [.90, -1.45, 3.25], target: [.60, -1.30, .20], lensShift: .09, roll: .020 },
  { at: 32, position: [1.60, -1.75, 3.65], target: [.55, -1.70, .20], lensShift: .11, roll: .012 },
  { at: 34, position: [1.15, -2.15, 4.0], target: [.50, -2.0, .10], lensShift: .08, roll: 0 },
  { at: 36, position: [.50, -3.0, 4.30], target: [.60, -2.40, 0], lensShift: .04, roll: -.008 },
  // Pull back below the flower with its full silhouette on the central axis.
  { at: 39, position: [-.30, -4.40, 6.0], target: [.70, -2.70, .10], lensShift: 0, roll: 0 },
  { at: 42, position: [-1.50, -5.70, 10.40], target: [.55, -.60, -.05], lensShift: 0, roll: 0 },
  { at: 44, position: [-2.30, -6.50, 12.10], target: [.40, -.40, -.08], lensShift: 0, roll: 0 },
];
// Shape-preserving Hermite interpolation has no stop at each storyboard pose
// and prevents overshooting a surface or reversing the vertical descent.
function interpolate(at: number, index: number, value: (pose: typeof STATIONS[number]) => number) {
  const a = STATIONS[index], b = STATIONS[index + 1], span = b.at - a.at;
  const secant = (i: number) => (value(STATIONS[i + 1]) - value(STATIONS[i])) / (STATIONS[i + 1].at - STATIONS[i].at);
  const slope = (i: number) => {
    if (i === 0) return secant(0);
    if (i === STATIONS.length - 1) return secant(i - 1);
    const before = secant(i - 1), after = secant(i);
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  };
  const t = (at - a.at) / span, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * value(a) + (t3 - 2 * t2 + t) * span * slope(index)
    + (-2 * t3 + 3 * t2) * value(b) + (t3 - t2) * span * slope(index + 1);
}
/** Deterministic reversible descent. Native scroll is the only timeline. */
export function sampleHyacinthScrollCamera(progress: number, options: CameraOptions = {}): HyacinthCameraPose {
  const p = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  if (p === 0) return { ...HYACINTH_ENTRY_POSE };
  if (options.reducedMotion) {
    return {
      position: [HYACINTH_ENTRY_POSE.position[0], HYACINTH_ENTRY_POSE.position[1] - p * 6.8, HYACINTH_ENTRY_POSE.position[2]],
      target: [HYACINTH_ENTRY_POSE.target[0], HYACINTH_ENTRY_POSE.target[1] - p * 6.8, HYACINTH_ENTRY_POSE.target[2]],
      lensShift: 0, canvasShift: .1, roll: 0,
    };
  }
  const at = p * HYACINTH_SCROLL_VIEWPORTS;
  let index = 0;
  while (index < STATIONS.length - 2 && at > STATIONS[index + 1].at) index++;
  const position = [0, 1, 2].map(axis => interpolate(at, index, pose => pose.position[axis])) as [number, number, number];
  const target = [0, 1, 2].map(axis => interpolate(at, index, pose => pose.target[axis])) as [number, number, number];
  let lensShift = interpolate(at, index, pose => pose.lensShift);
  const canvasShift = at <= 10 ? .1 : lensShift * .4;
  let roll = interpolate(at, index, pose => pose.roll);
  if (options.mobile) {
    const blend = Math.min(1, at / 3), distance = 1 + .62 * blend;
    position[0] = target[0] + (position[0] - target[0]) * distance;
    position[2] = target[2] + (position[2] - target[2]) * distance;
    lensShift *= .46;
    roll *= .35;
  }
  return { position, target, lensShift, canvasShift, roll };
}
