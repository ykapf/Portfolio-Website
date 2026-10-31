import { join } from "node:path";
import sharp from "sharp";
import { H, W } from "../../components/retro-racer/config";
import { HudStats, HudStatus, drawHudStats, drawHudTicker, tickerLine } from "../../components/retro-racer/hud";
import { REVALIDATE, loadGithubStats } from "../github-stats/stats";

// Encoding takes far longer than GitHub's image proxy will wait, so the card is built at deploy time and
// regenerated in the background (ISR); requests always get the last finished copy instantly.
export const revalidate = 600;
export const runtime = "nodejs";
export const maxDuration = 60;

// Half a blink cycle; the 24s loop must be a whole number of cycles so the blink doesn't jump at the seam.
const BLINK_HALF_MS = 600;

interface Animation {
  frames: Buffer;
  pages: number;
  delay: number[];
}

let animation: Promise<Animation> | null = null;
let cached: { key: string; at: number; bytes: Promise<Buffer> } | null = null;

/** The pre-rendered scene from `npm run render:readme`, decoded to raw RGBA frames. */
function loadAnimation(): Promise<Animation> {
  animation ??= (async () => {
    const img = sharp(join(process.cwd(), "public/readme/racer.webp"), { animated: true, limitInputPixels: false });
    const meta = await img.metadata();
    const frames = await img.ensureAlpha().raw().toBuffer();
    const pages = meta.pages ?? 1;
    return { frames, pages, delay: meta.delay ?? new Array(pages).fill(80) };
  })();
  animation.catch(() => (animation = null));
  return animation;
}

/** Runs a HUD draw call against a pixel grid instead of a canvas, so the server can rasterise it. */
function rasterise(draw: (ctx: CanvasRenderingContext2D) => void): (string | null)[] {
  const grid: (string | null)[] = new Array(W * H).fill(null);
  let fill = "#000";
  const ctx = {
    set fillStyle(v: string) {
      fill = v;
    },
    get fillStyle() {
      return fill;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      const x0 = Math.max(0, Math.floor(x));
      const y0 = Math.max(0, Math.floor(y));
      const x1 = Math.min(W, Math.floor(x + w));
      const y1 = Math.min(H, Math.floor(y + h));
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) grid[yy * W + xx] = fill;
    },
    clearRect() {},
  };
  draw(ctx as unknown as CanvasRenderingContext2D);
  return grid;
}

/** The painted pixels of a grid as flat [offset, r, g, b] quads, ready to stamp onto every frame. */
function toStamp(grid: (string | null)[]): Int32Array {
  const out: number[] = [];
  grid.forEach((c, i) => {
    if (!c) return;
    const n = parseInt(c.slice(1), 16);
    out.push(i * 4, (n >> 16) & 255, (n >> 8) & 255, n & 255);
  });
  return Int32Array.from(out);
}

function stamp(frames: Buffer, base: number, quads: Int32Array) {
  for (let i = 0; i < quads.length; i += 4) {
    const o = base + quads[i];
    frames[o] = quads[i + 1];
    frames[o + 1] = quads[i + 2];
    frames[o + 2] = quads[i + 3];
  }
}

/** Bakes the HUD into every frame and encodes one plain animated WebP, which browsers play natively. */
async function encode(stats: HudStats | null, status: HudStatus): Promise<Buffer> {
  const { frames: base, pages, delay } = await loadAnimation();
  const ticker = tickerLine(stats, status);
  const hud = toStamp(rasterise((ctx) => drawHudStats(ctx, W, H, stats, null)));
  const tick = toStamp(rasterise((ctx) => drawHudTicker(ctx, W, ticker.text)));

  const frames = Buffer.from(base);
  const size = W * H * 4;
  let t = 0;
  for (let f = 0; f < pages; f++) {
    stamp(frames, f * size, hud);
    if (!ticker.blinks || Math.floor(t / BLINK_HALF_MS) % 2 === 0) stamp(frames, f * size, tick);
    t += delay[f];
  }

  return sharp(frames, { raw: { width: W, height: H * pages, channels: 4, pageHeight: H }, limitInputPixels: false })
    .webp({ lossless: true, effort: 3, loop: 0, delay })
    .toBuffer();
}

export async function GET() {
  const result = await loadGithubStats().then(
    (stats) => ({ stats: stats as HudStats | null, status: "ready" as HudStatus }),
    () => ({ stats: null, status: "offline" as HudStatus }),
  );
  const { stats, status } = result;
  const key = JSON.stringify([status, stats?.currentStreak, stats?.longestStreak, stats?.lastYear, stats?.lastWeek, stats?.bestDay, stats?.todayCount]);
  if (!cached || cached.key !== key || Date.now() - cached.at > REVALIDATE * 1000) {
    cached = { key, at: Date.now(), bytes: encode(stats, status) };
    cached.bytes.catch(() => (cached = null));
  }
  const bytes = await cached.bytes;

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": `public, max-age=${REVALIDATE}, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE * 6}`,
    },
  });
}
