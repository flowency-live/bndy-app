// App-level skin registry  -  user-selectable visual identities.
// A skin = token block + registry entry. Behaviour stays shared.
//
// 2026-08-21: every identity is now a THEME with a light and a dark variant.
// The picker shows one card per theme plus a single Light/Dark control, so a
// choice is still one click. Variant ids stay flat and unchanged wherever a
// block already existed, so stored preferences survive.

export type SkinFamily = "hyper" | "soft" | "mono" | "roadcase" | "flyer";
export type SkinMode = "light" | "mid" | "dark";
export type SkinVariant = "light" | "dark";

export type AppSkinId =
  | "bndy-light" | "bndy-dark"
  | "hyper" | "cyberpunk"
  | "roadcase-light" | "roadcase"
  | "flyer" | "flyer-dark"
  | "synthwave-light" | "synthwave"
  | "underground" | "poole";

export type ThemeId = "bndy" | "cyberpunk" | "roadcase" | "flyer" | "synthwave" | "underground";

export interface AppSkin {
  key: AppSkinId;
  name: string;
  desc: string;
  family: SkinFamily;
  mode: SkinMode;
  /** which theme this block is a variant of */
  theme: ThemeId;
  variant: SkinVariant;
  /** picker swatch dots */
  dots: [string, string, string];
  /** artist palette pairs  -  deterministic avatar/tile colours per skin */
  pal: [string, string][];
}

export interface SkinTheme {
  id: ThemeId;
  name: string;
  desc: string;
  light: AppSkinId;
  dark: AppSkinId;
}

export const APP_SKINS: Record<AppSkinId, AppSkin> = {
  "bndy-light": {
    key: "bndy-light", name: "bndy Light", desc: "The classic · daytime set", family: "soft", mode: "light",
    theme: "bndy", variant: "light",
    dots: ["#F97316", "#0891B2", "#F8FAFC"],
    pal: [["#F97316", "#FDBA74"], ["#0891B2", "#67E8F9"], ["#F97316", "#EF4444"], ["#6366F1", "#0891B2"], ["#10B981", "#F97316"]],
  },
  "bndy-dark": {
    key: "bndy-dark", name: "bndy Dark", desc: "The classic · stage lights on", family: "soft", mode: "dark",
    theme: "bndy", variant: "dark",
    dots: ["#F97316", "#06B6D4", "#0F1729"],
    pal: [["#F97316", "#C2410C"], ["#06B6D4", "#0E7490"], ["#F97316", "#DB2777"], ["#8B5CF6", "#06B6D4"], ["#10B981", "#F97316"]],
  },
  hyper: {
    key: "hyper", name: "Hyperwave", desc: "Future chrome · iridescent", family: "hyper", mode: "light",
    theme: "cyberpunk", variant: "light",
    dots: ["#4B2EFF", "#FF2ED2", "#22E4FF"],
    pal: [["#4B2EFF", "#FF2ED2"], ["#FF2ED2", "#22E4FF"], ["#22E4FF", "#4B2EFF"], ["#FF6A3D", "#FF2ED2"], ["#2EC5FF", "#4B2EFF"]],
  },
  cyberpunk: {
    key: "cyberpunk", name: "Cyberpunk", desc: "Neon circuit · cyan, magenta & violet", family: "soft", mode: "dark",
    theme: "cyberpunk", variant: "dark",
    dots: ["#19D9F3", "#FF2BC2", "#8B5CF6"],
    pal: [["#19D9F3", "#086F86"], ["#FF2BC2", "#8A176B"], ["#8B5CF6", "#4C2FA3"], ["#19D9F3", "#FF2BC2"], ["#6D5DFB", "#19D9F3"]],
  },
  "roadcase-light": {
    key: "roadcase-light", name: "Roadcase Day", desc: "Kraft board · stencil & stamp red", family: "roadcase", mode: "light",
    theme: "roadcase", variant: "light",
    dots: ["#F2EDE3", "#C8341F", "#46505A"],
    pal: [["#C8341F", "#7D2415"], ["#46505A", "#22282E"], ["#B8860B", "#6B4F06"], ["#2F7A6B", "#17453C"], ["#6D5DAF", "#392E63"]],
  },
  roadcase: {
    key: "roadcase", name: "Roadcase", desc: "Backstage hardware · stencil, tape & steel", family: "roadcase", mode: "dark",
    theme: "roadcase", variant: "dark",
    dots: ["#111214", "#C9CDD2", "#F4C542"],
    pal: [["#F4C542", "#69520D"], ["#FF5B3D", "#7D2415"], ["#C9CDD2", "#5B6168"], ["#65D6C8", "#1D6860"], ["#A78BFA", "#4A357F"]],
  },
  flyer: {
    key: "flyer", name: "Flyer", desc: "Venue wall · ripped paper & fluorescent ink", family: "flyer", mode: "light",
    theme: "flyer", variant: "light",
    dots: ["#F2E8D5", "#FF3B30", "#3157FF"],
    pal: [["#FF3B30", "#7E1713"], ["#3157FF", "#132779"], ["#F4D52C", "#8A7610"], ["#FF4FB8", "#8B1E61"], ["#171717", "#FF3B30"]],
  },
  "flyer-dark": {
    key: "flyer-dark", name: "Flyer Night", desc: "Chalkboard · dusty brights on slate", family: "flyer", mode: "dark",
    theme: "flyer", variant: "dark",
    dots: ["#14181A", "#F2D857", "#79D2E0"],
    pal: [["#F2D857", "#7A6B18"], ["#79D2E0", "#1E5A66"], ["#FF8BB0", "#7C2B45"], ["#A8E6A3", "#2E5C2B"], ["#E9E6DA", "#5A5F58"]],
  },
  "synthwave-light": {
    key: "synthwave-light", name: "Synthwave Sunrise", desc: "Neon at midday · pink & cyan on paper", family: "soft", mode: "light",
    theme: "synthwave", variant: "light",
    dots: ["#C21E63", "#0E7490", "#F5B301"],
    pal: [["#C21E63", "#7B0F3D"], ["#0E7490", "#08414F"], ["#F5B301", "#8A6400"], ["#7C3AED", "#3F1D82"], ["#0E7490", "#C21E63"]],
  },
  synthwave: {
    key: "synthwave", name: "Synthwave Stage", desc: "Retro neon · '84 vibes", family: "soft", mode: "dark",
    theme: "synthwave", variant: "dark",
    dots: ["#FF7EDB", "#36F9F6", "#FEDE5D"],
    pal: [["#FF7EDB", "#B44CFF"], ["#36F9F6", "#1B8A88"], ["#FEDE5D", "#FF8B39"], ["#FF8B39", "#FF7EDB"], ["#72F1B8", "#36F9F6"]],
  },
  underground: {
    key: "underground", name: "Underground", desc: "Mind the gap · tube-map London", family: "mono", mode: "light",
    theme: "underground", variant: "light",
    dots: ["#DC241F", "#10069F", "#FFD300"],
    pal: [["#DC241F", "#10069F"], ["#10069F", "#00A0E2"], ["#007D32", "#DC241F"], ["#FFD300", "#B26300"], ["#000000", "#DC241F"]],
  },
  poole: {
    key: "poole", name: "Poole Position", desc: "Night line · KLMA red & gold, for Dave Poole", family: "soft", mode: "dark",
    theme: "underground", variant: "dark",
    dots: ["#D9201A", "#F5D327", "#0B0908"],
    pal: [["#D9201A", "#8F1511"], ["#F5D327", "#B89A0E"], ["#D9201A", "#F5D327"], ["#F5F2EA", "#8F1511"], ["#B23A1E", "#D9201A"]],
  },
};

/** One card per theme in the picker. Order is the product decision. */
export const THEMES: SkinTheme[] = [
  { id: "bndy", name: "bndy", desc: "The classic", light: "bndy-light", dark: "bndy-dark" },
  { id: "cyberpunk", name: "Cyberpunk", desc: "Neon circuit & iridescent chrome", light: "hyper", dark: "cyberpunk" },
  { id: "roadcase", name: "Roadcase", desc: "Backstage hardware, stencil & tape", light: "roadcase-light", dark: "roadcase" },
  { id: "flyer", name: "Flyer", desc: "Venue wall paper by day, chalkboard by night", light: "flyer", dark: "flyer-dark" },
  { id: "synthwave", name: "Synthwave", desc: "Retro neon, sunrise or stage", light: "synthwave-light", dark: "synthwave" },
  { id: "underground", name: "Underground", desc: "Tube map by day, night line for Dave Poole", light: "underground", dark: "poole" },
];

export const THEME_BY_ID: Record<ThemeId, SkinTheme> = THEMES.reduce((acc, t) => {
  acc[t.id] = t;
  return acc;
}, {} as Record<ThemeId, SkinTheme>);

/** The variant id for a theme in a given light/dark state. */
export function skinFor(theme: ThemeId, variant: SkinVariant): AppSkinId {
  return THEME_BY_ID[theme][variant];
}

/** The counterpart id in the other mode, keeping the theme. */
export function counterpart(id: AppSkinId): AppSkinId {
  const s = APP_SKINS[id];
  return skinFor(s.theme, s.variant === "dark" ? "light" : "dark");
}

export const SKIN_ORDER: AppSkinId[] = THEMES.flatMap((t) => [t.light, t.dark]);

export const DEFAULT_SKIN: AppSkinId = "bndy-dark";

/** Retired or renamed ids map forward so nobody loses their choice.
 *  Golden Hour and the older experiments are gone; the nearest survivor wins. */
export const LEGACY_SKIN_MAP: Record<string, AppSkinId> = {
  openair: "cyberpunk",
  goldenhour: "roadcase-light",
  print: "flyer",
  solar: "roadcase-light",
  blackout: "roadcase",
  lemonrock: "bndy-light",
  onthecase: "roadcase",
};

export function isAppSkinId(v: unknown): v is AppSkinId {
  return typeof v === "string" && v in APP_SKINS;
}

/** Normalise anything read from storage into a live skin id. */
export function resolveSkinId(raw: unknown): AppSkinId | null {
  if (isAppSkinId(raw)) return raw;
  if (typeof raw === "string" && raw in LEGACY_SKIN_MAP) return LEGACY_SKIN_MAP[raw];
  return null;
}
