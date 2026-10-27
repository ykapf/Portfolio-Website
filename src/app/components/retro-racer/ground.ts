import {
  BEACH_OUT,
  CAM_H,
  DRAW_DIST,
  DROP,
  FOAM_W,
  FOCAL,
  H,
  HAZE_LAND,
  HAZE_ROAD,
  HAZE_WATER,
  HORIZON,
  KERB_W,
  PROM_OUT,
  ROAD_HALF,
  SEG_L,
  W,
  fogAt,
} from "./config";
import { RGB, hash2, mix, pack, rgb } from "./pixels";
import { Biome, CurveFrame, PLANTER_R, TOWEL_HALF_X, TOWEL_HALF_Z, Track } from "./track";

const COLORS = {
  asphaltA: [rgb(74, 62, 94), HAZE_ROAD],
  asphaltB: [rgb(68, 57, 89), HAZE_ROAD],
  asphaltMid: [rgb(71, 60, 92), HAZE_ROAD],
  line: [rgb(240, 234, 238), HAZE_ROAD],
  dash: [rgb(236, 230, 226), HAZE_ROAD],
  kerbR: [rgb(214, 38, 58), HAZE_ROAD],
  kerbRShade: [rgb(162, 24, 48), HAZE_ROAD],
  kerbW: [rgb(246, 240, 238), HAZE_ROAD],
  kerbWShade: [rgb(198, 188, 206), HAZE_ROAD],
  kerbMid: [rgb(232, 140, 148), HAZE_ROAD],
  kerbMidShade: [rgb(180, 106, 128), HAZE_ROAD],
  promA: [rgb(226, 188, 186), HAZE_LAND],
  promB: [rgb(214, 176, 178), HAZE_LAND],
  promJoint: [rgb(186, 148, 164), HAZE_LAND],
  cap: [rgb(244, 230, 236), HAZE_LAND],
  capLip: [rgb(120, 90, 128), HAZE_LAND],
  wallFace: [rgb(110, 80, 120), HAZE_LAND],
  beachA: [rgb(248, 206, 160), HAZE_LAND],
  beachB: [rgb(240, 196, 152), HAZE_LAND],
  beachMid: [rgb(244, 201, 156), HAZE_LAND],
  beachShade: [rgb(206, 150, 140), HAZE_LAND],
  beachWet: [rgb(208, 170, 150), HAZE_WATER],
  foam: [rgb(250, 246, 240), HAZE_WATER],
  waterShallow: [rgb(70, 196, 196), HAZE_WATER],
  waterA: [rgb(30, 150, 170), HAZE_WATER],
  waterB: [rgb(36, 140, 166), HAZE_WATER],
  waterDeep: [rgb(22, 108, 142), HAZE_WATER],
  waterHi: [rgb(170, 236, 230), HAZE_WATER],
  grassA: [rgb(50, 118, 76), HAZE_LAND],
  grassB: [rgb(44, 108, 72), HAZE_LAND],
  grassMid: [rgb(47, 113, 74), HAZE_LAND],
  grassSpeck: [rgb(84, 146, 84), HAZE_LAND],
  paveA: [rgb(206, 186, 204), HAZE_LAND],
  paveB: [rgb(194, 174, 196), HAZE_LAND],
  paveJoint: [rgb(164, 144, 176), HAZE_LAND],
  rail: [rgb(196, 178, 214), HAZE_LAND],
  railHi: [rgb(248, 238, 250), HAZE_LAND],
  post: [rgb(150, 132, 180), HAZE_LAND],
  towel1: [rgb(255, 84, 140), HAZE_LAND],
  towel2: [rgb(46, 196, 226), HAZE_LAND],
  towel3: [rgb(255, 214, 70), HAZE_LAND],
  towel4: [rgb(150, 90, 230), HAZE_LAND],
  towel5: [rgb(255, 140, 60), HAZE_LAND],
  towelStripe: [rgb(252, 248, 240), HAZE_LAND],
  bedEdge: [rgb(232, 220, 226), HAZE_LAND],
  bedSoil: [rgb(118, 80, 86), HAZE_LAND],
} satisfies Record<string, readonly [RGB, RGB]>;

type ColorKey = keyof typeof COLORS;
const KEYS = Object.keys(COLORS) as ColorKey[];
const I = Object.fromEntries(KEYS.map((k, i) => [k, i])) as Record<ColorKey, number>;

function paletteAt(fog: number): Uint32Array {
  const pal = new Uint32Array(KEYS.length);
  KEYS.forEach((k, i) => {
    const [c, haze] = COLORS[k];
    pal[i] = pack(mix(c, haze, fog));
  });
  return pal;
}

const PROM_IN = ROAD_HALF + KERB_W;
const CAP_IN = PROM_OUT - 90;
export const RAIL_X = -(PROM_OUT - 45);
const LOW_H = CAM_H + DROP;

const RAIL_FOG_STEPS = 24;

export class Ground {
  private readonly rowD = new Float64Array(H);
  private readonly rowDz = new Float64Array(H);
  private readonly rowPal: Uint32Array[] = [];
  /** Same scanlines intersected with the lowered beach / sea plane. */
  private readonly lowD = new Float64Array(H);
  private readonly lowDz = new Float64Array(H);
  private readonly lowPal: Uint32Array[] = [];
  private readonly railStyles: { rail: string; railHi: string; post: string }[] = [];

  constructor() {
    for (let y = 0; y < H; y++) {
      if (y <= HORIZON) {
        this.rowPal.push(new Uint32Array(0));
        this.lowPal.push(new Uint32Array(0));
        continue;
      }
      const d = (CAM_H * FOCAL) / (y + 0.5 - HORIZON);
      this.rowD[y] = d;
      this.rowDz[y] = (d * d) / (CAM_H * FOCAL);
      this.rowPal.push(paletteAt(fogAt(d)));
      const dl = (LOW_H * FOCAL) / (y + 0.5 - HORIZON);
      this.lowD[y] = dl;
      this.lowDz[y] = (dl * dl) / (LOW_H * FOCAL);
      this.lowPal.push(paletteAt(fogAt(dl)));
    }
    const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
    for (let i = 0; i <= RAIL_FOG_STEPS; i++) {
      const f = i / RAIL_FOG_STEPS;
      this.railStyles.push({
        rail: css(mix(COLORS.rail[0], HAZE_LAND, f)),
        railHi: css(mix(COLORS.railHi[0], HAZE_LAND, f)),
        post: css(mix(COLORS.post[0], HAZE_LAND, f)),
      });
    }
  }

  /** Rasterises every ground scanline from its exact world distance. */
  render(
    buf: Uint32Array,
    camZ: number,
    camX: number,
    cf: CurveFrame,
    lt: number,
    track: Track
  ): void {
    const { biomes, towelColor, towelX, planterX, planterZ } = track;
    const lap = track.length;
    const nSeg = biomes.length;
    const towelBase = I.towel1 - 1;
    const waveShift = Math.sin((lt / 20) * Math.PI * 2) * 180;
    const twinkle = Math.floor(lt * 1.5);
    for (let y = HORIZON + 1; y < H; y++) {
      const d = this.rowD[y];
      const dz = this.rowDz[y];
      const pal = this.rowPal[y];
      const scale = FOCAL / d;
      const inv = 1 / scale;
      const zi = (camZ + d) % lap;
      const cx = W / 2 + (cf.offAt(Math.min(d, DRAW_DIST)) - camX) * scale;

      const dl = this.lowD[y];
      const dzl = this.lowDz[y];
      const lpal = this.lowPal[y];
      const scaleL = FOCAL / dl;
      const invL = 1 / scaleL;
      const zl = (camZ + dl) % lap;
      const cxL = W / 2 + (cf.offAt(Math.min(dl, DRAW_DIST)) - camX) * scaleL;

      const nearStripes = dz < 300;
      const rumble = Math.floor(zi / 600) & 1;
      const band = Math.floor(zi / 400) & 1;
      const dashOn = dz < 800 && zi % 1600 < 720;
      const grassBand = Math.floor(zi / 800) & 1;
      const promRow = Math.floor(zi / 400);
      const promJointRow = dz < 40 && zi % 400 < 34;
      const texProm = scale * 26 >= 0.8;
      const paveRow = Math.floor(zi / 300);
      const paveJointRow = dz < 40 && zi % 300 < 28;
      const texGrass = scale * 160 >= 3;
      const zGrass = Math.floor(zi / 160);
      const segI = Math.floor(zi / SEG_L) % nSeg;
      const highStreet = biomes[segI] === Biome.HighStreet;
      const bedX = highStreet ? planterX[segI] : 0;
      const bedDz = (zi - planterZ[segI]) / PLANTER_R;
      const bedRow = bedX !== 0 && bedDz * bedDz < 1;

      const segL = Math.floor(zl / SEG_L) % nSeg;
      const towel = towelColor[segL];
      const towelRow = towel !== 0 && Math.abs(zl - (segL * SEG_L + SEG_L / 2)) < TOWEL_HALF_Z;
      const towelC = lpal[towelBase + towel];
      const towelAx = -towelX[segL];

      const beachStripe = dzl < 260 ? (Math.floor(zl / 700) & 1 ? lpal[I.beachA] : lpal[I.beachB]) : lpal[I.beachMid];
      const foamWobble = Math.sin(zl / 900 + lt * 0.9) * 70;
      const waveRow = Math.floor(zl / 300);
      const crestRow = dzl < 60 && zl % 300 < 60;

      const asph = nearStripes ? (band ? pal[I.asphaltA] : pal[I.asphaltB]) : pal[I.asphaltMid];
      const kerb = nearStripes ? (rumble ? pal[I.kerbR] : pal[I.kerbW]) : pal[I.kerbMid];
      const kerbShade = nearStripes
        ? rumble
          ? pal[I.kerbRShade]
          : pal[I.kerbWShade]
        : pal[I.kerbMidShade];
      const grass = nearStripes ? (grassBand ? pal[I.grassA] : pal[I.grassB]) : pal[I.grassMid];

      let idx = y * W;
      for (let x = 0; x < W; x++, idx++) {
        const wx = (x + 0.5 - cx) * inv;
        const ax = wx < 0 ? -wx : wx;
        let c: number;
        if (ax < ROAD_HALF) {
          if (ax > ROAD_HALF - 110 && ax < ROAD_HALF - 50) c = pal[I.line];
          else if (dashOn && Math.abs(ax - ROAD_HALF / 3) < 22) c = pal[I.dash];
          else c = asph;
        } else if (ax < PROM_IN) {
          c = ax > ROAD_HALF + KERB_W * 0.72 ? kerbShade : kerb;
        } else if (wx > 0) {
          if (bedRow && (wx - bedX) * (wx - bedX) < PLANTER_R * PLANTER_R * (1 - bedDz * bedDz)) {
            const e = Math.hypot((wx - bedX) / PLANTER_R, bedDz);
            c = e > 0.84 ? pal[I.bedEdge] : e > 0.74 ? pal[I.bedSoil] : grass;
          } else if (highStreet) {
            const tile = Math.floor((ax - PROM_IN) / 300);
            const joint = texProm && (paveJointRow || (ax - PROM_IN) % 300 < 24);
            c = joint ? pal[I.paveJoint] : (tile + paveRow) & 1 ? pal[I.paveA] : pal[I.paveB];
          } else {
            c = grass;
            if (texGrass && hash2(Math.floor(wx / 160), zGrass) < 0.06) c = pal[I.grassSpeck];
          }
        } else if (ax < CAP_IN) {
          const tile = Math.floor((ax - PROM_IN) / 320);
          const joint = texProm && (promJointRow || (ax - PROM_IN) % 320 < 26);
          c = joint ? pal[I.promJoint] : (tile + promRow) & 1 ? pal[I.promA] : pal[I.promB];
        } else if (ax < PROM_OUT) {
          c = ax > PROM_OUT - 22 ? pal[I.capLip] : pal[I.cap];
        } else {
          // Past the seawall the ray drops to the beach / sea plane.
          const axl = -(x + 0.5 - cxL) * invL;
          if (axl < PROM_OUT) c = lpal[I.wallFace];
          else if (axl < BEACH_OUT + foamWobble) {
            if (ax < PROM_OUT + 120) c = lpal[I.beachShade];
            else if (axl > BEACH_OUT + foamWobble - 420) c = lpal[I.beachWet];
            else if (towelRow && Math.abs(axl - towelAx) < TOWEL_HALF_X) {
              c = Math.floor((axl - towelAx + TOWEL_HALF_X) / 92) % 2 === 1 ? lpal[I.towelStripe] : towelC;
            } else c = beachStripe;
          } else if (axl < BEACH_OUT + FOAM_W + foamWobble) {
            c = lpal[I.foam];
          } else {
            const wxs = axl + waveShift;
            const cell = Math.floor(wxs / 480);
            const h = hash2(cell, waveRow);
            let crest: boolean;
            if (dzl < 60) crest = crestRow && h < 0.3 && ((wxs % 480) + 480) % 480 < 300;
            else {
              const gx = x >> 2;
              crest = hash2(gx, y * 7 + ((twinkle + Math.floor(hash2(gx, y) * 4)) >> 2)) < 0.035;
            }
            if (crest) c = lpal[I.waterHi];
            else if (axl < BEACH_OUT + FOAM_W + 700) c = lpal[I.waterShallow];
            else if (axl > BEACH_OUT + ROAD_HALF * 3.2) c = lpal[I.waterDeep];
            else c = h > 0.7 ? lpal[I.waterB] : lpal[I.waterA];
          }
        }
        buf[idx] = c;
      }
    }
  }

  /**
   * One span of the seafront railing (two projected beams plus a post), drawn
   * straight to the canvas so it depth-sorts with the beach palms behind it.
   */
  drawRailSegment(ctx: CanvasRenderingContext2D, k: number, camX: number, cf: CurveFrame): void {
    const dNear = cf.D0 + (k - 1) * SEG_L;
    const dFar = cf.D0 + k * SEG_L;
    if (dNear < 450 || dFar > DRAW_DIST) return;
    const st = this.railStyles[Math.round(fogAt(dNear) * RAIL_FOG_STEPS)];

    const sN = FOCAL / dNear;
    const sF = FOCAL / dFar;
    const xN = W / 2 + (cf.offAt(dNear) - camX + RAIL_X) * sN;
    const xF = W / 2 + (cf.offAt(dFar) - camX + RAIL_X) * sF;
    const yAt = (s: number, h: number) => HORIZON + (CAM_H - h) * s;

    ctx.fillStyle = st.rail;
    fillTrap(ctx, xF, yAt(sF, 340), yAt(sF, 300), xN, yAt(sN, 340), yAt(sN, 300));
    fillTrap(ctx, xF, yAt(sF, 200), yAt(sF, 170), xN, yAt(sN, 200), yAt(sN, 170));
    ctx.fillStyle = st.railHi;
    fillTrap(ctx, xF, yAt(sF, 340), yAt(sF, 340) + 1, xN, yAt(sN, 340), yAt(sN, 340) + 1);

    if ((cf.base + k) % 2 === 0) {
      const pw = Math.max(1, Math.round(40 * sN));
      const x0 = Math.round(xN - pw / 2);
      const yTop = Math.max(HORIZON + 1, Math.round(yAt(sN, 340)));
      const yBot = Math.min(H - 1, Math.round(yAt(sN, 0)));
      if (yBot < yTop) return;
      ctx.fillStyle = st.post;
      ctx.fillRect(x0, yTop, pw, yBot - yTop + 1);
      if (pw > 2) {
        ctx.fillStyle = st.railHi;
        ctx.fillRect(x0, yTop, 1, yBot - yTop + 1);
      }
    }
  }
}

/** Quad with two vertical edges — enough for any projected rail span. */
function fillTrap(
  ctx: CanvasRenderingContext2D,
  xa: number,
  ta: number,
  ba: number,
  xb: number,
  tb: number,
  bb: number
): void {
  if (xa > xb) {
    [xa, xb] = [xb, xa];
    [ta, tb] = [tb, ta];
    [ba, bb] = [bb, ba];
  }
  const span = Math.max(1e-3, xb - xa);
  const x0 = Math.max(0, Math.floor(xa));
  const x1 = Math.min(W - 1, Math.floor(xb));
  for (let x = x0; x <= x1; x++) {
    const t = Math.min(1, Math.max(0, (x + 0.5 - xa) / span));
    const top = Math.max(HORIZON + 1, Math.round(ta + (tb - ta) * t));
    const bot = Math.min(H - 1, Math.max(top, Math.round(ba + (bb - ba) * t) - 1));
    ctx.fillRect(x, top, 1, bot - top + 1);
  }
}
