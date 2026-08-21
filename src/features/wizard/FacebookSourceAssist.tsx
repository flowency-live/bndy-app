"use client";

import { useCallback, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, Link2, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { inspectFacebookSource, type FacebookSourceInspection } from "./wizardApi";

export function FacebookSourceAssist({
  expectedType,
  value,
  onChange,
  onInspection,
  onUseExisting,
  compact = false,
}: {
  expectedType: "artist" | "venue";
  value: string;
  onChange: (value: string) => void;
  onInspection?: (result: FacebookSourceInspection) => void;
  onUseExisting?: (entity: { entityType: "artist" | "venue"; id: string; name: string }) => void;
  compact?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "checking" | "done" | "error">("idle");
  const [result, setResult] = useState<FacebookSourceInspection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);

  const inspect = useCallback(async (raw?: string) => {
    const input = (raw ?? value).trim();
    if (!input) {
      setPhase("error");
      setMessage("Paste a Facebook page first.");
      return;
    }

    const requestId = ++requestRef.current;
    setPhase("checking");
    setMessage(null);
    const next = await inspectFacebookSource(input, expectedType);
    if (requestRef.current !== requestId) return;

    setResult(next);
    if (!next.ok) {
      setPhase("error");
      setMessage(next.error ?? "We couldn't read that Facebook page.");
      return;
    }

    if (next.facebookUrl) onChange(next.facebookUrl);
    setPhase("done");
    onInspection?.(next);
  }, [expectedType, onChange, onInspection, value]);

  const foundSomething = !!(result?.observed?.name || result?.observed?.imageUrl || result?.existing);
  const warningOnly = result?.ok && !foundSomething;

  return (
    <div className={cn("rounded-2xl border border-line bg-card2", compact ? "p-3" : "p-3.5 sm:p-4")}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card text-[var(--acc)]">
          <Link2 size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-black">Do you know their Facebook page?</div>
          <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-dim">
            Paste the page — or anything Facebook copied. We&apos;ll use whatever we can actually verify.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (phase !== "idle") {
              setPhase("idle");
              setResult(null);
              setMessage(null);
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (!pasted) return;
            // Wait for React's normal paste/change path to settle, but inspect the
            // clipboard payload itself so Facebook share text works immediately.
            window.setTimeout(() => void inspect(pasted), 0);
          }}
          aria-label={`Facebook page for this ${expectedType}`}
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="facebook.com/…"
          className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 py-2.5 text-[14px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]"
        />
        <button
          type="button"
          onClick={() => void inspect()}
          disabled={phase === "checking" || !value.trim()}
          className="bndy-btn flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-3 text-[12px] disabled:opacity-45"
        >
          {phase === "checking" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          <span className="hidden sm:inline">Check</span>
        </button>
      </div>

      <div aria-live="polite" aria-atomic="true">
        {phase === "checking" && (
          <p className="mt-2.5 flex items-center gap-2 text-[11.5px] font-bold text-dim">
            <Loader2 size={13} className="animate-spin" /> Checking the page…
          </p>
        )}

        {phase === "error" && message && (
          <p className="mt-2.5 flex items-start gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[11.5px] font-bold text-txt">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-[var(--acc)]" /> {message}
          </p>
        )}

        {result?.ok && result.existing && (
          <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--acc)_45%,var(--line))] bg-card p-3">
            <div className="flex items-center gap-3">
              {result.observed?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.observed.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-acc text-sm font-black text-on-acc">
                  {result.existing.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.8px] text-[var(--acc-text)]">
                  <CheckCircle2 size={12} /> Already on bndy
                </div>
                <div className="mt-0.5 truncate text-[14px] font-black">{result.existing.name}</div>
                {result.observed?.location && <div className="truncate text-[11.5px] font-semibold text-dim">{result.observed.location}</div>}
              </div>
              {onUseExisting && (
                <button type="button" onClick={() => onUseExisting(result.existing!)} className="bndy-btn shrink-0 px-3 py-2 text-[11.5px]">
                  Use this
                </button>
              )}
            </div>
          </div>
        )}

        {result?.ok && !result.existing && foundSomething && (
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-card p-3">
            {result.observed?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.observed.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card2 text-[var(--acc)]"><CheckCircle2 size={18} /></span>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-black uppercase tracking-[.8px] text-[var(--acc-text)]">Found on Facebook</div>
              {result.observed?.name && <div className="mt-0.5 truncate text-[14px] font-black">{result.observed.name}</div>}
              <div className="mt-0.5 text-[11.5px] font-semibold text-dim">Check what we found, then fill any gaps below.</div>
            </div>
          </div>
        )}

        {warningOnly && (
          <p className="mt-2.5 flex items-start gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-[11.5px] font-semibold text-dim">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--acc)]" />
            We found the Facebook page, but Facebook didn&apos;t expose useful details. No problem — keep going below.
          </p>
        )}
      </div>

      {result?.facebookUrl && (
        <a href={result.facebookUrl} target="_blank" rel="noopener noreferrer" className="mt-2.5 inline-flex min-h-8 items-center gap-1.5 text-[11px] font-bold text-dim hover:text-txt">
          View Facebook page <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}
