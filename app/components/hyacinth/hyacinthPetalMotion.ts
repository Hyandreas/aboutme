import { hyacinthReferenceSurfaces, type UV } from './hyacinthReferencePetals';
import type { ReferenceSurface } from './hyacinthReconstruction';

export type PetalVector = [number, number, number];
export type PetalBlooms = [number, number, number, number];

export interface PetalMotionRig {
  id: number;
  root: PetalVector;
  tip: PetalVector;
  direction: PetalVector;
  axis: PetalVector;
  inverseLength: number;
  opening: number;
  curl: number;
  slot: number;
  delay: number;
}

export const HYACINTH_PETAL_FOCUS_IDS = [14, 38, 47, 42] as const;
export const HYACINTH_PETAL_REFERENCE_EYE: PetalVector = [-4.381869892, 2.60337031, 9.841986264];
const RADIANS = Math.PI / 180;
const LIP_START = .58;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: ArrayLike<number>, b: ArrayLike<number>): PetalVector => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): PetalVector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v: PetalVector): PetalVector => {
  const length = Math.hypot(...v);
  return length > 1e-10 ? [v[0] / length, v[1] / length, v[2] / length] : [0, 0, 1];
};
const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const derivative = (t: number) => t > 0 && t < 1 ? 30 * t * t * (1 - t) * (1 - t) : 0;

export function sanitizePetalBlooms(blooms: readonly number[], reducedMotion = false): PetalBlooms {
  return [0, 1, 2, 3].map(index => reducedMotion || !Number.isFinite(blooms[index]) ? 0 : clamp(blooms[index], -.12, 1)) as PetalBlooms;
}

function response(control: number, delay: number) {
  return control <= 0 ? control : smoother(clamp((control - delay) / (1 - delay)));
}

function amplitude(rig: PetalMotionRig, blooms: PetalBlooms) {
  const local = rig.slot < 0 ? 0 : response(blooms[rig.slot], rig.delay) * (1 - rig.delay * 1.65);
  return clamp(local + response(blooms[3], rig.delay * .5), -.12, 1);
}

function angleAt(rig: PetalMotionRig, t: number, amount: number, time: number) {
  const lip = clamp((t - LIP_START) / (1 - LIP_START));
  const breath = Math.max(0, amount) * Math.sin(time * .72 + rig.delay * 23) * .0075;
  return {
    angle: amount * (rig.opening * smoother(t) + rig.curl * smoother(lip)) + breath * smoother(t),
    gradient: amount * (rig.opening * derivative(t) + rig.curl * derivative(lip) / (1 - LIP_START)) + breath * derivative(t),
  };
}

function rotate(v: PetalVector, axis: PetalVector, angle: number): PetalVector {
  const cosine = Math.cos(angle), sine = Math.sin(angle), perpendicular = cross(axis, v), along = dot(axis, v) * (1 - cosine);
  return [v[0] * cosine + perpendicular[0] * sine + axis[0] * along,
    v[1] * cosine + perpendicular[1] * sine + axis[1] * along,
    v[2] * cosine + perpendicular[2] * sine + axis[2] * along];
}

/** CPU counterpart of the GPU bend, also used for camera focal anchors. */
export function deformPetalPoint(rig: PetalMotionRig, point: readonly number[], normal: readonly number[],
  blooms: readonly number[], time = 0, reducedMotion = false) {
  const amount = amplitude(rig, sanitizePetalBlooms(blooms, reducedMotion));
  const relative = sub(point, rig.root), rawT = dot(relative, rig.direction) * rig.inverseLength, t = clamp(rawT);
  if (amount === 0) return { position: [...point] as PetalVector, normal: [...normal] as PetalVector, determinant: 1, longitudinal: t, energy: 0 };
  const { angle, gradient } = angleAt(rig, t, amount, Number.isFinite(time) ? time : 0);
  const thetaGradient = rawT > 0 && rawT < 1 ? gradient * rig.inverseLength : 0;
  const grad: PetalVector = rig.direction.map(value => value * thetaGradient) as PetalVector;
  const across = cross(rig.axis, relative), determinant = 1 + dot(grad, across);
  const correction = dot(across, normal);
  const corrected: PetalVector = [normal[0] * determinant - grad[0] * correction,
    normal[1] * determinant - grad[1] * correction, normal[2] * determinant - grad[2] * correction];
  const turned = rotate(relative, rig.axis, angle);
  return {
    position: [rig.root[0] + turned[0], rig.root[1] + turned[1], rig.root[2] + turned[2]] as PetalVector,
    normal: unit(rotate(corrected, rig.axis, angle)), determinant, longitudinal: t,
    energy: Math.max(0, amount) * (.25 + .75 * smoother(clamp((t - .28) / .72))),
  };
}

/** Sample a measured landmark on its front sheet, without inventing a new petal. */
function surfaceLandmark(surface: ReferenceSurface, landmark: UV): PetalVector {
  const frontCount = surface.positions.length / 6;
  const p = surface.positions, uv = surface.referenceUV;
  for (let face = 0; face < surface.indices.length; face += 3) {
    const a = surface.indices[face], b = surface.indices[face + 1], c = surface.indices[face + 2];
    if (a >= frontCount || b >= frontCount || c >= frontCount) continue;
    const ax = uv[a * 2], ay = uv[a * 2 + 1], bx = uv[b * 2], by = uv[b * 2 + 1], cx = uv[c * 2], cy = uv[c * 2 + 1];
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 1e-12) continue;
    const wa = ((by - cy) * (landmark[0] - cx) + (cx - bx) * (landmark[1] - cy)) / denominator;
    const wb = ((cy - ay) * (landmark[0] - cx) + (ax - cx) * (landmark[1] - cy)) / denominator, wc = 1 - wa - wb;
    if (wa < -1e-6 || wb < -1e-6 || wc < -1e-6) continue;
    return [p[a * 3] * wa + p[b * 3] * wb + p[c * 3] * wc,
      p[a * 3 + 1] * wa + p[b * 3 + 1] * wb + p[c * 3 + 1] * wc,
      p[a * 3 + 2] * wa + p[b * 3 + 2] * wb + p[c * 3 + 2] * wc];
  }
  // Inferred attachments can sit just beyond an observed contour. Keep their
  // pivot on that shell's closest measured rim instead of moving its neck.
  let nearest = 0, distance = Infinity;
  for (let i = 0; i < frontCount; i++) {
    const candidate = (uv[i * 2] - landmark[0]) ** 2 + (uv[i * 2 + 1] - landmark[1]) ** 2;
    if (candidate < distance) { nearest = i; distance = candidate; }
  }
  return [p[nearest * 3], p[nearest * 3 + 1], p[nearest * 3 + 2]];
}

/** Bake a small attachment frame once from the existing shell and tracing. */
export function createPetalMotionRigs(surfaces: readonly ReferenceSurface[]) {
  const references = new Map(hyacinthReferenceSurfaces.map(petal => [petal.id, petal]));
  const result = new Map<number, PetalMotionRig>();
  for (const surface of surfaces) {
    const petal = references.get(surface.id);
    if (!petal || surface.kind !== 'petal') continue;
    const root = surfaceLandmark(surface, petal.attachment), tip = surfaceLandmark(surface, petal.tip);
    const longitudinal = sub(tip, root), length = Math.hypot(...longitudinal);
    if (length < .08) continue;
    const direction = unit(longitudinal), view = unit(sub(HYACINTH_PETAL_REFERENCE_EYE, root));
    let axis = cross(direction, view);
    if (Math.hypot(...axis) < 1e-5) axis = cross(direction, Math.abs(direction[1]) > .95 ? [1, 0, 0] : [0, 1, 0]);
    const slot = petal.cluster === 'upper-right-bell' ? 0 : petal.cluster === 'middle-right-front' ? 1
      : petal.cluster === 'lower-centre-front' || petal.cluster === 'lower-left-flank' ? 2 : -1;
    const leading = HYACINTH_PETAL_FOCUS_IDS.slice(0, 3).includes(petal.id as 14 | 38 | 47);
    const delay = leading ? 0 : (petal.id >= 100 ? .19 : .065) + (petal.id % 5) * .019;
    const ridgeNearTip = surfaceLandmark(surface, petal.ridge[Math.max(0, petal.ridge.length - 2)]);
    const lipLength = Math.max(length * .3, Math.hypot(...sub(tip, ridgeNearTip)));
    const rig: PetalMotionRig = {
      id: petal.id, root, tip, direction, axis: unit(axis), inverseLength: 1 / length,
      opening: 24 * RADIANS,
      curl: clamp(-Math.atan2(petal.curl * (7 * 2 / 3), lipLength) * .32, -4 * RADIANS, 10 * RADIANS),
      slot, delay,
    };
    // Protect the original highly folded panels from local inversion. This is
    // a one-time bound on the actual shell; no vertices are rebuilt per frame.
    let minimum = 1, maximum = 1;
    for (let i = 0; i < surface.positions.length; i += 3) {
      const relative = sub(surface.positions.subarray(i, i + 3), root);
      const t = clamp(dot(relative, direction) / length);
      const gradient = angleAt(rig, t, 1, 0).gradient / length;
      const determinant = 1 + gradient * dot(direction, cross(rig.axis, relative));
      minimum = Math.min(minimum, determinant); maximum = Math.max(maximum, determinant);
    }
    const safeScale = Math.min(1, minimum < .35 ? .65 / (1 - minimum) : 1, maximum > 6 ? 5 / (maximum - 1) : 1);
    rig.opening *= safeScale; rig.curl *= safeScale;
    result.set(surface.id, rig);
  }
  return result;
}

/** Identical position and Jacobian-normal deformation for dot and depth passes. */
export const HYACINTH_PETAL_DEFORMATION_GLSL = `
attribute vec3 aPetalRoot;
attribute vec4 aPetalFrame, aPetalShape;
uniform vec4 uPetalBloom;
uniform vec3 uPetalEye;
uniform float uPetalTime;
float petalSmooth(float t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float petalDerivative(float t){return t>0.0&&t<1.0?30.0*t*t*(1.0-t)*(1.0-t):0.0;}
float petalResponse(float control,float delay){return control<=0.0?control:petalSmooth(clamp((control-delay)/(1.0-delay),0.0,1.0));}
vec3 petalRotate(vec3 v,vec3 axis,float angle){float c=cos(angle),s=sin(angle);return v*c+cross(axis,v)*s+axis*dot(axis,v)*(1.0-c);}
void deformHyacinthPetal(inout vec3 p,inout vec3 normal,out float energy){
  energy=0.0;
  if(aPetalShape.x==0.0)return;
  float slot=aPetalShape.z,delay=aPetalShape.w;
  float local=slot<-.5?0.0:(slot<.5?uPetalBloom.x:(slot<1.5?uPetalBloom.y:uPetalBloom.z));
  float amount=clamp(petalResponse(local,delay)*(1.0-delay*1.65)+petalResponse(uPetalBloom.w,delay*.5),-.12,1.0);
  if(amount==0.0)return;
  vec3 direction=aPetalFrame.xyz,relative=p-aPetalRoot;
  vec3 axis=cross(direction,normalize(uPetalEye-aPetalRoot));
  if(length(axis)<.00001)axis=cross(direction,abs(direction.y)>.95?vec3(1.0,0.0,0.0):vec3(0.0,1.0,0.0));
  axis=normalize(axis);
  float rawT=dot(relative,direction)*aPetalFrame.w,t=clamp(rawT,0.0,1.0);
  float lip=clamp((t-.58)/.42,0.0,1.0);
  float breath=max(0.0,amount)*sin(uPetalTime*.72+delay*23.0)*.0075;
  float angle=amount*(aPetalShape.x*petalSmooth(t)+aPetalShape.y*petalSmooth(lip))+breath*petalSmooth(t);
  float gradient=amount*(aPetalShape.x*petalDerivative(t)+aPetalShape.y*petalDerivative(lip)/.42)+breath*petalDerivative(t);
  vec3 grad=rawT>0.0&&rawT<1.0?direction*gradient*aPetalFrame.w:vec3(0.0);
  vec3 across=cross(axis,relative);
  float determinant=1.0+dot(grad,across);
  normal=normalize(petalRotate(normal*determinant-grad*dot(across,normal),axis,angle));
  p=aPetalRoot+petalRotate(relative,axis,angle);
  energy=max(0.0,amount)*(.25+.75*petalSmooth(clamp((t-.28)/.72,0.0,1.0)));
}
`;
