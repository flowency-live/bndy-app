"use client";

// Share sheet (backlog 3b) — the AllEvents model in bndy's skin:
// copy-link field, direct channel buttons, native share where it exists.
// One component for gigs, artists and venues.

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

function channelLinks(url: string, text: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bg: "#1877F2" },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}%0A${u}`, bg: "#25D366" },
    { key: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, bg: "#0A66C2" },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, bg: "#000000" },
  ];
}

export function ShareSheet({
  open,
  onClose,
  url,
  title,
  text,
}: {
  open: boolean;
  onClose: () => void;
  /** The link to share — already absolute. */
  url: string;
  /** Sheet heading, e.g. "Share The Torrists". */
  title: string;
  /** The message that rides along on chat channels. */
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };

  const native = async () => {
    try {
      await navigator.share({ title: text, text, url });
      onClose();
    } catch { /* user dismissed */ }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="text-lg font-black tracking-tight text-txt">{title}</h2>
      <p className="mt-1 text-[13px] font-semibold text-dim">{text}</p>

      {/* copy-link field */}
      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-xl border border-line bg-white/5 px-3.5 py-2.5 text-[13px] font-semibold text-dim outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-extrabold transition-colors",
            copied ? "bg-emerald-600 text-white" : "bg-[var(--acc)] text-black hover:opacity-90",
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      {/* direct channels */}
      <p className="mt-5 text-center text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim2">
        Share it straight to
      </p>
      <div className="mt-2.5 flex items-center justify-center gap-2.5">
        {channelLinks(url, text).map((c) => (
          <a
            key={c.key}
            href={c.href}
            target="_blank"
            rel="noopener"
            aria-label={`Share on ${c.label}`}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-[13px] font-black text-white transition-transform hover:scale-105"
            style={{ background: c.bg }}
          >
            {c.key === "facebook" ? "f" : c.key === "whatsapp" ? "W" : c.key === "linkedin" ? "in" : "𝕏"}
          </a>
        ))}
        {canNative && (
          <button
            type="button"
            onClick={native}
            aria-label="More share options"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line glass text-txt transition-transform hover:scale-105"
          >
            <Share2 size={17} />
          </button>
        )}
      </div>
    </Sheet>
  );
}
