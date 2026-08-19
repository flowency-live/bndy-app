import { describe, expect, it } from "vitest";
import type { Gig } from "../types";
import { blockFestivalGigs, blockSummary, blockTimeLabel, type FestivalBlock } from "../festivalBlocks";

// The two real festivals that forced the rule, in miniature.
function gig(over: Partial<Gig>): Gig {
  return {
    id: Math.random().toString(36).slice(2),
    title: "t",
    venueId: "rigger",
    venueName: "The Rigger",
    date: "2026-10-10",
    location: { lat: 53, lng: -2.2 },
    ticketed: false,
    festivalId: "tiger",
    festivalName: "Tigerfest 2026",
    festivalSlug: "tigerfest-2026",
    ...over,
  } as Gig;
}

describe("blockFestivalGigs", () => {
  it("Tigerfest: five acts at one shared time collapse to ONE block", () => {
    const gigs = ["A", "B", "C", "D", "E"].map((n) => gig({ artistName: n, startTime: "16:00" }));
    const items = blockFestivalGigs(gigs);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("block");
    expect((items[0] as FestivalBlock).gigs).toHaveLength(5);
  });

  it("acts with NO times at all also collapse", () => {
    const items = blockFestivalGigs([gig({ artistName: "A" }), gig({ artistName: "B" })]);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("block");
  });

  it("Congleton: distinct times stay as individual timed gigs", () => {
    const items = blockFestivalGigs([
      gig({ artistName: "A", startTime: "14:00", venueId: "lion", venueName: "Ye Olde White Lion" }),
      gig({ artistName: "B", startTime: "16:00", venueId: "lion", venueName: "Ye Olde White Lion" }),
    ]);
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.kind === "gig")).toBe(true);
  });

  it("a single festival gig at a venue passes through with its time", () => {
    const items = blockFestivalGigs([gig({ artistName: "A", startTime: "14:00" })]);
    expect(items).toEqual([{ kind: "gig", gig: expect.objectContaining({ artistName: "A" }) }]);
  });

  it("a non-festival gig never blocks, even beside festival gigs", () => {
    const items = blockFestivalGigs([
      gig({ artistName: "A", startTime: "16:00" }),
      gig({ artistName: "B", startTime: "16:00" }),
      gig({ artistName: "House band", startTime: "16:00", festivalId: undefined, festivalName: undefined, festivalSlug: undefined }),
    ]);
    expect(items).toHaveLength(2);
    expect(items.filter((i) => i.kind === "block")).toHaveLength(1);
    expect(items.filter((i) => i.kind === "gig")).toHaveLength(1);
  });

  it("two venues on one festival day block independently", () => {
    const items = blockFestivalGigs([
      gig({ artistName: "A", startTime: "16:00" }),
      gig({ artistName: "B", startTime: "16:00" }),
      gig({ artistName: "C", startTime: "16:00", venueId: "tap", venueName: "The Artisan Tap" }),
      gig({ artistName: "D", startTime: "16:00", venueId: "tap", venueName: "The Artisan Tap" }),
    ]);
    expect(items.filter((i) => i.kind === "block")).toHaveLength(2);
  });

  it("acts inside a block order by billingOrder then name, never by fake time", () => {
    const items = blockFestivalGigs([
      gig({ artistName: "Zeta", startTime: "16:00", billingOrder: 2 }),
      gig({ artistName: "Alpha", startTime: "16:00" }),
      gig({ artistName: "Head", startTime: "16:00", billingOrder: 1 }),
    ]);
    const block = items[0] as FestivalBlock;
    expect(block.gigs.map((g) => g.artistName)).toEqual(["Head", "Zeta", "Alpha"]);
  });
});

describe("block labels", () => {
  const base = blockFestivalGigs([gig({ artistName: "A", startTime: "16:00" }), gig({ artistName: "B", startTime: "16:00" })])[0] as FestivalBlock;

  it("start only reads From 4pm", () => {
    expect(blockTimeLabel(base)).toBe("From 4pm");
  });

  it("an end time on any act widens it to a window", () => {
    const withEnd = blockFestivalGigs([
      gig({ artistName: "A", startTime: "16:00" }),
      gig({ artistName: "B", startTime: "16:00", endTime: "20:00" }),
    ])[0] as FestivalBlock;
    expect(blockTimeLabel(withEnd)).toBe("4pm to 8pm");
  });

  it("summary reads like a poster line", () => {
    expect(blockSummary(base)).toBe("2 acts · from 4pm");
  });
});
