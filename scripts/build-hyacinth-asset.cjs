/* eslint-disable @typescript-eslint/no-require-imports -- This offline CommonJS generator uses the repository's TypeScript require hook. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { performance } = require('node:perf_hooks');
const sharp = require('sharp');

require('../tests/helpers/register-typescript.cjs');
const { reconstructReferencePoints } = require('../app/components/hyacinth/hyacinthReconstruction.ts');

const root = path.resolve(__dirname, '..');
const MAGIC = 'HYA3D001';
const HEADER_BYTES = 16;
const sourceFields = [
  'positions', 'colors', 'seeds', 'normals', 'pointScale', 'surfaceIds',
  'hiddenPositions', 'hiddenColors', 'hiddenSeeds', 'hiddenNormals',
  'hiddenPointScale', 'hiddenSurfaceIds', 'hiddenUV',
];

async function referenceSource(width, height) {
  const { data, info } = await sharp(path.join(root, 'public/assets/hyacinth.png'))
    .resize(width, height).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = [];
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2];
    const luminance = (.299 * r + .587 * g + .114 * b) / 255;
    const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    if (data[i + 3] >= 40 && !(luminance < .05 && saturation < .12)) pixels.push([x, y, r / 255, g / 255, b / 255]);
  }
  const count = pixels.length;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const seeds = new Float32Array(count), uv = new Float32Array(count * 2);
  const radius = (7 * 2 / 3 * .5) / Math.sin(2.15 * .5), offset = radius * Math.cos(2.15 * .5);
  pixels.forEach(([x, y, r, g, b], i) => {
    const u = x / (info.width - 1), v = y / (info.height - 1), nx = (u - .5) * 2, ny = (v - .5) * 2;
    const relief = (.299 * r + .587 * g + .114 * b - .45) * .95 + Math.sqrt(Math.max(0, 1 - nx * nx * .9 - ny * ny * .5)) * .5;
    const rr = radius + relief;
    positions.set([Math.sin((u - .5) * 2.15) * rr, (.5 - v) * 7 + .15, Math.cos((u - .5) * 2.15) * rr - offset], i * 3);
    colors.set([r * .97, g * .97, b * .97], i * 3);
    seeds[i] = (i * .6180339887) % 1;
    uv.set([u, v], i * 2);
  });
  return { positions, colors, seeds, uv };
}

function serialize(reconstruction, uv, sourceSize) {
  const chunks = [];
  let payloadLength = 0;
  const append = (array, quantize = false) => {
    const descriptor = { offset: payloadLength, length: array.length, type: array instanceof Uint32Array ? 'u32' : 'f32' };
    let encoded = array;
    if (quantize) {
      let minimum = Infinity, maximum = -Infinity;
      for (const value of array) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); }
      if (!array.length) minimum = maximum = 0;
      encoded = new Uint16Array(array.length);
      const span = maximum - minimum;
      for (let i = 0; i < array.length; i++) encoded[i] = span ? Math.round((array[i] - minimum) / span * 65_535) : 0;
      Object.assign(descriptor, { type: 'u16', minimum, maximum });
    }
    const bytes = Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    chunks.push(bytes);
    payloadLength += bytes.length;
    if (payloadLength % 4) {
      const padding = Buffer.alloc(4 - payloadLength % 4);
      chunks.push(padding);
      payloadLength += padding.length;
    }
    return descriptor;
  };
  // Every observed point and every shell vertex keeps its exact Float32 value.
  // Only completion attributes and shell shading/UV data use 16-bit storage.
  const arrays = Object.fromEntries(sourceFields.map(field => [field, append(reconstruction[field], field.startsWith('hidden') && field !== 'hiddenSurfaceIds')]));
  arrays.uv = append(uv);
  const surfaces = reconstruction.surfaces.map(surface => ({
    id: surface.id, kind: surface.kind,
    arrays: Object.fromEntries(['positions', 'indices', 'referenceUV', 'normals'].map(field => [field, append(surface[field], field === 'referenceUV' || field === 'normals')])),
  }));
  const metadata = Buffer.from(JSON.stringify({ version: 1, source: sourceSize, arrays, surfaces, diagnostics: reconstruction.diagnostics }));
  const payloadOffset = Math.ceil((HEADER_BYTES + metadata.length) / 4) * 4;
  const header = Buffer.alloc(payloadOffset);
  header.write(MAGIC, 0, 'ascii');
  header.writeUInt32LE(metadata.length, 8);
  header.writeUInt32LE(payloadLength, 12);
  metadata.copy(header, HEADER_BYTES);
  return Buffer.concat([header, ...chunks], payloadOffset + payloadLength);
}

async function build(mobile) {
  const totalStart = performance.now();
  const width = mobile ? 267 : 467, height = mobile ? 400 : 700;
  const source = await referenceSource(width, height);
  const reconstructionStart = performance.now();
  const reconstruction = reconstructReferencePoints(source, {
    cameraPosition: [-4.381869892, 2.60337031, 9.841986264],
    cameraTarget: [-1.416995459, 1.85, -.630441797],
    aspect: mobile ? 390 / 844 : 1440 / 900,
    width: mobile ? 390 : 1440, height: mobile ? 844 : 900, fov: 42,
  });
  const reconstructionMs = performance.now() - reconstructionStart;
  const binary = serialize(reconstruction, source.uv, { width, height });
  const compressed = gzipSync(binary, { level: 9 });
  const output = path.join(root, `public/assets/hyacinth-${mobile ? 'mobile' : 'desktop'}.bin.gz`);
  await fs.writeFile(output, compressed);
  const metrics = {
    output: path.relative(root, output), sampleSize: [width, height],
    frontDots: source.seeds.length, hiddenDots: reconstruction.hiddenSeeds.length,
    surfaces: reconstruction.surfaces.length,
    vertices: reconstruction.surfaces.reduce((sum, surface) => sum + surface.positions.length / 3, 0),
    triangles: reconstruction.surfaces.reduce((sum, surface) => sum + surface.indices.length / 3, 0),
    reconstructionMs: Math.round(reconstructionMs), totalMs: Math.round(performance.now() - totalStart),
    bytes: binary.length, gzipBytes: compressed.length,
    maxProjectionDriftPx: reconstruction.diagnostics.maxProjectionDriftPx,
  };
  console.log(JSON.stringify(metrics));
}

(async () => {
  const mobileOnly = process.argv.includes('--mobile'), desktopOnly = process.argv.includes('--desktop');
  if (!mobileOnly) await build(false);
  if (!desktopOnly) await build(true);
})().catch(error => { console.error(error); process.exitCode = 1; });
