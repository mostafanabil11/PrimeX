/**
 * Lifts photography so it reads against this site's near-black page.
 *
 * The palette puts --background at #161616, luminance 22/255. Generated gym
 * photography comes back very dark by default, and a photograph whose shadows
 * sit at or below 22 is literally indistinguishable from the surface it is
 * placed on — the hero arrived 54% darker-than-page and rendered as an empty
 * rectangle despite loading correctly.
 *
 * linear(a, b) applies out = a*in + b: b raises the floor clear of the page,
 * a compresses just enough to keep the highlights off the ceiling. Chosen per
 * image rather than as one blanket curve, since they arrive at different
 * exposures.
 *
 * Originals are kept in Frontend/image-source/ so this is always re-runnable
 * and never lossy across repeated runs.
 *
 *   node scripts/tone-photos.js
 */
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public', 'images');
const SOURCE = path.join(__dirname, '..', 'image-source');
const PAGE_LUM = 22;

// Only photographs shown on the dark site.
//
// hero-gym-floor is a lifted copy of the social-preview frame rather than a
// replacement for it: brand/og.jpg keeps the untouched original, because a
// link preview renders on the light backgrounds of WhatsApp and Slack, where
// the dark frame is the stronger image. Same photograph, two destinations,
// two different correct exposures.
// These curves are paired with the brightness/contrast the components apply on
// top of them — do not retune one without the other.
//
// Not listed, deliberately:
//   - the six trainer portraits. They are studio shots on a black backdrop,
//     and the subject is already well exposed. The 55-73% of pixels below page
//     luminance is the backdrop, which is meant to be black — lifting it would
//     turn a deliberate cut-out into a grey rectangle.
//   - sheikh-zayed and maadi, which arrived correctly exposed.
// { auto: true } computes its own linear(a, b) per image from that image's
// own luminance histogram — see autoCurve() — rather than a hand-picked
// constant. Used for batches with no paired CSS filter to stay in sync with,
// where a per-image fit is strictly better than one guessed constant applied
// to thirteen photographs of varying exposure.
const PHOTOS = [
  { source: 'hero-home.jpg', output: 'hero-home.jpg', a: 0.8, b: 45 },
  { source: 'branch-new-cairo-hero.jpg', output: 'branch-new-cairo-hero.jpg', a: 0.85, b: 25 },
  { source: 'og-image.jpg', output: 'hero-gym-floor.jpg', a: 0.8, b: 45 },
  { source: 'home-intro-1.jpg', output: 'home-intro-1.jpg', auto: true },
  { source: 'home-intro-2.jpg', output: 'home-intro-2.jpg', auto: true },
  { source: 'home-intro-3.jpg', output: 'home-intro-3.jpg', auto: true },
  { source: 'about-story.jpg', output: 'about-story.jpg', auto: true },
  { source: 'class-strength-foundations.jpg', output: 'class-strength-foundations.jpg', auto: true },
  { source: 'class-hiit-inferno.jpg', output: 'class-hiit-inferno.jpg', auto: true },
  { source: 'class-olympic-lifting.jpg', output: 'class-olympic-lifting.jpg', auto: true },
  { source: 'class-metabolic-conditioning.jpg', output: 'class-metabolic-conditioning.jpg', auto: true },
  { source: 'class-mobility-core.jpg', output: 'class-mobility-core.jpg', auto: true },
  { source: 'class-boxing.jpg', output: 'class-boxing.jpg', auto: true },
  { source: 'class-spin.jpg', output: 'class-spin.jpg', auto: true },
  { source: 'class-yoga.jpg', output: 'class-yoga.jpg', auto: true },
  { source: 'class-functional-circuit.jpg', output: 'class-functional-circuit.jpg', auto: true },
];

// Fits linear(a, b) from the image's own 1st/99th luminance percentiles
// rather than a guessed constant: the 1st percentile (near-black shadow, not
// the true minimum, which is often one stray pixel) is mapped just above the
// page background, and the 99th percentile (near-white highlight) mapped
// just under the JPEG blow-out floor used elsewhere in this file. a is
// clamped to a sane range so a photo that is already fine is not overcorrected.
async function autoCurve(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  const lums = new Float32Array(Math.ceil(data.length / C));
  let n = 0;
  for (let i = 0; i < data.length; i += C) {
    lums[n++] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  const sorted = Array.from(lums.subarray(0, n)).sort((x, y) => x - y);
  const pct = (p) => sorted[Math.floor((sorted.length - 1) * p)];
  const p1 = pct(0.01);
  const p99 = pct(0.99);

  const targetLow = PAGE_LUM + 10; // 32 — a clear, not marginal, margin above the page
  const targetHigh = 238;

  let a = (targetHigh - targetLow) / Math.max(1, p99 - p1);
  a = Math.min(1.3, Math.max(0.5, a));
  const b = targetLow - a * p1;
  return { a: +a.toFixed(3), b: Math.round(b) };
}

async function measure(buf) {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const C = info.channels;
  let sum = 0, n = 0, below = 0, blown = 0;
  for (let i = 0; i < data.length; i += C) {
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    sum += l; n++;
    if (l <= PAGE_LUM) below++;
    if (l > 245) blown++;
  }
  return {
    mean: +(sum / n).toFixed(1),
    below: +((below / n) * 100).toFixed(1),
    blown: +((blown / n) * 100).toFixed(2),
  };
}

(async () => {
  await fs.mkdir(SOURCE, { recursive: true });

  for (const entry of PHOTOS) {
    const { source, output } = entry;
    const original = path.join(SOURCE, source);
    const live = path.join(PUBLIC, output);

    // First run banks the untouched original; later runs read from it, so
    // re-running never stacks a second curve on an already-lifted image.
    try {
      await fs.access(original);
    } catch {
      await fs.copyFile(path.join(PUBLIC, source), original);
    }

    const { a, b } = entry.auto ? await autoCurve(original) : entry;
    const before = await measure(original);
    // Quality 92 rather than the default: this is the largest thing on the
    // page and JPEG ringing shows badly on the hard equipment edges.
    const out = await sharp(original).linear(a, b).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    const after = await measure(out);
    await fs.writeFile(live, out);

    const { width, height } = await sharp(out).metadata();
    console.log(
      `${source}${source === output ? '' : ` -> ${output}`}  (${width}x${height})` +
        `${entry.auto ? `  [auto a=${a} b=${b}]` : ''}\n` +
        `  before  mean ${before.mean}  darker-than-page ${before.below}%\n` +
        `  after   mean ${after.mean}  darker-than-page ${after.below}%  blown ${after.blown}%`,
    );
  }
})();
