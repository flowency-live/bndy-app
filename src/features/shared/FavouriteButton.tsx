"use client";

import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites, useToggleFavourite } from "@/lib/favourites";
import type { FavouriteType } from "@/lib/auth/authApi";

export function FavouriteButton({
  type,
  id,
  name,
  size = 16,
  className,
}: {
  type: FavouriteType;
  id: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const { isAuthenticated } = useAuth();
  const { isFavourite } = useFavourites();
  const toggle = useToggleFavourite();
  const router = useRouter();
  const path = usePathname();
  const on = isFavourite(type, id);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent(path || "/")}`);
      return;
    }
    toggle({ type, id, favourite: !on });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={on ? `Remove ${name} from favourites` : `Add ${name} to favourites`}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-white backdrop-blur-sm transition-[color,transform] active:scale-95",
        className,
      )}
    >
      <Heart size={size} fill={on ? "currentColor" : "none"} strokeWidth={2.5} />
    </button>
  );
}
