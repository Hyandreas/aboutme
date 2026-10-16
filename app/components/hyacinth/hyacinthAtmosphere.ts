import * as THREE from 'three';
import { createSecondaryUniforms, updateSecondaryUniforms, SECONDARY_CURVE_GLSL, type PetalEmissionFrame } from './hyacinthSecondaryForms';

export interface AtmosphereState {
  at: number;
  energy: number;
  flow: number;
  ripple: number;
  quiet: number;
  focus: readonly [number, number, number];
  eye?: readonly [number, number, number];
  reducedMotion: boolean;
  emissionFrames?: readonly PetalEmissionFrame[];
}

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const peak = (at: number, center: number, width: number) => 1 - ease(Math.abs(at - center) / width);

// Every point has a persistent identity. No particles are spawned or integrated
// over time: the scroll coordinate reconstructs their complete authored pose.
function parameters(count: number, make: (index: number, random: () => number) => readonly number[]) {
  let seed = 0x51ac19e7;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const values = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) values.set(make(i, random), i * 4);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aParams', new THREE.BufferAttribute(values, 4));
  return geometry;
}

const vertexCommon = /* glsl */ `
  precision highp float;
  attribute vec4 aParams;
  uniform float uAt, uTime, uEnergy, uFlow, uRipple, uQuiet, uReveal, uReducedMotion, uPixelRatio;
  uniform vec3 uFocus, uEye;
  uniform vec4 uViewport, uEventPhase, uEventStrength;
  ${SECONDARY_CURVE_GLSL}
  varying vec3 vColor;
  varying float vOpacity;
  const float TAU = 6.28318530718;
  float smooth01(float t) { t = clamp(t, 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
  float selectEvent(vec4 values, float event) {
    if (event < 0.5) return values.x;
    if (event < 1.5) return values.y;
    if (event < 2.5) return values.z;
    return values.w;
  }
  vec3 spectrum(float phase) {
    vec3 color = mix(vec3(0.21, 0.12, 0.53), vec3(0.58, 0.40, 0.80), 0.5 + 0.5 * sin(phase));
    color = mix(color, vec3(0.09, 0.50, 0.55), smoothstep(0.3, 0.95, sin(phase + 1.3)) * 0.65);
    return mix(color, vec3(0.85, 0.42, 0.22), smoothstep(0.65, 0.98, sin(phase * 0.67 - 1.0)) * 0.70);
  }
  void emitPoint(vec3 p, float diameter, float cap, vec3 color, float opacity) {
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float depth = -mv.z;
    float nearFade = smoothstep(0.25, 0.80, depth);
    float farFade = 1.0 - smoothstep(22.0, 55.0, depth);
    vColor = color;
    vOpacity = opacity * uReveal * nearFade * farFade;
    gl_PointSize = clamp(diameter * uViewport.w * projectionMatrix[1][1] * 0.5 / max(depth, 0.25),
      1.2 * uPixelRatio, min(cap * uPixelRatio, 4.0));
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  uniform vec4 uViewport;
  uniform float uMaskStart, uMaskEnd;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vec2 delta = gl_PointCoord - 0.5;
    float radius = length(delta);
    if (radius > 0.47 || vOpacity < 0.001) discard;
    float screenX = (gl_FragCoord.x - uViewport.x) / max(uViewport.z, 1.0);
    float textClearance = 0.12 + 0.88 * smoothstep(uMaskStart, uMaskEnd, screenX);
    float core = 1.0 - smoothstep(0.22, 0.47, radius);
    float alpha = vOpacity * core * textClearance;
    if (alpha < 0.002) discard;
    // Straight RGB: Three's additive SRC_ALPHA/ONE blend applies alpha once.
    gl_FragColor = vec4(vColor, alpha);
  }
`;

const currentVertexShader = vertexCommon + /* glsl */ `
  void main() {
    float slot = mod(aParams.x, 4.0), variant = floor(aParams.x / 4.0);
    float t = aParams.y, seed = aParams.z;
    float opening = component(uUnfold, slot);
    vec3 p = emissionCurve(slot, t, variant);
    vec3 tangent = normalize(emissionCurve(slot, t + 0.002, variant) - p);
    vec3 across = normalize(cross(tangent, vec3(0.18, 1.0, 0.27)) + vec3(0.00001));
    float spread = (seed - 0.5) * (0.005 + opening * 0.16) * sin(t * 3.14159265);
    p += across * spread;
    float spine = pow(max(0.0, 1.0 - abs(seed - 0.5) * 2.0), 5.0);
    float travelingLight = pow(0.5 + 0.5 * sin(t * 17.0 - uAt * 1.4), 8.0);
    float ends = smoothstep(0.0, 0.012, t) * (1.0 - smoothstep(0.88, 1.0, t));
    float opacity = strandVisibility(slot, t, variant) * ends * (0.12 + spine * 0.65)
      * (0.50 + opening * 0.35 + travelingLight * 0.60) * (1.0 - uReducedMotion * 0.75);
    vec3 color = spectrum(slot * 1.8 + t * 2.1) * (1.2 + spine * 1.8 + travelingLight);
    emitPoint(p, aParams.w * (0.70 + opening * 0.35), 3.3, color, opacity);
  }
`;

const rippleVertexShader = vertexCommon + /* glsl */ `
  void main() {
    float event = aParams.x;
    int i = int(event + 0.1);
    float phase = component(uWave, event);
    float strength = component(uSignal, event);
    float band = aParams.z, seed = aParams.w;
    float angle = (aParams.y - 0.5) * (5.55 + band * 0.12) + event * 1.21;
    float radius = (0.03 + phase * 6.5) * (1.0 + band * 0.045);
    radius *= 1.0 + 0.13 * sin(angle * 2.0 + event) + 0.035 * sin(angle * (5.0 + event));
    vec3 normal = normalize(uReleasedNormal[i] + vec3(0.00001));
    vec3 tangent = normalize(uReleasedTangent[i] + vec3(0.00001));
    vec3 side = normalize(cross(tangent, normal) + vec3(0.00001));
    vec3 p = uReleasedSource[i] + tangent * cos(angle) * radius
      + side * sin(angle) * radius * 0.72
      + normal * (sin(angle * 1.7) * radius * 0.21 + phase * 0.85);
    float ends = smoothstep(0.0, 0.10, aParams.y) * (1.0 - smoothstep(0.85, 1.0, aParams.y));
    float core = pow(max(0.0, 1.0 - abs(seed - 0.5) * 2.0), 3.0);
    float broken = 0.20 + 0.80 * smoothstep(-0.35, 0.40, sin(angle * 3.0 + event * 2.0 + band * 0.3));
    float opacity = strength * ends * broken * (0.40 + core * 0.55)
      * (1.0 - uReducedMotion) * uAnchorsReady;
    vec3 color = spectrum(angle + event * 1.3 - band * 0.35) * (1.2 + core * 2.80);
    emitPoint(p, 0.016 + core * 0.014, 3.3, color, opacity);
  }
`;

const accentVertexShader = vertexCommon + /* glsl */ `
  void main() {
    float seed = aParams.z;
    float phase = fract(aParams.y + uAt * (0.019 + seed * 0.007));
    float flow = smoothstep(14.0, 17.0, uAt) * (1.0 - smoothstep(22.0, 24.0, uAt));
    float down = smoothstep(33.0, 35.0, uAt) * (1.0 - smoothstep(39.0, 41.0, uAt));
    // These are world-space motes in the route corridor, never a screen HUD.
    // Their different camera distance supplies foreground parallax.
    vec3 p = vec3(-7.0 + aParams.x * 15.0 + sin(phase * TAU + seed * 9.0) * 0.45,
      7.5 - phase * 22.0,
      -6.0 + seed * 9.0 + cos(phase * TAU) * 0.36);
    p.x += sin(uTime * 0.09 + seed * TAU) * 0.013;
    float ends = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.92, 1.0, phase));
    float opacity = ends * (0.32 + flow * 0.24 + down * 0.21 + uEnergy * 0.30)
      * (0.5 + 0.5 * (1.0 - uQuiet)) * (1.0 - uReducedMotion);
    opacity *= uMotes;
    emitPoint(p, aParams.w, 3.4, spectrum(seed * TAU + uAt * 0.05) * (1.8 + uEnergy * 1.20), opacity);
  }
`;

/** Persistent petal strands, emitted waves, and distant depth motes. */
export function createHyacinthAtmosphere(scene: THREE.Scene, mobile: boolean) {
  const group = new THREE.Group();
  group.name = 'hyacinth-living-atmosphere';
  group.visible = false;
  const viewport = new THREE.Vector4(0, 0, 1440, 900);
  const cssSize = new THREE.Vector2();
  const uniforms = {
    ...createSecondaryUniforms(),
    uAt: { value: 0 }, uTime: { value: 0 }, uEnergy: { value: 0 }, uFlow: { value: 0 },
    uRipple: { value: 0 }, uQuiet: { value: 0 }, uReveal: { value: 0 }, uReducedMotion: { value: 0 },
    uFocus: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3(0, 0, 10) },
    uViewport: { value: viewport }, uPixelRatio: { value: 1 },
    uEventPhase: { value: new THREE.Vector4() }, uEventStrength: { value: new THREE.Vector4() },
    uMaskStart: { value: mobile ? 0.35 : 0.24 }, uMaskEnd: { value: mobile ? 0.60 : 0.56 },
  };
  const materials: THREE.ShaderMaterial[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const prepare: THREE.Object3D['onBeforeRender'] = renderer => {
    // The current viewport includes composer targets and live DPR changes.
    renderer.getCurrentViewport(viewport);
    renderer.getSize(cssSize);
    uniforms.uPixelRatio.value = Math.max(0.5, Math.min(2, viewport.z / Math.max(cssSize.x, 1)));
  };
  const add = (name: string, geometry: THREE.BufferGeometry, vertexShader: string) => {
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader,
      transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending,
      premultipliedAlpha: false, toneMapped: false,
    });
    const points = new THREE.Points(geometry, material);
    points.name = name;
    points.frustumCulled = false;
    // Draw after the anatomical depth/flower, retaining their real occlusion.
    points.renderOrder = 4;
    points.onBeforeRender = prepare;
    group.add(points); materials.push(material); geometries.push(geometry);
    return points;
  };
  const perLane = mobile ? 740 : 2300;
  add('hyacinth-particle-currents', parameters(perLane * 5, (index, random) => [
    Math.floor(index / perLane), ((index % perLane) + random()) / perLane, random(), 0.017 + random() * 0.011,
  ]), currentVertexShader);
  const perArc = mobile ? 300 : 900;
  const ripples = add('hyacinth-bloom-ripples', parameters(perArc * 12, (index, random) => [
    Math.floor(index / (perArc * 3)), ((index % perArc) + random()) / perArc,
    Math.floor(index / perArc) % 3, random(),
  ]), rippleVertexShader);
  const accents = add('hyacinth-depth-accents', parameters(mobile ? 240 : 860, (_index, random) => [
    random(), random(), random(), 0.012 + random() * 0.026,
  ]), accentVertexShader);
  scene.add(group);
  const events = [8, 20, 32, 42] as const;
  let disposed = false;
  return {
    update(state: AtmosphereState, time: number) {
      if (disposed) return;
      const at = Math.min(44, Math.max(0, Number.isFinite(state.at) ? state.at : 0));
      group.visible = true;
      ripples.visible = !state.reducedMotion;
      accents.visible = !state.reducedMotion;
      uniforms.uAt.value = at;
      uniforms.uTime.value = state.reducedMotion ? 0 : (Number.isFinite(time) ? time : 0);
      uniforms.uReveal.value = 1;
      const secondary = updateSecondaryUniforms(uniforms, at, state.reducedMotion, state.emissionFrames);
      uniforms.uReducedMotion.value = state.reducedMotion ? 1 : 0;
      uniforms.uFocus.value.set(state.focus[0], state.focus[1], state.focus[2]);
      if (state.eye) uniforms.uEye.value.set(state.eye[0], state.eye[1], state.eye[2]);
      let localEnergy = 0;
      for (let i = 0; i < events.length; i++) {
        const center = events[i];
        localEnergy = Math.max(localEnergy, peak(at, center, i === 2 ? 3.0 : 2.6));
        uniforms.uEventPhase.value.setComponent(i, secondary.wave[i]);
        uniforms.uEventStrength.value.setComponent(i, secondary.signal[i]);
      }
      if (state.reducedMotion) localEnergy *= 0.12;
      uniforms.uEnergy.value = Math.max(clamp(state.energy), localEnergy * 0.82);
      uniforms.uFlow.value = Math.max(clamp(state.flow), 0.14 + localEnergy * 0.63);
      uniforms.uRipple.value = Math.max(clamp(state.ripple), localEnergy * 0.85);
      uniforms.uQuiet.value = Math.max(clamp(state.quiet), peak(at, 26, 3.0) * 0.94);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
