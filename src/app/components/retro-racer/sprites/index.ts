import { HAZE_LAND, HAZE_WATER } from "../config";
import { PixelGrid, RGB, rgb } from "../pixels";
import { SceneryKind } from "../track";
import {
  BushSpec,
  PalmSpec,
  TreeSpec,
  UmbrellaSpec,
  bladeSign,
  bush,
  ferrisWheel,
  gasPump,
  gasPylon,
  lamp,
  martiniSign,
  palm,
  policeLamp,
  roundPalm,
  tree,
  umbrella,
} from "./scenery";

export interface SpriteLod {
  h: number;
  w: number;
  /** One canvas per FOG_LEVELS entry. */
  fog: HTMLCanvasElement[];
}

export interface SpriteSet {
  lods: SpriteLod[];
}

export const FOG_LEVELS = [0, 0.3, 0.6] as const;

function buildSet(gen: (h: number) => PixelGrid, minH: number, maxH: number, haze: RGB): SpriteSet {
  return buildFoggedSet((h, f) => (f === 0 ? gen(h) : gen(h).tinted(haze, f)), minH, maxH);
}

/** Like buildSet, but the generator applies the haze itself (so lights can stay bright). */
function buildFoggedSet(gen: (h: number, fog: number) => PixelGrid, minH: number, maxH: number): SpriteSet {
  const lods: SpriteLod[] = [];
  for (let h = minH; h <= maxH * 1.0001; h *= 1.3) {
    const hi = Math.round(h);
    const grids = FOG_LEVELS.map((f) => gen(hi, f));
    lods.push({ h: grids[0].h, w: grids[0].w, fog: grids.map((g) => g.toCanvas()) });
  }
  return { lods };
}

/** The rasterisation whose native height is closest (in log space) to the on-screen height. */
export function pickLod(set: SpriteSet, targetH: number): SpriteLod {
  let best = set.lods[0];
  let bestErr = Infinity;
  for (const lod of set.lods) {
    const err = Math.abs(Math.log(lod.h / targetH));
    if (err < bestErr) {
      bestErr = err;
      best = lod;
    }
  }
  return best;
}

const PALMS: readonly PalmSpec[] = [
  { seed: 3, lean: 0.55, fronds: 7 },
  { seed: 17, lean: -0.35, fronds: 8 },
  { seed: 41, lean: 0.15, fronds: 7 },
];

const ROUND_PALMS: readonly PalmSpec[] = [
  { seed: 5, lean: 0.45, fronds: 0 },
  { seed: 29, lean: -0.3, fronds: 0 },
  { seed: 53, lean: 0.1, fronds: 0 },
];

const BUSHES: readonly BushSpec[] = [
  { seed: 5, width: 1.6, flowers: null },
  { seed: 9, width: 2.1, flowers: null },
  { seed: 13, width: 1.3, flowers: null },
];

const FLOWERS: readonly BushSpec[] = [
  { seed: 21, width: 1.8, flowers: rgb(255, 92, 170) },
  { seed: 27, width: 1.5, flowers: rgb(255, 214, 90) },
];

const TREES: readonly TreeSpec[] = [
  { seed: 51, spread: 1.0 },
  { seed: 63, spread: 1.25 },
];

const UMBRELLAS: readonly UmbrellaSpec[] = [
  { a: rgb(255, 84, 120), b: rgb(250, 246, 236), tilt: 0.3 },
  { a: rgb(40, 190, 220), b: rgb(255, 222, 90), tilt: -0.25 },
  { a: rgb(255, 150, 60), b: rgb(250, 246, 236), tilt: 0.1 },
];

export const WHEEL_FRAMES = 4;

export type SceneryAssets = Record<SceneryKind, SpriteSet> & { wheel: SpriteSet[] };

export function buildSceneryAssets(): SceneryAssets {
  const palmGens = [
    ...PALMS.map((s) => (h: number, lean: number) => palm(h, { ...s, lean: s.lean * lean })),
    ...ROUND_PALMS.map((s) => (h: number, lean: number) => roundPalm(h, { ...s, lean: s.lean * lean })),
  ];
  const palmL = palmGens.map((gen) => buildSet((h) => gen(h, 1), 8, 320, HAZE_LAND));
  const palmR = palmGens.map((gen) => buildSet((h) => gen(h, -1).flipped(), 8, 320, HAZE_LAND));
  const bushes = BUSHES.map((s) => buildSet((h) => bush(h, s), 4, 100, HAZE_LAND));
  const flowers = FLOWERS.map((s) => buildSet((h) => bush(h, s), 4, 100, HAZE_LAND));
  const lampSet = buildSet(lamp, 8, 220, HAZE_LAND);
  const trees = TREES.map((s) => buildSet((h) => tree(h, s), 6, 260, HAZE_LAND));
  const umbrellas = UMBRELLAS.map((s) => buildSet((h) => umbrella(h, s), 4, 90, HAZE_LAND));
  const wheel: SpriteSet[] = [];
  for (let f = 0; f < WHEEL_FRAMES; f++) {
    wheel.push(buildFoggedSet((h, fog) => ferrisWheel(h, f / WHEEL_FRAMES, fog, HAZE_WATER), 10, 90));
  }
  return {
    tree0: trees[0], tree1: trees[1],
    palmL0: palmL[0], palmL1: palmL[1], palmL2: palmL[2], palmL3: palmL[3], palmL4: palmL[4], palmL5: palmL[5],
    palmR0: palmR[0], palmR1: palmR[1], palmR2: palmR[2], palmR3: palmR[3], palmR4: palmR[4], palmR5: palmR[5],
    bush0: bushes[0], bush1: bushes[1], bush2: bushes[2],
    flower0: flowers[0], flower1: flowers[1],
    lampL: lampSet, lampR: lampSet,
    umbrella0: umbrellas[0], umbrella1: umbrellas[1], umbrella2: umbrellas[2],
    martini: buildSet(martiniSign, 8, 200, HAZE_LAND),
    cinemaSign: buildSet((h) => bladeSign(h, "CINEMA", rgb(150, 30, 52), rgb(255, 214, 96)), 8, 200, HAZE_LAND),
    gasPylon: buildSet(gasPylon, 8, 200, HAZE_LAND),
    gasPump: buildSet(gasPump, 6, 120, HAZE_LAND),
    policeLamp: buildSet(policeLamp, 6, 140, HAZE_LAND),
    wheel,
  };
}
