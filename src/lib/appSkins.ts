// App-level skin registry  -  user-selectable visual identities.
// A skin = token block + registry entry. Behaviour stays shared.

export type SkinFamily = "hyper" | "soft" | "mono" | "roadcase" | "flyer";
export type SkinMode = "light" | "mid" | "dark";

export type AppSkinId =
  | "bndy-light" | "bndy-dark" | "openair" | "goldenhour"
  | "underground" | "synthwave" | "poole" | "hyper" | "roadcase" | "flyer";

export interface AppSkin {
  key: AppSkinId;
  name: string;
  desc: string;
  family: SkinFamily;
  mode: SkinMode;
  /** picker swatch dots */
  dots: [string, string, string];
  /** artist palette pairs  -  deterministic avatar/tile colours per skin */
  pal: [string, string][];
}

export const APP_SKINS: Record<AppSkinId, AppSkin> = {
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
  roadcase: {
    key: "roadcase", name: "Roadcase", desc: "Backstage hardware · stencil, tape & steel", family: "roadcase", mode: "dark",
    dots: ["#111214", "#C9CDD2", "#F4C542"],
    pal: [["#F4C542", "#69520D"], ["#FF5B3D", "#7D2415"], ["#C9CDD2", "#5B6168"], ["#65D6C8", "#1D6860"], ["#A78BFA", "#4A357F"]],
  },
  flyer: {
    key: "flyer", name: "Flyer", desc: "Venue wall · ripped paper & fluorescent ink", family: "flyer", mode: "light",
    dots: ["#F2E8D5", "#FF3B30", "#3157FF"],
    pal: [["#FF3B30", "#7E1713"], ["#3157FF", "#132779"], ["#F4D52C", "#8A7610"], ["#FF4FB8", "#8B1E61"], ["#171717", "#FF3B30"]],
  },
  goldenhour: {
    key: "goldenhour", name: "Golden Hour", desc: "Sunset warm · dusk stage", family: "soft", mode: "mid",
    dots: ["#E85D3D", "#8E4EC6", "#F9EBDC"],
    pal: [["#E85D3D", "#B03A22"], ["#8E4EC6", "#5F2E8C"], ["#FFB020", "#E85D3D"], ["#D6486E", "#8E4EC6"], ["#3E8E7E", "#E85D3D"]],
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

export const SKIN_ORDER: AppSkinId[] = [
  "bndy-light", "bndy-dark", "openair", "roadcase", "flyer", "goldenhour", "underground", "synthwave", "poole", "hyper",
];

export const DEFAULT_SKIN: AppSkinId = "bndy-dark";

export function isAppSkinId(v: unknown): v is AppSkinId {
  return typeof v === "string" && v in APP_SKINS;
}
