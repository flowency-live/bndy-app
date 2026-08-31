"use client";

import { ArrowRight, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveJoinState, type JoinEntityType } from "./joinState";

export function ClaimEntityLink({
  entityType,
  entityId,
  entityName,
  location,
  className = "",
}: {
  entityType: JoinEntityType;
  entityId: string;
  entityName: string;
  location?: string;
  className?: string;
}) {
  const router = useRouter();
  const label = `Claim this ${entityType}`;

  const startClaim = () => {
    saveJoinState({
      entityType,
      intent: "claim",
      entityId,
      name: entityName,
      location,
    });
    router.push(`/join/${entityType}`);
  };

  return (
    <button
      type="button"
      onClick={startClaim}
      className={`group inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--acc)]/55 bg-[color-mix(in_srgb,var(--acc)_8%,transparent)] px-3.5 py-2 text-[11px] font-black text-txt transition-colors hover:border-[var(--acc)] hover:bg-[color-mix(in_srgb,var(--acc)_13%,transparent)] ${className}`}
    >
      <BadgeCheck size={14} className="text-[var(--acc-text)]" />
      {label}
      <ArrowRight size={13} className="text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--acc-text)]" />
    </button>
  );
}
