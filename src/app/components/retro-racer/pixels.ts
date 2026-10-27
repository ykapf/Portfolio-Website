export type RGB = readonly [number, number, number];

export const rgb = (r: number, g: number, b: number): RGB => [r, g, b];

/** Packs a colour into the little-endian ABGR layout used by ImageData. */
export function pack(c: RGB, a = 255): number {
  return ((a << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const u = t < 0 ? 0 : t > 1 ? 1 : t;
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
  ];
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** 4×4 ordered-dither threshold in (0, 1). */
export function bayer(x: number, y: number): number {
  return (BAYER[((y & 3) << 2) | (x & 3)] + 0.5) / 16;
}

export function hash2(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tiny software raster used to author every sprite pixel by pixel. */
export class PixelGrid {
  readonly data: Uint32Array;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint32Array(w * h);
  }

  set(x: number, y: number, c: number): void {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return;
    this.data[yi * this.w + xi] = c;
  }

  get(x: number, y: number): number {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.w || yi >= this.h) return 0;
    return this.data[yi * this.w + xi];
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) this.data[py * this.w + px] = c;
    }
  }

  disc(cx: number, cy: number, r: number, c: number): void {
    const rr = r * r + r * 0.6;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= rr) this.set(x, y, c);
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
    const n = Math.max(1, Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c);
    }
  }

  /** Adds a 1px outline around the opaque silhouette. */
  outline(c: number): void {
    const src = this.data.slice();
    const { w, h } = this;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i] !== 0) continue;
        if (
          (x > 0 && src[i - 1] !== 0) ||
          (x < w - 1 && src[i + 1] !== 0) ||
          (y > 0 && src[i - w] !== 0) ||
          (y < h - 1 && src[i + w] !== 0)
        ) {
          this.data[i] = c;
        }
      }
    }
  }

  flipped(): PixelGrid {
    const out = new PixelGrid(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        out.data[y * this.w + (this.w - 1 - x)] = this.data[y * this.w + x];
      }
    }
    return out;
  }

  /** Atmospheric-perspective copy: every opaque pixel pulled toward `haze`. */
  tinted(haze: RGB, f: number): PixelGrid {
    const out = new PixelGrid(this.w, this.h);
    for (let i = 0; i < this.data.length; i++) {
      const c = this.data[i];
      const a = c >>> 24;
      if (a === 0) continue;
      const r = c & 255;
      const g = (c >>> 8) & 255;
      const b = (c >>> 16) & 255;
      out.data[i] = pack(
        [
          Math.round(r + (haze[0] - r) * f),
          Math.round(g + (haze[1] - g) * f),
          Math.round(b + (haze[2] - b) * f),
        ],
        a
      );
    }
    return out;
  }

  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext("2d");
    if (!ctx) return cv;
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}
