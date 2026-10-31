import { C, Gfx, wrap } from "./gfx";
import { drawPhoto, PhotoKind } from "./photos";
import type { Btn, Win } from "./popups";
import { BTN_H } from "./ui";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const LINE = 7;

export const footerY = (M: Rect) => M.y + M.h - BTN_H - 4;

export function footer(g: Gfx, M: Rect): void {
  g.fill(M.x, footerY(M), M.w, BTN_H + 4, C.face);
  g.fill(M.x, footerY(M), M.w, 1, C.shadow);
}

/** Footer buttons sit in a row from the left, clear of the floating radio in the bottom-right corner. */
export function footerRow(M: Rect, btns: Btn[]): Btn[] {
  let x = M.x + 3;
  for (let i = 0; i < btns.length; i++) {
    btns[i].x = x;
    btns[i].y = footerY(M) + 2;
    x += btns[i].w + 3;
  }
  return btns;
}

// ---- documents --------------------------------------------------------------

/** A paragraph (`\n` forces a line break), a coloured paragraph, or an inline photo with a caption. */
export type Block = string | { text: string; c: number } | { photo: PhotoKind; caption?: string };

interface PhotoRow {
  photo: PhotoKind;
  caption: string;
  w: number;
  h: number;
}

/** Laid-out lines: text, coloured text, the first row of a photo, or `null` for rows a photo spills into. */
export type Row = string | { s: string; c: number } | PhotoRow | null;

export function photoSize(w: number): { w: number; h: number } {
  const pw = Math.min(w, 200);
  return { w: pw, h: Math.max(30, Math.min(90, Math.round(pw * 0.5))) };
}

export function layoutDoc(blocks: Block[], w: number): Row[] {
  const rows: Row[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    if (b > 0) rows.push("");
    if (typeof block === "string" || "text" in block) {
      const text = typeof block === "string" ? block : block.text;
      const lines = text.toUpperCase().split("\n");
      for (let i = 0; i < lines.length; i++) {
        const wrapped = lines[i] ? wrap(lines[i], w) : [""];
        if (typeof block === "string") rows.push(...wrapped);
        else for (let k = 0; k < wrapped.length; k++) rows.push({ s: wrapped[k], c: block.c });
      }
      continue;
    }
    const size = photoSize(w);
    const caption = block.caption ?? "";
    const total = size.h + 2 + (caption ? wrap(caption, size.w).length * LINE : 0);
    rows.push({ photo: block.photo, caption, ...size });
    for (let i = 1; i < Math.ceil(total / LINE); i++) rows.push(null);
  }
  return rows;
}

// ---- scrolling ---------------------------------------------------------------

/** Width of the Win95 scrollbar drawn to the right of a scroll area. */
export const SB_W = 7;

/** A vertically scrolling viewport; the offset in native pixels lives in `win.s[key]`. */
export interface Scroll {
  area: Rect;
  content: number;
  key: string;
}

/** Splits a page rect into a viewport plus room for the scrollbar on its right. */
export const scrollArea = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w: w - SB_W - 1, h: Math.max(1, h) });

export const scrollMax = (s: Scroll) => Math.max(0, s.content - s.area.h);
export const scrollPos = (w: Win, s: Scroll) => Math.max(0, Math.min(scrollMax(s), Math.round(w.s[s.key] ?? 0)));

export function setScroll(w: Win, s: Scroll, v: number): boolean {
  const next = Math.max(0, Math.min(scrollMax(s), Math.round(v)));
  const changed = next !== scrollPos(w, s);
  w.s[s.key] = next;
  return changed;
}

/** Scrollbar parts: arrows, the track between them, and the thumb within it. */
export function scrollbar(s: Scroll, pos: number) {
  const x = s.area.x + s.area.w + 1;
  const trackY = s.area.y + SB_W;
  const trackH = Math.max(0, s.area.h - 2 * SB_W);
  const max = scrollMax(s);
  const thumbH = max ? Math.max(6, Math.min(trackH, Math.round((trackH * s.area.h) / s.content))) : trackH;
  const thumbY = trackY + (max ? Math.round(((trackH - thumbH) * pos) / max) : 0);
  return { x, y: s.area.y, h: s.area.h, trackY, trackH, thumbY, thumbH, max };
}

function arrow(g: Gfx, x: number, y: number, up: boolean, on: boolean): void {
  g.bevel(x, y, SB_W, SB_W);
  const c = on ? C.black : C.shadow;
  for (let i = 0; i < 2; i++) g.fill(x + 3 - i, y + (up ? 2 + i : 4 - i), 1 + 2 * i, 1, c);
}

export function drawScrollbar(g: Gfx, s: Scroll, pos: number): void {
  const B = scrollbar(s, pos);
  for (let y = B.trackY; y < B.trackY + B.trackH; y++) {
    for (let x = 0; x < SB_W; x++) g.px(B.x + x, y, (x + y) & 1 ? C.white : C.light);
  }
  arrow(g, B.x, B.y, true, B.max > 0 && pos > 0);
  arrow(g, B.x, B.y + B.h - SB_W, false, B.max > 0 && pos < B.max);
  if (B.max > 0 && B.trackH >= 6) g.bevel(B.x, B.thumbY, SB_W, B.thumbH);
}

/**
 * Runs `draw` inside the viewport with the origin scrolled by the current offset,
 * then draws the scrollbar. Content coordinates start at (0, 0).
 */
export function scrolled(g: Gfx, w: Win, s: Scroll, draw: (pos: number) => void): void {
  const pos = scrollPos(w, s);
  g.region(s.area.x, s.area.y, s.area.w, s.area.h, () => g.region(0, -pos, s.area.w, s.content + s.area.h, () => draw(pos)));
  drawScrollbar(g, s, pos);
}

/** Moves content-space buttons into page space, dropping or trimming whatever is scrolled out of view. */
export function scrolledButtons(w: Win, s: Scroll, btns: Btn[]): Btn[] {
  const pos = scrollPos(w, s);
  const out: Btn[] = [];
  const top = s.area.y;
  const bottom = s.area.y + s.area.h;
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    const y0 = Math.max(top, s.area.y + b.y - pos);
    const y1 = Math.min(bottom, s.area.y + b.y - pos + b.h);
    if (y1 <= y0) continue;
    out.push({ ...b, x: s.area.x + b.x, y: y0, h: y1 - y0, label: undefined });
  }
  return out;
}

/** A bevelled button drawn by the page itself, for buttons that live inside scrolling content. */
export function drawButton(g: Gfx, label: string, x: number, y: number, w: number, face = C.face, c = C.black): void {
  g.bevel(x, y, w, BTN_H, true, face);
  g.textC(label, x + w / 2, y + 3, c);
}

// ---- documents (laid-out text) -------------------------------------------------------

export const docHeight = (rows: Row[]) => rows.length * LINE;

/** Draws laid-out rows in content space, skipping rows outside [from, to). */
export function drawRows(g: Gfx, rows: Row[], w: number, c: number, t: number, from = 0, to = Infinity): void {
  let i0 = Math.max(0, Math.floor(from / LINE));
  while (i0 > 0 && rows[i0] === null) i0--;
  const i1 = Math.min(rows.length, Math.ceil(to / LINE) + 1);
  for (let i = i0; i < i1; i++) {
    const row = rows[i];
    const y = i * LINE;
    if (typeof row === "string") g.text(row, 0, y, c);
    else if (row && "s" in row) g.text(row.s, 0, y, row.c);
    else if (row) {
      const px = Math.round((w - row.w) / 2);
      drawPhoto(g, row.photo, px, y, row.w, row.h, t);
      const cap = row.caption ? wrap(row.caption, row.w) : [];
      for (let l = 0; l < cap.length; l++) g.text(cap[l], px, y + row.h + 2 + l * LINE, C.shadow);
    }
  }
}

/** A whole scrolling document: `rows` laid out at `area.w - 2` wide. */
export const docScroll = (rows: Row[], area: Rect): Scroll => ({ area, content: docHeight(rows) + 4, key: "sc" });

export function drawDoc(g: Gfx, w: Win, rows: Row[], s: Scroll, c: number, t: number): void {
  scrolled(g, w, s, (pos) => g.region(1, 2, s.area.w - 2, s.content, () => drawRows(g, rows, s.area.w - 2, c, t, pos - 2, pos + s.area.h)));
}
