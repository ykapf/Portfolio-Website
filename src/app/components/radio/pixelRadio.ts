import { CYAN, GOLD, METER_LIT, METER_OFF, OUTLINE, PINK, text } from "../retro-racer/hud";
import { textWidth } from "../retro-racer/font";

/**
 * Layout of the floating radio in native pixels. The pixel skin draws at 1:1
 * and the smooth skin multiplies by the same pixel size, so every readout and
 * button sits in the same place in both.
 */
export const RADIO_W = 124;
export const RADIO_H = 34;
export const BOX = {
  icon: { x: 4, y: 4, w: 26, h: 26 },
  label: { x: 34, y: 5, w: 44, h: 5 },
  eq: { x: 89, y: 4, w: 11, h: 6 },
  title: { x: 34, y: 13, w: 66, h: 5 },
  station: { x: 34, y: 21, w: 66, h: 5 },
  progress: { x: 34, y: 28, w: 66, h: 2 },
  mute: { x: 104, y: 9, w: 16, h: 16 },
};
/** Vertical volume panel that pops up above the mute button, in the same native pixels. */
export const VOL = { x: 102, w: 20, h: 60, gap: 2 };
export const VOL_TRACK = { x: 8, y: 13, w: 4, h: 40 };
export const EQ_BARS = 4;
/** Title marquee speed in native pixels per second. */
export const MARQUEE_SPEED = 14;
export const MARQUEE_GAP = 16;

const FACE = "#1c0a30";
const FACE_HI = "#2e1450";

const SPEAKER_ON = [
  "...#.......",
  "..##....#..",
  "####.#...#.",
  "####..#..#.",
  "####..#..#.",
  "####..#..#.",
  "####.#...#.",
  "..##....#..",
  "...#.......",
];
const SPEAKER_OFF = [
  "...#.......",
  "..##.......",
  "####.#...#.",
  "####..#.#..",
  "####...#...",
  "####..#.#..",
  "####.#...#.",
  "..##.......",
  "...#.......",
];

/** Bar heights (0–1) for the little equaliser; flat when nothing is audible. */
export function eqLevels(t: number, live: boolean): number[] {
  const out: number[] = [];
  const step = Math.floor(t * 8);
  for (let i = 0; i < EQ_BARS; i++) {
    if (!live) {
      out.push(0);
      continue;
    }
    const v = Math.sin(step * (1.7 + i * 0.9) + i * 2.3) * 0.5 + Math.sin(step * 0.61 + i) * 0.5;
    out.push(0.25 + 0.75 * Math.abs(v));
  }
  return out;
}

export function marqueeOffset(t: number, contentW: number, boxW: number): number {
  if (contentW <= boxW) return 0;
  return (t * MARQUEE_SPEED) % (contentW + MARQUEE_GAP);
}

/** Downscales the station logo to the icon box with hard-edged alpha. */
export function pixelateIcon(img: HTMLImageElement): HTMLCanvasElement | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const { w, h } = BOX.icon;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const s = Math.min(w / img.naturalWidth, h / img.naturalHeight);
  const dw = Math.round(img.naturalWidth * s);
  const dh = Math.round(img.naturalHeight * s);
  const dx = Math.floor((w - dw) / 2);
  const dy = Math.floor((h - dh) / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, dw, dh);
  // Safari can refuse pixel readback (InvalidStateError); fall back to a nearest-neighbour draw.
  try {
    const data = ctx.getImageData(0, 0, w, h);
    for (let i = 3; i < data.data.length; i += 4) data.data[i] = data.data[i] < 110 ? 0 : 255;
    ctx.putImageData(data, 0, 0);
  } catch {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, dx, dy, dw, dh);
  }
  return c;
}

export interface PixelRadioState {
  t: number;
  title: string;
  station: string;
  progress: number;
  muted: boolean;
  live: boolean;
  muteHover: boolean;
  icon: HTMLCanvasElement | null;
}

function rect(ctx: CanvasRenderingContext2D, colour: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w, h);
}

export function drawPixelVolume(ctx: CanvasRenderingContext2D, volume: number, active: boolean) {
  const W = VOL.w;
  const H = VOL.h;
  ctx.clearRect(0, 0, W, H);
  rect(ctx, OUTLINE, 0, 0, W, H);
  rect(ctx, PINK[2], 1, 1, W - 2, H - 2);
  rect(ctx, FACE, 2, 2, W - 4, H - 4);
  rect(ctx, FACE_HI, 2, 2, W - 4, 1);

  text(ctx, String(volume), Math.floor(W / 2), 4, 1, GOLD, "center");

  const tr = VOL_TRACK;
  rect(ctx, OUTLINE, tr.x - 1, tr.y - 1, tr.w + 2, tr.h + 2);
  rect(ctx, METER_OFF, tr.x, tr.y, tr.w, tr.h);
  const filled = Math.round((volume / 100) * tr.h);
  for (let i = 0; i < filled; i++) {
    const colour = METER_LIT[Math.min(METER_LIT.length - 1, Math.floor((i / tr.h) * METER_LIT.length))];
    rect(ctx, colour, tr.x, tr.y + tr.h - 1 - i, tr.w, 1);
  }

  const ky = tr.y + tr.h - filled;
  rect(ctx, OUTLINE, tr.x - 3, ky - 2, tr.w + 6, 5);
  rect(ctx, active ? GOLD[0] : PINK[1], tr.x - 2, ky - 1, tr.w + 4, 3);
  rect(ctx, active ? GOLD[2] : PINK[4], tr.x - 2, ky + 1, tr.w + 4, 1);
}

export function drawPixelRadio(ctx: CanvasRenderingContext2D, s: PixelRadioState) {
  const W = RADIO_W;
  const H = RADIO_H;
  ctx.clearRect(0, 0, W, H);
  rect(ctx, OUTLINE, 0, 0, W, H);
  rect(ctx, PINK[2], 1, 1, W - 2, H - 2);
  rect(ctx, FACE, 2, 2, W - 4, H - 4);
  rect(ctx, FACE_HI, 2, 2, W - 4, 1);

  const ic = BOX.icon;
  rect(ctx, OUTLINE, ic.x - 1, ic.y - 1, ic.w + 2, ic.h + 2);
  rect(ctx, "#f4e9ff", ic.x, ic.y, ic.w, ic.h);
  if (s.icon) ctx.drawImage(s.icon, ic.x, ic.y);

  text(ctx, "NOW PLAYING", BOX.label.x, BOX.label.y, 1, PINK);

  const eq = BOX.eq;
  eqLevels(s.t, s.live).forEach((lvl, i) => {
    const h = Math.max(1, Math.round(lvl * eq.h));
    const x = eq.x + i * 3;
    rect(ctx, METER_OFF, x, eq.y, 2, eq.h);
    rect(ctx, s.live ? METER_LIT[Math.min(METER_LIT.length - 1, h - 1)] : PINK[4], x, eq.y + eq.h - h, 2, h);
  });

  const tb = BOX.title;
  const title = s.title.toUpperCase();
  const tw = textWidth(title);
  const off = marqueeOffset(s.t, tw, tb.w);
  ctx.save();
  ctx.beginPath();
  ctx.rect(tb.x - 1, tb.y - 1, tb.w + 2, tb.h + 2);
  ctx.clip();
  const x0 = tb.x - Math.floor(off);
  text(ctx, title, x0, tb.y, 1, GOLD);
  if (tw > tb.w) text(ctx, title, x0 + tw + MARQUEE_GAP, tb.y, 1, GOLD);
  ctx.restore();

  text(ctx, s.station.toUpperCase(), BOX.station.x, BOX.station.y, 1, CYAN);

  const pb = BOX.progress;
  rect(ctx, METER_OFF, pb.x, pb.y, pb.w, pb.h);
  const filled = Math.round(Math.max(0, Math.min(1, s.progress)) * pb.w);
  rect(ctx, GOLD[2], pb.x, pb.y, filled, pb.h);
  if (filled > 0) rect(ctx, GOLD[0], pb.x + filled - 1, pb.y, 1, pb.h);

  const mb = BOX.mute;
  rect(ctx, OUTLINE, mb.x, mb.y, mb.w, mb.h);
  rect(ctx, s.muteHover ? GOLD[1] : PINK[2], mb.x + 1, mb.y + 1, mb.w - 2, mb.h - 2);
  rect(ctx, s.muteHover ? GOLD[3] : PINK[4], mb.x + 1, mb.y + mb.h - 2, mb.w - 2, 1);
  const icon = s.muted ? SPEAKER_OFF : SPEAKER_ON;
  const ix = mb.x + Math.floor((mb.w - icon[0].length) / 2);
  const iy = mb.y + Math.floor((mb.h - icon.length) / 2);
  ctx.fillStyle = OUTLINE;
  icon.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === "#") ctx.fillRect(ix + x, iy + y, 1, 1);
  });
}
