import * as THREE from 'three';
import type { AtmosphereState } from './hyacinthAtmosphere';
import { createSecondaryUniforms, updateSecondaryUniforms, SECONDARY_CURVE_GLSL, SECONDARY_UNIFORMS_GLSL } from './hyacinthSecondaryForms';

const clamp = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function strips(forms: number, lengthSegments: number, widthSegments: number, edges: boolean) {
  const pieces = forms * (edges ? 2 : 1);
  const perPiece = (lengthSegments + 1) * (widthSegments + 1);
  const count = pieces * perPiece;
  const ids = new Float32Array(count), sides = new Float32Array(count), uv = new Float32Array(count * 2);
  const indices = new Uint32Array(pieces * lengthSegments * widthSegments * 6);
  let cursor = 0;
  for (let piece = 0; piece < pieces; piece++) {
    const start = piece * perPiece;
    for (let along = 0; along <= lengthSegments; along++) {
      for (let across = 0; across <= widthSegments; across++) {
        const index = start + along * (widthSegments + 1) + across;
        ids[index] = edges ? Math.floor(piece / 2) : piece;
        sides[index] = edges ? (piece % 2 === 0 ? -1 : 1) : 0;
        uv[index * 2] = along / lengthSegments; uv[index * 2 + 1] = across / widthSegments;
        if (along < lengthSegments && across < widthSegments) {
          const a = index, b = index + widthSegments + 1, c = b + 1, d = index + 1;
          indices.set([a, b, d, b, c, d], cursor); cursor += 6;
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('aForm', new THREE.BufferAttribute(ids, 1));
  geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  return geometry;
}

const commonVertex = /* glsl */ `
  precision highp float;
  attribute float aForm, aSide;
  uniform float uAt, uTime, uEnergy, uFlow, uQuiet, uReveal, uMotion, uPresence, uHasEye, uNearStart, uShardCount;
  uniform vec3 uFocus, uEye;
  uniform vec4 uViewport;
  ${SECONDARY_CURVE_GLSL}
  varying vec2 vUv;
  varying vec3 vWorld, vNormal;
  varying float vForm, vFade, vOrigin;
  const float TAU = 6.28318530718;
  float hash(float x) { return fract(sin(x * 127.1 + 13.37) * 43758.5453); }
  vec3 ribbon(float id, float t, float across) {
    // A fixed volume around the plant: camera travel supplies the parallax.
    float travel = uAt * uMotion;
    float passage = smoothstep(10.0, 17.0, travel) * (1.0 - smoothstep(24.0, 30.0, travel));
    float release = smoothstep(36.0, 43.0, travel);
    float angle = (t - 0.5) * (5.3 + id * 0.18) + id * 1.87;
    float breath = sin(uTime * 0.05 + id * 2.0) * 0.018;
    float taper = pow(max(0.0, sin(t * 3.14159265)), 0.65);
    float breadth = (0.38 + id * 0.12) * taper;
    float radius = 3.1 + id * 0.92 + across * breadth;
    float x = cos(angle) * radius + sin(angle * 2.0) * 0.52;
    float y = sin(angle) * radius * (1.0 + id * 0.18);
    float tilt = -0.35 + id * 0.48 + passage * 0.14 + breath;
    vec2 plane = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt)) * vec2(x, y);
    float fold = sin(angle * 2.0 + id) * (0.75 + passage * 0.35);
    vec3 center = vec3(0.85 + id * 0.20, 0.35 - id * 1.15, -2.5 - id * 0.60);
    return center + vec3(plane.x * (1.0 + release * 0.20), plane.y,
      fold + across * breadth * sin(angle * 2.0) * 0.80);
  }
  vec3 shard(float id, float t, float across) {
    float slot = mod(id, 4.0), variant = floor(id / 4.0);
    vec3 p = emissionCurve(slot, t, variant);
    vec3 tangent = normalize(emissionCurve(slot, t + 0.002, variant) - p);
    vec3 side = normalize(cross(tangent, vec3(0.18, 1.0, 0.27)) + vec3(0.00001));
    float opening = component(uUnfold, slot);
    float width = (0.0015 + opening * (0.075 + variant * 0.018))
      * pow(max(0.001, sin(t * 3.14159265)), 0.7);
    return p + side * across * width;
  }
  void emitSurface(vec3 p, vec3 normal) {
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vUv = uv; vWorld = p; vNormal = normal; vForm = aForm;
    vFade = smoothstep(0.30, 0.85, -mv.z) * (1.0 - smoothstep(45.0, 90.0, -mv.z));
    gl_Position = projectionMatrix * mv;
  }
`;

const surfaceVertex = (kind: 'ribbon' | 'shard') => commonVertex + /* glsl */ `
  void main() {
    float across = uv.y * 2.0 - 1.0;
    vec3 p = ${kind}(aForm, uv.x, across);
    vec3 tangent = ${kind}(aForm, uv.x + 0.002, across) - p;
    vec3 crosswise = ${kind}(aForm, uv.x, across + 0.02) - p;
    vOrigin = ${kind === 'ribbon' ? '1.0' : 'strandVisibility(mod(aForm, 4.0), uv.x, floor(aForm / 4.0))'};
    emitSurface(p, normalize(cross(tangent, crosswise)));
  }
`;

const edgeVertex = (kind: 'ribbon' | 'shard') => commonVertex + /* glsl */ `
  void main() {
    vec3 p = ${kind}(aForm, uv.x, aSide);
    vec3 tangent = normalize(${kind}(aForm, uv.x + 0.002, aSide) - p);
    vec3 crosswise = ${kind}(aForm, uv.x, aSide + 0.02) - p;
    vec3 normal = normalize(cross(tangent, crosswise));
    vec3 lateral = normalize(cross(normal, tangent));
    float depth = max(0.5, -(modelViewMatrix * vec4(p, 1.0)).z);
    float pixelWidth = depth / (max(uViewport.w, 1.0) * projectionMatrix[1][1] * 0.5);
    p += lateral * (uv.y - 0.5) * pixelWidth * ${kind === 'ribbon' ? '1.6' : '1.25'};
    vOrigin = ${kind === 'ribbon' ? '1.0' : 'strandVisibility(mod(aForm, 4.0), uv.x, floor(aForm / 4.0))'};
    emitSurface(p, normal);
  }
`;

const fragmentCommon = /* glsl */ `
  precision highp float;
  uniform float uAt, uTime, uEnergy, uQuiet, uReveal, uPresence, uMotion;
  uniform vec4 uViewport;
  ${SECONDARY_UNIFORMS_GLSL}
  varying vec2 vUv;
  varying vec3 vWorld, vNormal;
  varying float vForm, vFade, vOrigin;
  vec3 iridescence(float phase, float grazing) {
    vec3 violet = vec3(0.34, 0.20, 0.68), lilac = vec3(0.84, 0.61, 1.18);
    vec3 mineral = vec3(0.16, 0.73, 0.76), copper = vec3(1.24, 0.50, 0.25);
    vec3 pearl = vec3(1.20, 1.10, 0.93);
    vec3 color = mix(violet, lilac, 0.5 + 0.5 * sin(phase * 0.38));
    color = mix(color, mineral, smoothstep(0.45, 0.95, sin(phase * 0.61 + 1.4)) * 0.62);
    color = mix(color, copper, smoothstep(0.65, 0.98, sin(phase * 0.43 - 1.0)) * 0.76);
    return mix(color, pearl, grazing * 0.42);
  }
  float engraving(float coordinate, float width) {
    float distanceToLine = abs(fract(coordinate + 0.5) - 0.5);
    float aa = max(fwidth(coordinate), 0.0001);
    return (1.0 - smoothstep(width, width + aa, distanceToLine))
      * (1.0 - smoothstep(0.38, 0.75, aa));
  }
  float visibility() {
    float x = (gl_FragCoord.x - uViewport.x) / max(uViewport.z, 1.0);
    // Preserve a little world colour under the copy; never cut it off abruptly.
    float copy = mix(0.13, 1.0, smoothstep(0.20, 0.55, x));
    float ends = smoothstep(0.0, 0.09, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
    return vOrigin * vFade * copy * ends;
  }
`;

const fieldFragment = /* glsl */ `
  float fieldVisibility() {
    float discovery = vForm < 0.5 ? uFields.x : vForm < 1.5 ? uFields.y : uFields.z;
    // Two fragments of the same folds exist at rest; their intervening lines
    // become legible as the camera approaches and the light moves across them.
    float fragments = pow(0.5 + 0.5 * sin(vUv.x * 17.0 + vForm * 2.1), 3.0);
    return discovery * mix(fragments * 0.60, 1.0, smoothstep(0.25, 0.95, discovery));
  }
  float arrivingLight() {
    float response = 0.0;
    for (int i = 0; i < 4; i++) {
      float wave = component(uWave, float(i));
      vec3 tangent = normalize(uReleasedTangent[i] + vec3(0.00001));
      vec3 normal = normalize(uReleasedNormal[i] + vec3(0.00001));
      vec3 side = normalize(cross(tangent, normal) + vec3(0.00001));
      vec3 delta = vWorld - uReleasedSource[i] - normal * wave * 0.85;
      vec2 plane = vec2(dot(delta, tangent), dot(delta, side) / 0.72);
      float angle = atan(plane.y, plane.x);
      float radius = (0.03 + wave * 6.5) * (1.0 + 0.13 * sin(angle * 2.0 + float(i))
        + 0.035 * sin(angle * (5.0 + float(i))));
      float separation = dot(delta, normal) - sin(angle * 1.7) * radius * 0.21;
      response += exp(-pow((length(plane) - radius) * 1.15, 2.0))
        * exp(-abs(separation) * 0.45) * component(uSignal, float(i));
    }
    return response * uAnchorsReady;
  }
`;

const membraneFragment = fragmentCommon + fieldFragment + /* glsl */ `
  void main() {
    float grazing = pow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld))), 1.7);
    float phase = vUv.x * 7.5 + vForm * 2.3 + uAt * uMotion * 0.055;
    float warp = sin(vUv.x * 12.0 + vForm) * sin(vUv.y * 3.14159) * 1.15;
    float threads = engraving(vUv.y * (30.0 + vForm * 5.0) + warp, 0.055);
    float ribs = engraving(vUv.x * 115.0 + sin(vUv.y * 5.0 + phase) * 1.6, 0.035);
    float illumination = 0.48 + 0.52 * pow(0.5 + 0.5 * sin(vUv.x * 9.0 + vForm + uTime * 0.08), 2.0) + arrivingLight() * 1.20;
    float tissue = pow(max(0.0, sin(vUv.y * 3.14159)), 0.65);
    vec3 color = iridescence(phase, grazing) * (0.80 + illumination * 0.95 + uEnergy * 0.30);
    float alpha = visibility() * fieldVisibility() * tissue * (0.015 + threads * (0.46 + uPresence * 0.20) + ribs * 0.075)
      * illumination;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const shardFragment = fragmentCommon + /* glsl */ `
  void main() {
    float grazing = pow(1.0 - abs(dot(normalize(vNormal), normalize(cameraPosition - vWorld))), 1.3);
    float phase = vForm * 1.91 + vUv.x * 4.4 + uAt * uMotion * 0.055;
    float threads = engraving(vUv.y * 8.0 + sin(vUv.x * 12.0 + vForm) * 0.4, 0.055);
    vec3 color = iridescence(phase, grazing) * (0.90 + grazing * 0.8);
    float alpha = visibility() * (0.018 + threads * 0.55) * (0.65 + uPresence * 0.30);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const contourFragment = (field: boolean) => fragmentCommon + (field ? fieldFragment : '') + /* glsl */ `
  void main() {
    float middle = 1.0 - smoothstep(0.16, 0.50, abs(vUv.y - 0.5));
    float phase = vUv.x * 7.5 + vForm * 2.3 + uAt * uMotion * 0.055;
    float glint = pow(0.5 + 0.5 * sin(vUv.x * 17.0 + vForm * 2.0 - uTime * 0.06), 6.0);
    vec3 color = iridescence(phase, glint) * (1.0 + glint * 1.4);
    float alpha = visibility() * ${field ? 'fieldVisibility() * (1.0 + arrivingLight())' : '1.0'} * middle * (0.15 + glint * 0.65) * (0.5 + uPresence * 0.5);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** A persistent real-depth middle layer, separate from flower dots and auras. */
export function createHyacinthSpatialWorld(scene: THREE.Scene, mobile: boolean) {
  const group = new THREE.Group();
  group.name = 'hyacinth-spatial-world'; group.visible = false;
  const viewport = new THREE.Vector4(0, 0, 1440, 900);
  const forms = 3, shards = mobile ? 7 : 12;
  const uniforms = {
    ...createSecondaryUniforms(),
    uAt: { value: 0 }, uTime: { value: 0 }, uEnergy: { value: 0 }, uFlow: { value: 0 },
    uQuiet: { value: 0 }, uReveal: { value: 0 }, uMotion: { value: 1 }, uPresence: { value: 0.5 },
    uHasEye: { value: 0 }, uFocus: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() },
    uViewport: { value: viewport }, uNearStart: { value: forms - 2 }, uShardCount: { value: shards },
  };
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.ShaderMaterial[] = [];
  const prepare: THREE.Object3D['onBeforeRender'] = renderer => { renderer.getCurrentViewport(viewport); };
  const add = (name: string, geometry: THREE.BufferGeometry, vertexShader: string, fragmentShader: string, additive: boolean) => {
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader, fragmentShader, transparent: true,
      depthTest: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, premultipliedAlpha: false, toneMapped: false,
      extensions: { derivatives: true },
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = additive ? 4 : 2;
    mesh.onBeforeRender = prepare; group.add(mesh); geometries.push(geometry); materials.push(material);
  };
  add('hyacinth-world-membranes', strips(forms, mobile ? 128 : 192, mobile ? 8 : 16, false), surfaceVertex('ribbon'), membraneFragment, false);
  add('hyacinth-world-membrane-contours', strips(forms, mobile ? 128 : 192, 1, true), edgeVertex('ribbon'), contourFragment(true), true);
  add('hyacinth-world-shards', strips(shards, mobile ? 40 : 64, 6, false), surfaceVertex('shard'), shardFragment, false);
  add('hyacinth-world-shard-contours', strips(shards, mobile ? 40 : 64, 1, true), edgeVertex('shard'), contourFragment(false), true);
  scene.add(group);
  let disposed = false;
  return {
    update(state: AtmosphereState, time: number) {
      if (disposed) return;
      const at = Math.min(44, Math.max(0, Number.isFinite(state.at) ? state.at : 0));
      group.visible = true;
      uniforms.uAt.value = at;
      uniforms.uReveal.value = 1;
      updateSecondaryUniforms(uniforms, at, state.reducedMotion, state.emissionFrames);
      uniforms.uEnergy.value = clamp(state.energy); uniforms.uFlow.value = clamp(state.flow);
      uniforms.uQuiet.value = clamp(state.quiet);
      uniforms.uMotion.value = state.reducedMotion ? 0 : 1;
      uniforms.uTime.value = state.reducedMotion ? 0 : (Number.isFinite(time) ? time : 0);
      uniforms.uPresence.value = (0.49 + clamp(state.energy) * 0.50 + clamp(state.flow) * 0.15)
        * (state.reducedMotion ? 0.66 : 1);
      uniforms.uFocus.value.set(state.focus[0], state.focus[1], state.focus[2]);
      uniforms.uHasEye.value = state.eye ? 1 : 0;
      if (state.eye) uniforms.uEye.value.set(state.eye[0], state.eye[1], state.eye[2]);
    },
    dispose() {
      if (disposed) return;
      disposed = true; scene.remove(group);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      group.clear();
    },
  };
}
