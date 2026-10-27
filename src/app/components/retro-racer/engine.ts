import { Backdrop, buildBackdrop } from "./background";
import {
  CAM_H,
  CAR_BOTTOM,
  DRAW_DIST,
  FAR_PAD,
  FOCAL,
  H,
  HORIZON,
  LOOP_SECONDS,
  NEAR_PAD,
  ROAD_HALF,
  SEG_L,
  SKY_PAD,
  W,
  Z_PLAYER,
  DROP,
  HAZE_WATER,
  PROM_OUT,
  fogAt,
} from "./config";
import { forEachTextPixel } from "./font";
import { Ground } from "./ground";
import {
  BRAKE_S,
  CAR_CENTRE,
  CAR_H,
  CAR_W,
  CarSprites,
  LIGHT_Y,
  PIPE_S,
  PIPE_Y,
  STEER_STEPS,
  TYRE_S,
  TYRE_W,
  buildCarSprites,
} from "./sprites/car";
import { FOG_LEVELS, SceneryAssets, WHEEL_FRAMES, buildSceneryAssets, pickLod } from "./sprites";
import { BUILDING_TEXEL, BuildingTextures, buildBuildingTextures } from "./sprites/building";
import { SKID_MARKS, sampleTimeline, speedAt } from "./timeline";
import { Building, CurveFrame, PIER_END, Track, WHEEL_H, WHEEL_X, bgAt, buildTrack, positionAt } from "./track";
import { RGB, mix, rgb } from "./pixels";

export interface RacerOptions {
  enableBoost: boolean;
  showHUD: boolean;
}

export interface Racer {
  /** Draws the frame for `time` seconds; the scene loops every LOOP_SECONDS. */
  render(time: number): void;
}

interface Assets {
  backdrop: Backdrop;
  car: CarSprites;
  scenery: SceneryAssets;
  buildings: BuildingTextures[];
  track: Track;
  ground: Ground;
}

/** Closest building texture LOD for a given world size per screen pixel. */
function buildingLod(worldPerPx: number): number {
  let best = 0;
  for (let i = 1; i < BUILDING_TEXEL.length; i++) {
    if (Math.abs(Math.log(BUILDING_TEXEL[i] / worldPerPx)) < Math.abs(Math.log(BUILDING_TEXEL[best] / worldPerPx))) best = i;
  }
  return best;
}

let cache: Assets | null = null;

/** Sprites are generated once per page and shared across mounts. */
function getAssets(): Assets {
  if (!cache) {
    cache = {
      backdrop: buildBackdrop(),
      car: buildCarSprites(),
      scenery: buildSceneryAssets(),
      buildings: buildBuildingTextures(),
      track: buildTrack(),
      ground: new Ground(),
    };
  }
  return cache;
}

const NEAR_CLIP = 320;

const PIER = {
  deckA: rgb(196, 140, 132),
  deckB: rgb(182, 128, 124),
  fascia: rgb(120, 74, 92),
  fasciaHi: rgb(224, 176, 168),
  piling: rgb(70, 44, 72),
  brace: rgb(90, 58, 84),
  rail: rgb(244, 234, 246),
  lampPost: rgb(58, 52, 84),
  lampGlow: rgb(255, 236, 180),
} satisfies Record<string, RGB>;

type Px = readonly (readonly [number, number])[];

/** Wing-beat cycle: up, level, down, level. */
const GULL_UP: Px = [[-3, -2], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -2]];
const GULL_LEVEL: Px = [[-3, -1], [-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1], [3, -1]];
const GULL_DOWN: Px = [[-3, 1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 1]];
const GULL = [GULL_UP, GULL_LEVEL, GULL_DOWN, GULL_LEVEL] as const;

/** Each flock starts and ends off-screen, and none straddles the loop point. */
const GULL_FLOCKS = [
  { t0: 1.0, dur: 4.6, x0: -40, y0: 104, x1: 200, y1: -10, birds: [[0, 0], [-9, 5], [-17, 2], [-6, -6]] },
  { t0: 12.6, dur: 5.4, x0: -40, y0: 100, x1: 230, y1: -10, birds: [[0, 0], [-10, 4], [-19, 9]] },
  { t0: 20.2, dur: 3.4, x0: -40, y0: 96, x1: 150, y1: -10, birds: [[0, 0], [-8, -4]] },
] as const;

export function createRacer(canvas: HTMLCanvasElement, opts: RacerOptions): Racer | null {
  const maybeCtx = canvas.getContext("2d");
  if (!maybeCtx) return null;
  const ctx = maybeCtx;
  canvas.width = W;
  canvas.height = H;

  const roadCanvas = document.createElement("canvas");
  roadCanvas.width = W;
  roadCanvas.height = H;
  const roadCtx = roadCanvas.getContext("2d");
  if (!roadCtx) return null;
  const roadImg = roadCtx.createImageData(W, H);
  const buf = new Uint32Array(roadImg.data.buffer);

  const a = getAssets();
  const { track } = a;
  const cf = new CurveFrame(Math.ceil(DRAW_DIST / SEG_L) + 3);
  const nearK = Math.min(NEAR_PAD - 10, 110) / track.bgMax;
  const parallax = { sky: nearK * 0.18, far: nearK * 0.45, near: nearK };
  const visible: { b: Building; dNear: number; dFar: number; k: number }[] = [];

  const layer = (img: HTMLCanvasElement, pad: number, shift: number) => {
    const s = Math.max(-pad, Math.min(pad, shift));
    ctx.drawImage(img, Math.round(-pad + s), 0);
  };

  return {
    render(time: number) {
      const lt = ((time % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
      const camZ = positionAt(track, lt);
      const st = sampleTimeline(lt);
      const camX = st.playerX * ROAD_HALF * 0.55;
      const speed = speedAt(lt) * track.speedScale;
      const boost = opts.enableBoost ? st.boost : 0;
      cf.update(track, camZ);
      ctx.imageSmoothingEnabled = false;

      const heading = -bgAt(track, camZ);
      layer(a.backdrop.sky, SKY_PAD, heading * parallax.sky);
      layer(a.backdrop.far, FAR_PAD, heading * parallax.far);
      layer(a.backdrop.near, NEAR_PAD, heading * parallax.near);

      a.ground.render(buf, camZ, camX, cf, lt, track);
      roadCtx.putImageData(roadImg, 0, 0);
      ctx.drawImage(roadCanvas, 0, 0);
      drawMarks(lt, camZ, camX, st.playerX);
      drawGulls(lt, heading * parallax.far);

      const baseSeg = Math.floor(camZ / SEG_L);
      const maxK = Math.floor(DRAW_DIST / SEG_L);
      visible.length = 0;
      for (const b of track.buildings) {
        const depth = b.segs * SEG_L;
        let dNear = (((b.seg0 * SEG_L - camZ) % track.length) + track.length) % track.length;
        if (dNear > track.length - depth - SEG_L) dNear -= track.length;
        const dFar = dNear + depth;
        if (dFar < NEAR_CLIP || dNear > DRAW_DIST) continue;
        const k = Math.floor((camZ + Math.min(dFar, DRAW_DIST) - 1) / SEG_L) - baseSeg;
        visible.push({ b, dNear, dFar, k: Math.max(0, Math.min(maxK, k)) });
      }
      const pier = track.pier;
      let pierNear = (((pier.seg0 * SEG_L - camZ) % track.length) + track.length) % track.length;
      if (pierNear > track.length - pier.segs * SEG_L - SEG_L) pierNear -= track.length;
      const pierFar = pierNear + pier.segs * SEG_L;
      const pierK =
        pierFar < NEAR_CLIP || pierNear > DRAW_DIST
          ? -1
          : Math.max(0, Math.min(maxK, Math.floor((camZ + Math.min(pierFar, DRAW_DIST) - 1) / SEG_L) - baseSeg));
      let carDrawn = false;
      for (let k = maxK; k >= 0; k--) {
        const d = (baseSeg + k) * SEG_L + SEG_L / 2 - camZ;
        if (!carDrawn && d < Z_PLAYER) {
          drawCar(st.steer, st.brake, boost, camZ, lt);
          carDrawn = true;
        }
        for (const v of visible) if (v.k === k) drawBuilding(v.b, v.dNear, v.dFar, camX);
        if (k === pierK) drawPier(pierNear, pierFar, camX, lt);
        const railSeg = (baseSeg + k) % track.n;
        if (railSeg < pier.seg0 || railSeg >= pier.seg0 + pier.segs) a.ground.drawRailSegment(ctx, k, camX, cf);
        if (d < 300) continue;
        const items = track.scenery[(baseSeg + k) % track.n];
        if (items.length === 0) continue;
        const s = FOCAL / d;
        const cx = W / 2 + (cf.offAt(d) - camX) * s;
        const fogIdx = nearestFog(fogAt(d));
        for (const it of items) {
          const targetH = it.worldH * s;
          if (targetH < 2) continue;
          const lod = pickLod(a.scenery[it.kind], targetH);
          const dh = Math.round(targetH);
          const dw = Math.max(1, Math.round((lod.w * targetH) / lod.h));
          const x = Math.round(cx + it.offset * ROAD_HALF * s - dw / 2);
          if (x > W || x + dw < 0) continue;
          const groundY = HORIZON + (CAM_H - it.elev) * s;
          ctx.drawImage(lod.fog[fogIdx], x, Math.round(groundY - dh), dw, dh);
        }
      }
      if (!carDrawn) drawCar(st.steer, st.brake, boost, camZ, lt);

      if (boost > 0.05) drawStreaks(lt, boost);
      if (opts.showHUD) drawHUD(speed);

      function drawCar(steer: number, brake: number, boostAmt: number, z: number, t: number) {
        const sP = FOCAL / Z_PLAYER;
        const carX = W / 2 + (cf.offAt(Z_PLAYER) + st.playerX * ROAD_HALF - camX) * sP;
        const step = Math.max(-STEER_STEPS, Math.min(STEER_STEPS, Math.round(steer / 0.2)));
        const turn = step + STEER_STEPS;
        const braking = brake > 0.5 ? 1 : 0;
        const tread = Math.floor(z / 600) % 3;
        // A slow, single-pixel suspension settle rather than a constant shake.
        const settle = Math.sin((t / LOOP_SECONDS) * Math.PI * 2 * 10);
        let bob = settle > 0.92 ? 1 : 0;
        if (braking) bob = -1;
        else if (boostAmt > 0.5) bob = 1;

        const sx = Math.round(carX - CAR_W / 2);
        const sy = CAR_BOTTOM - CAR_H + bob;
        ctx.drawImage(a.car.shadow, Math.round(carX - a.car.shadow.width / 2), CAR_BOTTOM - 7);
        ctx.drawImage(a.car.frames[turn][braking][tread], sx, sy);

        if (braking) {
          ctx.globalCompositeOperation = "lighter";
          for (const ls of BRAKE_S) {
            for (const side of [-1, 1]) {
              ctx.drawImage(a.car.glow, Math.round(sx + CAR_CENTRE + side * ls - 12), sy + LIGHT_Y - 12);
            }
          }
          ctx.globalCompositeOperation = "source-over";
        }
        if (boostAmt > 0.05) {
          const frame = a.car.flames[Math.floor(t * 24) % a.car.flames.length];
          for (const ps of PIPE_S) {
            const sides = ps === 0 ? [0] : [-1, 1];
            for (const side of sides) {
              ctx.drawImage(frame, Math.round(sx + CAR_CENTRE + side * ps - 5.5), sy + PIPE_Y - 3);
            }
          }
        }
      }
    },
  };

  /**
   * Road-facing facade as perspective-correct texture columns sampled along the
   * curved centreline, then the camera-facing end wall as one scaled quad.
   */
  function drawBuilding(b: Building, dNear: number, dFar: number, camX: number) {
    const tex = a.buildings[b.type];
    const depth = dFar - dNear;
    const X0 = b.inner * ROAD_HALF;
    const dA = Math.max(dNear, NEAR_CLIP);
    const dB = Math.min(dFar, DRAW_DIST);
    const steps = Math.max(1, Math.ceil(((dB - dA) / SEG_L) * 2));
    let prevX = 0;
    let prevInv = 0;
    for (let i = 0; i <= steps; i++) {
      const d = dB + ((dA - dB) * i) / steps;
      const inv = 1 / d;
      const sx = W / 2 + (cf.offAt(d) - camX + X0) * FOCAL * inv;
      if (i > 0) {
        const x0 = Math.max(0, Math.ceil(Math.min(prevX, sx)));
        const x1 = Math.min(W - 1, Math.floor(Math.max(prevX, sx)));
        const span = sx - prevX || 1e-6;
        for (let x = x0; x <= x1; x++) {
          const t = (x + 0.5 - prevX) / span;
          const dc = 1 / (prevInv + (inv - prevInv) * Math.min(1, Math.max(0, t)));
          const s = FOCAL / dc;
          const lod = buildingLod(dc / FOCAL);
          const img = tex.facade[lod][nearestFog(fogAt(dc))];
          const u = Math.min(img.width - 1, Math.max(0, Math.floor(((dc - dNear) / depth) * img.width)));
          const top = Math.round(HORIZON + (CAM_H - b.worldH) * s);
          const bot = Math.round(HORIZON + CAM_H * s);
          ctx.drawImage(img, u, 0, 1, img.height, x, top, 1, bot - top);
        }
      }
      prevX = sx;
      prevInv = inv;
    }

    if (dNear < NEAR_CLIP) return;
    const s = FOCAL / dNear;
    const off = cf.offAt(dNear) - camX;
    const xa = Math.round(W / 2 + (off + X0) * s);
    const xb = Math.round(W / 2 + (off + b.outer * ROAD_HALF) * s);
    if (xa >= W || xb <= xa) return;
    const top = Math.round(HORIZON + (CAM_H - b.worldH) * s);
    const bot = Math.round(HORIZON + CAM_H * s);
    const lod = buildingLod(dNear / FOCAL);
    ctx.drawImage(tex.end[lod][nearestFog(fogAt(dNear))], xa, top, xb - xa, bot - top);
  }

  /**
   * The pier: a deck at promenade height running out to sea on pilings, rails
   * and lamps along both edges, and the Ferris wheel standing at the far end.
   */
  function drawPier(dNear: number, dFar: number, camX: number, t: number) {
    const dN = Math.max(dNear, NEAR_CLIP);
    const sN = FOCAL / dN;
    const sF = FOCAL / dFar;
    const offN = cf.offAt(dN) - camX;
    const offF = cf.offAt(Math.min(dFar, DRAW_DIST)) - camX;
    // Same reduced haze as the Ferris wheel sprite, so the wheel never floats above a faded pier.
    const fN = pierFog(dN);
    const fF = pierFog(dFar);
    const yAt = (s: number, h: number) => HORIZON + (CAM_H - h) * s;
    const sx = (off: number, x: number, s: number) => W / 2 + (off + x) * s;
    const xIn = -PROM_OUT;
    const xOut = -PIER_END;

    // Far-side pilings and rail first, so the deck and near face cover them.
    paint(PIER.piling, fF, 0.15);
    for (let x = xIn - 600; x > xOut; x -= 1100) {
      const px = sx(offF, x, sF);
      if (px < -2 || px > W) continue;
      ctx.fillRect(Math.round(px), Math.round(yAt(sF, -140)), Math.max(1, Math.round(80 * sF)), Math.max(1, Math.round(yAt(sF, -DROP) - yAt(sF, -140))));
    }

    // Deck surface, row by row between the far and near edges.
    const yTop = Math.max(HORIZON + 1, Math.ceil(yAt(sF, 0)));
    const yBot = Math.min(H - 1, Math.floor(yAt(sN, 0)));
    for (let y = yTop; y <= yBot; y++) {
      const d = (CAM_H * FOCAL) / (y + 0.5 - HORIZON);
      const s = FOCAL / d;
      const off = cf.offAt(Math.min(d, DRAW_DIST)) - camX;
      const x0 = Math.max(0, Math.round(sx(off, xOut, s)));
      const x1 = Math.min(W, Math.round(sx(off, xIn, s)));
      if (x1 <= x0) continue;
      paint(Math.floor(d / 260) % 2 ? PIER.deckA : PIER.deckB, pierFog(d), 0);
      ctx.fillRect(x0, y, x1 - x0, 1);
    }
    paint(PIER.rail, fF, 0);
    const farRailY = Math.round(yAt(sF, 300));
    const fx0 = Math.max(0, Math.round(sx(offF, xOut, sF)));
    const fx1 = Math.min(W, Math.round(sx(offF, xIn, sF)));
    if (fx1 > fx0) ctx.fillRect(fx0, farRailY, fx1 - fx0, 1);

    if (dNear < NEAR_CLIP) return;
    const x0 = Math.round(sx(offN, xOut, sN));
    const x1 = Math.round(sx(offN, xIn, sN));
    if (x1 <= 0) return;
    const deckY = Math.round(yAt(sN, 0));
    const fasciaY = Math.round(yAt(sN, -150));
    const seaY = Math.round(yAt(sN, -DROP));

    // Near pilings with cross-bracing, then the deck fascia.
    paint(PIER.piling, fN, 0);
    const pw = Math.max(1, Math.round(90 * sN));
    for (let x = xIn - 600; x > xOut; x -= 1100) {
      const px = Math.round(sx(offN, x, sN));
      if (px < -pw || px > W) continue;
      ctx.fillRect(px, fasciaY, pw, seaY - fasciaY);
    }
    paint(PIER.brace, fN, 0);
    const braceY = Math.round(yAt(sN, -330));
    ctx.fillRect(Math.max(0, x0), braceY, Math.min(W, x1) - Math.max(0, x0), Math.max(1, Math.round(30 * sN)));
    paint(PIER.fascia, fN, 0);
    ctx.fillRect(Math.max(0, x0), deckY, Math.min(W, x1) - Math.max(0, x0), Math.max(1, fasciaY - deckY));
    paint(PIER.fasciaHi, fN, 0);
    ctx.fillRect(Math.max(0, x0), deckY, Math.min(W, x1) - Math.max(0, x0), 1);

    // Near rail, posts and lamps.
    paint(PIER.rail, fN, 0);
    const railY = Math.round(yAt(sN, 320));
    ctx.fillRect(Math.max(0, x0), railY, Math.min(W, x1) - Math.max(0, x0), Math.max(1, Math.round(30 * sN)));
    ctx.fillRect(Math.max(0, x0), Math.round(yAt(sN, 170)), Math.min(W, x1) - Math.max(0, x0), Math.max(1, Math.round(24 * sN)));
    for (let x = xIn - 200; x > xOut; x -= 700) {
      const px = Math.round(sx(offN, x, sN));
      if (px < 0 || px > W) continue;
      ctx.fillRect(px, railY, Math.max(1, Math.round(36 * sN)), deckY - railY);
    }
    for (let x = xIn - 1500; x > xOut + 3000; x -= 3600) {
      const px = Math.round(sx(offN, x, sN));
      if (px < 0 || px > W) continue;
      const top = Math.round(yAt(sN, 1500));
      paint(PIER.lampPost, fN, 0);
      ctx.fillRect(px, top, Math.max(1, Math.round(40 * sN)), deckY - top);
      paint(PIER.lampGlow, 0, 0);
      const lw = Math.max(2, Math.round(120 * sN));
      ctx.fillRect(Math.round(px - lw / 2 + 20 * sN), top - Math.max(1, Math.round(90 * sN)), lw, Math.max(1, Math.round(90 * sN)));
    }

    // Ferris wheel on the end of the pier, turning slowly.
    const dW = (dNear + dFar) / 2;
    if (dW < NEAR_CLIP) return;
    const s = FOCAL / dW;
    const targetH = WHEEL_H * s;
    const frame = Math.floor(t * 2.5) % WHEEL_FRAMES;
    const lod = pickLod(a.scenery.wheel[frame], targetH);
    const dh = Math.round(targetH);
    const dw = Math.max(1, Math.round((lod.w * targetH) / lod.h));
    const cx = W / 2 + (cf.offAt(Math.min(dW, DRAW_DIST)) - camX + WHEEL_X) * s;
    if (cx + dw / 2 < 0) return;
    ctx.drawImage(lod.fog[nearestFog(fogAt(dW))], Math.round(cx - dw / 2), Math.round(yAt(s, 0) - dh), dw, dh);
  }

  /**
   * Black rubber laid by the spinning rear tyres. The marks are fixed in world
   * space, so they stretch back from the tyres and slide under the camera.
   */
  function drawMarks(lt: number, camZ: number, camX: number, playerX: number) {
    for (const m of SKID_MARKS) {
      if (lt >= m.from && lt <= m.to + 1) drawMarkRun(m.from, m.to, lt, camZ, camX, playerX);
    }
  }

  function drawMarkRun(from: number, to: number, lt: number, camZ: number, camX: number, playerX: number) {
    const zStart = positionAt(track, from) + Z_PLAYER;
    const zEnd = positionAt(track, to) + Z_PLAYER;
    const dA = zStart - camZ;
    const dB = Math.min(positionAt(track, Math.min(lt, to)) + Z_PLAYER - camZ, Z_PLAYER);
    if (dB <= 0) return;
    const sP = FOCAL / Z_PLAYER;
    const off = TYRE_S / sP;
    const width = (TYRE_W * 0.7) / sP;
    for (let y = CAR_BOTTOM - 3; y < H; y++) {
      const d = (CAM_H * FOCAL) / (y + 0.5 - HORIZON);
      if (d < dA || d > dB) continue;
      const fresh = 1 - (d + camZ - zStart) / (zEnd - zStart);
      ctx.fillStyle = `rgba(14, 10, 20, ${((0.35 + (Math.ceil(fresh * 3) / 3) * 0.65) * 0.62).toFixed(3)})`;
      const s = FOCAL / d;
      const w = Math.max(1, Math.round(width * s));
      for (const side of [-1, 1]) {
        const cx = W / 2 + (cf.offAt(d) + playerX * ROAD_HALF + side * off - camX) * s;
        ctx.fillRect(Math.round(cx - w / 2), y, w, 1);
      }
    }
  }

  function pierFog(d: number): number {
    return fogAt(d) * 0.5;
  }

  function paint(c: RGB, fog: number, extra: number) {
    const m = mix(c, HAZE_WATER, Math.min(1, fog + extra));
    ctx.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`;
  }

  function nearestFog(f: number): number {
    let best = 0;
    for (let i = 1; i < FOG_LEVELS.length; i++) {
      if (Math.abs(FOG_LEVELS[i] - f) < Math.abs(FOG_LEVELS[best] - f)) best = i;
    }
    return best;
  }

  /** Small flocks taking off over the sea on the left, climbing out of frame. */
  function drawGulls(lt: number, shift: number) {
    ctx.fillStyle = "rgb(74, 40, 92)";
    for (const fl of GULL_FLOCKS) {
      const u = (lt - fl.t0) / fl.dur;
      if (u < 0 || u > 1) continue;
      fl.birds.forEach(([ox, oy], i) => {
        const x = fl.x0 + (fl.x1 - fl.x0) * u + ox * (1 - u * 0.4) + shift * 0.6;
        const y = fl.y0 + (fl.y1 - fl.y0) * u + oy * (1 - u * 0.4) + Math.sin(lt * 3 + i * 1.7) * 1.5;
        const frame = GULL[Math.floor(lt * 7 + i * 1.3) % GULL.length];
        for (const [px, py] of frame) ctx.fillRect(Math.round(x + px), Math.round(y + py), 1, 1);
      });
    }
  }

  /** Short pixel streaks radiating from the vanishing point at the screen edges. */
  function drawStreaks(lt: number, amount: number) {
    ctx.fillStyle = `rgba(255, 232, 244, ${(0.5 * amount).toFixed(3)})`;
    for (let i = 0; i < 12; i++) {
      const side = i % 2 ? 1 : -1;
      const ang = 0.1 + (i >> 1) * 0.08;
      const p = (lt * 3.1 + i * 0.37) % 1;
      const r0 = 250 + p * 230;
      const len = 18 + p * 36;
      for (let r = r0; r < r0 + len; r++) {
        const x = W / 2 + side * Math.cos(ang) * r;
        const y = HORIZON + Math.sin(ang) * r;
        if (x < 0 || x >= W || y >= H) break;
        if (Math.abs(x - W / 2) < 196) continue;
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }
    }
  }

  function drawHUD(speed: number) {
    const kmh = String(Math.round(speed * 0.038));
    const text = `SPEED ${kmh} KM/H`;
    const plot = (color: string, ox: number, oy: number) => {
      ctx.fillStyle = color;
      forEachTextPixel(text, (x, y) => ctx.fillRect(10 + ox + x, 10 + oy + y, 1, 1));
    };
    plot("#2a1040", 1, 1);
    plot("#fff4c8", 0, 0);
  }
}
