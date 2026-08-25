// Open mic avatar stand-in (item 13). An open mic without a host image used
// to fall back to initials of "Open mic…"  -  an ugly "OM" circle. This tile
// draws a proper mic glyph in the second accent instead.

import { Mic } from "lucide-react";

export function MicTile({ size = 40, radius = 12 }: { size?: number; radius?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "color-mix(in srgb, var(--acc2) 20%, transparent)",
        border: "1px solid color-mix(in srgb, var(--acc2) 45%, transparent)",
      }}
    >
      <Mic size={Math.round(size * 0.5)} strokeWidth={2.25} className="text-[var(--acc2)]" />
    </span>
  );
}
