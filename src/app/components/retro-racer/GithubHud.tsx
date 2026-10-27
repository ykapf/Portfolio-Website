"use client";

import { MutableRefObject, useEffect, useRef, useState } from "react";
import { H, W } from "./config";
import {
  HudStats,
  HudStatus,
  MOBILE_BOTTOM_H,
  MOBILE_TOP_H,
  drawHud,
  drawHudMobileBottom,
  drawHudMobileTop,
} from "./hud";
import { revsAt } from "./timeline";

const REFRESH_MS = 10 * 60 * 1000;
const BLINK_MS = 530;

type Feed = { stats: HudStats | null; status: HudStatus };

/** One fetch loop shared by every HUD instance on the page. */
const feed = {
  value: { stats: null, status: "loading" } as Feed,
  listeners: new Set<(f: Feed) => void>(),
  timer: 0,
};

function loadStats() {
  fetch("/api/github-stats")
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((stats: HudStats) => publish({ stats, status: "ready" }))
    .catch(() => {
      if (feed.value.status !== "ready") publish({ ...feed.value, status: "offline" });
    });
}

function publish(next: Feed) {
  feed.value = next;
  feed.listeners.forEach((l) => l(next));
}

function useGithubFeed(): Feed {
  const [value, setValue] = useState(feed.value);
  useEffect(() => {
    feed.listeners.add(setValue);
    setValue(feed.value);
    if (feed.listeners.size === 1) {
      loadStats();
      feed.timer = window.setInterval(loadStats, REFRESH_MS);
    }
    return () => {
      feed.listeners.delete(setValue);
      if (feed.listeners.size === 0) window.clearInterval(feed.timer);
    };
  }, []);
  return value;
}

function useBlink() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setOn((b) => !b), BLINK_MS);
    return () => window.clearInterval(id);
  }, []);
  return on;
}

type Variant = "overlay" | "top" | "bottom";

interface Size {
  w: number;
  h: number;
  left: number;
  top: number;
  cssW: number;
  cssH: number;
}

/** Overlay: covers the visible part of the racer, mirroring `.retro-racer-canvas`'s cover crop. */
function measureOverlay(pw: number, ph: number): Size {
  const scale = Math.max(pw / W, ph / H);
  const cssW = Math.min(pw, W * scale);
  const cssH = Math.min(ph, H * scale);
  return { w: Math.round(cssW / scale), h: Math.round(cssH / scale), left: (pw - cssW) / 2, top: (ph - cssH) / 2, cssW, cssH };
}

/** Portrait panels: full width at a fixed, readable pixel size. */
function measurePanel(pw: number, nativeH: number): Size {
  const scale = pw >= 600 ? 3 : 2;
  const w = Math.floor(pw / scale);
  return { w, h: nativeH, left: (pw - w * scale) / 2, top: 0, cssW: w * scale, cssH: nativeH * scale };
}

/**
 * Arcade HUD showing live GitHub stats. `overlay` sits on top of the racer (its
 * parent must be the racer's box); `top` and `bottom` are the portrait panels
 * stacked above and below the scene.
 */
export default function GithubHud({
  className = "",
  clockRef,
  variant = "overlay",
}: {
  className?: string;
  /** The racer's playback clock; drives the rev counter needle. */
  clockRef?: MutableRefObject<number>;
  variant?: Variant;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const { stats, status } = useGithubFeed();
  const blinkOn = useBlink();
  const panelH = variant === "top" ? MOBILE_TOP_H : MOBILE_BOTTOM_H;
  const [size, setSize] = useState<Size>(() =>
    variant === "overlay" ? { w: W, h: H, left: 0, top: 0, cssW: 0, cssH: 0 } : { w: 0, h: panelH, left: 0, top: 0, cssW: 0, cssH: 0 },
  );

  useEffect(() => {
    const host = variant === "overlay" ? canvasRef.current?.parentElement : boxRef.current;
    if (!host) return;
    const measure = () => {
      const pw = host.clientWidth;
      const ph = host.clientHeight;
      if (!pw) return;
      if (variant === "overlay") {
        if (ph) setSize(measureOverlay(pw, ph));
      } else {
        setSize(measurePanel(pw, panelH));
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [variant, panelH]);

  const latest = useRef({ size, stats, status, blinkOn });
  const dirty = useRef(true);
  useEffect(() => {
    latest.current = { size, stats, status, blinkOn };
    dirty.current = true;
  }, [size, stats, status, blinkOn]);

  // Redraws only when the inputs change or the rev needle moves a step; skipped while hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let lastRevs = -1;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!canvas.offsetParent) return;
      const revs = variant === "top" ? 0 : Math.round(revsAt(clockRef?.current ?? 0) * 200) / 200;
      if (!dirty.current && revs === lastRevs) return;
      const a = latest.current;
      if (a.size.w > 0) {
        if (variant === "overlay") drawHud(ctx, a.size.w, a.size.h, a.stats, a.status, a.blinkOn, revs);
        else if (variant === "top") drawHudMobileTop(ctx, a.size.w, a.stats, a.status, a.blinkOn);
        else drawHudMobileBottom(ctx, a.size.w, a.stats, revs);
      }
      dirty.current = false;
      lastRevs = revs;
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [clockRef, variant]);

  if (variant !== "overlay") {
    return (
      <div ref={boxRef} className={`relative w-full ${className}`} style={{ height: size.cssH || undefined }} aria-hidden="true">
        <canvas
          ref={canvasRef}
          width={Math.max(1, size.w)}
          height={size.h}
          className="retro-racer-hud pointer-events-none absolute"
          style={{ left: size.left, top: 0, width: size.cssW, height: size.cssH }}
        />
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        width={size.w}
        height={size.h}
        aria-hidden="true"
        className={`retro-racer-hud pointer-events-none absolute ${className}`}
        style={{ left: size.left, top: size.top, width: size.cssW || "100%", height: size.cssH || "100%" }}
      />
      {stats && (
        <p className="sr-only">
          GitHub stats for {stats.user}: {stats.currentStreak} day current streak, {stats.longestStreak} day longest
          streak, {stats.lastYear} contributions in the last year, {stats.lastWeek} this week.
        </p>
      )}
    </>
  );
}
