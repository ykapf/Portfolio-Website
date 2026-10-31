import { forEachTextPixel, textWidth } from "../retro-racer/font";
import { pack, rgb } from "../retro-racer/pixels";

export const col = (r: number, g: number, b: number): number => pack(rgb(r, g, b));

/** Windows 95-ish system palette plus the ad colours. */
export const C = {
  black: col(0, 0, 0),
  white: col(255, 255, 255),
  face: col(192, 192, 192),
  light: col(223, 223, 223),
  shadow: col(128, 128, 128),
  dark: col(64, 64, 64),
  navy: col(0, 0, 128),
  blue: col(16, 70, 200),
  link: col(0, 0, 220),
  red: col(220, 30, 30),
  darkRed: col(150, 0, 0),
  yellow: col(255, 222, 40),
  gold: col(255, 170, 20),
  green: col(40, 190, 70),
  darkGreen: col(0, 110, 40),
  lime: col(90, 255, 90),
  pink: col(255, 146, 207),
  orange: col(255, 140, 0),
};

/** A pixel map: one string per row, one palette key per pixel ("." is transparent). */
export interface Sprite {
  rows: string[];
  pal: Record<string, number>;
}

export const charsFit = (w: number): number => Math.max(0, Math.floor((w + 1) / 4));

export function truncate(s: string, w: number): string {
  const n = charsFit(w);
  if (s.length <= n) return s;
  return n <= 2 ? s.slice(0, n) : `${s.slice(0, n - 2)}..`;
}

/** Greedy word wrap against the 3×5 font. */
export function wrap(s: string, w: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (line && textWidth(next) > w) {
      lines.push(line);
      line = words[i];
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Software raster over an ImageData buffer, with a translate + clip stack. */
export class Gfx {
  w = 0;
  h = 0;
  buf = new Uint32Array(0);
  private ox = 0;
  private oy = 0;
  private x0 = 0;
  private y0 = 0;
  private x1 = 0;
  private y1 = 0;
  private stack: number[][] = [];

  attach(buf: Uint32Array, w: number, h: number): void {
    this.buf = buf;
    this.w = w;
    this.h = h;
    this.ox = this.oy = this.x0 = this.y0 = 0;
    this.x1 = w;
    this.y1 = h;
    this.stack.length = 0;
  }

  /** Runs `draw` with the origin moved to (x, y) and drawing clipped to w×h. */
  region(x: number, y: number, w: number, h: number, draw: () => void): void {
    this.stack.push([this.ox, this.oy, this.x0, this.y0, this.x1, this.y1]);
    const ax = this.ox + Math.round(x);
    const ay = this.oy + Math.round(y);
    this.x0 = Math.max(this.x0, ax);
    this.y0 = Math.max(this.y0, ay);
    this.x1 = Math.min(this.x1, ax + Math.round(w));
    this.y1 = Math.min(this.y1, ay + Math.round(h));
    this.ox = ax;
    this.oy = ay;
    draw();
    const s = this.stack.pop() as number[];
    this.ox = s[0];
    this.oy = s[1];
    this.x0 = s[2];
    this.y0 = s[3];
    this.x1 = s[4];
    this.y1 = s[5];
  }

  fill(x: number, y: number, w: number, h: number, c: number): void {
    const ax = Math.round(x) + this.ox;
    const ay = Math.round(y) + this.oy;
    const sx = Math.max(this.x0, ax);
    const sy = Math.max(this.y0, ay);
    const ex = Math.min(this.x1, ax + Math.round(w));
    const ey = Math.min(this.y1, ay + Math.round(h));
    for (let py = sy; py < ey; py++) {
      const row = py * this.w;
      for (let px = sx; px < ex; px++) this.buf[row + px] = c;
    }
  }

  px(x: number, y: number, c: number): void {
    this.fill(x, y, 1, 1, c);
  }

  frame(x: number, y: number, w: number, h: number, c: number): void {
    this.fill(x, y, w, 1, c);
    this.fill(x, y + h - 1, w, 1, c);
    this.fill(x, y, 1, h, c);
    this.fill(x + w - 1, y, 1, h, c);
  }

  /** Two-pixel Windows 95 bevel; raised for buttons and windows, sunken for fields. */
  bevel(x: number, y: number, w: number, h: number, raised = true, face: number | null = C.face): void {
    if (face !== null) this.fill(x, y, w, h, face);
    const [o1, o2, i1, i2] = raised ? [C.white, C.black, C.light, C.shadow] : [C.shadow, C.white, C.black, C.light];
    this.fill(x, y, w - 1, 1, o1);
    this.fill(x, y, 1, h - 1, o1);
    this.fill(x, y + h - 1, w, 1, o2);
    this.fill(x + w - 1, y, 1, h, o2);
    this.fill(x + 1, y + 1, w - 3, 1, i1);
    this.fill(x + 1, y + 1, 1, h - 3, i1);
    this.fill(x + 1, y + h - 2, w - 2, 1, i2);
    this.fill(x + w - 2, y + 1, 1, h - 2, i2);
  }

  text(s: string, x: number, y: number, c: number, scale = 1): void {
    forEachTextPixel(s, (px, py) => this.fill(x + px * scale, y + py * scale, scale, scale, c));
  }

  /** Text horizontally centred on `cx`. */
  textC(s: string, cx: number, y: number, c: number, scale = 1): void {
    this.text(s, Math.round(cx - (textWidth(s) * scale) / 2), y, c, scale);
  }

  /** Text with a one-pixel outline in `o`, for legibility over busy backgrounds. */
  textO(s: string, x: number, y: number, c: number, o: number, scale = 1): void {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (dx || dy) this.text(s, x + dx, y + dy, o, scale);
    }
    this.text(s, x, y, c, scale);
  }

  textOC(s: string, cx: number, y: number, c: number, o: number, scale = 1): void {
    this.textO(s, Math.round(cx - (textWidth(s) * scale) / 2), y, c, o, scale);
  }

  disc(cx: number, cy: number, r: number, c: number): void {
    const rr = r * r + r * 0.6;
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rr - y * y)));
      this.fill(cx - half, cy + y, half * 2 + 1, 1, c);
    }
  }

  sprite(sp: Sprite, x: number, y: number, scale = 1): void {
    for (let r = 0; r < sp.rows.length; r++) {
      const row = sp.rows[r];
      for (let i = 0; i < row.length; i++) {
        const c = sp.pal[row[i]];
        if (c !== undefined) this.fill(x + i * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

export { textWidth };
