import { GigsHome } from "@/features/gigs/GigsHome";
import { GigsFestivalStrip } from "@/features/festivals/GigsFestivalStrip";

export default function GigsPage() {
  return (
    <div className="bndy-gigs-page">
      <GigsFestivalStrip />
      <GigsHome />
    </div>
  );
}
