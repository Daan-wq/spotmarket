import { describe, expect, it } from "vitest";
import { CREATOR_BOTTOM_NAV_ITEMS } from "./creator-nav-items";
import { MOBILE_CREATOR_TOP_CHROME_CLASS } from "./mobile-creator-chrome";

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

describe("creator mobile top navigation", () => {
  it("keeps the top chrome fixed to the viewport", () => {
    expect(MOBILE_CREATOR_TOP_CHROME_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["fixed", "top-0"]),
    );
    expect(MOBILE_CREATOR_TOP_CHROME_CLASS).not.toContain("sticky");
  });
});
