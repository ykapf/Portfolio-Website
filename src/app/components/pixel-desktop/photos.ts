import { C, col, Gfx } from "./gfx";

/** Small procedural "press photos" for news stories, emails and ad sites. */
export type PhotoKind =
  | "office"
  | "printer"
  | "meeting"
  | "pizza"
  | "sofa"
  | "lab"
  | "rain"
  | "beach"
  | "fridge"
  | "pitch"
  | "shop"
  | "cat"
  | "server"
  | "palace"
  | "cheque"
  | "cake"
  | "cctv"
  | "parcel"
  | "plane"
  | "coffee"
  | "pills"
  | "vault"
  | "burger"
  | "fries"
  | "nuggets";

const P = {
  wall: col(214, 206, 188),
  wallDark: col(180, 170, 150),
  floor: col(120, 96, 72),
  desk: col(150, 104, 60),
  deskDark: col(110, 74, 40),
  screen: col(90, 170, 240),
  skin: col(240, 196, 160),
  skin2: col(170, 112, 76),
  hair: col(60, 40, 24),
  hair2: col(220, 180, 90),
  shirt: col(60, 110, 190),
  shirt2: col(200, 70, 70),
  shirt3: col(70, 150, 90),
  sky: col(120, 190, 240),
  skyLow: col(190, 225, 250),
  grey: col(150, 150, 160),
  greyDark: col(90, 90, 100),
  plant: col(50, 150, 70),
  sand: col(240, 214, 150),
  sea: col(40, 140, 200),
  grass: col(60, 160, 60),
  grassDark: col(40, 130, 50),
  white: C.white,
  black: C.black,
};

type Scene = (g: Gfx, w: number, h: number, t: number) => void;

function bands(g: Gfx, w: number, y0: number, y1: number, cs: number[]): void {
  const n = cs.length;
  for (let i = 0; i < n; i++) {
    const a = Math.round(y0 + ((y1 - y0) * i) / n);
    const b = Math.round(y0 + ((y1 - y0) * (i + 1)) / n);
    g.fill(0, a, w, b - a, cs[i]);
  }
}

/** Blocky figure standing on `base`; `s` is the pixel unit (the figure is about 7s tall). */
function person(g: Gfx, x: number, base: number, s: number, shirt: number, skin = P.skin, hair = P.hair, back = false): void {
  const hx = Math.round(x - s);
  g.fill(Math.round(x - 1.5 * s), base - 4 * s, 3 * s, 4 * s, shirt);
  g.fill(hx, base - 6 * s, 2 * s, 2 * s, skin);
  g.fill(hx, base - 6 * s - Math.max(1, Math.round(s / 2)), 2 * s, Math.max(1, Math.round(s / 2)) + (back ? 2 * s - 1 : 0), hair);
  if (!back && s >= 3) {
    g.px(hx + Math.round(s / 2), base - 5 * s, P.black);
    g.px(hx + Math.round(1.5 * s), base - 5 * s, P.black);
  }
}

function office(g: Gfx, w: number, h: number): void {
  const fy = Math.round(h * 0.72);
  g.fill(0, 0, w, fy, P.wall);
  g.fill(0, fy, w, h - fy, P.floor);
  const wx = Math.round(w * 0.62);
  g.fill(wx, Math.round(h * 0.1), Math.round(w * 0.3), Math.round(h * 0.38), P.skyLow);
  g.frame(wx, Math.round(h * 0.1), Math.round(w * 0.3), Math.round(h * 0.38), P.wallDark);
  g.fill(wx + Math.round(w * 0.15), Math.round(h * 0.1), 1, Math.round(h * 0.38), P.wallDark);
}

function desk(g: Gfx, x: number, y: number, w: number, h: number, glow: number): void {
  g.fill(x, y, w, 3, P.desk);
  g.fill(x + 2, y + 3, 2, h - y - 3, P.deskDark);
  g.fill(x + w - 4, y + 3, 2, h - y - 3, P.deskDark);
  const mw = Math.round(w * 0.36);
  const mx = x + Math.round(w * 0.32);
  const mh = Math.round(mw * 0.62);
  g.fill(mx, y - mh - 3, mw, mh, P.greyDark);
  g.fill(mx + 1, y - mh - 2, mw - 2, mh - 2, glow);
  g.fill(mx + Math.round(mw / 2) - 1, y - 3, 3, 3, P.greyDark);
}

const SCENES: Record<PhotoKind, Scene> = {
  office(g, w, h, t) {
    office(g, w, h);
    const s = Math.max(2, Math.round(h / 16));
    const dy = Math.round(h * 0.66);
    desk(g, Math.round(w * 0.12), dy, Math.round(w * 0.52), h, P.screen);
    for (let i = 0; i < 6; i++) g.fill(Math.round(w * 0.12 + w * 0.52 * 0.34) + 2, dy - Math.round(w * 0.12) + i * 2, Math.round(w * 0.1) + ((i * 7 + Math.floor(t)) % 5), 1, P.white);
    person(g, Math.round(w * 0.38), dy + 2 * s, s, P.shirt, P.skin, P.hair, true);
    g.fill(Math.round(w * 0.82), Math.round(h * 0.56), Math.round(w * 0.06), Math.round(h * 0.16), P.deskDark);
    g.disc(Math.round(w * 0.85), Math.round(h * 0.5), Math.max(2, Math.round(h * 0.09)), P.plant);
  },
  printer(g, w, h, t) {
    office(g, w, h);
    const px = Math.round(w * 0.25);
    const pw = Math.round(w * 0.42);
    const py = Math.round(h * 0.4);
    g.fill(px, py, pw, Math.round(h * 0.34), col(225, 225, 225));
    g.fill(px, py, pw, 3, col(245, 245, 245));
    g.fill(px + 3, py + Math.round(h * 0.16), pw - 6, 2, P.greyDark);
    const out = Math.min(Math.round(h * 0.2), Math.floor((t * 6) % 30));
    g.fill(px + Math.round(pw * 0.25), py - out + Math.round(h * 0.16), Math.round(pw * 0.5), out, P.white);
    g.fill(px + pw - 6, py + 5, 3, 2, Math.floor(t * 2) % 2 ? C.lime : C.green);
    g.fill(px, py + Math.round(h * 0.34), 2, h, P.greyDark);
    g.fill(px + pw - 2, py + Math.round(h * 0.34), 2, h, P.greyDark);
    const s = Math.max(2, Math.round(h / 18));
    person(g, Math.round(w * 0.8), Math.round(h * 0.86), s, P.shirt2);
    person(g, Math.round(w * 0.9), Math.round(h * 0.9), s, P.shirt3, P.skin2);
  },
  meeting(g, w, h) {
    office(g, w, h);
    const sx = Math.round(w * 0.08);
    g.fill(sx, Math.round(h * 0.1), Math.round(w * 0.36), Math.round(h * 0.34), P.white);
    g.frame(sx, Math.round(h * 0.1), Math.round(w * 0.36), Math.round(h * 0.34), P.greyDark);
    const bars = [0.5, 0.7, 0.4, 0.85, 0.3];
    for (let i = 0; i < bars.length; i++) {
      const bh = Math.round(h * 0.26 * bars[i]);
      g.fill(sx + 4 + i * Math.round(w * 0.06), Math.round(h * 0.4) - bh, Math.max(2, Math.round(w * 0.04)), bh, i === 3 ? C.red : P.shirt);
    }
    const s = Math.max(2, Math.round(h / 16));
    const ty = Math.round(h * 0.74);
    const shirts = [P.shirt, P.shirt2, P.shirt3, col(150, 90, 170), P.greyDark];
    for (let i = 0; i < 5; i++) person(g, Math.round(w * (0.18 + i * 0.16)), ty, s, shirts[i], i % 2 ? P.skin2 : P.skin, i === 2 ? P.hair2 : P.hair);
    g.fill(Math.round(w * 0.06), ty, Math.round(w * 0.88), 4, P.desk);
    g.fill(Math.round(w * 0.06), ty + 4, Math.round(w * 0.88), 2, P.deskDark);
  },
  pizza(g, w, h) {
    g.fill(0, 0, w, h, col(170, 120, 80));
    for (let y = 0; y < h; y += 6) g.fill(0, y, w, 1, col(150, 104, 66));
    const bw = Math.round(Math.min(w * 0.6, h * 1.3));
    const bx = Math.round((w - bw) / 2);
    const by = Math.round(h * 0.12);
    const bh = Math.round(h * 0.78);
    g.fill(bx, by, bw, bh, col(214, 180, 130));
    g.frame(bx, by, bw, bh, col(170, 130, 90));
    const r = Math.round(Math.min(bw, bh) * 0.42);
    const cx = bx + Math.round(bw / 2);
    const cy = by + Math.round(bh / 2);
    g.disc(cx, cy, r, col(220, 160, 70));
    g.disc(cx, cy, r - 2, col(230, 70, 40));
    g.disc(cx, cy, r - 4, col(250, 210, 90));
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + 0.3;
      const d = (r - 6) * (0.35 + (i % 3) * 0.25);
      g.disc(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), Math.max(1, Math.round(r / 7)), col(180, 40, 30));
    }
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 4;
      for (let k = -r + 2; k < r - 2; k++) g.px(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), col(200, 140, 60));
    }
  },
  sofa(g, w, h, t) {
    g.fill(0, 0, w, h, col(60, 50, 80));
    g.fill(0, Math.round(h * 0.8), w, h, col(90, 70, 60));
    const tv = Math.round(w * 0.06);
    g.fill(tv, Math.round(h * 0.12), Math.round(w * 0.3), Math.round(h * 0.34), P.black);
    g.fill(tv + 2, Math.round(h * 0.12) + 2, Math.round(w * 0.3) - 4, Math.round(h * 0.34) - 4, Math.floor(t) % 2 ? col(120, 200, 255) : col(100, 180, 240));
    const sx = Math.round(w * 0.42);
    const sw = Math.round(w * 0.52);
    const sy = Math.round(h * 0.5);
    g.fill(sx, sy, sw, Math.round(h * 0.3), col(180, 60, 70));
    g.fill(sx - 3, sy + 4, 5, Math.round(h * 0.26), col(150, 40, 50));
    g.fill(sx + sw - 2, sy + 4, 5, Math.round(h * 0.26), col(150, 40, 50));
    const s = Math.max(2, Math.round(h / 16));
    person(g, sx + Math.round(sw * 0.3), sy + 4 * s, s, P.shirt);
    person(g, sx + Math.round(sw * 0.7), sy + 4 * s, s, P.shirt3, P.skin2, P.hair2);
    for (const fx of [0.3, 0.7]) {
      g.fill(sx + Math.round(sw * fx) - 1, sy + 2 * s - 1, 3, 4, P.black);
      g.fill(sx + Math.round(sw * fx), sy + 2 * s, 1, 2, P.screen);
    }
  },
  lab(g, w, h) {
    g.fill(0, 0, w, h, col(220, 236, 236));
    g.fill(0, Math.round(h * 0.66), w, h, col(190, 200, 205));
    const s = Math.max(2, Math.round(h / 14));
    person(g, Math.round(w * 0.3), Math.round(h * 0.66) + s, s, P.white, P.skin, col(130, 130, 130));
    g.fill(Math.round(w * 0.3) - s, Math.round(h * 0.66) - 5 * s + 1, 2 * s, 1, P.black);
    const colours = [C.lime, C.pink, col(90, 200, 255)];
    for (let i = 0; i < 3; i++) {
      const bx = Math.round(w * (0.55 + i * 0.12));
      const by = Math.round(h * 0.66);
      g.fill(bx, by - 12, 2, 6, P.grey);
      g.fill(bx - 3, by - 6, 8, 6, P.grey);
      g.fill(bx - 2, by - 5, 6, 5, colours[i]);
    }
    g.fill(Math.round(w * 0.55), Math.round(h * 0.08), Math.round(w * 0.36), Math.round(h * 0.3), P.white);
    g.frame(Math.round(w * 0.55), Math.round(h * 0.08), Math.round(w * 0.36), Math.round(h * 0.3), P.grey);
    for (let i = 0; i < 6; i++) g.fill(Math.round(w * 0.57), Math.round(h * 0.12) + i * 3, Math.round(w * (0.1 + ((i * 7) % 5) * 0.04)), 1, P.greyDark);
  },
  rain(g, w, h, t) {
    bands(g, w, 0, Math.round(h * 0.7), [col(110, 115, 125), col(125, 130, 140), col(140, 145, 155)]);
    g.fill(0, Math.round(h * 0.7), w, h, col(80, 85, 90));
    for (let i = 0; i < 5; i++) g.fill(Math.round(w * (0.05 + i * 0.2)), Math.round(h * (0.3 + (i % 3) * 0.08)), Math.round(w * 0.14), h, col(95, 100, 110));
    const s = Math.max(2, Math.round(h / 15));
    person(g, Math.round(w * 0.5), Math.round(h * 0.86), s, col(240, 240, 240));
    g.fill(Math.round(w * 0.5) - Math.round(0.5 * s), Math.round(h * 0.86), s, 2 * s, col(90, 90, 160));
    for (let i = 0; i < 40; i++) {
      const x = (i * 37 + Math.floor(t * 30) * 3) % w;
      const y = (i * 23 + Math.floor(t * 60)) % h;
      g.fill(x, y, 1, 3, col(200, 210, 230));
    }
  },
  beach(g, w, h) {
    bands(g, w, 0, Math.round(h * 0.5), [col(90, 170, 240), P.sky, P.skyLow]);
    g.disc(Math.round(w * 0.8), Math.round(h * 0.2), Math.max(3, Math.round(h * 0.11)), C.yellow);
    g.fill(0, Math.round(h * 0.5), w, Math.round(h * 0.14), P.sea);
    g.fill(0, Math.round(h * 0.64), w, h, P.sand);
    const ux = Math.round(w * 0.3);
    g.fill(ux, Math.round(h * 0.4), 1, Math.round(h * 0.4), P.white);
    for (let i = 0; i < 6; i++) g.fill(ux - Math.round(w * 0.1) + i * Math.round(w * 0.034), Math.round(h * 0.38), Math.round(w * 0.034), 3, i % 2 ? C.white : C.red);
    const s = Math.max(2, Math.round(h / 16));
    g.fill(Math.round(w * 0.5), Math.round(h * 0.82), Math.round(w * 0.2), 3, C.pink);
    person(g, Math.round(w * 0.62), Math.round(h * 0.82), s, col(240, 140, 120), col(250, 140, 120));
  },
  fridge(g, w, h, t) {
    g.fill(0, 0, w, h, col(230, 220, 200));
    g.fill(0, Math.round(h * 0.84), w, h, col(200, 200, 210));
    const fx = Math.round(w * 0.32);
    const fw = Math.round(w * 0.36);
    g.fill(fx, Math.round(h * 0.06), fw, Math.round(h * 0.8), col(235, 240, 245));
    g.frame(fx, Math.round(h * 0.06), fw, Math.round(h * 0.8), P.grey);
    g.fill(fx, Math.round(h * 0.32), fw, 1, P.grey);
    g.fill(fx + fw - 4, Math.round(h * 0.14), 2, Math.round(h * 0.1), P.greyDark);
    g.fill(fx + 3, Math.round(h * 0.4), fw - 6, Math.round(h * 0.18), P.black);
    const on = Math.floor(t * 2) % 2 === 0;
    g.fill(fx + 4, Math.round(h * 0.41), fw - 8, Math.round(h * 0.16) - 1, on ? col(40, 90, 200) : col(30, 70, 170));
    g.fill(fx + 6, Math.round(h * 0.45), fw - 12, 1, P.white);
    g.fill(fx + 6, Math.round(h * 0.49), Math.round((fw - 12) * 0.6), 1, P.white);
  },
  pitch(g, w, h) {
    g.fill(0, 0, w, Math.round(h * 0.3), col(90, 90, 110));
    for (let i = 0; i < w; i += 3) g.px(i, Math.round(h * 0.1) + ((i * 7) % 9), [C.red, C.white, C.yellow, C.blue][i % 4]);
    for (let i = 0; i < 6; i++) g.fill(0, Math.round(h * 0.3) + i * Math.ceil((h * 0.7) / 6), w, Math.ceil((h * 0.7) / 6), i % 2 ? P.grass : P.grassDark);
    const gx = Math.round(w * 0.36);
    g.frame(gx, Math.round(h * 0.34), Math.round(w * 0.28), Math.round(h * 0.2), P.white);
    const s = Math.max(2, Math.round(h / 14));
    person(g, Math.round(w * 0.72), Math.round(h * 0.9), s, C.red);
    g.fill(Math.round(w * 0.72) - 3 * s, Math.round(h * 0.9) - 5 * s, s, 2 * s, P.skin);
    g.fill(Math.round(w * 0.72) + 2 * s, Math.round(h * 0.9) - 5 * s, s, 2 * s, P.skin);
    g.disc(Math.round(w * 0.5), Math.round(h * 0.48), 2, P.white);
  },
  shop(g, w, h) {
    g.fill(0, 0, w, h, col(240, 240, 235));
    g.fill(0, Math.round(h * 0.84), w, h, col(200, 200, 190));
    const cs = [C.red, C.yellow, C.green, C.blue, C.orange, C.pink];
    for (let shelf = 0; shelf < 3; shelf++) {
      const y = Math.round(h * (0.12 + shelf * 0.24));
      g.fill(Math.round(w * 0.04), y + Math.round(h * 0.16), Math.round(w * 0.6), 2, P.greyDark);
      for (let i = 0; i < 14; i++) g.fill(Math.round(w * 0.05) + i * Math.round(w * 0.042), y + 4, Math.round(w * 0.03), Math.round(h * 0.12), cs[(i + shelf * 2) % cs.length]);
    }
    const tx = Math.round(w * 0.72);
    g.frame(tx, Math.round(h * 0.5), Math.round(w * 0.2), Math.round(h * 0.22), P.greyDark);
    g.disc(tx + 3, Math.round(h * 0.82), 2, P.black);
    g.disc(tx + Math.round(w * 0.18), Math.round(h * 0.82), 2, P.black);
    g.fill(tx + 3, Math.round(h * 0.46), Math.round(w * 0.06), Math.round(h * 0.08), col(230, 190, 120));
  },
  cat(g, w, h) {
    office(g, w, h);
    const dy = Math.round(h * 0.66);
    desk(g, Math.round(w * 0.1), dy, Math.round(w * 0.8), h, col(250, 250, 250));
    g.fill(Math.round(w * 0.3), dy - 3, Math.round(w * 0.36), 3, P.greyDark);
    const cx = Math.round(w * 0.48);
    const cat = col(240, 150, 60);
    g.fill(cx - 10, dy - 9, 20, 7, cat);
    g.fill(cx + 8, dy - 13, 7, 7, cat);
    g.fill(cx + 8, dy - 15, 2, 2, cat);
    g.fill(cx + 13, dy - 15, 2, 2, cat);
    g.px(cx + 10, dy - 11, P.black);
    g.px(cx + 13, dy - 11, P.black);
    g.fill(cx - 14, dy - 12, 2, 6, cat);
    for (let i = 0; i < 3; i++) g.fill(cx - 7 + i * 5, dy - 9, 1, 7, col(200, 110, 40));
  },
  server(g, w, h, t) {
    g.fill(0, 0, w, h, col(20, 24, 34));
    const n = Math.max(3, Math.floor(w / 26));
    for (let r = 0; r < n; r++) {
      const x = 4 + r * Math.floor((w - 8) / n);
      const rw = Math.floor((w - 8) / n) - 4;
      g.fill(x, 4, rw, h - 8, col(50, 54, 66));
      for (let u = 0; u < Math.floor((h - 12) / 5); u++) {
        g.fill(x + 2, 7 + u * 5, rw - 4, 3, col(30, 32, 40));
        const on = (u * 7 + r * 3 + Math.floor(t * 6)) % 5;
        g.px(x + rw - 5, 8 + u * 5, on === 0 ? C.red : on < 3 ? C.lime : C.green);
        g.px(x + rw - 7, 8 + u * 5, on === 1 ? C.yellow : C.darkGreen);
      }
    }
  },
  palace(g, w, h) {
    bands(g, w, 0, Math.round(h * 0.7), [col(250, 170, 90), col(250, 200, 120), col(250, 225, 160)]);
    g.fill(0, Math.round(h * 0.7), w, h, P.grassDark);
    const px = Math.round(w * 0.2);
    const pw = Math.round(w * 0.6);
    const py = Math.round(h * 0.4);
    g.fill(px, py, pw, Math.round(h * 0.34), col(245, 240, 225));
    for (let i = 0; i < 7; i++) g.fill(px + 3 + i * Math.round((pw - 6) / 7), py + 4, 2, Math.round(h * 0.28), col(210, 200, 180));
    g.disc(Math.round(w / 2), py - 2, Math.round(h * 0.16), C.gold);
    g.fill(Math.round(w / 2), py - Math.round(h * 0.3), 1, Math.round(h * 0.12), P.greyDark);
    g.fill(Math.round(w / 2) + 1, py - Math.round(h * 0.3), 5, 3, C.green);
  },
  cheque(g, w, h) {
    g.fill(0, 0, w, h, col(60, 120, 80));
    const cx = Math.round(w * 0.1);
    const cw = Math.round(w * 0.8);
    const cy = Math.round(h * 0.18);
    const ch = Math.round(h * 0.64);
    g.fill(cx, cy, cw, ch, col(250, 245, 220));
    g.frame(cx, cy, cw, ch, col(180, 160, 100));
    g.text("PAY: YOU", cx + 4, cy + 4, P.black);
    g.text("$10,000,000", cx + 4, cy + Math.round(ch / 2) - 3, C.darkGreen, ch > 34 ? 2 : 1);
    g.fill(cx + Math.round(cw * 0.55), cy + ch - 8, Math.round(cw * 0.38), 1, P.black);
    g.text("TOTALLY LEGIT", cx + 4, cy + ch - 9, P.greyDark);
  },
  cake(g, w, h, t) {
    office(g, w, h);
    const cx = Math.round(w / 2);
    const ty = Math.round(h * 0.72);
    g.fill(Math.round(w * 0.15), ty, Math.round(w * 0.7), 3, P.desk);
    const cw = Math.round(w * 0.3);
    g.fill(cx - Math.round(cw / 2), ty - 14, cw, 14, col(240, 170, 200));
    g.fill(cx - Math.round(cw / 2), ty - 14, cw, 3, P.white);
    for (let i = 0; i < 5; i++) {
      const x = cx - Math.round(cw / 2) + 3 + i * Math.round((cw - 6) / 4);
      g.fill(x, ty - 19, 1, 5, C.yellow);
      g.px(x, ty - 20 - (Math.floor(t * 8 + i) % 2), C.orange);
    }
    g.text("FUN", cx - 5, ty - 10, C.darkRed);
  },
  cctv(g, w, h, t) {
    const dark = col(20, 40, 24);
    const mid = col(70, 120, 70);
    g.fill(0, 0, w, h, dark);
    g.fill(Math.round(w * 0.35), Math.round(h * 0.12), Math.round(w * 0.3), Math.round(h * 0.76), mid);
    g.fill(Math.round(w * 0.37), Math.round(h * 0.44), Math.round(w * 0.26), 1, dark);
    const s = Math.max(2, Math.round(h / 14));
    person(g, Math.round(w * 0.72), Math.round(h * 0.9), s, mid, col(120, 170, 120), dark, true);
    for (let y = 0; y < h; y += 2) g.fill(0, y, w, 1, col(10, 24, 14));
    g.text("CAM 03  KITCHEN", 3, 3, col(150, 230, 150));
    if (Math.floor(t * 2) % 2) g.disc(w - 6, 5, 2, C.red);
    g.text("14:59:58", 3, h - 8, col(150, 230, 150));
  },
  parcel(g, w, h) {
    g.fill(0, 0, w, h, col(180, 90, 70));
    for (let y = 2; y < h; y += 5) for (let x = (y % 10 ? 0 : 6); x < w; x += 12) g.fill(x, y, 11, 4, col(160, 74, 56));
    const dx = Math.round(w * 0.55);
    g.fill(dx, Math.round(h * 0.1), Math.round(w * 0.3), h, col(30, 70, 120));
    g.disc(dx + 4, Math.round(h * 0.55), 1, C.gold);
    g.fill(0, Math.round(h * 0.84), w, h, col(140, 140, 140));
    g.fill(Math.round(w * 0.2), Math.round(h * 0.58), Math.round(w * 0.24), Math.round(h * 0.26), col(200, 160, 100));
    g.fill(Math.round(w * 0.2), Math.round(h * 0.68), Math.round(w * 0.24), 2, col(170, 130, 80));
    g.fill(Math.round(w * 0.6), Math.round(h * 0.28), Math.round(w * 0.2), Math.round(h * 0.14), P.white);
    g.text("SORRY", Math.round(w * 0.6) + 2, Math.round(h * 0.28) + 2, C.red);
  },
  plane(g, w, h, t) {
    bands(g, w, 0, Math.round(h * 0.75), [col(60, 150, 230), col(100, 180, 240), col(150, 210, 250)]);
    g.fill(0, Math.round(h * 0.75), w, h, P.sea);
    g.disc(Math.round(w * 0.15), Math.round(h * 0.25), Math.max(3, Math.round(h * 0.12)), C.yellow);
    const px = Math.round(((t * 18) % (w + 60)) - 30);
    const py = Math.round(h * 0.35);
    g.fill(px, py, 26, 4, P.white);
    g.fill(px + 22, py - 3, 6, 4, P.white);
    g.fill(px + 8, py - 5, 6, 14, col(220, 230, 240));
    g.fill(px, py - 3, 3, 3, C.red);
    for (let i = 0; i < 4; i++) g.px(px + 6 + i * 4, py + 1, P.shirt);
    g.disc(Math.round(w * 0.75), Math.round(h * 0.8), Math.round(h * 0.12), P.sand);
    g.fill(Math.round(w * 0.75), Math.round(h * 0.56), 1, Math.round(h * 0.2), col(120, 80, 40));
    g.disc(Math.round(w * 0.75), Math.round(h * 0.56), 4, P.plant);
  },
  coffee(g, w, h, t) {
    g.fill(0, 0, w, h, col(90, 56, 36));
    g.fill(0, Math.round(h * 0.78), w, h, col(60, 36, 22));
    const cx = Math.round(w / 2);
    const cw = Math.round(w * 0.22);
    const cy = Math.round(h * 0.38);
    g.fill(cx - Math.round(cw / 2), cy, cw, Math.round(h * 0.4), P.white);
    g.fill(cx - Math.round(cw / 2), cy + Math.round(h * 0.14), cw, Math.round(h * 0.1), col(120, 70, 30));
    g.frame(cx + Math.round(cw / 2), cy + 4, 5, 8, P.white);
    for (let i = 0; i < 3; i++) g.fill(cx - 6 + i * 6, cy - 6 - (Math.floor(t * 4 + i) % 3), 1, 4, col(220, 220, 220));
  },
  pills(g, w, h) {
    bands(g, w, 0, h, [col(200, 225, 248), col(215, 235, 252), col(230, 242, 255)]);
    for (let i = 0; i < 6; i++) {
      const x = Math.round(w * (0.12 + i * 0.14));
      const y = Math.round(h * (0.35 + (i % 2) * 0.25));
      g.fill(x, y, 10, 5, i % 2 ? col(178, 205, 240) : C.white);
      g.fill(x + 5, y, 5, 5, col(90, 140, 220));
    }
    g.textC("SMILE.", w / 2, Math.round(h * 0.12), col(36, 40, 150), h > 50 ? 2 : 1);
  },
  vault(g, w, h, t) {
    g.fill(0, 0, w, h, col(60, 70, 80));
    const r = Math.round(Math.min(w, h) * 0.38);
    const cx = Math.round(w / 2);
    const cy = Math.round(h / 2);
    g.disc(cx, cy, r, col(150, 160, 170));
    g.disc(cx, cy, r - 3, col(120, 130, 140));
    g.disc(cx, cy, Math.round(r * 0.3), col(180, 190, 200));
    for (let i = 0; i < 6; i++) {
      const a = i * (Math.PI / 3) + t * 0.5;
      for (let k = Math.round(r * 0.3); k < r - 4; k++) g.px(Math.round(cx + Math.cos(a) * k), Math.round(cy + Math.sin(a) * k), col(200, 205, 210));
    }
    g.fill(cx + r - 2, cy - 4, 4, 8, C.gold);
  },
  burger(g, w, h, t) {
    tray(g, w, h);
    const cx = Math.round(w / 2);
    const bw = Math.round(Math.min(w * 0.5, h * 1.1));
    const x = cx - Math.round(bw / 2);
    const u = Math.max(2, Math.round(h / 16));
    let y = Math.round(h * 0.84);
    const layer = (hh: number, c: number, inset = 0) => {
      y -= hh;
      g.fill(x + inset, y, bw - 2 * inset, hh, c);
    };
    layer(u * 2, F.bun, u);
    layer(u * 2, F.patty);
    layer(u, F.cheese);
    layer(u * 2, F.patty);
    for (let i = 0; i < bw; i += u * 2) g.fill(x + i - u, y + u * 2, u * 2, u, F.cheese);
    layer(u, F.lettuce, -u);
    layer(u, F.tomato);
    const top = y - u * 4;
    g.fill(x + u, top + u, bw - 2 * u, u * 3, F.bun);
    g.fill(x + u * 2, top, bw - u * 4, u, F.bun);
    g.fill(x + u * 2, top + u, bw - u * 4, 1, F.bunHi);
    for (let i = 0; i < 7; i++) g.px(x + u * 2 + ((i * 37) % Math.max(1, bw - u * 4)), top + u + ((i * 3) % (u * 2)) + 1, F.seed);
    for (let i = 0; i < 3; i++) g.fill(cx - 8 + i * 8, top - 4 - (Math.floor(t * 3 + i) % 3), 1, 3, col(230, 230, 230));
  },
  fries(g, w, h) {
    tray(g, w, h);
    const cx = Math.round(w / 2);
    const bw = Math.round(Math.min(w * 0.3, h * 0.6));
    const bh = Math.round(h * 0.45);
    const x = cx - Math.round(bw / 2);
    const y = Math.round(h * 0.86) - bh;
    for (let i = 0; i < 9; i++) {
      const fx = x + 1 + Math.round(((bw - 3) * i) / 8);
      const fh = Math.round(h * (0.22 + ((i * 7) % 5) * 0.04));
      g.fill(fx, y - fh + 4, 2, fh, i % 3 ? F.fry : F.fryHi);
    }
    g.fill(x, y, bw, bh, F.box);
    g.fill(x, y, bw, 2, col(240, 70, 60));
    g.fill(x + Math.round(bw / 2) - 3, y + Math.round(bh / 2) - 3, 6, 6, C.yellow);
  },
  nuggets(g, w, h) {
    tray(g, w, h);
    const box = { x: Math.round(w * 0.2), y: Math.round(h * 0.42), w: Math.round(w * 0.6), h: Math.round(h * 0.42) };
    g.fill(box.x, box.y, box.w, box.h, F.box);
    g.fill(box.x, box.y, box.w, 2, col(240, 70, 60));
    const n = 7;
    for (let i = 0; i < n; i++) {
      const nx = box.x + 4 + Math.round(((box.w - 12) * i) / (n - 1));
      const ny = box.y - 2 - ((i * 5) % 4);
      const r = 3 + (i % 3);
      g.disc(nx, ny, r, F.nugget);
      g.fill(nx - r + 1, ny - 1, r, 1, F.nuggetHi);
    }
    const dx = box.x + box.w + 4;
    if (dx + 10 < w) {
      g.fill(dx, box.y + box.h - 8, 10, 8, C.white);
      g.fill(dx + 1, box.y + box.h - 7, 8, 3, col(200, 60, 30));
    }
  },
};

/** Fast food palette. */
const F = {
  bun: col(214, 136, 52),
  bunHi: col(240, 180, 100),
  seed: col(255, 240, 200),
  patty: col(100, 50, 26),
  cheese: col(255, 196, 30),
  lettuce: col(90, 190, 60),
  tomato: col(220, 50, 40),
  fry: col(250, 210, 80),
  fryHi: col(255, 235, 140),
  box: col(200, 24, 24),
  nugget: col(206, 140, 56),
  nuggetHi: col(240, 190, 110),
};

/** Red counter, checked tray liner. */
function tray(g: Gfx, w: number, h: number): void {
  g.fill(0, 0, w, h, col(180, 30, 30));
  const ty = Math.round(h * 0.6);
  g.fill(0, ty, w, h - ty, col(120, 70, 40));
  for (let y = ty + 2; y < h; y += 4) {
    for (let x = ((y >> 2) & 1) * 4; x < w; x += 8) g.fill(x, y, 4, 2, col(240, 210, 150));
  }
}

export function drawPhoto(g: Gfx, kind: PhotoKind, x: number, y: number, w: number, h: number, t: number): void {
  g.region(x, y, w, h, () => {
    SCENES[kind](g, w, h, t);
    g.frame(0, 0, w, h, col(40, 40, 40));
  });
}
