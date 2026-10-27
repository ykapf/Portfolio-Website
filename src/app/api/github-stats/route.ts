import { NextResponse } from "next/server";

const USER = "ykapf";
const REVALIDATE = 600;
const RECENT_DAYS = 28;
const HEADERS = { "User-Agent": "ykapf-portfolio", Accept: "text/html,application/json" };

export interface GithubStats {
  user: string;
  today: string;
  todayCount: number;
  currentStreak: number;
  longestStreak: number;
  lastYear: number;
  lastWeek: number;
  bestDay: number;
  activeDays: number;
  recent: number[];
  repos: number | null;
  followers: number | null;
  updatedAt: string;
}

/** Day counts from a contributions calendar page, keyed by YYYY-MM-DD. */
function parseCalendar(html: string): Map<string, number> {
  const idToDate = new Map<string, string>();
  for (const td of html.match(/<td[^>]*data-date="[^"]+"[^>]*>/g) ?? []) {
    const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(td)?.[1];
    const id = /\bid="([^"]+)"/.exec(td)?.[1];
    if (date && id) idToDate.set(id, date);
  }
  const days = new Map<string, number>();
  idToDate.forEach((date) => days.set(date, 0));
  const tip = /<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  let m: RegExpExecArray | null;
  while ((m = tip.exec(html))) {
    const date = idToDate.get(m[1]);
    const n = /^\s*([\d,]+)\s+contribution/.exec(m[2]);
    if (date) days.set(date, n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  return days;
}

async function fetchCalendar(query = ""): Promise<Map<string, number>> {
  const res = await fetch(`https://github.com/users/${USER}/contributions${query}`, {
    headers: HEADERS,
    next: { revalidate: REVALIDATE },
  });
  if (!res.ok) throw new Error(`contributions ${res.status}`);
  return parseCalendar(await res.text());
}

const DAY_MS = 86_400_000;
const toKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const toMs = (key: string) => Date.parse(`${key}T00:00:00Z`);

export async function GET() {
  try {
    const [rolling, profile] = await Promise.all([
      fetchCalendar(),
      fetch(`https://api.github.com/users/${USER}`, { headers: HEADERS, next: { revalidate: REVALIDATE } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const dates = Array.from(rolling.keys()).sort();
    if (dates.length === 0) throw new Error("empty calendar");
    const today = dates[dates.length - 1];
    const todayMs = toMs(today);
    const thisYear = Number(today.slice(0, 4));
    const firstYear = profile?.created_at ? Number(String(profile.created_at).slice(0, 4)) : thisYear - 1;

    const years: number[] = [];
    for (let y = firstYear; y <= thisYear; y++) years.push(y);
    const yearly = await Promise.all(
      years.map((y) => fetchCalendar(`?from=${y}-01-01&to=${y}-12-31`).catch(() => new Map<string, number>())),
    );

    const all = new Map<string, number>();
    for (const cal of yearly.concat([rolling])) {
      cal.forEach((n, d) => {
        if (d <= today) all.set(d, Math.max(n, all.get(d) ?? 0));
      });
    }
    const count = (ms: number) => all.get(toKey(ms)) ?? 0;

    let currentStreak = 0;
    let cursor = count(todayMs) > 0 ? todayMs : todayMs - DAY_MS;
    while (count(cursor) > 0) {
      currentStreak++;
      cursor -= DAY_MS;
    }

    const sorted = Array.from(all.keys()).sort();
    let longestStreak = 0;
    let run = 0;
    let prev = -Infinity;
    let bestDay = 0;
    for (const d of sorted) {
      const n = all.get(d) ?? 0;
      const ms = toMs(d);
      bestDay = Math.max(bestDay, n);
      run = n > 0 ? (ms - prev === DAY_MS ? run + 1 : 1) : 0;
      if (n > 0) prev = ms;
      longestStreak = Math.max(longestStreak, run);
    }

    let lastYear = 0;
    let activeDays = 0;
    for (let i = 0; i < 365; i++) {
      const n = count(todayMs - i * DAY_MS);
      lastYear += n;
      if (n > 0) activeDays++;
    }
    let lastWeek = 0;
    for (let i = 0; i < 7; i++) lastWeek += count(todayMs - i * DAY_MS);
    const recent: number[] = [];
    for (let i = RECENT_DAYS - 1; i >= 0; i--) recent.push(count(todayMs - i * DAY_MS));

    const stats: GithubStats = {
      user: USER,
      today,
      todayCount: count(todayMs),
      currentStreak,
      longestStreak,
      lastYear,
      lastWeek,
      bestDay,
      activeDays,
      recent,
      repos: typeof profile?.public_repos === "number" ? profile.public_repos : null,
      followers: typeof profile?.followers === "number" ? profile.followers : null,
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(stats, {
      headers: { "Cache-Control": `public, s-maxage=${REVALIDATE}, stale-while-revalidate=${REVALIDATE * 6}` },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
