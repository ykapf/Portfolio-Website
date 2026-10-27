import { LOOP_SECONDS } from "./config";

type Key = readonly [number, number];

/** Piecewise smoothstep between keys; first and last keys must match for a seamless loop. */
function sample(keys: readonly Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * The lap, by time: hotels with a gentle right, a green stretch with the boost,
 * then a long, slow left sweep past the high street so its buildings can be seen.
 */
export const BIOME_TIMES = { natureFrom: 7.2, highStreetFrom: 11.4, highStreetTo: 20.2 } as const;

/** World units per second, before the track normalises it to a whole number of laps. */
const SPEED_KEYS: readonly Key[] = [
  [0, 6000],
  [3.4, 6000],
  [6.6, 6300],
  [9, 7800],
  [9.5, 8400],
  [10.6, 9500],
  [11.2, 8000],
  [12.8, 3600],
  [16, 3400],
  [19, 3700],
  [21.2, 6000],
  [24, 6000],
];

/** -1 = gentle left, +1 = gentle right (scaled by CURVE_MAX). */
const CURVE_KEYS: readonly Key[] = [
  [0, 0],
  [3.4, 0],
  [4.3, 1],
  [5.8, 1],
  [6.8, 0],
  [12.2, 0],
  [13.6, -0.8],
  [18.2, -0.8],
  [19.8, 0],
  [24, 0],
];

const BOOST_KEYS: readonly Key[] = [
  [0, 0],
  [9.1, 0],
  [9.5, 1],
  [10.7, 1],
  [11.2, 0],
  [24, 0],
];

const BRAKE_KEYS: readonly Key[] = [
  [0, 0],
  [11.2, 0],
  [11.4, 1],
  [12.7, 1],
  [12.9, 0],
  [24, 0],
];

/** Lateral car position in road half-widths; leans into each curve. */
const PLAYER_KEYS: readonly Key[] = [
  [0, 0],
  [2.2, 0.05],
  [3.6, 0],
  [5.2, 0.16],
  [7, 0.06],
  [8.8, -0.06],
  [10.6, 0.02],
  [12.6, 0],
  [14.4, -0.13],
  [16.4, -0.1],
  [18.2, -0.14],
  [20.2, -0.04],
  [22.4, 0.04],
  [24, 0],
];

/**
 * Rubber laid on the road: under the hard stop after the boost, and from
 * wheelspin as the car pulls away after the slow high-street sweep.
 */
export const SKID_MARKS: readonly { readonly from: number; readonly to: number }[] = [
  { from: 11.3, to: 12.7 },
  { from: 19.0, to: 20.9 },
];

export const speedAt = (t: number) => sample(SPEED_KEYS, t);

const REV_SPEED_MIN = 3400;
const REV_SPEED_MAX = 9500;

/** 0–1 rev-counter needle for any (unwrapped) racer time; the boost reaches the redline. */
export function revsAt(time: number): number {
  const lt = ((time % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
  return 0.18 + ((speedAt(lt) - REV_SPEED_MIN) / (REV_SPEED_MAX - REV_SPEED_MIN)) * 0.74;
}
export const curveAt = (t: number) => sample(CURVE_KEYS, t);

export interface TimelineState {
  boost: number;
  brake: number;
  playerX: number;
  /** Signed steering amount; drives the left/straight/right sprite. */
  steer: number;
}

const wrap = (t: number) => ((t % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;

function rawSteer(t: number): number {
  const x = sample(PLAYER_KEYS, t);
  const ahead = sample(PLAYER_KEYS, wrap(t + 0.05));
  return curveAt(t) * 0.75 + ((ahead - x) / 0.05) * 1.6;
}

/** Steering averaged over ±0.5 s, so the car eases between angles instead of snapping. */
const STEER_TAPS = 11;
function smoothSteer(t: number): number {
  let sum = 0;
  for (let i = 0; i < STEER_TAPS; i++) sum += rawSteer(wrap(t - 0.5 + i / (STEER_TAPS - 1)));
  return sum / STEER_TAPS;
}

export function sampleTimeline(t: number): TimelineState {
  return {
    boost: sample(BOOST_KEYS, t),
    brake: sample(BRAKE_KEYS, t),
    playerX: sample(PLAYER_KEYS, t),
    steer: smoothSteer(t),
  };
}
