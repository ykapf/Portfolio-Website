import { forEachVerticalTextPixel } from "../retro-racer/font";
import { FLAG, ICON } from "./art";
import { C, col, Gfx, Sprite, textWidth, truncate, wrap } from "./gfx";
import { LINE, SB_W, Scroll, scrollbar, scrollMax, scrollPos, setScroll } from "./pagekit";
import { AD_KINDS, Btn, Ctx, DEFS, GITHUB_URL, Kind, LINKEDIN_URL, Win } from "./popups";

export interface DesktopHost {
  open(url: string): void;
  go(path: string): void;
}

const TASKBAR_H = 14;
const TITLE_H = 9;
const ZOOM_S = 0.12;
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const WALL = [col(18, 62, 140), col(22, 72, 156), col(26, 82, 170), col(30, 92, 182), col(34, 100, 190), col(38, 108, 196)];

const ARROW_STEP = LINE * 2;
const REPEAT_DELAY = 0.35;
const REPEAT_EVERY = 0.06;

type HitKind = "none" | "overlay" | "menu" | "start" | "task" | "icon" | "close" | "title" | "sbar" | "btn" | "win";

interface Hit {
  k: HitKind;
  key: string;
  win?: Win;
  btn?: Btn;
  i?: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Launcher {
  sprite: Sprite;
  label: string;
  act(): void;
}

const inside = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Pixel-art "YKAPF 95" desktop overrun with parody pop-ups, drawn into one canvas. */
export function createDesktop(canvas: HTMLCanvasElement, host: DesktopHost) {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) return null;
  const c2d: CanvasRenderingContext2D = ctx2d;

  const g = new Gfx();
  let img: ImageData | null = null;
  let W = 0;
  let H = 0;
  let compact = false;
  let wins: Win[] = [];
  let nextId = 1;
  let now = 0;
  let pending: { at: number; fn: () => void }[] = [];
  let menuOpen = false;
  let overlay: { kind: "bsod" | "off" | "boot"; at: number } | null = null;
  let drag: { win: Win; dx: number; dy: number; sx: number; sy: number; moved: boolean } | null = null;
  /** Dragging a scrollbar thumb, or (on touch) the content itself. */
  let sdrag: { win: Win; thumb: boolean; grab: number; sy: number; start: number; moved: boolean } | null = null;
  /** A held scrollbar arrow or track, which repeats like a real one. */
  let hold: { win: Win; step: number; next: number } | null = null;
  let suppressClick = false;
  const mouse = { x: -1, y: -1, down: false };
  let pressKey = "";
  let nextSpawn = Infinity;
  let cascadeEnd = Infinity;
  let achieved = false;
  let booted = false;
  let keys: string[] = [];

  const api: Ctx = {
    get t() {
      return now;
    },
    spawn: (kind, x, y, s) => spawn(kind, x, y, s),
    later: (d, fn) => later(d, fn),
    open: (url) => host.open(url),
    go: (path) => host.go(path),
    crash: () => crash(),
    close: (win) => close(win),
  };

  const LAUNCHERS: Launcher[] = [
    { sprite: ICON.folder, label: "PROJECTS", act: () => spawn("projects") },
    { sprite: ICON.globe, label: "INTERNET", act: () => spawn("browser") },
    { sprite: ICON.radio, label: "GTA RADIO", act: () => host.go("/projects/radio") },
    { sprite: ICON.media, label: "MEDIA", act: () => host.go("/projects/media") },
    { sprite: ICON.terminal, label: "GITHUB", act: () => host.open(GITHUB_URL) },
    { sprite: ICON.briefcase, label: "LINKEDIN", act: () => host.open(LINKEDIN_URL) },
    { sprite: ICON.bin, label: "BIN", act: () => spawn("bin") },
    { sprite: ICON.skull, label: "DONT OPEN", act: () => dontOpen() },
  ];

  const MENU: Launcher[] = [
    LAUNCHERS[0],
    LAUNCHERS[1],
    LAUNCHERS[2],
    LAUNCHERS[4],
    LAUNCHERS[5],
    { sprite: ICON.skull, label: "SHUT DOWN...", act: () => (overlay = { kind: "off", at: now }) },
  ];

  // ---- layout -------------------------------------------------------------

  function iconRect(i: number): Rect {
    if (compact) {
      const cw = Math.floor((W - 4) / 4);
      return { x: 2 + (i % 4) * cw, y: 3 + Math.floor(i / 4) * 26, w: cw, h: 24 };
    }
    const rows = Math.max(1, Math.floor((H - TASKBAR_H - 4) / 26));
    return { x: 2 + Math.floor(i / rows) * 46, y: 3 + (i % rows) * 26, w: 44, h: 24 };
  }

  function browserRect(): Rect {
    const last = iconRect(LAUNCHERS.length - 1);
    if (compact) {
      const y = last.y + last.h + 2;
      return { x: 1, y, w: W - 2, h: H - TASKBAR_H - y - 2 };
    }
    const x = last.x + last.w + 4;
    return { x, y: 3, w: W - x - 4, h: H - TASKBAR_H - 8 };
  }

  const minX = () => (compact ? 0 : Math.min(W - 60, iconRect(0).w + 10));
  const maxAds = () => (compact ? 6 : 7);
  const ads = () => wins.filter((w) => DEFS[w.kind].ad);

  function menuRect(): Rect {
    const h = 6 + MENU.length * 14;
    return { x: 2, y: H - TASKBAR_H - h + 1, w: 88, h };
  }

  function taskRects(): { win: Win; r: Rect }[] {
    const list = wins.slice().sort((a, b) => a.id - b.id);
    const x0 = 39;
    const avail = W - x0 - 36;
    if (!list.length || avail < 16) return [];
    const bw = Math.min(58, Math.max(18, Math.floor(avail / list.length)));
    const n = Math.min(list.length, Math.floor(avail / bw));
    const out: { win: Win; r: Rect }[] = [];
    for (let i = 0; i < n; i++) out.push({ win: list[i], r: { x: x0 + i * bw, y: H - 12, w: bw - 1, h: 10 } });
    return out;
  }

  // ---- window management --------------------------------------------------

  function later(d: number, fn: () => void): void {
    pending.push({ at: now + d, fn });
  }

  function focus(win: Win): void {
    const i = wins.indexOf(win);
    if (i >= 0 && i !== wins.length - 1) {
      wins.splice(i, 1);
      wins.push(win);
    }
  }

  function spawn(kind: Kind, x?: number, y?: number, s?: Record<string, number>): Win {
    const def = DEFS[kind];
    if (def.single) {
      for (let i = 0; i < wins.length; i++) {
        if (wins[i].kind === kind) {
          focus(wins[i]);
          return wins[i];
        }
      }
    }
    let r: Rect;
    if (kind === "browser") r = browserRect();
    else {
      const w = Math.min(def.w, W - 2);
      const lo = minX();
      const px = x ?? lo + Math.random() * Math.max(0, W - w - lo - 2);
      const py = y ?? Math.random() * Math.max(0, H - TASKBAR_H - def.h - 2);
      r = {
        x: Math.round(clamp(px, 0, Math.max(0, W - w - 1))),
        y: Math.round(clamp(py, 0, Math.max(0, H - TASKBAR_H - def.h - 1))),
        w,
        h: def.h,
      };
    }
    const win: Win = { id: nextId++, kind, ...r, born: now, seed: Math.random(), s: { ...s } };
    wins.push(win);
    return win;
  }

  function close(win: Win): void {
    const i = wins.indexOf(win);
    if (i < 0) return;
    wins.splice(i, 1);
    if (!DEFS[win.kind].ad) return;
    if (achieved) return;
    // Classic pop-up behaviour: closing one sometimes opens another.
    if (Math.random() < 0.2) later(0.35, spawnRandomAd);
    else if (!ads().length && now > cascadeEnd) {
      achieved = true;
      nextSpawn = Infinity;
      later(0.4, () => spawn("achievement", W / 2 - 64, H / 2 - 40));
    }
  }

  function spawnRandomAd(): void {
    const open = ads().map((w) => w.kind);
    const fresh = AD_KINDS.filter((k) => open.indexOf(k) < 0);
    const pool = fresh.length ? fresh : AD_KINDS;
    spawn(pool[Math.floor(Math.random() * pool.length)]);
  }

  /** Earning the achievement keeps pop-ups away until the page is reloaded, even across reboots. */
  function reset(): void {
    wins = [];
    pending = [];
    menuOpen = false;
    spawn("browser");
    if (achieved) {
      nextSpawn = cascadeEnd = Infinity;
      return;
    }
    const kinds: Kind[] = compact
      ? ["virus", "winner", "slots", "stars", "sprunk", "chat"]
      : ["winner", "slots", "virus", "ram", "stars", "sprunk", "trick"];
    const spots = compact
      ? [
          [0.05, 0.0],
          [0.9, 0.1],
          [0.2, 0.36],
          [0.85, 0.52],
          [0.0, 0.78],
          [0.95, 1.0],
        ]
      : [
          [0.04, 0.06],
          [0.66, 0.04],
          [0.3, 0.4],
          [0.82, 0.55],
          [0.1, 0.7],
          [0.52, 0.16],
          [0.44, 0.78],
        ];
    const lo = minX();
    kinds.forEach((kind, i) => {
      const def = DEFS[kind];
      const [fx, fy] = spots[i];
      const top = compact ? browserRect().y - 10 : 0;
      later(0.5 + i * 0.32, () =>
        spawn(kind, lo + fx * (W - def.w - lo), top + fy * (H - TASKBAR_H - def.h - top)),
      );
    });
    cascadeEnd = now + 0.5 + kinds.length * 0.32;
    nextSpawn = cascadeEnd + 4;
  }

  function dontOpen(): void {
    for (let i = 0; i < 12; i++) {
      later(i * 0.09, () => spawn("virus", minX() + ((i * 23) % Math.max(1, W - 140)), 4 + ((i * 11) % Math.max(1, H - 90)), { n: 666 + i * 111 }));
    }
    later(2.2, crash);
  }

  function crash(): void {
    menuOpen = false;
    drag = null;
    overlay = { kind: "bsod", at: now };
  }

  function reboot(): void {
    pending = [];
    overlay = { kind: "boot", at: now };
    later(1.8, () => {
      overlay = null;
      reset();
    });
  }

  // ---- hit testing ---------------------------------------------------------

  function hitTest(x: number, y: number): Hit {
    if (overlay) return { k: "overlay", key: "overlay" };
    if (menuOpen) {
      const m = menuRect();
      if (inside(m, x, y)) {
        const i = Math.floor((y - m.y - 3) / 14);
        return i >= 0 && i < MENU.length ? { k: "menu", i, key: `m${i}` } : { k: "none", key: "menu" };
      }
    }
    if (y >= H - TASKBAR_H) {
      if (inside({ x: 2, y: H - 12, w: 34, h: 10 }, x, y)) return { k: "start", key: "start" };
      const tasks = taskRects();
      for (let i = 0; i < tasks.length; i++) {
        if (inside(tasks[i].r, x, y)) return { k: "task", win: tasks[i].win, key: `t${tasks[i].win.id}` };
      }
      return { k: "none", key: "bar" };
    }
    for (let i = wins.length - 1; i >= 0; i--) {
      const win = wins[i];
      if (!inside(win, x, y)) continue;
      if (y < win.y + 2 + TITLE_H + 1) {
        if (inside({ x: win.x + win.w - 11, y: win.y + 3, w: 8, h: 7 }, x, y)) return { k: "close", win, key: `c${win.id}` };
        return { k: "title", win, key: `w${win.id}` };
      }
      const lx = x - win.x - 2;
      const ly = y - win.y - 12;
      const s = scrollOf(win);
      if (s && inside({ x: s.area.x + s.area.w + 1, y: s.area.y, w: SB_W, h: s.area.h }, lx, ly)) return { k: "sbar", win, key: `s${win.id}` };
      const btns = buttonsOf(win);
      for (let b = 0; b < btns.length; b++) {
        if (inside(btns[b], lx, ly)) return { k: "btn", win, btn: btns[b], key: `b${win.id}:${b}` };
      }
      return { k: "win", win, key: `w${win.id}` };
    }
    for (let i = 0; i < LAUNCHERS.length; i++) {
      if (inside(iconRect(i), x, y)) return { k: "icon", i, key: `i${i}` };
    }
    return { k: "none", key: "desk" };
  }

  const buttonsOf = (win: Win): Btn[] => DEFS[win.kind].buttons?.(win, now, win.w - 4, win.h - 14) ?? [];
  const scrollOf = (win: Win): Scroll | null => DEFS[win.kind].scroll?.(win, now, win.w - 4, win.h - 14) ?? null;
  const local = (win: Win, x: number, y: number): [number, number] => [x - win.x - 2, y - win.y - 12];

  function scrollBy(win: Win, d: number): boolean {
    const s = scrollOf(win);
    return !!s && setScroll(win, s, scrollPos(win, s) + d);
  }

  /** Arrows step a few lines, the track pages, and the thumb starts a drag. */
  function pressScrollbar(win: Win, ly: number): void {
    const s = scrollOf(win);
    if (!s) return;
    const pos = scrollPos(win, s);
    const B = scrollbar(s, pos);
    if (!B.max) return;
    let step: number;
    if (ly < B.y + SB_W) step = -ARROW_STEP;
    else if (ly >= B.y + B.h - SB_W) step = ARROW_STEP;
    else if (ly >= B.thumbY && ly < B.thumbY + B.thumbH) {
      sdrag = { win, thumb: true, grab: ly - B.thumbY, sy: ly, start: pos, moved: false };
      return;
    } else step = (ly < B.thumbY ? -1 : 1) * Math.max(LINE, s.area.h - LINE * 2);
    setScroll(win, s, pos + step);
    hold = { win, step, next: now + REPEAT_DELAY };
  }

  /** Whether a finger landing here should scroll or drag inside the desktop rather than the page. */
  function ownsTouch(x: number, y: number): boolean {
    const hit = hitTest(x, y);
    if (hit.k === "title" || hit.k === "sbar") return true;
    if ((hit.k !== "btn" && hit.k !== "win") || !hit.win) return false;
    const s = scrollOf(hit.win);
    const [lx, ly] = local(hit.win, x, y);
    return !!s && scrollMax(s) > 0 && inside(s.area, lx, ly);
  }

  // ---- drawing -------------------------------------------------------------

  function drawWallpaper(): void {
    for (let i = 0; i < WALL.length; i++) {
      const y0 = Math.floor((i * H) / WALL.length);
      g.fill(0, y0, W, Math.floor(((i + 1) * H) / WALL.length) - y0, WALL[i]);
    }
    const scale = W >= 360 ? 4 : 2;
    g.textC("YKAPF 95", W / 2 + (compact ? 0 : 24), H / 2 - 10, col(60, 130, 210), scale);
  }

  function drawIcons(): void {
    for (let i = 0; i < LAUNCHERS.length; i++) {
      const r = iconRect(i);
      const l = LAUNCHERS[i];
      g.sprite(l.sprite, r.x + Math.round((r.w - 12) / 2), r.y + 1);
      const tw = textWidth(l.label);
      const tx = r.x + Math.round((r.w - tw) / 2);
      if (inside(r, mouse.x, mouse.y) && !overlay) {
        g.fill(tx - 1, r.y + 15, tw + 2, 7, C.navy);
        g.text(l.label, tx, r.y + 16, C.white);
      } else {
        g.text(l.label, tx + 1, r.y + 17, C.black);
        g.text(l.label, tx, r.y + 16, C.white);
      }
    }
  }

  function drawWin(win: Win, top: boolean): void {
    const def = DEFS[win.kind];
    const age = now - win.born;
    if (age < ZOOM_S) {
      const f = 0.25 + (0.75 * age) / ZOOM_S;
      const w = Math.max(4, Math.round(win.w * f));
      const h = Math.max(4, Math.round(win.h * f));
      g.frame(Math.round(win.x + (win.w - w) / 2), Math.round(win.y + (win.h - h) / 2), w, h, C.white);
      return;
    }
    const { x, y, w, h } = win;
    g.bevel(x, y, w, h);
    g.fill(x + 2, y + 2, w - 4, TITLE_H, top ? def.bar ?? C.navy : C.shadow);
    g.text(truncate(def.title, w - 18), x + 4, y + 4, top ? C.white : C.light);
    const pressedClose = mouse.down && pressKey === `c${win.id}`;
    const bx = x + w - 11;
    const by = y + 3;
    g.bevel(bx, by, 8, 7, !pressedClose);
    const o = pressedClose ? 1 : 0;
    for (let i = 0; i < 4; i++) {
      g.px(bx + 2 + i + o, by + 1 + i + o, C.black);
      g.px(bx + 5 - i + o, by + 1 + i + o, C.black);
    }
    const bw = w - 4;
    const bh = h - 14;
    g.region(x + 2, y + 12, bw, bh, () => {
      def.body(g, win, now, bw, bh);
      const btns = buttonsOf(win);
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        if (!b.label) continue;
        const down = mouse.down && pressKey === `b${win.id}:${i}`;
        g.bevel(b.x, b.y, b.w, b.h, !down);
        g.textC(b.label, b.x + b.w / 2 + (down ? 1 : 0), b.y + 3 + (down ? 1 : 0), C.black);
      }
    });
  }

  function drawTaskbar(): void {
    const y = H - TASKBAR_H;
    g.fill(0, y, W, TASKBAR_H, C.face);
    g.fill(0, y + 1, W, 1, C.white);
    g.bevel(2, H - 12, 34, 10, !menuOpen);
    g.sprite(FLAG, 5 + (menuOpen ? 1 : 0), H - 9);
    g.text("START", 11 + (menuOpen ? 1 : 0), H - 9, C.black);
    const topWin = wins[wins.length - 1];
    const tasks = taskRects();
    for (let i = 0; i < tasks.length; i++) {
      const { win, r } = tasks[i];
      const active = win === topWin;
      g.bevel(r.x, r.y, r.w, r.h, !active, active ? C.light : C.face);
      g.text(truncate(DEFS[win.kind].title, r.w - 6), r.x + 3 + (active ? 1 : 0), r.y + 3, C.black);
    }
    g.bevel(W - 32, H - 12, 30, 10, false);
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    g.textC(`${hh}:${mm}`, W - 17, H - 9, C.black);
  }

  function drawMenu(): void {
    const m = menuRect();
    g.bevel(m.x, m.y, m.w, m.h);
    g.fill(m.x + 3, m.y + 3, 10, m.h - 6, C.navy);
    forEachVerticalTextPixel("YKAPF95", (px, py) => g.px(m.x + 6 + px, m.y + m.h - 45 + py, C.white));
    for (let i = 0; i < MENU.length; i++) {
      const r = { x: m.x + 14, y: m.y + 3 + i * 14, w: m.w - 17, h: 14 };
      const hot = inside(r, mouse.x, mouse.y);
      if (hot) g.fill(r.x, r.y, r.w, r.h, C.navy);
      g.sprite(MENU[i].sprite, r.x + 1, r.y + 1);
      g.text(MENU[i].label, r.x + 16, r.y + 5, hot ? C.white : C.black);
    }
  }

  function drawOverlay(): void {
    if (!overlay) return;
    const cx = W / 2;
    if (overlay.kind === "bsod") {
      const blue = col(0, 0, 170);
      g.fill(0, 0, W, H, blue);
      const paras = [
        "A FATAL EXCEPTION 0E HAS OCCURRED AT 0028:C0011E36 IN VXD YKAPF(01). THE CURRENT PORTFOLIO WILL BE TERMINATED.",
        "",
        "* CLICK OR PRESS ANY KEY TO RESTART YOUR PORTFOLIO.",
        "* YOU REALLY SHOULDN'T HAVE OPENED THAT.",
      ];
      const maxW = Math.min(200, W - 12);
      const lines: string[] = [];
      paras.forEach((p) => (p ? lines.push(...wrap(p, maxW)) : lines.push("")));
      const blockH = 14 + lines.length * 8 + 12;
      let y = Math.round(H / 2 - blockH / 2);
      const title = " YKAPF 95 ";
      const tw = textWidth(title);
      g.fill(Math.round(cx - tw / 2) - 2, y - 2, tw + 4, 9, C.face);
      g.textC(title, cx, y, blue);
      y += 14;
      const left = Math.round(cx - maxW / 2);
      lines.forEach((l, i) => g.text(l, left, y + i * 8, C.white));
      const py = y + lines.length * 8 + 6;
      g.textC("PRESS ANY KEY TO CONTINUE", cx, py, C.white);
      if (Math.floor(now * 2) % 2 === 0) g.fill(Math.round(cx + textWidth("PRESS ANY KEY TO CONTINUE") / 2) + 2, py + 4, 3, 1, C.white);
    } else if (overlay.kind === "off") {
      g.fill(0, 0, W, H, C.black);
      const s = textWidth("IT'S NOW SAFE TO TURN OFF") * 2 <= W - 8 ? 2 : 1;
      g.textC("IT'S NOW SAFE TO TURN OFF", cx, H / 2 - 8 * s, C.orange, s);
      g.textC("YOUR PORTFOLIO.", cx, H / 2 - 8 * s + 7 * s, C.orange, s);
      g.textC("CLICK TO START AGAIN", cx, H / 2 + 10 * s, C.shadow);
    } else {
      g.fill(0, 0, W, H, C.black);
      g.textC("STARTING YKAPF 95...", cx, H / 2 - 8, C.white);
      const f = clamp((now - overlay.at) / 1.6, 0, 1);
      const bw = 80;
      g.frame(Math.round(cx - bw / 2), H / 2 + 2, bw, 7, C.shadow);
      const n = Math.floor(((bw - 4) * f) / 4);
      for (let i = 0; i < n; i++) g.fill(Math.round(cx - bw / 2) + 2 + i * 4, H / 2 + 4, 3, 3, C.blue);
    }
  }

  function render(t: number): void {
    if (!img) return;
    now = t;
    if (!booted) {
      booted = true;
      reset();
    }
    if (pending.length) {
      const due = pending.filter((p) => p.at <= now);
      if (due.length) {
        pending = pending.filter((p) => p.at > now);
        due.forEach((p) => p.fn());
      }
    }
    if (hold && mouse.down && now >= hold.next) {
      scrollBy(hold.win, hold.step);
      hold.next = now + REPEAT_EVERY;
    }
    if (!overlay && !drag && !achieved && now >= nextSpawn) {
      if (ads().length < maxAds()) spawnRandomAd();
      nextSpawn = now + 3.5 + Math.random() * 2.5;
    }

    if (overlay) drawOverlay();
    else {
      drawWallpaper();
      drawIcons();
      for (let i = 0; i < wins.length; i++) drawWin(wins[i], i === wins.length - 1);
      drawTaskbar();
      if (menuOpen) drawMenu();
    }
    c2d.putImageData(img, 0, 0);
  }

  // ---- input ---------------------------------------------------------------

  return {
    resize(w: number, h: number): void {
      if (w === W && h === H) return;
      W = w;
      H = h;
      compact = W < 300;
      canvas.width = W;
      canvas.height = H;
      img = c2d.createImageData(W, H);
      g.attach(new Uint32Array(img.data.buffer), W, H);
      const br = browserRect();
      wins.forEach((win) => {
        if (win.kind === "browser") Object.assign(win, br);
        win.w = win.kind === "browser" ? win.w : Math.min(DEFS[win.kind].w, W - 2);
        win.x = clamp(win.x, 0, Math.max(0, W - win.w - 1));
        win.y = clamp(win.y, 0, Math.max(0, H - TASKBAR_H - win.h - 1));
      });
    },
    render,
    pointerDown(x: number, y: number, touch = false): boolean {
      mouse.x = x;
      mouse.y = y;
      mouse.down = true;
      suppressClick = false;
      const hit = hitTest(x, y);
      pressKey = hit.key;
      if (menuOpen && hit.k !== "menu" && hit.k !== "start") menuOpen = false;
      if (hit.win) focus(hit.win);
      if (hit.k === "title" && hit.win) {
        drag = { win: hit.win, dx: x - hit.win.x, dy: y - hit.win.y, sx: x, sy: y, moved: false };
        return true;
      }
      if (hit.k === "sbar" && hit.win) {
        pressScrollbar(hit.win, local(hit.win, x, y)[1]);
        return true;
      }
      if (touch && hit.win && ownsTouch(x, y)) {
        const s = scrollOf(hit.win);
        if (s) sdrag = { win: hit.win, thumb: false, grab: 0, sy: y, start: scrollPos(hit.win, s), moved: false };
        return true;
      }
      return false;
    },
    pointerMove(x: number, y: number): void {
      mouse.x = x;
      mouse.y = y;
      if (sdrag) {
        const s = scrollOf(sdrag.win);
        if (!s) return;
        if (sdrag.thumb) {
          const B = scrollbar(s, scrollPos(sdrag.win, s));
          const ly = local(sdrag.win, x, y)[1];
          setScroll(sdrag.win, s, ((ly - sdrag.grab - B.trackY) / Math.max(1, B.trackH - B.thumbH)) * B.max);
        } else {
          if (Math.abs(y - sdrag.sy) > 2) sdrag.moved = true;
          if (sdrag.moved) setScroll(sdrag.win, s, sdrag.start - (y - sdrag.sy));
        }
        return;
      }
      if (!drag) return;
      if (Math.abs(x - drag.sx) + Math.abs(y - drag.sy) > 1) drag.moved = true;
      const win = drag.win;
      win.x = clamp(x - drag.dx, -(win.w - 24), W - 24);
      win.y = clamp(y - drag.dy, 0, H - TASKBAR_H - TITLE_H - 3);
    },
    pointerUp(): void {
      mouse.down = false;
      if (drag?.moved || sdrag?.moved) suppressClick = true;
      drag = null;
      sdrag = null;
      hold = null;
    },
    /** Scrolls whatever window is under the pointer; false when there was nothing left to scroll. */
    wheel(x: number, y: number, dy: number): boolean {
      if (overlay) return false;
      for (let i = wins.length - 1; i >= 0; i--) {
        if (inside(wins[i], x, y)) return scrollBy(wins[i], dy);
      }
      return false;
    },
    ownsTouch: (x: number, y: number) => !overlay && ownsTouch(x, y),
    pointerLeave(): void {
      mouse.x = mouse.y = -1;
    },
    /** Actions run on click so that opening links counts as a user gesture. */
    click(x: number, y: number): void {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const hit = hitTest(x, y);
      const same = hit.key === pressKey;
      pressKey = "";
      if (!same) return;
      switch (hit.k) {
        case "overlay":
          if (overlay && overlay.kind !== "boot") reboot();
          break;
        case "menu":
          menuOpen = false;
          if (hit.i !== undefined) MENU[hit.i].act();
          break;
        case "start":
          menuOpen = !menuOpen;
          break;
        case "icon":
          if (hit.i !== undefined) LAUNCHERS[hit.i].act();
          break;
        case "close":
          if (hit.win) close(hit.win);
          break;
        case "btn":
          if (hit.win && hit.btn) hit.btn.act(api, hit.win);
          break;
        default:
      }
    },
    key(key: string): void {
      if (overlay && overlay.kind !== "boot") {
        reboot();
        return;
      }
      keys.push(key.length === 1 ? key.toLowerCase() : key);
      if (keys.length > KONAMI.length) keys = keys.slice(-KONAMI.length);
      if (keys.join(",") === KONAMI.join(",")) {
        keys = [];
        crash();
      }
    },
    clickable(x: number, y: number): boolean {
      const k = hitTest(x, y).k;
      return k === "menu" || k === "start" || k === "task" || k === "icon" || k === "close" || k === "sbar" || k === "btn" || k === "overlay";
    },
  };
}

export type Desktop = NonNullable<ReturnType<typeof createDesktop>>;
