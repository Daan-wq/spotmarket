import { describe, expect, it } from "vitest";
import {
  FIRST_CLIP_TOUR_STEPS,
  getFirstClipTourStorageKey,
  getFirstClipTourStepById,
  getFirstClipTourStepHref,
  getFirstClipTourStepsForStatus,
  isFirstClipTourActionStep,
  matchesFirstClipTourRouteName,
  parseFirstClipTourStorage,
  readFirstClipTourStorage,
  resolveFirstClipTourVisibleStepId,
  withFirstClipTourQuery,
  writeFirstClipTourStorage,
} from "./first-clip-tour";
import type { FirstClipOnboardingStatus } from "./first-clip-onboarding";

const submitStatus: FirstClipOnboardingStatus = {
  discordConnected: true,
  accountConnected: true,
  hasJoinedCampaign: true,
  firstClipSubmitted: false,
  testOverrideActive: false,
  joinedApplicationId: "application-1",
  nextStep: "submit_clip",
  nextHref: "/creator/applications/application-1/submit?firstClip=1",
};

const navigationStepIds = [
  "nav_campaigns",
  "nav_connections",
  "nav_videos",
  "nav_payouts",
  "nav_referral",
];

describe("first-clip tour model", () => {
  it("keeps the tour ordered from sidebar pages to final submit action", () => {
    expect(FIRST_CLIP_TOUR_STEPS.map((step) => step.id)).toEqual([
      ...navigationStepIds,
      "discord_cta",
      "social_connect",
      "campaign_guide",
      "campaign_card",
      "campaign_join",
      "submit_platform",
      "submit_account",
      "submit_refresh",
      "submit_post",
      "submit_action",
    ]);
  });

  it("scopes the visible steps to the creator's next first-clip action", () => {
    expect(getFirstClipTourStepsForStatus("connect_account").map((step) => step.id)).toEqual([
      ...navigationStepIds,
      "social_connect",
    ]);
    expect(getFirstClipTourStepsForStatus("submit_clip").map((step) => step.id)).toEqual([
      ...navigationStepIds,
      "submit_platform",
      "submit_account",
      "submit_refresh",
      "submit_post",
      "submit_action",
    ]);
    expect(getFirstClipTourStepsForStatus("done")).toEqual([]);
  });

  it("keeps the campaign join spotlight on campaign detail pages", () => {
    expect(
      getFirstClipTourStepsForStatus("join_campaign", "/creator/campaigns").map((step) => step.id),
    ).toEqual([...navigationStepIds, "campaign_guide", "campaign_card"]);
    expect(
      getFirstClipTourStepsForStatus("join_campaign", "/creator/campaigns/campaign-1").map((step) => step.id),
    ).toEqual([...navigationStepIds, "campaign_join"]);
  });

  it("filters locally skipped explanation steps without completing real requirements", () => {
    expect(
      getFirstClipTourStepsForStatus("discord", "/creator/dashboard", [
        "nav_campaigns",
        "discord_cta",
      ]).map((step) => step.id),
    ).toEqual([
      "nav_connections",
      "nav_videos",
      "nav_payouts",
      "nav_referral",
    ]);
  });

  it("classifies sidebar steps separately from first-clip action steps", () => {
    expect(isFirstClipTourActionStep("nav_campaigns")).toBe(false);
    expect(isFirstClipTourActionStep("discord_cta")).toBe(true);
  });

  it("matches creator routes without leaking into unrelated pages", () => {
    expect(matchesFirstClipTourRouteName("connections", "/creator/connections")).toBe(true);
    expect(matchesFirstClipTourRouteName("campaigns", "/creator/campaigns")).toBe(true);
    expect(matchesFirstClipTourRouteName("videos", "/creator/videos")).toBe(true);
    expect(matchesFirstClipTourRouteName("payouts", "/creator/payouts")).toBe(true);
    expect(matchesFirstClipTourRouteName("referral", "/creator/referral")).toBe(true);
    expect(matchesFirstClipTourRouteName("campaign_detail", "/creator/campaigns/campaign-1")).toBe(true);
    expect(matchesFirstClipTourRouteName("submit", "/creator/applications/application-1/submit")).toBe(true);
    expect(matchesFirstClipTourRouteName("campaigns", "/creator/campaigns/campaign-1")).toBe(false);
    expect(matchesFirstClipTourRouteName("creator_shell", "/admin")).toBe(false);
  });

  it("falls back to the first available target on the current route", () => {
    const steps = getFirstClipTourStepsForStatus("submit_clip");
    const visible = resolveFirstClipTourVisibleStepId({
      steps,
      requestedStepId: "submit_refresh",
      pathname: "/creator/applications/application-1/submit",
      hasTarget: (step) => step.id === "submit_account",
    });

    expect(visible).toBe("submit_account");
  });

  it("builds route links with first-clip tour context", () => {
    const step = getFirstClipTourStepById("submit_refresh");

    expect(step).toBeDefined();
    expect(withFirstClipTourQuery(getFirstClipTourStepHref(step!, submitStatus), step!.id)).toBe(
      "/creator/applications/application-1/submit?firstClip=1&firstClipTour=submit_refresh",
    );
    expect(
      withFirstClipTourQuery(
        "/creator/applications/application-1/submit?firstClip=1&firstClipTour=submit_post",
        "submit_action",
      ),
    ).toBe(
      "/creator/applications/application-1/submit?firstClip=1&firstClipTour=submit_action",
    );
  });
});

describe("first-clip tour storage", () => {
  it("uses a scoped versioned storage key", () => {
    expect(getFirstClipTourStorageKey("user-1")).toBe(
      "clipprofit:first-clip-tour:user-1:v2",
    );
  });

  it("parses invalid, stale, and duplicate storage safely", () => {
    expect(parseFirstClipTourStorage("{nope")).toMatchObject({
      dismissed: false,
      completed: false,
      activeStepId: null,
      skippedStepIds: [],
    });
    expect(parseFirstClipTourStorage(JSON.stringify({ activeStepId: "missing" }))).toMatchObject({
      activeStepId: null,
    });
    expect(
      parseFirstClipTourStorage(
        JSON.stringify({ skippedStepIds: ["nav_campaigns", "missing", "nav_campaigns"] }),
      ).skippedStepIds,
    ).toEqual(["nav_campaigns"]);
  });

  it("reads and writes browser storage state", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };

    writeFirstClipTourStorage(storage, "user-1", {
      dismissed: true,
      completed: false,
      activeStepId: "campaign_card",
      skippedStepIds: ["nav_campaigns"],
      updatedAt: "2026-05-30T00:00:00.000Z",
    });

    expect(readFirstClipTourStorage(storage, "user-1")).toEqual({
      dismissed: true,
      completed: false,
      activeStepId: "campaign_card",
      skippedStepIds: ["nav_campaigns"],
      updatedAt: "2026-05-30T00:00:00.000Z",
    });
  });

  it("treats unavailable browser storage as optional", () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };

    expect(readFirstClipTourStorage(storage, "user-1")).toMatchObject({
      dismissed: false,
      completed: false,
      activeStepId: null,
      skippedStepIds: [],
    });
    expect(() =>
      writeFirstClipTourStorage(storage, "user-1", {
        dismissed: false,
        completed: false,
        activeStepId: null,
        skippedStepIds: [],
        updatedAt: null,
      }),
    ).not.toThrow();
  });
});
