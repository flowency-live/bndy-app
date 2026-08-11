import { describe, expect, it } from "vitest";
import { gigDisplayName } from "../gigName";

describe("gigDisplayName", () => {
  it("uses the artist name for a normal gig", () => {
    expect(gigDisplayName({ artistName: "The Ant Hill Mob", title: "x" })).toBe("The Ant Hill Mob");
  });
  it("falls back to the title", () => {
    expect(gigDisplayName({ title: "Charity night" })).toBe("Charity night");
  });
  it("reads a plain open mic", () => {
    expect(gigDisplayName({ isOpenMic: true, title: "Open Mic @ The Glebe" })).toBe("Open mic");
  });
  it("reads a hosted open mic", () => {
    expect(gigDisplayName({ isOpenMic: true, artistName: "Jonny G", title: "x" })).toBe("Open mic with Jonny G");
  });
});
