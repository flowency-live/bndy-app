import { describe, expect, it } from "vitest";
import {
  billTitle,
  hasBill,
  headlineActs,
  lineupLabel,
  lineupOf,
  supportActs,
  supportChipLabel,
  supportingLabel,
} from "../lineup";
import type { Gig } from "../types";

const base: Gig = {
  id: "g1",
  title: "The Torrists @ The Glebe",
  venueId: "v1",
  venueName: "The Glebe",
  date: "2026-09-05",
  startTime: "20:00",
  location: { lat: 53, lng: -2.2 },
  ticketed: false,
};

/** A gig created before feature 12: one artist, no bill fields at all. */
const legacy: Gig = { ...base, artistId: "a1", artistName: "The Torrists" };

/** Headliner plus two support acts. */
const withSupport: Gig = {
  ...base,
  artistId: "a1",
  artistName: "The Torrists",
  artistIds: ["a1", "a2", "a3"],
  artistNames: ["The Torrists", "Dead Ringer", "Small Hours"],
  headlineArtistIds: ["a1"],
};

/** Co-headline: every act billed as headline. */
const coHeadline: Gig = {
  ...base,
  artistId: "a1",
  artistName: "The Torrists",
  artistIds: ["a1", "a2"],
  artistNames: ["The Torrists", "Dead Ringer"],
  headlineArtistIds: ["a1", "a2"],
};

const openMic: Gig = { ...base, title: "Open Mic @ The Glebe", isOpenMic: true };

describe("lineupOf", () => {
  it("reads a legacy single-act gig as one headline act", () => {
    expect(lineupOf(legacy)).toEqual([{ id: "a1", name: "The Torrists", headline: true }]);
  });

  it("keeps display order and marks support acts", () => {
    expect(lineupOf(withSupport).map((a) => [a.name, a.headline])).toEqual([
      ["The Torrists", true],
      ["Dead Ringer", false],
      ["Small Hours", false],
    ]);
  });

  it("allows every act to be headline", () => {
    expect(lineupOf(coHeadline).every((a) => a.headline)).toBe(true);
  });

  it("returns nothing for an open mic with no host", () => {
    expect(lineupOf(openMic)).toEqual([]);
  });

  it("does not render an empty name when a name fails to resolve", () => {
    const gappy: Gig = { ...base, artistId: "a1", artistIds: ["a1", "a2"], artistNames: ["Only One"] };
    expect(lineupOf(gappy)[1].name).toBe("Unknown act");
  });
});

describe("headlineActs and supportActs", () => {
  it("splits a supported bill", () => {
    expect(headlineActs(withSupport).map((a) => a.name)).toEqual(["The Torrists"]);
    expect(supportActs(withSupport).map((a) => a.name)).toEqual(["Dead Ringer", "Small Hours"]);
  });

  it("leaves no support act on a co-headline bill", () => {
    expect(supportActs(coHeadline)).toEqual([]);
  });

  it("falls back to act 1 when nothing is marked headline", () => {
    const broken: Gig = { ...withSupport, headlineArtistIds: [] };
    expect(headlineActs(broken).map((a) => a.name)).toEqual(["The Torrists"]);
  });

  it("falls back to act 1 when headlineArtistIds names an act not on the bill", () => {
    const broken: Gig = { ...withSupport, headlineArtistIds: ["ghost"] };
    expect(headlineActs(broken).map((a) => a.name)).toEqual(["The Torrists"]);
    expect(supportActs(broken).map((a) => a.name)).toEqual(["Dead Ringer", "Small Hours"]);
  });
});

describe("lineupLabel", () => {
  it("one act", () => expect(lineupLabel(legacy)).toBe("The Torrists"));
  it("two headliners", () => expect(lineupLabel(coHeadline)).toBe("The Torrists + Dead Ringer"));
  it("three headliners", () => {
    const three: Gig = {
      ...base,
      artistId: "a1",
      artistIds: ["a1", "a2", "a3"],
      artistNames: ["A", "B", "C"],
      headlineArtistIds: ["a1", "a2", "a3"],
    };
    expect(lineupLabel(three)).toBe("A + B + C");
  });
  it("hides support acts from the label", () => expect(lineupLabel(withSupport)).toBe("The Torrists"));
  it("open mic", () => expect(lineupLabel(openMic)).toBe("Open mic"));

  it("never contains an em-dash", () => {
    for (const g of [legacy, withSupport, coHeadline, openMic]) {
      expect(lineupLabel(g)).not.toContain(" - ");
    }
  });
});

describe("supportChipLabel", () => {
  it("empty with no support", () => expect(supportChipLabel(coHeadline)).toBe(""));
  it("singular", () => {
    const one: Gig = { ...withSupport, artistIds: ["a1", "a2"], artistNames: ["The Torrists", "Dead Ringer"] };
    expect(supportChipLabel(one)).toBe("+1 act");
  });
  it("plural", () => expect(supportChipLabel(withSupport)).toBe("+2 acts"));
});

describe("supportingLabel", () => {
  it("names the headliner for a support act", () => {
    expect(supportingLabel(withSupport, "a2")).toBe("Supporting The Torrists");
  });
  it("is empty for the headliner", () => expect(supportingLabel(withSupport, "a1")).toBe(""));
  it("is empty on a single-act gig", () => expect(supportingLabel(legacy, "a1")).toBe(""));
  it("is empty on a co-headline bill", () => expect(supportingLabel(coHeadline, "a2")).toBe(""));
  it("names both headliners when there are two", () => {
    const g: Gig = {
      ...base,
      artistId: "a1",
      artistIds: ["a1", "a2", "a3"],
      artistNames: ["A", "B", "C"],
      headlineArtistIds: ["a1", "a2"],
    };
    expect(supportingLabel(g, "a3")).toBe("Supporting A + B");
  });
});

describe("hasBill", () => {
  it("false for one act", () => expect(hasBill(legacy)).toBe(false));
  it("true for several", () => expect(hasBill(withSupport)).toBe(true));
});

describe("billTitle", () => {
  const acts = [
    { id: "a1", name: "The Torrists" },
    { id: "a2", name: "Dead Ringer" },
  ];
  it("one act", () => expect(billTitle([acts[0]], "The Glebe")).toBe("The Torrists @ The Glebe"));
  it("headliner plus support keeps the headliner alone", () => {
    expect(billTitle(acts, "The Glebe", ["a1"])).toBe("The Torrists @ The Glebe");
  });
  it("co-headline joins both", () => {
    expect(billTitle(acts, "The Glebe", ["a1", "a2"])).toBe("The Torrists + Dead Ringer @ The Glebe");
  });
  it("defaults to act 1 as headliner", () => {
    expect(billTitle(acts, "The Glebe")).toBe("The Torrists @ The Glebe");
  });
  it("is empty without a venue", () => expect(billTitle(acts, undefined)).toBe(""));
});
