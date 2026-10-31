import { FILE, ICON, STAR, TROPHY } from "./art";
import { BROWSER } from "./browser";
import { C, col, Gfx, wrap } from "./gfx";
import type { Scroll } from "./pagekit";
import { blink, bottomButton, GITHUB_URL, LINKEDIN_URL, progress } from "./ui";

export { GITHUB_URL, LINKEDIN_URL };

export type Kind =
  | "browser"
  | "winner"
  | "prize"
  | "ram"
  | "virus"
  | "stars"
  | "slots"
  | "sprunk"
  | "trick"
  | "cleaner"
  | "chat"
  | "achievement"
  | "bin"
  | "projects";

export interface Win {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  born: number;
  seed: number;
  /** Per-window animation and easter-egg state. */
  s: Record<string, number>;
}

/** What a pop-up is allowed to do to the desktop. */
export interface Ctx {
  t: number;
  spawn(kind: Kind, x?: number, y?: number, s?: Record<string, number>): Win;
  later(delay: number, fn: () => void): void;
  open(url: string): void;
  go(path: string): void;
  crash(): void;
  close(win: Win): void;
}

export interface Btn {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Labelled buttons get standard bevel chrome; unlabelled ones are drawn by the body. */
  label?: string;
  act(ctx: Ctx, win: Win): void;
}

export interface PopupDef {
  w: number;
  h: number;
  title: string;
  bar?: number;
  /** Counts toward the auto-spawning ad budget. */
  ad?: boolean;
  /** Only one copy may be open; opening it again focuses the existing one. */
  single?: boolean;
  body(g: Gfx, win: Win, t: number, bw: number, bh: number): void;
  buttons?(win: Win, t: number, bw: number, bh: number): Btn[];
  /** The window's scrolling viewport, if its current content has one. */
  scroll?(win: Win, t: number, bw: number, bh: number): Scroll | null;
}

export const DEFS: Record<Kind, PopupDef> = {
  browser: BROWSER,

  winner: {
    w: 132,
    h: 80,
    title: "CONGRATULATIONS!!!.EXE",
    ad: true,
    body(g, win, t, bw, bh) {
      const shift = Math.floor(t * 6);
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) g.px(x, y, ((x + y + shift) >> 3) & 1 ? C.yellow : C.gold);
      }
      g.fill(8, 4, bw - 16, 40, C.black);
      g.frame(8, 4, bw - 16, 40, C.red);
      const cx = bw / 2;
      g.textC("YOU ARE THE", cx, 8, C.white);
      g.textC("1,000,000TH", cx, 15, blink(t, 1.5) ? C.red : C.yellow, 2);
      g.textC("VISITOR!", cx, 28, C.white);
      g.textC("CLAIM YOUR PRIZE NOW", cx, 36, C.lime);
    },
    buttons: (win, t, bw, bh) => [
      bottomButton("CLAIM PRIZE", bw, bh, (ctx, w) => ctx.spawn("prize", w.x + 14, w.y + 16)),
    ],
  },

  prize: {
    w: 116,
    h: 70,
    title: "YOUR_PRIZE.TXT",
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.white);
      const cx = bw / 2;
      g.textC("CONGRATS! YOU WON:", cx, 3, C.black);
      g.fill(6, 11, bw - 12, 28, C.yellow);
      for (let x = 6; x < bw - 6; x += 4) {
        g.fill(x, 11, 2, 1, C.gold);
        g.fill(x, 38, 2, 1, C.gold);
      }
      g.textC("1X", cx, 14, C.darkRed);
      g.textC("HIRE YKAPF", cx, 21, C.red, 2);
      g.textC("VOUCHER", cx, 32, C.darkRed);
    },
    buttons: (win, t, bw, bh) => [bottomButton("REDEEM", bw, bh, (ctx) => ctx.open(LINKEDIN_URL))],
  },

  ram: {
    w: 124,
    h: 76,
    title: "DOWNLOADMORERAM.COM",
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.black);
      const cx = bw / 2;
      g.textC("DOWNLOAD", cx, 3, C.lime);
      g.textC("MORE RAM!", cx, 10, C.lime, 2);
      const rx = Math.round(cx - 40);
      g.fill(rx, 24, 80, 12, col(20, 120, 40));
      for (let i = 0; i < 6; i++) g.fill(rx + 3 + i * 13, 26, 10, 7, col(25, 25, 25));
      for (let x = 0; x < 80; x += 2) if (x < 50 || x > 53) g.fill(rx + x, 36, 1, 2, C.gold);
      g.text("16GB", rx + 3, 27, C.shadow);

      const since = win.s.dl ? t - win.s.dl : -1;
      if (since < 0) {
        g.textC("100% FREE! NO VIRUS!", cx, 41, C.yellow);
      } else if (since < 2.6) {
        g.textC(`DOWNLOADING RAM... ${Math.floor((since / 2.6) * 100)}%`, cx, 41, C.white);
        progress(g, 10, bh - 13, bw - 20, since / 2.6, C.navy);
      } else {
        g.textC("ERROR: TOO MUCH RAM", cx, 41, blink(t, 3) ? C.red : C.white);
        progress(g, 10, bh - 13, bw - 20, 1, C.red);
        if (since > 5.5) win.s.dl = 0;
      }
    },
    buttons: (win, t, bw, bh) => (win.s.dl ? [] : [bottomButton("DOWNLOAD NOW", bw, bh, (ctx, w) => (w.s.dl = ctx.t))]),
  },

  virus: {
    w: 120,
    h: 66,
    title: "WARNING!!!",
    bar: C.darkRed,
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.face);
      for (let r = 0; r < 19; r++) {
        const half = Math.round((r * 10) / 18);
        g.fill(16 - half - 1, 5 + r, half * 2 + 3, 1, C.black);
      }
      for (let r = 1; r < 18; r++) {
        const half = Math.round(((r - 1) * 9) / 17);
        g.fill(16 - half, 5 + r, half * 2 + 1, 1, C.yellow);
      }
      g.fill(15, 10, 2, 7, C.black);
      g.fill(15, 19, 2, 2, C.black);
      const n = win.s.n || 37;
      g.text("YOUR PC HAS", 32, 4, C.black);
      g.text(`${n} VIRUS${n === 1 ? "" : "ES"}`, 32, 11, C.red, n > 99 ? 1 : 2);
      g.text("DETECTED!!", 32, 24, C.black);
    },
    buttons: (win, t, bw, bh) => [
      bottomButton("SCAN NOW", bw, bh, (ctx, w) => {
        const n = (w.s.n || 37) * 2;
        for (let i = 0; i < 3; i++) {
          ctx.later(0.15 * i, () => ctx.spawn("virus", w.x + 10 + i * 10, w.y + 10 + i * 10, { n: n + i }));
        }
      }),
    ],
  },

  stars: {
    w: 128,
    h: 72,
    title: "FREEGITHUBSTARS.XYZ",
    bar: col(60, 30, 140),
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, col(30, 20, 70));
      for (let i = 0; i < 9; i++) {
        if (blink(t + i * 0.37, 1.3)) g.px((i * 41 + 7) % bw, (i * 17 + 3) % (bh - 14), C.white);
      }
      const beat = Math.floor(t * 1.6) % 2;
      g.sprite(STAR, 4 - beat, 12 - beat, 2);
      const cx = 26 + (bw - 26) / 2;
      g.textOC("FREE", cx, 3, C.yellow, col(90, 40, 0), 2);
      g.textOC("STARS!", cx, 16, C.yellow, col(90, 40, 0), 2);
      g.textC("10,000 GITHUB STARS", cx, 29, C.white);
      g.textC("NO SKILL REQUIRED*", bw / 2, 37, col(200, 190, 255));
    },
    buttons: (win, t, bw, bh) => [bottomButton("CLAIM STARS", bw, bh, (ctx) => ctx.open(GITHUB_URL))],
  },

  slots: {
    w: 144,
    h: 84,
    title: "LUCKY777CASINO.BIZ",
    bar: C.darkGreen,
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, col(16, 110, 48));
      g.fill(0, 0, bw, 8, C.black);
      g.textC("LUCKY 777 CASINO", bw / 2, 2, C.yellow);

      const SYM = ["7", "$", "*", "B"];
      const SYC = [C.red, C.green, C.orange, C.blue];
      const spin = win.s.spin || 0;
      for (let i = 0; i < 3; i++) {
        const x = Math.round(bw / 2 - 38 + i * 27);
        g.bevel(x, 10, 22, 23, false, C.white);
        const stop = spin + 0.5 + 0.3 * i;
        const idx = spin && t < stop ? Math.floor(t * 12 + i * 3) % 4 : win.s[`r${i}`] ?? [0, 1, 0][i];
        g.text(SYM[idx], x + 6, 14, SYC[idx], 3);
      }
      for (let side = 0; side < 2; side++) {
        const cx = side ? bw - 15 : 14;
        g.disc(cx, 21, 10, C.red);
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2 + t * 0.8;
          g.fill(Math.round(cx + Math.cos(ang) * 8), Math.round(21 + Math.sin(ang) * 8), 2, 2, C.white);
        }
        g.disc(cx, 21, 6, C.darkRed);
        g.textC("777", cx, 19, C.yellow);
      }

      const done = spin && t >= spin + 1.2;
      const jackpot = done && win.s.r0 === win.s.r1 && win.s.r1 === win.s.r2;
      if (!spin) g.textOC("$1,000 CREDIT!", bw / 2, 37, C.yellow, C.black, 2);
      else if (!done) g.textC("SPINNING...", bw / 2, 41, C.white);
      else if (jackpot) g.textOC("JACKPOT!!!", bw / 2, 37, blink(t, 3) ? C.yellow : C.white, C.black, 2);
      else g.textOC("SO CLOSE!", bw / 2, 37, C.white, C.black, 2);
    },
    buttons(win, t, bw, bh) {
      const spin = (ctx: Ctx, w: Win) => {
        if (w.s.spin && ctx.t < w.s.spin + 1.2) return;
        w.s.spins = (w.s.spins || 0) + 1;
        w.s.spin = ctx.t;
        // Every third pull pays out, otherwise it's whatever the reels give.
        const win3 = w.s.spins % 3 === 0;
        const first = Math.floor(Math.random() * 4);
        for (let i = 0; i < 3; i++) w.s[`r${i}`] = win3 ? 0 : i === 0 ? first : Math.floor(Math.random() * 4);
        if (!win3 && w.s.r0 === w.s.r1 && w.s.r1 === w.s.r2) w.s.r2 = (w.s.r2 + 1) % 4;
      };
      return [
        bottomButton("SPIN", bw, bh, spin),
        { x: 4, y: 11, w: 21, h: 21, act: spin },
        { x: bw - 25, y: 11, w: 21, h: 21, act: spin },
      ];
    },
  },

  sprunk: {
    w: 100,
    h: 80,
    title: "SPRUNK.COM",
    bar: C.darkGreen,
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, col(30, 170, 70));
      for (let i = 0; i < 7; i++) {
        const x = (i * 37 + 11) % bw;
        const y = Math.round(bh - (((t * 9 + i * 23) % (bh + 6)) | 0));
        g.frame(x, y, 3, 3, col(170, 240, 180));
      }
      g.fill(9, 8, 16, 2, C.shadow);
      g.fill(8, 10, 18, 32, col(225, 240, 228));
      g.fill(8, 10, 2, 32, col(170, 190, 175));
      g.fill(22, 10, 2, 32, C.white);
      g.fill(8, 18, 18, 13, C.darkGreen);
      g.text("S", 14, 19, C.white, 2);
      g.fill(9, 42, 16, 2, C.shadow);
      const cx = 30 + (bw - 30) / 2;
      g.textOC("SPRUNK", cx, 7, C.white, C.darkGreen, 2);
      g.textC("THE ESSENCE", cx, 22, C.white);
      g.textC("OF LIFE", cx, 29, C.white);
      g.textC("NOW 100% MORE FIZZ", bw / 2, 46, col(220, 255, 120));
      if (win.s.sold && t - win.s.sold < 2) {
        g.fill(0, bh - 14, bw, 13, C.red);
        g.textC("SOLD OUT!", bw / 2, bh - 10, C.white);
      } else win.s.sold = 0;
    },
    buttons: (win, t, bw, bh) => (win.s.sold ? [] : [bottomButton("BUY 6-PACK", bw, bh, (ctx, w) => (w.s.sold = ctx.t))]),
  },

  trick: {
    w: 136,
    h: 76,
    title: "NEWS.ONEWEIRDTRICK.ORG",
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.white);
      g.fill(0, 0, bw, 8, C.red);
      g.text("BREAKING NEWS", 3, 2, C.white);
      g.fill(6, 13, 22, 13, C.dark);
      g.fill(8, 15, 18, 9, C.black);
      for (let i = 0; i < 4; i++) {
        const len = 3 + ((i * 7 + Math.floor(t * 3)) % 11);
        g.fill(9 + (i % 2) * 2, 16 + i * 2, len, 1, C.lime);
      }
      g.fill(3, 26, 28, 3, C.face);
      const lines = wrap("LOCAL DEV WRITES CODE THAT WORKS FIRST TIME", bw - 38);
      for (let i = 0; i < lines.length; i++) g.text(lines[i], 34, 12 + i * 7, C.black);
      g.text("SENIOR DEVS HATE HIM!", 34, 13 + lines.length * 7, C.red);
      g.textC("SEE HIS ONE WEIRD TRICK", bw / 2, 37, C.shadow);
    },
    buttons: (win, t, bw, bh) => [bottomButton("READ MORE", bw, bh, (ctx) => ctx.open(GITHUB_URL))],
  },

  cleaner: {
    w: 124,
    h: 70,
    title: "PC_CLEANER_PRO.EXE",
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.face);
      const cx = bw / 2;
      const since = win.s.fix ? t - win.s.fix : -1;
      if (since < 0) {
        g.textC("YOUR PC IS RUNNING", cx, 3, C.black);
        g.textC("VERY SLOW!", cx, 10, C.red, 2);
        g.text("SPEED:", 6, 26, C.black);
        progress(g, 32, 24, bw - 52, 0.04, C.red);
        g.text("3%", bw - 17, 26, C.red);
      } else if (since < 2.4) {
        g.textC("CLEANING YOUR PC...", cx, 6, C.black);
        g.textC("DELETING: HOMEWORK", cx, 14, C.shadow);
        progress(g, 8, 24, bw - 16, since / 2.4, C.green);
      } else {
        g.textC("ALL DONE!", cx, 6, C.darkGreen, 2);
        g.textC("YOUR PC IS NOW", cx, 20, C.black);
        g.textC("4% FASTER", cx, 27, C.black);
        if (since > 5) win.s.fix = 0;
      }
    },
    buttons: (win, t, bw, bh) => (win.s.fix ? [] : [bottomButton("FIX NOW", bw, bh, (ctx, w) => (w.s.fix = ctx.t))]),
  },

  chat: {
    w: 116,
    h: 82,
    title: "RECRUITER CHAT",
    bar: col(30, 90, 200),
    ad: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.white);
      g.fill(0, 0, bw, 8, col(220, 232, 255));
      g.disc(5, 3, 1, C.green);
      g.text("ONLINE NOW", 9, 2, col(30, 90, 200));
      g.fill(4, 11, 84, 22, col(230, 230, 236));
      g.text("RECRUITER_42:", 7, 13, col(30, 90, 200));
      g.text("ARE YOU OPEN TO", 7, 20, C.black);
      g.text("WORK? :)", 7, 26, C.black);
      g.fill(4, 35, 20, 7, col(230, 230, 236));
      for (let i = 0; i < 3; i++) g.fill(8 + i * 5, Math.floor(t * 4) % 3 === i ? 37 : 38, 2, 2, C.shadow);
      g.bevel(4, 44, bw - 8, 10, false, C.white);
      g.text("TYPE A MESSAGE", 7, 46, C.shadow);
      if (blink(t, 2)) g.fill(6, 46, 1, 5, C.black);
    },
    buttons: (win, t, bw, bh) => [bottomButton("REPLY", bw, bh, (ctx) => ctx.open(LINKEDIN_URL))],
  },

  achievement: {
    w: 128,
    h: 56,
    title: "SYSTEM",
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.face);
      g.sprite(TROPHY, 6, 4);
      g.text("ACHIEVEMENT UNLOCKED!", 22, 4, C.navy);
      g.text("AD BLOCKER IRL", 22, 11, blink(t, 2) ? C.black : C.red);
      g.text("YOU CLOSED EVERY POP-UP", 22, 18, C.dark);
    },
    buttons: (win, t, bw, bh) => [bottomButton("OK", bw, bh, (ctx, w) => ctx.close(w))],
  },

  bin: {
    w: 136,
    h: 78,
    title: "RECYCLE BIN",
    single: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.face);
      g.bevel(2, 2, bw - 4, 47, false, C.white);
      const files = ["MY_SLEEP_SCHEDULE.TXT", "CSS_THAT_WORKED.BAK", "GTA6_RELEASE_DATE.TXT", "SOCIAL_LIFE.ZIP", "FINAL_FINAL_V2.PSD"];
      for (let i = 0; i < files.length; i++) {
        g.sprite(FILE, 6, 6 + i * 8);
        g.text(files[i], 14, 7 + i * 8, C.black);
      }
      if (win.s.deny && t - win.s.deny < 2.5) {
        g.textC("ACCESS DENIED:", bw / 2, bh - 13, C.red);
        g.textC("SENTIMENTAL VALUE", bw / 2, bh - 6, C.red);
      } else win.s.deny = 0;
    },
    buttons: (win, t, bw, bh) => (win.s.deny ? [] : [bottomButton("EMPTY BIN", bw, bh, (ctx, w) => (w.s.deny = ctx.t))]),
  },

  projects: {
    w: 124,
    h: 66,
    title: "C:/PROJECTS",
    single: true,
    body(g, win, t, bw, bh) {
      g.fill(0, 0, bw, bh, C.face);
      g.bevel(2, 2, bw - 4, 38, false, C.white);
      const items: [keyof typeof ICON, string][] = [
        ["media", "MEDIA.EXE"],
        ["radio", "RADIO.EXE"],
        ["folder", "SOON"],
      ];
      for (let i = 0; i < items.length; i++) {
        const cx = 22 + i * 40;
        g.sprite(ICON[items[i][0]], cx - 6, 8);
        g.textC(items[i][1], cx, 24, C.black);
      }
      g.text(win.s.soon && t - win.s.soon < 2 ? "WORKING ON IT..." : "3 OBJECT(S)", 4, bh - 8, C.dark);
    },
    buttons: () => [
      { x: 4, y: 5, w: 36, h: 28, act: (ctx) => ctx.go("/projects/media") },
      { x: 44, y: 5, w: 36, h: 28, act: (ctx) => ctx.go("/projects/radio") },
      { x: 84, y: 5, w: 36, h: 28, act: (ctx, w) => (w.s.soon = ctx.t) },
    ],
  },
};

export const AD_KINDS = (Object.keys(DEFS) as Kind[]).filter((k) => DEFS[k].ad);
