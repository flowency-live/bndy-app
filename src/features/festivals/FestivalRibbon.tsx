import Link from "next/link";
import { CalendarRange, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function FestivalRibbon({
  name,
  slug,
  compact = false,
  className,
  onNavigate,
}: {
  name: string;
  slug?: string;
  compact?: boolean;
  className?: string;
  onNavigate?: () => void;
}) {
  const inner = compact ? (
    <>
      <CalendarRange size={11} strokeWidth={2.8} className="shrink-0 text-[var(--acc)]" />
      <span className="shrink-0 font-meta text-[7.5px] font-black uppercase tracking-[1.2px] opacity-75">Festival</span>
      <span className="min-w-0 truncate text-[10px] font-black leading-none">{name}</span>
      {slug && <ChevronRight size={11} className="ml-auto shrink-0 opacity-65" />}
    </>
  ) : (
    <>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/15">
        <CalendarRange size={13} strokeWidth={2.6} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[8px] font-black uppercase tracking-[1.5px] opacity-75">Festival</span>
        <span className="block truncate text-[12px] font-black leading-tight">{name}</span>
      </span>
      {slug && <ChevronRight size={14} className="shrink-0 opacity-70" />}
    </>
  );

  const classes = cn(
    "festival-ribbon flex min-w-0 items-center overflow-hidden border",
    compact ? "gap-1.5 rounded-md px-2 py-1" : "gap-2 rounded-xl px-2.5 py-2",
    className,
  );
  const style = {
    color: "var(--txt)",
    borderColor: "color-mix(in srgb, var(--acc) 58%, var(--line))",
    background: "linear-gradient(105deg, color-mix(in srgb, var(--acc) 24%, var(--card)) 0%, color-mix(in srgb, var(--acc2) 11%, var(--card)) 72%, var(--card) 100%)",
    boxShadow: compact ? "inset 2px 0 0 var(--acc)" : "inset 3px 0 0 var(--acc)",
  } as const;

  if (!slug) return <div className={classes} style={style}>{inner}</div>;
  return (
    <Link href={`/festivals/${slug}`} onClick={onNavigate} className={cn(classes, "transition-transform hover:-translate-y-px active:translate-y-0")} style={style}>
      {inner}
    </Link>
  );
}
