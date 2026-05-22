import { describe, expect, it } from "vitest";
import { displayTotalViews } from "./campaign-submissions-overview";

describe("displayTotalViews", () => {
  it("prefers tracked views over eligible or claimed views", () => {
    expect(displayTotalViews({ viewCount: 2_964, claimedViews: 0 })).toBe(2_964);
  });

  it("falls back to claimed views before tracking is available", () => {
    expect(displayTotalViews({ viewCount: null, claimedViews: 500 })).toBe(500);
  });

  it("keeps tracked zero as the real total when a poll returns zero", () => {
    expect(displayTotalViews({ viewCount: 0, claimedViews: 500 })).toBe(0);
  });
});
