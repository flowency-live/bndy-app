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
  underground: "light",
  synthwave: "dark",
  blackout: "dark",
  poole: "dark",
  hyper: "light",
};
export function basemapFor(skin: AppSkinId): string {
  return BASEMAP_URLS[BASEMAP_BY_SKIN[skin] ?? (APP_SKINS[skin]?.mode === "dark" ? "dark" : "light")];
}

/* ---------------- tokens → layer colours ---------------- */
function readVars(names: string[]): Record<string, string> {
  // single getComputedStyle call — repeated calls force style recalc (reflow)
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const n of names) out[n] = cs.getPropertyValue(n).trim();
  return out;
}
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(f, 16);
  if (Number.isNaN(n) || f.length !== 6) return hex; // non-hex token (rgba etc.) — pass through
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---- WCAG contrast picker (used for the £ glyph on gig pins) ---- */
function relLum(hex: string): number | null {
  const h = hex.replace("#", "");
  const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (f.length !== 6 || Number.isNaN(parseInt(f, 16))) return null;
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(f.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a: string, b: string): number {
  const la = relLum(a), lb = relLum(b);
  if (la === null || lb === null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Highest-contrast candidate against bg — correctness by construction, works for future skins too. */
function bestOn(bg: string, candidates: string[]): string {
  let best = candidates[0], bestCr = 0;
  for (const c of candidates) {
    const cr = contrast(bg, c);
    if (cr > bestCr) { bestCr = cr; best = c; }
  }
  return best;
}

export function readSkinColors(): SkinColors {
  const v = readVars(["--acc", "--on-acc", "--acc2", "--on-acc2", "--card", "--dim2", "--surface", "--pin-bd", "--txt"]);
  const txt = v["--txt"] || "#F1F5F9";
  const acc = v["--acc"] || "#ff7a1a";
  const onAcc = v["--on-acc"] || "#ffffff";
  const acc2 = v["--acc2"] || "#19d3f5";
  const onAcc2 = v["--on-acc2"] || "#ffffff";
  const card = v["--card"] || "#0e121d";
  const idle = v["--dim2"] || "#8b93a9";
  const surface = v["--surface"] || card;
  const pinBd = v["--pin-bd"] || "#ffffff";
  return {
    gigGlow: acc,
    // gigCore = the £ glyph on ticketed pins: best WCAG contrast against the accent fill,
    // picked at runtime (on-acc fails on 6/9 skins, e.g. white on #F97316 = 2.8:1)
    gigCore: bestOn(acc, [onAcc, txt, surface, "#000000", "#ffffff"]),
    gigStroke: pinBd,
    venLive: acc2,
    venIdle: idle,
    venLiveCore: onAcc2,
    venIdleCore: surface,
    clRing: acc,
    clFill: hexToRgba(card, 0.9),
    // venue name pills: the skin's standard card/txt pairing.
    // WCAG AA verified across all 9 skins (worst = solar 10.6:1; bndy-dark 13.9, synthwave 13.1, light skins >13).
    pillBg: card,
    pillTxt: txt,
  };
}

/** Skin-shaped adapter for the existing layer builders. */
export function tokenSkin(): Skin {
  return { id: "pulse", label: "Tokens", markerStyle: "glow", heat: false, pitch: 0, colors: readSkinColors() };
}

/* ---------------- diamond venue marker (solid) ---------------- */
/** Draws a rotated-square venue marker: solid fill diamond with contrast border.
 *  Returned at 2x for crisp rendering. */
function diamondImage(fill: string, border: string, sizePx = 30): ImageData {
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
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(-s / 2, -s / 2, s, s, rad);
    } else {
      // fallback: plain square path for browsers without roundRect
      ctx.rect(-s / 2, -s / 2, s, s);
    }
  };
  // border
  draw(side);
  ctx.fillStyle = border;
  ctx.fill();
  // solid fill (no punched centre)
  draw(side - px * 0.085);
  ctx.fillStyle = fill;
  ctx.fill();
  return ctx.getImageData(0, 0, px, px);
}

export const DIA_LIVE = "bndy-dia-live";
export const DIA_IDLE = "bndy-dia-idle";
export const PILL_LIVE = "bndy-pill-live";
export const PILL_IDLE = "bndy-pill-idle";

/* ---------------- venue name pill (stretchable nine-patch) ---------------- */
/** Rounded-rect background for venue name labels. Used with icon-text-fit so the
 *  pill hugs its text. Drawn at 2x; stretch/content coords are physical pixels. */
function pillImage(fill: string, border: string): ImageData {
  const w = 64, h = 32, r = 14;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(1.5, 1.5, w - 3, h - 3, r);
  else ctx.rect(1.5, 1.5, w - 3, h - 3); // fallback: square pill
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = border;
  ctx.stroke();
  return ctx.getImageData(0, 0, w, h);
}
const PILL_OPTS = {
  pixelRatio: 2,
  stretchX: [[24, 40]] as [number, number][],
  stretchY: [[14, 18]] as [number, number][],
  content: [10, 7, 54, 25] as [number, number, number, number],
};

/** (Re)register venue-name pill backgrounds for the current skin. Call with registerDiamonds. */
export function registerPills(map: maplibregl.Map, colors: SkinColors): void {
  const fill = colors.pillBg ?? "#10131C";
  const entries: [string, ImageData][] = [
    [PILL_LIVE, pillImage(fill, colors.venLive)],
    [PILL_IDLE, pillImage(fill, colors.venIdle)],
  ];
  for (const [name, img] of entries) {
    try {
      if (map.hasImage(name)) map.removeImage(name);
      map.addImage(name, img, PILL_OPTS);
    } catch (err) {
      console.error("[bndy-map] pill icon registration failed:", err);
    }
  }
}

/** (Re)register diamond icons for the current skin. Call before adding layers. */
export function registerDiamonds(map: maplibregl.Map, colors: SkinColors): void {
  const v = readVars(["--pin-bd"]);
  const border = v["--pin-bd"] || "#ffffff";
  const entries: [string, ImageData][] = [
    [DIA_LIVE, diamondImage(colors.venLive, border)],
    [DIA_IDLE, diamondImage(colors.venIdle, border)],
  ];
  for (const [name, img] of entries) {
    try {
      if (map.hasImage(name)) map.removeImage(name);
      map.addImage(name, img, { pixelRatio: 2 });
    } catch (err) {
      console.error("[bndy-map] diamond icon registration failed:", err);
    }
  }
}
