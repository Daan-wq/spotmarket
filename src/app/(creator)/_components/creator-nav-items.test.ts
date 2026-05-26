import { describe, expect, it } from "vitest";
import { DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS } from "@/components/layout/dashboard-shell";
import { CREATOR_BOTTOM_NAV_ITEMS } from "./creator-nav-items";
import {
  MOBILE_CREATOR_BOTTOM_NAV_CLASS,
  MOBILE_CREATOR_TOP_CHROME_CLASS,
} from "./mobile-creator-chrome";

describe("creator mobile bottom navigation", () => {
  it("keeps payments in the fixed mobile nav", () => {
    expect(CREATOR_BOTTOM_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/creator/campaigns",
      "/creator/connections",
      "/creator/videos",
      "/creator/payouts",
    ]);
  });

  it("anchors the bottom nav to the mobile safe area", () => {
    expect(MOBILE_CREATOR_BOTTOM_NAV_CLASS.split(" ")).toEqual(
      expect.arrayContaining([
        "fixed",
        "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
        "lg:hidden",
      ]),
    );
    expect(MOBILE_CREATOR_BOTTOM_NAV_CLASS).not.toContain("sticky");
  });
});

describe("creator mobile top navigation", () => {
  it("keeps the top chrome sticky at the top of the page", () => {
    expect(MOBILE_CREATOR_TOP_CHROME_CLASS.split(" ")).toEqual(
      expect.arrayContaining([
        "sticky",
        "top-0",
        "border-b",
        "bg-white/95",
        "backdrop-blur",
      ]),
    );
    expect(MOBILE_CREATOR_TOP_CHROME_CLASS).not.toContain("fixed");
  });
});

describe("creator dashboard mobile chrome wrapper", () => {
  it("does not create a positioned containing context around fixed mobile nav", () => {
    expect(DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["lg:hidden"]),
    );
    expect(DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS).not.toContain("sticky");
    expect(DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS).not.toContain("fixed");
    expect(DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS).not.toContain("transform");
    expect(DASHBOARD_MOBILE_CHROME_WRAPPER_CLASS).not.toContain("backdrop-blur");
  });
});
