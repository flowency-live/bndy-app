// Deterministic stand-in artwork for a festival with no posterImageUrl.
// Seeded by slug, so the server and the client paint the same pixels and two
// festivals never look identical. No fetch, no randomness, no rights risk.
// The real fix stays the organiser's own poster on the record; this replaces
// only the old shared gradient, which made every unposted festival look the same.

const STOP_WORDS = new Set(["the", "of", "and", "a", "an", "at", "in", "on", "festival", "fest"]);

/** Small deterministic hash. Not crypto; just stable colour seeding. */
function seedOf(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

/** "Congleton Jazz & Blues Festival 2026" -> "CJB". Max three letters. */
export function festivalMonogram(name: string): string {
  const words = name
    .split(/[^A-Za-z0-9']+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w));
  const letters = words.slice(0, 3).map((w) => w[0].toUpperCase());
  return letters.join("") || name.slice(0, 1).toUpperCase();
}

export function FestivalPosterFallback({
  name,
  slug,
  startDate,
  className = "",
}: {
  name: string;
  slug?: string;
  startDate?: string;
  className?: string;
}) {
  const seed = seedOf(slug || name);
  const h1 = seed % 360;
  const h2 = (h1 + 42 + (seed % 60)) % 360;
  const x1 = 14 + (seed % 5) * 9; // 14..50
  const y1 = 12 + ((seed >> 3) % 4) * 10; // 12..42
  const x2 = 60 + ((seed >> 6) % 4) * 9; // 60..87
  const y2 = 58 + ((seed >> 9) % 4) * 9; // 58..85
  const tilt = -16 + ((seed >> 12) % 5) * 4; // -16..0 deg texture angle
  const year = startDate?.slice(0, 4);
  const monogram = festivalMonogram(name);

  return (
    <div
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{
        background: [
          `radial-gradient(circle at ${x1}% ${y1}%, hsl(${h1} 72% 52% / .55), transparent 44%)`,
          `radial-gradient(circle at ${x2}% ${y2}%, hsl(${h2} 66% 46% / .42), transparent 48%)`,
          `repeating-linear-gradient(${tilt}deg, transparent 0 20px, color-mix(in srgb, var(--line) 16%, transparent) 20px 22px)`,
          "var(--card2)",
        ].join(", "),
      }}
    >
      {/* SVG so the monogram scales with the box at any card size. */}
      <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full select-none">
        <text
          x="50"
          y="40"
          textAnchor="middle"
          fontSize={monogram.length > 2 ? 30 : 38}
          fontWeight={900}
          fill={`hsl(${h1} 80% 90% / .16)`}
          style={{ letterSpacing: "-0.02em" }}
        >
          {monogram}
        </text>
      </svg>
      {year && (
        <span className="absolute bottom-2 right-2 rounded-md border border-white/15 bg-black/45 px-1.5 py-0.5 font-meta text-[8px] font-black uppercase tracking-[1.2px] text-white/85 backdrop-blur-sm">
          {year}
        </span>
      )}
    </div>
  );
}
