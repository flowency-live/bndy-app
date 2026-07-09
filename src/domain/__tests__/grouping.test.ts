import { describe, expect, it } from "vitest";
import { alphaKey, groupByInitial } from "../grouping";

describe("alphaKey", () => {
  it("uppercases the first letter", () => expect(alphaKey("beatles")).toBe("B"));
  it("buckets digits under #", () => expect(alphaKey("1977")).toBe("#"));
  it("buckets symbols under #", () => expect(alphaKey("!!!")).toBe("#"));
  it("ignores leading whitespace", () => expect(alphaKey("  zed")).toBe("Z"));
});

describe("groupByInitial", () => {
  it("orders # first, then A–Z", () => {
    const names = ["Beatles", "28 Days", "Arctic Monkeys", "$uicideboy", "Zebra"];
    const groups = groupByInitial(names, (n) => n);
    expect(groups.map((g) => g.key)).toEqual(["#", "A", "B", "Z"]);
    expect(groups[0].items).toEqual(["28 Days", "$uicideboy"]);
    expect(groups[1].items).toEqual(["Arctic Monkeys"]);
  });
});
