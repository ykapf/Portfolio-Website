"use client";

import { useRef } from "react";
import GithubHud from "./retro-racer/GithubHud";
import RetroRacer from "./retro-racer/RetroRacer";

/**
 * Full-screen intro: the OutRun-style racer with a live GitHub HUD. On portrait
 * screens the scene fills the whole screen, with the stats panel over the sky
 * and the rev counter near the bottom, above the radio.
 */
export default function PixelHero() {
  const clockRef = useRef(0);
  return (
    <section id="pixel-hero" className="relative h-[100svh] w-full overflow-hidden bg-black">
      <div className="relative h-full w-full">
        <RetroRacer className="absolute inset-0 z-0 h-full w-full" clockRef={clockRef} />
        <GithubHud className="intro-ui z-10 portrait:hidden" clockRef={clockRef} />
        <div className="intro-ui absolute inset-x-0 top-0 z-10 hidden pt-[env(safe-area-inset-top)] portrait:block">
          <GithubHud variant="top" />
        </div>
        {/* Clears the floating radio (its offset + RADIO_H × pixel size + 8px), which is too wide to share the row. */}
        <div className="intro-ui absolute inset-x-0 bottom-[92px] z-10 hidden portrait:block md:bottom-[100px] lg:bottom-[134px]">
          <GithubHud variant="bottom" clockRef={clockRef} />
        </div>
      </div>
    </section>
  );
}
