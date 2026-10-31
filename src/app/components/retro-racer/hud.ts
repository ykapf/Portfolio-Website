import { GLYPH_H, forEachTextPixel, textWidth } from "./font";

export interface HudStats {
  user: string;
  todayCount: number;
  currentStreak: number;
  longestStreak: number;
  lastYear: number;
  lastWeek: number;
  bestDay: number;
  recent: number[];
}

export type HudStatus = "loading" | "ready" | "offline";

export const OUTLINE = "#2a1040";
export const GOLD = ["#fff7c2", "#ffe36b", "#ffc53d", "#ff9b2f", "#ff6b35"];
export const CYAN = ["#e2fcff", "#a6f1ff", "#78ddff", "#78ddff", "#57bdf2"];
export const PINK = ["#ffe0f2", "#ffb6df", "#ff92cf", "#ff92cf", "#f272b8"];
export const METER_LIT = ["#7dff8a", "#7dff8a", "#d8ff6b", "#ffe36b", "#ff9b2f", "#ff4f6a"];
export const METER_OFF = "#46245f";
const REDLINE_OFF = "#6a1f45";
const REDLINE = 0.8;
const NEEDLE_TIP = "#ff4f6a";
const DIAL_R = 20;
const DIAL_FACE = "#1c0a30";
const DIAL_TICKS = 8;
const DIAL_START = (135 * Math.PI) / 180;
const DIAL_SWEEP = (270 * Math.PI) / 180;
export const MARGIN = 8;

type Align = "left" | "center" | "right";

/** Outlined bitmap text; `ramp` colours each of the 5 glyph rows top to bottom. */
export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  scale: number,
  ramp: string[],
  align: Align = "left",
): number {
  const w = textWidth(str) * scale;
  const left = align === "left" ? x : align === "right" ? x - w : Math.round(x - w / 2);
  ctx.fillStyle = OUTLINE;
  forEachTextPixel(str, (px, py) => ctx.fillRect(left + px * scale - 1, y + py * scale - 1, scale + 2, scale + 2));
  forEachTextPixel(str, (px, py) => {
    ctx.fillStyle = ramp[py];
    ctx.fillRect(left + px * scale, y + py * scale, scale, scale);
  });
  return w;
}

/** Position (0–1) along the dial's 270° arc, or null in the open gap at the bottom. */
function arcFrac(x: number, y: number): number | null {
  let rel = Math.atan2(y, x) - DIAL_START;
  rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const f = rel / DIAL_SWEEP;
  return f <= 1 ? f : null;
}

/** Round rev counter: a segmented arc lit up to `revs`, a needle, and a redline. */
function dial(ctx: CanvasRenderingContext2D, cx: number, cy: number, revs: number) {
  const R = DIAL_R;
  const bandMid = R - 4;
  for (let y = -R - 2; y <= R + 1; y++) {
    for (let x = -R - 2; x <= R + 1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d = Math.hypot(px, py);
      if (d > R + 1.5) continue;
      let colour = DIAL_FACE;
      if (d > R) colour = OUTLINE;
      else if (d > R - 1.5) colour = PINK[2];
      else if (d > R - 2.5) colour = DIAL_FACE;
      else if (d > R - 6) {
        const f = arcFrac(px, py);
        if (f !== null) {
          const tick = f * DIAL_TICKS;
          const gap = Math.abs(tick - Math.round(tick)) * ((bandMid * DIAL_SWEEP) / DIAL_TICKS) * (d / bandMid);
          if (gap >= 0.7) {
            if (f <= revs) colour = METER_LIT[Math.min(METER_LIT.length - 1, Math.floor(f * METER_LIT.length))];
            else colour = f >= REDLINE ? REDLINE_OFF : METER_OFF;
          }
        }
      }
      ctx.fillStyle = colour;
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }

  text(ctx, "RPM", cx, cy + 7, 1, CYAN, "center");

  const a = DIAL_START + revs * DIAL_SWEEP;
  const len = R - 6;
  const points: [number, number][] = [];
  for (let t = 0; t <= len; t += 0.5) {
    points.push([Math.floor(cx + Math.cos(a) * t), Math.floor(cy + Math.sin(a) * t)]);
  }
  ctx.fillStyle = OUTLINE;
  points.forEach(([x, y]) => ctx.fillRect(x - 1, y - 1, 3, 3));
  points.forEach(([x, y], i) => {
    ctx.fillStyle = i >= points.length - 5 ? NEEDLE_TIP : GOLD[0];
    ctx.fillRect(x, y, 1, 1);
  });
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(cx - 2, cy - 2, 5, 5);
  ctx.fillStyle = PINK[1];
  ctx.fillRect(cx - 1, cy - 1, 3, 3);
}

const PLAYER_LABEL = "1P YKAPF";

const num = (n: number | undefined) => (n === undefined ? "--" : String(n));

/** The flashing line under the score, and whether it should blink. */
export function tickerLine(stats: HudStats | null, status: HudStatus): { text: string; blinks: boolean } {
  const s = stats ?? undefined;
  const ticker =
    status === "offline" ? "OFFLINE" : status === "loading" ? "LOADING" : s && s.todayCount > 0 ? `TODAY +${s.todayCount}` : "INSERT COMMIT";
  return { text: ticker, blinks: status !== "ready" || !s || s.todayCount === 0 };
}

function tickerText(stats: HudStats | null, status: HudStatus, blinkOn: boolean): string | null {
  const { text: ticker, blinks } = tickerLine(stats, status);
  return !blinks || blinkOn ? ticker : null;
}

/** Rev counter only; `bottom` is the lowest pixel row it may use. */
export function drawRevDial(ctx: CanvasRenderingContext2D, left: number, bottom: number, revs: number) {
  dial(ctx, left + DIAL_R + 2, bottom - DIAL_R - 2, revs);
}

/** "This week" readout that sits to the right of the rev counter. */
function weekReadout(ctx: CanvasRenderingContext2D, left: number, bottom: number, s: HudStats | undefined) {
  const tx = left + DIAL_R * 2 + 8;
  text(ctx, "THIS WEEK", tx, bottom - 21, 1, CYAN);
  const weekW = text(ctx, num(s?.lastWeek), tx, bottom - 10, 2, GOLD);
  text(ctx, "COMMITS", tx + weekW + 4, bottom - GLYPH_H, 1, PINK);
}

/** Rev counter with "this week" beside it; `bottom` is the lowest pixel row it may use. */
function revBlock(ctx: CanvasRenderingContext2D, left: number, bottom: number, revs: number, s: HudStats | undefined) {
  drawRevDial(ctx, left, bottom, revs);
  weekReadout(ctx, left, bottom, s);
}

/** Native height of the portrait stats panel that sits above the scene. */
export const MOBILE_TOP_H = 64;
/** Native height of the portrait rev-counter panel that sits below the scene. */
export const MOBILE_BOTTOM_H = DIAL_R * 2 + 8;

/** Portrait layout, top panel: player, score, streaks and best day stacked above the scene. */
export function drawHudMobileTop(
  ctx: CanvasRenderingContext2D,
  w: number,
  stats: HudStats | null,
  status: HudStatus,
  blinkOn: boolean,
) {
  ctx.clearRect(0, 0, w, MOBILE_TOP_H);
  const m = 4;
  const s = stats ?? undefined;
  const cx = Math.round(w / 2);
  const r = w - m;

  text(ctx, PLAYER_LABEL, m, m, 1, PINK);
  text(ctx, `BEST DAY ${num(s?.bestDay)}`, r, m, 1, PINK, "right");

  text(ctx, "SCORE", cx, m + 12, 1, CYAN, "center");
  text(ctx, num(s?.lastYear), cx, m + 20, 3, GOLD, "center");
  text(ctx, "COMMITS IN 365 DAYS", cx, m + 39, 1, PINK, "center");
  const ticker = tickerText(stats, status, blinkOn);
  if (ticker) text(ctx, ticker, cx, m + 49, 1, GOLD, "center");

  text(ctx, "STREAK", m, m + 18, 1, CYAN);
  const streakW = text(ctx, num(s?.currentStreak), m, m + 26, 2, GOLD);
  text(ctx, "DAYS", m + streakW + 3, m + 26 + GLYPH_H, 1, PINK);

  text(ctx, "HI-STREAK", r, m + 18, 1, CYAN, "right");
  const daysW = text(ctx, "DAYS", r, m + 26 + GLYPH_H, 1, PINK, "right");
  text(ctx, num(s?.longestStreak), r - daysW - 3, m + 26, 2, GOLD, "right");
}

/** Portrait layout, bottom panel: the rev counter and this week's commits below the scene. */
export function drawHudMobileBottom(ctx: CanvasRenderingContext2D, w: number, stats: HudStats | null, revs: number) {
  ctx.clearRect(0, 0, w, MOBILE_BOTTOM_H);
  revBlock(ctx, 4, MOBILE_BOTTOM_H - 3, revs, stats ?? undefined);
}

/** Draws the GitHub HUD into a canvas of `w`×`h` native pixels. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stats: HudStats | null,
  status: HudStatus,
  blinkOn: boolean,
  revs: number,
) {
  ctx.clearRect(0, 0, w, h);
  drawHudStats(ctx, w, h, stats, tickerText(stats, status, blinkOn));
  drawRevDial(ctx, MARGIN, h - MARGIN, revs);
}

/** Desktop ticker position, so the README card can draw it as its own blinking layer. */
export function drawHudTicker(ctx: CanvasRenderingContext2D, w: number, ticker: string) {
  text(ctx, ticker, Math.round(w / 2), MARGIN + 37, 1, GOLD, "center");
}

/** Every desktop HUD element except the rev counter; `ticker` is the line under the score, if shown. */
export function drawHudStats(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  stats: HudStats | null,
  ticker: string | null,
) {
  const m = MARGIN;
  const s = stats ?? undefined;

  // Top left: current streak sits where the countdown timer would.
  text(ctx, PLAYER_LABEL, m, m, 1, PINK);
  text(ctx, "STREAK", m, m + 10, 1, CYAN);
  const streakW = text(ctx, num(s?.currentStreak), m, m + 18, 2, GOLD);
  text(ctx, "DAYS", m + streakW + 4, m + 18 + GLYPH_H, 1, PINK);

  // Top centre: commits in the last year is the score.
  const cx = Math.round(w / 2);
  text(ctx, "SCORE", cx, m, 1, CYAN, "center");
  text(ctx, num(s?.lastYear), cx, m + 8, 3, GOLD, "center");
  text(ctx, "COMMITS IN 365 DAYS", cx, m + 27, 1, PINK, "center");
  if (ticker) drawHudTicker(ctx, w, ticker);

  // Top right: the longest streak ever is the high score.
  const r = w - m;
  text(ctx, `BEST DAY ${num(s?.bestDay)}`, r, m, 1, PINK, "right");
  text(ctx, "HI-STREAK", r, m + 10, 1, CYAN, "right");
  const daysW = text(ctx, "DAYS", r, m + 18 + GLYPH_H, 1, PINK, "right");
  text(ctx, num(s?.longestStreak), r - daysW - 4, m + 18, 2, GOLD, "right");

  // Bottom left: commits this week, beside the car's rev counter.
  weekReadout(ctx, m, h - m, s);
}
