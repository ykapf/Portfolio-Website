import { C, col, Gfx, textWidth } from "./gfx";
import { NEWS_SECTIONS, STORIES, TAG_COLOURS } from "./news";
import { Block, docScroll, drawDoc, footer, footerRow, footerY, layoutDoc, Rect, Row, Scroll, scrollArea, scrolled, scrolledButtons } from "./pagekit";
import { drawPhoto } from "./photos";
import type { Btn, Win } from "./popups";
import { nav, NEWS } from "./navigation";
import { button, clampLines } from "./ui";

const RED = col(196, 22, 28);
const INK = col(24, 24, 30);
const MAST_H = 17;
const NAV_H = 9;
const ROW = 31;
const TAGLINE = "ALL THE NEWS. NONE OF THE FACTS.";
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

const SECTIONS = ["HOME", ...NEWS_SECTIONS];

function items(w: Win): number[] {
  const sec = w.s.sec ?? 0;
  const out: number[] = [];
  for (let i = 0; i < STORIES.length; i++) if (!sec || STORIES[i].tag === NEWS_SECTIONS[sec - 1]) out.push(i);
  return out;
}

function sectionTabs(M: Rect) {
  const out: { x: number; w: number; sec: number }[] = [];
  let x = M.x + 3;
  for (let i = 0; i < SECTIONS.length; i++) {
    const w = textWidth(SECTIONS[i]) + 6;
    if (x + w > M.x + M.w - 2) break;
    out.push({ x, w, sec: i });
    x += w + 1;
  }
  return out;
}

const listTop = (M: Rect) => M.y + MAST_H + NAV_H + 3;
const leadH = (M: Rect) => Math.max(40, Math.min(84, Math.round(M.w * 0.3)));

/** The front page as one scrolling column: a lead story with a big photo, then thumbnail rows. */
function listScroll(w: Win, M: Rect): Scroll & { list: number[]; lh: number } {
  const list = items(w);
  const top = listTop(M);
  const area = scrollArea(M.x, top, M.w, M.y + M.h - top - 1);
  const lh = leadH(area);
  const content = list.length ? lh + 3 + (list.length - 1) * ROW + 4 : 40;
  return { area, content, key: "nls", list, lh };
}

const docCache = new Map<string, Row[]>();

function storyDoc(idx: number, w: number): Row[] {
  const key = `${idx}:${w}`;
  const hit = docCache.get(key);
  if (hit) return hit;
  const st = STORIES[idx];
  const next = STORIES[(idx + 1) % STORIES.length];
  const blocks: Block[] = [
    { text: `${st.tag} - ${st.ago}`, c: TAG_COLOURS[st.tag] },
    { text: st.head, c: INK },
    { text: st.standfirst, c: C.shadow },
    { text: `BY ${st.by}`, c: RED },
    { photo: st.photo, caption: st.caption },
    ...st.body,
    { text: "SHARE: BLEATER / FACEPAGE / FORWARD TO MUM", c: C.navy },
    { text: `READ NEXT: ${next.head}`, c: C.link },
  ];
  const rows = layoutDoc(blocks, w);
  docCache.set(key, rows);
  return rows;
}

function articleScroll(w: Win, M: Rect) {
  const top = listTop(M) + 14;
  const area = scrollArea(M.x + 3, top, M.w - 4, footerY(M) - 2 - top);
  const rows = storyDoc(w.s.story - 1, area.w - 2);
  return { rows, s: docScroll(rows, area) };
}

/** The scrolling viewport of whatever news view is showing. */
export const newsScroll = (w: Win, M: Rect): Scroll => (w.s.story ? articleScroll(w, M).s : listScroll(w, M));

export function newsAddress(w: Win): string {
  if (w.s.story) return `HTTP://WWW.NEWS.COM/${STORIES[w.s.story - 1].tag}/${w.s.story}`;
  const sec = w.s.sec ?? 0;
  return sec ? `HTTP://WWW.NEWS.COM/${NEWS_SECTIONS[sec - 1]}` : "HTTP://WWW.NEWS.COM/";
}

export function drawNews(g: Gfx, w: Win, t: number, M: Rect): void {
  g.fill(M.x, M.y, M.w, M.h, C.white);
  g.fill(M.x, M.y, M.w, MAST_H, RED);
  g.text("NEWS", M.x + 4, M.y + 3, C.white, 2);
  g.fill(M.x + 4, M.y + 14, textWidth("NEWS") * 2, 1, col(255, 200, 200));
  const d = new Date();
  const date = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const right = M.x + M.w - 4;
  if (textWidth(TAGLINE) + 50 < M.w) g.text(TAGLINE, right - textWidth(TAGLINE), M.y + 3, C.white);
  g.text(date, right - textWidth(date), M.y + 10, col(255, 190, 190));

  g.fill(M.x, M.y + MAST_H, M.w, NAV_H, INK);
  const tabs = sectionTabs(M);
  const sec = w.s.sec ?? 0;
  for (let i = 0; i < tabs.length; i++) {
    const tab = tabs[i];
    const on = tab.sec === sec;
    if (on) g.fill(tab.x - 1, M.y + MAST_H, tab.w, NAV_H, RED);
    g.text(SECTIONS[tab.sec], tab.x + 2, M.y + MAST_H + 2, on ? C.white : col(200, 200, 210));
  }
  if (w.s.story) {
    footer(g, M);
    const A = articleScroll(w, M);
    drawDoc(g, w, A.rows, A.s, C.dark, t);
    return;
  }

  const S = listScroll(w, M);
  const W = S.area.w;
  scrolled(g, w, S, (pos) => {
    if (!S.list.length) {
      g.textC("NO NEWS IS GOOD NEWS.", W / 2, 20, C.shadow);
      return;
    }
    const st = STORIES[S.list[0]];
    const lh = S.lh;
    if (pos < lh) {
      drawPhoto(g, st.photo, 3, 0, W - 5, lh, t);
      const lines = clampLines(st.head, W - 14, 2);
      const bandH = lines.length * 7 + 12;
      g.fill(4, lh - bandH - 1, W - 7, bandH, col(20, 20, 26));
      g.fill(7, lh - bandH + 1, textWidth(st.tag) + 4, 7, TAG_COLOURS[st.tag]);
      g.text(st.tag, 9, lh - bandH + 2, C.white);
      for (let l = 0; l < lines.length; l++) g.text(lines[l], 7, lh - bandH + 10 + l * 7, C.white);
    }
    for (let i = 1; i < S.list.length; i++) {
      const ry = lh + 3 + (i - 1) * ROW;
      if (ry + ROW < pos || ry > pos + S.area.h) continue;
      const row = STORIES[S.list[i]];
      drawPhoto(g, row.photo, 3, ry + 1, 42, 27, t);
      g.text(row.tag, 49, ry + 1, TAG_COLOURS[row.tag]);
      g.text(row.ago, 49 + textWidth(row.tag) + 4, ry + 1, C.shadow);
      const lines = clampLines(row.head, W - 52, 3);
      for (let l = 0; l < lines.length; l++) g.text(lines[l], 49, ry + 8 + l * 7, C.black);
      g.fill(3, ry + ROW - 2, W - 5, 1, C.light);
    }
  });
}

export function newsButtons(w: Win, M: Rect): Btn[] {
  const out: Btn[] = sectionTabs(M).map((tab) => ({
    x: tab.x - 1,
    y: M.y + MAST_H,
    w: tab.w,
    h: NAV_H,
    act: (_, win) => nav(win, NEWS, { sec: tab.sec, nls: 0 }),
  }));
  const keep = (win: Win) => ({ sec: win.s.sec ?? 0 });

  if (w.s.story) {
    const idx = w.s.story - 1;
    out.push(button("< ALL NEWS", M.x + 3, listTop(M), (_, win) => nav(win, NEWS, keep(win))));
    return out.concat(
      footerRow(M, [
        button("< BACK", 0, 0, (_, win) => nav(win, NEWS, keep(win))),
        button("NEXT STORY >", 0, 0, (_, win) => nav(win, NEWS, { ...keep(win), story: ((idx + 1) % STORIES.length) + 1 })),
      ]),
    );
  }

  const S = listScroll(w, M);
  const open = (idx: number) => (_: unknown, win: Win) => nav(win, NEWS, { ...keep(win), story: idx + 1 });
  const rows: Btn[] = S.list.map((idx, i) =>
    i === 0 ? { x: 0, y: 0, w: S.area.w, h: S.lh, act: open(idx) } : { x: 0, y: S.lh + 3 + (i - 1) * ROW, w: S.area.w, h: ROW - 1, act: open(idx) },
  );
  return out.concat(scrolledButtons(w, S, rows));
}
