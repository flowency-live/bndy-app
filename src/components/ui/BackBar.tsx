"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackBar() {
  const router = useRouter();
  return (
    <div className="px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] lg:px-8 lg:pt-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[14px] font-bold text-dim transition-colors hover:text-txt">
        <ChevronLeft size={18} /> Back
      </button>
    </div>
  );
}
