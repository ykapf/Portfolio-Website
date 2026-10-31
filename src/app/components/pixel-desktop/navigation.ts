import type { Win } from "./popups";

export const HOME = 0;
export const NEWS = 1;
export const MAIL = 2;
export const LUCKY = 3;
export const SITE = 4;
export const BANK = 5;

export const page = (w: Win) => w.s.page ?? HOME;

export function nav(w: Win, to: number, extra: Record<string, number> = {}): void {
  w.s.page = to;
  w.s.story = 0;
  w.s.mail = 0;
  w.s.sc = 0;
  w.s.tab = 0;
  Object.assign(w.s, extra);
}
