import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const THREE = require('three');
const { createHyacinthSpatialWorld } = require('../app/components/hyacinth/hyacinthSpatialWorld.ts');
const { createHyacinthAtmosphere } = require('../app/components/hyacinth/hyacinthAtmosphere.ts');

test('etched forms and dotted strands use identical live attachments and fixed release frames', () => {
  const scene = new THREE.Scene();
  const world = createHyacinthSpatialWorld(scene, false), air = createHyacinthAtmosphere(scene, false);
  const frames = Array.from({ length: 4 }, (_, i) => ({
    position: new THREE.Vector3(i, 2, .5), tangent: new THREE.Vector3(1, 0, 0), normal: new THREE.Vector3(0, 0, 1),
    releasePosition: new THREE.Vector3(i, 2.5, 1), releaseTangent: new THREE.Vector3(0, 1, 0), releaseNormal: new THREE.Vector3(0, 0, 1),
  }));
  const state = {at: 8, energy: .8, flow: .6, ripple: .5, quiet: .2, focus: [0, 1, 0], reducedMotion: false, emissionFrames: frames};
  const wu = scene.getObjectByName('hyacinth-world-shards').material.uniforms;
  const au = scene.getObjectByName('hyacinth-particle-currents').material.uniforms;
  for (const at of [0, 5, 9, 13, 20, 14, 0]) {
    frames[0].position.z = at * .1;
    world.update({...state, at}, 0); air.update({...state, at}, 0);
    for (const uniforms of [wu, au]) {
      assert.equal(uniforms.uAnchorsReady.value, 1);
      assert.deepEqual(uniforms.uSource.value[0].toArray(), frames[0].position.toArray());
      assert.deepEqual(uniforms.uReleasedSource.value[0].toArray(), [0, 2.5, 1]);
    }
    for (const key of ['uGrowth', 'uUnfold', 'uRelease', 'uLife', 'uWave', 'uSignal'])
      assert.deepEqual(wu[key].value.toArray(), au[key].value.toArray());
  }
  world.update({...state, emissionFrames: undefined}, 0);
  air.update({...state, emissionFrames: undefined}, 0);
  assert.equal(wu.uAnchorsReady.value, 0); assert.equal(au.uAnchorsReady.value, 0);
  world.dispose(); air.dispose();
});
