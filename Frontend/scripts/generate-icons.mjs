// Generates the raster brand icons that cannot be SVG.
//
// Safari refuses an SVG for apple-touch-icon, so that one file has to be a
// PNG. Next's ImageResponse would normally do this, but it is non-functional
// in this checkout (even a bare <div> returns a 500 from the PNG encoder), and
// pulling in sharp or canvas to draw two dozen red pixels is not a dependency
// worth carrying. So this rasterises the bolt by hand and writes the PNG with
// nothing but node:zlib, which is in the standard library.
//
// Run: node scripts/generate-icons.mjs

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const BG = [0x12, 0x14, 0x14];
const RED = [0xe6, 0x00, 0x00];

// The same path as app/icon.svg, in its 64x64 coordinate space. Kept in step
// with that file by hand — there is no shared source, so if the mark changes,
// both change.
const BOLT = [
  [38, 4], [14, 36], [28, 36], [24, 60], [50, 26], [34, 26],
];

// Even-odd ray casting. The bolt is a simple non-self-intersecting polygon so
// the winding rule does not matter here.
function inside(px, py, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      hit = !hit;
    }
  }
  return hit;
}

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  // 10..12 = compression, filter, interlace — all 0.

  // One filter byte (0 = None) in front of every scanline. Filtering would
  // shrink this further, but on a two-colour image zlib already does the work.
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const p = row + 1 + x * 3;
      const [r, g, b] = rgb[y][x];
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 4x4 supersampling. Without it the bolt's diagonals stair-step badly at icon
// sizes — the whole mark is diagonal, so this is the difference between a
// crisp icon and a jagged one.
function render(size, inset) {
  const S = 4;
  const scale = (size - inset * 2) / 64;
  const out = [];
  for (let y = 0; y < size; y++) {
    const row = [];
    for (let x = 0; x < size; x++) {
      let hits = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = (x + (sx + 0.5) / S - inset) / scale;
          const py = (y + (sy + 0.5) / S - inset) / scale;
          if (inside(px, py, BOLT)) hits++;
        }
      }
      const a = hits / (S * S);
      row.push([
        Math.round(BG[0] + (RED[0] - BG[0]) * a),
        Math.round(BG[1] + (RED[1] - BG[1]) * a),
        Math.round(BG[2] + (RED[2] - BG[2]) * a),
      ]);
    }
    out.push(row);
  }
  return out;
}

const targets = [
  { path: "src/app/apple-icon.png", size: 180, inset: 26 },
  { path: "public/brand/icon-512.png", size: 512, inset: 74 },
];

for (const t of targets) {
  mkdirSync(dirname(t.path), { recursive: true });
  writeFileSync(t.path, png(t.size, t.size, render(t.size, t.inset)));
  console.log(`wrote ${t.path} (${t.size}x${t.size})`);
}
