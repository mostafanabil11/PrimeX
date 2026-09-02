// Derives the site's logo assets from the master file in the design folder.
//
// The master is `design/Primex _web_design/logo/final logo.png` — 981x528 RGBA
// with a transparent ground, white type and the brand red. One thing has to
// happen to it before the app can use it, and doing it by hand in an image
// editor is exactly the kind of step that gets forgotten and drifts:
//
//   TRIM. The master carries 20px of transparent padding on every side. Left
//   in, that padding is part of the box the browser lays out, so the mark
//   floats inside its own container and never aligns to anything.
//
// The strapline is deliberately NOT stripped for a header variant. It is part
// of the lockup and the brand is shown whole, even though at header height it
// renders small.
//
// Written against node:zlib alone rather than sharp or canvas, so it needs no
// dependency and runs anywhere node does.
//
//   node scripts/generate-logo-assets.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { deflateSync, inflateSync } from "node:zlib";

const MASTER = "../design/Primex _web_design/logo/glowing_logo.png";
const OUT_DIR = "public/brand";

function decode(file) {
  const buf = readFileSync(file);
  const W = buf.readUInt32BE(16);
  const H = buf.readUInt32BE(20);
  if (buf[25] !== 6) throw new Error(`expected RGBA (colour type 6), got ${buf[25]}`);

  let off = 8;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
    if (type === "IEND") break;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = W * bpp;
  const px = Buffer.alloc(H * stride);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let p = 0;
  for (let y = 0; y < H; y++) {
    const filter = raw[p++];
    const line = raw.subarray(p, p + stride);
    p += stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      px[y * stride + x] = v & 255;
    }
  }
  return { W, H, px };
}

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
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

// Sub filter on every scanline. On a logo — long runs of one colour broken by
// soft edges — it consistently beats no filtering by a wide margin, and it is
// far cheaper to write than picking the best filter per line.
function encode(W, H, px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = W * 4;
  const raw = Buffer.alloc(H * (1 + stride));
  for (let y = 0; y < H; y++) {
    const row = y * (1 + stride);
    raw[row] = 1;
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? px[y * stride + x - 4] : 0;
      raw[row + 1 + x] = (px[y * stride + x] - left) & 255;
    }
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Tightest box containing anything not fully transparent. */
function opaqueBounds({ W, H, px }) {
  let x0 = W;
  let x1 = 0;
  let y0 = H;
  let y1 = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return { x0, x1, y0, y1 };
}

function crop({ W, px }, { x0, x1, y0, y1 }) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    px.copy(out, y * w * 4, ((y + y0) * W + x0) * 4, ((y + y0) * W + x0 + w) * 4);
  }
  return { W: w, H: h, px: out };
}

const master = decode(MASTER);
const bounds = opaqueBounds(master);

const lockup = crop(master, bounds);
writeFileSync(`${OUT_DIR}/primex-lockup.png`, encode(lockup.W, lockup.H, lockup.px));

console.log(`master      ${master.W}x${master.H}`);
console.log(`trimmed to  x ${bounds.x0}-${bounds.x1}, y ${bounds.y0}-${bounds.y1}`);
console.log(`lockup      ${lockup.W}x${lockup.H}  -> ${OUT_DIR}/primex-lockup.png`);
