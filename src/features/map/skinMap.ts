// Map ↔ app-skin bridge. Reads the live CSS tokens (skins.css) and turns
// them into GPU layer colours + generated marker images, so the map
// re-skins with the rest of the app. Spec: SKINS-SYSTEM-SPEC.md §6.
import type maplibregl from "maplibre-gl";
import { APP_SKINS, type AppSkinId } from "@/lib/appSkins";
import type { Skin, SkinColors } from "./skins";

/* ---------------- basemap per app skin ---------------- */
export const BASEMAP_URLS = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  voyager: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
} as const;
export type BasemapKey = keyof typeof BASEMAP_URLS;

/** Warm skins ride Voyager; cool light skins Positron; dark skins Dark Matter. */
const BASEMAP_BY_SKIN: Record<AppSkinId, BasemapKey> = {
  print: "voyager",
  "bndy-light": "light",
  "bndy-dark": "dark",
  openair: "light",
  goldenhour: "voyager",
  solar: "voyager",
  synthwave: "dark",
  blackout: "dark",
  hyper: "light",
};
export function basemapFor(skin: AppSkinId): string {
  return BASEMAP_URLS[BASEMAP_BY_SKIN[skin] ?? (APP_SKINS[skin]?.mode === "dark" ? "dark" : "light")];
}

/* ---------------- tokens → layer colours ---------------- */
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(f, 16);
  if (Number.isNaN(n) || f.length !== 6) return hex; // non-hex token (rgba etc.) — pass through
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function readSkinColors(): SkinColors {
  const acc = cssVar("--acc") || "#ff7a1a";
  const onAcc = cssVar("--on-acc") || "#ffffff";
  const acc2 = cssVar("--acc2") || "#19d3f5";
  const onAcc2 = cssVar("--on-acc2") || "#ffffff";
  const card = cssVar("--card") || "#0e121d";
  const idle = cssVar("--dim2") || "#8b93a9";
  const surface = cssVar("--surface") || card;
  return {
    gigGlow: acc,
    gigCore: onAcc,
    venLive: acc2,
    venIdle: idle,
    venLiveCore: onAcc2,
    venIdleCore: surface,
    clRing: acc,
    clFill: hexToRgba(card, 0.9),
  };
}

/** Skin-shaped adapter for the existing layer builders. */
export function tokenSkin(): Skin {
  return { id: "pulse", label: "Tokens", markerStyle: "glow", heat: false, pitch: 0, colors: readSkinColors() };
}

/* ---------------- diamond venue marker (the good one) ---------------- */
/** Draws the prototype's rotated-square venue marker: fill diamond,
 *  contrast border, punched centre. Returned at 2x for crisp rendering. */
function diamondImage(fill: string, border: string, hole: string, sizePx = 30): ImageData {
  const px = sizePx * 2;
  const cv = document.createElement("canvas");
  cv.width = px; cv.height = px;
  const ctx = cv.getContext("2d")!;
  const c = px / 2;
  const r = px * 0.36;                 // half-diagonal of the diamond
  ctx.translate(c, c);
  ctx.rotate(Math.PI / 4);
  const side = r * Math.SQRT2 * 0.78;
  const rad = px * 0.09;               // corner rounding
  const draw = (s: number) => {
    ctx.beginPath();
    ctx.roundRect(-s / 2, -s / 2, s, s, rad);
  };
  // border
  draw(side);
  ctx.fillStyle = border;
  ctx.fill();
  // fill
  draw(side - px * 0.085);
  ctx.fillStyle = fill;
  ctx.fill();
  // punched centre
  draw(side * 0.34);
  ctx.fillStyle = hole;
  ctx.fill();
  return ctx.getImageData(0, 0, px, px);
}

export const DIA_LIVE = "bndy-dia-live";
export const DIA_IDLE = "bndy-dia-idle";

/** (Re)register diamond icons for the current skin. Call before adding layers. */
export function registerDiamonds(map: maplibregl.Map, colors: SkinColors): void {
  const border = cssVar("--pin-bd") || "#ffffff";
  const hole = cssVar("--surface") || "#0e121d";
  const entries: [string, ImageData][] = [
    [DIA_LIVE, diamondImage(colors.venLive, border, hole)],
    [DIA_IDLE, diamondImage(colors.venIdle, border, hole)],
  ];
  for (const [name, img] of entries) {
    if (map.hasImage(name)) map.removeImage(name);
    map.addImage(name, img, { pixelRatio: 2 });
  }
}
