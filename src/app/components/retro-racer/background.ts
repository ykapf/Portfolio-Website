import { FAR_PAD, HORIZON, NEAR_PAD, SKY_PAD, W } from "./config";
import { PixelGrid, RGB, hash2, mix, pack, rgb, rng } from "./pixels";

export interface Backdrop {
  sky: HTMLCanvasElement;
  far: HTMLCanvasElement;
  near: HTMLCanvasElement;
}

type Stop = readonly [number, RGB];

/** Purple overhead, through raspberry and coral pink, to warm orange at the horizon. */
const SKY_STOPS: readonly Stop[] = [
  [0, rgb(62, 40, 104)],
  [0.25, rgb(112, 56, 128)],
  [0.5, rgb(196, 82, 132)],
  [0.72, rgb(232, 112, 128)],
  [0.88, rgb(246, 146, 122)],
  [1, rgb(252, 182, 128)],
];

const SUN = rgb(255, 206, 118);

const SKY_BANDS = 5;
const GLOW = rgb(255, 196, 140);
const STAR = rgb(255, 238, 248);
const HAZE = rgb(232, 168, 176);

function lerpStops(stops: readonly Stop[], t: number): RGB {
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, a] = stops[i];
    const [t1, b] = stops[i + 1];
    if (t <= t1) return mix(a, b, (t - t0) / (t1 - t0));
  }
  return stops[stops.length - 1][1];
}

interface Cloud {
  x: number;
  y: number;
  len: number;
  th: number;
  lit: boolean;
}

const CLOUDS: readonly Cloud[] = [
  { x: 70, y: 22, len: 150, th: 5, lit: false },
  { x: 320, y: 15, len: 190, th: 6, lit: false },
  { x: 200, y: 40, len: 120, th: 4, lit: false },
  { x: 440, y: 50, len: 110, th: 4, lit: false },
  { x: 30, y: 62, len: 90, th: 3, lit: false },
  { x: 350, y: 68, len: 130, th: 4, lit: false },
  { x: 150, y: 86, len: 230, th: 2, lit: true },
  { x: 300, y: 96, len: 170, th: 2, lit: true },
  { x: 60, y: 101, len: 110, th: 2, lit: true },
  { x: 400, y: 82, len: 120, th: 3, lit: true },
];

function drawCloud(g: PixelGrid, c: Cloud, ox: number): void {
  const body = c.lit ? rgb(255, 184, 164) : rgb(126, 76, 146);
  const top = c.lit ? rgb(240, 140, 148) : rgb(100, 64, 134);
  const under = c.lit ? rgb(255, 222, 190) : rgb(228, 140, 164);
  const underDeep = rgb(174, 102, 154);
  for (let j = 0; j < c.th; j++) {
    const v = (j + 0.5 - c.th / 2) / (c.th / 2);
    const half = (c.len / 2) * (0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - v * v)));
    const shift = (hash2(j, Math.round(c.x)) - 0.5) * c.len * 0.16;
    const x0 = Math.round(c.x + ox + shift - half);
    const x1 = Math.round(c.x + ox + shift + half);
    let col = j === 0 ? top : body;
    if (j === c.th - 1) col = under;
    else if (!c.lit && j === c.th - 2) col = underDeep;
    for (let x = x0; x <= x1; x++) {
      g.set(x, c.y + j, pack(col));
    }
  }
}

/**
 * Band boundaries as parabolas around the sun's column: the top one is flat,
 * each lower one bends a little more. Curvature and height both grow downward,
 * so neighbouring boundaries never cross.
 */
const BAND_EDGES = Array.from({ length: SKY_BANDS - 1 }, (_, i) => {
  const f = (i + 1) / SKY_BANDS;
  return { y: Math.round(f * (HORIZON + 6)), k: Math.pow(f, 1.8) / 2400, seed: 41 + i * 13 };
});

/**
 * Ragged band edge: the boundary steps up and down by a pixel or two in runs
 * several pixels long, so neighbouring colours bleed into each other.
 */
function edgeY(e: (typeof BAND_EDGES)[number], x: number, dx: number): number {
  const jitter = Math.round((noise1(x / 18, e.seed) - 0.5) * 4 + (noise1(x / 58, e.seed + 5) - 0.5) * 3);
  return e.y + e.k * dx * dx + jitter;
}

/**
 * Glow rings: concentric with the sun, each wider and flatter than the one
 * inside it. `wobble` is how far the edge wanders as a fraction of its radius,
 * so the light breaks up more the further it spreads from the sun.
 */
const GLOW_RINGS = [
  { grow: 6, flat: 1.2, a: 0.42, wobble: 0.05, seed: 61 },
  { grow: 14, flat: 1.5, a: 0.24, wobble: 0.12, seed: 67 },
  { grow: 24, flat: 1.85, a: 0.1, wobble: 0.22, seed: 71 },
] as const;

function buildSky(): PixelGrid {
  const g = new PixelGrid(W + SKY_PAD * 2, HORIZON + 1);
  const sunX = g.w / 2;
  const sunR = 35;
  const sunY = HORIZON - 7;

  const colourAt = (band: number, x: number, y: number): RGB => {
    const c = lerpStops(SKY_STOPS, (band + 0.5) / SKY_BANDS);
    const dx = x - sunX;
    const dy = y - sunY;
    for (const ring of GLOW_RINGS) {
      const ry = sunR + ring.grow;
      const rx = ry * ring.flat;
      const a = Math.atan2(dy / ry, dx / rx) + Math.PI;
      const n = (noise1(a * 5, ring.seed) - 0.5) * 0.7 + (noise1(a * 13, ring.seed + 3) - 0.5) * 0.3;
      const reach = 1 + ring.wobble * 2 * n;
      if ((dx / rx) ** 2 + (dy / ry) ** 2 <= reach * reach) return mix(c, GLOW, ring.a);
    }
    return c;
  };

  for (let x = 0; x < g.w; x++) {
    const dx = x - sunX;
    const edges = BAND_EDGES.map((e) => edgeY(e, x, dx));
    for (let y = 0; y <= HORIZON; y++) {
      let band = 0;
      for (const ey of edges) if (y >= ey) band++;
      g.set(x, y, pack(colourAt(band, x, y)));
    }
  }

  // Thin wisps of each band's colour trailing a few pixels into its neighbour.
  const r = rng(77);
  BAND_EDGES.forEach((e, i) => {
    for (let n = 0; n < 9; n++) {
      const x0 = Math.floor(r() * g.w);
      const len = 6 + Math.floor(r() * 22);
      const up = r() < 0.5;
      const dy = (up ? -1 : 1) * (2 + Math.floor(r() * 2));
      const band = up ? i + 1 : i;
      for (let x = x0; x < Math.min(g.w, x0 + len); x++) {
        const y = Math.round(e.y + e.k * (x - sunX) ** 2) + dy;
        if (y < 0 || y > HORIZON) continue;
        g.set(x, y, pack(colourAt(band, x, y)));
      }
    }
  });

  // A handful of early stars in the dark upper sky.
  const stars: readonly (readonly [number, number, boolean])[] = [
    [34, 9, true], [96, 26, false], [151, 6, false], [212, 18, false], [286, 31, false],
    [330, 8, true], [389, 22, false], [446, 12, false],
  ];
  for (const [sx, sy, big] of stars) {
    const x = sx + SKY_PAD;
    g.set(x, sy, pack(STAR));
    if (big) {
      const dim = pack(mix(STAR, SKY_STOPS[0][1], 0.55));
      g.set(x - 1, sy, dim);
      g.set(x + 1, sy, dim);
      g.set(x, sy - 1, dim);
      g.set(x, sy + 1, dim);
    }
  }

  for (let i = 0; i < 6; i++) drawCloud(g, CLOUDS[i], SKY_PAD);

  const sunColour = pack(SUN);
  for (let y = sunY - sunR; y <= HORIZON; y++) {
    for (let x = Math.floor(sunX - sunR); x <= Math.ceil(sunX + sunR); x++) {
      const dx = x - sunX;
      const dy = y - sunY;
      const edge = sunR + (noise1((Math.atan2(dy, dx) + Math.PI) * 4, 83) - 0.5) * 1.6;
      if (dx * dx + dy * dy > edge * edge + sunR * 0.6) continue;
      g.set(x, y, sunColour);
    }
  }

  for (let i = 6; i < CLOUDS.length; i++) drawCloud(g, CLOUDS[i], SKY_PAD);
  return g;
}

function tower(
  g: PixelGrid,
  x0: number,
  tw: number,
  th: number,
  base: RGB,
  r: () => number
): void {
  const shade = mix(base, rgb(70, 50, 130), 0.35);
  const cap = mix(base, rgb(255, 230, 240), 0.35);
  const win = mix(base, rgb(236, 222, 250), 0.45);
  const lit = rgb(255, 222, 170);
  const top = HORIZON - th;
  for (let y = top; y <= HORIZON; y++) {
    for (let x = x0; x < x0 + tw; x++) {
      let c = x >= x0 + tw * 0.7 ? shade : base;
      if (y === top) c = cap;
      else if ((x - x0) % 2 === 1 && (y - top) % 3 === 1 && x < x0 + tw - 1 && y < HORIZON - 2) {
        c = hash2(x, y) < 0.16 ? lit : x >= x0 + tw * 0.7 ? base : win;
      }
      const haze = (y - (HORIZON - 5)) / 5;
      if (haze > 0) c = mix(c, HAZE, haze * 0.7);
      g.set(x, y, pack(c));
    }
  }
  if (tw >= 9 && r() < 0.5) {
    const ax = x0 + Math.floor(tw / 2);
    for (let y = top - 1 - Math.floor(r() * 5); y < top; y++) g.set(ax, y, pack(shade));
  }
}

interface RangeStyle {
  rim: RGB;
  lit: RGB;
  mid: RGB;
  shade: RGB;
  haze: number;
}

interface Ridge {
  seed: number;
  /** Height at the outer edges; the valley the sun sets into is flat. */
  maxH: number;
  /** Height multiplier for the range right of the sun. */
  rightScale: number;
  /** Wavelength of the broadest undulation, in pixels. */
  wave: number;
}

/** Smooth 1D value noise, cosine-eased between hashed lattice points so every top is rounded. */
function noise1(x: number, seed: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = (1 - Math.cos(f * Math.PI)) / 2;
  const a = hash2(i, seed);
  return a + (hash2(i + 1, seed) - a) * u;
}

function ridgeHeights(w: number, r: Ridge, sunX: number): Float32Array {
  const h = new Float32Array(w);
  for (let x = 0; x < w; x++) {
    const n =
      noise1(x / r.wave, r.seed) * 0.55 +
      noise1(x / (r.wave * 0.45), r.seed + 11) * 0.33 +
      noise1(x / (r.wave * 0.2), r.seed + 23) * 0.12;
    // Nothing in the valley behind the sun; the right side stays low behind the city.
    const t = Math.min(1, Math.max(0, (Math.abs(x - sunX) - 95) / 150));
    const side = x < sunX ? 1 : r.rightScale;
    h[x] = r.maxH * side * t * t * (3 - 2 * t) * (0.25 + 1.05 * n);
  }
  return h;
}

/**
 * Rolling hills along a smooth noise ridgeline. Each pixel is toned by whether
 * the slope above it faces the low sun; the slope is sampled further along the
 * ridge the deeper the pixel sits, so light and shadow faces run down the hill
 * at an angle instead of splitting it with a vertical seam.
 */
function hillRange(g: PixelGrid, ridge: Ridge, style: RangeStyle, sunX: number): void {
  const h = ridgeHeights(g.w, ridge, sunX);
  const slope = (x: number) => {
    const a = h[Math.max(0, x - 2)];
    const b = h[Math.min(g.w - 1, x + 2)];
    return (b - a) / 4;
  };
  for (let x = 0; x < g.w; x++) {
    if (h[x] < 1) continue;
    const top = Math.round(HORIZON - h[x]);
    const sunward = x < sunX ? 1 : -1;
    for (let y = top; y <= HORIZON; y++) {
      const k = y - top;
      const xs = Math.min(g.w - 1, Math.max(0, x + Math.round(k * 0.7) * sunward));
      const facing = -slope(xs) * sunward;
      let c: RGB = facing > 0.12 ? style.lit : facing < -0.12 ? style.shade : style.mid;
      if (k === 0 && facing > -0.12) c = style.rim;
      const haze = (y - (HORIZON - style.haze)) / style.haze;
      if (haze > 0) c = mix(c, HAZE, (Math.ceil(haze * 3) / 3) * 0.75);
      g.set(x, y, pack(c));
    }
  }
}

function buildFar(): PixelGrid {
  const g = new PixelGrid(W + FAR_PAD * 2, HORIZON + 1);
  const r = rng(7);
  const sunX = g.w / 2;
  hillRange(
    g,
    { seed: 3, maxH: 70, rightScale: 0.3, wave: 58 },
    { rim: rgb(244, 156, 150), lit: rgb(204, 116, 150), mid: rgb(170, 92, 142), shade: rgb(134, 72, 132), haze: 14 },
    sunX
  );
  hillRange(
    g,
    { seed: 9, maxH: 34, rightScale: 0.25, wave: 46 },
    { rim: rgb(222, 116, 138), lit: rgb(160, 76, 128), mid: rgb(126, 60, 118), shade: rgb(96, 46, 106), haze: 9 },
    sunX
  );
  const back = rgb(184, 160, 214);
  const front = rgb(150, 128, 198);
  for (let i = 0; i < 11; i++) {
    const tw = 7 + Math.floor(r() * 12);
    const x = 300 + Math.floor(r() * 160);
    const centre = 1 - Math.abs(x - 380) / 90;
    tower(g, x + FAR_PAD, tw, Math.round(16 + centre * 30 + r() * 12), back, r);
  }
  for (let i = 0; i < 12; i++) {
    const tw = 8 + Math.floor(r() * 13);
    const x = 288 + Math.floor(r() * 186);
    const centre = 1 - Math.abs(x - 390) / 100;
    tower(g, x + FAR_PAD, tw, Math.round(10 + centre * 36 + r() * 14), front, r);
  }
  return g;
}

function buildNear(): PixelGrid {
  const g = new PixelGrid(W + NEAR_PAD * 2, HORIZON + 1);
  const r = rng(23);
  const canopy = rgb(56, 70, 108);
  const canopyTop = rgb(98, 104, 148);
  const trunk = rgb(48, 54, 90);
  const start = 236 + NEAR_PAD;
  const end = g.w;

  let x = start;
  while (x < end) {
    const bw = 10 + Math.floor(r() * 10);
    const bh = 6 + Math.floor(r() * 9);
    const body = r() < 0.5 ? rgb(226, 172, 198) : rgb(172, 210, 212);
    const side = mix(body, rgb(90, 70, 130), 0.4);
    for (let y = HORIZON - bh; y <= HORIZON; y++) {
      for (let bx = x; bx < x + bw; bx++) {
        let c = bx >= x + bw - 2 ? side : body;
        if ((y - (HORIZON - bh)) % 3 === 2 && (bx - x) % 2 === 1 && bx < x + bw - 2) {
          c = hash2(bx, y) < 0.2 ? rgb(255, 220, 160) : rgb(90, 110, 150);
        }
        g.set(bx, y, pack(mix(c, HAZE, 0.25)));
      }
    }
    x += bw + 18 + Math.floor(r() * 40);
  }

  for (let sx = start - 10; sx < end; sx++) {
    const taper = Math.min(1, (sx - start + 10) / 24);
    const hh = Math.round(taper * (3 + 2 * Math.sin(sx * 0.19) + 1.5 * Math.sin(sx * 0.07 + 2) + hash2(sx, 3) * 2));
    for (let k = 0; k < hh; k++) g.set(sx, HORIZON - k, pack(k === hh - 1 ? canopyTop : canopy));
  }

  for (let px = start + 6; px < end; px += 12 + Math.floor(r() * 20)) {
    const ph = 10 + Math.floor(r() * 9);
    const lean = r() < 0.5 ? -1 : 1;
    for (let k = 0; k < ph; k++) g.set(px + Math.round((k / ph) * (k / ph) * 2 * lean), HORIZON - k, pack(trunk));
    const tx = px + 2 * lean;
    const ty = HORIZON - ph;
    const fronds: readonly (readonly [number, number])[] = [
      [-4, 2], [-3, 0], [-1, -1], [1, -1], [3, 0], [4, 2],
    ];
    for (const [fx, fy] of fronds) g.line(tx, ty, tx + fx, ty + fy, pack(canopy));
  }
  return g;
}

export function buildBackdrop(): Backdrop {
  return {
    sky: buildSky().toCanvas(),
    far: buildFar().toCanvas(),
    near: buildNear().toCanvas(),
  };
}
