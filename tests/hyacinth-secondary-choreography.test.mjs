import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const { sampleHyacinthSecondaries: sample } = require('../app/components/hyacinth/hyacinthSecondaryChoreography.ts');

test('the first wheel movement discovers the existing environment without launching the bloom effects', () => {
  const opening = sample(0);
  assert.ok(opening.fields[0] > 0 && opening.fields[1] > 0);
  assert.equal(opening.fields[2], 0);
  assert.ok(opening.growth[0] > 0 && opening.growth[0] < .1);
  for (const at of [.01, .25, .65, 1]) {
    const state = sample(at);
    assert.deepEqual(state.fields, opening.fields);
    assert.deepEqual(state.unfold, [0, 0, 0, 0]);
    assert.deepEqual(state.signal, [0, 0, 0, 0]);
    assert.equal(state.shade, 0);
  }
});

test('each opening precedes its emitted response and release', () => {
  for (const [slot, start, peak] of [[0, 4, 8.5], [1, 14, 20], [2, 28, 32], [3, 38.5, 42.8]]) {
    assert.equal(sample(start).signal[slot], 0);
    assert.equal(sample(start).release[slot], 0);
    assert.ok(sample(peak).unfold[slot] > .9);
    assert.ok(sample(peak).signal[slot] > .5);
    assert.equal(sample(peak).release[slot], 0);
    if (slot < 3) assert.ok(sample(peak + 4.5).release[slot] > .99);
  }
  assert.ok(Math.max(...sample(26).signal) < Math.max(...sample(20.5).signal));
});

test('direct jumps, reverse scroll, and source handoffs produce the same continuous state', () => {
  const flatten = state => Object.values(state).flat();
  const snapshots = Array.from({ length: 441 }, (_, i) => sample(i / 10));
  for (let i = 440; i >= 0; i--) assert.deepEqual(sample(i / 10), snapshots[i]);
  for (const boundary of [0, 1.2, 4, 8.5, 13, 14, 16, 20, 27, 28, 32, 38, 40, 42.8, 44]) {
    const before = flatten(sample(boundary - .0001)), after = flatten(sample(boundary + .0001));
    assert.ok(after.every((n, i) => Number.isFinite(n) && Math.abs(n - before[i]) < .001));
  }
  assert.deepEqual(sample(NaN), sample(0));
  assert.deepEqual(sample(100), sample(44));
});

test('reduced motion retains the environment but has no unfolding, release, or propagation', () => {
  for (const at of [0, 6, 9, 20, 26, 32, 42, 44]) {
    const state = sample(at, true);
    assert.ok(state.fields[0] > 0);
    for (const key of ['unfold', 'release', 'wave', 'signal']) assert.deepEqual(state[key], [0, 0, 0, 0]);
    assert.equal(state.motes, 0);
  }
});
