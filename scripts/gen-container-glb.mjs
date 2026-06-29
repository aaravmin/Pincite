/**
 * Generate a representative "circular pizza box" 3D model (a round molded-fiber food
 * container: a wide shallow base plus a lid) as a self-contained binary glTF, with no
 * dependencies. This stands in for Apple's circular container (US 2012/0024859 A1) so the
 * 3D viewer demonstrates a real, recognizable shape rather than a plain box.
 *   node scripts/gen-container-glb.mjs
 */
import { writeFileSync } from "node:fs";

const SEG = 64;

// Build one capped cylinder (along Y) with outward normals.
function cylinder(radius, height, yCenter) {
  const pos = [];
  const nor = [];
  const idx = [];
  const half = height / 2;
  const top = yCenter + half;
  const bot = yCenter - half;

  // Side: a top ring then a bottom ring (SEG+1 verts each to close the seam).
  for (let i = 0; i <= SEG; i++) {
    const a = (2 * Math.PI * i) / SEG;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    pos.push(radius * cx, top, radius * cz);
    nor.push(cx, 0, cz);
  }
  const botStart = SEG + 1;
  for (let i = 0; i <= SEG; i++) {
    const a = (2 * Math.PI * i) / SEG;
    const cx = Math.cos(a);
    const cz = Math.sin(a);
    pos.push(radius * cx, bot, radius * cz);
    nor.push(cx, 0, cz);
  }
  for (let i = 0; i < SEG; i++) {
    const t0 = i;
    const t1 = i + 1;
    const b0 = botStart + i;
    const b1 = botStart + i + 1;
    idx.push(t0, b0, t1, t1, b0, b1);
  }

  // Top cap (normal up).
  const topCenter = pos.length / 3;
  pos.push(0, top, 0);
  nor.push(0, 1, 0);
  const topRing = pos.length / 3;
  for (let i = 0; i <= SEG; i++) {
    const a = (2 * Math.PI * i) / SEG;
    pos.push(radius * Math.cos(a), top, radius * Math.sin(a));
    nor.push(0, 1, 0);
  }
  for (let i = 0; i < SEG; i++) idx.push(topCenter, topRing + i, topRing + i + 1);

  // Bottom cap (normal down, reversed winding).
  const botCenter = pos.length / 3;
  pos.push(0, bot, 0);
  nor.push(0, -1, 0);
  const botRing = pos.length / 3;
  for (let i = 0; i <= SEG; i++) {
    const a = (2 * Math.PI * i) / SEG;
    pos.push(radius * Math.cos(a), bot, radius * Math.sin(a));
    nor.push(0, -1, 0);
  }
  for (let i = 0; i < SEG; i++) idx.push(botCenter, botRing + i + 1, botRing + i);

  return {
    pos: new Float32Array(pos),
    nor: new Float32Array(nor),
    idx: new Uint16Array(idx),
  };
}

// A wide shallow base and a slightly wider, thinner lid stacked on top.
const base = cylinder(1.0, 0.32, 0.0);
const lid = cylinder(1.06, 0.12, 0.22);

const parts = [base, lid];
const materials = [
  { baseColorFactor: [0.86, 0.79, 0.62, 1], metallicFactor: 0.0, roughnessFactor: 0.85 },
  { baseColorFactor: [0.78, 0.69, 0.5, 1], metallicFactor: 0.0, roughnessFactor: 0.85 },
];

const align4 = (n) => (n + 3) & ~3;
const chunks = [];
const bufferViews = [];
const accessors = [];
const meshes = [];
const nodes = [];
let offset = 0;

function addView(typedArray, target) {
  const buf = Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  );
  const padded = align4(buf.length);
  const out = Buffer.alloc(padded);
  buf.copy(out);
  chunks.push(out);
  const view = { buffer: 0, byteOffset: offset, byteLength: buf.length, target };
  offset += padded;
  bufferViews.push(view);
  return bufferViews.length - 1;
}

parts.forEach((p, i) => {
  const posView = addView(p.pos, 34962);
  const norView = addView(p.nor, 34962);
  const idxView = addView(p.idx, 34963);

  // POSITION needs min/max.
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let k = 0; k < p.pos.length; k += 3) {
    for (let c = 0; c < 3; c++) {
      const v = p.pos[k + c];
      if (v < min[c]) min[c] = v;
      if (v > max[c]) max[c] = v;
    }
  }

  const posAcc = accessors.push({
    bufferView: posView,
    componentType: 5126,
    count: p.pos.length / 3,
    type: "VEC3",
    min,
    max,
  }) - 1;
  const norAcc = accessors.push({
    bufferView: norView,
    componentType: 5126,
    count: p.nor.length / 3,
    type: "VEC3",
  }) - 1;
  const idxAcc = accessors.push({
    bufferView: idxView,
    componentType: 5123,
    count: p.idx.length,
    type: "SCALAR",
  }) - 1;

  meshes.push({
    primitives: [
      {
        attributes: { POSITION: posAcc, NORMAL: norAcc },
        indices: idxAcc,
        material: i,
      },
    ],
  });
  nodes.push({ mesh: i });
});

const bin = Buffer.concat(chunks);
const gltf = {
  asset: { version: "2.0", generator: "pincite-container" },
  scene: 0,
  scenes: [{ nodes: nodes.map((_, i) => i) }],
  nodes,
  meshes,
  materials: materials.map((m) => ({ pbrMetallicRoughness: m, doubleSided: true })),
  accessors,
  bufferViews,
  buffers: [{ byteLength: bin.length }],
};

// Assemble the GLB container.
let json = Buffer.from(JSON.stringify(gltf), "utf8");
if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);
let binPad = bin;
if (binPad.length % 4) binPad = Buffer.concat([binPad, Buffer.alloc(4 - (binPad.length % 4))]);

const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0); // "glTF"
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + json.length + 8 + binPad.length, 8);

const jsonHeader = Buffer.alloc(8);
jsonHeader.writeUInt32LE(json.length, 0);
jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binPad.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

const glb = Buffer.concat([header, jsonHeader, json, binHeader, binPad]);
writeFileSync("e2e/fixtures/sample-model.glb", glb);
console.log(`wrote e2e/fixtures/sample-model.glb (${glb.length} bytes, ${parts.length} parts)`);
