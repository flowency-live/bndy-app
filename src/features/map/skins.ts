// Map skins — self-contained visual languages, driven by the theme's skin id.
import type { SkinId } from "@/lib/theme";

// CARTO vector basemaps (labeled = place names). No access token required.
export const BASEMAPS = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
} as const;

export interface SkinColors {
  gigGlow: string; gigCore: string;
  venLive: string; venIdle: string; venLiveCore: string; venIdleCore: string;
  clRing: string; clFill: string;
}
export interface Skin {
  id: SkinId; label: string; markerStyle: "dot" | "glow" | "ring"; heat: boolean; pitch: number; colors: SkinColors;
}

const ORANGE = "#ff7a1a", ORANGE_HOT = "#ffe2c4", PINK = "#ff2e88", PINK_HOT = "#ffd0e4", CYAN = "#19d3f5", CYAN_HOT = "#cdf4ff", VIOLET = "#8b5bff";

export const SKINS: Record<SkinId, Skin> = {
  pulse: {
    id: "pulse", label: "Pulse", markerStyle: "glow", heat: true, pitch: 0,
    colors: { gigGlow: ORANGE, gigCore: ORANGE_HOT, venLive: PINK, venIdle: CYAN, venLiveCore: PINK_HOT, venIdleCore: CYAN_HOT, clRing: ORANGE, clFill: "rgba(8,10,18,.85)" },
  },
  aurora: {
    id: "aurora", label: "Aurora", markerStyle: "ring", heat: false, pitch: 48,
    colors: { gigGlow: ORANGE, gigCore: "#fff0da", venLive: PINK, venIdle: CYAN, venLiveCore: PINK_HOT, venIdleCore: CYAN_HOT, clRing: VIOLET, clFill: "rgba(10,10,26,.7)" },
  },
  "neon-dot": {
    id: "neon-dot", label: "Neon Dot", markerStyle: "dot", heat: false, pitch: 0,
    colors: { gigGlow: ORANGE, gigCore: ORANGE_HOT, venLive: PINK, venIdle: CYAN, venLiveCore: PINK_HOT, venIdleCore: CYAN_HOT, clRing: ORANGE, clFill: "rgba(10,14,24,.9)" },
  },
};

export const SKIN_ORDER: SkinId[] = ["pulse", "aurora", "neon-dot"];
export function getSkin(id: SkinId): Skin { return SKINS[id] ?? SKINS.pulse; }
