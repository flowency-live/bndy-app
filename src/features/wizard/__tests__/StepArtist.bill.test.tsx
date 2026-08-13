// Feature 12 regression guard.
//
// The one rule that must never break: with the "Several acts on this bill" box
// CLEAR, picking an act calls onPickExisting, which is what makes the wizard
// advance to "When" on the first tap. 80% of gigs are one act. If this test
// fails, the simple path has been slowed down and the work is not finished.

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StepArtist } from "../StepArtist";

const ARTISTS = [
  { id: "a1", name: "The Torrists", location: "Stoke-on-Trent", profileImageUrl: null },
  { id: "a2", name: "Torrent Head", location: "Crewe", profileImageUrl: null },
];

vi.mock("@/lib/hooks", () => ({
  useArtists: () => ({ data: ARTISTS }),
  useUpcomingGigs: () => ({ data: [] }),
  useVenues: () => ({ data: [] }),
}));

// Loaded at module scope by the new-artist form. Never called in these tests.
vi.mock("../wizardApi", () => ({
  placesSuggest: vi.fn(async () => []),
  resolveArtist: vi.fn(async () => ({ action: "error", candidates: [] })),
}));

const handlers = () => ({
  onPickExisting: vi.fn(),
  onPickNew: vi.fn(),
  onPickOpenMic: vi.fn(),
  onBillChange: vi.fn(),
  onBillDone: vi.fn(),
});

/** Type enough to rank The Torrists into the list, then tap it. */
function searchAndPick(name: string) {
  fireEvent.change(screen.getByLabelText("Search for an artist"), { target: { value: "torr" } });
  fireEvent.click(screen.getByText(name));
}

describe("StepArtist, single act path", () => {
  let h: ReturnType<typeof handlers>;
  beforeEach(() => { h = handlers(); });

  it("picking an act advances, and does not touch the bill", () => {
    render(<StepArtist {...h} />);
    searchAndPick("The Torrists");
    expect(h.onPickExisting).toHaveBeenCalledTimes(1);
    expect(h.onPickExisting).toHaveBeenCalledWith({ id: "a1", name: "The Torrists" });
    expect(h.onBillChange).not.toHaveBeenCalled();
  });

  it("offers the bill checkbox but leaves it clear", () => {
    render(<StepArtist {...h} />);
    expect(screen.getByText("Several acts on this bill")).toBeDefined();
    expect(screen.getByTitle("Add more than one act to this gig").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("StepArtist, bill mode", () => {
  let h: ReturnType<typeof handlers>;
  beforeEach(() => { h = handlers(); });

  const tickBox = () => fireEvent.click(screen.getByTitle("Add more than one act to this gig"));

  it("stops advancing once the box is ticked", () => {
    render(<StepArtist {...h} />);
    tickBox();
    searchAndPick("The Torrists");
    expect(h.onPickExisting).not.toHaveBeenCalled();
    expect(h.onBillChange).toHaveBeenCalledWith([{ id: "a1", name: "The Torrists" }], ["a1"], true);
  });

  it("defaults act 1 to headline and act 2 to support", () => {
    render(<StepArtist {...h} bill={[{ id: "a1", name: "The Torrists" }]} headlineIds={["a1"]} initialMultiAct />);
    searchAndPick("Torrent Head");
    expect(h.onBillChange).toHaveBeenCalledWith(
      [{ id: "a1", name: "The Torrists" }, { id: "a2", name: "Torrent Head" }],
      ["a1"],
      true,
    );
  });

  it("lets every act be headline", () => {
    const bill = [{ id: "a1", name: "The Torrists" }, { id: "a2", name: "Torrent Head" }];
    render(<StepArtist {...h} bill={bill} headlineIds={["a1"]} initialMultiAct />);
    fireEvent.click(screen.getByText("Support"));
    expect(h.onBillChange).toHaveBeenCalledWith(bill, ["a1", "a2"], true);
  });

  it("never leaves a bill with zero headliners", () => {
    const bill = [{ id: "a1", name: "The Torrists" }, { id: "a2", name: "Torrent Head" }];
    render(<StepArtist {...h} bill={bill} headlineIds={["a1"]} initialMultiAct />);
    fireEvent.click(screen.getByText("Headline"));
    expect(h.onBillChange).toHaveBeenCalledWith(bill, ["a1"], true);
  });

  it("promotes act 2 when act 1 is removed", () => {
    const bill = [{ id: "a1", name: "The Torrists" }, { id: "a2", name: "Torrent Head" }];
    render(<StepArtist {...h} bill={bill} headlineIds={["a1"]} initialMultiAct />);
    fireEvent.click(screen.getByLabelText("Remove The Torrists"));
    expect(h.onBillChange).toHaveBeenCalledWith([{ id: "a2", name: "Torrent Head" }], ["a2"], true);
  });

  it("caps the bill at four acts and hides the search", () => {
    const bill = [1, 2, 3, 4].map((n) => ({ id: `x${n}`, name: `Act ${n}` }));
    render(<StepArtist {...h} bill={bill} headlineIds={["x1"]} initialMultiAct />);
    expect(screen.queryByLabelText("Search for an artist")).toBeNull();
    expect(screen.getByText("4 acts is the limit. A bigger bill is a festival.")).toBeDefined();
  });

  it("clearing the box drops the bill back to act 1", () => {
    const bill = [{ id: "a1", name: "The Torrists" }, { id: "a2", name: "Torrent Head" }];
    render(<StepArtist {...h} bill={bill} headlineIds={["a1"]} initialMultiAct />);
    fireEvent.click(screen.getByTitle("Add more than one act to this gig"));
    expect(h.onBillChange).toHaveBeenCalledWith([{ id: "a1", name: "The Torrists" }], ["a1"], false);
  });

  it("puts a brand new act on the bill as act 1, tagged New", () => {
    // A new act has no id until publish. It still anchors a bill: the sentinel
    // carries the billing chip, and WizardShell swaps in the real id at publish.
    render(<StepArtist {...h} bill={[{ id: "__new__", name: "Brand New Band" }]} headlineIds={["__new__"]} initialMultiAct />);
    expect(screen.getByText("Brand New Band")).toBeDefined();
    expect(screen.getByText("New")).toBeDefined();
    expect(screen.getByText("Headline")).toBeDefined();
  });

  it("adds a support act to a brand new act 1", () => {
    render(<StepArtist {...h} bill={[{ id: "__new__", name: "Brand New Band" }]} headlineIds={["__new__"]} initialMultiAct />);
    searchAndPick("The Torrists");
    expect(h.onBillChange).toHaveBeenCalledWith(
      [{ id: "__new__", name: "Brand New Band" }, { id: "a1", name: "The Torrists" }],
      ["__new__"],
      true,
    );
  });
});

describe("StepArtist, open mic", () => {
  it("hides the bill checkbox: an open mic has a host, not a bill", () => {
    const h = handlers();
    render(<StepArtist {...h} initialOpenMic />);
    expect(screen.queryByTitle("Add more than one act to this gig")).toBeNull();
  });
});
