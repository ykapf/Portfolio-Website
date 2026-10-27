"use client";
import React, { useEffect, useRef, useState } from "react";

/** GTA V in-game browser pointer (cursor.cc #79628), pixel for pixel, including its baked-in shadow. */
const IDLE = [
  "...........kkk.............",
  "..........kwwwks...........",
  "..........kwwwkss..........",
  "..........kwwwksss.........",
  "..........kwwwksss.........",
  "..........kwwwksss.........",
  "..........kwwwksss.........",
  "..........kwwwksss.........",
  "..........kwwwksss.........",
  ".......kkkkwwwkkkk.........",
  "......kwwwkwwwkwwwk........",
  "......kwwwkwwwkwwwkgk......",
  "......kwwwkwwwkwwwkwwks....",
  ".kkkk.kwwwkwwwkwwwkwwwks...",
  ".kwwwkkwwwwwwwwwwwkwwwkss..",
  ".kwwwkkwwwwwwwwwwwkwwwksss.",
  ".kwwwwkwwwwwwwwwwwwwwwksss.",
  "..kwwwkwwwwwwwwwwwwwwwksss.",
  "...kwwkwwwwwwwwwwwwwwwksss.",
  "...kwwkwwwwwwwwwwwwwwwksss.",
  "....kwwwwwwwwwwwwwwwwwksss.",
  "....skwwwwwwwwwwwwwwwwksss.",
  ".....kwwwwwwwwwwwwwwwkssss.",
  ".....kwwwwwwwwwwwwwwwkssss.",
  "......kwwwwwwwwwwwwwwksss..",
  "......kwwwwwwwwwwwwwwksss..",
  ".......kwwwwwwwwwwwwgssss..",
  ".......kwwwwwwwwwwwwkssss..",
  ".......kwwwwwwwwwwwwksss...",
  ".......kwwwwwwwwwwwwksss...",
  ".......kkkkkkkkkkkkkksss...",
];

/** Click frame: the finger taps down three pixels and a little burst pops off the tip. */
const PRESSED_BASE = [
  "........p..p..p............",
  ".........p.p.p.............",
  "...........................",
  IDLE[0],
  ...IDLE.slice(4),
];

const SHAPE = "kwg";

/** Grows the black outline outward by one pixel (pads the grid by one on every side). */
function thicken(rows: string[]): string[] {
  const w = rows[0].length + 2;
  const blank = ".".repeat(w);
  const grid = [blank, ...rows.map((r) => `.${r}.`), blank];
  const inShape = (x: number, y: number) => y >= 0 && y < grid.length && x >= 0 && x < w && SHAPE.includes(grid[y][x]);
  return grid.map((row, y) =>
    Array.from(row, (c, x) => {
      if (SHAPE.includes(c)) return c;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (inShape(x + dx, y + dy)) return "k";
      return c;
    }).join(""),
  );
}

const IDLE_THICK = thicken(IDLE);
const PRESSED_THICK = thicken(PRESSED_BASE);

const PX = 1;
const COLS = IDLE_THICK[0].length;
const ROWS = IDLE_THICK.length;
const HOT_X = 13;
const HOT_Y = 0;
const COLOURS: Record<string, string> = {
  k: "#000000",
  w: "#ffffff",
  g: "#1c1c1c",
  s: "rgba(0, 0, 0, 0.4)",
  p: "#ff92cf",
};
const ENABLED_QUERY = "(pointer: fine) and (min-width: 768px)";

function toPaths(rows: string[]) {
  const d: Record<string, string> = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c in COLOURS) d[c] = (d[c] ?? "") + `M${x} ${y}h1v1h-1z`;
    }
  });
  return Object.keys(d).map((c) => ({ fill: COLOURS[c], d: d[c] }));
}

const IDLE_PATHS = toPaths(IDLE_THICK);
const PRESSED_PATHS = toPaths(PRESSED_THICK);

function Hand({ paths, hidden }: { paths: { fill: string; d: string }[]; hidden: boolean }) {
  return (
    <svg
      width={COLS * PX}
      height={ROWS * PX}
      viewBox={`0 0 ${COLS} ${ROWS}`}
      shapeRendering="crispEdges"
      className="absolute left-0 top-0"
      style={{ visibility: hidden ? "hidden" : "visible" }}
    >
      {paths.map((p) => (
        <path key={p.fill} fill={p.fill} d={p.d} />
      ))}
    </svg>
  );
}

export default function CustomCursor() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(ENABLED_QUERY);
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("custom-cursor-on");
    let releaseTimer = 0;
    let pressedAt = 0;

    const move = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el) el.style.transform = `translate3d(${e.clientX - HOT_X * PX}px, ${e.clientY - HOT_Y * PX}px, 0)`;
      setVisible(true);
    };
    const leave = () => setVisible(false);
    const down = () => {
      window.clearTimeout(releaseTimer);
      pressedAt = performance.now();
      setPressed(true);
    };
    // Hold the click frame briefly so even a fast click reads.
    const up = () => {
      const wait = Math.max(0, 110 - (performance.now() - pressedAt));
      releaseTimer = window.setTimeout(() => setPressed(false), wait);
    };

    document.addEventListener("mousemove", move);
    document.documentElement.addEventListener("mouseleave", leave);
    document.addEventListener("mousedown", down);
    document.addEventListener("mouseup", up);
    window.addEventListener("blur", leave);
    return () => {
      document.documentElement.classList.remove("custom-cursor-on");
      window.clearTimeout(releaseTimer);
      document.removeEventListener("mousemove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("mouseup", up);
      window.removeEventListener("blur", leave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      style={{ visibility: visible ? "visible" : "hidden" }}
    >
      <div className="relative" style={{ width: COLS * PX, height: ROWS * PX }}>
        <Hand paths={IDLE_PATHS} hidden={pressed} />
        <Hand paths={PRESSED_PATHS} hidden={!pressed} />
      </div>
    </div>
  );
}
