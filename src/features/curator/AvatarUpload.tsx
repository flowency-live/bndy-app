"use client";

// Curator photo control (Jason 2026-08-11): change an artist's or venue's
// profile image straight from the page, no edit sheet. Renders only for
// curator/staff; the server re-checks the role on the write.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { curatorApi, useCuratorInvalidate } from "@/lib/curator";
import { uploadImage } from "@/lib/uploadImage";
import { cn } from "@/lib/cn";

export function AvatarUpload({ type, id, className, size = 18 }: {
  type: "artist" | "venue";
  id: string;
  className?: string;
  size?: number;
}) {
  const { isCurator } = useAuth();
  const router = useRouter();
  const invalidate = useCuratorInvalidate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Clear success after 2s
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(false), 2000);
    return () => clearTimeout(t);
  }, [success]);

  if (!isCurator) return null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(false);
    try {
      const url = await uploadImage(file);
      if (type === "artist") await curatorApi.updateArtist(id, { profileImageUrl: url });
      else await curatorApi.updateVenue(id, { profileImageUrl: url });
      await invalidate(type, id);
      router.refresh(); // Re-run server component to show new image
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => !busy && !success && inputRef.current?.click()}
        aria-label="Change photo"
        title="Change photo"
        className={cn(
          "flex items-center justify-center border transition-colors",
          success
            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400"
            : "border-line glass text-dim hover:text-txt",
          className,
        )}
      >
        {busy ? <Loader2 size={size} className="animate-spin" /> : success ? <Check size={size} /> : <Camera size={size} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error && (
        <span role="alert" className="fixed inset-x-4 bottom-24 z-50 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-[12.5px] font-semibold text-red-400 backdrop-blur lg:inset-x-auto lg:right-6 lg:w-80">
          {error}
        </span>
      )}
    </>
  );
}
