import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const motionPath = new URL('../app/components/hyacinth/hyacinthPetalMotion.ts', import.meta.url);
const motion = existsSync(motionPath) ? require(fileURLToPath(motionPath)) : {};
const { loadHyacinthAsset } = require('../app/components/hyacinth/hyacinthAsset.ts');
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(readFileSync(new URL('../public/assets/hyacinth-desktop.bin.gz', import.meta.url)));
const asset = await loadHyacinthAsset(false);
globalThis.fetch = originalFetch;

const rig = {
  id: 14, root: [1, 2, 3], tip: [2, 2, 3], direction: [1, 0, 0],
  axis: [0, -1, 0], inverseLength: 1, opening: Math.PI / 6,
  curl: Math.PI / 30, slot: 0, delay: 0,
};
const sub = (a, b) => a.map((value, i) => value - b[i]);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = vector => vector.map(value => value / Math.hypot(...vector));
const distance = (a, b) => Math.hypot(...sub(a, b));
function deform(...args) {
  assert.equal(typeof motion.deformPetalPoint, 'function', 'Petal motion must deform points about their attachments');
  return motion.deformPetalPoint(...args);
}
function rigs() {
  assert.equal(typeof motion.createPetalMotionRigs, 'function', 'Existing petal identities need attachment rigs');
  return motion.createPetalMotionRigs(asset.reconstruction.surfaces);
}

test('zero motion preserves the exact positions and normals of the original entry', () => {
  const point = [1.7, 2.12, 3.05], normal = [.12, .3, .945];
  const result = deform(rig, point, normal, [0, 0, 0, 0], 123);
  assert.deepEqual(result.position, point);
  assert.deepEqual(result.normal, normal);
});

test('opening fixes the root while the lip spreads by a visibly curved bend', () => {
  for (const amount of [-.12, .25, 1]) {
    assert.deepEqual(deform(rig, rig.root, [0, 0, 1], [amount, 0, 0, 0], 0).position, rig.root);
  }
  const tip = deform(rig, rig.tip, [0, 0, 1], [1, 0, 0, 0], 0).position;
  assert.ok(distance(tip, [1 + Math.cos(Math.PI / 5), 2, 3 + Math.sin(Math.PI / 5)]) < 1e-10);
  const half = deform(rig, [1.5, 2, 3], [0, 0, 1], [1, 0, 0, 0], 0).position;
  const halfAngle = Math.atan2(half[2] - 3, half[0] - 1);
  assert.ok(halfAngle > 0 && halfAngle < Math.PI / 10,
    'The inner sheet must bend less than the rim instead of rotating as a rigid flap');
});

test('anticipation, settlement and reduced motion are bounded and reversible', () => {
  const before = deform(rig, rig.tip, [0, 0, 1], [-.12, 0, 0, 0], 0).position;
  const peak = deform(rig, rig.tip, [0, 0, 1], [1, 0, 0, 0], 0).position;
  const settle = deform(rig, rig.tip, [0, 0, 1], [.3, 0, 0, 0], 0).position;
  assert.ok(before[2] < rig.tip[2] && peak[2] > rig.tip[2]);
  assert.ok(distance(settle, rig.tip) > 0 && distance(settle, rig.tip) < distance(peak, rig.tip));
  assert.deepEqual(deform(rig, rig.tip, [0, 0, 1], [1, 1, 1, 1], 42, true).position, rig.tip);
  const values = [0, -.12, .4, 1, .3];
  const forward = values.map(value => deform(rig, rig.tip, [0, 0, 1], [value, 0, 0, 0], 7));
  for (let i = values.length - 1; i >= 0; i--) assert.deepEqual(deform(rig, rig.tip, [0, 0, 1], [values[i], 0, 0, 0], 7), forward[i]);
});

test('deformed normals stay perpendicular to the actual curved sheet', () => {
  const p = [1.68, 2.06, 3.08], n = [0, 0, 1], h = 1e-5;
  const result = deform(rig, p, n, [.83, 0, 0, 0], 0);
  const xA = deform(rig, [p[0] - h, p[1], p[2]], n, [.83, 0, 0, 0], 0).position;
  const xB = deform(rig, [p[0] + h, p[1], p[2]], n, [.83, 0, 0, 0], 0).position;
  const yA = deform(rig, [p[0], p[1] - h, p[2]], n, [.83, 0, 0, 0], 0).position;
  const yB = deform(rig, [p[0], p[1] + h, p[2]], n, [.83, 0, 0, 0], 0).position;
  assert.ok(distance(result.normal, unit(cross(sub(xB, xA), sub(yB, yA)))) < 1e-7,
    'Normals must include the bend gradient, not merely rotate with the hinge');
});

test('the traced bell, passage, lower blossom and finale have distinct live anchors', () => {
  const fitted = rigs();
  for (const id of [14, 38, 47, 42]) assert.ok(fitted.has(id), `Traced leading petal ${id} needs a motion frame`);
  assert.equal(fitted.get(14).slot, 0);
  assert.equal(fitted.get(38).slot, 1);
  assert.equal(fitted.get(47).slot, 2);
  for (const id of [14, 38, 47]) {
    const petal = fitted.get(id), blooms = [0, 0, 0, 0];
    blooms[petal.slot] = 1;
    const result = deform(petal, petal.tip, [0, 0, 1], blooms, 0);
    assert.ok(distance(result.position, petal.tip) > .2, `Petal ${id} must visibly unfurl without glow`);
    assert.deepEqual(deform(petal, petal.root, [0, 0, 1], blooms, 0).position, petal.root);
  }
});

test('peak opening preserves orientation and finite unit normals on the baked shells', () => {
  const fitted = rigs();
  for (const surface of asset.reconstruction.surfaces) {
    const petal = fitted.get(surface.id);
    if (!petal) continue;
    for (let i = 0; i < surface.positions.length; i += 3) {
      const p = [...surface.positions.subarray(i, i + 3)], n = [...surface.normals.subarray(i, i + 3)];
      const result = deform(petal, p, n, [1, 1, 1, 1], 0);
      assert.ok(result.determinant > .15, `Petal ${surface.id} must not invert at peak opening`);
      assert.ok(result.position.every(Number.isFinite) && result.normal.every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(...result.normal) - 1) < 1e-6);
    }
  }
});
