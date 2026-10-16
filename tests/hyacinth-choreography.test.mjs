import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const {sampleHyacinthJourney: sample} = require('../app/components/hyacinth/hyacinthChoreography.ts');

test('entry preserves the original pose and environment', () => {
  const state=sample(0);
  assert.deepEqual(state.blooms,[0,0,0,0]);
  for(const key of ['energy','flow','ripple','focusWeight'])assert.equal(state[key],0);
});
test('major openings have anticipation, peak and a lower sustained pose', () => {
  for(const [slot,anticipate,peak,settle] of [[0,5.5,8.5,14],[1,14.5,20,26],[2,28.5,32,38]]) {
    assert.ok(sample(anticipate/44).blooms[slot]<0);
    assert.equal(sample(peak/44).blooms[slot],1);
    assert.ok(sample(settle/44).blooms[slot]>.1 && sample(settle/44).blooms[slot]<.4);
  }
});
test('the underside breathes between distinct visual peaks',()=>{
  for(const at of [8.5,20.5,32,42.5])assert.ok(sample(at/44).energy>sample(26/44).energy*10);
  assert.ok(sample(1).energy < sample(42.5/44).energy*.3);
});
test('changing focal subjects cannot snap the camera between targets',()=>{
  for(const at of [14,27]){
    assert.ok(sample((at-.0001)/44).focusWeight<.001);
    assert.ok(sample((at+.0001)/44).focusWeight<.001);
  }
});
test('large action is deterministic when stopped, revisited or reversed',()=>{
  const states=Array.from({length:441},(_,i)=>sample(i/440));
  for(let i=440;i>=0;i--)assert.deepEqual(sample(i/440),states[i]);
  for(const state of states)assert.ok([...state.blooms,state.energy,state.flow,state.ripple,state.focusWeight].every(Number.isFinite));
});
test('reduced motion removes bloom, focal moves and expanding ripples',()=>{
  for(const at of [0,8.5,20,26,32,44]){
    const state=sample(at/44,true);
    assert.deepEqual(state.blooms,[0,0,0,0]);
    assert.equal(state.focusWeight,0);assert.equal(state.ripple,0);
    assert.ok(state.energy<=.12 && state.flow<=.12);
  }
});
