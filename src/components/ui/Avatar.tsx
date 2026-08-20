"use client";

import { avatarGradient, initials } from "@/domain/avatar";
import { useState, type ReactNode } from "react";

export function Avatar({
  id, name, src, size = 52, radius = 13, icon,
}: {
  id: string; name: string; src?: string | null; size?: number; radius?: number; icon?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = !!src && !failed;
  return (
    <div
      className="relative flex flex-shrink-0 items-center justify-center overflow-hidden font-black text-white"
      style={{ width: size, height: size, borderRadius: radius, background: avatarGradient(id), fontSize: size * 0.36 }}
    >
      {!showImg && <span className="relative z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,.95)]">{icon ?? initials(name)}</span>}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src!} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {!showImg && <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.06), rgba(0,0,0,.24)), radial-gradient(circle at 32% 26%, rgba(255,255,255,.22), transparent 52%)" }} />}
    </div>
  );
}
