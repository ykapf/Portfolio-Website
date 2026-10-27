"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { textWidth } from "./retro-racer/font";
import { GOLD, METER_OFF, PINK, text } from "./retro-racer/hud";

/** Native canvas size; upscaled by a whole number to stay crisp. */
const NW = 192;
const NH = 108;
const SCALE = 2;

const LOADING_END = 1000;
const SELECT_AT = 1150;
const PICKED_AT = 2700;
const DONE_AT = 3700;
const FADE_MS = 450;

/** Loading bar keyframes `[ms, fill]`: quick bursts with short stalls, like a cartridge booting. */
const BAR: [number, number][] = [
  [80, 0],
  [300, 0.38],
  [420, 0.42],
  [620, 0.78],
  [760, 0.8],
  [LOADING_END, 1],
];

const WHITE = ["#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"];
const DIM = ["#6a4a85", "#6a4a85", "#5a3c74", "#5a3c74", "#4a2f62"];

/** Plays once per full page load; client-side navigation back home skips it. */
let played = false;
let finished = false;

/**
 * `<html>` classes gating the hero: `intro-scene` reveals the racer once the
 * intro covers or skips it, `intro-ui` reveals the HUD and radio after it ends.
 */
function reveal(...names: string[]) {
  document.documentElement.classList.add(...names);
}

function barFill(t: number) {
  if (t <= BAR[0][0]) return 0;
  for (let i = 1; i < BAR.length; i++) {
    const [t1, v1] = BAR[i];
    const [t0, v0] = BAR[i - 1];
    if (t <= t1) return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
  }
  return 1;
}

function drawFrame(ctx: CanvasRenderingContext2D, t: number) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, NW, NH);
  const cx = NW / 2;

  if (t < SELECT_AT) {
    const label = "LOADING";
    const w = textWidth(label) * SCALE;
    const left = Math.round(cx - w / 2);
    text(ctx, label, cx, 42, SCALE, PINK, "center");
    ctx.fillStyle = METER_OFF;
    ctx.fillRect(left, 58, w, 4);
    ctx.fillStyle = GOLD[1];
    ctx.fillRect(left, 58, Math.round(w * barFill(t)), 4);
    return;
  }

  text(ctx, "SELECT PLAYER", cx, 22, SCALE, PINK, "center");
  const picked = t >= PICKED_AT;
  const flash = picked && Math.floor((t - PICKED_AT) / 70) % 2 === 0;
  const p1 = "1P YKAPF";
  const p1Left = Math.round(cx - (textWidth(p1) * SCALE) / 2);
  const arrowOn = picked || Math.floor((t - SELECT_AT) / 160) % 2 === 0;
  if (arrowOn) text(ctx, ">", p1Left - 12, 52, SCALE, picked ? GOLD : PINK);
  text(ctx, p1, p1Left, 52, SCALE, flash ? WHITE : GOLD);
  text(ctx, "2P ------", p1Left, 70, SCALE, DIM);
}

/**
 * Fake arcade boot shown over the home page on load: a quick loading bar, then
 * a player-select screen that picks 1P YKAPF and fades into the hero.
 */
export default function IntroLoader() {
  const [phase, setPhase] = useState<"off" | "on" | "fading">("off");
  const [scale, setScale] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (played) {
      if (finished) reveal("intro-scene", "intro-ui");
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played = finished = true;
      reveal("intro-scene", "intro-ui");
      return;
    }
    played = true;
    setPhase("on");
  }, []);

  useLayoutEffect(() => {
    if (phase === "on") reveal("intro-scene");
  }, [phase]);

  useEffect(() => {
    if (phase === "off") return;
    const fit = () => setScale(Math.max(1, Math.floor(Math.min(window.innerWidth / NW, window.innerHeight / NH))));
    fit();
    window.addEventListener("resize", fit);
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      html.style.overflow = prevOverflow;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "on") return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const start = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - start;
      drawFrame(ctx, t);
      if (t >= DONE_AT) setPhase("fading");
      else raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const skip = () => setPhase("fading");
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const id = window.setTimeout(() => {
      finished = true;
      reveal("intro-ui");
      setPhase("off");
    }, FADE_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  if (phase === "off") return null;

  return createPortal(
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black transition-opacity ease-out"
      style={{ opacity: phase === "fading" ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <canvas ref={canvasRef} width={NW} height={NH} className="retro-racer-hud block" style={{ width: NW * scale, height: NH * scale }} />
    </div>,
    document.body,
  );
}
