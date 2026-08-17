// App-level skin registry — 11 user-selectable skins.
// Spec: Projects/bndy/SKINS-SYSTEM-SPEC.md · visual truth: bndy-skins-v4.html
// A skin = token block in src/app/skins.css + one entry here. Nothing else.

export type SkinFamily = "print" | "hyper" | "soft" | "mono";
export type SkinMode = "light" | "mid" | "dark";

export type AppSkinId =
  | "print" | "bndy-light" | "bndy-dark" | "openair" | "goldenhour"
  | "solar" | "underground" | "synthwave" | "blackout" | "poole" | "hyper";

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
    key: "openair", name: "Vibe", desc: "Congleton neon · cyan, magenta & violet", family: "soft", mode: "dark",
    dots: ["#19D9F3", "#FF2BC2", "#8B5CF6"],
    pal: [["#19D9F3", "#086F86"], ["#FF2BC2", "#8A176B"], ["#8B5CF6", "#4C2FA3"], ["#19D9F3", "#FF2BC2"], ["#6D5DFB", "#19D9F3"]],
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
  underground: {
    key: "underground", name: "Underground", desc: "Mind the gap · tube-map London", family: "mono", mode: "light",
    dots: ["#DC241F", "#10069F", "#FFD300"],
    pal: [["#DC241F", "#10069F"], ["#10069F", "#00A0E2"], ["#007D32", "#DC241F"], ["#FFD300", "#B26300"], ["#000000", "#DC241F"]],
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
  poole: {
    key: "poole", name: "Poole Position", desc: "KLMA Stoke homage · red & gold", family: "soft", mode: "dark",
    dots: ["#D9201A", "#F5D327", "#0B0908"],
    pal: [["#D9201A", "#8F1511"], ["#F5D327", "#B89A0E"], ["#D9201A", "#F5D327"], ["#F5F2EA", "#8F1511"], ["#B23A1E", "#D9201A"]],
  },
  hyper: {
    key: "hyper", name: "Hyperwave", desc: "Future chrome · iridescent", family: "hyper", mode: "light",
    dots: ["#4B2EFF", "#FF2ED2", "#22E4FF"],
    pal: [["#4B2EFF", "#FF2ED2"], ["#FF2ED2", "#22E4FF"], ["#22E4FF", "#4B2EFF"], ["#FF6A3D", "#FF2ED2"], ["#2EC5FF", "#4B2EFF"]],
  },
};

/** Picker order. */
export const SKIN_ORDER: AppSkinId[] = [
  "print", "bndy-light", "bndy-dark", "openair", "goldenhour", "solar", "underground", "synthwave", "blackout", "poole", "hyper",
];

export const DEFAULT_SKIN: AppSkinId = "print";

export function isAppSkinId(v: unknown): v is AppSkinId {
  return typeof v === "string" && v in APP_SKINS;
}
