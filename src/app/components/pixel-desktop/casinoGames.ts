import {
  act,
  actionY,
  Area,
  bigText,
  CARD_H,
  CARD_W,
  Casino,
  casinoOf,
  centredRow,
  charge,
  drawCard,
  GOLD,
  pay,
  rank,
  say,
  shuffled,
  start,
  suit,
} from "./casinoCore";
import { C, col, Gfx, textWidth } from "./gfx";
import type { Btn } from "./popups";

export interface Game {
  name: string;
  slug: string;
  blurb: string;
  icon(g: Gfx, x: number, y: number, t: number): void;
  draw(g: Gfx, c: Casino, t: number, A: Area): void;
  buttons(c: Casino, A: Area): Btn[];
  tick?(c: Casino, t: number): void;
}

const ease = (f: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, f)), 3);
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---- slots ----------------------------------------------------------------------

const SYM_NAMES = ["CHERRY", "LEMON", "BELL", "BAR", "SEVEN", "DIAMOND"];
const REEL_STOP = 0.7;
const REEL_GAP = 0.32;
const SYM = 16;

function drawSym(g: Gfx, s: number, x: number, y: number): void {
  switch (s) {
    case 0:
      g.fill(x + 6, y + 2, 1, 6, C.darkGreen);
      g.fill(x + 7, y + 2, 4, 1, C.darkGreen);
      g.fill(x + 10, y + 3, 1, 4, C.darkGreen);
      g.disc(x + 5, y + 10, 3, C.red);
      g.disc(x + 10, y + 10, 3, C.red);
      g.px(x + 4, y + 9, C.white);
      g.px(x + 9, y + 9, C.white);
      break;
    case 1:
      g.disc(x + 7, y + 7, 5, C.yellow);
      g.fill(x + 1, y + 7, 2, 1, C.yellow);
      g.fill(x + 12, y + 7, 2, 1, C.yellow);
      g.px(x + 5, y + 5, C.white);
      break;
    case 2:
      for (let r = 0; r < 9; r++) {
        const half = Math.min(5, 2 + Math.floor(r / 2));
        g.fill(x + 7 - half, y + 2 + r, half * 2 + 1, 1, C.gold);
      }
      g.fill(x + 1, y + 11, 13, 1, col(200, 120, 0));
      g.disc(x + 7, y + 12, 1, col(150, 90, 0));
      g.fill(x + 6, y + 1, 3, 1, C.gold);
      break;
    case 3:
      g.fill(x + 1, y + 4, 13, 7, C.black);
      g.text("BAR", x + 2, y + 5, C.white);
      break;
    case 4:
      g.textO("7", x + 4, y + 2, C.red, C.darkRed, 2);
      break;
    default:
      for (let r = 0; r < 11; r++) {
        const half = r < 4 ? r + 2 : Math.max(0, 10 - r);
        g.fill(x + 7 - half, y + 2 + r, half * 2 + 1, 1, r < 4 ? col(150, 230, 255) : col(40, 170, 230));
      }
  }
}

const slotsDone = (c: Casino) => c.spinAt + REEL_STOP + 4 * REEL_GAP + 0.1;

const SLOTS: Game = {
  name: "SLOTS",
  slug: "SLOTS",
  blurb: "5 REELS",
  icon(g, x, y) {
    for (let i = 0; i < 3; i++) {
      g.fill(x + 1 + i * 13, y + 4, 12, 16, C.white);
      drawSym(g, 4, x - 1 + i * 13, y + 5);
    }
  },
  draw(g, c, t, A) {
    const reelW = Math.min(26, Math.floor((A.w - 24) / 5) - 2);
    const mw = reelW * 5 + 4 * 2 + 12;
    const mx = Math.round(A.x + (A.w - mw) / 2);
    const my = A.y + 8;
    const mh = 46;
    g.fill(mx, my, mw, mh, col(150, 20, 30));
    g.frame(mx, my, mw, mh, GOLD);
    g.frame(mx + 1, my + 1, mw - 2, mh - 2, col(200, 130, 0));
    for (let i = 0; i < 9; i++) g.disc(mx + 4 + Math.round(((mw - 8) * i) / 8), my - 3, 1, Math.floor(t * 4 + i) % 2 ? C.yellow : C.white);
    const wy = my + 8;
    const wh = 30;
    for (let i = 0; i < 5; i++) {
      const wx = mx + 6 + i * (reelW + 2);
      g.fill(wx, wy, reelW, wh, C.white);
      const stopAt = c.spinAt + REEL_STOP + i * REEL_GAP;
      g.region(wx, wy, reelW, wh, () => {
        const sx = Math.round((reelW - 14) / 2);
        if (t < stopAt) {
          const travel = t * 140 + i * 37;
          const off = travel % SYM;
          const base = Math.floor(travel / SYM);
          for (let k = -1; k <= 2; k++) drawSym(g, mod(base - k + i * 2, 6), sx, Math.round(7 + k * SYM + off - SYM));
        } else {
          const s = c.reels[i];
          drawSym(g, mod(s + 1, 6), sx, 7 - SYM);
          drawSym(g, s, sx, 7);
          drawSym(g, mod(s + 5, 6), sx, 7 + SYM);
        }
        g.fill(0, 0, reelW, 3, col(200, 200, 200));
        g.fill(0, wh - 3, reelW, 3, col(200, 200, 200));
      });
    }
    g.fill(mx + 3, wy + Math.round(wh / 2), mw - 6, 1, col(255, 60, 60));
    g.textC("PAYLINE", mx + mw / 2, my + mh - 7, GOLD);
    const lines = ["3 IN A ROW X3   4 X10   5 X40", "SEVENS PAY DOUBLE. 2 CHERRIES X1.5", "MATCHES COUNT FROM THE LEFT"];
    for (let i = 0; i < lines.length; i++) g.textC(lines[i], A.x + A.w / 2, my + mh + 6 + i * 7, i === 2 ? col(170, 220, 180) : C.white);
  },
  buttons(c, A) {
    return centredRow(A, actionY(A), [
      act(
        "SPIN",
        (cs, t) => {
          if (cs.slotsPending) return;
          start(cs, t, cs.bet, (t2) => {
            if (!charge(cs, cs.bet, t2)) return;
            cs.slotBet = cs.bet;
            cs.spinAt = t2;
            const first = Math.floor(Math.random() * 6);
            cs.reels = [first];
            for (let i = 1; i < 5; i++) cs.reels.push(Math.random() < 0.42 ? cs.reels[i - 1] : Math.floor(Math.random() * 6));
            cs.slotsPending = true;
            say(cs, "SPINNING... COME ON SEVENS.", C.white, t2);
          });
        },
        casinoOf,
      ),
    ]);
  },
  tick(c, t) {
    if (!c.slotsPending || t < slotsDone(c)) return;
    c.slotsPending = false;
    const r = c.reels;
    let n = 1;
    while (n < 5 && r[n] === r[0]) n++;
    let m = n >= 5 ? 40 : n === 4 ? 10 : n === 3 ? 3 : 0;
    if (m && r[0] === 4) m *= 2;
    if (!m && n === 2 && r[0] === 0) m = 1.5;
    pay(c, c.slotBet * m, m ? `${n} X ${SYM_NAMES[r[0]]}!` : "NO LUCK THIS TIME.", t, c.slotBet);
  },
};

// ---- roulette --------------------------------------------------------------------

const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const isRed = (n: number) => REDS.indexOf(n) >= 0;
const R_BETS: [string, number, (n: number) => boolean][] = [
  ["RED", 2, (n) => isRed(n)],
  ["BLACK", 2, (n) => n > 0 && !isRed(n)],
  ["ODD", 2, (n) => n > 0 && n % 2 === 1],
  ["EVEN", 2, (n) => n > 0 && n % 2 === 0],
  ["1-18", 2, (n) => n >= 1 && n <= 18],
  ["19-36", 2, (n) => n >= 19],
  ["ZERO", 36, (n) => n === 0],
];
const R_SPIN = 3.4;
const CELL = 15;
const numColour = (n: number) => (n === 0 ? col(20, 150, 60) : isRed(n) ? col(200, 30, 40) : col(20, 20, 24));
const colourName = (n: number) => (n === 0 ? "GREEN" : isRed(n) ? "RED" : "BLACK");

function rPos(c: Casino, t: number): number {
  return c.rPending ? c.rFrom + (c.rTo - c.rFrom) * ease((t - c.rAt) / R_SPIN) : c.rPos;
}

const ROULETTE: Game = {
  name: "ROULETTE",
  slug: "ROULETTE",
  blurb: "RED OR BLACK?",
  icon(g, x, y, t) {
    const cx = x + 20;
    const cy = y + 12;
    for (let dy = -10; dy <= 10; dy++) {
      for (let dx = -10; dx <= 10; dx++) {
        const d = dx * dx + dy * dy;
        if (d > 100) continue;
        const a = Math.atan2(dy, dx) + t;
        const seg = mod(Math.floor((a / (Math.PI * 2)) * 12), 12);
        g.px(cx + dx, cy + dy, d < 16 ? GOLD : seg % 2 ? col(200, 30, 40) : C.black);
      }
    }
    g.disc(cx, cy, 1, C.white);
  },
  draw(g, c, t, A) {
    const cx = Math.round(A.x + A.w / 2);
    const sy = A.y + 10;
    const p = rPos(c, t);
    g.fill(A.x + 4, sy - 2, A.w - 8, 22, col(60, 34, 18));
    g.region(A.x + 6, sy, A.w - 12, 18, () => {
      const left = A.x + 6;
      const span = Math.ceil(A.w / CELL / 2) + 2;
      for (let k = Math.floor(p) - span; k <= Math.floor(p) + span; k++) {
        const n = ORDER[mod(k, 37)];
        const x = Math.round(cx - left + (k - p) * CELL - CELL / 2);
        g.fill(x, 0, CELL - 1, 18, numColour(n));
        g.textC(String(n), x + CELL / 2, 7, C.white);
      }
    });
    for (let i = 0; i < 4; i++) {
      g.fill(cx - 3 + i, sy - 5 + i, 7 - i * 2, 1, GOLD);
      g.fill(cx - 3 + i, sy + 22 - i, 7 - i * 2, 1, GOLD);
    }
    g.frame(Math.round(cx - CELL / 2) - 1, sy - 1, CELL + 1, 20, GOLD);

    const ry = sy + 28;
    if (!c.rPending && c.rHistory.length) {
      const n = c.rHistory[0];
      bigText(g, `${n} ${colourName(n)}`, cx, ry, n === 0 ? C.lime : isRed(n) ? col(255, 120, 120) : C.white, A.w - 8);
    } else if (c.rPending) bigText(g, "NO MORE BETS", cx, ry, GOLD, A.w - 8);
    else bigText(g, "PLACE YOUR BET", cx, ry, GOLD, A.w - 8);
    const hx = Math.round(cx - (Math.min(8, c.rHistory.length) * 12) / 2);
    for (let i = 0; i < Math.min(8, c.rHistory.length); i++) {
      const n = c.rHistory[i];
      g.fill(hx + i * 12, ry + 15, 11, 9, numColour(n));
      g.textC(String(n), hx + i * 12 + 5.5, ry + 17, C.white);
    }
    const [name, payout] = R_BETS[c.rBet];
    g.textC(`BETTING ON ${name}: PAYS ${payout}X`, cx, actionY(A) - 20, GOLD);
  },
  buttons(c, A) {
    const pick = (i: number) => act(i === c.rBet ? `>${R_BETS[i][0]}<` : R_BETS[i][0], (cs) => !cs.rPending && (cs.rBet = i), casinoOf);
    const y = actionY(A) - 12;
    const row1 = centredRow(A, y, [0, 1, 2, 3].map(pick));
    const spin = act(
        "SPIN",
        (cs, t) => {
          if (cs.rPending) return;
          start(cs, t, cs.bet, (t2) => {
            if (!charge(cs, cs.bet, t2)) return;
            cs.rStake = cs.bet;
            const ri = Math.floor(Math.random() * 37);
            const base = Math.ceil(cs.rPos) + 37 * 3;
            cs.rFrom = cs.rPos;
            cs.rTo = base + mod(ri - mod(base, 37), 37);
            cs.rAt = t2;
            cs.rPending = true;
            say(cs, "ROUND AND ROUND SHE GOES...", C.white, t2);
          });
        },
        casinoOf,
    );
    return row1.concat(centredRow(A, y + 12, [4, 5, 6].map(pick).concat(spin)));
  },
  tick(c, t) {
    if (!c.rPending || t - c.rAt < R_SPIN) return;
    c.rPending = false;
    c.rPos = c.rTo;
    const n = ORDER[mod(c.rTo, 37)];
    c.rHistory.unshift(n);
    if (c.rHistory.length > 8) c.rHistory.pop();
    const [, payout, wins] = R_BETS[c.rBet];
    pay(c, wins(n) ? c.rStake * payout : 0, wins(n) ? `${n} ${colourName(n)}! WIN` : `${n} ${colourName(n)}. NO WIN.`, t, c.rStake);
  },
};

// ---- blackjack -------------------------------------------------------------------

function handValue(hand: number[]): number {
  let total = 0;
  let aces = 0;
  for (let i = 0; i < hand.length; i++) {
    const r = rank(hand[i]);
    if (r === 12) {
      aces++;
      total += 11;
    } else total += Math.min(10, r + 2);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

const draw1 = (c: Casino) => c.deck.pop() as number;

function settleBlackjack(c: Casino, t: number): void {
  while (handValue(c.dealer) < 17) c.dealer.push(draw1(c));
  const p = handValue(c.player);
  const d = handValue(c.dealer);
  c.bj = "done";
  if (d > 21) pay(c, c.bjBet * 2, `DEALER BUSTS WITH ${d}! WIN`, t, c.bjBet);
  else if (p > d) pay(c, c.bjBet * 2, `${p} BEATS ${d}! WIN`, t, c.bjBet);
  else if (p === d) {
    c.credits += c.bjBet;
    say(c, `PUSH AT ${p}. STAKE RETURNED.`, C.white, t);
  } else pay(c, 0, `DEALER WINS, ${d} BEATS ${p}.`, t, c.bjBet);
}

function bjHit(c: Casino, t: number): void {
  if (c.bj !== "play") return;
  c.player.push(draw1(c));
  const v = handValue(c.player);
  if (v > 21) {
    c.bj = "done";
    pay(c, 0, `BUST WITH ${v}. OUCH.`, t, c.bjBet);
  } else if (v === 21) settleBlackjack(c, t);
}

function cardRow(g: Gfx, cards: number[], cx: number, y: number, maxW: number, hideSecond: boolean): void {
  const step = Math.min(CARD_W + 3, Math.floor((maxW - CARD_W) / Math.max(1, cards.length - 1)));
  const total = CARD_W + step * (cards.length - 1);
  const x0 = Math.round(cx - total / 2);
  for (let i = 0; i < cards.length; i++) drawCard(g, hideSecond && i === 1 ? -1 : cards[i], x0 + i * step, y);
}

const BLACKJACK: Game = {
  name: "BLACKJACK",
  slug: "BLACKJACK",
  blurb: "BEAT THE DEALER",
  icon(g, x, y) {
    drawCard(g, 12, x + 4, y);
    drawCard(g, 11 + 13, x + 18, y + 1);
  },
  draw(g, c, t, A) {
    const cx = A.x + A.w / 2;
    g.textC("DEALER STANDS ON 17. BLACKJACK PAYS 3 TO 2.", cx, A.y + 3, col(170, 220, 180));
    const dy = A.y + 18;
    const hidden = c.bj === "play";
    const dv = hidden ? "?" : String(handValue(c.dealer));
    g.text(`DEALER ${c.dealer.length ? dv : ""}`, A.x + 6, dy, C.white);
    if (c.dealer.length) cardRow(g, c.dealer, cx, dy + 9, A.w - 20, hidden);
    const py = dy + CARD_H + 22;
    g.text(`YOU ${c.player.length ? handValue(c.player) : ""}`, A.x + 6, py, C.white);
    if (c.player.length) cardRow(g, c.player, cx, py + 9, A.w - 20, false);
    if (!c.player.length) bigText(g, "PRESS DEAL", cx, dy + 30, GOLD, A.w - 8);
  },
  buttons(c, A) {
    if (c.bj !== "play") {
      return centredRow(A, actionY(A), [
        act(
          "DEAL",
          (cs, t) =>
            start(cs, t, cs.bet, (t2) => {
              if (!charge(cs, cs.bet, t2)) return;
              cs.bjBet = cs.bet;
              cs.deck = shuffled();
              cs.player = [draw1(cs), draw1(cs)];
              cs.dealer = [draw1(cs), draw1(cs)];
              cs.bj = "play";
              if (handValue(cs.player) === 21) {
                cs.bj = "done";
                if (handValue(cs.dealer) === 21) {
                  cs.credits += cs.bjBet;
                  say(cs, "BOTH BLACKJACK. PUSH.", C.white, t2);
                } else pay(cs, cs.bjBet * 2.5, "BLACKJACK!", t2, cs.bjBet);
              } else say(cs, "HIT OR STAND?", C.white, t2);
            }),
          casinoOf,
        ),
      ]);
    }
    const btns = [act("HIT", bjHit, casinoOf), act("STAND", (cs, t) => cs.bj === "play" && settleBlackjack(cs, t), casinoOf)];
    if (c.player.length === 2 && c.credits >= c.bjBet) {
      btns.push(
        act(
          "DOUBLE",
          (cs, t) => {
            if (cs.bj !== "play" || cs.player.length !== 2 || !charge(cs, cs.bjBet, t)) return;
            cs.bjBet *= 2;
            bjHit(cs, t);
            if (cs.bj === "play") settleBlackjack(cs, t);
          },
          casinoOf,
        ),
      );
    }
    return centredRow(A, actionY(A), btns);
  },
};

// ---- video poker -----------------------------------------------------------------

const PAYS: [string, number][] = [
  ["ROYAL FLUSH", 250],
  ["STRAIGHT FLUSH", 50],
  ["FOUR OF A KIND", 25],
  ["FULL HOUSE", 9],
  ["FLUSH", 6],
  ["STRAIGHT", 4],
  ["THREE OF A KIND", 3],
  ["TWO PAIR", 2],
  ["JACKS OR BETTER", 1],
];

function pokerHand(hand: number[]): number {
  const counts: number[] = new Array(13).fill(0);
  for (let i = 0; i < 5; i++) counts[rank(hand[i])]++;
  const flush = hand.every((c) => suit(c) === suit(hand[0]));
  const ranks = hand.map(rank).sort((a, b) => a - b);
  const unique = ranks.every((r, i) => i === 0 || r !== ranks[i - 1]);
  const wheel = ranks.join(",") === "0,1,2,3,12";
  const straight = unique && (ranks[4] - ranks[0] === 4 || wheel);
  const groups = counts.filter((n) => n > 1).sort((a, b) => b - a);
  if (straight && flush) return ranks[0] === 8 ? 0 : 1;
  if (groups[0] === 4) return 2;
  if (groups[0] === 3 && groups[1] === 2) return 3;
  if (flush) return 4;
  if (straight) return 5;
  if (groups[0] === 3) return 6;
  if (groups[0] === 2 && groups[1] === 2) return 7;
  for (let r = 9; r < 13; r++) if (counts[r] === 2) return 8;
  return -1;
}

function pokerLayout(A: Area) {
  const step = Math.min(CARD_W + 5, Math.floor((A.w - 10) / 5));
  const total = CARD_W + step * 4;
  return { x0: Math.round(A.x + (A.w - total) / 2), y: A.y + 74, step };
}

const POKER: Game = {
  name: "POKER",
  slug: "VIDEO-POKER",
  blurb: "JACKS OR BETTER",
  icon(g, x, y) {
    drawCard(g, -1, x + 2, y + 1);
    drawCard(g, -1, x + 10, y);
    drawCard(g, 12 + 39, x + 20, y + 1);
  },
  draw(g, c, t, A) {
    const win = c.pk === "done" ? pokerHand(c.hand) : -1;
    const colW = Math.floor((A.w - 12) / 2);
    for (let i = 0; i < PAYS.length; i++) {
      const x = A.x + 6 + (i < 5 ? 0 : colW);
      const y = A.y + 4 + (i % 5) * 8;
      const hot = i === win;
      if (hot) g.fill(x - 1, y - 1, colW - 4, 7, Math.floor(t * 4) % 2 ? C.yellow : GOLD);
      g.text(PAYS[i][0], x, y, hot ? C.black : C.white);
      const p = `X${PAYS[i][1]}`;
      g.text(p, x + colW - 6 - textWidth(p), y, hot ? C.black : GOLD);
    }
    const L = pokerLayout(A);
    if (!c.hand.length) {
      for (let i = 0; i < 5; i++) drawCard(g, -1, L.x0 + i * L.step, L.y);
      bigText(g, "PRESS DEAL", A.x + A.w / 2, L.y - 20, GOLD, A.w - 8);
      return;
    }
    for (let i = 0; i < 5; i++) {
      const held = c.held[i] && c.pk === "hold";
      if (c.held[i]) g.textC("HELD", L.x0 + i * L.step + CARD_W / 2, L.y - 10, held || c.pk === "done" ? C.yellow : C.white);
      drawCard(g, c.hand[i], L.x0 + i * L.step, L.y, held ? 3 : 0);
    }
    if (c.pk === "hold") g.textC("CLICK CARDS TO HOLD THEM, THEN DRAW", A.x + A.w / 2, L.y + CARD_H + 5, col(170, 220, 180));
  },
  buttons(c, A) {
    const out: Btn[] = [];
    if (c.pk === "hold") {
      const L = pokerLayout(A);
      for (let i = 0; i < 5; i++) {
        out.push({ x: L.x0 + i * L.step, y: L.y - 12, w: CARD_W, h: CARD_H + 12, act: (_, w) => (casinoOf(w).held[i] = !casinoOf(w).held[i]) });
      }
      return out.concat(
        centredRow(A, actionY(A), [
          act(
            "DRAW",
            (cs, t) => {
              if (cs.pk !== "hold") return;
              for (let i = 0; i < 5; i++) if (!cs.held[i]) cs.hand[i] = draw1(cs);
              cs.pk = "done";
              const h = pokerHand(cs.hand);
              pay(cs, h >= 0 ? cs.pkBet * PAYS[h][1] : 0, h >= 0 ? `${PAYS[h][0]}!` : "NOTHING. NOT EVEN JACKS.", t, cs.pkBet);
            },
            casinoOf,
          ),
        ]),
      );
    }
    return centredRow(A, actionY(A), [
      act(
        "DEAL",
        (cs, t) =>
          start(cs, t, cs.bet, (t2) => {
            if (!charge(cs, cs.bet, t2)) return;
            cs.pkBet = cs.bet;
            cs.deck = shuffled();
            cs.hand = [draw1(cs), draw1(cs), draw1(cs), draw1(cs), draw1(cs)];
            cs.held = [false, false, false, false, false];
            cs.pk = "hold";
            say(cs, "PICK YOUR KEEPERS.", C.white, t2);
          }),
        casinoOf,
      ),
    ]);
  },
};

// ---- plinko ----------------------------------------------------------------------

const ROWS = 8;
const P_MULTS = [10, 4, 2, 1, 0.3, 1, 2, 4, 10];
const P_LABEL = ["10", "4", "2", "1", ".3", "1", "2", "4", "10"];
const STEP = 0.14;
const MAX_BALLS = 6;

function plinkoGeo(A: Area) {
  const sp = Math.max(9, Math.min(16, Math.floor(Math.min((A.w - 16) / 10, (A.h - 34) / (ROWS + 1.5)))));
  return { sp, cx: Math.round(A.x + A.w / 2), y0: A.y + 10 };
}

function multColour(m: number): number {
  if (m >= 10) return col(230, 40, 60);
  if (m >= 4) return col(240, 110, 40);
  if (m >= 2) return col(240, 190, 40);
  if (m >= 1) return col(120, 200, 80);
  return col(80, 150, 220);
}

const PLINKO: Game = {
  name: "PLINKO",
  slug: "PLINKO",
  blurb: "DROP IT LIKE IT'S HOT",
  icon(g, x, y, t) {
    for (let r = 0; r < 4; r++) for (let j = 0; j <= r + 1; j++) g.px(x + 20 + (j - (r + 1) / 2) * 6, y + 4 + r * 5, C.white);
    const b = Math.floor(t * 3) % 4;
    g.disc(x + 20 + (b % 2 ? 3 : -3), y + 2 + b * 5, 1, C.pink);
  },
  draw(g, c, t, A) {
    const G = plinkoGeo(A);
    for (let r = 0; r < ROWS; r++) {
      for (let j = 0; j < r + 3; j++) {
        const x = Math.round(G.cx + (j - (r + 2) / 2) * G.sp);
        g.fill(x - 1, G.y0 + r * G.sp, 2, 2, C.white);
      }
    }
    const sy = G.y0 + ROWS * G.sp - 2;
    for (let i = 0; i <= ROWS; i++) {
      const x = Math.round(G.cx + (i - ROWS / 2) * G.sp - G.sp / 2) + 1;
      const hit = c.balls.some((b) => b.done && b.path.reduce((s, v) => s + v, 0) === i && t - b.at < ROWS * STEP + 1.2);
      g.fill(x, sy, G.sp - 2, 9, hit && Math.floor(t * 8) % 2 ? C.white : multColour(P_MULTS[i]));
      g.textC(P_LABEL[i], x + (G.sp - 2) / 2, sy + 2, C.black);
    }
    for (let i = 0; i < c.balls.length; i++) {
      const b = c.balls[i];
      const k = Math.min(ROWS, (t - b.at) / STEP);
      const r = Math.floor(k);
      const f = k - r;
      const right = (n: number) => b.path.slice(0, n).reduce((s, v) => s + v, 0);
      const xAt = (n: number) => G.cx + (right(n) - n / 2) * G.sp;
      const x = r >= ROWS ? xAt(ROWS) : xAt(r) + (xAt(r + 1) - xAt(r)) * f;
      const y = G.y0 - G.sp / 2 + k * G.sp - (r < ROWS ? Math.sin(f * Math.PI) * G.sp * 0.35 : 0);
      g.disc(Math.round(x), Math.round(y), 2, C.pink);
      g.px(Math.round(x) - 1, Math.round(y) - 1, C.white);
    }
    g.textC("LOWER MULTIPLIERS IN THE MIDDLE. OBVIOUSLY.", A.x + A.w / 2, sy + 12, col(170, 220, 180));
  },
  buttons(c, A) {
    return centredRow(A, actionY(A), [
      act(
        "DROP BALL",
        (cs, t) => {
          if (cs.balls.filter((b) => !b.done).length >= MAX_BALLS) return;
          start(cs, t, cs.bet, (t2) => {
            if (!charge(cs, cs.bet, t2)) return;
            const path: number[] = [];
            for (let i = 0; i < ROWS; i++) path.push(Math.random() < 0.5 ? 0 : 1);
            cs.balls.push({ path, at: t2, bet: cs.bet, done: false });
          });
        },
        casinoOf,
      ),
    ]);
  },
  tick(c, t) {
    for (let i = 0; i < c.balls.length; i++) {
      const b = c.balls[i];
      if (b.done || t - b.at < ROWS * STEP) continue;
      b.done = true;
      const m = P_MULTS[b.path.reduce((s, v) => s + v, 0)];
      pay(c, b.bet * m, `BALL LANDS ON ${m === 0.3 ? "0.3" : m}X`, t, b.bet);
    }
    c.balls = c.balls.filter((b) => !b.done || t - b.at < ROWS * STEP + 1.5);
  },
};

export const GAMES: Game[] = [POKER, BLACKJACK, ROULETTE, SLOTS, PLINKO];
