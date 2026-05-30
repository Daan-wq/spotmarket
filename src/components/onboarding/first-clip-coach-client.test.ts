import { describe, expect, it } from "vitest";
import { shouldRenderFirstClipCoach, shouldShowFirstClipCoach } from "./first-clip-coach-client";

describe("shouldShowFirstClipCoach", () => {
  it.each([
    "/creator/dashboard",
    "/creator/connections",
    "/creator/campaigns",
    "/creator/campaigns/campaign-1",
    "/creator/applications/application-1/submit",
    "/creator/videos",
  ])("shows the coach on %s", (pathname) => {
    expect(shouldShowFirstClipCoach(pathname)).toBe(true);
  });

  it.each([
    "/creator/payouts",
    "/creator/referral",
    "/creator/applications/application-1",
    "/admin",
  ])("hides the coach on %s", (pathname) => {
    expect(shouldShowFirstClipCoach(pathname)).toBe(false);
  });

  it("hides the coach once the first clip flow is done", () => {
    expect(
      shouldRenderFirstClipCoach("/creator/campaigns", { nextStep: "done" }),
    ).toBe(false);
    expect(
      shouldRenderFirstClipCoach("/creator/campaigns", { nextStep: "join_campaign" }),
    ).toBe(true);
  });
});
