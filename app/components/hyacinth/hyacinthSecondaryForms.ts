import * as THREE from 'three';
import { sampleHyacinthSecondaries } from './hyacinthSecondaryChoreography';

export interface PetalEmissionFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  releasePosition: THREE.Vector3;
  releaseTangent: THREE.Vector3;
  releaseNormal: THREE.Vector3;
}

export function createSecondaryUniforms() {
  const vectors = () => Array.from({ length: 4 }, () => new THREE.Vector3());
  return {
    uFields: { value: new THREE.Vector3() }, uGrowth: { value: new THREE.Vector4() },
    uUnfold: { value: new THREE.Vector4() }, uRelease: { value: new THREE.Vector4() },
    uLife: { value: new THREE.Vector4() }, uWave: { value: new THREE.Vector4() },
    uSignal: { value: new THREE.Vector4() }, uMotes: { value: 0 }, uAnchorsReady: { value: 0 },
    uSource: { value: vectors() }, uTangent: { value: vectors() }, uNormal: { value: vectors() },
    uReleasedSource: { value: vectors() }, uReleasedTangent: { value: vectors() }, uReleasedNormal: { value: vectors() },
  };
}

export function updateSecondaryUniforms(uniforms: ReturnType<typeof createSecondaryUniforms>, at: number,
  reducedMotion: boolean, frames?: readonly PetalEmissionFrame[]) {
  const state = sampleHyacinthSecondaries(at, reducedMotion);
  uniforms.uFields.value.fromArray(state.fields);
  for (const [key, values] of [
    ['uGrowth', state.growth], ['uUnfold', state.unfold], ['uRelease', state.release],
    ['uLife', state.life], ['uWave', state.wave], ['uSignal', state.signal],
  ] as const) uniforms[key].value.fromArray(values);
  uniforms.uMotes.value = state.motes;
  uniforms.uAnchorsReady.value = frames?.length === 4 ? 1 : 0;
  frames?.forEach((frame, i) => {
    if (i >= 4) return;
    uniforms.uSource.value[i].copy(frame.position);
    uniforms.uTangent.value[i].copy(frame.tangent);
    uniforms.uNormal.value[i].copy(frame.normal);
    uniforms.uReleasedSource.value[i].copy(frame.releasePosition);
    uniforms.uReleasedTangent.value[i].copy(frame.releaseTangent);
    uniforms.uReleasedNormal.value[i].copy(frame.releaseNormal);
  });
  return state;
}

export const SECONDARY_UNIFORMS_GLSL = /* glsl */ `
  uniform vec3 uFields;
  uniform vec4 uGrowth, uUnfold, uRelease, uLife, uWave, uSignal;
  uniform float uMotes, uAnchorsReady;
  uniform vec3 uSource[4], uTangent[4], uNormal[4];
  uniform vec3 uReleasedSource[4], uReleasedTangent[4], uReleasedNormal[4];
  float component(vec4 v, float slot) {
    if (slot < 0.5) return v.x;
    if (slot < 1.5) return v.y;
    if (slot < 2.5) return v.z;
    return v.w;
  }
`;

/** Same continuous spine for etched surfaces and dotted strands. Starts on anatomy. */
export const SECONDARY_CURVE_GLSL = SECONDARY_UNIFORMS_GLSL + /* glsl */ `
  vec3 emissionCurve(float slot, float t, float variant) {
    int i = int(slot + 0.1);
    float opened = component(uUnfold, slot);
    float released = component(uRelease, slot);
    vec3 origin = mix(uSource[i], uReleasedSource[i], released);
    vec3 tangent = normalize(mix(uTangent[i], uReleasedTangent[i], released) + vec3(0.00001));
    vec3 normal = normalize(mix(uNormal[i], uReleasedNormal[i], released) + vec3(0.00001));
    vec3 side = normalize(cross(tangent, normal) + vec3(0.00001));
    float angle = t * 6.2831853 * (0.92 + variant * 0.08);
    float radius = opened * (0.65 + variant * 0.24);
    float downward = step(1.5, slot) * (1.0 - step(2.5, slot));
    vec3 local = tangent * (t * (1.7 - opened * 1.4) + sin(angle) * radius + t * opened * 0.65)
      + side * (1.0 - cos(angle)) * radius * (0.70 + variant * 0.15)
      + normal * (sin(angle * 0.5) * radius * 0.90 + t * opened * 0.48);
    local += vec3(0.15, -downward * 1.3, 0.25) * opened * t;
    vec3 drift = vec3((slot < 1.5 ? -1.0 : 1.0) * (0.65 + variant * 0.6),
      -0.65 - slot * 0.22, -1.2 - variant * 0.45) * released;
    return origin + local + drift;
  }
  float strandVisibility(float slot, float t, float variant) {
    float grown = max(0.0, component(uGrowth, slot) - variant * 0.08);
    return (1.0 - smoothstep(max(0.0, grown - 0.07), grown + 0.01, t))
      * component(uLife, slot) * uAnchorsReady;
  }
`;
