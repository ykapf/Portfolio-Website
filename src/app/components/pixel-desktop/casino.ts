import { Area, BETS, bigText, Casino, casinoOf, FELT, FELT_DARK, fmt, GOLD, say, START_CREDITS } from "./casinoCore";
import { GAMES } from "./casinoGames";
import { C, col, Gfx, textWidth, truncate } from "./gfx";
import { footer, footerRow, footerY, Rect } from "./pagekit";
import type { Btn, Win } from "./popups";
import { blink, button } from "./ui";

const TOP_H = 22;
const MSG_H = 9;
const SEGS = [2, 5, 2, 3, 10, 2, 3, 5, 25, 2, 3, 5];
const SEG_COLOURS = [col(220, 40, 60), col(30, 30, 36), col(240, 170, 20), col(30, 30, 36), col(40, 160, 220), col(30, 30, 36)];
const SPIN_S = 3;
const REVEAL_S = 1.6;
const TILE_H = 46;

export const casinoAddress = (w: Win) => {
  const c = casinoOf(w);
  return `HTTP://WWW.LUCKY7CASINO.BET/${c.game >= 0 ? GAMES[c.game].slug : ""}`;
};

export const casinoTitle = (w: Win) => {
  const c = casinoOf(w);
  return c.game >= 0 ? `${GAMES[c.game].name} - LUCKY 7` : "LUCKY 7 CASINO";
};

const area = (M: Rect): Area => ({ x: M.x, y: M.y + TOP_H + MSG_H, w: M.w, h: footerY(M) - M.y - TOP_H - MSG_H });

function tick(c: Casino, t: number): void {
  for (let i = 0; i < GAMES.length; i++) GAMES[i].tick?.(c, t);
  const b = c.bonus;
  if (!b) return;
  if (b.phase === "spin" && t - b.at >= SPIN_S) {
    b.phase = "reveal";
    b.at = t;
  } else if (b.phase === "reveal" && t - b.at >= REVEAL_S) {
    c.mult = SEGS[b.seg];
    c.bonus = null;
    say(c, `X${c.mult} MULTIPLIER LOCKED IN FOR YOUR NEXT WIN!`, C.yellow, t);
    b.resume(t);
  }
}

// ---- bonus wheel --------------------------------------------------------------------

const SEG_A = (Math.PI * 2) / SEGS.length;
const mod = (a: number, n: number) => ((a % n) + n) % n;

function wheelAngle(c: Casino, t: number): number {
  const b = c.bonus;
  if (!b || b.phase === "ready") return t * 0.8;
  if (b.phase === "reveal") return b.to;
  const f = Math.min(1, (t - b.at) / SPIN_S);
  return b.from + (b.to - b.from) * (1 - Math.pow(1 - f, 4));
}

function bonusPanel(A: Area) {
  const w = Math.min(A.w - 8, 210);
  const h = Math.min(A.h - 4, 160);
  const x = Math.round(A.x + (A.w - w) / 2);
  const y = Math.round(A.y + (A.h - h) / 2);
  const r = Math.max(18, Math.min(44, Math.floor((h - 56) / 2)));
  return { x, y, w, h, r, cx: x + Math.round(w / 2), cy: y + 24 + r };
}

function drawBonus(g: Gfx, c: Casino, t: number, A: Area): void {
  const b = c.bonus as NonNullable<Casino["bonus"]>;
  const P = bonusPanel(A);
  for (let y = A.y; y < A.y + A.h; y += 2) g.fill(A.x, y, A.w, 1, col(0, 30, 14));
  g.fill(P.x, P.y, P.w, P.h, col(16, 10, 30));
  g.frame(P.x, P.y, P.w, P.h, GOLD);
  for (let i = 0; i < 16; i++) {
    const on = (i + Math.floor(t * 6)) % 2 === 0;
    g.disc(P.x + 3 + Math.round(((P.w - 6) * i) / 15), P.y + 2, 1, on ? C.yellow : C.red);
  }
  g.textOC("BONUS WHEEL!", P.cx, P.y + 6, blink(t, 3) ? C.yellow : GOLD, C.darkRed, textWidth("BONUS WHEEL!") * 2 <= P.w - 6 ? 2 : 1);
  const rot = wheelAngle(c, t);
  const rr = P.r * P.r;
  for (let dy = -P.r; dy <= P.r; dy++) {
    for (let dx = -P.r; dx <= P.r; dx++) {
      const d = dx * dx + dy * dy;
      if (d > rr) continue;
      if (d > (P.r - 2) * (P.r - 2)) {
        g.px(P.cx + dx, P.cy + dy, GOLD);
        continue;
      }
      const s = Math.floor(mod(Math.atan2(dy, dx) - rot, Math.PI * 2) / SEG_A);
      g.px(P.cx + dx, P.cy + dy, SEG_COLOURS[s % SEG_COLOURS.length]);
    }
  }
  for (let s = 0; s < SEGS.length; s++) {
    const a = rot + (s + 0.5) * SEG_A;
    const lx = P.cx + Math.cos(a) * P.r * 0.66;
    const ly = P.cy + Math.sin(a) * P.r * 0.66;
    g.textOC(`${SEGS[s]}X`, lx, Math.round(ly - 2), C.white, C.black);
  }
  g.disc(P.cx, P.cy, 4, GOLD);
  g.disc(P.cx, P.cy, 2, C.white);
  for (let i = 0; i < 6; i++) g.fill(P.cx - 5 + i, P.cy - P.r - 4 + i, 11 - i * 2, 1, C.white);

  const ty = P.cy + P.r + 6;
  if (b.phase === "ready") g.textC("SPIN FOR A MULTIPLIER ON YOUR NEXT WIN", P.cx, ty, C.white);
  else if (b.phase === "spin") g.textC("ROUND AND ROUND...", P.cx, ty, C.white);
  else {
    const m = SEGS[b.seg];
    if (blink(t, 6)) bigText(g, `${m}X MULTIPLIER!`, P.cx, ty - 2, C.yellow, P.w - 6);
    g.textC("BACK TO YOUR GAME...", P.cx, ty + 12, C.shadow);
  }
}

function bonusButtons(c: Casino, A: Area): Btn[] {
  if (!c.bonus || c.bonus.phase !== "ready") return [];
  const P = bonusPanel(A);
  const b = button("SPIN THE WHEEL", 0, P.cy + P.r + 15, (ctx, w) => {
    const cs = casinoOf(w);
    const bonus = cs.bonus;
    if (!bonus || bonus.phase !== "ready") return;
    bonus.seg = Math.floor(Math.random() * SEGS.length);
    bonus.from = mod(ctx.t * 0.8, Math.PI * 2);
    const target = -Math.PI / 2 - (bonus.seg + 0.5) * SEG_A;
    bonus.to = bonus.from + Math.PI * 2 * 5 + mod(target - bonus.from, Math.PI * 2);
    bonus.phase = "spin";
    bonus.at = ctx.t;
  });
  b.x = Math.round(P.cx - b.w / 2);
  return [b];
}

// ---- lobby ---------------------------------------------------------------------------

function tiles(A: Area) {
  const cols = A.w >= 250 ? 3 : 2;
  const tw = Math.floor((A.w - 8 - (cols - 1) * 4) / cols);
  const top = A.y + 24;
  return GAMES.map((_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, GAMES.length - row * cols);
    const rowW = inRow * tw + (inRow - 1) * 4;
    const x0 = Math.round(A.x + (A.w - rowW) / 2);
    return { x: x0 + (i % cols) * (tw + 4), y: top + row * (TILE_H + 4), w: tw, h: TILE_H };
  });
}

function drawLobby(g: Gfx, t: number, A: Area): void {
  bigText(g, "PICK YOUR POISON", A.x + A.w / 2, A.y + 6, GOLD, A.w - 8);
  const T = tiles(A);
  for (let i = 0; i < GAMES.length; i++) {
    const r = T[i];
    g.fill(r.x, r.y, r.w, r.h, FELT_DARK);
    g.frame(r.x, r.y, r.w, r.h, GOLD);
    g.region(r.x + 1, r.y + 1, r.w - 2, r.h - 2, () => GAMES[i].icon(g, Math.round((r.w - 2) / 2) - 20, 2, t));
    g.textC(GAMES[i].name, r.x + r.w / 2, r.y + 29, C.white);
    g.textC(truncate(GAMES[i].blurb, r.w - 4), r.x + r.w / 2, r.y + 37, col(170, 220, 180));
  }
  const last = T[T.length - 1];
  const fine = ["CREDITS ARE FAKE. SO IS YOUR LUCK.", "GOT A PROBLEM? CALL A FRIEND, NOT A CASINO."];
  for (let i = 0; i < fine.length; i++) {
    const y = last.y + TILE_H + 6 + i * 7;
    if (y + 5 < A.y + A.h) g.textC(fine[i], A.x + A.w / 2, y, col(150, 200, 160));
  }
}

// ---- page -----------------------------------------------------------------------------

export function drawCasino(g: Gfx, w: Win, t: number, M: Rect): void {
  const c = casinoOf(w);
  tick(c, t);
  const A = area(M);
  g.fill(M.x, M.y, M.w, M.h, FELT);
  for (let y = A.y; y < A.y + A.h; y += 4) for (let x = M.x + ((y / 4) % 2 ? 2 : 0); x < M.x + M.w; x += 4) g.px(x, y, FELT_DARK);

  g.fill(M.x, M.y, M.w, TOP_H, col(14, 8, 20));
  g.fill(M.x, M.y + TOP_H - 1, M.w, 1, GOLD);
  g.textO("LUCKY 7", M.x + 5, M.y + 3, GOLD, C.darkRed, 2);
  g.text("CASINO", M.x + 5 + textWidth("LUCKY 7") * 2 + 4, M.y + 8, C.pink);
  const credits = `CREDITS ${fmt(c.credits)}`;
  g.text(credits, M.x + M.w - textWidth(credits) - 4, M.y + 3, C.yellow);
  if (c.mult > 1) {
    const badge = `MULTIPLIER X${c.mult}`;
    const bw = textWidth(badge) + 6;
    const bx = M.x + M.w - bw - 3;
    g.fill(bx, M.y + 11, bw, 9, blink(t, 2) ? C.red : C.darkRed);
    g.frame(bx, M.y + 11, bw, 9, C.yellow);
    g.text(badge, bx + 3, M.y + 13, C.yellow);
  } else {
    const bet = `BET ${c.bet}`;
    g.text(bet, M.x + M.w - textWidth(bet) - 4, M.y + 12, col(200, 180, 220));
  }
  g.fill(M.x, M.y + TOP_H, M.w, MSG_H, col(6, 50, 26));
  const fresh = t - c.msgAt < 0.6 && blink(t, 8);
  g.text(truncate(c.msg, M.w - 8), M.x + 4, M.y + TOP_H + 2, fresh ? C.white : c.msgC);

  if (c.game >= 0) GAMES[c.game].draw(g, c, t, A);
  else drawLobby(g, t, A);
  if (c.bonus) drawBonus(g, c, t, A);
  footer(g, M);
}

export function casinoButtons(w: Win, M: Rect): Btn[] {
  const c = casinoOf(w);
  const A = area(M);
  if (c.bonus) return bonusButtons(c, A);
  const out: Btn[] = [];
  if (c.game < 0) {
    tiles(A).forEach((r, i) => out.push({ ...r, act: (ctx, win) => {
      const cs = casinoOf(win);
      cs.game = i;
      say(cs, `${GAMES[i].name}! PLACE YOUR BETS.`, GOLD, ctx.t);
    } }));
  } else out.push(...GAMES[c.game].buttons(c, A));

  const row: Btn[] = [];
  if (c.game >= 0) row.push(button("< LOBBY", 0, 0, (_, win) => (casinoOf(win).game = -1)));
  row.push(
    button(`BET: ${c.bet}`, 0, 0, (_, win) => {
      const cs = casinoOf(win);
      cs.bet = BETS[(BETS.indexOf(cs.bet) + 1) % BETS.length];
    }),
  );
  if (c.credits < c.bet) {
    row.push(
      button("FREE TOP UP", 0, 0, (ctx, win) => {
        const cs = casinoOf(win);
        cs.credits += START_CREDITS;
        say(cs, "THE HOUSE FEELS SORRY FOR YOU. +1,000 CREDITS.", C.yellow, ctx.t);
      }),
    );
  }
  return out.concat(footerRow(M, row));
}
