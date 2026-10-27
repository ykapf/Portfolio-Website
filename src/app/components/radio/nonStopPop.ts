/**
 * Non-Stop-Pop FM as a "live" broadcast: every visitor hears the same song at
 * the same position, derived only from the (server-corrected) UTC clock.
 * Durations are the real YouTube lengths of the DJ Cara playlist
 * (PLv2IGBk7nw2N7ibp1azSzGAAHYRncfaFN), so update them together with ids.
 */

export interface Track {
  id: string;
  title: string;
  /** Seconds. */
  duration: number;
}

export const STATION = {
  name: "Non-Stop-Pop FM",
  frequency: "100.7",
  host: "Cara Delevingne",
  icon: "/radio/radio_icons/non-stop-pop-fm.png",
};

export const TRACKS: Track[] = [
  { id: "T8sWgUzuTo0", title: "1 Thing", duration: 229 },
  { id: "6N3JQkMFK2M", title: "6 Underground", duration: 233 },
  { id: "Qq3u0UWIX2s", title: "Adult Education", duration: 250 },
  { id: "ec2Dvm9QvZg", title: "Alright", duration: 223 },
  { id: "1GKX53eJHQc", title: "Anthem", duration: 247 },
  { id: "_mjgdUBhvnM", title: "Applause", duration: 212 },
  { id: "Xl9ORbZkWS8", title: "Bad Girls", duration: 233 },
  { id: "ypi5Lyv_aSA", title: "Cooler Than Me", duration: 218 },
  { id: "alaUJKV7t94", title: "Days Go By", duration: 224 },
  { id: "6V_ZMZbeT6c", title: "Don't Wanna Fall In Love", duration: 238 },
  { id: "Q7OaKc9eiX0", title: "Everything She Wants", duration: 207 },
  { id: "LD1s3afd9kU", title: "Feel Good Inc.", duration: 225 },
  { id: "47KrNuGWeLU", title: "Gimme More", duration: 209 },
  { id: "UrLwlqy2hY0", title: "Glamorous", duration: 239 },
  { id: "D9LL3B8xL5E", title: "I Want It That Way", duration: 218 },
  { id: "XDibRgVpBzo", title: "Kids", duration: 264 },
  { id: "mdA5x-f_nWE", title: "Lady (Hear Me Tonight)", duration: 229 },
  { id: "jNJ6uKeoAik", title: "Let's Go All The Way", duration: 221 },
  { id: "8S4gIGc652o", title: "Living In A Box", duration: 188 },
  { id: "LZexOk4us1M", title: "Me & U", duration: 197 },
  { id: "wBAMAawyi20", title: "Meet Me Halfway", duration: 257 },
  { id: "9_7hTRoPRF8", title: "Midnight City", duration: 246 },
  { id: "jRg-i57w_f4", title: "Moves Like Jagger", duration: 205 },
  { id: "9fL7L75Ez5g", title: "Music Sounds Better With You", duration: 264 },
  { id: "zqb3iI21dyc", title: "New Sensation", duration: 225 },
  { id: "cwU5qJv-4DQ", title: "On Our Own", duration: 286 },
  { id: "r_46nwoB6uQ", title: "Only Girl (In The World)", duration: 238 },
  { id: "u2NDyds48ek", title: "Promises, Promises", duration: 228 },
  { id: "N2kBYUhW_cc", title: "Pure Shores", duration: 275 },
  { id: "fKsm6cw1b5g", title: "Scandalous", duration: 242 },
  { id: "ivKosHJM0Io", title: "Send Me An Angel", duration: 234 },
  { id: "qhzlIZdBsmo", title: "Smalltown Boy", duration: 278 },
  { id: "dpSTP_5WNW0", title: "Something Got Me Started", duration: 300 },
  { id: "CelMDlpTbDs", title: "Tape Loop", duration: 231 },
  { id: "h4igSWmbGO4", title: "Tell It To My Heart", duration: 224 },
  { id: "Oe-OkX-rEv4", title: "Tennis Court", duration: 202 },
  { id: "pntr19zqj-k", title: "The Rhythm Of The Night", duration: 216 },
  { id: "Hofep767nOI", title: "The Time Is Now", duration: 218 },
  { id: "jBT0h_IssjU", title: "Wait", duration: 193 },
  { id: "AsNH1k60TLM", title: "West End Girls", duration: 236 },
  { id: "EPHWnaoNKf0", title: "Work", duration: 196 },
  { id: "rTYlbJ0iSzQ", title: "With Every Heartbeat", duration: 253 },
];

/** The broadcast "went on air" here; changing it reshuffles everyone's schedule. */
const ON_AIR = Date.UTC(2024, 0, 1);
const CYCLE = TRACKS.reduce((sum, t) => sum + t.duration, 0);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let cachedCycle = -1;
let cachedOrder: number[] = [];

/** The play order for one full pass of the playlist; a fresh shuffle each pass. */
function orderFor(cycle: number): number[] {
  if (cycle === cachedCycle) return cachedOrder;
  const rand = mulberry32(cycle * 2654435761 + 0x5eed);
  const order = TRACKS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  cachedCycle = cycle;
  cachedOrder = order;
  return order;
}

export interface Slot {
  track: number;
  /** Seconds into the track. */
  offset: number;
  /** Epoch ms at which this track started on air. */
  startMs: number;
}

/** What is on air at `nowMs`. */
export function slotAt(nowMs: number): Slot {
  const t = (nowMs - ON_AIR) / 1000;
  const cycle = Math.floor(t / CYCLE);
  let rem = t - cycle * CYCLE;
  const order = orderFor(cycle);
  for (let i = 0; i < order.length; i++) {
    const d = TRACKS[order[i]].duration;
    if (rem < d) return { track: order[i], offset: rem, startMs: nowMs - rem * 1000 };
    rem -= d;
  }
  const last = order[order.length - 1];
  return { track: last, offset: TRACKS[last].duration, startMs: nowMs - TRACKS[last].duration * 1000 };
}

/** The slot that follows the one starting at `startMs`. */
export function nextSlot(slot: Slot): Slot {
  const boundary = slot.startMs + TRACKS[slot.track].duration * 1000 + 1;
  const next = slotAt(boundary);
  return { ...next, offset: 0 };
}

let clockOffset = 0;
let clockSynced: Promise<void> | null = null;

/** Corrects for a wrong device clock using the server's time, so devices agree. */
export function syncRadioClock(): Promise<void> {
  if (!clockSynced) {
    clockSynced = (async () => {
      try {
        const sent = Date.now();
        const res = await fetch("/api/radio-clock", { cache: "no-store" });
        const { now } = (await res.json()) as { now: number };
        const received = Date.now();
        clockOffset = now + (received - sent) / 2 - received;
      } catch {
        clockOffset = 0;
      }
    })();
  }
  return clockSynced;
}

export function radioNow(): number {
  return Date.now() + clockOffset;
}
