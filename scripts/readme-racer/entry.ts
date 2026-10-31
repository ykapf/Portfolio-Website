import { H, LOOP_SECONDS, W } from "../../src/app/components/retro-racer/config";
import { createRacer } from "../../src/app/components/retro-racer/engine";
import { MARGIN, drawRevDial } from "../../src/app/components/retro-racer/hud";
import { revsAt } from "../../src/app/components/retro-racer/timeline";

const canvas = document.createElement("canvas");
const racer = createRacer(canvas, { enableBoost: true, showHUD: false });
const ctx = canvas.getContext("2d");
if (!racer || !ctx) throw new Error("canvas 2d unavailable");

/** Draws the scene plus rev counter at `t` seconds and returns the RGBA bytes as base64. */
function renderFrame(t: number): string {
  racer!.render(t);
  drawRevDial(ctx!, MARGIN, H - MARGIN, Math.round(revsAt(t) * 200) / 200);
  const bytes = ctx!.getImageData(0, 0, W, H).data;
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(bin);
}

Object.assign(window, { renderFrame, RACER: { W, H, LOOP_SECONDS } });
