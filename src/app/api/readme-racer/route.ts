import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { H, W } from "../../components/retro-racer/config";
import { HudStats, HudStatus, drawHudStats, drawHudTicker, tickerLine } from "../../components/retro-racer/hud";
import { REVALIDATE, loadGithubStats } from "../github-stats/stats";

export const dynamic = "force-dynamic";

const SCALE = 2;
const BLINK_S = 1.06;

let animation: Promise<string> | null = null;

/** The pre-rendered scene from `npm run render:readme`, as a data URI. */
function loadAnimation(): Promise<string> {
  animation ??= readFile(join(process.cwd(), "public/readme/racer.webp")).then(
    (b) => `data:image/webp;base64,${b.toString("base64")}`,
  );
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

/** One `<path>` per colour, built from horizontal runs of same-coloured pixels. */
function gridToSvg(grid: (string | null)[]): string {
  const runs = new Map<string, string[]>();
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = grid[y * W + x];
      let end = x + 1;
      while (end < W && grid[y * W + end] === c) end++;
      if (c) {
        const list = runs.get(c) ?? [];
        list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
        runs.set(c, list);
      }
      x = end;
    }
  }
  let out = "";
  runs.forEach((d, c) => (out += `<path fill="${c}" d="${d.join("")}"/>`));
  return out;
}

export async function GET() {
  const [src, result] = await Promise.all([
    loadAnimation(),
    loadGithubStats().then(
      (stats) => ({ stats: stats as HudStats | null, status: "ready" as HudStatus }),
      () => ({ stats: null, status: "offline" as HudStatus }),
    ),
  ]);
  const { stats, status } = result;
  const ticker = tickerLine(stats, status);
  const hud = gridToSvg(rasterise((ctx) => drawHudStats(ctx, W, H, stats, null)));
  const tick = gridToSvg(rasterise((ctx) => drawHudTicker(ctx, W, ticker.text)));
  const blink = ticker.blinks
    ? `<animate attributeName="opacity" values="1;0" keyTimes="0;0.5" dur="${BLINK_S}s" calcMode="discrete" repeatCount="indefinite"/>`
    : "";
  const summary = stats
    ? `GitHub stats for ${stats.user}: ${stats.currentStreak} day streak, ${stats.longestStreak} day best streak, ${stats.lastYear} contributions in the last year, ${stats.lastWeek} this week.`
    : "GitHub stats unavailable.";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img">` +
    `<title>Pixel-art Ferrari F40 driving down a Miami coastal highway at sunset. ${summary}</title>` +
    `<image width="${W}" height="${H}" preserveAspectRatio="none" style="image-rendering:crisp-edges;image-rendering:pixelated" href="${src}"/>` +
    `<g>${hud}</g><g>${blink}${tick}</g></svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${REVALIDATE}, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE * 6}`,
    },
  });
}
