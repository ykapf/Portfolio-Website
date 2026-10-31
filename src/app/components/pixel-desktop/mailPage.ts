import { EMAILS, MY_ADDRESS } from "./bmail";
import { C, col, Gfx, textWidth, truncate, wrap } from "./gfx";
import { Block, docScroll, drawDoc, footer, footerRow, footerY, layoutDoc, Rect, Row, Scroll, scrollArea, scrolled, scrolledButtons } from "./pagekit";
import type { Btn, Win } from "./popups";
import { MAIL, nav } from "./navigation";
import { button } from "./ui";

const BMAIL_COLOURS = [C.red, C.blue, C.gold, C.green, C.red];
const MAIL_BAR = col(232, 238, 250);
const MAIL_ROW = 16;

export const unread = (w: Win) => EMAILS.filter((_, i) => !w.s[`r${i}`]).length;

export function openMail(w: Win, i: number): void {
  nav(w, MAIL, { mail: i + 1 });
  w.s[`r${i}`] = 1;
}

const toInbox = (_: unknown, win: Win) => nav(win, MAIL);

export const mailAddress = (w: Win) => (w.s.mail ? `HTTPS://MAIL.BMAIL.COM/INBOX/${w.s.mail}` : "HTTPS://MAIL.BMAIL.COM/INBOX");

function listScroll(M: Rect): Scroll {
  const top = M.y + 24;
  return { area: scrollArea(M.x, top, M.w, M.y + M.h - top - 1), content: EMAILS.length * MAIL_ROW + 2, key: "mls" };
}

const docCache = new Map<string, Row[]>();

function mailDoc(i: number, w: number): Row[] {
  const key = `${i}:${w}`;
  const hit = docCache.get(key);
  if (hit) return hit;
  const e = EMAILS[i];
  const blocks: Block[] = [
    { text: e.subject, c: C.navy },
    { text: `FROM: ${e.from} <${e.address}>\nTO: ${MY_ADDRESS}\nSENT: ${e.time}`, c: C.shadow },
    ...e.body,
  ];
  if (e.attachment) blocks.push({ photo: e.attachment.photo, caption: `ATTACHMENT: ${e.attachment.file}` });
  const rows = layoutDoc(blocks, w);
  docCache.set(key, rows);
  return rows;
}

function readGeometry(w: Win, M: Rect) {
  const i = w.s.mail - 1;
  const e = EMAILS[i];
  const top = M.y + 24 + 15;
  const done = !!w.s[`a${i}`] && !!e.result;
  const resultLines = done ? wrap(e.result as string, M.w - 10) : [];
  const bottom = footerY(M) - 2 - (done ? resultLines.length * 7 + 5 : 0);
  const area = scrollArea(M.x + 3, top, M.w - 4, bottom - top);
  const rows = mailDoc(i, area.w - 2);
  return { i, e, done, resultLines, rows, s: docScroll(rows, area) };
}

export const mailScroll = (w: Win, M: Rect): Scroll => (w.s.mail ? readGeometry(w, M).s : listScroll(M));

export function drawMail(g: Gfx, w: Win, t: number, M: Rect): void {
  g.fill(M.x, M.y, M.w, M.h, C.white);
  for (let i = 0; i < 5; i++) g.text("BMAIL"[i], M.x + 4 + i * 8, M.y + 2, BMAIL_COLOURS[i], 2);
  if (48 + textWidth(MY_ADDRESS) + 8 < M.w) g.text(MY_ADDRESS, M.x + M.w - textWidth(MY_ADDRESS) - 4, M.y + 5, C.shadow);
  g.fill(M.x, M.y + 14, M.w, 9, MAIL_BAR);
  g.fill(M.x, M.y + 23, M.w, 1, C.light);
  g.text(truncate(`INBOX (${unread(w)})   SENT   SPAM (99+)`, M.w - 8), M.x + 4, M.y + 16, C.navy);
  if (w.s.mail) {
    footer(g, M);
    const G = readGeometry(w, M);
    g.fill(M.x, G.s.area.y - 2, M.w, 1, C.light);
    drawDoc(g, w, G.rows, G.s, C.black, t);
    if (G.done) {
      const h = G.resultLines.length * 7 + 3;
      const ry = footerY(M) - h - 1;
      g.fill(M.x + 2, ry, M.w - 4, h, C.yellow);
      for (let i = 0; i < G.resultLines.length; i++) g.text(G.resultLines[i], M.x + 5, ry + 2 + i * 7, C.darkRed);
    }
    return;
  }

  const S = listScroll(M);
  const W = S.area.w;
  scrolled(g, w, S, (pos) => {
    for (let i = 0; i < EMAILS.length; i++) {
      const e = EMAILS[i];
      const y = i * MAIL_ROW;
      if (y + MAIL_ROW < pos || y > pos + S.area.h) continue;
      const fresh = !w.s[`r${i}`];
      if (fresh) {
        g.fill(1, y + 1, W - 2, MAIL_ROW - 2, col(246, 248, 255));
        g.fill(3, y + 3, 2, 2, C.blue);
      }
      const clip = e.attachment ? " +1 FILE" : "";
      g.text(truncate(e.from, W - 14 - textWidth(e.time) - 4), 8, y + 2, fresh ? C.black : C.dark);
      g.text(e.time, W - textWidth(e.time) - 3, y + 2, fresh ? C.navy : C.shadow);
      g.text(truncate(e.subject, W - 12 - textWidth(clip)), 8, y + 9, fresh ? C.navy : C.shadow);
      if (clip) g.text(clip, W - textWidth(clip) - 3, y + 9, C.shadow);
      g.fill(4, y + MAIL_ROW - 1, W - 6, 1, C.light);
    }
  });
}

export function mailButtons(w: Win, M: Rect): Btn[] {
  if (w.s.mail) {
    const G = readGeometry(w, M);
    const out: Btn[] = [button("< BACK TO INBOX", M.x + 3, M.y + 25, toInbox)];
    const row: Btn[] = [button("< INBOX", 0, 0, toInbox)];
    if (G.e.action && !G.done) {
      row.push(
        button(G.e.action, 0, 0, (_, win) => {
          win.s[`a${G.i}`] = 1;
        }),
      );
    }
    return out.concat(footerRow(M, row));
  }
  const S = listScroll(M);
  return scrolledButtons(
    w,
    S,
    EMAILS.map((_, i) => ({ x: 0, y: i * MAIL_ROW, w: S.area.w, h: MAIL_ROW - 1, act: (__, win) => openMail(win, i) })),
  );
}
