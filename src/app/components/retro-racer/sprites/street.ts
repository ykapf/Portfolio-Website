import { ROAD_HALF, SEG_L } from "../config";
import { PixelGrid, RGB, mix, pack, rgb } from "../pixels";
import { BuildingType } from "../track";
import { Canvas, Fill, canvas, painter, worldSign } from "./facadeKit";

/**
 * High-street buildings, each with its own silhouette, materials and signage.
 * Every builder draws either the road-facing side or the camera-facing end
 * from the same description, in world units (y up from the ground).
 */

const SHADOW = rgb(60, 40, 96);
const WHITE = rgb(250, 248, 244);
const INK = rgb(40, 28, 60);
const WARM = rgb(255, 206, 140);
const OUTLINE = rgb(48, 32, 70);

interface Face {
  cv: Canvas;
  f: Fill;
  len: number;
  side: boolean;
  T: number;
  /** Structural colour; the end wall sits in the building's own shadow. */
  s: (c: RGB) => number;
}

/** Emissive colour (neon, lit glass): never shaded. */
const glow = (c: RGB) => pack(c);

function makeFace(t: BuildingType, T: number, side: boolean): Face {
  const len = side ? t.segs * SEG_L : t.width * ROAD_HALF;
  const cv = canvas(len, t.worldH, T);
  return {
    cv,
    f: painter(cv),
    len,
    side,
    T,
    s: side ? (c) => pack(c) : (c) => pack(mix(c, SHADOW, 0.3)),
  };
}

/** Fills each texel row in [y0, y1] with the world-space span returned for its height. */
function rows(F: Face, y0: number, y1: number, span: (wy: number) => readonly [number, number] | null, c: number): void {
  const { cv, T } = F;
  for (let py = Math.max(0, cv.Y(y1)); py < Math.min(cv.h, cv.Y(y0)); py++) {
    const sp = span((cv.h - py - 0.5) * T);
    if (!sp) continue;
    const x0 = cv.X(sp[0]);
    const x1 = Math.max(x0 + 1, cv.X(sp[1]));
    cv.g.rect(x0, py, x1 - x0, 1, c);
  }
}

function disc(F: Face, x: number, y: number, r: number, c: number): void {
  F.cv.g.disc(F.cv.X(x), F.cv.Y(y), Math.max(0.5, r / F.T), c);
}

/** Five-point star, for the precinct badge. */
function star(F: Face, cx: number, cy: number, r: number, c: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push([cx + Math.cos(a) * rr, cy - Math.sin(a) * rr]);
  }
  rows(F, cy - r, cy + r, (wy) => {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= wy && y1 > wy) || (y1 <= wy && y0 > wy)) xs.push(x0 + ((wy - y0) / (y1 - y0)) * (x1 - x0));
    }
    if (xs.length < 2) return null;
    return [Math.min(...xs), Math.max(...xs)];
  }, c);
}

/** Evenly spaced bay centres across the face. */
function bays(len: number, bay: number): number[] {
  const n = Math.max(1, Math.floor(len / bay));
  const pad = (len - n * bay) / 2;
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(pad + bay * (i + 0.5));
  return out;
}

/** Stainless railcar diner: barrel roof, ribbon windows, central vestibule with clock, sign on the roof. */
function diner(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv, T } = F;
  const steel = rgb(204, 210, 226);
  const steelHi = rgb(240, 244, 252);
  const steelSh = rgb(150, 156, 186);
  const blue = t.accent;
  const navy = rgb(28, 36, 100);
  const roofBase = 1000;
  const roofTop = 1150;
  f(0, 0, len, 110, s(rgb(60, 56, 80)));
  f(0, 110, len, 330, s(blue));
  f(0, 210, len, 230, s(mix(blue, WHITE, 0.55)));
  f(0, 330, len, 365, s(WHITE));
  f(0, 365, len, 780, s(steel));
  f(0, 780, len, 830, s(blue));
  f(0, 830, len, roofBase, s(steel));
  if (T <= 24) for (let wy = 850; wy < roofBase; wy += 50) f(0, wy, len, wy + 14, s(steelHi));
  rows(F, roofBase, roofTop, (wy) => {
    const k = (wy - roofBase) / (roofTop - roofBase);
    if (side) {
      const inset = 170 * (1 - Math.sqrt(Math.max(0, 1 - k * k)));
      return [inset, len - inset];
    }
    const half = (len / 2) * Math.sqrt(Math.max(0, 1 - k * k));
    return [len / 2 - half, len / 2 + half];
  }, s(steelHi));
  f(0, roofBase, len, roofBase + 30, s(steelSh));

  const door = side ? len / 2 : -1e9;
  for (const bx of bays(len, 330)) {
    if (Math.abs(bx - door) < 330) continue;
    f(bx - 140, 410, bx + 140, 750, s(WHITE));
    f(bx - 120, 428, bx + 120, 732, glow(WARM));
    f(bx - 120, 650, bx + 120, 732, glow(rgb(250, 238, 220)));
    f(bx - 120, 428, bx + 120, 480, glow(rgb(220, 70, 80)));
  }

  if (side) {
    const v0 = len / 2 - 260;
    const v1 = len / 2 + 260;
    f(v0, 0, v1, 1190, s(steelSh));
    if (T <= 24) for (let x = v0 + 40; x < v1 - 20; x += 80) f(x, 120, x + 20, 1170, s(steelHi));
    f(v0, 1170, v1, 1190, s(WHITE));
    f(len / 2 - 120, 110, len / 2 + 120, 780, s(rgb(150, 40, 54)));
    f(len / 2 - 90, 430, len / 2 + 90, 720, glow(WARM));
    f(v0 - 60, 0, v1 + 60, 110, s(rgb(64, 132, 92)));
    disc(F, len / 2, 1000, 80, s(WHITE));
    if (T <= 24) {
      f(len / 2 - 6, 1000, len / 2 + 6, 1050, s(INK));
      f(len / 2, 994, len / 2 + 40, 1006, s(INK));
    }
    for (const px of [len * 0.3, len * 0.7]) f(px - 25, roofTop - 30, px + 25, 1320, s(rgb(60, 56, 80)));
    f(len * 0.14, 1300, len * 0.86, 1790, glow(rgb(130, 176, 255)));
    f(len * 0.14 + 30, 1330, len * 0.86 - 30, 1760, s(navy));
    worldSign(cv, t.sign ?? "", len * 0.14 + 40, 1340, len * 0.86 - 40, 1750, glow(rgb(255, 96, 130)), true);
  } else {
    f(180, roofTop - 20, 240, 1790, s(navy));
  }
}

/** Pizzeria: brick wainscot, arched windows, tricolour awning, giant slice on the roof. */
function pizza(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv, T } = F;
  const green = t.accent;
  const red = rgb(210, 44, 50);
  const brick = rgb(170, 84, 66);
  const top = 1300;
  f(0, 0, len, top, s(t.body));
  f(0, 80, len, 300, s(brick));
  if (T <= 24) for (let wy = 150; wy < 300; wy += 70) f(0, wy, len, wy + 12, s(mix(brick, WHITE, 0.4)));
  f(0, 0, len, 80, s(rgb(90, 60, 70)));
  const bx = bays(len, 420);
  const doorAt = side && bx.length > 1 ? 1 : -1;
  bx.forEach((c, i) => {
    if (i === doorAt) {
      f(c - 110, 80, c + 110, 780, s(rgb(90, 50, 40)));
      f(c - 80, 380, c + 80, 720, glow(WARM));
      return;
    }
    f(c - 150, 300, c + 150, 700, s(green));
    rows(F, 700, 830, (wy) => {
      const k = (wy - 700) / 130;
      const half = 150 * Math.sqrt(Math.max(0, 1 - k * k));
      return [c - half, c + half];
    }, s(green));
    f(c - 120, 320, c + 120, 700, glow(rgb(255, 190, 110)));
    rows(F, 700, 800, (wy) => {
      const k = (wy - 700) / 100;
      const half = 120 * Math.sqrt(Math.max(0, 1 - k * k));
      return [c - half, c + half];
    }, glow(rgb(255, 214, 150)));
  });
  const stripe = 110;
  for (let x = 0; x < len; x += stripe) f(x, 860, x + stripe, 1000, s([green, WHITE, red][Math.floor(x / stripe) % 3]));
  f(0, 840, len, 860, s(mix(green, INK, 0.4)));
  f(0, 1040, len, 1240, s(WHITE));
  f(0, 1040, len, 1060, s(green));
  f(0, 1220, len, 1240, s(green));
  worldSign(cv, t.sign ?? "", 40, 1065, len - 40, 1215, s(red), side);
  f(0, top - 40, len, top, s(mix(t.body, INK, 0.25)));

  const c = len / 2;
  f(c - 20, top, c + 20, 1370, s(INK));
  rows(F, 1360, 1740, (wy) => {
    const half = (280 * (wy - 1360)) / 380;
    return [c - half, c + half];
  }, glow(rgb(255, 206, 80)));
  rows(F, 1660, 1740, (wy) => {
    const half = (280 * (wy - 1360)) / 380;
    return [c - half, c + half];
  }, glow(rgb(214, 140, 70)));
  disc(F, c - 80, 1570, 40, glow(red));
  disc(F, c + 75, 1600, 36, glow(red));
  disc(F, c, 1470, 30, glow(red));
}

/** Nightclub: black glossy box, neon tubes, glowing doorway with rope, big neon name. */
function club(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv, T } = F;
  const pink = t.accent;
  const cyan = rgb(110, 240, 255);
  f(0, 0, len, t.worldH, s(t.body));
  f(0, 0, len, 80, s(rgb(20, 12, 30)));
  if (T <= 24) for (let x = 0; x < len; x += 200) f(x, 80, x + 10, 1500, s(mix(t.body, WHITE, 0.1)));
  let i = 0;
  for (let x = 150; x < len - 100; x += 380, i++) f(x, 280, x + 40, 1040, glow(i % 2 ? cyan : pink));
  const c = side ? len / 2 : len * 0.55;
  f(c - 260, 0, c + 260, 820, s(rgb(20, 12, 30)));
  f(c - 200, 80, c + 200, 760, glow(rgb(170, 60, 220)));
  f(c - 80, 80, c + 80, 700, glow(rgb(255, 170, 240)));
  f(c - 340, 820, c + 340, 900, s(rgb(16, 10, 24)));
  f(c - 340, 820, c + 340, 845, glow(pink));
  for (const px of [c - 330, c + 330]) f(px - 15, 80, px + 15, 300, glow(rgb(255, 206, 90)));
  f(c - 330, 230, c - 230, 250, glow(rgb(200, 30, 60)));
  f(c + 230, 230, c + 330, 250, glow(rgb(200, 30, 60)));
  f(0, 1080, len, 1100, glow(cyan));
  worldSign(cv, t.sign ?? "", 60, 1120, len - 60, 1480, glow(pink), side);
  f(0, t.worldH - 50, len, t.worldH, glow(pink));
}

/** Art Deco picture house: stepped crown, gold fins, bulb-lit marquee, poster cases. */
function cinema(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv } = F;
  const gold = t.accent;
  const deep = mix(t.body, INK, 0.45);
  const main = 1900;
  const crown = t.worldH;
  const c = len / 2;
  const tw = side ? len * 0.3 : len * 0.5;
  f(0, 0, len, main, s(t.body));
  f(c - tw / 2 - 120, main, c + tw / 2 + 120, 2100, s(t.body));
  f(c - tw / 2, 2100, c + tw / 2, crown, s(t.body));
  f(c - tw / 2 - 120, 2080, c + tw / 2 + 120, 2100, s(gold));
  f(c - tw / 2, crown - 30, c + tw / 2, crown, s(gold));
  f(0, main - 30, len, main, s(gold));
  for (let x = c - tw / 2 + 60; x < c + tw / 2 - 40; x += 120) f(x, 1250, x + 30, crown - 50, s(gold));
  for (const bx of bays(len, 300)) {
    if (Math.abs(bx - c) < tw / 2 + 60) continue;
    f(bx - 80, 1290, bx + 80, 1760, s(gold));
    f(bx - 64, 1306, bx + 64, 1744, s(deep));
  }
  f(0, 780, len, 820, glow(rgb(255, 220, 140)));
  f(0, 820, len, 1180, s(rgb(30, 20, 36)));
  f(0, 860, len, 1140, glow(rgb(252, 246, 226)));
  for (let x = 30; x < len; x += 90) {
    f(x, 830, x + 30, 850, glow(rgb(255, 236, 150)));
    f(x, 1150, x + 30, 1170, glow(rgb(255, 236, 150)));
  }
  worldSign(cv, side ? (t.sign ?? "") : "CINEMA", 60, 870, len - 60, 1130, glow(INK), side);
  f(0, 0, len, 80, s(rgb(60, 30, 40)));
  const posters = [rgb(255, 120, 160), rgb(90, 200, 255), rgb(255, 196, 80)];
  bays(len, 360).forEach((bx, i) => {
    if (i % 2 === 0) {
      f(bx - 110, 150, bx + 110, 650, s(gold));
      f(bx - 90, 170, bx + 90, 630, glow(posters[(i / 2) % 3]));
      f(bx - 90, 170, bx + 90, 300, glow(mix(posters[(i / 2) % 3], INK, 0.5)));
    } else {
      f(bx - 130, 80, bx + 130, 700, glow(rgb(255, 200, 120)));
      f(bx - 8, 80, bx + 8, 700, s(gold));
    }
  });
}

/** Victorian-style brick station: stone base and cornice, sash windows, columned portico. */
function policeBrick(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv, T } = F;
  const brick = t.body;
  const stone = rgb(222, 218, 214);
  const stoneSh = mix(stone, INK, 0.25);
  const glass = rgb(46, 64, 110);
  const top = t.worldH - 100;
  f(0, 0, len, top, s(brick));
  if (T <= 24) {
    const mortar = s(mix(brick, WHITE, 0.3));
    for (let wy = 300, row = 0; wy < top; wy += 80, row++) {
      f(0, wy, len, wy + Math.max(T, 12), mortar);
      if (T <= 12) for (let x = (row % 2) * 110; x < len; x += 220) f(x, wy, x + 12, wy + 80, mortar);
    }
  }
  f(0, 0, len, 300, s(stone));
  f(0, 280, len, 300, s(stoneSh));
  f(0, top, len, t.worldH, s(stone));
  f(0, top, len, top + 20, s(stoneSh));
  if (T <= 24) for (let x = 0; x < len; x += 80) f(x, top - 50, x + 40, top, s(stone));
  const c = len / 2;
  const portico = side ? c : -1e9;
  bays(len, 360).forEach((bx, i) => {
    if (Math.abs(bx - portico) < 420) return;
    for (const [y0, y1] of [[400, 850], [1050, 1450]] as const) {
      f(bx - 110, y0 - 40, bx + 110, y0, s(stone));
      f(bx - 90, y0, bx + 90, y1, s(glass));
      if ((i + y0 / 50) % 3 === 0) f(bx - 84, y0 + 6, bx + 84, y1 - 6, glow(rgb(255, 226, 160)));
      f(bx - 100, y1, bx + 100, y1 + 60, s(stone));
      f(bx - 6, y0, bx + 6, y1, s(WHITE));
      f(bx - 90, (y0 + y1) / 2 - 6, bx + 90, (y0 + y1) / 2 + 6, s(WHITE));
    }
  });
  if (side) {
    f(c - 340, 0, c + 340, 110, s(stoneSh));
    f(c - 300, 110, c + 300, 200, s(stone));
    f(c - 140, 200, c + 140, 820, s(rgb(30, 40, 80)));
    f(c - 140, 840, c + 140, 960, glow(rgb(255, 226, 160)));
    for (const px of [c - 270, c + 210]) {
      f(px, 200, px + 60, 1000, s(stone));
      f(px + 44, 200, px + 60, 1000, s(stoneSh));
    }
    f(c - 320, 1000, c + 320, 1080, s(stone));
    rows(F, 1080, 1300, (wy) => {
      const half = 320 * (1 - (wy - 1080) / 220);
      return [c - half, c + half];
    }, s(stone));
    rows(F, 1100, 1240, (wy) => {
      const half = 240 * (1 - (wy - 1100) / 160);
      return [c - half, c + half];
    }, s(stoneSh));
  }
  const sx0 = side ? c - 620 : 60;
  const sx1 = side ? c + 620 : len - 60;
  f(sx0, 1540, sx1, 1780, s(stone));
  worldSign(cv, "POLICE", sx0 + 20, 1555, sx1 - 20, 1765, s(t.accent), side);
}

/** Modern precinct: white concrete, full-height glazing, checkered band, big blue name band. */
function policeModern(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv } = F;
  const blue = t.accent;
  const glass = rgb(60, 96, 150);
  const c = len / 2;
  f(0, 0, len, t.worldH, s(t.body));
  f(0, 80, len, 760, s(glass));
  f(c - 320, 80, c + 320, 700, glow(rgb(220, 236, 255)));
  for (let x = 0; x < len; x += 300) f(x, 80, x + 24, 760, s(blue));
  f(0, 0, len, 80, s(mix(t.body, INK, 0.3)));
  for (let x = 0, k = 0; x < len; x += 100, k++) {
    for (let r = 0; r < 2; r++) f(x, 820 + r * 90, x + 100, 910 + r * 90, s((k + r) % 2 === 0 ? blue : WHITE));
  }
  f(0, 1020, len, 1310, s(blue));
  worldSign(cv, "POLICE", 60, 1040, len - 60, 1290, glow(WHITE), side);
  f(0, 1370, len, 1560, s(glass));
  for (let x = 0; x < len; x += 150) f(x, 1370, x + 16, 1560, s(t.body));
  f(0, t.worldH - 60, len, t.worldH, s(mix(t.body, INK, 0.2)));
}

/** Art Deco precinct: stucco with fluted pilasters, portholes, tower with a gold star badge. */
function policeDeco(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv } = F;
  const blue = t.accent;
  const gold = rgb(240, 196, 80);
  const main = t.worldH - 300;
  const c = len / 2;
  f(0, 0, len, main, s(t.body));
  f(c - 300, main, c + 300, t.worldH, s(t.body));
  f(c - 300, t.worldH - 30, c + 300, t.worldH, s(blue));
  f(0, main - 30, len, main, s(blue));
  for (let x = 100; x < len - 60; x += 400) {
    f(x, 80, x + 60, main - 30, s(mix(t.body, WHITE, 0.35)));
    f(x + 60, 80, x + 76, main - 30, s(mix(t.body, INK, 0.2)));
  }
  for (const bx of bays(len, 400)) {
    if (side && Math.abs(bx - c) < 260) continue;
    disc(F, bx + 30, 1300, 100, s(blue));
    disc(F, bx + 30, 1300, 72, s(rgb(50, 70, 120)));
    f(bx - 60, 300, bx + 120, 780, s(rgb(50, 70, 120)));
  }
  f(0, 880, len, 950, s(blue));
  f(c - 150, 80, c + 150, 820, s(rgb(26, 36, 80)));
  f(c - 150, 700, c + 150, 820, glow(rgb(255, 226, 160)));
  f(0, 0, len, 80, s(mix(t.body, INK, 0.3)));
  star(F, c, main + 150, 120, s(gold));
  worldSign(cv, "POLICE", Math.max(40, c - 620), 980, Math.min(len - 40, c + 620), 1150, s(blue), side);
}

/** Tiki bar: bamboo walls, thatched roof with a ragged fringe, glowing bar, torches. */
function tiki(F: Face, t: BuildingType): void {
  const { f, len, side, s, cv, T } = F;
  const bamboo = t.body;
  const dark = mix(bamboo, INK, 0.45);
  const straw = rgb(226, 190, 110);
  const strawDk = rgb(170, 128, 70);
  const c = len / 2;
  f(0, 0, len, 1000, s(bamboo));
  if (T <= 24) {
    for (let x = 0; x < len; x += 70) f(x, 0, x + 14, 1000, s(dark));
    for (let wy = 200; wy < 1000; wy += 260) f(0, wy, len, wy + 12, s(dark));
  }
  const open = Math.min(380, len * 0.36);
  f(c - open, 300, c + open, 820, glow(rgb(255, 150, 80)));
  if (T <= 24) {
    const bottles = [rgb(120, 240, 180), rgb(255, 220, 120), rgb(255, 120, 160)];
    let k = 0;
    for (let x = c - open + 40; x < c + open - 40; x += 60, k++) f(x, 640, x + 24, 760, glow(bottles[k % 3]));
  }
  f(c - open - 40, 260, c + open + 40, 380, s(rgb(110, 60, 40)));
  f(0, 1000, len, t.worldH, s(straw));
  for (let x = 0; x < len; x += 60) {
    rows(F, 880, 1000, (wy) => {
      const half = 30 * (1 - (1000 - wy) / 120);
      return [x + 30 - half, x + 30 + half];
    }, s(straw));
    if (T <= 24 && (x / 60) % 2 === 0) f(x, 1000, x + 10, t.worldH, s(strawDk));
  }
  f(c - 300, 1060, c + 300, 1280, s(rgb(100, 56, 36)));
  worldSign(cv, t.sign ?? "", c - 280, 1070, c + 280, 1270, glow(rgb(255, 150, 70)), side);
  for (const px of [120, len - 120]) {
    f(px - 15, 0, px + 15, 950, s(rgb(80, 50, 30)));
    f(px - 35, 950, px + 35, 1080, glow(rgb(255, 150, 50)));
    f(px - 15, 970, px + 15, 1050, glow(rgb(255, 230, 140)));
  }
}

const BUILDERS: Partial<Record<BuildingType["kind"], (F: Face, t: BuildingType) => void>> = {
  diner,
  pizza,
  club,
  cinema,
  tiki,
};

const POLICE = [policeBrick, policeModern, policeDeco];

export const isStreetKind = (t: BuildingType) => t.kind === "police" || BUILDERS[t.kind] !== undefined;

/** Road-facing side (`side`) or camera-facing end wall of a high-street building. */
export function streetFace(t: BuildingType, T: number, side: boolean): PixelGrid {
  const F = makeFace(t, T, side);
  const build = t.kind === "police" ? POLICE[t.variant % POLICE.length] : BUILDERS[t.kind];
  build?.(F, t);
  if (T <= 48) F.cv.g.outline(pack(OUTLINE));
  return F.cv.g;
}
