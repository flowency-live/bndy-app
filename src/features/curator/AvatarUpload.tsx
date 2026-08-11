"use client";

// Curator photo control (Jason 2026-08-11): change an artist's or venue's
// profile image straight from the page, no edit sheet. Renders only for
// curator/staff; the server re-checks the role on the write.

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
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
  const invalidate = useCuratorInvalidate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isCurator) return null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      if (type === "artist") await curatorApi.updateArtist(id, { profileImageUrl: url });
      else await curatorApi.updateVenue(id, { profileImageUrl: url });
      await invalidate(type, id);
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
        onClick={() => !busy && inputRef.current?.click()}
        aria-label="Change photo"
        title="Change photo"
        className={cn(
          "flex items-center justify-center border border-line glass text-dim transition-colors hover:text-txt",
          className,
        )}
      >
        {busy ? <Loader2 size={size} className="animate-spin" /> : <Camera size={size} />}
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
