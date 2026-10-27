import { GLYPH_H, forEachTextPixel, textWidth } from "../font";
import { PixelGrid } from "../pixels";

export interface Canvas {
  g: PixelGrid;
  w: number;
  h: number;
  /** World height above ground → texel row. */
  Y: (world: number) => number;
  /** World length → texels. */
  X: (world: number) => number;
}

export function canvas(worldW: number, worldH: number, T: number): Canvas {
  const w = Math.max(2, Math.round(worldW / T));
  const h = Math.max(2, Math.round(worldH / T));
  return {
    g: new PixelGrid(w, h),
    w,
    h,
    Y: (world) => h - Math.round(world / T),
    X: (world) => Math.round(world / T),
  };
}

/** Fills a world-space box [x0, x1] × [y0, y1] (y measured up from the ground), at least one texel. */
export type Fill = (x0: number, y0: number, x1: number, y1: number, c: number) => void;

export function painter(cv: Canvas): Fill {
  const { g, X, Y } = cv;
  return (x0, y0, x1, y1, c) => {
    const px0 = X(x0);
    const px1 = Math.max(px0 + 1, X(x1));
    const py0 = Y(y1);
    const py1 = Math.max(py0 + 1, Y(y0));
    g.rect(px0, py0, px1 - px0, py1 - py0, c);
  };
}

/**
 * Sign text sized to fit a band. Facade texture u runs near → far, which is
 * right → left on screen, so facade text is mirrored.
 */
export function sign(
  g: PixelGrid,
  text: string,
  cx: number,
  top: number,
  bandH: number,
  maxW: number,
  c: number,
  mirror: boolean
): boolean {
  const tw = textWidth(text);
  const k = Math.min(Math.floor(bandH / (GLYPH_H + 2)), Math.floor(maxW / (tw + 2)));
  if (k < 1) return false;
  const x0 = Math.round(cx - (tw * k) / 2);
  const y0 = Math.round(top + (bandH - GLYPH_H * k) / 2);
  forEachTextPixel(text, (x, y) => g.rect(x0 + (mirror ? tw - 1 - x : x) * k, y0 + y * k, k, k, c));
  return true;
}

/** World-space text sign: fits `text` into the box, falling back to a neon bar when too small. */
export function worldSign(
  cv: Canvas,
  text: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  c: number,
  mirror: boolean
): void {
  const { g, X, Y } = cv;
  const top = Y(y1);
  const bandH = Y(y0) - top;
  if (!sign(g, text, (X(x0) + X(x1)) / 2, top, bandH, X(x1) - X(x0) - 2, c, mirror)) {
    g.rect(X(x0 + (x1 - x0) * 0.2), top + Math.floor(bandH / 2), Math.max(1, X((x1 - x0) * 0.6)), 1, c);
  }
}
