// App-level skin registry — 9 user-selectable skins.
// Spec: Projects/bndy/SKINS-SYSTEM-SPEC.md · visual truth: bndy-skins-v4.html
// A skin = token block in src/app/skins.css + one entry here. Nothing else.

export type SkinFamily = "print" | "hyper" | "soft" | "mono";
export type SkinMode = "light" | "mid" | "dark";

export type AppSkinId =
  | "print" | "bndy-light" | "bndy-dark" | "openair" | "goldenhour"
  | "solar" | "synthwave" | "blackout" | "hyper";

export interface AppSkin {
  key: AppSkinId;
  name: string;
  desc: string;
  family: SkinFamily;
  mode: SkinMode;
  /** picker swatch dots */
  dots: [string, string, string];
  /** artist palette pairs — deterministic avatar/tile colours per skin */
  pal: [string, string][];
}

export const APP_SKINS: Record<AppSkinId, AppSkin> = {
  print: {
    key: "print", name: "Print Run", desc: "Poster & ink · daylight paper", family: "print", mode: "light",
    dots: ["#F03A21", "#2A46E8", "#FFC61A"],
    pal: [["#F03A21", "#2A46E8"], ["#2A46E8", "#FFC61A"], ["#1F8A4C", "#F03A21"], ["#FFC61A", "#1F8A4C"], ["#181309", "#F03A21"]],
  },
  "bndy-light": {
    key: "bndy-light", name: "bndy Light", desc: "The classic · daytime set", family: "soft", mode: "light",
    dots: ["#F97316", "#0891B2", "#F8FAFC"],
    pal: [["#F97316", "#FDBA74"], ["#0891B2", "#67E8F9"], ["#F97316", "#EF4444"], ["#6366F1", "#0891B2"], ["#10B981", "#F97316"]],
  },
  "bndy-dark": {
    key: "bndy-dark", name: "bndy Dark", desc: "The classic · stage lights on", family: "soft", mode: "dark",
    dots: ["#F97316", "#06B6D4", "#0F1729"],
    pal: [["#F97316", "#C2410C"], ["#06B6D4", "#0E7490"], ["#F97316", "#DB2777"], ["#8B5CF6", "#06B6D4"], ["#10B981", "#F97316"]],
  },
  openair: {
    key: "openair", name: "Open Air", desc: "Mint daylight · park sessions", family: "soft", mode: "light",
    dots: ["#0FA88F", "#FF6B9D", "#F2FAF6"],
    pal: [["#0FA88F", "#0B7A68"], ["#FF6B9D", "#C2447A"], ["#3E9BD6", "#0FA88F"], ["#FFB020", "#FF6B9D"], ["#7A5FC7", "#3E9BD6"]],
  },
  goldenhour: {
    key: "goldenhour", name: "Golden Hour", desc: "Sunset warm · dusk stage", family: "soft", mode: "mid",
    dots: ["#E85D3D", "#8E4EC6", "#F9EBDC"],
    pal: [["#E85D3D", "#B03A22"], ["#8E4EC6", "#5F2E8C"], ["#FFB020", "#E85D3D"], ["#D6486E", "#8E4EC6"], ["#3E8E7E", "#E85D3D"]],
  },
  solar: {
    key: "solar", name: "Solar Fade", desc: "Sepia mid · easy on the eyes", family: "soft", mode: "mid",
    dots: ["#CB4B16", "#2AA198", "#FDF6E3"],
    pal: [["#CB4B16", "#8F3410"], ["#2AA198", "#1B6E68"], ["#B58900", "#CB4B16"], ["#6C71C4", "#2AA198"], ["#D33682", "#6C71C4"]],
  },
  synthwave: {
    key: "synthwave", name: "Synthwave Stage", desc: "Retro neon · '84 vibes", family: "soft", mode: "dark",
    dots: ["#FF7EDB", "#36F9F6", "#FEDE5D"],
    pal: [["#FF7EDB", "#B44CFF"], ["#36F9F6", "#1B8A88"], ["#FEDE5D", "#FF8B39"], ["#FF8B39", "#FF7EDB"], ["#72F1B8", "#36F9F6"]],
  },
  blackout: {
    key: "blackout", name: "Blackout", desc: "Venue mono · stark", family: "mono", mode: "dark",
    dots: ["#000000", "#FFFFFF", "#4D7CFE"],
    pal: [["#1A1A1A", "#4D7CFE"], ["#4D7CFE", "#16224A"], ["#333333", "#111111"], ["#4D7CFE", "#99B4FF"], ["#222222", "#000000"]],
  },
  hyper: {
    key: "hyper", name: "Hyperwave", desc: "Future chrome · iridescent", family: "hyper", mode: "light",
    dots: ["#4B2EFF", "#FF2ED2", "#22E4FF"],
    pal: [["#4B2EFF", "#FF2ED2"], ["#FF2ED2", "#22E4FF"], ["#22E4FF", "#4B2EFF"], ["#FF6A3D", "#FF2ED2"], ["#2EC5FF", "#4B2EFF"]],
  },
};

/** Picker order (product decision: 6 light/mid before 3 dark alternates). */
export const SKIN_ORDER: AppSkinId[] = [
  "print", "bndy-light", "bndy-dark", "openair", "goldenhour", "solar", "synthwave", "blackout", "hyper",
];

export const DEFAULT_SKIN: AppSkinId = "print";

export function isAppSkinId(v: unknown): v is AppSkinId {
  return typeof v === "string" && v in APP_SKINS;
}

/** Deterministic palette pair for an entity (stable across pagination). */
export function palFor(skin: AppSkinId, seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const pal = APP_SKINS[skin].pal;
  return pal[Math.abs(h) % pal.length];
}

/** CSS background for avatar/tile fallbacks (print = flat + halftone elsewhere). */
export function paletteBg(skin: AppSkinId, seed: string): string {
  const [a, b] = palFor(skin, seed);
  return skin === "print" ? a : `linear-gradient(135deg, ${a}, ${b})`;
}
