import { CURVE_MAX, DROP, LOOP_SECONDS, ROAD_HALF, SEG_L } from "./config";
import { RGB, rgb, rng } from "./pixels";
import { BIOME_TIMES, curveAt, speedAt } from "./timeline";

export type SceneryKind =
  | "palmL0" | "palmL1" | "palmL2" | "palmL3" | "palmL4" | "palmL5"
  | "palmR0" | "palmR1" | "palmR2" | "palmR3" | "palmR4" | "palmR5"
  | "bush0" | "bush1" | "bush2"
  | "flower0" | "flower1"
  | "tree0" | "tree1"
  | "lampL" | "lampR"
  | "umbrella0" | "umbrella1" | "umbrella2"
  | "martini" | "cinemaSign" | "gasPylon" | "gasPump" | "policeLamp";

export interface SceneryItem {
  kind: SceneryKind;
  /** Lateral position in road half-widths (negative = ocean side). */
  offset: number;
  worldH: number;
  /** Height of the ground the sprite stands on; the beach sits below the road. */
  elev: number;
  /** Pavement palm: the ground gets a grass bed around its base. */
  planter?: boolean;
}

/** What lines the inland side of each stretch of road. */
export const Biome = { Hotels: 0, Nature: 1, HighStreet: 2 } as const;
export type Biome = (typeof Biome)[keyof typeof Biome];

export type BuildingKind = "hotel" | "apartment" | "diner" | "pizza" | "club" | "cinema" | "police" | "gas" | "tiki";

export interface BuildingType {
  kind: BuildingKind;
  segs: number;
  /** Depth away from the road, in road half-widths. */
  width: number;
  worldH: number;
  body: RGB;
  /** Neon / awning colour. */
  accent: RGB;
  sign: string | null;
  /** Hotels only: fraction of the facade covered by the raised central tower. */
  tower: number;
  /** Style variant within a kind (police stations come in three). */
  variant: number;
}

const bt = (
  kind: BuildingKind,
  segs: number,
  width: number,
  worldH: number,
  body: RGB,
  accent: RGB,
  sign: string | null,
  tower = 0,
  variant = 0
): BuildingType => ({ kind, segs, width, worldH, body, accent, sign, tower, variant });

/** Textures are generated once per type; placed buildings just reference one. */
export const BUILDING_TYPES: readonly BuildingType[] = [
  bt("hotel", 12, 1.8, 2600, rgb(244, 172, 198), rgb(90, 240, 255), "HOTEL", 0.3),
  bt("hotel", 10, 1.5, 3200, rgb(152, 214, 202), rgb(255, 80, 170), "MOTEL", 0.4),
  bt("hotel", 14, 2.0, 2200, rgb(250, 232, 196), rgb(255, 120, 200), null, 0.22),
  bt("apartment", 11, 1.7, 2900, rgb(206, 176, 232), rgb(255, 214, 120), null),
  bt("apartment", 9, 1.6, 2400, rgb(164, 206, 240), rgb(255, 150, 120), null),
  bt("diner", 10, 1.3, 1800, rgb(204, 210, 226), rgb(72, 112, 200), "DINER"),
  bt("pizza", 7, 1.3, 1750, rgb(246, 228, 196), rgb(40, 140, 80), "PIZZA"),
  bt("club", 8, 1.6, 1600, rgb(46, 30, 72), rgb(255, 80, 200), "CLUB"),
  bt("cinema", 11, 1.9, 2300, rgb(150, 36, 56), rgb(255, 206, 90), "OUTRUN"),
  bt("police", 9, 1.8, 1900, rgb(162, 76, 62), rgb(40, 86, 196), "POLICE", 0, 0),
  bt("gas", 9, 2.2, 1050, rgb(246, 244, 240), rgb(230, 44, 52), "GAS"),
  bt("tiki", 6, 1.3, 1350, rgb(214, 170, 104), rgb(255, 120, 80), "TIKI"),
  bt("police", 10, 1.9, 1700, rgb(236, 238, 246), rgb(30, 64, 170), "POLICE", 0, 1),
  bt("police", 8, 1.7, 2000, rgb(234, 210, 166), rgb(36, 70, 160), "POLICE", 0, 2),
];

/** A solid box on the inland side: its road-facing facade never crosses `inner`. */
export interface Building {
  type: number;
  seg0: number;
  /** Depth along the road, in segments. */
  segs: number;
  /** Facade plane and back wall, in road half-widths from the centreline. */
  inner: number;
  outer: number;
  worldH: number;
}

export interface Track {
  n: number;
  length: number;
  /** Per-segment curvature in world units / segment². */
  curve: Float32Array;
  /** Heading-derived parallax offset per segment boundary (periodic). */
  bg: Float32Array;
  bgMax: number;
  /** Camera position sampled at TABLE_HZ over one loop. */
  pos: Float64Array;
  speedScale: number;
  biomes: Uint8Array;
  scenery: SceneryItem[][];
  buildings: Building[];
  /** Beach towel per segment: colour index (0 = none) and lateral centre (negative). */
  towelColor: Uint8Array;
  towelX: Float32Array;
  /** Grass planter around pavement palms, keyed by every segment it overlaps. */
  planterX: Float32Array;
  planterZ: Float64Array;
  pier: Pier;
}

/** The one pier per lap: runs out to sea from the promenade with a Ferris wheel at the end. */
export interface Pier {
  seg0: number;
  segs: number;
}

export const PIER_SEGS = 8;
/** Lateral distance of the pier's far end from the centreline. */
export const PIER_END = 38000;
export const WHEEL_X = -(PIER_END - 1800);
export const WHEEL_H = 7600;
export const TOWEL_HALF_X = 320;
export const TOWEL_HALF_Z = 90;
export const PLANTER_R = 340;

const TABLE_HZ = 240;
/** Segment count is rounded to this so every stripe/tread period divides the lap. */
const LAP_QUANTUM = 120;

export function buildTrack(): Track {
  const steps = LOOP_SECONDS * TABLE_HZ;
  const raw = new Float64Array(steps + 1);
  for (let i = 0; i < steps; i++) {
    raw[i + 1] = raw[i] + speedAt((i + 0.5) / TABLE_HZ) / TABLE_HZ;
  }
  const n = Math.max(LAP_QUANTUM, Math.round(raw[steps] / SEG_L / LAP_QUANTUM) * LAP_QUANTUM);
  const length = n * SEG_L;
  const speedScale = length / raw[steps];
  const pos = new Float64Array(steps + 1);
  for (let i = 0; i <= steps; i++) pos[i] = raw[i] * speedScale;

  const timeAt = (z: number) => {
    let lo = 0;
    let hi = steps;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pos[mid] <= z) lo = mid;
      else hi = mid;
    }
    return lo / TABLE_HZ;
  };

  const curve = new Float32Array(n);
  for (let s = 0; s < n; s++) curve[s] = curveAt(timeAt((s + 0.5) * SEG_L)) * CURVE_MAX;

  const cum = new Float64Array(n + 1);
  for (let s = 0; s < n; s++) cum[s + 1] = cum[s] + curve[s];
  const drift = cum[n] / n;
  const bg = new Float32Array(n + 1);
  let bgMax = 1;
  for (let s = 0; s <= n; s++) {
    bg[s] = cum[s] - drift * s;
    bgMax = Math.max(bgMax, Math.abs(bg[s]));
  }

  const biomes = layoutBiomes(n, (s) => timeAt((s + 0.5) * SEG_L));
  const buildings = placeBuildings(n, biomes);
  // Reached at ~3.6s, at the end of the long straight that wraps across the loop
  // point, so the wheel is in clear view while the pier is still far ahead.
  const pier: Pier = { seg0: Math.round(pos[Math.round(3.6 * TABLE_HZ)] / SEG_L), segs: PIER_SEGS };
  const beach = placeBeach(n, pier);
  const scenery = placeScenery(n, biomes, buildings, pier, beach.umbrellas);
  const planterX = new Float32Array(n);
  const planterZ = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    for (const it of scenery[s]) {
      if (!it.planter) continue;
      for (let k = -2; k <= 2; k++) {
        const t = (s + k + n) % n;
        planterX[t] = it.offset * ROAD_HALF;
        planterZ[t] = s * SEG_L + SEG_L / 2;
      }
    }
  }
  return {
    n,
    length,
    curve,
    bg,
    bgMax,
    pos,
    speedScale,
    biomes,
    scenery,
    buildings,
    towelColor: beach.color,
    towelX: beach.x,
    planterX,
    planterZ,
    pier,
  };
}

/** Towels laid out in small groups on the sand, each group with a parasol. */
function placeBeach(n: number, pier: Pier) {
  const r = rng(404);
  const color = new Uint8Array(n);
  const x = new Float32Array(n);
  const umbrellas: { seg: number; offset: number }[] = [];
  for (let s = 6; s < n - 8; s += 18 + Math.floor(r() * 14)) {
    if (s > pier.seg0 - 10 && s < pier.seg0 + pier.segs + 6) continue;
    if (r() < 0.25) continue;
    const count = 1 + Math.floor(r() * 3);
    let lateral = 3600 + r() * 2200;
    for (let i = 0; i < count; i++) {
      const seg = s + i * 2;
      if (seg % 14 === 0) continue;
      color[seg] = 1 + Math.floor(r() * 5);
      x[seg] = -(lateral + (r() - 0.5) * 300);
    }
    lateral += TOWEL_HALF_X + 260;
    umbrellas.push({ seg: s + 1, offset: -lateral / ROAD_HALF });
  }
  return { color, x, umbrellas };
}

/** Hotel strip → open green stretch → high street → short green gap, then the lap repeats. */
function layoutBiomes(n: number, timeOf: (s: number) => number): Uint8Array {
  const { natureFrom, highStreetFrom, highStreetTo } = BIOME_TIMES;
  const out = new Uint8Array(n);
  for (let s = 0; s < n; s++) {
    const t = timeOf(s);
    out[s] = t < natureFrom ? Biome.Hotels : t < highStreetFrom ? Biome.Nature : t < highStreetTo ? Biome.HighStreet : Biome.Nature;
  }
  return out;
}

const HOTEL_ROW = [0, 3, 1, 4, 2, 3, 1, 0, 4] as const;
const HIGH_STREET = [5, 6, 7, 11, 8, 9, 10, 5, 13, 6, 7, 12, 11, 8] as const;

/** Packs buildings shoulder to shoulder through each built-up biome. */
function placeBuildings(n: number, biomes: Uint8Array): Building[] {
  const r = rng(77);
  const out: Building[] = [];
  const fill = (biome: Biome, order: readonly number[], innerAt: (t: BuildingType) => number) => {
    let s = 0;
    while (s < n && biomes[s] !== biome) s++;
    s += 2;
    let i = 0;
    while (s < n) {
      const type = order[i % order.length];
      const t = BUILDING_TYPES[type];
      if (s + t.segs >= n || biomes[s + t.segs] !== biome) break;
      const inner = innerAt(t);
      out.push({ type, seg0: s, segs: t.segs, inner, outer: inner + t.width, worldH: t.worldH });
      s += t.segs + 1 + (r() < 0.4 ? 1 : 0) + (t.kind === "gas" ? 1 : 0);
      i++;
    }
  };
  fill(Biome.Hotels, HOTEL_ROW, (t) => (t.kind === "hotel" ? 3.0 : 2.9) + r() * 0.15);
  fill(Biome.HighStreet, HIGH_STREET, (t) => (t.kind === "gas" ? 2.7 : t.kind === "diner" ? 2.6 : 2.45));
  return out;
}

function placeScenery(
  n: number,
  biomes: Uint8Array,
  buildings: readonly Building[],
  pier: Pier,
  umbrellas: readonly { seg: number; offset: number }[]
): SceneryItem[][] {
  const r = rng(1984);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  /** Round-crowned palms make up ~70%; the older long-frond design the rest. */
  const palmL = () => (r() < 0.7 ? pick(["palmL3", "palmL4", "palmL5"] as const) : pick(["palmL0", "palmL1", "palmL2"] as const));
  const palmR = () => (r() < 0.7 ? pick(["palmR3", "palmR4", "palmR5"] as const) : pick(["palmR0", "palmR1", "palmR2"] as const));
  const nearPier = (s: number) => s > pier.seg0 - 4 && s < pier.seg0 + pier.segs + 3;
  const bushes = ["bush0", "bush1", "bush2"] as const;
  const flowers = ["flower0", "flower1"] as const;
  const trees = ["tree0", "tree1"] as const;
  /** Nearest facade plane on segment `s`, so inland scenery never sits inside a building. */
  const wallAt = (s: number) => {
    let w = Infinity;
    for (const b of buildings) if (s >= b.seg0 - 3 && s < b.seg0 + b.segs + 1) w = Math.min(w, b.inner);
    return w;
  };
  /** Keeps pavement palms from hiding the club's rooftop martini. */
  const rooftopSignNear = (s: number) =>
    buildings.some((b) => BUILDING_TYPES[b.type].kind === "club" && s >= b.seg0 - 6 && s < b.seg0 + b.segs + 2);
  const out: SceneryItem[][] = [];
  for (let s = 0; s < n; s++) {
    const items: SceneryItem[] = [];
    const add = (kind: SceneryKind, offset: number, worldH: number, elev = 0, planter = false) =>
      items.push({ kind, offset, worldH, elev, planter });
    const wall = wallAt(s);
    const biome = biomes[s];

    // Ocean side: lamps along the promenade, palms down on the beach.
    if (s % 16 === 8) add("lampL", -1.3, 1700);
    if (s % 14 === 0 && !nearPier(s) && r() < 0.8) add(palmL(), -(3.2 + r() * 1.3), 2100 + r() * 500, -DROP);

    if (biome === Biome.HighStreet) {
      if (s % 8 === 0) add("lampR", 1.17, 1700);
      if (s % 20 === 10 && 1.6 < wall && !rooftopSignNear(s)) add(palmR(), 1.6, 1900 + r() * 300, 0, true);
    } else if (biome === Biome.Hotels) {
      if (s % 16 === 0) add("lampR", 1.17, 1700);
      if (s % 6 === 2 && r() < 0.7) add(r() < 0.4 ? pick(flowers) : pick(bushes), 1.3 + r() * 0.14, 300 + r() * 160);
      if (s % 22 === 5 && r() < 0.75) add(palmR(), 1.9 + r() * 0.3, 2100 + r() * 500);
      const outer = 2.5 + r() * 0.6;
      if (s % 9 === 0 && r() < 0.5 && outer + 0.5 < wall) add(pick(bushes), outer, 400 + r() * 200);
    } else {
      if (s % 16 === 0) add("lampR", 1.17, 1700);
      if (s % 3 === 1 && r() < 0.8) add(r() < 0.35 ? pick(flowers) : pick(bushes), 1.3 + r() * 0.3, 320 + r() * 200);
      if (s % 7 === 3) add(pick(trees), 2.6 + r() * 1.6, 1500 + r() * 700);
      if (s % 9 === 6 && r() < 0.8) add(palmR(), 1.9 + r() * 0.9, 2000 + r() * 500);
      if (s % 4 === 0) add(pick(bushes), 2.2 + r() * 2.4, 450 + r() * 300);
    }
    out.push(items);
  }

  umbrellas.forEach((u, i) => {
    const kind = (["umbrella0", "umbrella1", "umbrella2"] as const)[i % 3];
    out[u.seg % n].push({ kind, offset: u.offset, worldH: 820, elev: -DROP });
  });

  // Signage that belongs to particular buildings, as camera-facing billboards.
  for (const b of buildings) {
    const t = BUILDING_TYPES[b.type];
    const mid = (b.seg0 + Math.floor(b.segs / 2)) % n;
    if (t.kind === "club") out[mid].push({ kind: "martini", offset: b.inner + 0.35, worldH: 1450, elev: t.worldH - 60 });
    else if (t.kind === "cinema") out[(b.seg0 + 2) % n].push({ kind: "cinemaSign", offset: b.inner - 0.12, worldH: 1250, elev: 1000 });
    else if (t.kind === "gas") {
      out[(b.seg0 + 1) % n].push({ kind: "gasPylon", offset: 1.62, worldH: 2100, elev: 0 });
      for (const k of [2, 5, 8]) {
        if (k < b.segs) out[(b.seg0 + k) % n].push({ kind: "gasPump", offset: b.inner + 0.42, worldH: 560, elev: 0 });
      }
    }
    else if (t.kind === "police") out[mid].push({ kind: "policeLamp", offset: b.inner - 0.12, worldH: 1250, elev: 0 });
  }
  return out;
}

export function positionAt(track: Track, t: number): number {
  const f = t * TABLE_HZ;
  const i = Math.min(track.pos.length - 2, Math.floor(f));
  const z = track.pos[i] + (track.pos[i + 1] - track.pos[i]) * (f - i);
  return ((z % track.length) + track.length) % track.length;
}

export function bgAt(track: Track, camZ: number): number {
  const sf = camZ / SEG_L;
  const s = Math.floor(sf) % track.n;
  return track.bg[s] + (track.bg[s + 1] - track.bg[s]) * (sf - Math.floor(sf));
}

/**
 * Per-frame lateral road offsets ahead of the camera, relative to the camera's
 * heading. Integrates curvature segment by segment so asphalt, kerbs, rails and
 * sprites all follow one centreline.
 */
export class CurveFrame {
  readonly X: Float64Array;
  D0 = 0;
  c0 = 0;
  base = 0;

  constructor(readonly size: number) {
    this.X = new Float64Array(size + 1);
  }

  update(track: Track, camZ: number): void {
    const { n, curve } = track;
    const base = Math.floor(camZ / SEG_L);
    const r = 1 - (camZ / SEG_L - base);
    const c0 = curve[base % n];
    this.base = base;
    this.c0 = c0;
    this.D0 = r * SEG_L;
    let x = 0.5 * c0 * r * r;
    let dx = c0 * r;
    this.X[0] = x;
    for (let k = 0; k < this.size; k++) {
      const c = curve[(base + 1 + k) % n];
      x += dx + 0.5 * c;
      dx += c;
      this.X[k + 1] = x;
    }
  }

  offAt(d: number): number {
    if (d <= this.D0) {
      const u = d / SEG_L;
      return 0.5 * this.c0 * u * u;
    }
    const kf = (d - this.D0) / SEG_L;
    const k = Math.floor(kf);
    if (k >= this.size) return this.X[this.size];
    return this.X[k] + (this.X[k + 1] - this.X[k]) * (kf - k);
  }
}
