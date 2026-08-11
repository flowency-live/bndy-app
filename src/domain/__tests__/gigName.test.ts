import { describe, expect, it } from "vitest";
import { gigDisplayName } from "../gigName";

describe("gigDisplayName", () => {
  it("uses the artist name for a normal gig", () => {
    expect(gigDisplayName({ artistName: "The Ant Hill Mob", title: "x" })).toBe("The Ant Hill Mob");
  });
  it("falls back to the title", () => {
    expect(gigDisplayName({ title: "Charity night" })).toBe("Charity night");
  });
  it("reads a plain open mic with an auto title", () => {
    expect(gigDisplayName({ isOpenMic: true, title: "Open Mic @ The Glebe" })).toBe("Open mic");
  });
  it("reads a hosted open mic with an auto title", () => {
    expect(gigDisplayName({ isOpenMic: true, artistName: "Jonny G", title: "Open Mic @ The Glebe" })).toBe("Open mic with Jonny G");
  });
  it("keeps a custom open mic name", () => {
    expect(gigDisplayName({ isOpenMic: true, artistName: "Jam Halen", title: "Jam Halen JAM Night" })).toBe("Jam Halen JAM Night");
  });
  it("treats a bare 'Open mic' title as auto", () => {
    expect(gigDisplayName({ isOpenMic: true, artistName: "Jonny G", title: "Open Mic" })).toBe("Open mic with Jonny G");
  });
});
