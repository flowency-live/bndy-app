// Open mic avatar stand-in (item 13). An open mic without a host image used
// to fall back to initials of "Open mic…"  -  an ugly "OM" circle. This tile
// displays the custom open mic icon instead.

export function MicTile({ size = 40, radius = 12 }: { size?: number; radius?: number }) {
  return (
    <img
      src="/openmic-icon.png"
      alt=""
      aria-hidden
      className="shrink-0 object-cover"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
      }}
    />
  );
}
