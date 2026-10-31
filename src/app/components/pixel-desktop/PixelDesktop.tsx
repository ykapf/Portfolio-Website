"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { createDesktop } from "./desktop";
import { GITHUB_URL, LINKEDIN_URL } from "./popups";

/** Roughly how many native pixels span the longer screen edge, matching the racer's density. */
const TARGET_SPAN = 480;
const FPS = 30;
/** Stopping within this many CSS px of the section's top or bottom edge snaps it fully on screen. */
const SNAP_PX = 50;
const SNAP_IDLE_MS = 140;
/** A tap the desktop claimed from the browser fires no native click, so we click for it and ignore any stray one. */
const SYNTHETIC_CLICK_MS = 600;

/** Second pixel section: a "YKAPF 95" desktop buried under parody pop-ups. */
export default function PixelDesktop({ id = "pixel-desktop" }: { id?: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const desk = createDesktop(canvas, {
      open: (url) => window.open(url, "_blank", "noopener,noreferrer"),
      go: (path) => router.push(path),
    });
    if (!desk) return;

    let W = 0;
    let H = 0;
    let clock = 0;
    let raf = 0;
    let last = 0;
    let lastDraw = 0;
    let running = false;
    let onScreen = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const fit = () => {
      const { width, height } = section.getBoundingClientRect();
      if (!width || !height) return;
      const p = Math.max(2, Math.round(Math.max(width, height) / TARGET_SPAN));
      W = Math.ceil(width / p);
      H = Math.ceil(height / p);
      desk.resize(W, H);
      desk.render(clock);
    };

    const tick = (now: number) => {
      clock += Math.min(0.1, (now - last) / 1000);
      last = now;
      const fps = reduceMotion.matches ? 4 : FPS;
      if (now - lastDraw >= 1000 / fps - 1) {
        lastDraw = now;
        desk.render(clock);
      }
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      const shouldRun = onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    const toNative = (e: { clientX: number; clientY: number }): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [Math.floor(((e.clientX - r.left) / r.width) * W), Math.floor(((e.clientY - r.top) / r.height) * H)];
    };
    const redraw = () => desk.render(clock);

    let touchOwned = false;
    let syntheticAt = 0;

    const down = (e: PointerEvent) => {
      const [x, y] = toNative(e);
      if (desk.pointerDown(x, y, e.pointerType === "touch")) canvas.setPointerCapture(e.pointerId);
      redraw();
    };
    const move = (e: PointerEvent) => {
      const [x, y] = toNative(e);
      desk.pointerMove(x, y);
      if (!document.documentElement.classList.contains("custom-cursor-on")) {
        canvas.style.cursor = desk.clickable(x, y) ? "pointer" : "default";
      }
    };
    const up = (e: PointerEvent) => {
      desk.pointerUp();
      if (e.type === "pointerup" && e.pointerType === "touch" && touchOwned) {
        const [x, y] = toNative(e);
        syntheticAt = performance.now();
        desk.click(x, y);
      }
      touchOwned = false;
      redraw();
    };
    const leave = () => desk.pointerLeave();
    const click = (e: MouseEvent) => {
      if (performance.now() - syntheticAt < SYNTHETIC_CLICK_MS) return;
      const [x, y] = toNative(e);
      desk.click(x, y);
      redraw();
    };
    /** Claims touches that scroll a page or drag a window, so the website doesn't scroll instead. */
    const touchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t || e.touches.length > 1) return;
      const [x, y] = toNative(t);
      touchOwned = desk.ownsTouch(x, y);
      if (touchOwned) e.preventDefault();
    };
    const wheel = (e: WheelEvent) => {
      const [x, y] = toNative(e);
      const r = canvas.getBoundingClientRect();
      const cssPerNative = r.height / H;
      const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      if (desk.wheel(x, y, (e.deltaY * lines) / cssPerNative)) {
        e.preventDefault();
        redraw();
      }
    };

    let snapTimer = 0;
    const snap = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      let delta = 0;
      if (Math.abs(r.top) > 1 && Math.abs(r.top) <= SNAP_PX) delta = r.top;
      else if (Math.abs(r.bottom - vh) > 1 && Math.abs(r.bottom - vh) <= SNAP_PX) delta = r.bottom - vh;
      if (delta) window.scrollTo({ top: window.scrollY + delta, behavior: reduceMotion.matches ? "auto" : "smooth" });
    };
    const scrolled = () => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(snap, SNAP_IDLE_MS);
    };
    const key = (e: KeyboardEvent) => {
      if (!onScreen || e.repeat) return;
      desk.key(e.key);
      redraw();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(section);
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(section);
    fit();

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("pointerleave", leave);
    canvas.addEventListener("click", click);
    canvas.addEventListener("touchstart", touchStart, { passive: false });
    canvas.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("keydown", key);
    window.addEventListener("scroll", scrolled, { passive: true });
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(snapTimer);
      canvas.removeEventListener("touchstart", touchStart);
      canvas.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", scrolled);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", click);
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [router]);

  return (
    <section ref={sectionRef} id={id} aria-label="YKAPF 95 desktop" className="relative h-[100svh] w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-pan-y select-none"
        style={{ imageRendering: "pixelated" }}
        aria-hidden="true"
      />
      <nav className="sr-only" aria-label="Desktop shortcuts">
        <a href="/projects/media">Media</a>
        <a href="/projects/radio">GTA V Radio</a>
        <a href={GITHUB_URL}>GitHub</a>
        <a href={LINKEDIN_URL}>LinkedIn</a>
      </nav>
    </section>
  );
}
