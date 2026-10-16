import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const require = createRequire(import.meta.url);
require('./helpers/register-typescript.cjs');
const reconstructionFile = fileURLToPath(new URL(
  '../app/components/hyacinth/hyacinthReconstruction.ts', import.meta.url,
));
const reconstructReferencePoints = existsSync(reconstructionFile)
  ? require(reconstructionFile).reconstructReferencePoints
  : undefined;

function reconstruct(source, options) {
  assert.equal(typeof reconstructReferencePoints, 'function',
    'The reference-constrained 3D reconstruction API has not been implemented');
  return reconstructReferencePoints(source, options);
}

const OPTIONS = {
  cameraPosition: [-4.381869892, 2.60337031, 9.841986264],
  cameraTarget: [-1.416995459, 1.85, -0.630441797],
  aspect: 1440 / 900,
  width: 1440,
  height: 900,
  fov: 42,
};

// RGB samples are literal pixels from the supplied 1792 x 2688 hyacinth.png.
// They cover the front open florets, side-facing bells, and the upper crown.
const REFERENCE_SAMPLES = [
  [.49, .59, 42, 35, 143], [.43, .53, 49, 59, 177],
  [.56, .52, 49, 72, 190], [.41, .64, 77, 78, 168],
  [.57, .66, 44, 7, 93], [.45, .61, 35, 37, 136],
  [.52, .68, 6, 14, 87], [.46, .40, 0, 45, 150],
  [.34, .39, 56, 78, 181], [.37, .47, 18, 11, 103],
  [.47, .45, 0, 33, 96], [.64, .51, 82, 84, 184],
  [.70, .46, 56, 10, 176], [.73, .54, 96, 89, 201],
  [.77, .53, 179, 165, 255], [.70, .34, 82, 55, 226],
  [.45, .09, 35, 58, 148], [.41, .15, 0, 37, 112],
  [.62, .13, 218, 209, 255], [.57, .18, 56, 86, 253],
  [.62, .73, 0, 15, 59], [.70, .76, 1, 25, 103],
];

function referenceFixture() {
  const positions = new Float32Array(REFERENCE_SAMPLES.length * 3);
  const colors = new Float32Array(positions.length);
  const seeds = new Float32Array(REFERENCE_SAMPLES.length);
  const uv = new Float32Array(REFERENCE_SAMPLES.length * 2);
  const height = 7;
  const width = height * (1792 / 2688);
  const radius = width * .5 / Math.sin(2.15 * .5);
  const zOffset = radius * Math.cos(2.15 * .5);
  REFERENCE_SAMPLES.forEach(([u, v, r8, g8, b8], i) => {
    const r = r8 / 255, g = g8 / 255, b = b8 / 255;
    const nx = (u - .5) * 2, ny = (v - .5) * 2;
    const dome = Math.sqrt(Math.max(0, 1 - nx * nx * .9 - ny * ny * .5));
    const relief = (.299 * r + .587 * g + .114 * b - .45) * .95 + dome * .5;
    const rr = radius + relief;
    const theta = (u - .5) * 2.15;
    positions.set([
      Math.sin(theta) * rr,
      (.5 - v) * height + .15,
      Math.cos(theta) * rr - zOffset,
    ], i * 3);
    colors.set([r * .97, g * .97, b * .97], i * 3);
    seeds[i] = (i * 17 % 23) / 23;
    uv.set([u, v], i * 2);
  });
  return { positions, colors, seeds, uv };
}

function referenceCamera(options = OPTIONS) {
  const camera = new THREE.PerspectiveCamera(options.fov, options.aspect, .1, 300);
  camera.position.fromArray(options.cameraPosition);
  camera.lookAt(new THREE.Vector3().fromArray(options.cameraTarget));
  camera.updateMatrixWorld(true);
  return camera;
}

function cameraDepth(positions, index, camera) {
  return -new THREE.Vector3().fromArray(positions, index * 3)
    .applyMatrix4(camera.matrixWorldInverse).z;
}

function screenPoint(positions, index, camera, options = OPTIONS) {
  const projected = new THREE.Vector3().fromArray(positions, index * 3).project(camera);
  return [(projected.x + 1) * options.width / 2, (1 - projected.y) * options.height / 2];
}

test('reassigning the original dots onto 3D petals preserves their canonical screen positions', () => {
  const source = referenceFixture();
  const viewports = [OPTIONS, { ...OPTIONS, aspect: 390 / 844, width: 390, height: 844 }];
  for (const options of viewports) {
    const result = reconstruct(source, options);
    const camera = referenceCamera(options);
    assert.equal(result.positions.length, source.positions.length);
    for (let i = 0; i < source.seeds.length; i++) {
      const before = screenPoint(source.positions, i, camera, options);
      const after = screenPoint(result.positions, i, camera, options);
      assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) < .001,
        `Reference sample ${i} moved in the canonical ${options.width}px image`);
    }
  }
});

test('depth reassignment compensates apparent dot diameter and preserves RGB and seeds', () => {
  const source = referenceFixture();
  const colorsBefore = source.colors.slice();
  const seedsBefore = source.seeds.slice();
  const result = reconstruct(source, OPTIONS);
  const camera = referenceCamera();
  assert.deepEqual(result.colors, colorsBefore);
  assert.deepEqual(result.seeds, seedsBefore);
  assert.equal(result.pointScale.length, source.seeds.length);

  let largestMove = 0;
  for (let i = 0; i < source.seeds.length; i++) {
    const beforeDepth = cameraDepth(source.positions, i, camera);
    const afterDepth = cameraDepth(result.positions, i, camera);
    const seedDiameter = .7 + source.seeds[i] * .7;
    assert.ok(afterDepth > 0);
    assert.ok(Math.abs(
      result.pointScale[i] * seedDiameter / afterDepth - seedDiameter / beforeDepth,
    ) < 1e-7, `Depth assignment changed apparent diameter of reference dot ${i}`);
    largestMove = Math.max(largestMove, Math.abs(afterDepth - beforeDepth));
  }
  assert.ok(largestMove > .1,
    'The sample dots must be reassigned onto petal geometry, rather than returned unchanged');
});

function assertUnitNormals(positions, normals, label) {
  assert.equal(normals.length, positions.length, `${label} needs one normal per dot`);
  for (let i = 0; i < normals.length; i += 3) {
    const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
    assert.ok(Number.isFinite(length) && Math.abs(length - 1) < .001,
      `${label} normal ${i / 3} must be a finite unit direction`);
  }
}

function distanceToSurface(point, surface) {
  const triangle = new THREE.Triangle();
  const closest = new THREE.Vector3();
  let distance = Infinity;
  for (let i = 0; i < surface.indices.length; i += 3) {
    triangle.a.fromArray(surface.positions, surface.indices[i] * 3);
    triangle.b.fromArray(surface.positions, surface.indices[i + 1] * 3);
    triangle.c.fromArray(surface.positions, surface.indices[i + 2] * 3);
    triangle.closestPointToPoint(point, closest);
    distance = Math.min(distance, closest.distanceTo(point));
  }
  return distance;
}

test('reference dots occupy actual petal triangles with outward surface normals', () => {
  const source = referenceFixture();
  const result = reconstruct(source, OPTIONS);
  const surfaces = new Map(result.surfaces.map((surface) => [surface.id, surface]));
  const cameraPosition = new THREE.Vector3().fromArray(OPTIONS.cameraPosition);
  assert.equal(result.surfaceIds.length, source.seeds.length);
  assertUnitNormals(result.positions, result.normals, 'Reference');
  const occupiedPetals = new Set();

  for (let i = 0; i < source.seeds.length; i++) {
    const surface = surfaces.get(result.surfaceIds[i]);
    assert.ok(surface, `Reference dot ${i} has no corresponding reconstructed surface`);
    const point = new THREE.Vector3().fromArray(result.positions, i * 3);
    assert.ok(distanceToSurface(point, surface) < .0001,
      `Reference dot ${i} floats off its assigned petal surface`);
    const normal = new THREE.Vector3().fromArray(result.normals, i * 3);
    assert.ok(normal.dot(cameraPosition.clone().sub(point)) >= -.0001,
      `Reference dot ${i} uses an inward or rear-facing normal`);
    if (surface.kind === 'petal') occupiedPetals.add(surface.id);
  }
  assert.ok(occupiedPetals.size >= 4,
    'The crown, open florets, and side bells must occupy separate petal surfaces');
});

function inspectClosedShell(surface, camera) {
  const vertexCount = surface.positions.length / 3;
  assert.ok(vertexCount >= 6 && Number.isInteger(vertexCount));
  assert.ok(surface.indices.length >= 12 && surface.indices.length % 3 === 0);
  assert.equal(surface.referenceUV.length, vertexCount * 2);

  // Weld equal seam vertices: a closed mesh may repeat vertices for normals.
  const weldedIds = new Map();
  const welded = [];
  const depthByUV = new Map();
  for (let i = 0; i < vertexCount; i++) {
    const point = [...surface.positions.slice(i * 3, i * 3 + 3)];
    assert.ok(point.every(Number.isFinite));
    const key = point.map((value) => value.toFixed(6)).join(',');
    if (!weldedIds.has(key)) weldedIds.set(key, weldedIds.size);
    welded[i] = weldedIds.get(key);
    const uv = [...surface.referenceUV.slice(i * 2, i * 2 + 2)];
    assert.ok(uv.every(Number.isFinite));
    const uvKey = uv.map((value) => value.toFixed(6)).join(',');
    if (!depthByUV.has(uvKey)) depthByUV.set(uvKey, []);
    depthByUV.get(uvKey).push(cameraDepth(surface.positions, i, camera));
  }

  const edges = new Map();
  const adjacency = new Map();
  const triangle = new THREE.Triangle();
  let signedVolume = 0;
  for (let i = 0; i < surface.indices.length; i += 3) {
    const original = [...surface.indices.slice(i, i + 3)];
    assert.ok(original.every((index) => Number.isInteger(index) && index < vertexCount));
    const vertices = original.map((index) => welded[index]);
    triangle.a.fromArray(surface.positions, original[0] * 3);
    triangle.b.fromArray(surface.positions, original[1] * 3);
    triangle.c.fromArray(surface.positions, original[2] * 3);
    assert.ok(triangle.getArea() > 1e-10, `Petal ${surface.id} contains a collapsed triangle`);
    signedVolume += triangle.a.dot(new THREE.Vector3().crossVectors(triangle.b, triangle.c)) / 6;
    for (let side = 0; side < 3; side++) {
      const a = vertices[side], b = vertices[(side + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
      if (!adjacency.has(a)) adjacency.set(a, new Set());
      if (!adjacency.has(b)) adjacency.set(b, new Set());
      adjacency.get(a).add(b);
      adjacency.get(b).add(a);
    }
  }
  for (const incidence of edges.values()) {
    assert.equal(incidence, 2, `Petal ${surface.id} has an open or non-manifold edge`);
  }
  const visited = new Set();
  const queue = [adjacency.keys().next().value];
  while (queue.length) {
    const vertex = queue.pop();
    if (visited.has(vertex)) continue;
    visited.add(vertex);
    queue.push(...adjacency.get(vertex));
  }
  assert.equal(visited.size, adjacency.size, `Petal ${surface.id} has disconnected front and back sheets`);
  assert.ok(Math.abs(signedVolume) > 1e-5, `Petal ${surface.id} has no enclosed volume`);
  const pairedDepths = [...depthByUV.values()].filter((depths) =>
    depths.length > 1 && Math.max(...depths) - Math.min(...depths) > .002);
  assert.ok(pairedDepths.length >= 3,
    `Petal ${surface.id} must have distinct front and back sides along reference rays`);
}

test('florets consist of independent connected petal shells with near and far surfaces', () => {
  const result = reconstruct(referenceFixture(), OPTIONS);
  const camera = referenceCamera();
  const petals = result.surfaces.filter((surface) => surface.kind === 'petal');
  assert.ok(petals.length >= 6, 'The specimen needs multiple anatomical petals');
  const centroidDepths = [];
  for (const petal of petals) {
    inspectClosedShell(petal, camera);
    let depth = 0;
    for (let i = 0; i < petal.positions.length / 3; i++) {
      depth += cameraDepth(petal.positions, i, camera);
    }
    centroidDepths.push(depth / (petal.positions.length / 3));
  }
  assert.ok(Math.max(...centroidDepths) - Math.min(...centroidDepths) > .1,
    'Distinct foreground and occluded florets cannot share one image sheet');
});

test('hidden completion dots sample the same closed surfaces and retain valid normals', () => {
  const result = reconstruct(referenceFixture(), OPTIONS);
  const count = result.hiddenPositions.length / 3;
  assert.ok(Number.isInteger(count) && count > 0, 'Orbiting needs unseen petal surface samples');
  assert.equal(result.hiddenColors.length, result.hiddenPositions.length);
  assert.equal(result.hiddenSurfaceIds.length, count);
  assert.equal(result.hiddenSeeds.length, count);
  assert.equal(result.hiddenPointScale.length, count);
  assertUnitNormals(result.hiddenPositions, result.hiddenNormals, 'Hidden');
  const surfaces = new Map(result.surfaces.map((surface) => [surface.id, surface]));
  const hiddenPetals = new Set();
  for (let i = 0; i < count; i += Math.max(1, Math.floor(count / 24))) {
    const surface = surfaces.get(result.hiddenSurfaceIds[i]);
    assert.ok(surface, `Hidden dot ${i} has no reconstructed surface`);
    const point = new THREE.Vector3().fromArray(result.hiddenPositions, i * 3);
    assert.ok(distanceToSurface(point, surface) < .0001,
      `Hidden dot ${i} is a separate relief layer instead of a shell sample`);
    if (surface.kind === 'petal') hiddenPetals.add(surface.id);
  }
  assert.ok(hiddenPetals.size > 1, 'Hidden completion must represent separate petals');
});

test('throat completion covers front and rear tube walls when orbiting', () => {
  const result = reconstruct(referenceFixture(), OPTIONS);
  const throatIds = new Set(result.surfaces
    .filter((surface) => surface.kind === 'throat').map((surface) => surface.id));
  assert.ok(throatIds.size > 0, 'Florets need reconstructed throat attachments');
  const eye = new THREE.Vector3().fromArray(OPTIONS.cameraPosition);
  let facingReference = 0, facingAway = 0;
  for (let i = 0; i < result.hiddenSurfaceIds.length; i++) {
    if (!throatIds.has(result.hiddenSurfaceIds[i])) continue;
    const point = new THREE.Vector3().fromArray(result.hiddenPositions, i * 3);
    const normal = new THREE.Vector3().fromArray(result.hiddenNormals, i * 3);
    assert.ok(Math.abs(normal.length() - 1) < .001, 'Throat completion normals must be unit directions');
    const facing = normal.dot(eye.clone().sub(point).normalize());
    if (facing > .05) facingReference++;
    if (facing < -.05) facingAway++;
  }
  assert.ok(facingAway > 0, 'Throat completion is missing its rear-facing tube walls');
  assert.ok(facingReference > 0,
    'Throat completion is missing canonical-facing walls that become visible during the orbit');
});

test('petal anatomy is independent of reference pixel brightness', () => {
  const source = referenceFixture();
  const recolored = { ...source, colors: new Float32Array(source.colors.length).fill(.5) };
  const originalGeometry = reconstruct(source, OPTIONS);
  const recoloredGeometry = reconstruct(recolored, OPTIONS);
  assert.deepEqual(recoloredGeometry.positions, originalGeometry.positions,
    'Changing RGB alone must not substitute luminance relief for anatomical depth');
  assert.deepEqual(recoloredGeometry.surfaceIds, originalGeometry.surfaceIds);
  assert.deepEqual(recoloredGeometry.surfaces, originalGeometry.surfaces);
  assert.deepEqual(recoloredGeometry.colors, recolored.colors);
});

test('reconstruction is deterministic, finite, and leaves the source samples unchanged', () => {
  const source = referenceFixture();
  const before = structuredClone(source);
  const first = reconstruct(source, OPTIONS);
  const second = reconstruct(source, OPTIONS);
  assert.deepEqual(source, before);
  for (const field of [
    'positions', 'colors', 'seeds', 'pointScale', 'normals', 'surfaceIds',
    'hiddenPositions', 'hiddenColors', 'hiddenSeeds', 'hiddenPointScale',
    'hiddenNormals', 'hiddenSurfaceIds',
  ]) {
    assert.deepEqual(first[field], second[field], `${field} changes between identical reconstructions`);
    assert.ok([...first[field]].every(Number.isFinite), `${field} contains non-finite values`);
  }
  assert.ok([...first.positions, ...first.hiddenPositions].every((value) => Math.abs(value) < 20),
    'Reconstructed geometry must stay within the specimen bounds');
  assert.ok([...first.pointScale, ...first.hiddenPointScale].every((value) => value > 0),
    'Every dot needs a positive diameter');
  assert.ok([...first.colors, ...first.hiddenColors].every((value) => value >= 0 && value <= 1),
    'Colors must remain valid normalized RGB values');
  assert.deepEqual(first.surfaces, second.surfaces);
});
