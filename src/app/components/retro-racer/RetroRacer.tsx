"use client";

import { MutableRefObject, useEffect, useRef } from "react";
import { H, W } from "./config";
import { createRacer } from "./engine";

export interface RetroRacerProps {
  className?: string;
  /** Playback-rate multiplier for the whole 20s loop. */
  speed?: number;
  enableBoost?: boolean;
  showHUD?: boolean;
  animationEnabled?: boolean;
  /** Receives the racer's playback time (seconds) so overlays can follow the drive. */
  clockRef?: MutableRefObject<number>;
}

/** Autonomous OutRun-style pseudo-3D drive, rendered at 480×270 and upscaled with crisp pixels. */
export default function RetroRacer({
  className = "",
  speed = 1,
  enableBoost = true,
  showHUD = false,
  animationEnabled = true,
  clockRef,
}: RetroRacerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ownClock = useRef(0);
  const timeRef = clockRef ?? ownClock;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const racer = createRacer(canvas, { enableBoost, showHUD });
    if (!racer) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = 0;
    let running = false;
    let onScreen = true;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      timeRef.current += dt * speed;
      racer.render(timeRef.current);
      raf = requestAnimationFrame(tick);
    };

    const sync = () => {
      const shouldRun = animationEnabled && !reduceMotion.matches && onScreen && !document.hidden;
      if (shouldRun && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldRun && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };

    racer.render(timeRef.current);

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
    };
  }, [speed, enableBoost, showHUD, animationEnabled, timeRef]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      role="img"
      aria-label="Pixel-art Ferrari F40 driving down a Miami coastal highway at sunset"
      className={`retro-racer-canvas ${className}`}
    />
  );
}
