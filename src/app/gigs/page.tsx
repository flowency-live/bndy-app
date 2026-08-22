import { redirect } from "next/navigation";
import { GigsHome } from "@/features/gigs/GigsHome";
import { GigsFestivalStrip } from "@/features/festivals/GigsFestivalStrip";

export default function GigsPage() {
  if (process.env.NEXT_PUBLIC_BNDY_EDITION === "brass") redirect("/concerts");
  return (
    <div className="bndy-gigs-page">
      <GigsFestivalStrip />
      <GigsHome />
    </div>
  );
}
