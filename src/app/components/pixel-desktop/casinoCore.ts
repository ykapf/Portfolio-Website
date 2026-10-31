import { C, col, Gfx, Sprite, textWidth } from "./gfx";
import type { Btn, Win } from "./popups";
import { button } from "./ui";

export interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball {
  path: number[];
  at: number;
  bet: number;
  done: boolean;
}

export interface Bonus {
  phase: "ready" | "spin" | "reveal";
  at: number;
  seg: number;
  from: number;
  to: number;
  resume: (t: number) => void;
}

export interface Casino {
  credits: number;
  bet: number;
  game: number;
  /** Multiplier waiting to be applied to the next win (1 = none). */
  mult: number;
  msg: string;
  msgC: number;
  msgAt: number;
  bonus: Bonus | null;
  // slots
  reels: number[];
  spinAt: number;
  slotsPending: boolean;
  slotBet: number;
  // roulette
  rBet: number;
  rPos: number;
  rFrom: number;
  rTo: number;
  rAt: number;
  rPending: boolean;
  rStake: number;
  rHistory: number[];
  // blackjack
  deck: number[];
  player: number[];
  dealer: number[];
  bj: "idle" | "play" | "done";
  bjBet: number;
  // video poker
  hand: number[];
  held: boolean[];
  pk: "idle" | "hold" | "done";
  pkBet: number;
  // plinko
  balls: Ball[];
}

export const START_CREDITS = 1000;
export const BETS = [10, 25, 50, 100, 250];
const BONUS_CHANCE = 0.22;

export const FELT = col(18, 104, 56);
export const FELT_DARK = col(10, 76, 40);
export const GOLD = col(255, 196, 40);

const states = new WeakMap<Win, Casino>();

export function casinoOf(w: Win): Casino {
  let c = states.get(w);
  if (!c) {
    c = {
      credits: START_CREDITS,
      bet: 25,
      game: -1,
      mult: 1,
      msg: "WELCOME! 1,000 FREE CREDITS. THE HOUSE ALWAYS WINS.",
      msgC: GOLD,
      msgAt: 0,
      bonus: null,
      reels: [4, 4, 4, 4, 4],
      spinAt: -99,
      slotsPending: false,
      slotBet: 0,
      rBet: 0,
      rPos: 0,
      rFrom: 0,
      rTo: 0,
      rAt: -99,
      rPending: false,
      rStake: 0,
      rHistory: [],
      deck: [],
      player: [],
      dealer: [],
      bj: "idle",
      bjBet: 0,
      hand: [],
      held: [false, false, false, false, false],
      pk: "idle",
      pkBet: 0,
      balls: [],
    };
    states.set(w, c);
  }
  return c;
}

export function say(c: Casino, msg: string, colour: number, t: number): void {
  c.msg = msg;
  c.msgC = colour;
  c.msgAt = t;
}

export const fmt = (n: number) => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Takes the stake, or says no if the player is broke. */
export function charge(c: Casino, amount: number, t: number): boolean {
  if (c.credits < amount) {
    say(c, "NOT ENOUGH CREDITS. LOWER YOUR BET OR GRAB A FREE TOP UP.", C.red, t);
    return false;
  }
  c.credits -= amount;
  return true;
}

/** Pays out `base` credits; a real win (more than the stake back) applies and uses up any bonus multiplier. */
export function pay(c: Casino, base: number, label: string, t: number, stake: number): void {
  base = Math.floor(base);
  if (base <= 0) {
    say(c, label || "NO WIN. THE HOUSE THANKS YOU.", col(255, 140, 140), t);
    return;
  }
  if (c.mult > 1 && base > stake) {
    const total = base * c.mult;
    say(c, `${label} ${fmt(base)} X${c.mult} = ${fmt(total)}!`, C.lime, t);
    c.credits += total;
    c.mult = 1;
    return;
  }
  c.credits += base;
  say(c, `${label} +${fmt(base)}`, C.lime, t);
}

/** Starts a round, but sometimes the bonus wheel interrupts first and resumes it afterwards. */
export function start(c: Casino, t: number, stake: number, fn: (t: number) => void): void {
  if (c.bonus) return;
  if (c.credits < stake) {
    charge(c, stake, t);
    return;
  }
  if (c.mult === 1 && Math.random() < BONUS_CHANCE) {
    c.bonus = { phase: "ready", at: t, seg: 0, from: 0, to: 0, resume: fn };
    return;
  }
  fn(t);
}

// ---- cards ---------------------------------------------------------------------

export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
export const rank = (card: number) => card % 13;
export const suit = (card: number) => Math.floor(card / 13);

const pip = (rows: string[], c: number): Sprite => ({ rows, pal: { "#": c } });
const RED_SUIT = col(210, 20, 30);
const SUITS: Sprite[] = [
  pip(["..#..", ".###.", "#####", "#####", "..#.."], C.black),
  pip([".#.#.", "#####", "#####", ".###.", "..#.."], RED_SUIT),
  pip(["..#..", ".###.", "#####", ".###.", "..#.."], RED_SUIT),
  pip([".###.", ".###.", "#####", "#####", "..#.."], C.black),
];

export function shuffled(): number[] {
  const d: number[] = [];
  for (let i = 0; i < 52; i++) d.push(i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = d[i];
    d[i] = d[j];
    d[j] = tmp;
  }
  return d;
}

export const CARD_W = 17;
export const CARD_H = 23;

/** A playing card; `card < 0` draws the back. */
export function drawCard(g: Gfx, card: number, x: number, y: number, lift = 0): void {
  y -= lift;
  g.fill(x + 1, y + 1, CARD_W, CARD_H, col(0, 50, 20));
  if (card < 0) {
    g.fill(x, y, CARD_W, CARD_H, col(170, 20, 40));
    g.frame(x, y, CARD_W, CARD_H, C.white);
    for (let py = 2; py < CARD_H - 2; py += 2) for (let px = 2 + (py % 4 ? 1 : 0); px < CARD_W - 2; px += 2) g.px(x + px, y + py, col(220, 70, 90));
    return;
  }
  g.fill(x, y, CARD_W, CARD_H, C.white);
  g.frame(x, y, CARD_W, CARD_H, C.shadow);
  const s = suit(card);
  const ink = s === 1 || s === 2 ? RED_SUIT : C.black;
  g.text(RANKS[rank(card)], x + 2, y + 2, ink);
  g.sprite(SUITS[s], x + CARD_W - 7, y + 2);
  g.sprite(SUITS[s], x + Math.round(CARD_W / 2) - 5, y + 10, 2);
}

// ---- layout helpers ---------------------------------------------------------------

/** Lays labelled buttons out centred in a row at `y`. */
export function centredRow(A: Area, y: number, btns: Btn[]): Btn[] {
  const total = btns.reduce((s, b) => s + b.w, 0) + (btns.length - 1) * 3;
  let x = Math.round(A.x + (A.w - total) / 2);
  for (let i = 0; i < btns.length; i++) {
    btns[i].x = x;
    btns[i].y = y;
    x += btns[i].w + 3;
  }
  return btns;
}

export const actionY = (A: Area) => A.y + A.h - 14;

export function act(label: string, fn: (c: Casino, t: number) => void, getC: (w: Win) => Casino): Btn {
  return button(label, 0, 0, (ctx, w) => fn(getC(w), ctx.t), 28);
}

export function bigText(g: Gfx, s: string, cx: number, y: number, c: number, maxW: number): void {
  const scale = textWidth(s) * 2 <= maxW ? 2 : 1;
  g.textOC(s, cx, y, c, C.black, scale);
}
