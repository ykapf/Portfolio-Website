import { forEachTextPixel, forEachVerticalTextPixel } from "../font";
import { PixelGrid, RGB, mix, pack, rgb, rng } from "../pixels";

/**
 * Resolution-independent pixel-art generators. Each is rasterised at several
 * heights so on-screen pixel density stays consistent with the car.
 */

const TRUNK = { dark: rgb(46, 30, 52), mid: rgb(98, 64, 72), lite: rgb(172, 114, 92), ring: rgb(68, 44, 62) };

interface FrondPalette {
  deep: RGB;
  dark: RGB;
  mid: RGB;
  lite: RGB;
  hi: RGB;
}

const FROND: FrondPalette = {
  deep: rgb(14, 36, 52),
  dark: rgb(22, 62, 70),
  mid: rgb(38, 100, 84),
  lite: rgb(86, 146, 92),
  hi: rgb(218, 176, 112),
};
const FROND_BACK: FrondPalette = {
  deep: rgb(12, 26, 46),
  dark: rgb(18, 46, 60),
  mid: rgb(28, 74, 74),
  lite: rgb(56, 108, 84),
  hi: rgb(120, 130, 96),
};

export interface PalmSpec {
  seed: number;
  lean: number;
  fronds: number;
}

/**
 * One arcade-style frond: a curved rachis with a solid blade hanging beneath it.
 * Three flat tones (lit edge, body, shadowed underside) and a coarse saw-tooth hem.
 */
function frond(
  g: PixelGrid,
  cx: number,
  cy: number,
  a: number,
  len: number,
  droop: number,
  h: number,
  pal: FrondPalette,
  lit: boolean
) {
  const steps = Math.max(3, Math.ceil(len * 1.2));
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const tooth = Math.max(2, Math.round(h * 0.025));
  const top = pack(lit && ca > -0.3 ? pal.hi : pal.lite);
  const body = pack(pal.mid);
  const under = pack(pal.dark);
  for (let j = 0; j <= steps; j++) {
    const s = j / steps;
    const x = cx + ca * len * s;
    const y = cy - sa * len * s + droop * len * s * s;
    const notch = h >= 40 && Math.floor(j / tooth) % 2 === 1 ? 0.55 : 1;
    const th = Math.round(h * 0.075 * Math.sin(Math.PI * Math.min(1, 0.12 + s * 0.95)) * notch);
    g.set(x, y, top);
    for (let k = 1; k <= th; k++) g.set(x, y + k, k >= th - Math.max(0, Math.floor(th / 3)) ? under : body);
  }
}

/** Palm: gently curved plain trunk with a crown of chunky drooping fronds. Lit from the right. */
export function palm(h: number, spec: PalmSpec): PixelGrid {
  const w = Math.max(5, Math.round(h * 0.95));
  const g = new PixelGrid(w, h);
  const r = rng(spec.seed);
  const crownX = w * 0.5 + spec.lean * w * 0.08;
  const crownY = h * 0.2;
  const baseX = w * 0.5 - spec.lean * w * 0.06;
  const frondAngle = (i: number, n: number, jitter: number) =>
    Math.PI * (-0.12 + (1.24 * (i + 0.5)) / n) + (r() - 0.5) * jitter;
  const frondLen = (a: number, k: number) => h * k * (1 - 0.45 * Math.max(0, Math.sin(a)));

  const backN = Math.max(2, Math.round(spec.fronds * 0.5));
  for (let i = 0; i < backN; i++) {
    const a = frondAngle(i, backN, 0.5);
    frond(g, crownX, crownY, a, frondLen(a, 0.3 + r() * 0.05), 0.55 + r() * 0.2, h, FROND_BACK, false);
  }

  trunk(g, baseX, crownX, Math.round(crownY), h);

  for (let i = 0; i < spec.fronds; i++) {
    const a = frondAngle(i, spec.fronds, 0.3);
    frond(g, crownX, crownY, a, frondLen(a, 0.36 + r() * 0.07), 0.5 + r() * 0.25, h, FROND, true);
  }
  g.disc(crownX, crownY + h * 0.01, Math.max(0.6, h * 0.022), pack(FROND.dark));

  if (h >= 28) g.outline(pack(rgb(16, 18, 34)));
  return g;
}

/** [angle in degrees, length multiplier, droop]; back fronds first. */
type FrondDef = readonly [number, number, number];

const ROUND_BACK: readonly FrondDef[] = [
  [28, 0.95, 0.75],
  [152, 0.95, 0.75],
  [84, 0.7, 0.85],
  [104, 0.7, 0.85],
];
const ROUND_FRONT: readonly FrondDef[] = [
  [8, 1, 0.62],
  [172, 1, 0.62],
  [48, 0.95, 0.6],
  [132, 0.95, 0.6],
  [-24, 0.55, 0.45],
  [204, 0.55, 0.45],
  [70, 0.8, 0.7],
  [112, 0.8, 0.7],
];

/**
 * Classic round-crowned palm: fronds arch up and over like an umbrella and the
 * lower ones stay short, giving a compact dome instead of long hanging leaves.
 */
export function roundPalm(h: number, spec: PalmSpec): PixelGrid {
  const w = Math.max(5, Math.round(h * 0.82));
  const g = new PixelGrid(w, h);
  const r = rng(spec.seed + 100);
  const crownX = w * 0.5 + spec.lean * w * 0.07;
  const crownY = h * 0.24;
  const baseX = w * 0.5 - spec.lean * w * 0.05;
  const L = h * 0.3;
  const deg = Math.PI / 180;

  for (const [a, k, droop] of ROUND_BACK) {
    frond(g, crownX, crownY, a * deg + (r() - 0.5) * 0.12, L * k, droop, h * 1.15, FROND_BACK, false);
  }
  trunk(g, baseX, crownX, Math.round(crownY), h);
  for (const [a, k, droop] of ROUND_FRONT) {
    frond(g, crownX, crownY, a * deg + (r() - 0.5) * 0.12, L * k * (0.94 + r() * 0.1), droop, h * 1.15, FROND, true);
  }
  if (h >= 20) {
    const nut = pack(rgb(120, 78, 50));
    const nr = Math.max(0.6, h * 0.018);
    for (const dx of [-1, 1, 0]) g.disc(crownX + dx * nr * 1.4, crownY + h * 0.03 + (dx === 0 ? nr : 0), nr, nut);
  }
  g.disc(crownX, crownY, Math.max(0.6, h * 0.02), pack(FROND.dark));
  if (h >= 28) g.outline(pack(rgb(16, 18, 34)));
  return g;
}

/** Plain trunk, dark on the left and lit on the right, curving into the crown. */
function trunk(g: PixelGrid, baseX: number, crownX: number, top: number, h: number): void {
  const bot = h - 1;
  const len = Math.max(1, bot - top);
  for (let y = top; y <= bot; y++) {
    const t = (bot - y) / len;
    const cx = baseX + (crownX - baseX) * Math.pow(t, 1.8);
    const half = Math.max(0.5, h * (0.026 - 0.008 * t));
    const x0 = Math.round(cx - half);
    const x1 = Math.round(cx + half);
    for (let x = x0; x <= x1; x++) {
      const k = x1 === x0 ? 0.5 : (x - x0) / (x1 - x0);
      g.set(x, y, pack(k < 0.34 ? TRUNK.dark : k > 0.7 ? TRUNK.lite : TRUNK.mid));
    }
  }
}

export interface UmbrellaSpec {
  a: RGB;
  b: RGB;
  tilt: number;
}

/** Striped beach parasol: scalloped dome on a slightly tilted pole. */
export function umbrella(h: number, spec: UmbrellaSpec): PixelGrid {
  const w = Math.max(5, Math.round(h * 1.05));
  const g = new PixelGrid(w, h);
  const cx = w / 2;
  const domeTop = h * 0.04;
  const domeBot = h * 0.34;
  const rx = w * 0.48;
  const tipX = cx + spec.tilt * h * 0.12;
  const pole = pack(rgb(236, 230, 226));
  const poleDark = pack(rgb(150, 130, 150));
  for (let y = Math.round(domeBot); y < h; y++) {
    const t = (y - domeBot) / (h - domeBot);
    const x = tipX + (cx - spec.tilt * h * 0.06 - tipX) * t;
    g.set(x, y, pole);
    if (h >= 30) g.set(x + 1, y, poleDark);
  }
  const panels = 6;
  const shade = (c: RGB) => pack(mix(c, rgb(70, 30, 80), 0.35));
  for (let y = Math.floor(domeTop); y <= Math.ceil(domeBot); y++) {
    const v = (y - domeTop) / (domeBot - domeTop);
    const half = rx * Math.sqrt(Math.max(0, 1 - (1 - v) * (1 - v)));
    for (let x = Math.floor(tipX - half); x <= Math.ceil(tipX + half); x++) {
      const u = (x - tipX) / Math.max(1, half);
      if (Math.abs(u) > 1) continue;
      const scallop = v > 0.86 && Math.floor((u + 1) * panels * 0.5 * 2) % 2 === 1 && y >= domeBot - Math.max(1, h * 0.02);
      if (scallop) continue;
      const panel = Math.floor((Math.asin(Math.max(-1, Math.min(1, u))) / Math.PI + 0.5) * panels);
      const base = panel % 2 === 0 ? spec.a : spec.b;
      g.set(x, y, u > 0.45 || v > 0.8 ? shade(base) : pack(base));
    }
  }
  g.disc(tipX, domeTop, Math.max(0.5, h * 0.02), pole);
  if (h >= 24) g.outline(pack(rgb(60, 30, 70)));
  return g;
}

const NEON_PINK = rgb(255, 92, 200);
const NEON_PINK_HI = rgb(255, 214, 244);
const NEON_CYAN = rgb(110, 240, 255);
const SIGN_BACK = rgb(34, 20, 54);
const SIGN_FRAME = rgb(70, 52, 96);

/** Thick neon stroke: bright core with a coloured tube around it. */
function neonLine(g: PixelGrid, x0: number, y0: number, x1: number, y1: number, tube: RGB, core: RGB, wgt: number): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const t = pack(tube);
  const c = pack(core);
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    if (wgt >= 2) g.disc(x, y, wgt * 0.5, t);
    else g.set(x, y, t);
  }
  if (wgt >= 2) {
    for (let i = 0; i <= n; i++) g.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
  }
}

/** Rooftop club sign: a giant neon martini glass with an olive, standing on a tall lit sign box. */
export function martiniSign(h: number): PixelGrid {
  const w = Math.max(5, Math.round(h * 0.86));
  const g = new PixelGrid(w, h);
  const cx = w / 2;
  const wgt = Math.max(1, Math.round(h * 0.022));
  // Sign box: dark steel with a cyan lip, a pink base strip and a row of bulbs, sitting on the roof.
  const boxTop = Math.round(h * 0.64);
  const bx0 = Math.round(w * 0.16);
  const bw = Math.round(w * 0.68);
  g.rect(bx0, boxTop, bw, h - boxTop, pack(SIGN_FRAME));
  g.rect(bx0, boxTop, bw, Math.max(1, Math.round(h * 0.025)), pack(NEON_CYAN));
  g.rect(bx0, h - Math.max(1, Math.round(h * 0.03)), bw, Math.max(1, Math.round(h * 0.03)), pack(NEON_PINK));
  if (h >= 24) {
    const step = Math.max(2, Math.round(h * 0.07));
    const by = Math.round((boxTop + h) / 2);
    for (let x = bx0 + step; x < bx0 + bw - 1; x += step) g.rect(x, by, Math.max(1, Math.round(h * 0.02)), Math.max(1, Math.round(h * 0.02)), pack(rgb(255, 240, 190)));
  }
  // Glass: wide V bowl, short stem, flat foot on top of the box.
  const rimY = h * 0.08;
  const bowlBot = h * 0.44;
  const footY = boxTop - wgt;
  const rimHalf = w * 0.42;
  // Liquid fill inside the bowl.
  for (let y = Math.round(rimY + h * 0.06); y < bowlBot; y++) {
    const half = rimHalf * (1 - (y - rimY) / (bowlBot - rimY)) - wgt;
    if (half > 0) g.rect(Math.round(cx - half), y, Math.round(half * 2), 1, pack(rgb(120, 40, 120)));
  }
  neonLine(g, cx - rimHalf, rimY, cx + rimHalf, rimY, NEON_PINK, NEON_PINK_HI, wgt);
  neonLine(g, cx - rimHalf, rimY, cx, bowlBot, NEON_PINK, NEON_PINK_HI, wgt);
  neonLine(g, cx + rimHalf, rimY, cx, bowlBot, NEON_PINK, NEON_PINK_HI, wgt);
  neonLine(g, cx, bowlBot, cx, footY, NEON_PINK, NEON_PINK_HI, wgt);
  neonLine(g, cx - w * 0.2, footY, cx + w * 0.2, footY, NEON_PINK, NEON_PINK_HI, wgt);
  // Olive on a cocktail stick.
  const ox = cx - w * 0.06;
  const oy = h * 0.22;
  neonLine(g, ox - w * 0.14, rimY - h * 0.08, ox + w * 0.05, oy + h * 0.03, NEON_CYAN, rgb(230, 255, 255), Math.max(1, wgt - 1));
  g.disc(ox, oy, Math.max(1, h * 0.05), pack(rgb(120, 230, 90)));
  if (h >= 30) g.disc(ox - h * 0.012, oy - h * 0.012, Math.max(0.5, h * 0.015), pack(rgb(230, 255, 190)));
  return g;
}

/** Vertical Art Deco blade sign with a bulb border, for the cinema. */
export function bladeSign(h: number, text: string, face: RGB, letter: RGB): PixelGrid {
  const w = Math.max(3, Math.round(h * 0.26));
  const g = new PixelGrid(w, h);
  const bracket = pack(SIGN_FRAME);
  g.rect(0, Math.round(h * 0.94), w, h, bracket);
  const top = Math.round(h * 0.06);
  const bot = Math.round(h * 0.92);
  g.rect(0, top, w, bot - top, pack(face));
  // Stepped deco crown.
  g.rect(Math.round(w * 0.2), 0, Math.max(1, Math.round(w * 0.6)), top, pack(face));
  g.rect(Math.round(w * 0.38), 0, Math.max(1, Math.round(w * 0.24)), 1, pack(letter));
  if (h >= 30) {
    const bulb = pack(rgb(255, 246, 200));
    const step = Math.max(2, Math.round(h * 0.035));
    for (let y = top + 1; y < bot - 1; y += step) {
      g.set(0, y, bulb);
      g.set(w - 1, y, bulb);
    }
  }
  const k = Math.max(1, Math.floor(Math.min((w - 2) / 3, (bot - top - 4) / (text.length * 6))));
  if (h >= 24) {
    const tx = Math.round((w - 3 * k) / 2);
    const ty = Math.round(top + (bot - top - (text.length * 6 - 1) * k) / 2);
    forEachVerticalTextPixel(text, (x, y) => g.rect(tx + x * k, ty + y * k, k, k, pack(letter)));
  } else {
    g.rect(Math.round(w / 2), top + 2, 1, bot - top - 4, pack(letter));
  }
  if (h >= 16) g.outline(pack(rgb(30, 18, 40)));
  return g;
}

/** Petrol station price pylon: brand panel up top, price rows below, on a single post. */
export function gasPylon(h: number): PixelGrid {
  const w = Math.max(3, Math.round(h * 0.36));
  const g = new PixelGrid(w, h);
  const post = pack(rgb(90, 86, 110));
  g.rect(Math.round(w * 0.42), Math.round(h * 0.55), Math.max(1, Math.round(w * 0.16)), h, post);
  const red = pack(rgb(226, 40, 50));
  const white = pack(rgb(248, 246, 240));
  const dark = pack(rgb(26, 22, 36));
  const amber = pack(rgb(255, 196, 70));
  g.rect(0, 0, w, Math.round(h * 0.58), white);
  g.rect(0, 0, w, Math.round(h * 0.22), red);
  if (h >= 30) {
    const k = Math.max(1, Math.floor((w - 2) / 12));
    const tx = Math.round((w - 11 * k) / 2);
    forEachTextPixel("GAS", (x, y) => g.rect(tx + x * k, Math.round(h * 0.11 - 2.5 * k) + y * k, k, k, white));
    for (let i = 0; i < 3; i++) {
      const y0 = Math.round(h * (0.26 + i * 0.1));
      g.rect(1, y0, w - 2, Math.max(1, Math.round(h * 0.075)), dark);
      const price = ["1.29", "1.39", "1.49"][i];
      const pk = Math.max(1, Math.floor(Math.min((w - 4) / 16, (h * 0.075 - 1) / 5)));
      forEachTextPixel(price, (x, y) => g.rect(w - 2 - 15 * pk + x * pk, y0 + 1 + y * pk, pk, pk, amber));
    }
  } else {
    g.rect(1, Math.round(h * 0.3), w - 2, Math.max(1, Math.round(h * 0.2)), dark);
  }
  if (h >= 16) g.outline(pack(rgb(30, 18, 40)));
  return g;
}

/**
 * Fuel pump on its concrete island: lit brand header, price display, nozzle and
 * hose loop, with a shaded side face so it reads as a solid box.
 */
export function gasPump(h: number): PixelGrid {
  const w = Math.max(4, Math.round(h * 0.78));
  const g = new PixelGrid(w, h);
  const X = (f: number) => Math.round(f * w);
  const Yp = (f: number) => Math.round(f * h);
  const red = pack(rgb(226, 40, 52));
  const redSide = pack(rgb(150, 24, 44));
  const white = pack(rgb(246, 244, 250));
  const whiteSide = pack(rgb(176, 168, 196));
  const dark = pack(rgb(26, 22, 36));
  const amber = pack(rgb(255, 196, 70));
  const steel = pack(rgb(150, 146, 170));

  // Island: lit top edge, shaded front, yellow-and-black bollards at each end.
  g.rect(0, Yp(0.86), w, h - Yp(0.86), pack(rgb(150, 142, 162)));
  g.rect(0, Yp(0.86), w, Math.max(1, Yp(0.035)), pack(rgb(214, 208, 222)));
  for (const bx of [0.03, 0.89]) {
    const bw = Math.max(1, X(0.08));
    g.rect(X(bx), Yp(0.6), bw, Yp(0.86) - Yp(0.6), pack(rgb(255, 210, 60)));
    if (h >= 24) for (let y = Yp(0.64); y < Yp(0.86); y += Math.max(2, Yp(0.08))) g.rect(X(bx), y, bw, Math.max(1, Yp(0.03)), dark);
  }

  const x0 = X(0.2);
  const x1 = X(0.7);
  const xs = X(0.82);
  // Body: white cabinet with a red stripe, darker side face.
  g.rect(x0, Yp(0.24), x1 - x0, Yp(0.86) - Yp(0.24), white);
  g.rect(x1, Yp(0.26), xs - x1, Yp(0.86) - Yp(0.26), whiteSide);
  g.rect(x0, Yp(0.66), x1 - x0, Math.max(1, Yp(0.06)), red);
  g.rect(x1, Yp(0.66), xs - x1, Math.max(1, Yp(0.06)), redSide);
  // Header: red brand box with a white band, slightly proud of the cabinet.
  g.rect(x0 - 1, Yp(0.04), x1 - x0 + 2, Yp(0.22) - Yp(0.04), red);
  g.rect(x1 + 1, Yp(0.06), xs - x1, Yp(0.22) - Yp(0.06), redSide);
  g.rect(x0 - 1, Yp(0.11), x1 - x0 + 2, Math.max(1, Yp(0.04)), white);
  g.rect(x0, Yp(0.22), xs - x0, Math.max(1, Yp(0.02)), dark);
  // Display with price rows, and a button strip.
  g.rect(x0 + Math.max(1, X(0.05)), Yp(0.28), x1 - x0 - 2 * Math.max(1, X(0.05)), Yp(0.46) - Yp(0.28), dark);
  if (h >= 20) {
    const rowsN = h >= 40 ? 3 : 2;
    for (let i = 0; i < rowsN; i++) {
      const ry = Yp(0.31 + i * (0.13 / rowsN));
      g.rect(x0 + Math.max(2, X(0.1)), ry, Math.max(1, X(0.3)), Math.max(1, Yp(0.025)), amber);
    }
  }
  g.rect(x0 + Math.max(1, X(0.08)), Yp(0.5), Math.max(1, X(0.18)), Math.max(1, Yp(0.06)), steel);
  // Nozzle in its holster on the near face, hose looping down and back.
  g.rect(x0 - Math.max(1, X(0.06)), Yp(0.44), Math.max(1, X(0.07)), Math.max(1, Yp(0.12)), dark);
  const hoseX = x0 - Math.max(1, X(0.05));
  const sag = Yp(0.8);
  const steps = Math.max(6, Math.round(h * 0.6));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const hx = hoseX - Math.sin(t * Math.PI) * X(0.12);
    const hy = Yp(0.55) + (sag - Yp(0.55)) * Math.sin(t * Math.PI * 0.5);
    g.rect(Math.round(hx), Math.round(hy), Math.max(1, Math.round(h * 0.02)), Math.max(1, Math.round(h * 0.02)), dark);
  }
  if (h >= 16) g.outline(pack(rgb(30, 18, 40)));
  return g;
}

/** Police lantern on a short black post: blue lamp box lettered POLICE. */
export function policeLamp(h: number): PixelGrid {
  const w = Math.max(3, Math.round(h * 0.42)) | 1;
  const g = new PixelGrid(w, h);
  const cx = Math.floor(w / 2);
  g.rect(cx - Math.max(0, Math.floor(h * 0.012)), Math.round(h * 0.3), Math.max(1, Math.round(h * 0.03)), h, pack(rgb(24, 22, 34)));
  const boxTop = Math.round(h * 0.04);
  const boxBot = Math.round(h * 0.3);
  g.rect(0, boxTop, w, boxBot - boxTop, pack(rgb(60, 120, 255)));
  g.rect(0, boxTop, w, Math.max(1, Math.round(h * 0.03)), pack(rgb(24, 22, 34)));
  g.rect(Math.round(w * 0.3), 0, Math.max(1, Math.round(w * 0.4)), boxTop, pack(rgb(24, 22, 34)));
  const k = Math.floor((w - 2) / 23);
  if (k >= 1 && boxBot - boxTop >= 5 * k + 2) {
    const tx = Math.round((w - 23 * k) / 2);
    forEachTextPixel("POLICE", (x, y) => g.rect(tx + x * k, Math.round((boxTop + boxBot - 5 * k) / 2) + y * k, k, k, pack(rgb(250, 250, 255))));
  } else {
    g.rect(1, Math.round((boxTop + boxBot) / 2), w - 2, 1, pack(rgb(220, 236, 255)));
  }
  return g;
}

const WHEEL_LIGHTS = [rgb(255, 120, 210), rgb(120, 240, 255), rgb(255, 230, 120), rgb(255, 255, 255)] as const;

/**
 * Pier Ferris wheel. `phase` rotates the spokes (16-fold symmetric, so a
 * fraction of a spoke step is enough to animate). Structure takes the haze,
 * the rim lights stay bright.
 */
export function ferrisWheel(h: number, phase: number, fog: number, haze: RGB): PixelGrid {
  const w = Math.max(5, Math.round(h * 0.9));
  const g = new PixelGrid(w, h);
  const cx = w / 2;
  const cy = h * 0.45;
  const R = h * 0.42;
  const steel = pack(mix(rgb(236, 226, 246), haze, fog * 0.5));
  const frame = pack(mix(rgb(120, 96, 160), haze, fog * 0.5));
  for (const side of [-1, 1]) g.line(cx, cy, cx + side * w * 0.3, h - 1, frame);
  g.line(cx - w * 0.3, h - 1, cx + w * 0.3, h - 1, frame);
  const spokes = 16;
  for (let i = 0; i < spokes; i++) {
    const a = ((i + phase) / spokes) * Math.PI * 2;
    g.line(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, steel);
  }
  const steps = Math.max(24, Math.ceil(R * 7));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.set(cx + Math.cos(a) * R, cy + Math.sin(a) * R, steel);
    if (R > 12) g.set(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2), frame);
  }
  for (let i = 0; i < spokes; i++) {
    const a = ((i + phase) / spokes) * Math.PI * 2;
    const x = cx + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R;
    const light = pack(WHEEL_LIGHTS[i % WHEEL_LIGHTS.length]);
    if (h >= 50) {
      g.rect(Math.round(x - h * 0.012), Math.round(y + 1), Math.max(1, Math.round(h * 0.03)), Math.max(1, Math.round(h * 0.03)), pack(mix(WHEEL_LIGHTS[(i + 1) % 4], haze, fog * 0.5)));
    }
    const ls = Math.max(1, Math.round(h * 0.025));
    g.rect(Math.round(x - ls / 2), Math.round(y - ls / 2), ls, ls, light);
  }
  g.disc(cx, cy, Math.max(0.6, h * 0.02), pack(WHEEL_LIGHTS[2]));
  return g;
}

const LEAF = [rgb(22, 62, 58), rgb(38, 102, 70), rgb(76, 146, 80), rgb(150, 186, 96)] as const;

export interface BushSpec {
  seed: number;
  width: number;
  flowers: RGB | null;
}

/** Tropical shrub: a few overlapping rounded clumps with flat banded shading. */
export function bush(h: number, spec: BushSpec): PixelGrid {
  const w = Math.max(4, Math.round(h * spec.width));
  const g = new PixelGrid(w, h);
  const r = rng(spec.seed);
  const n = 3 + Math.floor(r() * 2);
  const blobs: { bx: number; by: number; br: number }[] = [];
  for (let i = 0; i < n; i++) {
    const br = h * (0.38 + r() * 0.14);
    const bx = br + (w - 2 * br) * (i / (n - 1)) + (r() - 0.5) * br * 0.3;
    const by = Math.max(br, h - br * (0.9 + r() * 0.25));
    blobs.push({ bx, by, br });
  }
  blobs.sort((a, b) => a.by - b.by);
  for (const { bx, by, br } of blobs) {
    for (let y = Math.floor(by - br); y <= Math.ceil(by + br); y++) {
      for (let x = Math.floor(bx - br); x <= Math.ceil(bx + br); x++) {
        const nx = (x - bx) / br;
        const ny = (y - by) / br;
        if (nx * nx + ny * ny > 1) continue;
        const l = -ny * 0.75 + nx * 0.3;
        g.set(x, y, pack(LEAF[l < -0.35 ? 0 : l < 0.2 ? 1 : l < 0.62 ? 2 : 3]));
      }
    }
  }
  if (spec.flowers && h >= 8) {
    const petal = pack(spec.flowers);
    const hi = pack(mix(spec.flowers, rgb(255, 255, 240), 0.5));
    const dot = Math.max(1, Math.round(h * 0.07));
    const count = 4 + Math.floor(spec.width * 3);
    for (let k = 0; k < count; k++) {
      const x = Math.floor(r() * (w - dot));
      const y = Math.floor(h * 0.15 + r() * h * 0.5);
      if (g.get(x, y) === 0 || g.get(x + dot - 1, y + dot - 1) === 0) continue;
      g.rect(x, y, dot, dot, petal);
      if (dot >= 2) g.set(x, y, hi);
    }
  }
  for (let x = 0; x < w; x++) if (g.get(x, h - 1) !== 0) g.set(x, h - 1, pack(LEAF[0]));
  if (h >= 10) g.outline(pack(rgb(12, 28, 36)));
  return g;
}

export interface TreeSpec {
  seed: number;
  /** Canopy width relative to height. */
  spread: number;
}

/** Broadleaf shade tree: short forked trunk under a wide, flat-shaded canopy. */
export function tree(h: number, spec: TreeSpec): PixelGrid {
  const w = Math.max(5, Math.round(h * spec.spread));
  const g = new PixelGrid(w, h);
  const r = rng(spec.seed);
  const cx = w / 2;
  const tw = Math.max(1, h * 0.05);
  for (let y = Math.round(h * 0.45); y < h; y++) {
    const t = (y - h * 0.45) / (h * 0.55);
    const half = tw * (0.8 + 0.5 * t);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const k = (x - (cx - half)) / (2 * half);
      g.set(x, y, pack(k < 0.35 ? TRUNK.dark : k > 0.7 ? TRUNK.lite : TRUNK.mid));
    }
  }
  if (h >= 24) {
    g.line(cx, h * 0.55, cx - w * 0.18, h * 0.38, pack(TRUNK.mid));
    g.line(cx, h * 0.55, cx + w * 0.2, h * 0.36, pack(TRUNK.mid));
  }
  const n = 5;
  const blobs: { bx: number; by: number; br: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI;
    const br = h * (0.2 + r() * 0.06);
    blobs.push({
      bx: cx - Math.cos(a) * (w / 2 - br) * 0.95,
      by: h * 0.36 - Math.sin(a) * h * 0.12 + (r() - 0.5) * h * 0.04,
      br,
    });
  }
  blobs.push({ bx: cx, by: h * 0.28, br: h * 0.24 });
  blobs.sort((a, b) => b.by - a.by);
  for (const { bx, by, br } of blobs) {
    for (let y = Math.floor(by - br); y <= Math.ceil(by + br * 0.8); y++) {
      for (let x = Math.floor(bx - br); x <= Math.ceil(bx + br); x++) {
        const nx = (x - bx) / br;
        const ny = (y - by) / br;
        if (nx * nx + ny * ny > 1) continue;
        const l = -ny * 0.75 + nx * 0.3;
        g.set(x, y, pack(LEAF[l < -0.3 ? 0 : l < 0.2 ? 1 : l < 0.6 ? 2 : 3]));
      }
    }
  }
  if (h >= 16) g.outline(pack(rgb(12, 28, 36)));
  return g;
}

/** Double-headed Art Deco street lamp. */
export function lamp(h: number): PixelGrid {
  const w = Math.max(5, Math.round(h * 0.3)) | 1;
  const g = new PixelGrid(w, h);
  const cx = (w - 1) / 2;
  const pole = pack(rgb(58, 52, 84));
  const poleHi = pack(rgb(140, 128, 170));
  const cap = pack(rgb(40, 36, 62));
  const light = pack(rgb(255, 236, 180));
  const halo = pack(rgb(255, 214, 170), 110);
  const pw = Math.max(1, Math.round(h * 0.022));
  const armY = Math.round(h * 0.12);
  for (let y = armY; y < h; y++) {
    for (let k = 0; k < pw; k++) g.set(cx - Math.floor(pw / 2) + k, y, k === pw - 1 && pw > 1 ? poleHi : pole);
  }
  const bw = pw + 2 * Math.max(1, Math.round(h * 0.02));
  g.rect(cx - Math.floor(bw / 2), h - Math.max(2, Math.round(h * 0.05)), bw, h, pole);
  const reach = Math.round(w * 0.4);
  const at = Math.max(1, Math.round(h * 0.012));
  g.rect(cx - reach, armY, reach * 2 + 1, at, cap);
  const lh = Math.max(2, Math.round(h * 0.06));
  const lw = Math.max(1, Math.round(h * 0.04));
  for (const side of [-1, 1]) {
    const hx = cx + side * reach;
    for (let y = armY + at; y < armY + at + lh + 2; y++) {
      for (let x = Math.round(hx - lw / 2) - 1; x <= Math.round(hx + lw / 2) + 1; x++) {
        if (g.get(x, y) === 0) g.set(x, y, halo);
      }
    }
    g.rect(Math.round(hx - lw / 2), armY + at, lw + 1, lh, light);
    g.rect(Math.round(hx - lw / 2), armY + at, lw + 1, 1, cap);
  }
  return g;
}

