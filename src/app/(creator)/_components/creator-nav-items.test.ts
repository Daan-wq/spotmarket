import { describe, expect, it } from "vitest";
import { CREATOR_BOTTOM_NAV_ITEMS } from "./creator-nav-items";

describe("creator mobile bottom navigation", () => {
  it("keeps payments in the fixed mobile nav", () => {
    expect(CREATOR_BOTTOM_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/creator/campaigns",
      "/creator/connections",
      "/creator/videos",
      "/creator/payouts",
    ]);
  });
});
