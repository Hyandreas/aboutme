import * as THREE from 'three';
import { reconstructReferencePoints, type ReferenceSurface } from './hyacinthReconstruction';
import type { HyacinthAsset } from './hyacinthAsset';
import {
  createPetalMotionRigs, deformPetalPoint, sanitizePetalBlooms,
  HYACINTH_PETAL_DEFORMATION_GLSL, HYACINTH_PETAL_FOCUS_IDS, HYACINTH_PETAL_REFERENCE_EYE,
  type PetalMotionRig,
} from './hyacinthPetalMotion';

interface CloudOptions {
  uv: Float32Array;
  offset: readonly [number, number, number];
  asset?: HyacinthAsset;
}

interface EmissionFrame {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
}

/** World-space petal lip frame; release is sampled at this slot's own peak. */
export interface HyacinthEmissionAnchor extends EmissionFrame {
  slot: number;
  petalId: number;
  restPosition: THREE.Vector3;
  releasePosition: THREE.Vector3;
  releaseTangent: THREE.Vector3;
  releaseNormal: THREE.Vector3;
}

/** Interpolate the same front-shell normals carried by the reconstructed dots. */
function petalTipNormal(surface: ReferenceSurface, rig: PetalMotionRig) {
  const frontCount = surface.positions.length / 6;
  const triangle = new THREE.Triangle(), tip = new THREE.Vector3(...rig.tip);
  const closest = new THREE.Vector3(), weights = new THREE.Vector3(), normal = new THREE.Vector3();
  let distance = Infinity;
  for (let i = 0; i < surface.indices.length; i += 3) {
    const a = surface.indices[i], b = surface.indices[i + 1], c = surface.indices[i + 2];
    if (a >= frontCount || b >= frontCount || c >= frontCount) continue;
    triangle.a.fromArray(surface.positions, a * 3);
    triangle.b.fromArray(surface.positions, b * 3);
    triangle.c.fromArray(surface.positions, c * 3);
    triangle.closestPointToPoint(tip, closest);
    const candidate = closest.distanceToSquared(tip);
    if (candidate >= distance) continue;
    triangle.getBarycoord(closest, weights);
    normal.set(0, 0, 0);
    for (let axis = 0; axis < 3; axis++) normal.setComponent(axis,
      surface.normals[a * 3 + axis] * weights.x + surface.normals[b * 3 + axis] * weights.y + surface.normals[c * 3 + axis] * weights.z);
    distance = candidate;
  }
  if (normal.lengthSq() < 1e-12) normal.set(...HYACINTH_PETAL_REFERENCE_EYE).sub(tip);
  return normal.normalize();
}

/** Preserve browser-resampled colours and camera rays while reusing baked depth. */
function adaptAsset(asset: HyacinthAsset, source: Float32Array, uv: Float32Array, colors: Float32Array,
  seeds: Float32Array, eye: readonly number[], target: readonly number[]) {
  const baked = asset.reconstruction;
  const height = baked.seeds.length > 90000 ? 700 : 400;
  const width = Math.round(height * 2 / 3);
  const lookup = new Int32Array(width * height).fill(-1);
  for (let i = 0; i < asset.uv.length / 2; i++) {
    lookup[Math.round(asset.uv[i * 2 + 1] * (height - 1)) * width + Math.round(asset.uv[i * 2] * (width - 1))] = i;
  }
  const direction = target.map((v, i) => v - eye[i]);
  const length = Math.hypot(...direction);
  const forward = direction.map(v => v / length);
  const positions = new Float32Array(source.length), normals = new Float32Array(source.length);
  const pointScale = new Float32Array(seeds.length), surfaceIds = new Uint32Array(seeds.length);
  for (let i = 0; i < seeds.length; i++) {
    const x = Math.round(uv[i * 2] * (width - 1)), y = Math.round(uv[i * 2 + 1] * (height - 1));
    let match = lookup[y * width + x];
    for (let radius = 1; match < 0 && radius <= 4; radius++) {
      let nearest = Infinity;
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (x + dx < 0 || x + dx >= width || y + dy < 0 || y + dy >= height) continue;
        const candidate = lookup[(y + dy) * width + x + dx], distance = dx * dx + dy * dy;
        if (candidate >= 0 && distance < nearest) { match = candidate; nearest = distance; }
      }
    }
    let originalDepth = 0, depth = 0;
    for (let axis = 0; axis < 3; axis++) {
      originalDepth += (source[i * 3 + axis] - eye[axis]) * forward[axis];
      depth += ((match < 0 ? source[i * 3 + axis] : baked.positions[match * 3 + axis]) - eye[axis]) * forward[axis];
    }
    const scale = depth / originalDepth;
    for (let axis = 0; axis < 3; axis++) {
      positions[i * 3 + axis] = eye[axis] + (source[i * 3 + axis] - eye[axis]) * scale;
      normals[i * 3 + axis] = match < 0 ? -forward[axis] : baked.normals[match * 3 + axis];
    }
    pointScale[i] = scale;
    surfaceIds[i] = match < 0 ? 0 : baked.surfaceIds[match];
  }
  return { ...baked, positions, normals, pointScale, surfaceIds, colors, seeds };
}

/** Retain the original portrait samples and shader while giving them real surfaces. */
export function createReconstructedCloud(
  geometry: THREE.BufferGeometry,
  material: THREE.ShaderMaterial,
  options: CloudOptions,
) {
  const original = geometry.getAttribute('position').array as Float32Array;
  const sourceWorld = new Float32Array(original.length);
  for (let i = 0; i < original.length; i++) sourceWorld[i] = original[i] + options.offset[i % 3];
  const az = -24 * Math.PI / 180, el = 4 * Math.PI / 180;
  const cameraPosition: [number, number, number] = [
    Math.sin(az) * Math.cos(el) * 10.8,
    1.85 + Math.sin(el) * 10.8,
    Math.cos(az) * Math.cos(el) * 10.8,
  ];
  const cameraTarget: [number, number, number] = [-1.55 * Math.cos(az), 1.85, 1.55 * Math.sin(az)];
  const sourceColors = geometry.getAttribute('aColor').array as Float32Array;
  const sourceSeeds = geometry.getAttribute('aSeed').array as Float32Array;
  const reconstruction = options.asset ? adaptAsset(options.asset, sourceWorld, options.uv, sourceColors, sourceSeeds, cameraPosition, cameraTarget) : reconstructReferencePoints({
    positions: sourceWorld,
    colors: geometry.getAttribute('aColor').array as Float32Array,
    seeds: geometry.getAttribute('aSeed').array as Float32Array,
    uv: options.uv,
  }, {
    cameraPosition,
    cameraTarget,
    width: innerWidth, height: innerHeight, aspect: innerWidth / innerHeight, fov: 42,
  });
  const frontCount = reconstruction.seeds.length;
  const count = frontCount + reconstruction.hiddenSeeds.length;
  const petalRigs = createPetalMotionRigs(reconstruction.surfaces);
  const bindPetalFrames = (targetGeometry: THREE.BufferGeometry, length: number, surfaceId: (index: number) => number) => {
    const roots = new Float32Array(length * 3), frames = new Float32Array(length * 4), shapes = new Float32Array(length * 4);
    for (let i = 0; i < length; i++) {
      const rig = petalRigs.get(surfaceId(i));
      if (!rig) continue;
      for (let axis = 0; axis < 3; axis++) {
        roots[i * 3 + axis] = rig.root[axis] - options.offset[axis];
        frames[i * 4 + axis] = rig.direction[axis];
      }
      frames[i * 4 + 3] = rig.inverseLength;
      shapes.set([rig.opening, rig.curl, rig.slot, rig.delay], i * 4);
    }
    targetGeometry.setAttribute('aPetalRoot', new THREE.BufferAttribute(roots, 3));
    targetGeometry.setAttribute('aPetalFrame', new THREE.BufferAttribute(frames, 4));
    targetGeometry.setAttribute('aPetalShape', new THREE.BufferAttribute(shapes, 4));
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const scales = new Float32Array(count);
  const heights = new Float32Array(count);
  const observed = new Float32Array(count);
  positions.set(reconstruction.positions);
  positions.set(reconstruction.hiddenPositions, frontCount * 3);
  for (let i = 0; i < positions.length; i++) positions[i] -= options.offset[i % 3];
  colors.set(reconstruction.colors);
  colors.set(reconstruction.hiddenColors, frontCount * 3);
  normals.set(reconstruction.normals);
  normals.set(reconstruction.hiddenNormals, frontCount * 3);
  seeds.set(reconstruction.seeds);
  seeds.set(reconstruction.hiddenSeeds, frontCount);
  scales.set(reconstruction.pointScale);
  scales.set(reconstruction.hiddenPointScale, frontCount);
  observed.fill(1, 0, frontCount);
  for (let i = 0; i < frontCount; i++) heights[i] = 1 - options.uv[i * 2 + 1];
  for (let i = frontCount; i < count; i++) heights[i] = 1 - reconstruction.hiddenUV[(i - frontCount) * 2 + 1];
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aSizeScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aObserved', new THREE.BufferAttribute(observed, 1));
  const referencePositions = positions.slice();
  referencePositions.set(original);
  geometry.setAttribute('aReferencePosition', new THREE.BufferAttribute(referencePositions, 3));
  geometry.setAttribute('aH', new THREE.BufferAttribute(heights, 1));
  bindPetalFrames(geometry, count, index => index < frontCount ? reconstruction.surfaceIds[index] : reconstruction.hiddenSurfaceIds[index - frontCount]);
  geometry.computeBoundingSphere();

  material.uniforms.uReferenceView = { value: 1 };
  material.uniforms.uJourneyProgress = { value: 0 };
  material.uniforms.uPixelRatio = { value: Math.min(devicePixelRatio || 1, 1.25) };
  material.uniforms.uPetalBloom = { value: new THREE.Vector4() };
  material.uniforms.uPetalTime = { value: 0 };
  material.uniforms.uPetalActive = { value: 0 };
  material.uniforms.uPetalEye = { value: new THREE.Vector3(...HYACINTH_PETAL_REFERENCE_EYE).sub(new THREE.Vector3(...options.offset)) };
  material.vertexShader = material.vertexShader
    .replace('attribute vec3 aColor;', 'attribute vec3 aNormal, aReferencePosition; attribute float aSizeScale, aObserved; attribute vec3 aColor;')
    .replace('varying vec3 vColor;', 'uniform float uJourneyProgress, uReferenceView, uPixelRatio, uPetalActive; varying float vFacing, vObserved, vSeed, vReferenceDepth, vDetail, vPetalLight; varying vec3 vSurface, vNormal; varying vec3 vColor;')
    .replace('void main(){', `${HYACINTH_PETAL_DEFORMATION_GLSL}\nvoid main(){`)
    .replace('vec3 p = position;', `vec3 p = position; vec3 deformedNormal = aNormal;
      deformHyacinthPetal(p, deformedNormal, vPetalLight); vObserved = aObserved; vSeed = aSeed;
      vDetail = max(max(smoothstep(0.0, 0.065, uJourneyProgress), 1.0 - smoothstep(0.990, 0.99995, uReferenceView)), smoothstep(0.0, 0.06, uPetalActive));
      vSurface = position; vNormal = deformedNormal;`)
    .replace('* 0.035;', '* 0.035 * aSizeScale * mix(1.0, 0.07, vDetail);')
    .replace('* 0.035;', '* 0.035 * aSizeScale * mix(1.0, 0.07, vDetail);')
    .replace('* 0.06;', '* 0.06 * aSizeScale * mix(1.0, 0.055, vDetail);')
    .replace('wave * (0.7 + uSwell * 1.2);', 'wave * (0.7 + uSwell * 1.2) * mix(aSizeScale, 1.0, vDetail);')
    .replace('scat * s * 7.0;', 'scat * s * 7.0 * aSizeScale;')
    .replace('gl_PointSize = clamp(uSize /', 'vFacing = dot(normalize(normalMatrix * deformedNormal), normalize(-mv.xyz));\n          gl_PointSize = clamp(uSize * aSizeScale /')
    .replace('gl_Position = projectionMatrix * mv;', `
          gl_PointSize = mix(gl_PointSize, clamp(gl_PointSize * 0.70, 1.2, 3.6 * uPixelRatio), vDetail);
          gl_Position = projectionMatrix * mv;
          vec3 referenceP = aReferencePosition + (p - position) / aSizeScale;
          vec4 referenceClip = projectionMatrix * modelViewMatrix * vec4(referenceP, 1.0);
          vReferenceDepth = referenceClip.z / referenceClip.w * 0.5 + 0.5;`);
  material.fragmentShader = material.fragmentShader
    .replace('varying vec3 vColor;', 'uniform float uReferenceView, uJourneyProgress, uTime, uPetalActive; varying float vFacing, vObserved, vSeed, vReferenceDepth, vDetail, vPetalLight; varying vec3 vSurface, vNormal; varying vec3 vColor;')
    .replace('vec2 d = gl_PointCoord - 0.5;', `
          if (vFacing < -0.015) discard;
          // The observed portrait already supplies every visible entry-view dot.
          // Newly completed undersides acquire samples as those surfaces come into view.
          float coverage = max(max(1.0 - smoothstep(0.990, 0.99995, uReferenceView), smoothstep(0.0, 0.055, uJourneyProgress)), smoothstep(0.0, 0.04, uPetalActive));
          if (vObserved < 0.5 && vSeed >= coverage) discard;
          vec2 d = gl_PointCoord - 0.5;`)
    .replace('gl_FragColor = vec4(c, 1.0);', `
          // Preserve the original overlap of its fine dots in the reference view.
          // The actual reconstructed depth takes over as the view changes.
          float referenceWeight = (1.0 - vDetail) * vObserved;
          gl_FragDepthEXT = mix(gl_FragCoord.z, vReferenceDepth, referenceWeight);
          vec3 normal = normalize(vNormal);
          float key = max(0.0, dot(normal, normalize(vec3(-0.45, 0.65, 0.8))));
          float fill = max(0.0, dot(normal, normalize(vec3(0.8, -0.1, -0.45))));
          float rim = pow(1.0 - abs(vFacing), 2.0);
          float shade = 0.78 + 0.55 * key + 0.18 * fill + 0.18 * rim;
          vec3 pigment = pow(max(vColor, vec3(0.0)), vec3(1.3));
          float phase = vSurface.y * 8.0 + sin(vSurface.x * 5.0 + vSurface.z * 3.0) * 2.2
            + uTime * 0.12 + uJourneyProgress * 2.0;
          float contour = 0.5 + 0.5 * sin(phase);
          vec3 interference = mix(vec3(0.10, 0.32, 1.0), vec3(0.70, 0.04, 0.85), contour);
          float brightness = max(pigment.r, max(pigment.g, pigment.b));
          vec3 art = mix(pigment, interference * brightness, 0.28) * shade;
          art += vec3(0.02, 0.16, 0.22) * pow(1.0 - contour, 5.0) * brightness * 0.35;
          vec3 livingRim = mix(vec3(0.08, 0.85, 1.0), vec3(0.72, 0.12, 1.0), contour);
          art += livingRim * brightness * vPetalLight * (0.18 + 1.20 * rim + 0.22 * key);
          art += vGlow * (0.4 + uSwell * 0.8) * vec3(0.5, 0.35, 0.85);
          c = mix(c, art, vDetail);
          gl_FragColor = vec4(c, 1.0);`);
  material.extensions.fragDepth = true;
  material.needsUpdate = true;
  const points = new THREE.Points(geometry, material);
  points.name = 'reference-hyacinth-dots';
  points.frustumCulled = false;
  const referenceDirection = new THREE.Vector3(...cameraPosition).sub(new THREE.Vector3(0, .15, 0)).normalize();
  const actualDirection = new THREE.Vector3();
  const center = new THREE.Vector3(0, .15, 0);
  const updateView: THREE.Object3D['onBeforeRender'] = (_renderer, _scene, camera) => {
    actualDirection.setFromMatrixPosition(camera.matrixWorld).sub(center).normalize();
    material.uniforms.uReferenceView.value = actualDirection.dot(referenceDirection);
    material.uniformsNeedUpdate = true;
  };
  points.onBeforeRender = (...args) => {
    updateView(...args);
    geometry.setDrawRange(0, material.uniforms.uReferenceView.value >= .99995 && material.uniforms.uJourneyProgress.value < .00001 && material.uniforms.uPetalActive.value < .00001 ? frontCount : count);
  };

  const vertexCount = reconstruction.surfaces.reduce((n, part) => n + part.positions.length / 3, 0);
  const indexCount = reconstruction.surfaces.reduce((n, part) => n + part.indices.length, 0);
  const surfacePositions = new Float32Array(vertexCount * 3);
  const surfaceHeights = new Float32Array(vertexCount);
  const surfaceIds = new Uint32Array(vertexCount);
  const indices = new Uint32Array(indexCount);
  let vertexOffset = 0, indexOffset = 0;
  for (const part of reconstruction.surfaces) {
    for (let i = 0; i < part.positions.length; i++) surfacePositions[vertexOffset * 3 + i] = part.positions[i] - options.offset[i % 3];
    for (let i = 0; i < part.positions.length / 3; i++) surfaceHeights[vertexOffset + i] = 1 - part.referenceUV[i * 2 + 1];
    for (let i = 0; i < part.indices.length; i++) indices[indexOffset + i] = part.indices[i] + vertexOffset;
    surfaceIds.fill(part.id, vertexOffset, vertexOffset + part.positions.length / 3);
    vertexOffset += part.positions.length / 3;
    indexOffset += part.indices.length;
  }
  const surfaceGeometry = new THREE.BufferGeometry();
  surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(surfacePositions, 3));
  surfaceGeometry.setAttribute('aH', new THREE.BufferAttribute(surfaceHeights, 1));
  bindPetalFrames(surfaceGeometry, vertexCount, index => surfaceIds[index]);
  surfaceGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
  surfaceGeometry.computeBoundingSphere();
  const depthMaterial = new THREE.ShaderMaterial({
    uniforms: { uWave: material.uniforms.uWave, uSwell: material.uniforms.uSwell, uReferenceView: material.uniforms.uReferenceView,
      uJourneyProgress: material.uniforms.uJourneyProgress, uPetalBloom: material.uniforms.uPetalBloom,
      uPetalTime: material.uniforms.uPetalTime, uPetalEye: material.uniforms.uPetalEye, uPetalActive: material.uniforms.uPetalActive },
    side: THREE.DoubleSide, colorWrite: false, depthWrite: true, depthTest: true,
    vertexShader: `attribute float aH; uniform float uWave, uSwell, uReferenceView, uJourneyProgress, uPetalActive;
      ${HYACINTH_PETAL_DEFORMATION_GLSL}
      void main(){vec3 p=position,normal=vec3(0.0,0.0,1.0);float energy;deformHyacinthPetal(p,normal,energy);
      float wave=exp(-pow((aH-uWave)*4.5,2.0));
      p.z+=wave*(0.7+uSwell*1.2);vec4 v=modelViewMatrix*vec4(p,1.0);
      // Behind the full original idle-jitter envelope; never trim the observed dots.
      float referenceWeight=smoothstep(0.990,0.99995,uReferenceView)*(1.0-smoothstep(0.0,0.065,uJourneyProgress))*(1.0-smoothstep(0.0,0.06,uPetalActive));
      v.z-=mix(0.018,6.0,referenceWeight);gl_Position=projectionMatrix*v;}`,
    fragmentShader: `uniform float uReferenceView, uJourneyProgress, uPetalActive;
      void main(){if(uReferenceView>=0.99995&&uJourneyProgress<0.00001&&uPetalActive<0.00001)discard;gl_FragColor=vec4(0.0);}`,
  });
  const depthSurface = new THREE.Mesh(surfaceGeometry, depthMaterial);
  depthSurface.name = 'hyacinth-anatomical-depth';
  depthSurface.renderOrder = -10;
  depthSurface.frustumCulled = false;
  depthSurface.onBeforeRender = (...args) => {
    updateView(...args);
    surfaceGeometry.setDrawRange(0, material.uniforms.uReferenceView.value >= .99995 && material.uniforms.uJourneyProgress.value < .00001 && material.uniforms.uPetalActive.value < .00001 ? 0 : indexCount);
    depthMaterial.uniformsNeedUpdate = true;
  };
  // Fill gaps between dots only after their colour has rendered. Later world
  // geometry can then sit behind the flower even at its exact reference pose.
  const secondaryDepthMaterial = new THREE.ShaderMaterial({
    uniforms: { ...depthMaterial.uniforms },
    transparent: true, side: THREE.DoubleSide, forceSinglePass: true,
    colorWrite: false, depthWrite: true, depthTest: true,
    vertexShader: `attribute float aH; uniform float uWave, uSwell;
      ${HYACINTH_PETAL_DEFORMATION_GLSL}
      void main(){vec3 p=position,normal=vec3(0.0,0.0,1.0);float energy;deformHyacinthPetal(p,normal,energy);
      float wave=exp(-pow((aH-uWave)*4.5,2.0));
      p.z+=wave*(0.7+uSwell*1.2);vec4 v=modelViewMatrix*vec4(p,1.0);
      v.z-=0.018;gl_Position=projectionMatrix*v;}`,
    fragmentShader: 'void main(){gl_FragColor=vec4(0.0);}',
  });
  const secondaryDepthSurface = new THREE.Mesh(surfaceGeometry, secondaryDepthMaterial);
  secondaryDepthSurface.name = 'hyacinth-secondary-occlusion';
  secondaryDepthSurface.renderOrder = 1;
  secondaryDepthSurface.frustumCulled = false;
  secondaryDepthSurface.onBeforeRender = () => {
    // The primary depth pass sets this shared geometry's range to zero at entry.
    surfaceGeometry.setDrawRange(0, indexCount);
    secondaryDepthMaterial.uniformsNeedUpdate = true;
  };
  const createFrame = (): EmissionFrame => ({ position: new THREE.Vector3(), tangent: new THREE.Vector3(), normal: new THREE.Vector3() });
  const emissionDefinitions = HYACINTH_PETAL_FOCUS_IDS.flatMap((petalId, slot) => {
    const rig = petalRigs.get(petalId), surface = reconstruction.surfaces.find(part => part.id === petalId);
    if (!rig || !surface) return [];
    const normal = petalTipNormal(surface, rig), tangent = new THREE.Vector3(...rig.direction);
    tangent.addScaledVector(normal, -tangent.dot(normal));
    if (tangent.lengthSq() < 1e-12) tangent.set(...rig.axis).cross(normal);
    tangent.normalize();
    // A centered surface differential includes the bend gradient at the lip.
    // Merely rotating a rest tangent would slide the strand over curved petals.
    const step = 1e-5 / rig.inverseLength;
    const before = new THREE.Vector3(...rig.tip).addScaledVector(tangent, -step).toArray();
    const after = new THREE.Vector3(...rig.tip).addScaledVector(tangent, step).toArray();
    const restNormal = normal.toArray();
    const sample = (blooms: readonly number[], time: number, target: EmissionFrame) => {
      const center = deformPetalPoint(rig, rig.tip, restNormal, blooms, time);
      const a = deformPetalPoint(rig, before, restNormal, blooms, time).position;
      const b = deformPetalPoint(rig, after, restNormal, blooms, time).position;
      target.position.set(...center.position);
      target.normal.set(...center.normal);
      target.tangent.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      target.tangent.addScaledVector(target.normal, -target.tangent.dot(target.normal)).normalize();
    };
    const peak = [0, 0, 0, 0];
    peak[slot] = 1;
    const release = createFrame();
    sample(peak, 0, release);
    const anchor: HyacinthEmissionAnchor = { ...createFrame(), slot, petalId,
      restPosition: new THREE.Vector3(), releasePosition: new THREE.Vector3(),
      releaseTangent: new THREE.Vector3(), releaseNormal: new THREE.Vector3() };
    return [{ rig, release, sample, anchor }];
  });
  const emissionAnchors = emissionDefinitions.map(definition => definition.anchor);
  const modelOffset = new THREE.Vector3(...options.offset), emissionNormalMatrix = new THREE.Matrix3();
  const toWorldPosition = (position: THREE.Vector3) => position.sub(modelOffset).applyMatrix4(points.matrixWorld);
  const toWorldFrame = (tangent: THREE.Vector3, normal: THREE.Vector3) => {
    normal.applyNormalMatrix(emissionNormalMatrix);
    tangent.transformDirection(points.matrixWorld);
    tangent.addScaledVector(normal, -tangent.dot(normal)).normalize();
  };
  let currentBlooms = sanitizePetalBlooms([]), motionTime = 0;
  return {
    points, depthSurface, secondaryDepthSurface, reconstruction,
    setMotion(blooms: readonly number[], time: number, reducedMotion: boolean) {
      currentBlooms = sanitizePetalBlooms(blooms, reducedMotion);
      motionTime = Number.isFinite(time) ? time : 0;
      material.uniforms.uPetalBloom.value.set(...currentBlooms);
      material.uniforms.uPetalTime.value = motionTime;
      material.uniforms.uPetalActive.value = Math.max(...currentBlooms.map(Math.abs));
      material.uniformsNeedUpdate = true; depthMaterial.uniformsNeedUpdate = true; secondaryDepthMaterial.uniformsNeedUpdate = true;
    },
    getFocus(slot: number): { position: THREE.Vector3; rest: THREE.Vector3 } | null {
      const id = HYACINTH_PETAL_FOCUS_IDS[slot], rig = petalRigs.get(id);
      if (!rig) return null;
      const focus = deformPetalPoint(rig, rig.tip, [0, 0, 1], currentBlooms, motionTime);
      const local = new THREE.Vector3(...focus.position).sub(new THREE.Vector3(...options.offset));
      const rest = new THREE.Vector3(...rig.tip).sub(new THREE.Vector3(...options.offset));
      points.updateWorldMatrix(true, false);
      return { position: points.localToWorld(local), rest: points.localToWorld(rest) };
    },
    /** Reuses its array and vectors; consumers that retain a pose should copy it. */
    getEmissionAnchors(): HyacinthEmissionAnchor[] {
      points.updateWorldMatrix(true, false);
      emissionNormalMatrix.getNormalMatrix(points.matrixWorld);
      for (const { rig, release, sample, anchor } of emissionDefinitions) {
        sample(currentBlooms, motionTime, anchor);
        toWorldPosition(anchor.position);
        toWorldFrame(anchor.tangent, anchor.normal);
        toWorldPosition(anchor.restPosition.set(...rig.tip));
        toWorldPosition(anchor.releasePosition.copy(release.position));
        anchor.releaseTangent.copy(release.tangent);
        anchor.releaseNormal.copy(release.normal);
        toWorldFrame(anchor.releaseTangent, anchor.releaseNormal);
      }
      return emissionAnchors;
    },
    disposeDepth() { surfaceGeometry.dispose(); depthMaterial.dispose(); secondaryDepthMaterial.dispose(); },
  };
}
