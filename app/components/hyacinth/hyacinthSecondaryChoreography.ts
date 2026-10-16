type Four = [number, number, number, number];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * t * (t * (t * 6 - 15) + 10); };
const ramp = (at: number, start: number, end: number) => ease((at - start) / (end - start));

/** All secondary motion is sampled from distance, including release. No spawning. */
export function sampleHyacinthSecondaries(viewports: number, reducedMotion = false) {
  const at = Number.isFinite(viewports) ? Math.max(0, Math.min(44, viewports)) : 0;
  const starts = [4, 14, 28, 38.5];
  const peaks = [8.5, 20, 32, 42.8];
  const ends = [16, 28, 40, 49];
  const growth = starts.map((start, i) => i === 0
    ? .055 + .945 * ramp(at, start - 1.5, peaks[i] - .4)
    : ramp(at, start - 1, peaks[i] - .4)) as Four;
  const unfold = starts.map((start, i) => ramp(at, start, peaks[i] + .3)) as Four;
  const release = peaks.map((peak, i) => ramp(at, peak + .5, Math.min(ends[i], peak + 4.5))) as Four;
  const life = starts.map((start, i) => (i === 0 ? 1 : ramp(at, start - 1, start + .5))
    * (1 - .88 * ramp(at, ends[i] - 3, ends[i]))) as Four;
  const wave = peaks.map(peak => clamp((at - (peak - 1.2)) / 6)) as Four;
  const signal = wave.map(phase => ease(phase / .18) * (1 - ease((phase - .65) / .35))) as Four;
  const fields: [number, number, number] = [
    .23 + .77 * ramp(at, 1.2, 6.5),
    .14 + .86 * ramp(at, 2.5, 9),
    ramp(at, 5, 12),
  ];
  if (reducedMotion) {
    growth.fill(.10); unfold.fill(0); release.fill(0); signal.fill(0); wave.fill(0);
    life.fill(.18); fields.forEach((value, i) => { fields[i] = value * .55; });
  }
  return {
    fields, growth, unfold, release, life, wave, signal,
    sky: (.12 + .88 * ramp(at, 2, 10)) * (reducedMotion ? .25 : 1),
    shade: ramp(at, 1.5, 8),
    motes: (.025 + .975 * ramp(at, 3.5, 10)) * (reducedMotion ? 0 : 1),
  };
}
