import { ADS, AdSite } from "./ads";
import { C, col, Gfx, textWidth, truncate, wrap } from "./gfx";
import { nav } from "./navigation";
import {
  Block,
  docHeight,
  drawButton,
  drawRows,
  footer,
  footerRow,
  footerY,
  layoutDoc,
  Rect,
  Row,
  Scroll,
  scrollArea,
  scrolled,
  scrolledButtons,
} from "./pagekit";
import { drawPhoto } from "./photos";
import type { Btn, Win } from "./popups";
import { BTN_H, button } from "./ui";

const NAV_H = 11;
const LINKS = "HOME   PRODUCTS   ABOUT   CONTACT";

const adOf = (w: Win) => ADS[(w.s.site ?? 1) - 1];
const siteOf = (w: Win) => adOf(w).site as AdSite;

export const siteAddress = (w: Win) => `HTTPS://WWW.${siteOf(w).url}/`;
export const siteTitle = (w: Win) => siteOf(w).url;

/** Hero band in content space: headline on the left, product photo on the right, CTA underneath. */
function heroLayout(w: Win, W: number) {
  const photoW = W >= 200 ? Math.round(W * 0.38) : 0;
  const textW = W - photoW - 14;
  const lines = wrap(siteOf(w).hero, textW);
  const h = Math.max(photoW ? Math.round(photoW * 0.6) + 8 : 0, lines.length * 7 + 26);
  return { h, photoW, lines };
}

/** Body below the hero: text rows, plus an optional gallery column drawn to their right. */
interface SiteDoc {
  rows: Row[];
  side: Row[];
  sideW: number;
  textW: number;
}

const COL_GAP = 8;
const docCache = new Map<string, SiteDoc>();

function siteDoc(w: Win, width: number): SiteDoc {
  const key = `${w.s.site}:${width}`;
  const hit = docCache.get(key);
  if (hit) return hit;
  const ad = adOf(w);
  const s = siteOf(w);
  const text: Block[] = [];
  const photos: Block[] = [];
  const gallery = s.gallery ?? [];
  for (let i = 0; i < gallery.length; i++) photos.push({ photo: gallery[i][0], caption: gallery[i][1] });
  for (let i = 0; i < s.features.length; i++) {
    text.push({ text: s.features[i][0], c: ad.band === C.black ? C.black : ad.band });
    text.push(s.features[i][1]);
  }
  text.push({ text: s.quote, c: C.navy });
  text.push({ text: `${ad.fine} (C) ${new Date().getFullYear()} ${ad.name}. ALL RIGHTS RESERVED. NO REFUNDS.`, c: C.shadow });
  const sideW = photos.length && width >= 150 ? Math.min(110, Math.round(width * 0.36)) : 0;
  const doc: SiteDoc = sideW
    ? { rows: layoutDoc(text, width - sideW - COL_GAP), side: layoutDoc(photos, sideW), sideW, textW: width - sideW - COL_GAP }
    : { rows: layoutDoc(photos.concat(text), width), side: [], sideW: 0, textW: width };
  docCache.set(key, doc);
  return doc;
}

const bodyHeight = (d: SiteDoc) => Math.max(docHeight(d.rows), docHeight(d.side));

function geometry(w: Win, M: Rect) {
  const done = !!w.s[`ad${w.s.site}`] && !siteOf(w).opens;
  const result = done ? wrap(siteOf(w).ctaResult, M.w - 10) : [];
  const top = M.y + NAV_H;
  const bottom = footerY(M) - (done ? result.length * 7 + 4 : 0);
  const area = scrollArea(M.x, top, M.w, bottom - top);
  const H = heroLayout(w, area.w);
  const doc = siteDoc(w, area.w - 10);
  const s: Scroll = { area, content: H.h + 5 + bodyHeight(doc) + 4, key: "sc" };
  return { H, doc, s, done, result };
}

export const siteScroll = (w: Win, M: Rect): Scroll => geometry(w, M).s;

function ctaRect(w: Win, H: { h: number }): Btn {
  const label = siteOf(w).cta;
  return { x: 6, y: H.h - 15, w: textWidth(label) + 12, h: BTN_H, label, act: () => undefined };
}

export function drawSite(g: Gfx, w: Win, t: number, M: Rect): void {
  const ad = adOf(w);
  const s = siteOf(w);
  const G = geometry(w, M);
  g.fill(M.x, M.y, M.w, M.h, C.white);
  g.fill(M.x, M.y, M.w, NAV_H, ad.band);
  g.text(truncate(ad.name, M.w / 2), M.x + 4, M.y + 3, ad.nameC);
  if (textWidth(ad.name) + textWidth(LINKS) + 16 < M.w) g.text(LINKS, M.x + M.w - textWidth(LINKS) - 4, M.y + 3, ad.nameC);
  footer(g, M);

  const W = G.s.area.w;
  scrolled(g, w, G.s, (pos) => {
    const H = G.H;
    if (pos < H.h) {
      g.fill(0, 0, W, H.h, ad.bg);
      g.region(0, 0, W, H.h, () => ad.deco?.(g, W, H.h, t));
      for (let i = 0; i < H.lines.length; i++) g.textO(H.lines[i], 6, 6 + i * 7, ad.headC, ad.bg === C.black ? C.dark : col(0, 0, 0));
      if (H.photoW) drawPhoto(g, s.photo, W - H.photoW - 4, 4, H.photoW, H.h - 8, t);
      const cta = ctaRect(w, H);
      drawButton(g, cta.label as string, cta.x, cta.y, cta.w, ad.ctaBg, ad.ctaC);
    }
    const top = H.h + 5;
    const d = G.doc;
    const from = pos - top;
    const to = from + G.s.area.h;
    g.region(5, top, d.textW, docHeight(d.rows), () => drawRows(g, d.rows, d.textW, C.dark, t, from, to));
    if (d.sideW) g.region(W - 5 - d.sideW, top, d.sideW, docHeight(d.side), () => drawRows(g, d.side, d.sideW, C.dark, t, from, to));
  });

  if (G.done) {
    const h = G.result.length * 7 + 3;
    const ry = footerY(M) - h - 1;
    g.fill(M.x + 2, ry, M.w - 4, h, C.yellow);
    for (let i = 0; i < G.result.length; i++) g.text(G.result[i], M.x + 5, ry + 2 + i * 7, C.darkRed);
  }
}

export function siteButtons(w: Win, M: Rect, back: (win: Win) => void): Btn[] {
  const G = geometry(w, M);
  const cta = ctaRect(w, G.H);
  const opens = siteOf(w).opens;
  const key = `ad${w.s.site}`;
  cta.act = (_, win) => {
    if (opens !== undefined) nav(win, opens, { bk: 0, bn: 0 });
    else win.s[key] = 1;
  };
  return scrolledButtons(w, G.s, [cta]).concat(footerRow(M, [button("< BACK", 0, 0, (_, win) => back(win))]));
}
