import {
  hyacinthReferenceSurfaces,
  hyacinthReferenceStem,
  hyacinthReferenceClusters,
  type PetalReference,
  type UV,
} from './hyacinthReferencePetals';

type V3 = [number, number, number];
type Kind = 'petal' | 'stem' | 'throat';

export interface ReferencePointSource {
  positions: Float32Array;
  colors: Float32Array;
  seeds: Float32Array;
  uv: Float32Array;
  pointScale?: Float32Array;
}

export interface ReferenceReconstructionOptions {
  cameraPosition: readonly [number, number, number];
  cameraTarget: readonly [number, number, number];
  aspect: number;
  width: number;
  height: number;
  fov?: number;
}

export interface ReferenceSurface {
  id: number;
  kind: Kind;
  positions: Float32Array;
  indices: Uint32Array;
  referenceUV: Float32Array;
  normals: Float32Array;
}

export interface ReferenceReconstruction {
  positions: Float32Array;
  colors: Float32Array;
  seeds: Float32Array;
  normals: Float32Array;
  pointScale: Float32Array;
  surfaceIds: Uint32Array;
  hiddenPositions: Float32Array;
  hiddenColors: Float32Array;
  hiddenSeeds: Float32Array;
  hiddenNormals: Float32Array;
  hiddenPointScale: Float32Array;
  hiddenSurfaceIds: Uint32Array;
  hiddenUV: Float32Array;
  surfaces: ReferenceSurface[];
  diagnostics: {
    sourceCount: number;
    tracedCount: number;
    supportVertexCount: number;
    surfaceHitCount: number;
    maxProjectionDriftPx: number;
  };
}

interface CameraFrame { eye: V3; forward: V3; right: V3; up: V3 }
interface Triangle { a: number; b: number; c: number; active: boolean }
interface Hit { triangle: Triangle; weights: V3; depth: number }
interface Edge { a: number; b: number }
interface Builder {
  id: number;
  kind: Kind;
  contour: UV[];
  uv: UV[];
  positions: V3[];
  depths: number[];
  projected: UV[];
  triangles: Triangle[];
  boundary: Map<string, Edge>;
  uvBins: Map<string, Triangle[]>;
  rayBins: Map<string, Triangle[]>;
  depthAt: (uv: UV) => number;
  thicknessAt: (uv: UV) => number;
  supports: Map<number, number>;
  sourceIndices: number[];
}

const HEIGHT = 7;
const WIDTH = HEIGHT * 2 / 3;
const ARC = 2.15;
const RADIUS = WIDTH * .5 / Math.sin(ARC * .5);
const Z_OFFSET = RADIUS * Math.cos(ARC * .5);
const STEM_ID = 10_000;
const UV_BIN = 1 / 256;
const RAY_BIN = 1 / 512;
const EPSILON = 1e-11;
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalized = (a: V3): V3 => {
  const length = Math.hypot(...a);
  return length > 1e-15 ? [a[0] / length, a[1] / length, a[2] / length] : [0, 0, 1];
};
const orient = (a: UV, b: UV, c: UV) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const edgeKey = (a: number, b: number) => a < b ? `${a}:${b}` : `${b}:${a}`;
const binKey = (u: number, v: number, spacing: number) => `${Math.floor(u / spacing)}:${Math.floor(v / spacing)}`;

function cameraFrame(options: ReferenceReconstructionOptions): CameraFrame {
  const eye: V3 = [...options.cameraPosition];
  const forward = normalized(minus(options.cameraTarget, eye));
  const right = normalized(cross(forward, [0, 1, 0]));
  return { eye, forward, right, up: normalized(cross(right, forward)) };
}

function cameraDepth(point: V3, camera: CameraFrame) {
  return dot(minus(point, camera.eye), camera.forward);
}

function projectedRay(point: V3, camera: CameraFrame): UV {
  const offset = minus(point, camera.eye);
  const depth = dot(offset, camera.forward);
  return [dot(offset, camera.right) / depth, dot(offset, camera.up) / depth];
}

function onRay(original: V3, depth: number, camera: CameraFrame): V3 {
  const ratio = depth / cameraDepth(original, camera);
  return [
    camera.eye[0] + (original[0] - camera.eye[0]) * ratio,
    camera.eye[1] + (original[1] - camera.eye[1]) * ratio,
    camera.eye[2] + (original[2] - camera.eye[2]) * ratio,
  ];
}

function barycentric(point: UV, a: UV, b: UV, c: UV): V3 | null {
  const denominator = orient(a, b, c);
  if (Math.abs(denominator) < EPSILON) return null;
  const weights: V3 = [orient(b, c, point) / denominator, orient(c, a, point) / denominator, orient(a, b, point) / denominator];
  return weights.every(weight => weight >= -1e-8) ? weights : null;
}

function contains(point: UV, polygon: readonly UV[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: UV, a: UV, b: UV) {
  const x = b[0] - a[0], y = b[1] - a[1];
  const t = clamp(((point[0] - a[0]) * x + (point[1] - a[1]) * y) / (x * x + y * y || 1));
  return Math.hypot(point[0] - a[0] - x * t, point[1] - a[1] - y * t);
}

function distanceToContour(point: UV, polygon: readonly UV[]) {
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i++) distance = Math.min(distance, distanceToSegment(point, polygon[i], polygon[(i + 1) % polygon.length]));
  return distance;
}

function cleanContour(contour: readonly UV[]): UV[] {
  const clean = contour.filter((point, i) => i === 0 || Math.hypot(point[0] - contour[i - 1][0], point[1] - contour[i - 1][1]) > 1e-8).map(point => [...point] as UV);
  if (Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < 1e-8) clean.pop();
  let area = 0;
  for (let i = 0; i < clean.length; i++) area += clean[i][0] * clean[(i + 1) % clean.length][1] - clean[(i + 1) % clean.length][0] * clean[i][1];
  if (area < 0) clean.reverse();
  return clean;
}

/** Ear clipping keeps the measured concave rims rather than replacing them with stars. */
function triangulate(contour: readonly UV[]): [number, number, number][] {
  const remaining = contour.map((_, i) => i);
  const triangles: [number, number, number][] = [];
  while (remaining.length > 3) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[(i + remaining.length - 1) % remaining.length], b = remaining[i], c = remaining[(i + 1) % remaining.length];
      if (orient(contour[a], contour[b], contour[c]) <= EPSILON) continue;
      if (remaining.some(vertex => vertex !== a && vertex !== b && vertex !== c && barycentric(contour[vertex], contour[a], contour[b], contour[c]))) continue;
      triangles.push([a, b, c]);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) {
      // A straight measured rim contributes no area; removing its middle point
      // is preferable to creating a zero-area face.
      const flat = remaining.findIndex((b, i) => Math.abs(orient(contour[remaining[(i + remaining.length - 1) % remaining.length]], contour[b], contour[remaining[(i + 1) % remaining.length]])) < 1e-9);
      if (flat < 0) throw new Error('A traced petal contour is not a simple polygon');
      remaining.splice(flat, 1);
    }
  }
  if (remaining.length === 3 && Math.abs(orient(contour[remaining[0]], contour[remaining[1]], contour[remaining[2]])) > EPSILON) triangles.push([remaining[0], remaining[1], remaining[2]]);
  return triangles;
}

function putInBins(bins: Map<string, Triangle[]>, triangle: Triangle, points: readonly UV[], spacing: number) {
  const a = points[triangle.a], b = points[triangle.b], c = points[triangle.c];
  const x0 = Math.floor(Math.min(a[0], b[0], c[0]) / spacing), x1 = Math.floor(Math.max(a[0], b[0], c[0]) / spacing);
  const y0 = Math.floor(Math.min(a[1], b[1], c[1]) / spacing), y1 = Math.floor(Math.max(a[1], b[1], c[1]) / spacing);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const key = `${x}:${y}`;
    let bucket = bins.get(key);
    if (!bucket) { bucket = []; bins.set(key, bucket); }
    bucket.push(triangle);
  }
}

function toggleEdges(mesh: Builder, triangle: Triangle) {
  for (const [a, b] of [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]]) {
    const key = edgeKey(a, b);
    if (mesh.boundary.has(key)) mesh.boundary.delete(key);
    else mesh.boundary.set(key, { a, b });
  }
}

function addTriangle(mesh: Builder, a: number, b: number, c: number) {
  if (orient(mesh.uv[a], mesh.uv[b], mesh.uv[c]) < 0) [b, c] = [c, b];
  if (Math.abs(orient(mesh.uv[a], mesh.uv[b], mesh.uv[c])) < EPSILON) return;
  const triangle = { a, b, c, active: true };
  mesh.triangles.push(triangle);
  toggleEdges(mesh, triangle);
  putInBins(mesh.uvBins, triangle, mesh.uv, UV_BIN);
  putInBins(mesh.rayBins, triangle, mesh.projected, RAY_BIN);
}

function removeTriangle(mesh: Builder, triangle: Triangle) {
  triangle.active = false;
  toggleEdges(mesh, triangle);
}

function addVertex(mesh: Builder, uv: UV, original: V3, camera: CameraFrame) {
  const index = mesh.uv.length, depth = mesh.depthAt(uv);
  const point = onRay(original, depth, camera);
  mesh.uv.push(uv);
  mesh.positions.push(point);
  mesh.depths.push(depth);
  mesh.projected.push(projectedRay(original, camera));
  return index;
}

function findRayHit(mesh: Builder, ray: UV): Hit | null {
  const bucket = mesh.rayBins.get(binKey(ray[0], ray[1], RAY_BIN));
  let hit: Hit | null = null;
  if (!bucket) return hit;
  for (const triangle of bucket) {
    if (!triangle.active) continue;
    const weights = barycentric(ray, mesh.projected[triangle.a], mesh.projected[triangle.b], mesh.projected[triangle.c]);
    if (!weights) continue;
    const depth = 1 / (weights[0] / mesh.depths[triangle.a] + weights[1] / mesh.depths[triangle.b] + weights[2] / mesh.depths[triangle.c]);
    if (!hit || depth < hit.depth) hit = { triangle, weights, depth };
  }
  return hit;
}

/** Only observed out-of-trace samples extend a local rim, never the entire image. */
function addObservedSupport(mesh: Builder, sourceIndex: number, uv: UV, original: V3, camera: CameraFrame) {
  const candidates = mesh.uvBins.get(binKey(uv[0], uv[1], UV_BIN)) || [];
  const containing = candidates.find(triangle => triangle.active && barycentric(uv, mesh.uv[triangle.a], mesh.uv[triangle.b], mesh.uv[triangle.c]));
  if (containing) {
    for (const vertex of [containing.a, containing.b, containing.c]) {
      if (Math.hypot(mesh.uv[vertex][0] - uv[0], mesh.uv[vertex][1] - uv[1]) > 1e-8) continue;
      mesh.positions[vertex] = onRay(original, mesh.depths[vertex], camera);
      mesh.projected[vertex] = projectedRay(original, camera);
      for (const adjacent of candidates) if (adjacent.active && [adjacent.a, adjacent.b, adjacent.c].includes(vertex)) putInBins(mesh.rayBins, adjacent, mesh.projected, RAY_BIN);
      mesh.supports.set(sourceIndex, vertex);
      return;
    }
    const vertex = addVertex(mesh, uv, original, camera);
    const weights = barycentric(uv, mesh.uv[containing.a], mesh.uv[containing.b], mesh.uv[containing.c])!;
    const edge = weights.findIndex(weight => Math.abs(weight) < 1e-8);
    if (edge >= 0) {
      const vertices = [containing.a, containing.b, containing.c];
      const a = vertices[(edge + 1) % 3], b = vertices[(edge + 2) % 3];
      const adjacent = candidates.filter(triangle => triangle.active && [triangle.a, triangle.b, triangle.c].includes(a) && [triangle.a, triangle.b, triangle.c].includes(b));
      for (const triangle of adjacent) {
        const c = [triangle.a, triangle.b, triangle.c].find(v => v !== a && v !== b)!;
        removeTriangle(mesh, triangle);
        addTriangle(mesh, a, vertex, c);
        addTriangle(mesh, vertex, b, c);
      }
    } else {
      removeTriangle(mesh, containing);
      addTriangle(mesh, containing.a, containing.b, vertex);
      addTriangle(mesh, containing.b, containing.c, vertex);
      addTriangle(mesh, containing.c, containing.a, vertex);
    }
    mesh.supports.set(sourceIndex, vertex);
    return;
  }
  let nearest: Edge | null = null, distance = Infinity;
  for (const edge of mesh.boundary.values()) {
    if (orient(mesh.uv[edge.a], mesh.uv[edge.b], uv) >= -EPSILON) continue;
    const candidate = distanceToSegment(uv, mesh.uv[edge.a], mesh.uv[edge.b]);
    if (candidate < distance) { nearest = edge; distance = candidate; }
  }
  if (!nearest) throw new Error('An observed reference sample cannot be attached to its fitted surface');
  const vertex = addVertex(mesh, uv, original, camera);
  addTriangle(mesh, nearest.b, nearest.a, vertex);
  mesh.supports.set(sourceIndex, vertex);
}

function originalRaySampler(source: ReferencePointSource) {
  const buckets = new Map<string, number[]>();
  const spacing = 1 / 128;
  for (let i = 0; i < source.seeds.length; i++) {
    const key = binKey(source.uv[i * 2], source.uv[i * 2 + 1], spacing);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i); else buckets.set(key, [i]);
  }
  return (uv: UV): V3 => {
    let nearest = -1, distance = Infinity;
    const bx = Math.floor(uv[0] / spacing), by = Math.floor(uv[1] / spacing);
    for (let radius = 0; radius < 12 && nearest < 0; radius++) {
      for (let y = by - radius; y <= by + radius; y++) for (let x = bx - radius; x <= bx + radius; x++) {
        if (radius > 0 && Math.abs(x - bx) !== radius && Math.abs(y - by) !== radius) continue;
        const bucket = buckets.get(`${x}:${y}`);
        if (!bucket) continue;
        for (const i of bucket) {
          const d = (source.uv[i * 2] - uv[0]) ** 2 + (source.uv[i * 2 + 1] - uv[1]) ** 2;
          if (d < distance) { distance = d; nearest = i; }
        }
      }
    }
    // Transfer the old cylinder's radial relief ONLY to reproduce its rays.
    // RGB is deliberately absent: repainting dots cannot change their anatomy.
    const relief = nearest < 0 ? .2 : Math.hypot(source.positions[nearest * 3], source.positions[nearest * 3 + 2] + Z_OFFSET) - RADIUS;
    const radius = RADIUS + relief;
    const theta = (uv[0] - .5) * ARC;
    return [Math.sin(theta) * radius, (.5 - uv[1]) * HEIGHT + .15, Math.cos(theta) * radius - Z_OFFSET];
  };
}

function petalDepth(petal: PetalReference, uv: UV, camera: CameraFrame) {
  const a = petal.attachment, tip = petal.tip;
  const dx = tip[0] - a[0], dy = tip[1] - a[1], length = Math.hypot(dx, dy) || .01;
  const t = clamp(((uv[0] - a[0]) * dx + (uv[1] - a[1]) * dy) / (length * length));
  let width = .005;
  for (const p of petal.contour) width = Math.max(width, Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / length);
  let ridgeDistance = Infinity;
  for (let i = 1; i < petal.ridge.length; i++) ridgeDistance = Math.min(ridgeDistance, distanceToSegment(uv, petal.ridge[i - 1], petal.ridge[i]));
  const across = clamp(ridgeDistance / width);
  const profile = petal.depthProfile;
  const lengthRise = Math.sin(t * Math.PI * .5);
  const ridge = mix(profile.attachment, profile.ridge, lengthRise);
  const cupping = (profile.ridge - profile.rim) * across * across * smooth(clamp(t * 4));
  const returnAtTip = petal.curl * smooth(clamp((t - .62) / .38));
  const signedAcross = ((uv[0] - a[0]) * dy - (uv[1] - a[1]) * dx) / length;
  const pose = Math.sin(petal.tilt) * signedAcross * .23 + Math.sin(petal.pose.pitchDegrees * Math.PI / 180) * length * (t - .5) * .14;
  const relief = ridge - cupping + returnAtTip + pose;
  const stemDepth = cameraDepth([0, (.5 - uv[1]) * HEIGHT + .15, 0], camera);
  return stemDepth - relief * WIDTH;
}

function stemCoordinates(uv: UV) {
  const stem = hyacinthReferenceStem;
  const centerline = stem.centerline;
  let index = 0;
  while (index < centerline.length - 2 && uv[1] > centerline[index + 1][1]) index++;
  const a = centerline[index], b = centerline[index + 1];
  const t = clamp((uv[1] - a[1]) / (b[1] - a[1] || 1));
  return { center: mix(a[0], b[0], t), radius: mix(stem.halfWidths[index], stem.halfWidths[index + 1], t) };
}

function makeBuilder(id: number, kind: Kind, contour: readonly UV[], depthAt: Builder['depthAt'], thicknessAt: Builder['thicknessAt'], sampleOriginal: (uv: UV) => V3, camera: CameraFrame): Builder {
  const clean = cleanContour(contour);
  const mesh: Builder = { id, kind, contour: clean, uv: [], positions: [], projected: [], depths: [], triangles: [], boundary: new Map(), uvBins: new Map(), rayBins: new Map(), depthAt, thicknessAt, supports: new Map(), sourceIndices: [] };
  for (const uv of clean) addVertex(mesh, uv, sampleOriginal(uv), camera);
  let faces = triangulate(clean);
  // Shared midpoint subdivision makes curved sheets without cracks. Anatomy
  // is re-evaluated at every midpoint, not linearly extruded from the outline.
  for (let level = 0; level < 3; level++) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = edgeKey(a, b), previous = midpoints.get(key);
      if (previous !== undefined) return previous;
      const uv: UV = [(mesh.uv[a][0] + mesh.uv[b][0]) / 2, (mesh.uv[a][1] + mesh.uv[b][1]) / 2];
      const index = addVertex(mesh, uv, sampleOriginal(uv), camera);
      midpoints.set(key, index);
      return index;
    };
    const subdivided: [number, number, number][] = [];
    for (const [a, b, c] of faces) {
      const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
      subdivided.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
    }
    faces = subdivided;
  }
  for (const [a, b, c] of faces) addTriangle(mesh, a, b, c);
  return mesh;
}

function closeShell(mesh: Builder, camera: CameraFrame): ReferenceSurface {
  const count = mesh.positions.length;
  const positions = new Float32Array(count * 6), uv = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    positions.set(mesh.positions[i], i * 3);
    positions.set(onRay(mesh.positions[i], mesh.depths[i] + mesh.thicknessAt(mesh.uv[i]), camera), (i + count) * 3);
    uv.set(mesh.uv[i], i * 2); uv.set(mesh.uv[i], (i + count) * 2);
  }
  const indices: number[] = [];
  for (const triangle of mesh.triangles) if (triangle.active) {
    const { a, b, c } = triangle;
    // Image UV has y down: reverse front winding so its outward normal faces
    // the reference camera. The paired underside has the opposite winding.
    indices.push(a, c, b, a + count, b + count, c + count);
  }
  for (const { a, b } of mesh.boundary.values()) indices.push(a, b, b + count, a, b + count, a + count);
  // Reference rays inherit the old curved camera projection, so a narrow
  // continued rim can reverse a shell's overall winding. Normalize the closed
  // volume before deriving outward normals or sampling its hidden material.
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const a: V3 = [positions[indices[i] * 3], positions[indices[i] * 3 + 1], positions[indices[i] * 3 + 2]];
    const b: V3 = [positions[indices[i + 1] * 3], positions[indices[i + 1] * 3 + 1], positions[indices[i + 1] * 3 + 2]];
    const c: V3 = [positions[indices[i + 2] * 3], positions[indices[i + 2] * 3 + 1], positions[indices[i + 2] * 3 + 2]];
    volume += dot(a, cross(b, c)) / 6;
  }
  if (volume < 0) for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const normals = vertexNormals(positions, indices);
  return { id: mesh.id, kind: mesh.kind, positions, indices: new Uint32Array(indices), referenceUV: uv, normals };
}

function vertexNormals(positions: Float32Array, indices: readonly number[] | Uint32Array) {
  const normals = new Float32Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const normal = cross(minus(positions.subarray(b * 3, b * 3 + 3), positions.subarray(a * 3, a * 3 + 3)), minus(positions.subarray(c * 3, c * 3 + 3), positions.subarray(a * 3, a * 3 + 3)));
    for (const vertex of [a, b, c]) for (let axis = 0; axis < 3; axis++) normals[vertex * 3 + axis] += normal[axis];
  }
  for (let i = 0; i < positions.length; i += 3) normals.set(normalized([normals[i], normals[i + 1], normals[i + 2]]), i);
  return normals;
}

function throatSurface(id: number, start: V3, end: V3, reference: UV, camera: CameraFrame): ReferenceSurface {
  const rings = 9, sides = 12;
  const tangent = normalized(minus(end, start));
  const axis = normalized(cross(tangent, Math.abs(tangent[1]) > .9 ? camera.right : [0, 1, 0]));
  const other = normalized(cross(tangent, axis));
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1), radius = mix(.085, .18, smooth(t));
    const center = [mix(start[0], end[0], t), mix(start[1], end[1], t) + Math.sin(t * Math.PI) * .08, mix(start[2], end[2], t)];
    for (let side = 0; side < sides; side++) {
      const angle = side / sides * Math.PI * 2;
      for (let k = 0; k < 3; k++) positions.push(center[k] + radius * (axis[k] * Math.cos(angle) + other[k] * Math.sin(angle)));
      uv.push(reference[0], reference[1]);
      if (ring > 0) {
        const a = (ring - 1) * sides + side, b = (ring - 1) * sides + (side + 1) % sides, c = ring * sides + side, d = ring * sides + (side + 1) % sides;
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  const first = positions.length / 3;
  positions.push(...start); uv.push(...reference);
  const last = positions.length / 3;
  positions.push(...end); uv.push(...reference);
  for (let side = 0; side < sides; side++) {
    indices.push(first, (side + 1) % sides, side);
    indices.push(last, (rings - 1) * sides + side, (rings - 1) * sides + (side + 1) % sides);
  }
  const typedPositions = new Float32Array(positions);
  return { id, kind: 'throat', positions: typedPositions, indices: new Uint32Array(indices), referenceUV: new Float32Array(uv), normals: vertexNormals(typedPositions, indices) };
}

/**
 * A reference-constrained reconstruction, not recovery of unseen anatomy.
 * Visible particles retain the original world point's camera ray and RGB.
 * Independently traced petals supply the fitted folds, cups, and closed backs.
 */
export function reconstructReferencePoints(source: ReferencePointSource, options: ReferenceReconstructionOptions): ReferenceReconstruction {
  const count = source.seeds.length;
  if (source.positions.length !== count * 3 || source.colors.length !== count * 3 || source.uv.length !== count * 2 || (source.pointScale && source.pointScale.length !== count)) throw new Error('Reference point attributes have inconsistent lengths');
  const camera = cameraFrame(options), sampleOriginal = originalRaySampler(source);
  const meshes = hyacinthReferenceSurfaces.map(petal => makeBuilder(petal.id, 'petal', petal.contour, uv => petalDepth(petal, uv, camera), uv => {
    const distance = distanceToContour(uv, petal.contour);
    return clamp(petal.depthProfile.thickness * WIDTH + .045 + Math.min(distance * WIDTH, .04), .04, .12);
  }, sampleOriginal, camera));
  const stemContour: UV[] = [
    ...hyacinthReferenceStem.centerline.map((point, i): UV => [point[0] - hyacinthReferenceStem.halfWidths[i], point[1]]),
    ...hyacinthReferenceStem.centerline.map((point, i): UV => [point[0] + hyacinthReferenceStem.halfWidths[i], point[1]]).reverse(),
  ];
  const stem = makeBuilder(STEM_ID, 'stem', stemContour, uv => {
    const { center, radius } = stemCoordinates(uv), across = clamp(Math.abs(uv[0] - center) / radius);
    return cameraDepth([0, (.5 - uv[1]) * HEIGHT + .15, 0], camera) - Math.sqrt(1 - across * across) * radius * WIDTH;
  }, uv => {
    const { center, radius } = stemCoordinates(uv), across = clamp(Math.abs(uv[0] - center) / radius);
    return .025 + 2 * Math.sqrt(1 - across * across) * radius * WIDTH;
  }, sampleOriginal, camera);
  meshes.push(stem);
  const assigned: Builder[] = [], original: V3[] = [], rays: UV[] = [];
  let tracedCount = 0;
  const assignmentBins = new Map<string, number[]>();
  for (let p = 0; p < meshes.length; p++) {
    const contour = meshes[p].contour;
    const minU = Math.min(...contour.map(v => v[0])) - .018, maxU = Math.max(...contour.map(v => v[0])) + .018;
    const minV = Math.min(...contour.map(v => v[1])) - .018, maxV = Math.max(...contour.map(v => v[1])) + .018;
    for (let y = Math.floor(minV * 96); y <= Math.floor(maxV * 96); y++) for (let x = Math.floor(minU * 96); x <= Math.floor(maxU * 96); x++) {
      const key = `${x}:${y}`, bucket = assignmentBins.get(key);
      if (bucket) bucket.push(p); else assignmentBins.set(key, [p]);
    }
  }
  for (let i = 0; i < count; i++) {
    const uv: UV = [source.uv[i * 2], source.uv[i * 2 + 1]];
    const candidates = assignmentBins.get(binKey(uv[0], uv[1], 1 / 96)) || meshes.map((_, index) => index);
    let selected = -1, layer = -Infinity, distance = Infinity;
    for (const p of candidates) {
      if (contains(uv, meshes[p].contour)) {
        const candidateLayer = p < hyacinthReferenceSurfaces.length ? hyacinthReferenceSurfaces[p].visibility.layer : -100;
        if (candidateLayer > layer) { selected = p; layer = candidateLayer; }
      }
    }
    if (selected >= 0) tracedCount++;
    else for (const p of candidates) {
      const candidateDistance = distanceToContour(uv, meshes[p].contour);
      if (candidateDistance < distance) { selected = p; distance = candidateDistance; }
    }
    const mesh = meshes[selected];
    assigned.push(mesh); mesh.sourceIndices.push(i);
    const point: V3 = [source.positions[i * 3], source.positions[i * 3 + 1], source.positions[i * 3 + 2]];
    original.push(point); rays.push(projectedRay(point, camera));
  }
  // First cover every observed ray; additions are local and remain part of a
  // closed petal or stem. Recheck after the inserts before freezing the shell.
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < count; i++) {
    const mesh = assigned[i];
    if (mesh.supports.has(i) || findRayHit(mesh, rays[i])) continue;
    addObservedSupport(mesh, i, [source.uv[i * 2], source.uv[i * 2 + 1]], original[i], camera);
  }
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), pointScale = new Float32Array(count), surfaceIds = new Uint32Array(count);
  for (let pass = 0; ; pass++) {
    let added = 0;
    for (let i = 0; i < count; i++) {
      const mesh = assigned[i];
      if (!mesh.supports.has(i) && !findRayHit(mesh, rays[i])) {
        addObservedSupport(mesh, i, [source.uv[i * 2], source.uv[i * 2 + 1]], original[i], camera);
        added++;
      }
    }
    if (!added) break;
    if (pass > 8) throw new Error('The reference shell fit did not converge');
  }
  const surfaces = meshes.map(mesh => closeShell(mesh, camera));
  const surfaceById = new Map(surfaces.map(surface => [surface.id, surface]));
  let maxProjectionDriftPx = 0;
  const pixelFactor = options.height * .5 / Math.tan((options.fov || 42) * Math.PI / 360);
  for (let i = 0; i < count; i++) {
    const mesh = assigned[i], surface = surfaceById.get(mesh.id)!;
    const vertex = mesh.supports.get(i), hit = findRayHit(mesh, rays[i]);
    const depth = vertex !== undefined ? mesh.depths[vertex] : hit!.depth;
    const point = onRay(original[i], depth, camera);
    positions.set(point, i * 3);
    pointScale[i] = (source.pointScale?.[i] ?? 1) * depth / cameraDepth(original[i], camera);
    surfaceIds[i] = mesh.id;
    let normal: V3;
    if (vertex !== undefined) normal = [surface.normals[vertex * 3], surface.normals[vertex * 3 + 1], surface.normals[vertex * 3 + 2]];
    else {
      const triangle = hit!.triangle;
      const vertices = [triangle.a, triangle.b, triangle.c];
      const weights = hit!.weights.map((weight, index) => weight / mesh.depths[vertices[index]]);
      const total = weights.reduce((sum, weight) => sum + weight, 0);
      normal = [0, 0, 0];
      for (let vertexIndex = 0; vertexIndex < 3; vertexIndex++) {
        for (let axis = 0; axis < 3; axis++) normal[axis] += surface.normals[vertices[vertexIndex] * 3 + axis] * weights[vertexIndex] / total;
      }
    }
    if (dot(normal, minus(camera.eye, point)) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    normals.set(normalized(normal), i * 3);
    const after: V3 = [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
    const ray = projectedRay(after, camera);
    maxProjectionDriftPx = Math.max(maxProjectionDriftPx, Math.hypot(ray[0] - rays[i][0], ray[1] - rays[i][1]) * pixelFactor);
  }
  // The necks connect the observed attachment groups to a central rachis.
  // They are individually curved tubes, not a head-sized backing surface.
  for (let c = 0; c < hyacinthReferenceClusters.length; c++) {
    const cluster = hyacinthReferenceClusters[c];
    const petals = hyacinthReferenceSurfaces.filter(petal => petal.cluster === cluster.id);
    if (!petals.length) continue;
    const attachment: UV = [petals.reduce((sum, p) => sum + p.attachment[0], 0) / petals.length, petals.reduce((sum, p) => sum + p.attachment[1], 0) / petals.length];
    const depth = petals.reduce((sum, p) => sum + petalDepth(p, attachment, camera), 0) / petals.length;
    const start: V3 = [0, (.5 - attachment[1]) * HEIGHT + .15, 0];
    const end = onRay(sampleOriginal(attachment), depth + .06, camera);
    if (Math.hypot(...minus(start, end)) > .05) surfaces.push(throatSurface(STEM_ID + 1 + c, start, end, attachment, camera));
  }
  const means = new Map<number, V3>();
  const pigmentBins = new Map<number, Map<string, number[]>>();
  const pigmentSpacing = 1 / 128;
  for (const mesh of meshes) {
    const mean: V3 = [0, 0, 0];
    const bins = new Map<string, number[]>();
    for (const i of mesh.sourceIndices) {
      for (let axis = 0; axis < 3; axis++) mean[axis] += source.colors[i * 3 + axis];
      const key = binKey(source.uv[i * 2], source.uv[i * 2 + 1], pigmentSpacing);
      const bucket = bins.get(key);
      if (bucket) bucket.push(i); else bins.set(key, [i]);
    }
    for (let axis = 0; axis < 3; axis++) mean[axis] = mesh.sourceIndices.length ? mean[axis] / mesh.sourceIndices.length : [ .17, .12, .49 ][axis];
    means.set(mesh.id, mean);
    pigmentBins.set(mesh.id, bins);
  }
  const pigmentAt = (surfaceId: number, uv: UV): V3 => {
    const mean = means.get(surfaceId) || [.08, .12, .3];
    const bins = pigmentBins.get(surfaceId);
    if (!bins || !bins.size) return [...mean] as V3;
    const nearest: { index: number; distance: number }[] = [];
    const bx = Math.floor(uv[0] / pigmentSpacing), by = Math.floor(uv[1] / pigmentSpacing);
    for (let radius = 0; radius < 8 && nearest.length < 4; radius++) {
      for (let y = by - radius; y <= by + radius; y++) for (let x = bx - radius; x <= bx + radius; x++) {
        if (radius > 0 && Math.abs(x - bx) !== radius && Math.abs(y - by) !== radius) continue;
        const bucket = bins.get(`${x}:${y}`);
        if (!bucket) continue;
        for (const index of bucket) {
          const distance = (source.uv[index * 2] - uv[0]) ** 2 + (source.uv[index * 2 + 1] - uv[1]) ** 2;
          if (nearest.length === 4 && distance >= nearest[3].distance) continue;
          nearest.push({ index, distance });
          nearest.sort((a, b) => a.distance - b.distance);
          if (nearest.length > 4) nearest.pop();
        }
      }
    }
    if (!nearest.length) return [...mean] as V3;
    const pigment: V3 = [0, 0, 0];
    let totalWeight = 0;
    for (const sample of nearest) {
      const weight = 1 / (sample.distance + 1e-7);
      totalWeight += weight;
      for (let axis = 0; axis < 3; axis++) pigment[axis] += source.colors[sample.index * 3 + axis] * weight;
    }
    // Thin petal undersides retain their own local pigment and veins. The
    // material lookup is restricted to that part's observed samples; no image
    // plane or whole-reference duplicate is introduced behind the blossom.
    for (let axis = 0; axis < 3; axis++) pigment[axis] = mix(pigment[axis] / totalWeight, mean[axis], .08);
    return pigment;
  };
  const uvSteps: number[] = [];
  for (let i = 1; i < Math.min(count, 4096); i++) {
    const du = source.uv[i * 2] - source.uv[(i - 1) * 2];
    if (Math.abs(source.uv[i * 2 + 1] - source.uv[(i - 1) * 2 + 1]) < 1e-7 && du > 0 && du < .02) uvSteps.push(du);
  }
  uvSteps.sort((a, b) => a - b);
  const referenceUVSpacing = uvSteps.length ? uvSteps[uvSteps.length >>> 1] : 1 / 467;
  const originalSpacing = WIDTH * referenceUVSpacing;
  const coverageRadius = referenceUVSpacing * 2.2;
  const hasObservedPigment = (surfaceId: number, uv: UV) => {
    const bins = pigmentBins.get(surfaceId);
    if (!bins) return false;
    const x0 = Math.floor((uv[0] - coverageRadius) / pigmentSpacing), x1 = Math.floor((uv[0] + coverageRadius) / pigmentSpacing);
    const y0 = Math.floor((uv[1] - coverageRadius) / pigmentSpacing), y1 = Math.floor((uv[1] + coverageRadius) / pigmentSpacing);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const bucket = bins.get(`${x}:${y}`);
      if (!bucket) continue;
      for (const index of bucket) if ((source.uv[index * 2] - uv[0]) ** 2 + (source.uv[index * 2 + 1] - uv[1]) ** 2 <= coverageRadius * coverageRadius) return true;
    }
    return false;
  };
  interface SampleFace { surface: ReferenceSurface; a: number; b: number; c: number; area: number; cumulative: number; normal: V3; observed: boolean }
  const sampleFaces: SampleFace[] = [];
  let totalArea = 0;
  for (const surface of surfaces) {
    const mesh = meshes.find(item => item.id === surface.id);
    const frontCount = mesh?.positions.length ?? 0;
    for (let i = 0; i < surface.indices.length; i += 3) {
      const a = surface.indices[i], b = surface.indices[i + 1], c = surface.indices[i + 2];
      let observed = false;
      if (mesh && a < frontCount && b < frontCount && c < frontCount) {
        const midpoint: UV = [(mesh.uv[a][0] + mesh.uv[b][0] + mesh.uv[c][0]) / 3, (mesh.uv[a][1] + mesh.uv[b][1] + mesh.uv[c][1]) / 3];
        // Additional fine samples become visible during the macro passage.
        // Keep the original samples untouched and suppress this set at entry.
        observed = hasObservedPigment(surface.id, midpoint);
      }
      const pa: V3 = [surface.positions[a * 3], surface.positions[a * 3 + 1], surface.positions[a * 3 + 2]], pb: V3 = [surface.positions[b * 3], surface.positions[b * 3 + 1], surface.positions[b * 3 + 2]], pc: V3 = [surface.positions[c * 3], surface.positions[c * 3 + 1], surface.positions[c * 3 + 2]];
      const crossProduct = cross(minus(pb, pa), minus(pc, pa)), area = Math.hypot(...crossProduct) * .5;
      if (area < 1e-12) continue;
      totalArea += area;
      sampleFaces.push({ surface, a, b, c, area, cumulative: totalArea, normal: normalized(crossProduct), observed });
    }
  }
  // Reference-facing neck walls also become visible from later camera poses.
  // The renderer suppresses this completion set at the exact reference pose;
  // sampling cannot discard a wall merely because it faces that initial eye.
  const mobile = options.width <= 768;
  const hiddenCount = count ? Math.min(mobile ? 80_000 : 280_000, Math.max(600, Math.round(count * (mobile ? 1.8 : 2.1)))) : 0;
  // Area weighting gives hidden samples a common physical spacing. Their dot
  // diameter follows that spacing while remaining within the original style.
  const hiddenSize = clamp(Math.sqrt(totalArea / (hiddenCount || 1)) * .68 / originalSpacing, .85, 1.35);
  const hiddenPositions = new Float32Array(hiddenCount * 3), hiddenColors = new Float32Array(hiddenCount * 3), hiddenNormals = new Float32Array(hiddenCount * 3), hiddenSeeds = new Float32Array(hiddenCount), hiddenPointScale = new Float32Array(hiddenCount), hiddenSurfaceIds = new Uint32Array(hiddenCount), hiddenUV = new Float32Array(hiddenCount * 2);
  let randomState = 0x7f4a7c15;
  const random = () => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) / 4294967296; };
  for (let i = 0; i < hiddenCount; i++) {
    const areaTarget = (i + random()) / hiddenCount * totalArea;
    let low = 0, high = sampleFaces.length - 1;
    while (low < high) { const middle = (low + high) >>> 1; if (sampleFaces[middle].cumulative < areaTarget) low = middle + 1; else high = middle; }
    const face = sampleFaces[low], root = Math.sqrt(random()), weights = [1 - root, root * (1 - random()), 0];
    weights[2] = 1 - weights[0] - weights[1];
    const point: V3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) point[k] = weights[0] * face.surface.positions[face.a * 3 + k] + weights[1] * face.surface.positions[face.b * 3 + k] + weights[2] * face.surface.positions[face.c * 3 + k];
    hiddenPositions.set(point, i * 3);
    const interpolated: V3 = [0, 0, 0];
    for (let k = 0; k < 3; k++) interpolated[k] = weights[0] * face.surface.normals[face.a * 3 + k]
      + weights[1] * face.surface.normals[face.b * 3 + k] + weights[2] * face.surface.normals[face.c * 3 + k];
    hiddenNormals.set(normalized(interpolated), i * 3);
    for (let k = 0; k < 2; k++) hiddenUV[i * 2 + k] = weights[0] * face.surface.referenceUV[face.a * 2 + k] + weights[1] * face.surface.referenceUV[face.b * 2 + k] + weights[2] * face.surface.referenceUV[face.c * 2 + k];
    const pigment = pigmentAt(face.surface.id, [hiddenUV[i * 2], hiddenUV[i * 2 + 1]]);
    const shade = .84 + random() * .16;
    hiddenColors.set(face.observed ? pigment.map(channel => channel * shade)
      : [pigment[0] * .68 * shade, pigment[1] * .78 * shade, pigment[2] * .90 * shade], i * 3);
    hiddenSeeds[i] = random(); hiddenPointScale[i] = hiddenSize; hiddenSurfaceIds[i] = face.surface.id;
  }
  return {
    positions, colors: source.colors.slice(), seeds: source.seeds.slice(), normals, pointScale, surfaceIds,
    hiddenPositions, hiddenColors, hiddenNormals, hiddenSeeds, hiddenPointScale, hiddenSurfaceIds, hiddenUV, surfaces,
    diagnostics: { sourceCount: count, tracedCount, supportVertexCount: meshes.reduce((sum, mesh) => sum + mesh.supports.size, 0), surfaceHitCount: count, maxProjectionDriftPx },
  };
}
