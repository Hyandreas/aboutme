import type { ReferenceReconstruction, ReferenceSurface } from './hyacinthReconstruction';

export interface HyacinthAsset {
  reconstruction: ReferenceReconstruction;
  /** Original image sample coordinates, in the same order as the front dots. */
  uv: Float32Array;
}

interface ArrayDescriptor {
  offset: number;
  length: number;
  type: 'f32' | 'u32' | 'u16';
  minimum?: number;
  maximum?: number;
}

interface AssetHeader {
  version: 1;
  source: { width: number; height: number };
  arrays: Record<string, ArrayDescriptor>;
  surfaces: { id: number; kind: ReferenceSurface['kind']; arrays: Record<string, ArrayDescriptor> }[];
  diagnostics: ReferenceReconstruction['diagnostics'];
}

const MAGIC = 'HYA3D001';
const HEADER_BYTES = 16;
const cache = new Map<boolean, Promise<HyacinthAsset>>();

function hasMagic(buffer: ArrayBuffer) {
  if (buffer.byteLength < HEADER_BYTES) return false;
  const bytes = new Uint8Array(buffer, 0, MAGIC.length);
  return bytes.every((byte, index) => byte === MAGIC.charCodeAt(index));
}

function decodeAsset(buffer: ArrayBuffer): HyacinthAsset {
  if (!hasMagic(buffer)) throw new Error('The hyacinth geometry asset has an invalid signature');
  const view = new DataView(buffer);
  const metadataLength = view.getUint32(8, true);
  const payloadLength = view.getUint32(12, true);
  const payloadOffset = Math.ceil((HEADER_BYTES + metadataLength) / 4) * 4;
  if (metadataLength === 0 || metadataLength > 1_048_576 || payloadOffset + payloadLength !== buffer.byteLength) {
    throw new Error('The hyacinth geometry asset is truncated or incompatible');
  }
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, HEADER_BYTES, metadataLength))) as AssetHeader;
  if (header.version !== 1 || !header.arrays || !Array.isArray(header.surfaces) || !header.diagnostics) {
    throw new Error('The hyacinth geometry asset has an unsupported schema');
  }
  const array = (descriptor: ArrayDescriptor | undefined, type: 'f32' | 'u32') => {
    const quantized = descriptor?.type === 'u16' && type === 'f32';
    const elementBytes = quantized ? 2 : 4;
    if (!descriptor || (!quantized && descriptor.type !== type) || !Number.isSafeInteger(descriptor.offset) || !Number.isSafeInteger(descriptor.length)
      || descriptor.offset < 0 || descriptor.offset % 4 !== 0 || descriptor.length < 0
      || descriptor.offset + descriptor.length * elementBytes > payloadLength) {
      throw new Error('The hyacinth geometry asset contains an invalid array');
    }
    if (quantized) {
      const minimum = descriptor.minimum, maximum = descriptor.maximum;
      if (typeof minimum !== 'number' || typeof maximum !== 'number' || !Number.isFinite(minimum)
        || !Number.isFinite(maximum) || maximum < minimum) {
        throw new Error('The hyacinth geometry asset contains an invalid quantization range');
      }
      const encoded = new Uint16Array(buffer, payloadOffset + descriptor.offset, descriptor.length);
      const decoded = new Float32Array(descriptor.length), span = (maximum - minimum) / 65_535;
      for (let i = 0; i < encoded.length; i++) decoded[i] = minimum + encoded[i] * span;
      return decoded;
    }
    return type === 'f32'
      ? new Float32Array(buffer, payloadOffset + descriptor.offset, descriptor.length)
      : new Uint32Array(buffer, payloadOffset + descriptor.offset, descriptor.length);
  };
  const float = (name: string) => array(header.arrays[name], 'f32') as Float32Array;
  const uint = (name: string) => array(header.arrays[name], 'u32') as Uint32Array;
  const reconstruction: ReferenceReconstruction = {
    positions: float('positions'), colors: float('colors'), seeds: float('seeds'),
    normals: float('normals'), pointScale: float('pointScale'), surfaceIds: uint('surfaceIds'),
    hiddenPositions: float('hiddenPositions'), hiddenColors: float('hiddenColors'),
    hiddenSeeds: float('hiddenSeeds'), hiddenNormals: float('hiddenNormals'),
    hiddenPointScale: float('hiddenPointScale'), hiddenSurfaceIds: uint('hiddenSurfaceIds'),
    hiddenUV: float('hiddenUV'),
    surfaces: header.surfaces.map(surface => {
      if (!Number.isSafeInteger(surface.id) || !['petal', 'stem', 'throat'].includes(surface.kind) || !surface.arrays) {
        throw new Error('The hyacinth geometry asset contains an invalid surface');
      }
      const result: ReferenceSurface = {
        id: surface.id, kind: surface.kind,
        positions: array(surface.arrays.positions, 'f32') as Float32Array,
        indices: array(surface.arrays.indices, 'u32') as Uint32Array,
        referenceUV: array(surface.arrays.referenceUV, 'f32') as Float32Array,
        normals: array(surface.arrays.normals, 'f32') as Float32Array,
      };
      const vertexCount = result.positions.length / 3;
      if (!Number.isInteger(vertexCount) || result.normals.length !== result.positions.length
        || result.referenceUV.length !== vertexCount * 2 || result.indices.length % 3 !== 0) {
        throw new Error('The hyacinth geometry asset has inconsistent surface attributes');
      }
      return result;
    }),
    diagnostics: header.diagnostics,
  };
  const uv = float('uv');
  const frontCount = reconstruction.seeds.length, hiddenCount = reconstruction.hiddenSeeds.length;
  if (reconstruction.positions.length !== frontCount * 3 || reconstruction.colors.length !== frontCount * 3
    || reconstruction.normals.length !== frontCount * 3 || reconstruction.pointScale.length !== frontCount
    || reconstruction.surfaceIds.length !== frontCount || uv.length !== frontCount * 2
    || reconstruction.hiddenPositions.length !== hiddenCount * 3 || reconstruction.hiddenColors.length !== hiddenCount * 3
    || reconstruction.hiddenNormals.length !== hiddenCount * 3 || reconstruction.hiddenPointScale.length !== hiddenCount
    || reconstruction.hiddenSurfaceIds.length !== hiddenCount || reconstruction.hiddenUV.length !== hiddenCount * 2) {
    throw new Error('The hyacinth geometry asset has inconsistent point attributes');
  }
  return { reconstruction, uv };
}

/** Decode the offline reconstruction once; repeated mounts share its typed arrays. */
export function loadHyacinthAsset(mobile: boolean): Promise<HyacinthAsset> {
  const existing = cache.get(mobile);
  if (existing) return existing;
  const promise = (async () => {
    const response = await fetch(`/assets/hyacinth-${mobile ? 'mobile' : 'desktop'}.bin.gz`);
    if (!response.ok) throw new Error(`The hyacinth geometry asset could not be loaded (${response.status})`);
    const compressed = await response.arrayBuffer();
    // Some hosts send Content-Encoding: gzip; in that case fetch already decoded it.
    if (hasMagic(compressed)) return decodeAsset(compressed);
    if (typeof DecompressionStream === 'undefined') throw new Error('Gzip geometry decoding is unavailable');
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
    return decodeAsset(await new Response(stream).arrayBuffer());
  })();
  cache.set(mobile, promise);
  void promise.catch(() => { if (cache.get(mobile) === promise) cache.delete(mobile); });
  return promise;
}
