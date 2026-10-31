import { C, col, Gfx, textWidth, truncate, wrap } from "./gfx";
import { nav, SITE } from "./navigation";
import { Rect, Scroll, scrollArea, scrolled } from "./pagekit";
import type { Btn, Win } from "./popups";
import { blink, BTN_H, button, progress } from "./ui";

const GREEN = col(18, 110, 64);
const DARK_GREEN = col(8, 70, 40);
const MINT = col(226, 242, 232);
const AUTOFILL = col(250, 255, 189);
const HEAD_H = 14;
const ROW = 16;
const LOAD_S = 2.6;
const UPGRADE = 99;
/** What's left after everything below; the upgrade fee comes off this. */
const BALANCE = 3.17;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const LOADING = ["CONTACTING VAULT...", "CHECKING YOU ARE NOT A HEIST CREW...", "COUNTING YOUR MONEY... (QUICK)", "ALMOST THERE..."];

interface Txn {
  days: number;
  desc: string;
  cat: string;
  amt: number;
}

/** Newest first. Every advertiser on the desktop got paid, apparently. */
const TXNS: Txn[] = [
  { days: 0, desc: "LUCKY 7 CASINO - DEPOSIT", cat: "GAMBLING", amt: -200 },
  { days: 0, desc: "GREASE KING - MEGA STACK MEAL", cat: "FOOD", amt: -11.49 },
  { days: 1, desc: "LUCKY 7 CASINO - WINNINGS", cat: "GAMBLING", amt: 3.5 },
  { days: 1, desc: "LUCKY 7 CASINO - DEPOSIT", cat: "GAMBLING", amt: -50 },
  { days: 1, desc: "BEAN MACHINE - THE DEVELOPER", cat: "DRINKS", amt: -7.8 },
  { days: 2, desc: "HRH PRINCE EMEKA OBI III - TRANSFER FEE", cat: "TRANSFER", amt: -1500 },
  { days: 2, desc: "ANGSTIPAN PHARMACY - 90 DAY SUPPLY", cat: "HEALTH", amt: -64.99 },
  { days: 3, desc: "SMILEX - 'FREE' TRIAL", cat: "SUBSCRIPTION", amt: -49.99 },
  { days: 3, desc: "SPRUNK VENDING MACHINE", cat: "DRINKS", amt: -1.5 },
  { days: 4, desc: "SUNNY GETAWAYS - TAXES, FEES & SUN SURCHARGE", cat: "TRAVEL", amt: -1240 },
  { days: 4, desc: "SUNNY GETAWAYS - 7 NIGHTS ALL-INCLUSIVE*", cat: "TRAVEL", amt: -9.99 },
  { days: 5, desc: "PAYROLL - YKAPF DEV LTD", cat: "SALARY", amt: 2850 },
  { days: 5, desc: "TRANSFER FROM MUM - 'FOR FOOD. NOT CASINO.'", cat: "TRANSFER", amt: 50 },
  { days: 6, desc: "LUCKY 7 CASINO - DEPOSIT", cat: "GAMBLING", amt: -20 },
  { days: 6, desc: "STREAMFLIX - MONTHLY", cat: "SUBSCRIPTION", amt: -15.99 },
  { days: 7, desc: "TUNEZ PREMIUM - MONTHLY", cat: "SUBSCRIPTION", amt: -10.99 },
  { days: 7, desc: "AI CHATBOT PRO - MONTHLY", cat: "SUBSCRIPTION", amt: -20 },
  { days: 8, desc: "DOWNLOADMORERAM.COM - PRO PLAN", cat: "SUBSCRIPTION", amt: -4.99 },
  { days: 9, desc: "GYM MEMBERSHIP (LAST VISIT: 2023)", cat: "SUBSCRIPTION", amt: -39.99 },
  { days: 10, desc: "BEAN MACHINE - THE ALL-NIGHTER", cat: "DRINKS", amt: -8.4 },
  { days: 11, desc: "CORNER PIZZA - LARGE PEPPERONI", cat: "FOOD", amt: -18.5 },
  { days: 12, desc: "CORNER SHOP - MEAL DEAL", cat: "FOOD", amt: -3.99 },
  { days: 13, desc: "FLEECA - MONTHLY ACCOUNT FEE", cat: "FEES", amt: -12 },
  { days: 13, desc: "FLEECA - FEE FOR THE MONTHLY FEE", cat: "FEES", amt: -3 },
  { days: 15, desc: "CLOUD STORAGE 2TB (USING 4GB)", cat: "SUBSCRIPTION", amt: -9.99 },
  { days: 17, desc: "GREASE KING - 20 NUGGETS", cat: "FOOD", amt: -6.49 },
  { days: 19, desc: "BEAN MACHINE - DECAF (REFUSED)", cat: "DRINKS", amt: -4.2 },
  { days: 24, desc: "SMILEX - 'FREE' TRIAL", cat: "SUBSCRIPTION", amt: -49.99 },
  { days: 35, desc: "PAYROLL - YKAPF DEV LTD", cat: "SALARY", amt: 2850 },
];

const UPGRADE_TXN: Txn = { days: 0, desc: "FLEECA PLATINUM - MONTHLY", cat: "FEES", amt: -UPGRADE };

const NOTICE = [
  "DEAR VALUED CUSTOMER,",
  "WE ARE PLANNING TO CLOSE YOUR BANK ACCOUNT FOR NO REASON.",
  "WE CANNOT STATE THE REASON. THERE IS NO REASON. PLEASE DO NOT ASK US FOR THE REASON.",
  "HOWEVER, IF YOU UPGRADE TO FLEECA PLATINUM FOR JUST $99 A MONTH, YOUR ACCOUNT WILL REMAIN OPEN.",
];
const THANKS = [
  "THANK YOU FOR UPGRADING TO FLEECA PLATINUM!",
  "YOUR ACCOUNT IS NO LONGER BEING CLOSED. IT IS NOW 'UNDER REVIEW'.",
  "$99 HAS BEEN TAKEN FROM YOUR ACCOUNT. ENJOY YOUR PLATINUM BENEFITS*.",
  "*THERE ARE NO BENEFITS.",
];

/** 0 = login, 1 = signing in, 2 = account. */
function stage(w: Win, t: number): number {
  if (!w.s.bk) return 0;
  return t - (w.s.bkAt ?? 0) < LOAD_S ? 1 : 2;
}

const txns = (w: Win) => (w.s.bu ? [UPGRADE_TXN, ...TXNS] : TXNS);
const balance = (w: Win) => BALANCE - (w.s.bu ? UPGRADE : 0);

function money(n: number, sign = true): string {
  const [whole, cents] = Math.abs(n).toFixed(2).split(".");
  const s = `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${cents}`;
  if (n < 0) return `-${s}`;
  return sign ? `+${s}` : s;
}

function dateAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const bankAddress = (w: Win, t: number) => (stage(w, t) === 2 ? "HTTPS://ONLINE.FLEECA.BANK/ACCOUNTS" : "HTTPS://ONLINE.FLEECA.BANK/LOGIN");
export const bankTitle = (w: Win, t: number) => (stage(w, t) === 2 ? "FLEECA - MY ACCOUNTS" : "FLEECA - SIGN IN");

// ---- layout ---------------------------------------------------------------------

function loginCard(M: Rect) {
  const w = Math.min(150, M.w - 12);
  const h = 92;
  const x = Math.round(M.x + (M.w - w) / 2);
  const y = M.y + HEAD_H + Math.max(4, Math.round((M.h - HEAD_H - h) / 2));
  return { x, y, w, h, login: { x: x + 8, y: y + 66, w: w - 16, h: BTN_H + 2 } };
}

function bell(M: Rect) {
  return { x: M.x + M.w - 16, y: M.y + 2, w: 12, h: 10 };
}

function logoutBtn(M: Rect): Btn {
  const b = button("LOG OUT", 0, M.y + 1, (_, win) => nav(win, SITE));
  b.x = bell(M).x - b.w - 4;
  b.h = 12;
  return b;
}

function account(M: Rect) {
  const card = { x: M.x + 4, y: M.y + HEAD_H + 4, w: M.w - 8, h: 32 };
  const listTop = card.y + card.h + 12;
  return { card, listTop, area: scrollArea(M.x + 2, listTop, M.w - 3, M.y + M.h - listTop - 2) };
}

function listScroll(w: Win, M: Rect): Scroll {
  return { area: account(M).area, content: txns(w).length * ROW + 2, key: "bls" };
}

function notice(w: Win, M: Rect) {
  const width = Math.min(M.w - 12, 176);
  const paras = w.s.bu ? THANKS : NOTICE;
  const lines: string[] = [];
  paras.forEach((p, i) => {
    if (i) lines.push("");
    lines.push(...wrap(p, width - 10));
  });
  const h = 14 + lines.length * 7 + 6 + BTN_H + 6;
  const x = Math.round(M.x + (M.w - width) / 2);
  const y = Math.max(M.y + HEAD_H + 2, Math.round(M.y + (M.h - h) / 2));
  return { x, y, w: width, h, lines };
}

export function bankScroll(w: Win, M: Rect, t: number): Scroll | null {
  return stage(w, t) === 2 && !w.s.bn ? listScroll(w, M) : null;
}

// ---- drawing ------------------------------------------------------------------------

function header(g: Gfx, M: Rect, sub: string): void {
  g.fill(M.x, M.y, M.w, HEAD_H, GREEN);
  g.fill(M.x, M.y + HEAD_H - 1, M.w, 1, DARK_GREEN);
  g.text("FLEECA", M.x + 4, M.y + 2, C.white, 2);
  const sx = M.x + 4 + textWidth("FLEECA") * 2 + 4;
  if (sx + textWidth(sub) < M.x + M.w - 70) g.text(sub, sx, M.y + 6, col(170, 225, 190));
}

function field(g: Gfx, x: number, y: number, w: number, label: string, value: string): void {
  g.text(label, x, y, C.dark);
  g.bevel(x, y + 7, w, 11, false, AUTOFILL);
  g.text(value, x + 3, y + 10, C.black);
}

function drawLogin(g: Gfx, w: Win, t: number, M: Rect, loading: boolean): void {
  const L = loginCard(M);
  g.fill(L.x + 2, L.y + 2, L.w, L.h, col(150, 175, 160));
  g.fill(L.x, L.y, L.w, L.h, C.white);
  g.frame(L.x, L.y, L.w, L.h, col(170, 200, 180));
  g.fill(L.x, L.y, L.w, 3, GREEN);
  const cx = L.x + L.w / 2;

  if (loading) {
    const since = t - (w.s.bkAt ?? 0);
    g.textC("SIGNING YOU IN", cx, L.y + 12, DARK_GREEN);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const on = (Math.floor(t * 10) - i + 80) % 8;
      g.fill(Math.round(cx + Math.cos(a) * 9) - 1, Math.round(L.y + 38 + Math.sin(a) * 9) - 1, 3, 3, on < 3 ? GREEN : C.light);
    }
    const msg = LOADING[Math.min(LOADING.length - 1, Math.floor((since / LOAD_S) * LOADING.length))];
    const lines = wrap(msg, L.w - 10);
    lines.forEach((l, i) => g.textC(l, cx, L.y + 54 + i * 7, C.shadow));
    progress(g, L.x + 8, L.y + L.h - 14, L.w - 16, since / LOAD_S, GREEN);
    return;
  }

  g.textC("SIGN IN TO ONLINE BANKING", cx, L.y + 7, DARK_GREEN);
  field(g, L.x + 8, L.y + 16, L.w - 16, "CUSTOMER ID", "YKAPF");
  field(g, L.x + 8, L.y + 36, L.w - 16, "PASSWORD", "**********");
  g.bevel(L.x + 8, L.y + 56, 7, 7, false, C.white);
  g.text("X", L.x + 10, L.y + 57, C.black);
  g.text(truncate("REMEMBER ME FOREVER", L.w - 26), L.x + 18, L.y + 57, C.dark);
  const b = L.login;
  g.fill(b.x, b.y, b.w, b.h, GREEN);
  g.frame(b.x, b.y, b.w, b.h, DARK_GREEN);
  g.textC("LOG IN", cx, b.y + 4, C.white);
  g.textC(truncate("FORGOT PASSWORD? TOO BAD.", L.w - 6), cx, L.y + L.h - 6, C.shadow);
}

function drawBell(g: Gfx, M: Rect, unread: boolean, t: number): void {
  const b = bell(M);
  const x = b.x + 2;
  const y = b.y;
  g.fill(x + 3, y, 2, 1, C.white);
  g.fill(x + 2, y + 1, 4, 1, C.white);
  g.fill(x + 1, y + 2, 6, 4, C.white);
  g.fill(x, y + 6, 8, 1, C.white);
  g.fill(x + 3, y + 8, 2, 1, C.white);
  if (unread) {
    g.disc(x + 8, y + 1, 3, blink(t, 1.5) ? C.red : C.darkRed);
    g.text("1", x + 7, y - 1, C.white);
  }
}

function drawAccount(g: Gfx, w: Win, t: number, M: Rect): void {
  const A = account(M);
  drawBell(g, M, !w.s.bseen, t);
  const c = A.card;
  g.fill(c.x, c.y, c.w, c.h, GREEN);
  g.fill(c.x, c.y + c.h - 2, c.w, 2, DARK_GREEN);
  g.text(truncate("EVERYDAY CURRENT ACCOUNT  ****4040", c.w - 8), c.x + 4, c.y + 3, col(170, 225, 190));
  g.text("AVAILABLE BALANCE", c.x + 4, c.y + 11, C.white);
  const bal = balance(w);
  g.text(money(bal, false), c.x + 4, c.y + 19, bal < 0 ? col(255, 150, 150) : C.yellow, 2);
  const list = txns(w);
  const income = list.reduce((s, x) => s + Math.max(0, x.amt), 0);
  const spent = list.reduce((s, x) => s + Math.min(0, x.amt), 0);
  if (c.w >= 170) {
    const rx = c.x + c.w - 4;
    const inS = `IN  ${money(income, false)}`;
    const outS = `OUT ${money(-spent, false)}`;
    g.text(inS, rx - textWidth(inS), c.y + 13, col(170, 255, 190));
    g.text(outS, rx - textWidth(outS), c.y + 21, col(255, 190, 190));
  }

  g.text("RECENT TRANSACTIONS", M.x + 4, A.listTop - 9, DARK_GREEN);
  g.fill(M.x + 2, A.listTop - 2, M.w - 4, 1, col(170, 200, 180));

  const S = listScroll(w, M);
  const W = S.area.w;
  scrolled(g, w, S, (pos) => {
    for (let i = 0; i < list.length; i++) {
      const y = i * ROW;
      if (y + ROW < pos || y > pos + S.area.h) continue;
      const x = list[i];
      if (i % 2) g.fill(0, y, W, ROW, col(246, 250, 247));
      const amt = money(x.amt);
      const aw = textWidth(amt);
      g.text(truncate(x.desc, W - aw - 10), 3, y + 2, C.black);
      g.text(amt, W - aw - 2, y + 2, x.amt > 0 ? col(0, 140, 50) : C.red);
      g.text(`${dateAgo(x.days)}  -  ${x.cat}`, 3, y + 9, C.shadow);
      g.fill(2, y + ROW - 1, W - 3, 1, C.light);
    }
  });

  if (w.s.bn) {
    const N = notice(w, M);
    g.fill(N.x + 2, N.y + 2, N.w, N.h, C.dark);
    g.bevel(N.x, N.y, N.w, N.h);
    g.fill(N.x + 2, N.y + 2, N.w - 4, 9, w.s.bu ? GREEN : C.darkRed);
    g.text(w.s.bu ? "FLEECA PLATINUM" : "IMPORTANT NOTICE", N.x + 4, N.y + 4, C.white);
    N.lines.forEach((l, i) => g.text(l, N.x + 5, N.y + 14 + i * 7, i === 0 ? C.navy : C.black));
  }
}

export function drawBank(g: Gfx, w: Win, t: number, M: Rect): void {
  const st = stage(w, t);
  g.fill(M.x, M.y, M.w, M.h, MINT);
  header(g, M, st === 2 ? "WELCOME BACK, YKAPF" : "ONLINE BANKING");
  if (st === 2) drawAccount(g, w, t, M);
  else drawLogin(g, w, t, M, st === 1);
}

export function bankButtons(w: Win, M: Rect, t: number): Btn[] {
  const st = stage(w, t);
  if (st === 0) {
    const L = loginCard(M);
    return [
      {
        ...L.login,
        act: (ctx, win) => {
          win.s.bk = 1;
          win.s.bkAt = ctx.t;
        },
      },
    ];
  }
  if (st === 1) return [];

  const out: Btn[] = [
    logoutBtn(M),
    {
      ...bell(M),
      act: (_, win) => {
        win.s.bn = win.s.bn ? 0 : 1;
        win.s.bseen = 1;
      },
    },
  ];
  if (w.s.bn) {
    const N = notice(w, M);
    const by = N.y + N.h - BTN_H - 5;
    if (w.s.bu) out.push(button("OK", N.x + 5, by, (_, win) => (win.s.bn = 0), 30));
    else {
      const up = button("UPGRADE - $99/MONTH", N.x + 5, by, (_, win) => {
        win.s.bu = 1;
        win.s.bls = 0;
      });
      out.push(up, button("CLOSE", up.x + up.w + 3, by, (_, win) => (win.s.bn = 0)));
    }
  }
  return out;
}
