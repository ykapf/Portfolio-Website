import { HAZE_LAND, ROAD_HALF, SEG_L } from "../config";
import { forEachVerticalTextPixel } from "../font";
import { PixelGrid, RGB, mix, pack, rgb } from "../pixels";
import { BUILDING_TYPES, BuildingType } from "../track";
import { FOG_LEVELS } from "./index";
import { canvas, sign } from "./facadeKit";
import { isStreetKind, streetFace } from "./street";

/**
 * Roadside buildings rendered as real boxes: a road-facing facade mapped in
 * perspective along the road, plus a backlit end wall facing the camera.
 * Textures are authored in world units and rasterised at several texel sizes.
 */

/** World units per texel for each LOD, finest first. */
export const BUILDING_TEXEL = [12, 24, 48, 96] as const;

const FLOOR = 520;
const GROUND = 620;
const TOWER = 380;
const PARAPET = 140;
const BAY = 420;

function palette(t: BuildingType) {
  const shade = mix(t.body, rgb(70, 46, 110), 0.42);
  return {
    base: pack(t.body),
    hi: pack(mix(t.body, rgb(255, 250, 244), 0.35)),
    shade: pack(shade),
    deep: pack(mix(t.body, rgb(40, 28, 70), 0.65)),
    trim: pack(rgb(250, 246, 242)),
    trimShade: pack(mix(rgb(250, 246, 242), shade, 0.55)),
    glass: pack(rgb(54, 86, 128)),
    glassHi: pack(rgb(110, 150, 190)),
    glassDark: pack(rgb(36, 52, 92)),
    lit: pack(rgb(255, 212, 140)),
    litWarm: pack(rgb(255, 180, 110)),
    accent: pack(t.accent),
    accentDark: pack(mix(t.accent, rgb(30, 20, 50), 0.45)),
    panel: pack(rgb(34, 24, 52)),
    outline: pack(rgb(48, 32, 70)),
  };
}
type Pal = ReturnType<typeof palette>;

/** Upper-floor band boundaries in world units from the ground, shared by both faces. */
function floors(top: number): number[] {
  const n = Math.max(1, Math.floor((top - GROUND - PARAPET) / FLOOR));
  const fh = (top - GROUND - PARAPET) / n;
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(GROUND + i * fh);
  return out;
}

function hotelFacade(t: BuildingType, T: number): PixelGrid {
  const P = palette(t);
  const len = t.segs * SEG_L;
  const { g, w, h, Y, X } = canvas(len, t.worldH, T);
  const mainH = t.worldH - TOWER;
  const t0 = len * (0.5 - t.tower / 2);
  const t1 = len * (0.5 + t.tower / 2);

  g.rect(0, Y(mainH), w, h, P.base);
  g.rect(X(t0), 0, X(t1) - X(t0), h, P.base);
  const fl = floors(mainH);

  for (let i = 0; i + 1 < fl.length; i++) {
    const yb = fl[i];
    const yt = fl[i + 1];
    const winTop = yt - (yt - yb) * 0.3;
    const winBot = yb + (yt - yb) * 0.18;
    for (let bx = BAY * 0.5; bx + BAY * 0.5 <= len; bx += BAY) {
      const x0 = X(bx - BAY * 0.27);
      const x1 = X(bx + BAY * 0.27);
      const tower = bx > t0 && bx < t1;
      g.rect(x0, Y(winTop), Math.max(1, x1 - x0), Math.max(1, Y(winBot) - Y(winTop)), tower ? P.glassDark : P.glass);
      if (T <= 24) g.rect(x0, Y(winTop), Math.max(1, x1 - x0), 1, P.glassHi);
      if (!tower && T <= 48 && ((bx / BAY) * 7 + i * 3) % 5 < 1) {
        g.rect(x0, Y(winTop) + 1, Math.max(1, x1 - x0), Math.max(1, Y(winBot) - Y(winTop) - 1), P.lit);
      }
    }
    const ledge = Y(yt - (yt - yb) * 0.2);
    g.rect(0, ledge, w, Math.max(1, X(50)), P.trim);
    g.rect(0, ledge + Math.max(1, X(50)), w, 1, P.shade);
  }

  const finStep = Math.max(2, X(140));
  for (let x = X(t0) + finStep; x < X(t1) - 1; x += finStep) g.rect(x, Y(mainH + TOWER - 80), 1, Y(GROUND) - Y(mainH + TOWER - 80), P.hi);
  g.rect(X(t0), Y(mainH + TOWER), X(t1) - X(t0), Math.max(1, X(40)), P.trim);
  g.rect(X(t0) - X(60), Y(mainH + 120), X(t1) - X(t0) + 2 * X(60), Math.max(1, X(120)), P.base);
  g.rect(X(t0) - X(60), Y(mainH + 120), X(t1) - X(t0) + 2 * X(60), Math.max(1, X(30)), P.trim);
  g.rect(X(t0), Y(mainH + TOWER), 1, h, P.shade);

  g.rect(0, Y(mainH), w, Math.max(1, X(40)), P.trim);
  g.rect(0, Y(mainH - PARAPET), w, 1, P.shade);

  groundFloorShops(g, P, len, X, Y, (bx) => bx > t0 && bx < t1);
  g.rect(0, Y(mainH), Math.max(1, X(60)), h, P.trim);

  if (t.sign && T <= 48) {
    const k = Math.round(48 / T);
    const sx = X(BAY * 1.1);
    const top = Y(mainH - PARAPET) + k * 2;
    g.rect(sx - k, top - k, 5 * k, (t.sign.length * 6 + 1) * k, P.deep);
    forEachVerticalTextPixel(t.sign, (x, y) => g.rect(sx + (2 - x) * k, top + y * k, k, k, P.accent));
  } else if (t.sign) {
    g.rect(X(BAY * 1.1), Y(mainH - PARAPET), 1, Math.max(1, Y(GROUND) - Y(mainH - PARAPET)), P.accent);
  }

  if (T <= 48) g.outline(P.outline);
  g.rect(0, Y(mainH), 1, h, P.outline);
  return g;
}

/** Neon strip over a row of lit shopfronts; `door(bx)` marks entrance bays. */
function groundFloorShops(
  g: PixelGrid,
  P: Pal,
  len: number,
  X: (w: number) => number,
  Y: (w: number) => number,
  door: (bx: number) => boolean
): void {
  const w = g.w;
  g.rect(0, Y(GROUND), w, Math.max(1, X(30)), P.accent);
  g.rect(0, Y(GROUND) + Math.max(1, X(30)), w, 1, P.deep);
  for (let bx = BAY * 0.5; bx + BAY * 0.5 <= len; bx += BAY) {
    const x0 = X(bx - BAY * 0.32);
    const x1 = X(bx + BAY * 0.32);
    g.rect(x0, Y(GROUND - 120), Math.max(1, x1 - x0), Y(0) - Y(GROUND - 120), door(bx) ? P.deep : P.lit);
  }
  g.rect(0, Y(80), w, g.h, P.deep);
}

/** Modern block: balcony slabs on every floor, a darker stair core, lit lobby. */
function apartmentFacade(t: BuildingType, T: number): PixelGrid {
  const P = palette(t);
  const len = t.segs * SEG_L;
  const { g, w, h, Y, X } = canvas(len, t.worldH, T);
  g.rect(0, 0, w, h, P.base);
  const fl = floors(t.worldH);
  const core = len * 0.62;
  for (let i = 0; i + 1 < fl.length; i++) {
    const yb = fl[i];
    const yt = fl[i + 1];
    for (let bx = BAY * 0.5; bx + BAY * 0.5 <= len; bx += BAY) {
      if (Math.abs(bx - core) < BAY * 0.5) continue;
      const x0 = X(bx - BAY * 0.36);
      const x1 = X(bx + BAY * 0.36);
      const winTop = Y(yt - 70);
      const winH = Math.max(1, Y(yb + 60) - winTop);
      const lit = ((bx / BAY) * 5 + i * 7) % 6 < 1;
      g.rect(x0, winTop, Math.max(1, x1 - x0), winH, lit ? P.litWarm : P.glass);
      if (T <= 24 && !lit) g.rect(x0, winTop, Math.max(1, x1 - x0), 1, P.glassHi);
      // Balcony: railing band across the lower window, slab underneath.
      const rail = Y(yb + 200);
      g.rect(x0 - 1, rail, Math.max(1, x1 - x0) + 2, Math.max(1, X(30)), P.trim);
      g.rect(x0 - 1, rail + Math.max(1, X(30)), Math.max(1, x1 - x0) + 2, Math.max(1, Y(yb) - rail - Math.max(1, X(30))), P.hi);
    }
    g.rect(0, Y(yb), w, Math.max(1, X(50)), P.trim);
    g.rect(0, Y(yb) + Math.max(1, X(50)), w, 1, P.shade);
  }
  g.rect(X(core - BAY * 0.4), Y(t.worldH - PARAPET), Math.max(1, X(BAY * 0.8)), Y(GROUND) - Y(t.worldH - PARAPET), P.shade);
  for (let i = 0; i + 1 < fl.length; i++) {
    g.rect(X(core - BAY * 0.12), Y(fl[i + 1] - 120), Math.max(1, X(BAY * 0.24)), Math.max(1, X(220)), P.glassDark);
  }
  g.rect(0, 0, w, Math.max(1, X(PARAPET * 0.6)), P.trim);
  groundFloorShops(g, P, len, X, Y, (bx) => Math.abs(bx - core) < BAY * 0.5);
  g.rect(0, 0, Math.max(1, X(60)), h, P.trim);
  if (T <= 48) g.outline(P.outline);
  return g;
}

/**
 * Kiosk wall behind the forecourt, seen under the canopy: a pale shop with big
 * lit windows, a door, posters and an ice chest. The pumps are separate sprites.
 */
function gasKiosk(g: PixelGrid, P: Pal, len: number, X: (w: number) => number, Y: (w: number) => number, T: number): void {
  const wall = pack(rgb(232, 226, 236));
  const fasciaBot = 770;
  g.rect(0, Y(fasciaBot), g.w, Y(0) - Y(fasciaBot), wall);
  g.rect(0, Y(fasciaBot), g.w, Math.max(1, X(60)), pack(rgb(250, 246, 255)));
  // Canopy downlights along the underside.
  for (let x = 120; x < len; x += 260) g.rect(X(x), Y(fasciaBot - 60), Math.max(1, X(90)), Math.max(1, X(30)), pack(rgb(255, 250, 220)));
  const win0 = len * 0.12;
  const win1 = len * 0.88;
  g.rect(X(win0), Y(560), Math.max(1, X(win1 - win0)), Y(110) - Y(560), P.panel);
  g.rect(X(win0 + 20), Y(540), Math.max(1, X(win1 - win0 - 40)), Y(130) - Y(540), P.lit);
  if (T <= 24) {
    // Shelves and mullions behind the glass.
    for (let wy = 220; wy < 520; wy += 90) g.rect(X(win0 + 20), Y(wy), Math.max(1, X(win1 - win0 - 40)), 1, P.litWarm);
    for (let x = win0 + 260; x < win1; x += 260) g.rect(X(x), Y(560), 1, Y(110) - Y(560), P.panel);
  }
  const door = len * 0.5;
  g.rect(X(door - 80), Y(600), Math.max(1, X(160)), Y(0) - Y(600), P.panel);
  g.rect(X(door - 64), Y(580), Math.max(1, X(128)), Y(20) - Y(580), pack(rgb(200, 240, 255)));
  const posters = [rgb(255, 90, 120), rgb(70, 200, 255), rgb(255, 210, 70)];
  [0.28, 0.72].forEach((fx, i) => {
    g.rect(X(len * fx - 60), Y(500), Math.max(1, X(120)), Math.max(1, X(160)), pack(posters[i]));
    g.rect(X(len * fx - 60), Y(500), Math.max(1, X(120)), Math.max(1, X(40)), pack(rgb(250, 248, 244)));
  });
  g.rect(X(len * 0.82), Y(240), Math.max(1, X(180)), Y(0) - Y(240), pack(rgb(240, 248, 255)));
  g.rect(X(len * 0.82), Y(240), Math.max(1, X(180)), Math.max(1, X(50)), pack(rgb(60, 150, 230)));
  // Concrete forecourt slab.
  g.rect(0, Y(60), g.w, g.h, pack(rgb(176, 168, 186)));
  g.rect(0, Y(60), g.w, 1, pack(rgb(210, 204, 216)));
}

/** Petrol station canopy: fascia on pillars over the kiosk; pumps stand in front as sprites. */
function gasFacade(t: BuildingType, T: number): PixelGrid {
  const P = palette(t);
  const len = t.segs * SEG_L;
  const { g, w, h, Y, X } = canvas(len, t.worldH, T);
  const fasciaBot = t.worldH - 280;
  gasKiosk(g, P, len, X, Y, T);
  for (let px = 180; px < len; px += 600) {
    g.rect(X(px), Y(fasciaBot), Math.max(1, X(70)), Y(0) - Y(fasciaBot), P.trim);
    g.rect(X(px) + Math.max(1, X(50)), Y(fasciaBot), Math.max(1, X(20)), Y(0) - Y(fasciaBot), P.trimShade);
  }
  g.rect(0, 0, w, Y(fasciaBot), P.base);
  g.rect(0, Y(fasciaBot + 90), w, Math.max(1, X(70)), P.accent);
  sign(g, t.sign ?? "", w * 0.3, 0, Y(fasciaBot + 110), w * 0.4, P.accent, true);
  g.rect(0, Y(20), w, h, P.deep);
  if (T <= 48) g.outline(P.outline);
  return g;
}

function facade(t: BuildingType, T: number): PixelGrid {
  switch (t.kind) {
    case "hotel":
      return hotelFacade(t, T);
    case "apartment":
      return apartmentFacade(t, T);
    case "gas":
      return gasFacade(t, T);
    default:
      return streetFace(t, T, true);
  }
}

/** Camera-facing end wall: in the building's own shadow, with a readable sign. */
function endWall(t: BuildingType, T: number): PixelGrid {
  if (isStreetKind(t)) return streetFace(t, T, false);
  const P = palette(t);
  const wide = t.width * ROAD_HALF;
  const { g, w, h, Y, X } = canvas(wide, t.worldH, T);
  const top = t.kind === "hotel" ? t.worldH - TOWER : t.worldH;
  const name = t.sign ?? "";

  if (t.kind === "gas") {
    const fasciaBot = t.worldH - 280;
    gasKiosk(g, P, wide, X, Y, T);
    for (const px of [120, wide * 0.5, wide - 190]) g.rect(X(px), Y(fasciaBot), Math.max(1, X(70)), Y(0) - Y(fasciaBot), P.trimShade);
    g.rect(0, 0, w, Y(fasciaBot), P.trimShade);
    g.rect(0, Y(fasciaBot + 90), w, Math.max(1, X(70)), P.accent);
    sign(g, name, w / 2, 0, Y(fasciaBot + 110), w - 4, P.accent, false);
    g.rect(0, Y(20), w, h, P.deep);
    if (T <= 48) g.outline(P.outline);
    return g;
  }

  g.rect(0, Y(top), w, h, P.shade);
  const fl = floors(top);
  for (let i = 0; i + 1 < fl.length; i++) {
    const yb = fl[i];
    const yt = fl[i + 1];
    for (const fx of [0.3, 0.7]) {
      const x0 = X(wide * fx - 110);
      g.rect(x0, Y(yt - (yt - yb) * 0.3), Math.max(1, X(220)), Math.max(1, X((yt - yb) * 0.52)), P.glassDark);
    }
    g.rect(0, Y(yt - (yt - yb) * 0.2), w, Math.max(1, X(50)), P.trimShade);
  }
  g.rect(0, Y(top), w, Math.max(1, X(40)), P.trimShade);
  g.rect(0, Y(GROUND), w, Math.max(1, X(30)), P.accent);
  g.rect(X(wide * 0.35), Y(GROUND - 120), Math.max(1, X(wide * 0.3)), Y(0) - Y(GROUND - 120), P.lit);
  g.rect(0, Y(80), w, h, P.deep);
  g.rect(0, Y(top), Math.max(1, X(60)), h, P.trim);
  if (T <= 48) g.outline(P.outline);
  g.rect(w - 1, Y(top), 1, h, P.outline);
  return g;
}

export interface BuildingTextures {
  /** [lod][fog] */
  facade: HTMLCanvasElement[][];
  end: HTMLCanvasElement[][];
}

export function buildBuildingTextures(): BuildingTextures[] {
  const fogged = (grid: PixelGrid) => FOG_LEVELS.map((f) => (f === 0 ? grid : grid.tinted(HAZE_LAND, f)).toCanvas());
  return BUILDING_TYPES.map((t) => ({
    facade: BUILDING_TEXEL.map((T) => fogged(facade(t, T))),
    end: BUILDING_TEXEL.map((T) => fogged(endWall(t, T))),
  }));
}

