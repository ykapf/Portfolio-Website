import { rgb } from "./pixels";

/** Native raster; the canvas is nearest-neighbour upscaled by CSS. */
export const W = 480;
export const H = 270;
export const HORIZON = 121;

/** Camera + road model, in world units. */
export const CAM_H = 1000;
export const FOCAL = 240;
export const ROAD_HALF = 1400;
export const KERB_W = 170;
/** Ocean side: promenade, then a seawall dropping DROP units to the beach. */
export const PROM_W = 700;
export const PROM_OUT = ROAD_HALF + KERB_W + PROM_W;
export const DROP = 520;
export const BEACH_OUT = 7600;
export const FOAM_W = 160;
export const SEG_L = 200;
export const DRAW_DIST = 60000;
export const FOG_START = 3500;
export const CURVE_MAX = 2.2;

export const CAR_BOTTOM = 252;
/** World distance at which the car sits; sprites are authored at 1:1 pixel density here. */
export const Z_PLAYER = (CAM_H * FOCAL) / (CAR_BOTTOM - HORIZON);

export const LOOP_SECONDS = 24;

/** Extra width on each parallax layer so curves can slide them sideways. */
export const SKY_PAD = 60;
export const FAR_PAD = 120;
export const NEAR_PAD = 200;

export const HAZE_LAND = rgb(204, 150, 172);
export const HAZE_WATER = rgb(246, 168, 162);
export const HAZE_ROAD = rgb(198, 148, 172);

export function fogAt(d: number): number {
  const u = (d - FOG_START) / (DRAW_DIST - FOG_START);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  return Math.pow(u, 0.62);
}
