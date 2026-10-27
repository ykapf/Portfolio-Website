"use client";

import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATION, Slot, TRACKS, nextSlot, radioNow, slotAt, syncRadioClock } from "./nonStopPop";
import {
  BOX,
  EQ_BARS,
  MARQUEE_GAP,
  RADIO_H,
  RADIO_W,
  VOL,
  VOL_TRACK,
  drawPixelRadio,
  drawPixelVolume,
  eqLevels,
  marqueeOffset,
  pixelateIcon,
} from "./pixelRadio";
import { loadYouTubeApi } from "./youtubeApi";

const CREAM = "#f5f0e6";
const DRIFT_LIMIT_S = 2.5;
const DRIFT_CHECK_MS = 10_000;
const PIXEL_FPS = 15;
const MAX_SKIPS = 5;
const STATION_LABEL = STATION.name.toUpperCase();
const DEFAULT_VOLUME = 50;
const VOLUME_STEP = 5;
const VOLUME_CLOSE_MS = 1200;
/** Smooth volume panel and track widths in native px, centred inside the shared `VOL` box. */
const SMOOTH_VOL_W = 12;
const SMOOTH_TRACK_W = 4;
/** Touch devices leave loudness to the phone's own volume buttons. */
const FINE_POINTER_QUERY = "(pointer: fine)";

/** CSS px per native radio pixel; shared by both skins so everything lines up. */
function pixelSizeFor(width: number) {
  return width >= 1024 ? 3 : 2;
}

const box = (b: { x: number; y: number; w: number; h: number }, p: number) => ({
  left: b.x * p,
  top: b.y * p,
  width: b.w * p,
  height: b.h * p,
});

interface Current {
  track: number;
  startMs: number;
}

/**
 * Sticky "now playing" radio locked to the shared Non-Stop-Pop schedule. Inside
 * the hero (`heroId`) it renders as pixel art; below it the same widget is
 * smooth, and the hero's bottom edge wipes between the two as you scroll.
 */
export default function FloatingRadio({ heroId }: { heroId: string }) {
  const [mounted, setMounted] = useState(false);
  const [p, setP] = useState(3);
  const [track, setTrack] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muteHover, setMuteHover] = useState(false);
  const [finePointer, setFinePointer] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [volOpen, setVolOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const volRef = useRef<HTMLDivElement>(null);
  const volPixelRef = useRef<HTMLDivElement>(null);
  const volSmoothRef = useRef<HTMLDivElement>(null);
  const volCanvasRef = useRef<HTMLCanvasElement>(null);
  const volCloseTimer = useRef(0);
  const widgetRef = useRef<HTMLDivElement>(null);
  const pixelRef = useRef<HTMLDivElement>(null);
  const smoothRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const eqRefs = useRef<(HTMLDivElement | null)[]>([]);

  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const currentRef = useRef<Current | null>(null);
  const skipsRef = useRef(0);
  const iconRef = useRef<HTMLCanvasElement | null>(null);
  const live = useRef({ muted, playing, muteHover, p, volume, finePointer });
  live.current = { muted, playing, muteHover, p, volume, finePointer };

  useEffect(() => {
    setMounted(true);
    const resize = () => setP(pixelSizeFor(window.innerWidth));
    resize();
    window.addEventListener("resize", resize);
    const fine = window.matchMedia(FINE_POINTER_QUERY);
    const updateFine = () => setFinePointer(fine.matches);
    updateFine();
    fine.addEventListener("change", updateFine);
    return () => {
      window.removeEventListener("resize", resize);
      fine.removeEventListener("change", updateFine);
    };
  }, []);

  /** Desktop listens at the slider's level; touch devices play at full and defer to the hardware buttons. */
  const applyVolume = useCallback(() => {
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    const { finePointer: fine, volume: v } = live.current;
    player.setVolume(fine ? v : 100);
  }, []);

  useEffect(() => {
    if (!muted) applyVolume();
  }, [volume, finePointer, muted, applyVolume]);

  const openVolume = () => {
    window.clearTimeout(volCloseTimer.current);
    if (live.current.finePointer && !live.current.muted) setVolOpen(true);
  };
  const scheduleVolumeClose = () => {
    window.clearTimeout(volCloseTimer.current);
    volCloseTimer.current = window.setTimeout(() => setVolOpen(false), VOLUME_CLOSE_MS);
  };

  useEffect(() => {
    if (!volOpen) return;
    const outside = (e: PointerEvent) => {
      if (!widgetRef.current?.contains(e.target as Node)) setVolOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [volOpen]);

  useEffect(() => () => window.clearTimeout(volCloseTimer.current), []);

  useEffect(() => {
    const ctx = volCanvasRef.current?.getContext("2d");
    if (ctx) drawPixelVolume(ctx, volume, dragging);
  }, [volume, dragging, volOpen]);

  const volumeFromPointer = (clientY: number) => {
    const el = volRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + VOL_TRACK.y * p;
    const frac = 1 - (clientY - top) / (VOL_TRACK.h * p);
    setVolume(Math.round(Math.max(0, Math.min(1, frac)) * 100));
  };

  const onVolumeKey = (e: ReactKeyboardEvent) => {
    const delta: Record<string, number> = { ArrowUp: VOLUME_STEP, ArrowRight: VOLUME_STEP, ArrowDown: -VOLUME_STEP, ArrowLeft: -VOLUME_STEP };
    if (e.key in delta) setVolume((v) => Math.max(0, Math.min(100, v + delta[e.key])));
    else if (e.key === "Home") setVolume(0);
    else if (e.key === "End") setVolume(100);
    else if (e.key === "Escape") setVolOpen(false);
    else return;
    e.preventDefault();
  };

  const play = useCallback((slot: Slot) => {
    currentRef.current = { track: slot.track, startMs: slot.startMs };
    setTrack(slot.track);
    const player = playerRef.current;
    if (!player || !readyRef.current) return;
    player.loadVideoById({ videoId: TRACKS[slot.track].id, startSeconds: Math.max(0, slot.offset) });
    if (live.current.muted) player.mute();
  }, []);

  /** Re-seeks if this device has wandered from the broadcast clock. */
  const checkDrift = useCallback(() => {
    const player = playerRef.current;
    const cur = currentRef.current;
    if (!player || !readyRef.current || !cur) return;
    const expected = (radioNow() - cur.startMs) / 1000;
    const duration = TRACKS[cur.track].duration;
    if (expected >= duration) {
      play(slotAt(radioNow()));
      return;
    }
    const actual = player.getCurrentTime?.() ?? 0;
    if (Math.abs(actual - expected) > DRIFT_LIMIT_S) player.seekTo(Math.max(0, expected), true);
  }, [play]);

  useEffect(() => {
    let cancelled = false;
    const host = document.createElement("div");
    hostRef.current?.appendChild(host);
    const initial = slotAt(Date.now());
    currentRef.current = { track: initial.track, startMs: initial.startMs };
    setTrack(initial.track);

    Promise.all([loadYouTubeApi(), syncRadioClock()]).then(([YT]) => {
      if (cancelled) return;
      const slot = slotAt(radioNow());
      currentRef.current = { track: slot.track, startMs: slot.startMs };
      setTrack(slot.track);
      playerRef.current = new YT.Player(host, {
        width: 1,
        height: 1,
        videoId: TRACKS[slot.track].id,
        playerVars: {
          autoplay: 1,
          mute: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          rel: 0,
          start: Math.floor(slot.offset),
        },
        events: {
          onReady: (e: any) => {
            readyRef.current = true;
            if (live.current.muted) e.target.mute();
            else {
              e.target.unMute();
              applyVolume();
            }
            e.target.playVideo();
          },
          onStateChange: (e: any) => {
            if (e.data === YT.PlayerState.PLAYING) {
              skipsRef.current = 0;
              setPlaying(true);
              checkDrift();
            } else if (e.data === YT.PlayerState.ENDED) {
              setPlaying(false);
              const cur = currentRef.current;
              const now = slotAt(radioNow());
              // Listed durations are rounded, so a track can end just before its slot does.
              const sameSlot = cur && now.track === cur.track && Math.abs(now.startMs - cur.startMs) < 5000;
              play(sameSlot ? nextSlot(now) : now);
            } else if (e.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
            }
          },
          onError: () => {
            const cur = currentRef.current;
            if (!cur || skipsRef.current >= MAX_SKIPS) return;
            skipsRef.current += 1;
            const next = nextSlot({ track: cur.track, startMs: cur.startMs, offset: 0 });
            play({ ...next, offset: 0, startMs: radioNow() });
          },
        },
      });
    });

    const drift = window.setInterval(() => {
      if (!document.hidden) checkDrift();
    }, DRIFT_CHECK_MS);
    const onVisible = () => {
      if (!document.hidden) checkDrift();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(drift);
      document.removeEventListener("visibilitychange", onVisible);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      readyRef.current = false;
      host.remove();
    };
  }, [checkDrift, play, applyVolume]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        iconRef.current = pixelateIcon(img);
      } catch {
        iconRef.current = null;
      }
    };
    img.src = STATION.icon;
  }, []);

  const toggleMute = () => {
    const player = playerRef.current;
    if (muted) {
      setMuted(false);
      live.current.muted = false;
      if (finePointer) {
        window.clearTimeout(volCloseTimer.current);
        setVolOpen(true);
      }
      if (player && readyRef.current) {
        player.unMute();
        applyVolume();
        if (player.getPlayerState() !== window.YT?.PlayerState?.PLAYING) {
          const cur = currentRef.current;
          if (cur) player.seekTo(Math.max(0, (radioNow() - cur.startMs) / 1000), true);
          player.playVideo();
        } else {
          checkDrift();
        }
      }
    } else {
      setMuted(true);
      setVolOpen(false);
      player?.mute?.();
    }
  };

  // One loop drives the seam, the pixel skin, and the smooth skin's live bits.
  useEffect(() => {
    if (!mounted) return;
    let raf = 0;
    let lastPixel = 0;
    const frame = (now: number) => {
      const { p: px, muted: m, playing: pl, muteHover: mh } = live.current;
      const widget = widgetRef.current;
      const hero = document.getElementById(heroId);
      const height = RADIO_H * px;
      let seam = 0;
      if (widget && hero) {
        const raw = hero.getBoundingClientRect().bottom - widget.getBoundingClientRect().top;
        seam = Math.max(0, Math.min(height, Math.round(raw / px) * px));
      }
      const vol = volRef.current;
      if (vol && hero) {
        const vh = VOL.h * px;
        const raw = hero.getBoundingClientRect().bottom - vol.getBoundingClientRect().top;
        const vs = Math.max(0, Math.min(vh, Math.round(raw / px) * px));
        if (volPixelRef.current) volPixelRef.current.style.clipPath = `inset(0 0 ${vh - vs}px 0)`;
        if (volSmoothRef.current) volSmoothRef.current.style.clipPath = `inset(${vs}px 0 0 0)`;
      }
      if (pixelRef.current) pixelRef.current.style.clipPath = `inset(0 0 ${height - seam}px 0)`;
      if (smoothRef.current) smoothRef.current.style.clipPath = `inset(${seam}px 0 0 0)`;
      if (seamRef.current) {
        seamRef.current.style.transform = `translateY(${seam - px / 2}px)`;
        seamRef.current.style.opacity = seam > 0 && seam < height ? "1" : "0";
      }

      const cur = currentRef.current;
      const t = now / 1000;
      const audible = pl && !m;
      const progress = cur ? (radioNow() - cur.startMs) / 1000 / TRACKS[cur.track].duration : 0;

      if (seam < height) {
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
        const mq = marqueeRef.current;
        if (mq) {
          const first = mq.firstElementChild as HTMLElement | null;
          const w = first ? first.offsetWidth / px : 0;
          mq.style.transform = `translateX(${-marqueeOffset(t, w, BOX.title.w) * px}px)`;
          if (mq.lastElementChild instanceof HTMLElement) mq.lastElementChild.style.display = w > BOX.title.w ? "" : "none";
        }
        eqLevels(t, audible).forEach((lvl, i) => {
          const bar = eqRefs.current[i];
          if (bar) bar.style.transform = `scaleY(${Math.max(0.15, lvl)})`;
        });
      }

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && seam > 0 && now - lastPixel >= 1000 / PIXEL_FPS) {
        lastPixel = now;
        drawPixelRadio(ctx, {
          t,
          title: cur ? TRACKS[cur.track].title : "",
          station: STATION_LABEL,
          progress,
          muted: m,
          live: audible,
          muteHover: mh,
          icon: iconRef.current,
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [mounted, heroId]);

  const title = track === null ? "" : TRACKS[track].title;
  const W = RADIO_W * p;
  const H = RADIO_H * p;

  const widget = (
    <div
      ref={widgetRef}
      className="intro-ui fixed bottom-4 right-4 z-[60] select-none md:bottom-6 md:right-6"
      style={{ width: W, height: H }}
      role="region"
      aria-label={`Now playing on ${STATION.name}: ${title}`}
      onMouseEnter={() => window.clearTimeout(volCloseTimer.current)}
      onMouseLeave={() => {
        if (!dragging) scheduleVolumeClose();
      }}
    >
      {volOpen && (
        <div
          ref={volRef}
          role="slider"
          tabIndex={0}
          aria-label="Radio volume"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={volume}
          className="custom-cursor-clickable absolute touch-none outline-none"
          style={{ left: VOL.x * p, top: -(VOL.h + VOL.gap) * p, width: VOL.w * p, height: VOL.h * p }}
          onKeyDown={onVolumeKey}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            volumeFromPointer(e.clientY);
          }}
          onPointerMove={(e) => {
            if (dragging) volumeFromPointer(e.clientY);
          }}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            setDragging(false);
            if (!widgetRef.current?.matches(":hover")) scheduleVolumeClose();
          }}
          onPointerCancel={() => setDragging(false)}
        >
          <div ref={volPixelRef} className="absolute inset-0">
            <canvas ref={volCanvasRef} width={VOL.w} height={VOL.h} className="retro-racer-hud block h-full w-full" aria-hidden="true" />
          </div>
          <div ref={volSmoothRef} className="absolute inset-0" style={{ clipPath: `inset(${VOL.h * p}px 0 0 0)` }} aria-hidden="true">
            <div
              className="absolute inset-y-0 border border-[#f5f0e6]/70 bg-black/85 text-[#f5f0e6] backdrop-blur-md"
              style={{ left: ((VOL.w - SMOOTH_VOL_W) / 2) * p, width: SMOOTH_VOL_W * p }}
            >
              <div
                className="absolute inset-x-0 top-0 flex items-center justify-center font-bold leading-none tabular-nums"
                style={{ height: (VOL_TRACK.y - 1) * p, fontSize: 4.4 * p }}
              >
                {volume}
              </div>
              <div
                className="absolute overflow-hidden bg-[#f5f0e6]/15"
                style={{
                  left: ((SMOOTH_VOL_W - SMOOTH_TRACK_W) / 2) * p - 1,
                  width: SMOOTH_TRACK_W * p,
                  top: VOL_TRACK.y * p - 1,
                  height: VOL_TRACK.h * p,
                }}
              >
                <div
                  className="absolute inset-x-0 bottom-0 bg-white transition-[height] duration-75"
                  style={{ height: `${volume}%` }}
                />
                <div
                  className="absolute inset-x-0 bg-white"
                  style={{
                    height: Math.max(2, p),
                    bottom: `calc(${volume}% - ${Math.max(2, p) / 2}px)`,
                    boxShadow: dragging ? "0 0 6px 1px rgba(255,255,255,0.8)" : "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pixel skin, shown while the widget overlaps the hero. */}
      <div ref={pixelRef} className="absolute inset-0" style={{ clipPath: "inset(0 0 0 0)" }}>
        <canvas
          ref={canvasRef}
          width={RADIO_W}
          height={RADIO_H}
          className="retro-racer-hud block h-full w-full"
          aria-hidden="true"
        />
      </div>

      {/* Smooth skin, matching the rest of the site. */}
      <div
        ref={smoothRef}
        className="absolute inset-0 overflow-hidden border border-[#f5f0e6]/70 bg-black/85 text-[#f5f0e6] backdrop-blur-md"
        style={{ clipPath: `inset(${H}px 0 0 0)` }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={STATION.icon} alt="" className="absolute object-contain" style={box(BOX.icon, p)} />
        <div
          className="absolute flex items-center whitespace-nowrap font-medium uppercase leading-none tracking-[0.2em] text-[#f5f0e6]/60"
          style={{ ...box(BOX.label, p), fontSize: 3.4 * p }}
        >
          Now playing
        </div>
        <div className="absolute flex items-end gap-[2px]" style={box(BOX.eq, p)}>
          {Array.from({ length: EQ_BARS }, (_, i) => (
            <div
              key={i}
              ref={(el) => {
                eqRefs.current[i] = el;
              }}
              className="h-full flex-1 origin-bottom bg-[#f5f0e6]"
            />
          ))}
        </div>
        <div className="absolute overflow-hidden" style={{ ...box(BOX.title, p), height: (BOX.title.h + 3) * p, top: (BOX.title.y - 1.5) * p }}>
          <div ref={marqueeRef} className="flex h-full items-center whitespace-nowrap font-light uppercase leading-none" style={{ fontSize: 5.6 * p, gap: MARQUEE_GAP * p }}>
            <span>{title}</span>
            <span>{title}</span>
          </div>
        </div>
        <div
          className="absolute flex items-center whitespace-nowrap uppercase leading-none tracking-[0.12em] text-[#f5f0e6]/70"
          style={{ ...box(BOX.station, p), fontSize: 3.4 * p }}
        >
          {STATION.name} {STATION.frequency}
        </div>
        <div className="absolute bg-[#f5f0e6]/20" style={box(BOX.progress, p)}>
          <div ref={progressRef} className="h-full w-full origin-left bg-[#f5f0e6]" style={{ transform: "scaleX(0)" }} />
        </div>
        <div
          className="absolute flex items-center justify-center border transition-colors duration-150"
          style={{
            ...box(BOX.mute, p),
            borderColor: CREAM,
            background: muteHover ? CREAM : "transparent",
            color: muteHover ? "#000" : CREAM,
          }}
        >
          <SpeakerIcon muted={muted} size={8 * p} />
        </div>
      </div>

      {/* The "magic" line where the hero's edge crosses the widget. */}
      <div
        ref={seamRef}
        className="pointer-events-none absolute left-[-2px] right-[-2px] top-0 opacity-0"
        style={{
          height: p,
          background: "linear-gradient(90deg, #ff92cf, #78ddff, #ffe36b, #ff92cf)",
          boxShadow: "0 0 8px 2px rgba(255, 146, 207, 0.7)",
        }}
      />

      <button
        type="button"
        onClick={toggleMute}
        onMouseEnter={() => {
          setMuteHover(true);
          openVolume();
        }}
        onMouseLeave={() => setMuteHover(false)}
        onFocus={() => setMuteHover(true)}
        onBlur={() => setMuteHover(false)}
        aria-label={muted ? "Unmute radio" : "Mute radio"}
        aria-pressed={!muted}
        className="custom-cursor-clickable absolute"
        style={box(BOX.mute, p)}
      />
    </div>
  );

  return (
    <>
      <div ref={hostRef} aria-hidden="true" className="pointer-events-none fixed bottom-0 right-0 h-px w-px overflow-hidden opacity-[0.01]" />
      {mounted && createPortal(widget, document.body)}
    </>
  );
}

function SpeakerIcon({ muted, size }: { muted: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      {muted ? (
        <path d="M17 9l5 6M22 9l-5 6" />
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}
