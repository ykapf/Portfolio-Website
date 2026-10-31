// Renders the retro racer loop to public/readme/racer.webp, the animation layer of
// the README card served by /api/readme-racer. Re-run after changing the scene:
//   npm run render:readme
import { build } from "esbuild";
import { chromium } from "playwright-core";
import gifenc from "gifenc";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { quantize, applyPalette } = gifenc;
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(root, "public/readme/racer.webp");
// The card is embedded in a serverless response capped at 4.5 MB, so the frame rate is the size budget.
// WebP frame delays are whole milliseconds; 1000 / FPS must be an integer to keep the loop exact.
const FPS = Number(process.env.FPS ?? 12.5);
// Fog blending gives each frame ~1000 colours; one shared small palette lets WebP use its indexed mode.
const COLOURS = Number(process.env.COLOURS ?? 128);
const PALETTE_SAMPLE_EVERY = 6;

const bundle = await build({
  entryPoints: [join(root, "scripts/readme-racer/entry.ts")],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2020",
});

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome" });
const frames = [];
let W = 0;
let H = 0;
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const info = await page.evaluate(() => window.RACER);
  ({ W, H } = info);
  const count = Math.round(info.LOOP_SECONDS * FPS);
  for (let i = 0; i < count; i++) {
    const b64 = await page.evaluate((t) => window.renderFrame(t), i / FPS);
    frames.push(new Uint8Array(Buffer.from(b64, "base64")));
    if (i % 50 === 0) process.stdout.write(`\rrendered ${i}/${count}`);
  }
  process.stdout.write(`\rrendered ${count}/${count}\n`);
} finally {
  await browser.close();
}

const size = W * H * 4;
const sample = new Uint8Array(Math.ceil(frames.length / PALETTE_SAMPLE_EVERY) * size);
for (let i = 0; i < frames.length; i += PALETTE_SAMPLE_EVERY) sample.set(frames[i], (i / PALETTE_SAMPLE_EVERY) * size);
const palette = quantize(sample, COLOURS, { format: "rgb565" });

const strip = Buffer.alloc(frames.length * size);
frames.forEach((frame, f) => {
  const index = applyPalette(frame, palette, "rgb565");
  for (let p = 0, o = f * size; p < index.length; p++, o += 4) {
    const c = palette[index[p]];
    strip[o] = c[0];
    strip[o + 1] = c[1];
    strip[o + 2] = c[2];
    strip[o + 3] = 255;
  }
});

const bytes = await sharp(strip, { raw: { width: W, height: H * frames.length, channels: 4, pageHeight: H } })
  .webp({ lossless: true, effort: 6, loop: 0, delay: new Array(frames.length).fill(1000 / FPS) })
  .toBuffer();

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, bytes);
console.log(`wrote ${OUT} (${(bytes.length / 1024 / 1024).toFixed(2)} MB, ${frames.length} frames @ ${FPS}fps)`);
