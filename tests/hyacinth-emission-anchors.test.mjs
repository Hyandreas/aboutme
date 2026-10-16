import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { WebGLRenderList } from 'three/src/renderers/webgl/WebGLRenderLists.js';

const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const THREE = require('three');
const { loadHyacinthAsset } = require('../app/components/hyacinth/hyacinthAsset.ts');
const { createReconstructedCloud } = require('../app/components/hyacinth/hyacinthReconstructedCloud.ts');
const { createPetalMotionRigs, deformPetalPoint } = require('../app/components/hyacinth/hyacinthPetalMotion.ts');
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(readFileSync(new URL('../public/assets/hyacinth-desktop.bin.gz', import.meta.url)));
const asset = await loadHyacinthAsset(false);
globalThis.fetch = originalFetch;
globalThis.devicePixelRatio = 1;

const ids = [14, 38, 47, 42];
const rigs = createPetalMotionRigs(asset.reconstruction.surfaces);
const offset = new THREE.Vector3(.3, -.2, 1.7);
const vector = values => new THREE.Vector3(...values);
const near = (actual, expected, message, tolerance = 1e-7) => assert.ok(actual.distanceTo(expected) < tolerance,
  `${message}: ${actual.toArray()} differs from ${expected.toArray()}`);

function fixture(t, manualDepthDisposal = false) {
  // The front samples only establish the cloud. Emitters use the real baked
  // petal shells, including their traced lip landmarks and fitted normals.
  const geometry = new THREE.BufferGeometry();
  const positions = asset.reconstruction.positions.slice(0, 12);
  for (let i = 0; i < positions.length; i++) positions[i] -= offset.getComponent(i % 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(asset.reconstruction.colors.slice(0, 12), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(asset.reconstruction.seeds.slice(0, 4), 1));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: true,
    uniforms: { uWave: { value: 0 }, uSwell: { value: 0 } },
    vertexShader: 'void main(){}', fragmentShader: 'void main(){}',
  });
  const cloud = createReconstructedCloud(geometry, material, { uv: asset.uv.slice(0, 8), offset: offset.toArray(), asset });
  const parent = new THREE.Group();
  parent.add(cloud.points);
  t.after(() => { if (!manualDepthDisposal) cloud.disposeDepth(); geometry.dispose(); material.dispose(); });
  assert.equal(typeof cloud.getEmissionAnchors, 'function', 'Petal strands need a deformed, oriented attachment API');
  return { cloud, parent };
}

function snapshot(anchors) {
  return anchors.map(anchor => Object.fromEntries(Object.entries(anchor).map(([key, value]) =>
    [key, value instanceof THREE.Vector3 ? value.toArray() : value])));
}

test('all four strands stay on their traced petal tips through anticipation and opening', t => {
  const { cloud } = fixture(t);
  for (const blooms of [[0, 0, 0, 0], [-.12, .4, .8, 0], [1, .65, .2, .5]]) {
    cloud.setMotion(blooms, 3.6, false);
    const anchors = cloud.getEmissionAnchors();
    assert.equal(anchors.length, 4);
    anchors.forEach((anchor, slot) => {
      assert.equal(anchor.slot, slot);
      assert.equal(anchor.petalId, ids[slot]);
      const rig = rigs.get(ids[slot]);
      const expected = deformPetalPoint(rig, rig.tip, [0, 0, 1], blooms, 3.6);
      near(anchor.position, vector(expected.position).sub(offset), `Slot ${slot} follows the actual CPU bend`);
      near(anchor.restPosition, vector(rig.tip).sub(offset), `Slot ${slot} retains its undeformed tip`);
      near(anchor.position, cloud.getFocus(slot).position, `Slot ${slot} agrees with the established focus landmark`);
    });
  }
});

test('attachment frames follow the curved surface and remain orthonormal in world space', t => {
  const { cloud, parent } = fixture(t);
  cloud.setMotion([0, 0, 0, 0], 0, false);
  const restFrames = cloud.getEmissionAnchors().map(anchor => ({
    position: anchor.position.clone().add(offset), tangent: anchor.tangent.clone(), normal: anchor.normal.clone(),
  }));
  parent.position.set(-2, .6, 4);
  parent.rotation.set(.3, -.7, .2);
  parent.scale.set(1.3, .7, 1.8);
  cloud.points.position.set(.2, .15, -.3);
  const blooms = [.83, .63, .92, .2], time = 11;
  cloud.setMotion(blooms, time, false);
  const anchors = cloud.getEmissionAnchors();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(cloud.points.matrixWorld);
  anchors.forEach((anchor, slot) => {
    const rig = rigs.get(ids[slot]), rest = restFrames[slot], h = 1e-5;
    const bent = point => vector(deformPetalPoint(rig, point.toArray(), rest.normal.toArray(), blooms, time).position);
    const along = bent(rest.position.clone().addScaledVector(rest.tangent, h))
      .sub(bent(rest.position.clone().addScaledVector(rest.tangent, -h)));
    const across = rest.normal.clone().cross(rest.tangent);
    const transverse = bent(rest.position.clone().addScaledVector(across, h))
      .sub(bent(rest.position.clone().addScaledVector(across, -h)));
    const expectedNormal = along.clone().cross(transverse).normalize().applyNormalMatrix(normalMatrix);
    const expectedTangent = along.transformDirection(cloud.points.matrixWorld);
    near(anchor.normal, expectedNormal, `Slot ${slot} normal follows the bend Jacobian and inverse transpose`, 2e-6);
    near(anchor.tangent, expectedTangent, `Slot ${slot} tangent follows the deformed sheet`, 2e-6);
    assert.ok(Math.abs(anchor.tangent.dot(anchor.normal)) < 1e-10);
    assert.ok(Math.abs(anchor.tangent.length() - 1) < 1e-10);
    assert.ok(Math.abs(anchor.normal.length() - 1) < 1e-10);
    near(anchor.position, bent(rest.position).sub(offset).applyMatrix4(cloud.points.matrixWorld), `Slot ${slot} respects the complete model transform`);
    near(anchor.restPosition, rest.position.clone().sub(offset).applyMatrix4(cloud.points.matrixWorld), `Slot ${slot} rest position respects the model transform`);
  });
});

test('release frames sample each own peak and remain fixed after petals settle', t => {
  const { cloud } = fixture(t);
  const released = cloud.getEmissionAnchors().map(anchor => ({
    position: anchor.releasePosition.clone(), tangent: anchor.releaseTangent.clone(), normal: anchor.releaseNormal.clone(),
  }));
  for (let slot = 0; slot < 4; slot++) {
    const blooms = [0, 0, 0, 0];
    blooms[slot] = 1;
    cloud.setMotion(blooms, 0, false);
    const peak = cloud.getEmissionAnchors()[slot];
    near(released[slot].position, peak.position, `Slot ${slot} releases at its own canonical peak`);
    near(released[slot].tangent, peak.tangent, `Slot ${slot} retains its peak tangent`);
    near(released[slot].normal, peak.normal, `Slot ${slot} retains its peak normal`);
  }
  for (const [blooms, time] of [[[0, 0, 0, 0], 123], [[1, .3, -.12, .7], 8], [[.1, .2, .3, .4], 200]]) {
    cloud.setMotion(blooms, time, false);
    cloud.getEmissionAnchors().forEach((anchor, slot) => {
      near(anchor.releasePosition, released[slot].position, `Slot ${slot} released origin must not follow later closure`);
      near(anchor.releaseTangent, released[slot].tangent, `Slot ${slot} release tangent must not breathe`);
      near(anchor.releaseNormal, released[slot].normal, `Slot ${slot} release normal must not breathe`);
    });
  }
});

test('forward, reverse and reduced-motion reads are deterministic with stable frame storage', t => {
  const { cloud } = fixture(t);
  const first = cloud.getEmissionAnchors(), firstVectors = first.map(anchor => anchor.position);
  cloud.setMotion([.35, .78, -.1, .2], 5, false);
  const expected = snapshot(cloud.getEmissionAnchors());
  cloud.setMotion([1, 1, 1, 1], 50, false);
  cloud.getEmissionAnchors();
  cloud.setMotion([.35, .78, -.1, .2], 5, false);
  const repeated = cloud.getEmissionAnchors();
  assert.deepEqual(snapshot(repeated), expected);
  assert.equal(repeated, first, 'Animation reads reuse the small anchor array');
  repeated.forEach((anchor, slot) => assert.equal(anchor.position, firstVectors[slot]));
  cloud.setMotion([1, 1, 1, 1], 1e4, true);
  cloud.getEmissionAnchors().forEach(anchor => near(anchor.position, anchor.restPosition, 'Reduced motion uses the rest attachment'));
});

test('secondary-only occlusion runs after the flower and before transparent world geometry', t => {
  const { cloud } = fixture(t);
  const secondary = cloud.secondaryDepthSurface;
  assert.ok(secondary?.isMesh, 'Secondary contours need a depth pass that leaves original flower rendering intact');
  assert.equal(secondary.geometry, cloud.depthSurface.geometry, 'Both depth passes share existing anatomy');
  assert.equal(secondary.material.transparent, true, 'The secondary pass belongs after transparent flower dots');
  assert.equal(secondary.material.colorWrite, false);
  assert.equal(secondary.material.depthWrite, true);
  assert.equal(secondary.material.depthTest, true);
  assert.equal(secondary.material.forceSinglePass, true);
  assert.equal(secondary.material.side, THREE.DoubleSide);
  assert.equal(cloud.depthSurface.material.transparent, false, 'The original primary pass keeps its existing queue');
  const fieldMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
  const field = new THREE.Mesh(new THREE.BufferGeometry(), fieldMaterial);
  field.renderOrder = 2;
  t.after(() => { field.geometry.dispose(); fieldMaterial.dispose(); });
  const list = new WebGLRenderList();
  // Adversarial depths prove that the authored pass ordering wins over the
  // usual transparent painter sort as the camera crosses the world geometry.
  list.push(field, field.geometry, field.material, 0, 1000, null);
  list.push(secondary, secondary.geometry, secondary.material, 0, -1000, null);
  list.push(cloud.points, cloud.points.geometry, cloud.points.material, 0, 0, null);
  list.push(cloud.depthSurface, cloud.depthSurface.geometry, cloud.depthSurface.material, 0, 0, null);
  list.sort();
  assert.deepEqual(list.transparent.map(item => item.object), [cloud.points, secondary, field]);
  assert.deepEqual(list.opaque.map(item => item.object), [cloud.depthSurface]);
});

test('secondary occlusion restores anatomy at exact entry and disposes shared resources once', t => {
  const { cloud } = fixture(t, true);
  const secondary = cloud.secondaryDepthSurface;
  assert.ok(secondary?.isMesh, 'Secondary depth must remain available at the exact reference pose');
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(-4.381869892, 2.60337031, 9.841986264);
  camera.updateMatrixWorld();
  const scene = new THREE.Scene();
  cloud.depthSurface.onBeforeRender(null, scene, camera);
  assert.equal(cloud.depthSurface.geometry.drawRange.count, 0, 'The primary pass still preserves the entry portrait');
  secondary.onBeforeRender(null, scene, camera);
  assert.equal(secondary.geometry.drawRange.count, secondary.geometry.index.count, 'The secondary pass fills the complete occluding shell');
  cloud.setMotion([.4, .7, .1, 0], 9, false);
  assert.equal(secondary.material.uniforms.uPetalBloom, cloud.points.material.uniforms.uPetalBloom);
  assert.deepEqual(secondary.material.uniforms.uPetalBloom.value.toArray(), [.4, .7, .1, 0]);
  assert.equal(secondary.material.uniforms.uPetalTime.value, 9);
  const disposed = { geometry: 0, primary: 0, secondary: 0 };
  secondary.geometry.addEventListener('dispose', () => disposed.geometry++);
  cloud.depthSurface.material.addEventListener('dispose', () => disposed.primary++);
  secondary.material.addEventListener('dispose', () => disposed.secondary++);
  cloud.disposeDepth();
  assert.deepEqual(disposed, { geometry: 1, primary: 1, secondary: 1 });
});
