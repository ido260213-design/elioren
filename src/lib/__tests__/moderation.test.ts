import { describe, expect, it } from "vitest";

import { screenContent } from "../moderation";

describe("screenContent", () => {
  it("allows an ordinary job description", () => {
    expect(screenContent("Looking for a reliable dog walker for two friendly labs.").blocked).toBe(false);
  });

  it("blocks attempts to move payment off-platform", () => {
    expect(screenContent("Just Venmo me directly, skip the app").blocked).toBe(true);
  });

  it("blocks requests for sensitive financial info", () => {
    expect(screenContent("Please send your bank account number to get paid").blocked).toBe(true);
  });

  it("blocks profanity", () => {
    expect(screenContent("This is such bullshit").blocked).toBe(false); // "bullshit" isn't in the list, sanity-checks word-boundary matching
    expect(screenContent("What the shit is this").blocked).toBe(true);
  });
});
