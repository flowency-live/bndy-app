import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../wizardApi", () => ({
  inspectFacebookSource: vi.fn(),
}));

import { FacebookSourceAssist } from "../FacebookSourceAssist";
import { inspectFacebookSource } from "../wizardApi";

const inspectMock = vi.mocked(inspectFacebookSource);

function renderAssist(overrides?: Partial<React.ComponentProps<typeof FacebookSourceAssist>>) {
  const onChange = vi.fn();
  const onInspection = vi.fn();
  const onUseExisting = vi.fn();

  render(
    <FacebookSourceAssist
      expectedType="artist"
      value="https://facebook.com/share/AbCdEf123/?mibextid=foo"
      onChange={onChange}
      onInspection={onInspection}
      onUseExisting={onUseExisting}
      {...overrides}
    />,
  );

  return { onChange, onInspection, onUseExisting };
}

async function clickCheck() {
  fireEvent.click(screen.getByRole("button", { name: /check/i }));
  await waitFor(() => expect(inspectMock).toHaveBeenCalledTimes(1));
}

describe("FacebookSourceAssist identity safety", () => {
  beforeEach(() => {
    inspectMock.mockReset();
  });

  it("keeps raw typed/share input local until the backend verifies it", () => {
    const { onChange } = renderAssist({ value: "" });
    const input = screen.getByLabelText("Facebook page for this artist") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "https://facebook.com/share/RawToken123" } });

    expect(input.value).toBe("https://facebook.com/share/RawToken123");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("replaces pasted share text with the resolved stable Facebook identity", async () => {
    inspectMock.mockResolvedValue({
      ok: true,
      sourceUrl: "https://facebook.com/share/AbCdEf123/?mibextid=foo",
      facebookUrl: "https://www.facebook.com/the.torrists",
      facebookKey: "facebook.com/the.torrists",
      identityResolved: true,
      existing: null,
      observed: { name: "The Torrists", imageUrl: null, description: "Live rock band from Stoke-on-Trent." },
      evidence: { name: "facebook_html_meta", description: "facebook_html_meta", canonicalUrl: "facebook_resolved_identity" },
      warnings: [],
    });

    const { onChange, onInspection } = renderAssist();
    await clickCheck();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("https://www.facebook.com/the.torrists");
      expect(onInspection).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Found on Facebook")).toBeDefined();
    expect(screen.getByText("Live rock band from Stoke-on-Trent.")).toBeDefined();
    expect(screen.getByRole("link", { name: /view facebook page/i }).getAttribute("href")).toBe("https://www.facebook.com/the.torrists");
  });

  it("labels a handle-derived name as a starting hint rather than verified Facebook data", async () => {
    inspectMock.mockResolvedValue({
      ok: true,
      sourceUrl: "https://www.facebook.com/soulskunks",
      facebookUrl: "https://www.facebook.com/soulskunks",
      facebookKey: "facebook.com/soulskunks",
      identityResolved: true,
      existing: null,
      observed: { name: "Soulskunks", imageUrl: null },
      evidence: { name: "facebook_handle_hint", canonicalUrl: "facebook_identity" },
      warnings: [],
    });

    const { onChange, onInspection } = renderAssist({ value: "https://www.facebook.com/soulskunks" });
    await clickCheck();

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("https://www.facebook.com/soulskunks");
      expect(onInspection).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText("Facebook page recognised")).toBeDefined();
    expect(screen.getByText("Soulskunks")).toBeDefined();
    expect(screen.getByText(/used the page handle as a starting name/i)).toBeDefined();
    expect(screen.queryByText("Found on Facebook")).toBeNull();
  });

  it("never passes an unresolved share token into the entity form", async () => {
    inspectMock.mockResolvedValue({
      ok: true,
      sourceUrl: "https://facebook.com/share/AbCdEf123/?mibextid=foo",
      facebookUrl: null,
      facebookKey: null,
      identityResolved: false,
      existing: null,
      observed: { name: null, imageUrl: null },
      evidence: {},
      warnings: ["facebook_identity_unresolved"],
    });

    const { onChange, onInspection } = renderAssist();
    await clickCheck();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(""));
    expect(onInspection).not.toHaveBeenCalled();
    expect(screen.getByText(/didn't resolve to a stable page/i)).toBeDefined();
    expect(screen.queryByRole("link", { name: /view facebook page/i })).toBeNull();
  });

  it("keeps the manual flow intact when the inspector returns an error", async () => {
    inspectMock.mockResolvedValue({
      ok: false,
      error: "Facebook could not be reached right now.",
    });

    const { onChange, onInspection } = renderAssist({ value: "https://www.facebook.com/the.torrists" });
    await clickCheck();

    expect(await screen.findByText("Facebook could not be reached right now.")).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();
    expect(onInspection).not.toHaveBeenCalled();
  });

  it("recovers from a rejected network request instead of getting stuck checking", async () => {
    inspectMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const { onChange, onInspection } = renderAssist({ value: "" });
    const input = screen.getByLabelText("Facebook page for this artist") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "https://facebook.com/share/RawToken123" } });
    await clickCheck();

    expect(await screen.findByText("We couldn't check Facebook right now. You can keep going without it.")).toBeDefined();
    expect(input.value).toBe("https://facebook.com/share/RawToken123");
    expect(screen.queryByText("Checking the page…")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(onInspection).not.toHaveBeenCalled();
  });

  it("offers an exact existing artist only after stable identity resolution", async () => {
    inspectMock.mockResolvedValue({
      ok: true,
      sourceUrl: "https://facebook.com/share/AbCdEf123/?mibextid=foo",
      facebookUrl: "https://www.facebook.com/the.torrists",
      facebookKey: "facebook.com/the.torrists",
      identityResolved: true,
      existing: { entityType: "artist", id: "artist-123", name: "The Torrists" },
      observed: { name: "The Torrists", imageUrl: null, location: "Stoke-on-Trent" },
      evidence: { name: "bndy_existing_artist", canonicalUrl: "bndy_existing_artist" },
      warnings: [],
    });

    const { onUseExisting } = renderAssist();
    await clickCheck();

    expect(await screen.findByText("Already on bndy")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Use this" }));
    expect(onUseExisting).toHaveBeenCalledWith({ entityType: "artist", id: "artist-123", name: "The Torrists" });
  });
});
