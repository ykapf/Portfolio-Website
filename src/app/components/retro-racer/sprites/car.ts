import { forEachTextPixel, textWidth } from "../font";
import { PixelGrid, RGB, pack, rgb, rng } from "../pixels";

/**
 * Rear-view Ferrari F40, authored as one mirrored half on a pixel grid.
 * Coordinates: `u` = pixel column outward from the centreline, `y` = row.
 * Proportions are measured off a straight-on rear photo of the real car.
 */

export const CAR_W = 132;
export const CAR_H = 64;
const BASE_W = 112;
const CX = 56;
const MARGIN = (CAR_W - BASE_W) / 2;
/** Continuous x of the centreline within the final sprite. */
export const CAR_CENTRE = MARGIN + CX;

/** Inner red tail/brake lamps and outer amber lamps. */
export const LIGHT_S = [35, 45.5] as const;
export const BRAKE_S = [35] as const;
export const LIGHT_Y = 34;
export const PIPE_S = [0, 5] as const;
export const PIPE_Y = 51;
/** Rear tyre centre and contact patch, in sprite pixels from the centreline / top. */
export const TYRE_S = 42.5;
export const TYRE_W = 16;
export const TYRE_BOTTOM = 63;

const PLATE_TEXT = "YKAPF";

const P = {
  outline: rgb(28, 6, 16),
  redDeep: rgb(98, 10, 26),
  redShadow: rgb(148, 18, 34),
  red: rgb(206, 30, 42),
  redLight: rgb(236, 70, 58),
  redHi: rgb(255, 128, 100),
  redSpec: rgb(255, 204, 170),
  black: rgb(12, 10, 16),
  meshA: rgb(44, 40, 52),
  meshB: rgb(20, 18, 26),
  fin: rgb(58, 54, 68),
  glass: rgb(58, 50, 82),
  glassHi: rgb(150, 132, 172),
  lexan: rgb(168, 150, 182),
  lexanHi: rgb(222, 206, 226),
  lexanDark: rgb(104, 92, 128),
  slot: rgb(24, 20, 34),
  script: rgb(236, 214, 204),
  lightRim: rgb(40, 8, 16),
  tyre: rgb(24, 22, 28),
  tyreGroove: rgb(84, 82, 94),
  tyreSide: rgb(36, 34, 42),
  tyreEdge: rgb(60, 58, 70),
  plate: rgb(250, 206, 44),
  plateHi: rgb(255, 236, 136),
  plateMid: rgb(238, 184, 38),
  plateLo: rgb(206, 148, 34),
  plateEdge: rgb(40, 34, 30),
  plateFrameHi: rgb(92, 84, 90),
  plateText: rgb(20, 18, 24),
  plateTextHi: rgb(70, 60, 50),
  band: rgb(30, 64, 168),
  bandHi: rgb(80, 120, 214),
  bandLo: rgb(18, 40, 120),
  screw: rgb(150, 140, 120),
  pipe: rgb(176, 170, 184),
  pipeIn: rgb(10, 8, 12),
  reflector: rgb(170, 22, 32),
  reflectorHi: rgb(240, 90, 70),
};

const RED_OFF = [rgb(150, 18, 30), rgb(204, 34, 40), rgb(244, 120, 84)] as const;
const RED_ON = [rgb(255, 44, 44), rgb(255, 134, 98), rgb(255, 240, 214)] as const;
const AMBER = [rgb(184, 90, 24), rgb(238, 146, 44), rgb(226, 222, 214)] as const;

/**
 * Vertical layout, top to bottom: a narrow roof, the louvred Lexan cover with
 * the wing crossing it about a quarter of the way down, rear wings that fill
 * out beneath the wing, the vented deck, the mesh tail panel and a deep bumper.
 */
const ROOF_Y = 0;
const GLASS_Y = 4;
const WING_Y = 10;
const FENDER_Y = 13;
const DECK_Y = 22;
const MESH_Y = 29;
const MESH_END = 40;
const SHUT_Y = 41;
const BUMPER_END = 53;
const TYRE_Y = 50;

/** Half-width of the Lexan cover; it widens toward the deck. */
const glassHalf = (y: number) => Math.round(22 + (y - GLASS_Y) * 0.5);
/** Outer edge of the red buttress framing the cover. */
const pillarOut = (y: number) => glassHalf(y) + 4;
/** Inner face of the wing endplate, leaning in toward the cabin at the top; the fin is PLATE_T pixels thick. */
const plateIn = (y: number) => Math.round(45 + (y - WING_Y + 1) * 0.3);
const PLATE_T = 3;
/** How far the rear-wing crest falls from the endplate to the buttress, leaving a see-through gap under the wing. */
const CREST_DROP = 6;
/** Body side: the rear wings flare out to full width at the deck. */
const bodyOut = (y: number) => (y >= DECK_Y ? 55 : Math.round(51 + (y - FENDER_Y) * 0.5));

function buildBase(brake: boolean, tread: number): PixelGrid {
  const g = new PixelGrid(BASE_W, CAR_H);
  const put = (u: number, y: number, c: RGB) => {
    const p = pack(c);
    g.set(CX + u, y, p);
    g.set(CX - 1 - u, y, p);
  };

  // Wide rear tyres under the bumper. Tread rows shift with `tread`.
  for (let y = TYRE_Y; y <= TYRE_BOTTOM; y++) {
    for (let u = 33; u <= 52; u++) {
      if (y === 63 && (u < 35 || u > 50)) continue;
      if (y === 62 && (u < 34 || u > 51)) continue;
      let c = P.tyre;
      if (u <= 34) c = P.tyreSide;
      else if (u >= 51) c = P.tyreEdge;
      else if ((y + tread) % 3 === 0 && u % 4 !== 1) c = P.tyreGroove;
      put(u, y, c);
    }
  }
  // Diffuser strakes between the tyres.
  for (let y = BUMPER_END + 1; y <= BUMPER_END + 3; y++) {
    for (let u = 0; u <= 31; u++) put(u, y, u % 8 === 4 ? P.fin : P.black);
  }

  // Rear wings. Inside the endplate the crest slopes down toward the cabin,
  // so the road shows through under the wing; small fillets angle the gap's
  // top corners into the buttress and the endplate.
  for (let y = FENDER_Y; y < DECK_Y; y++) {
    const from = pillarOut(y) + 1;
    const to = bodyOut(y);
    const pi = plateIn(y);
    const top = y - FENDER_Y;
    for (let u = from; u <= to; u++) {
      let k = top;
      if (u < pi) {
        const crest = FENDER_Y + Math.round(((pi - u) / (pi - from + 1)) * CREST_DROP);
        k = y - crest;
        if (k < 0) {
          if (u - from + top < 2 || pi - 1 - u + top < 2) put(u, y, P.redShadow);
          continue;
        }
      }
      let c: RGB = k === 0 ? P.redHi : k === 1 ? P.redLight : P.red;
      if (k >= 2 && u === from) c = P.redShadow;
      if (u === to) c = P.redDeep;
      else if (u === to - 1 && top >= 2) c = P.redShadow;
      put(u, y, c);
    }
  }

  // Cabin roof: narrow and rounded, lit from above.
  const roof = [18, 22, 24, 25];
  roof.forEach((e, i) => {
    const y = ROOF_Y + i;
    for (let u = 0; u <= e; u++) {
      let c: RGB = i === 0 ? (u < 10 ? P.redHi : P.redLight) : i === 1 ? (u < 14 ? P.redHi : P.red) : P.red;
      if (u === e) c = P.redShadow;
      else if (u === e - 1 && i >= 2) c = P.redLight;
      put(u, y, c);
    }
  });

  // The Lexan engine cover with its louvres, framed by the red buttresses.
  for (let y = GLASS_Y; y < DECK_Y; y++) {
    const gh = glassHalf(y);
    const louvre = louvreRow(y);
    for (let u = 0; u <= gh; u++) {
      let c: RGB = P.lexan;
      if (u <= 1 || u === gh) c = P.lexanDark;
      else if (y === DECK_Y - 1) c = P.slot;
      else if (louvre && u >= 3 && u <= gh - 2) c = louvre;
      else if (y >= 18) c = (u * 3 + y * 5) % 11 === 0 ? P.glassHi : P.glass;
      else if (u === gh - 1) c = P.lexanDark;
      put(u, y, c);
    }
    const po = pillarOut(y);
    put(gh + 1, y, P.redLight);
    for (let u = gh + 2; u < po; u++) put(u, y, P.red);
    put(po, y, y < FENDER_Y ? P.redShadow : P.red);
  }

  // Door mirrors on short stalks, just above the wing.
  for (let y = WING_Y - 4; y <= WING_Y - 1; y++) {
    for (let u = 32; u <= 37; u++) {
      const c = y === WING_Y - 1 ? P.black : y === WING_Y - 4 ? P.redHi : u === 37 ? P.redShadow : u === 32 ? P.black : P.red;
      put(u, y, c);
    }
  }
  for (let u = pillarOut(WING_Y - 2) + 1; u < 32; u++) put(u, WING_Y - 2, P.redShadow);

  // Endplates: thin fins from the wing tips down into the rear wings.
  for (let y = WING_Y - 1; y < DECK_Y - 1; y++) {
    const a = plateIn(y);
    const b = a + PLATE_T;
    for (let u = a; u <= b; u++) {
      let c: RGB = u === a ? P.redLight : u === b ? P.redDeep : u === b - 1 ? P.redShadow : P.red;
      if (y === WING_Y - 1) c = u === b ? P.redShadow : P.redHi;
      put(u, y, c);
    }
  }

  // The wing blade: lit top, red trailing face, dark underside.
  for (let u = 0; u < plateIn(WING_Y); u++) {
    put(u, WING_Y, u % 11 === 5 && u < 40 ? P.redSpec : P.redHi);
    put(u, WING_Y + 1, P.red);
    put(u, WING_Y + 2, P.redDeep);
  }

  // Deck with the twin slotted vents and the Ferrari script.
  for (let y = DECK_Y; y < MESH_Y; y++) {
    const k = y - DECK_Y;
    for (let u = 0; u <= 55; u++) {
      let c: RGB = k === 0 ? (u % 10 === 5 ? P.redSpec : P.redHi) : k === 2 ? P.redLight : k === 6 ? P.redShadow : P.red;
      if (k === 1 && u >= 17 && u <= 45) c = u === 17 || u === 45 ? P.redDeep : P.black;
      if (k === 3 && u >= 19 && u <= 43) c = u === 19 || u === 43 ? P.redDeep : P.black;
      if (u === 55) c = P.redDeep;
      else if (u === 54 && k >= 1) c = P.redShadow;
      put(u, y, c);
    }
  }
  const script = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
  script.forEach((on, i) => {
    if (on) g.set(CX - 6 + i, DECK_Y + 5, pack(P.script));
  });
  g.set(CX - 6, DECK_Y + 4, pack(P.script));

  // Black mesh panel with rounded corners inside the red tail frame.
  for (let y = MESH_Y; y <= MESH_END; y++) {
    const edge = y === MESH_Y || y === MESH_END;
    const pe = edge ? 50 : y === MESH_Y + 1 || y === MESH_END - 1 ? 51 : 52;
    for (let u = 0; u <= 55; u++) {
      let c: RGB;
      if (u <= pe) c = edge ? P.black : (u + y) % 2 === 0 ? P.meshA : P.meshB;
      else if (u === 55) c = P.redDeep;
      else if (u === 54) c = P.redShadow;
      else c = u === pe + 1 ? P.redDeep : P.red;
      put(u, y, c);
    }
  }
  for (let y = MESH_END - 3; y <= SHUT_Y; y++) put(54, y, P.black);

  // Four round lamps: red inboard, amber outboard.
  LIGHT_S.forEach((cs, i) => {
    const lens = i === 0 ? (brake ? RED_ON : RED_OFF) : AMBER;
    for (let y = LIGHT_Y - 6; y <= LIGHT_Y + 6; y++) {
      for (let u = Math.floor(cs - 6); u <= Math.ceil(cs + 6); u++) {
        const d = Math.hypot(u + 0.5 - cs, y + 0.5 - LIGHT_Y);
        if (d > 5.2) continue;
        put(u, y, d > 4.4 ? P.lightRim : d > 3.0 ? lens[0] : d > 1.1 ? lens[1] : lens[2]);
      }
    }
    put(Math.round(cs - 2.5), LIGHT_Y - 2, i === 0 && brake ? P.redSpec : rgb(255, 200, 160));
  });

  // Wide yellow rear plate.
  const pw = 30;
  const ph = 9;
  const px0 = CX - pw / 2;
  const py0 = LIGHT_Y - 4;
  const band = 4;
  for (let y = py0; y < py0 + ph; y++) {
    const k = y - py0;
    for (let x = px0; x < px0 + pw; x++) {
      const i = x - px0;
      let c: RGB;
      if (k === 0 || k === ph - 1 || i === 0 || i === pw - 1) c = k === 0 ? P.plateFrameHi : P.plateEdge;
      else if (i <= band) c = k === 1 ? P.bandHi : k === ph - 2 ? P.bandLo : P.band;
      else if (k === 1) c = P.plateHi;
      else if (k === ph - 2) c = P.plateLo;
      // A diagonal sheen across the reflective face.
      else if ((i - k * 2 === 18 || i - k * 2 === 19) && k <= ph - 3) c = P.plateHi;
      else c = i >= pw - 4 ? P.plateMid : P.plate;
      g.set(x, y, pack(c));
    }
  }
  g.set(px0 + 2, py0 + 2, pack(P.plateMid));
  g.set(px0 + 2, py0 + ph - 3, pack(P.bandHi));
  g.set(px0 + band + 2, py0 + Math.floor(ph / 2), pack(P.screw));
  g.set(px0 + pw - 3, py0 + Math.floor(ph / 2), pack(P.screw));
  const tx = px0 + band + 1 + Math.round((pw - band - 1 - textWidth(PLATE_TEXT)) / 2);
  forEachTextPixel(PLATE_TEXT, (x, y) => g.set(tx + x, py0 + 2 + y, pack(y === 0 ? P.plateTextHi : P.plateText)));

  // Shut line between the tail panel and the bumper.
  for (let u = 0; u <= 55; u++) put(u, SHUT_Y, P.black);

  // Deep bumper with rounded lower corners.
  for (let y = SHUT_Y + 1; y <= BUMPER_END; y++) {
    const fromEnd = BUMPER_END - y;
    const e = fromEnd >= 3 ? 55 : fromEnd === 2 ? 54 : fromEnd === 1 ? 53 : 51;
    const k = y - SHUT_Y - 1;
    for (let u = 0; u <= e; u++) {
      let c: RGB = k === 0 ? P.redHi : k <= 2 ? P.redLight : fromEnd === 3 ? P.redShadow : fromEnd <= 1 ? P.redDeep : P.red;
      if (u === e) c = P.redDeep;
      else if (u === e - 1) c = P.redShadow;
      put(u, y, c);
    }
  }
  // Small rectangular reflectors low on the outer corners.
  for (let y = BUMPER_END - 6; y <= BUMPER_END - 4; y++) {
    for (let u = 39; u <= 47; u++) {
      const edge = y === BUMPER_END - 6 || y === BUMPER_END - 4 || u === 39 || u === 47;
      put(u, y, edge ? P.outline : y === BUMPER_END - 5 && u < 44 ? P.reflectorHi : P.reflector);
    }
  }
  // Oval surround with the triple exhaust, sitting on the bumper's lower edge.
  for (let y = PIPE_Y - 3; y <= PIPE_Y + 3; y++) {
    const v = (y + 0.5 - (PIPE_Y + 0.5)) / 3.6;
    const half = Math.round(9 * Math.sqrt(Math.max(0, 1 - v * v)));
    for (let u = 0; u <= half; u++) put(u, y, P.black);
  }
  for (const cs of PIPE_S) {
    for (let y = PIPE_Y - 3; y <= PIPE_Y + 3; y++) {
      for (let u = Math.max(0, Math.floor(cs - 3)); u <= Math.ceil(cs + 3); u++) {
        const d = Math.hypot(u + 0.5 - cs - (cs === 0 ? 0.5 : 0), y - PIPE_Y);
        if (d <= 2.1) put(u, y, d > 1.1 ? P.pipe : P.pipeIn);
      }
    }
  }

  g.outline(pack(P.outline));
  return g;
}

/** Louvre rows on the engine cover: dark slot with a lit lip underneath. */
function louvreRow(y: number): RGB | null {
  if (y === 5 || y === 7 || y === 14 || y === 16) return P.slot;
  if (y === 6 || y === 8 || y === 15 || y === 17) return P.lexanHi;
  return null;
}

/** Steering angles each side of straight; each step reveals a little more flank. */
export const STEER_STEPS = 3;
const FLANK_PER_STEP = 2;
const FLANK_TOP = DECK_Y - 4;

/**
 * One pixel of the visible flank. `i` counts outward from the rear corner and
 * `w` is the flank's width at this angle. Features are laid out in the
 * corner's own rows (`ly`), which climb toward the horizon as the side
 * recedes, so the panel tapers into the body instead of standing off it.
 */
function flankColour(y: number, i: number, w: number, tread: number): RGB | null {
  const ly = y + Math.round(i * 0.5);
  if (ly < FLANK_TOP) return null;
  if (ly > BUMPER_END) {
    if (i >= w - 1 || ly > TYRE_BOTTOM - (i >= w - 2 ? 1 : 0)) return null;
    if (i === w - 2) return P.tyreEdge;
    return (ly + tread) % 3 === 0 ? P.tyreGroove : P.tyreSide;
  }
  if (i === 0) return ly <= FLANK_TOP + 1 ? P.redLight : P.redShadow;
  if (ly === FLANK_TOP) return P.redHi;
  if (ly === FLANK_TOP + 1) return P.redLight;
  if (ly === SHUT_Y) return P.black;
  if (w >= 4 && ly >= DECK_Y + 2 && ly <= DECK_Y + 5 && i >= 2 && i <= w - 2) return ly === DECK_Y + 2 ? P.black : P.meshB;
  if (ly >= BUMPER_END - 1) return P.redDeep;
  if (i === w - 1) return P.redDeep;
  return i * 2 >= w ? P.redShadow : P.red;
}

/**
 * Steering frames: the cabin leans a pixel or two toward the turn and the
 * flank on that side widens step by step, rather than rotating the sprite.
 */
function compose(base: PixelGrid, step: number, tread: number): PixelGrid {
  const out = new PixelGrid(CAR_W, CAR_H);
  const turn = Math.sign(step);
  const n = Math.abs(step);
  for (let y = 0; y < CAR_H; y++) {
    const s = turn * (y < WING_Y - 4 ? Math.round(n * 0.67) : y < WING_Y ? Math.round(n * 0.34) : 0);
    for (let x = 0; x < BASE_W; x++) {
      const c = base.data[y * BASE_W + x];
      if (c !== 0) out.data[y * CAR_W + MARGIN + x + s] = c;
    }
  }
  if (turn === 0) return out;

  // Paint the flank on its own layer so it gets a clean outline, then lay it
  // over the body: flank pixels win, its outline only fills empty space.
  const w = n * FLANK_PER_STEP;
  const side = new PixelGrid(CAR_W, CAR_H);
  for (let y = FLANK_TOP - w; y < CAR_H; y++) {
    let edge = turn < 0 ? 0 : CAR_W - 1;
    while (out.data[y * CAR_W + edge] === 0 && edge - turn >= 0 && edge - turn < CAR_W) edge -= turn;
    for (let i = 0; i < w; i++) {
      const c = flankColour(y, i, w, tread);
      if (c) side.set(edge + turn * i, y, pack(c));
    }
  }
  const outline = pack(P.outline);
  side.outline(outline);
  for (let p = 0; p < side.data.length; p++) {
    const c = side.data[p];
    if (c === 0) continue;
    if (c !== outline || out.data[p] === 0) out.data[p] = c;
  }
  return out;
}

export interface CarSprites {
  /** [steer step + STEER_STEPS: full left … straight … full right][brake: 0/1][tread: 0/1/2] */
  frames: HTMLCanvasElement[][][];
  shadow: HTMLCanvasElement;
  flames: HTMLCanvasElement[];
  glow: HTMLCanvasElement;
}

function buildFlames(): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 3; f++) {
    const g = new PixelGrid(11, 11);
    const r = rng(31 + f * 7);
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const d = Math.hypot(x - 5, (y - 4) * 0.8);
        if (d < 3.2 + f * 0.4 && r() < 0.7) g.set(x, y, pack(rgb(255, 92, 48)));
      }
    }
    g.disc(5, 4, 1.9 + f * 0.3, pack(rgb(255, 190, 80)));
    g.disc(5, 4, 1.0, pack(rgb(255, 250, 224)));
    frames.push(g.toCanvas());
  }
  return frames;
}

/** Brake-lamp bloom in flat stepped rings. */
function buildGlow(): HTMLCanvasElement {
  const g = new PixelGrid(24, 24);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const a = 1 - Math.hypot(x - 11.5, y - 11.5) / 10;
      if (a <= 0) continue;
      g.set(x, y, pack(rgb(255, 64, 56), Math.round((Math.ceil(a * 3) / 3) * 110)));
    }
  }
  return g.toCanvas();
}

function buildShadow(): HTMLCanvasElement {
  const sw = CAR_W + 10;
  const g = new PixelGrid(sw, 10);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < sw; x++) {
      const nx = (x + 0.5 - sw / 2) / (sw / 2);
      const ny = (y + 0.5 - 5) / 5;
      if (nx * nx + ny * ny <= 1) g.set(x, y, pack(rgb(16, 6, 28), 170));
    }
  }
  return g.toCanvas();
}

export function buildCarSprites(): CarSprites {
  const bases = [false, true].map((brake) => [0, 1, 2].map((tread) => buildBase(brake, tread)));
  const frames: HTMLCanvasElement[][][] = [];
  for (let step = -STEER_STEPS; step <= STEER_STEPS; step++) {
    frames.push(bases.map((row) => row.map((base, tread) => compose(base, step, tread).toCanvas())));
  }
  return { frames, shadow: buildShadow(), flames: buildFlames(), glow: buildGlow() };
}
