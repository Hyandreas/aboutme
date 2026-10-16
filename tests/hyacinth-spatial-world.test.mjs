import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const THREE = require('three');
const {createHyacinthSpatialWorld} = require('../app/components/hyacinth/hyacinthSpatialWorld.ts');
const {sampleHyacinthJourney} = require('../app/components/hyacinth/hyacinthChoreography.ts');
const state = at => ({...sampleHyacinthJourney(at / 44), focus: [.6, 0, .2], eye: [-1, 1, 6], reducedMotion: false});

test('the world starts with faint contours, remains populated and reverses deterministically', () => {
  const scene = new THREE.Scene(), world = createHyacinthSpatialWorld(scene, false);
  const group = scene.getObjectByName('hyacinth-spatial-world');
  const uniforms = group.children[0].material.uniforms;
  world.update(state(0), 0);
  assert.equal(group.visible, true);
  assert.ok(uniforms.uFields.value.x > 0 && uniforms.uFields.value.x < .3);
  assert.equal(uniforms.uFields.value.z, 0);
  const values = [];
  for (let at = 1; at <= 44; at++) {
    world.update(state(at), 0);
    assert.equal(group.visible, true);
    assert.equal(uniforms.uReveal.value, 1);
    assert.ok(uniforms.uPresence.value >= .49, `persistent world at viewport ${at}`);
    values.push([uniforms.uAt.value, uniforms.uPresence.value]);
  }
  for (let at = 44; at >= 1; at--) {
    world.update(state(at), 0);
    assert.deepEqual([uniforms.uAt.value, uniforms.uPresence.value], values[at - 1]);
  }
  world.dispose();
});

test('both quality tiers freeze authored motion and release every GPU resource on disposal', () => {
  for (const mobile of [false, true]) {
    const scene = new THREE.Scene(), world = createHyacinthSpatialWorld(scene, mobile);
    const group = scene.getObjectByName('hyacinth-spatial-world');
    let disposed = 0;
    for (const mesh of group.children) {
      mesh.geometry.addEventListener('dispose', () => disposed++);
      mesh.material.addEventListener('dispose', () => disposed++);
      assert.equal(mesh.material.depthTest, true);
      assert.equal(mesh.material.forceSinglePass, true);
    }
    const uniforms = group.children[0].material.uniforms;
    world.update({...state(26), reducedMotion: true}, 19);
    assert.equal(uniforms.uMotion.value, 0);
    assert.equal(uniforms.uTime.value, 0);
    const resourceCount = group.children.length * 2;
    world.dispose(); world.dispose(); world.update(state(2), 1);
    assert.equal(disposed, resourceCount);
    assert.equal(scene.children.length, 0);
  }
});
