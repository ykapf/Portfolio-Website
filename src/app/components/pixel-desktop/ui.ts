import { C, Gfx, textWidth, truncate, wrap } from "./gfx";
import { TICKER } from "./news";
import type { Btn } from "./popups";

export const GITHUB_URL = "https://github.com/ykapf";
export const LINKEDIN_URL = "https://www.linkedin.com/in/yusuf-deniz-k-523a741b7/";

export const BTN_H = 11;

export function button(label: string, x: number, y: number, act: Btn["act"], minW = 0): Btn {
  return { x, y, w: Math.max(minW, textWidth(label) + 12), h: BTN_H, label, act };
}

export function bottomButton(label: string, bw: number, bh: number, act: Btn["act"]): Btn {
  const w = Math.max(36, textWidth(label) + 12);
  return { x: Math.round((bw - w) / 2), y: bh - BTN_H - 2, w, h: BTN_H, label, act };
}

export const blink = (t: number, hz: number) => Math.floor(t * hz) % 2 === 0;

/** Win95 segmented progress bar. */
export function progress(g: Gfx, x: number, y: number, w: number, f: number, c: number): void {
  g.bevel(x, y, w, 9, false, C.white);
  const n = Math.floor(((w - 4) * Math.max(0, Math.min(1, f))) / 4);
  for (let i = 0; i < n; i++) g.fill(x + 2 + i * 4, y + 2, 3, 5, c);
}

export const TICKER_H = 9;
const TICKER_LABEL = "BREAKING";

/** Scrolling news ticker; the font is fixed-width (4px per glyph), so only the visible slice is drawn. */
export function ticker(g: Gfx, x: number, y: number, w: number, t: number): void {
  const lw = textWidth(TICKER_LABEL) + 6;
  g.fill(x, y, w, TICKER_H, C.black);
  g.fill(x, y, lw, TICKER_H, blink(t, 1) ? C.red : C.darkRed);
  g.text(TICKER_LABEL, x + 3, y + 2, C.white);
  const span = TICKER.length * 4;
  const off = Math.floor(t * 22) % span;
  const first = Math.floor(off / 4);
  const n = Math.ceil((w - lw) / 4) + 2;
  const slice = (TICKER + TICKER).slice(first, first + n);
  g.region(x + lw + 2, y, w - lw - 2, TICKER_H, () => g.text(slice, -(off % 4), 2, C.yellow));
}

/** Wraps to at most `max` lines, marking a cut with "..". */
export function clampLines(s: string, w: number, max: number): string[] {
  const lines = wrap(s, w);
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  out[max - 1] = truncate(`${out[max - 1]} ${lines[max]}`, w);
  return out;
}
