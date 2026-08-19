"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M13.7 22v-8.7h2.9l.44-3.4H13.7V7.73c0-.98.27-1.65 1.68-1.65h1.8V3.04c-.31-.04-1.38-.13-2.62-.13-2.6 0-4.38 1.59-4.38 4.5V9.9H7.25v3.4h2.93V22h3.52Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M12.04 2A9.85 9.85 0 0 0 3.6 16.91L2 22l5.22-1.53A9.95 9.95 0 1 0 12.04 2Zm0 17.9a8 8 0 0 1-4.08-1.12l-.29-.17-3.1.91.92-3.02-.19-.31a7.9 7.9 0 1 1 6.74 3.71Zm4.34-5.93c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.76.93-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18a7.2 7.2 0 0 1-1.32-1.65c-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.52.1.46-.07 1.4-.58 1.6-1.13.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M5.34 7.56A2.34 2.34 0 1 0 5.34 2.9a2.34 2.34 0 0 0 0 4.67ZM3.32 21h4.05V9.02H3.32V21ZM9.78 9.02h3.88v1.64h.06c.54-1.02 1.86-2.1 3.83-2.1 4.1 0 4.86 2.7 4.86 6.21V21h-4.04v-5.52c0-1.32-.03-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.92V21H9.78V9.02Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.4L6.48 22H3.36l7.25-8.29L2.97 2h6.4l4.42 5.84L18.9 2Zm-1.1 17.84h1.72L8.43 4.05H6.58L17.8 19.84Z" />
    </svg>
  );
}

function channelLinks(url: string, text: string): { key: string; label: string; href: string; bg: string; icon: ReactNode }[] {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { key: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, bg: "#1877F2", icon: <FacebookIcon /> },
    { key: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${t}%0A${u}`, bg: "#25D366", icon: <WhatsAppIcon /> },
    { key: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, bg: "#0A66C2", icon: <LinkedInIcon /> },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, bg: "#000000", icon: <XIcon /> },
  ];
}

export function ShareSheet({ open, onClose, url, title, text }: {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    setCanNative(typeof navigator !== "undefined" && !!navigator.share);
    return () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
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
            "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-extrabold transition-[background-color,color,transform] active:scale-[.97]",
            copied ? "bg-emerald-600 text-white" : "bg-[var(--acc)] text-black hover:opacity-90",
          )}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

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
            title={c.label}
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
            style={{ background: c.bg }}
          >
            {c.icon}
          </a>
        ))}
        {canNative && (
          <button
            type="button"
            onClick={native}
            aria-label="More share options"
            title="More share options"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-line glass text-txt transition-transform hover:scale-105 active:scale-95"
          >
            <Share2 size={19} />
          </button>
        )}
      </div>
    </Sheet>
  );
}
