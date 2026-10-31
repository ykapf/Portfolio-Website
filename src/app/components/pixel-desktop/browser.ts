import { siteAddress, siteButtons, siteScroll, siteTitle, drawSite } from "./adSite";
import { ADS, drawTallAd, drawWideAd } from "./ads";
import { bankAddress, bankButtons, bankScroll, bankTitle, drawBank } from "./bankPage";
import { casinoAddress, casinoButtons, casinoTitle, drawCasino } from "./casino";
import { casinoOf } from "./casinoCore";
import { C, col, Gfx, textWidth, truncate } from "./gfx";
import { drawMail, mailAddress, mailButtons, mailScroll, unread } from "./mailPage";
import { drawNews, newsAddress, newsButtons, newsScroll } from "./newsPage";
import type { Rect } from "./pagekit";
import type { Btn, PopupDef, Win } from "./popups";
import { BANK, HOME, LUCKY, MAIL, nav, NEWS, page, SITE } from "./navigation";
import { blink, GITHUB_URL, LINKEDIN_URL, ticker, TICKER_H } from "./ui";

const TABS = ["", "HOW TO CENTRE A DIV", "BLEETER", "GTA 6 RELEASE DATE", "STACK UNDERFLOW", "FREE RAM DOWNLOAD", "YKAPF - GITHUB", "WHY IS MY CSS BROKEN"];
const FAVS: [string, number][] = [
  ["NEWS", NEWS],
  ["I'M FEELING LUCKY", LUCKY],
  ["BMAIL", MAIL],
];
const FAV_LABEL = "FAVOURITES:";

const RESULTS: [string, string, string][] = [
  ["YKAPF - GITHUB", "GITHUB.COM/YKAPF", GITHUB_URL],
  ["YUSUF DENIZ K - LINKEDIN", "LINKEDIN.COM/IN/YUSUF-DENIZ-K", LINKEDIN_URL],
  ["GTA V RADIO - LISTEN ONLINE", "YKAPF.COM/PROJECTS/RADIO", "/projects/radio"],
  ["MEDIA - YOUTUBE WITHOUT ADS", "YKAPF.COM/PROJECTS/MEDIA", "/projects/media"],
];

const LOGO_COLOURS = [C.blue, C.red, C.gold, C.blue, C.green, C.red, C.blue];
const PAGE_Y = 32;
const SIDE_W = 56;
const AD_LABEL = 8;
const AD_ROTATE_S = 8;
const TILE_H = 24;

// ---- layout ----------------------------------------------------------------

function layout(bw: number, bh: number) {
  const tabs = Math.max(1, Math.min(TABS.length, Math.floor((bw - 14) / 30)));
  const tabW = Math.min(60, Math.floor((bw - 14) / tabs));
  const px = 2;
  const py = PAGE_Y + 2;
  const pw = bw - 4;
  const ph = bh - PAGE_Y - 4;
  const banners: Rect[] = [];
  let main: Rect;
  if (pw >= 300) {
    const h = ph - AD_LABEL - 4;
    banners.push({ x: px + 2, y: py + AD_LABEL + 2, w: SIDE_W, h });
    banners.push({ x: px + pw - SIDE_W - 2, y: py + AD_LABEL + 2, w: SIDE_W, h });
    main = { x: px + SIDE_W + 6, y: py, w: pw - 2 * SIDE_W - 12, h: ph };
  } else {
    banners.push({ x: px + 2, y: py + ph - 28, w: pw - 4, h: 26 });
    main = { x: px, y: py, w: pw, h: ph - 30 - AD_LABEL };
  }
  let fx = 3 + (bw >= 220 ? textWidth(FAV_LABEL) + 5 : 0);
  const favs = FAVS.map(([label, to]) => {
    const r = { x: fx, y: 22, w: textWidth(label) + 8, h: 9, label, page: to };
    fx += r.w + 2;
    return r;
  });
  return { tabs, tabW, banners, main, favs };
}

function back(w: Win): void {
  switch (page(w)) {
    case NEWS:
      if (w.s.story) nav(w, NEWS, { sec: w.s.sec ?? 0 });
      else nav(w, HOME);
      break;
    case MAIL:
      if (w.s.mail) nav(w, MAIL);
      else nav(w, HOME);
      break;
    case BANK:
      nav(w, SITE);
      break;
    case LUCKY: {
      const c = casinoOf(w);
      if (c.game >= 0 && !c.bonus) c.game = -1;
      else if (!c.bonus) nav(w, HOME);
      break;
    }
    case SITE:
      nav(w, w.s.from ?? HOME);
      break;
    default:
  }
}

const canBack = (w: Win) => page(w) !== HOME;

function address(w: Win, t: number): string {
  switch (page(w)) {
    case NEWS:
      return newsAddress(w);
    case MAIL:
      return mailAddress(w);
    case LUCKY:
      return casinoAddress(w);
    case SITE:
      return siteAddress(w);
    case BANK:
      return bankAddress(w, t);
    default:
      return "HTTP://WWW.EYEFIND.INFO/SEARCH?Q=HIRE+YKAPF";
  }
}

function tabTitle(w: Win, t: number): string {
  switch (page(w)) {
    case NEWS:
      return "NEWS";
    case MAIL:
      return `BMAIL - INBOX (${unread(w)})`;
    case LUCKY:
      return casinoTitle(w);
    case SITE:
      return siteTitle(w);
    case BANK:
      return bankTitle(w, t);
    default:
      return "EYEFIND";
  }
}

// ---- home (Eyefind) -----------------------------------------------------------

function homeLayout(M: Rect) {
  const cx = M.x + Math.round(M.w / 2);
  const logoY = M.y + Math.max(6, Math.min(24, Math.round(M.h * 0.08)));
  const searchY = logoY + 19;
  const sw = Math.min(150, M.w - 16);
  const tileW = Math.min(62, Math.floor((M.w - 16) / 3));
  const tilesY = searchY + 16;
  const tiles = FAVS.map(([label, to], i) => ({ x: Math.round(cx - (tileW * 3 + 8) / 2) + i * (tileW + 4), y: tilesY, w: tileW, h: TILE_H, label, page: to }));
  const left = Math.max(M.x + 5, cx - 72);
  const resultsY = tilesY + TILE_H + 8;
  const tickerY = M.y + M.h - TICKER_H - 2;
  const fit = Math.max(0, Math.min(RESULTS.length, Math.floor((tickerY - resultsY - 1) / 16)));
  return { cx, logoY, searchY, sw, tiles, left, resultsY, tickerY, fit };
}

function favIcon(g: Gfx, to: number, x: number, y: number, t: number): void {
  if (to === NEWS) {
    g.fill(x, y, 12, 9, C.white);
    g.frame(x, y, 12, 9, C.dark);
    g.fill(x + 2, y + 2, 8, 2, col(196, 22, 28));
    g.fill(x + 2, y + 5, 3, 2, C.shadow);
    g.fill(x + 6, y + 5, 4, 1, C.shadow);
    g.fill(x + 6, y + 7, 4, 1, C.shadow);
  } else if (to === LUCKY) {
    g.textO("7", x + 3, y - 1, blink(t, 2) ? C.gold : C.red, C.darkRed, 2);
  } else {
    g.fill(x, y + 1, 12, 8, C.white);
    g.frame(x, y + 1, 12, 8, C.dark);
    for (let i = 0; i < 5; i++) {
      g.px(x + 1 + i, y + 2 + i, C.red);
      g.px(x + 10 - i, y + 2 + i, C.red);
    }
  }
}

function drawHome(g: Gfx, t: number, M: Rect): void {
  const L = homeLayout(M);
  g.fill(M.x, M.y, M.w, M.h, C.white);
  const logoX = Math.round(L.cx - (textWidth("EYEFIND") * 3) / 2);
  for (let i = 0; i < 7; i++) g.text("EYEFIND"[i], logoX + i * 12, L.logoY, LOGO_COLOURS[i], 3);
  const fieldW = L.sw - 36;
  const fx = Math.round(L.cx - L.sw / 2);
  g.bevel(fx, L.searchY, fieldW, 11, false, C.white);
  const phrase = "HIRE YKAPF";
  const typed = Math.min(phrase.length, Math.max(0, Math.floor((t * 5) % 24) - 2));
  g.text(phrase.slice(0, typed), fx + 3, L.searchY + 3, C.black);
  if (blink(t, 2)) g.fill(fx + 3 + typed * 4, L.searchY + 2, 1, 7, C.black);
  g.bevel(fx + fieldW + 2, L.searchY, 34, 11);
  g.textC("SEARCH", fx + fieldW + 19, L.searchY + 3, C.black);

  for (let i = 0; i < L.tiles.length; i++) {
    const r = L.tiles[i];
    g.bevel(r.x, r.y, r.w, r.h, true, col(236, 240, 250));
    favIcon(g, r.page, Math.round(r.x + r.w / 2 - 6), r.y + 3, t);
    g.textC(truncate(r.label.replace("I'M ", ""), r.w - 4), r.x + r.w / 2, r.y + 15, r.page === MAIL ? C.red : C.navy);
  }

  for (let i = 0; i < L.fit; i++) {
    const [title, url] = RESULTS[i];
    const y = L.resultsY + i * 16;
    g.text(truncate(title, M.x + M.w - L.left - 2), L.left, y, C.link);
    g.fill(L.left, y + 6, Math.min(textWidth(title), M.x + M.w - L.left - 2), 1, C.link);
    g.text(truncate(url, M.x + M.w - L.left - 2), L.left, y + 8, col(0, 128, 0));
  }
  ticker(g, M.x + 2, L.tickerY, M.w - 4, t);
}

function homeButtons(M: Rect): Btn[] {
  const L = homeLayout(M);
  const fx = Math.round(L.cx - L.sw / 2);
  const out: Btn[] = [{ x: fx + L.sw - 34, y: L.searchY, w: 34, h: 11, act: (ctx, w) => ctx.spawn("winner", w.x + 40, w.y + 50) }];
  for (let i = 0; i < L.tiles.length; i++) {
    const r = L.tiles[i];
    out.push({ x: r.x, y: r.y, w: r.w, h: r.h, act: (_, w) => nav(w, r.page) });
  }
  for (let i = 0; i < L.fit; i++) {
    const target = RESULTS[i][2];
    out.push({
      x: L.left,
      y: L.resultsY + i * 16,
      w: textWidth(RESULTS[i][0]),
      h: 14,
      act: (ctx) => (target.charAt(0) === "/" ? ctx.go(target) : ctx.open(target)),
    });
  }
  out.push({ x: M.x + 2, y: L.tickerY, w: M.w - 4, h: TICKER_H, act: (_, w) => nav(w, NEWS) });
  return out;
}

// ---- banner ads ------------------------------------------------------------------

const adIndex = (w: Win, slot: number, t: number) => (Math.floor(t / AD_ROTATE_S) + (w.s.ad ?? 0) + slot * 2) % ADS.length;

function drawBanners(g: Gfx, w: Win, t: number, banners: Rect[]): void {
  for (let i = 0; i < banners.length; i++) {
    const r = banners[i];
    const ad = ADS[adIndex(w, i, t)];
    g.text("ADVERTISEMENT", r.x + Math.round((r.w - textWidth("ADVERTISEMENT")) / 2), r.y - AD_LABEL + 1, C.shadow);
    g.region(r.x, r.y, r.w, r.h, () => (r.h > 40 ? drawTallAd(g, ad, r.w, r.h, t) : drawWideAd(g, ad, r.w, r.h, t)));
  }
}

function bannerButtons(banners: Rect[]): Btn[] {
  return banners.map((r, i) => ({
    ...r,
    act: (ctx, win) => {
      const idx = adIndex(win, i, ctx.t);
      const ad = ADS[idx];
      if (ad.link) ctx.open(ad.link);
      else if (!(page(win) === SITE && win.s.site === idx + 1)) nav(win, SITE, { site: idx + 1, from: page(win) === SITE ? win.s.from ?? HOME : page(win) });
    },
  }));
}

// ---- window ----------------------------------------------------------------------

export const BROWSER: PopupDef = {
  w: 360,
  h: 220,
  title: "INTERNET EXPLODER",
  single: true,
  body(g, win, t, bw, bh) {
    const L = layout(bw, bh);
    g.fill(0, 0, bw, bh, C.face);
    for (let i = 0; i < L.tabs; i++) {
      const x = 1 + i * L.tabW;
      const active = (win.s.tab ?? 0) === i;
      g.bevel(x, active ? 0 : 1, L.tabW - 1, active ? 10 : 9, true, active ? C.light : C.face);
      g.text(truncate(i ? TABS[i] : tabTitle(win, t), L.tabW - 7), x + 3, active ? 3 : 4, C.black);
    }
    g.bevel(1 + L.tabs * L.tabW, 1, 10, 9);
    g.text("+", 4 + L.tabs * L.tabW, 3, C.black);

    g.bevel(1, 11, 9, 9);
    g.text("<", 4, 13, canBack(win) ? C.black : C.shadow);
    g.bevel(11, 11, 9, 9);
    g.text(">", 14, 13, C.shadow);
    g.bevel(22, 11, bw - 23, 9, false, C.white);
    g.text(truncate(address(win, t), bw - 30), 25, 13, C.black);

    if (bw >= 220) g.text(FAV_LABEL, 3, 24, C.dark);
    for (let i = 0; i < L.favs.length; i++) {
      const f = L.favs[i];
      const on = page(win) === f.page;
      g.bevel(f.x, f.y, f.w, f.h, !on, on ? C.light : C.face);
      g.text(f.label, f.x + 4 + (on ? 1 : 0), f.y + 2, f.page === MAIL ? C.red : C.navy);
    }

    g.bevel(0, PAGE_Y, bw, bh - PAGE_Y, false, C.white);
    drawBanners(g, win, t, L.banners);
    const M = L.main;
    g.region(M.x, M.y, M.w, M.h, () => g.region(-M.x, -M.y, M.x + M.w, M.y + M.h, () => {
      switch (page(win)) {
        case NEWS:
          drawNews(g, win, t, M);
          break;
        case MAIL:
          drawMail(g, win, t, M);
          break;
        case LUCKY:
          drawCasino(g, win, t, M);
          break;
        case SITE:
          drawSite(g, win, t, M);
          break;
        case BANK:
          drawBank(g, win, t, M);
          break;
        default:
          drawHome(g, t, M);
      }
    }));
  },
  scroll(win, t, bw, bh) {
    const M = layout(bw, bh).main;
    switch (page(win)) {
      case NEWS:
        return newsScroll(win, M);
      case MAIL:
        return mailScroll(win, M);
      case SITE:
        return siteScroll(win, M);
      case BANK:
        return bankScroll(win, M, t);
      default:
        return null;
    }
  },
  buttons(win, t, bw, bh) {
    const L = layout(bw, bh);
    const out: Btn[] = [];
    for (let i = 0; i < L.tabs; i++) {
      const tab = i;
      out.push({
        x: 1 + i * L.tabW,
        y: 0,
        w: L.tabW - 1,
        h: 10,
        act: (ctx, w) => {
          w.s.tab = tab;
          if (TABS[tab] === "YKAPF - GITHUB") ctx.open(GITHUB_URL);
        },
      });
    }
    out.push({ x: 1, y: 11, w: 9, h: 9, act: (_, w) => back(w) });
    for (let i = 0; i < L.favs.length; i++) {
      const f = L.favs[i];
      out.push({ x: f.x, y: f.y, w: f.w, h: f.h, act: (_, w) => nav(w, f.page) });
    }
    out.push(...bannerButtons(L.banners));
    const M = L.main;
    switch (page(win)) {
      case NEWS:
        return out.concat(newsButtons(win, M));
      case MAIL:
        return out.concat(mailButtons(win, M));
      case LUCKY:
        return out.concat(casinoButtons(win, M));
      case SITE:
        return out.concat(siteButtons(win, M, back));
      case BANK:
        return out.concat(bankButtons(win, M, t));
      default:
        return out.concat(homeButtons(M));
    }
  },
};
