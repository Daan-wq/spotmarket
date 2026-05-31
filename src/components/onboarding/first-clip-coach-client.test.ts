import { describe, expect, it } from "vitest";
import {
  shouldRenderFirstClipCoach,
  shouldShowFirstClipCoach,
  shouldStartFirstClipTour,
} from "./first-clip-coach-client";

describe("shouldShowFirstClipCoach", () => {
  it.each([
    "/creator/dashboard",
    "/creator/connections",
    "/creator/campaigns",
    "/creator/campaigns/campaign-1",
    "/creator/applications/application-1/submit",
    "/creator/videos",
    "/creator/payouts",
    "/creator/referral",
  ])("makes the first-clip tour controller available on %s", (pathname) => {
    expect(shouldShowFirstClipCoach(pathname)).toBe(true);
  });

  it.each([
    "/admin",
    "/sign-in",
    "/onboarding",
  ])("hides the first-clip tour controller on %s", (pathname) => {
    expect(shouldShowFirstClipCoach(pathname)).toBe(false);
  });

  it("hides the controller once the first clip flow is done", () => {
    expect(
      shouldRenderFirstClipCoach("/creator/campaigns", { nextStep: "done" }),
    ).toBe(false);
    expect(
      shouldRenderFirstClipCoach("/creator/campaigns", { nextStep: "join_campaign" }),
    ).toBe(true);
  });
});

describe("shouldStartFirstClipTour", () => {
  it("starts from the onboarding CTA query", () => {
    expect(shouldStartFirstClipTour("1", null)).toBe(true);
  });

  it("starts from a valid requested tour step", () => {
    expect(shouldStartFirstClipTour(null, "nav_campaigns")).toBe(true);
  });

  it("does not auto-start on regular creator visits", () => {
    expect(shouldStartFirstClipTour(null, null)).toBe(false);
    expect(shouldStartFirstClipTour("0", "missing")).toBe(false);
  });
});
