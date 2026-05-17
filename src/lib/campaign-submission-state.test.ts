import { describe, expect, test } from "vitest";
import {
  getCampaignDeadlineState,
  isCampaignClosedForSubmissions,
} from "./campaign-submission-state";

const NOW = new Date("2026-05-17T12:00:00.000Z");

describe("campaign submission state", () => {
  test("keeps active campaigns submittable through the deadline day", () => {
    expect(
      isCampaignClosedForSubmissions({
        status: "active",
        deadline: "2026-05-17T00:00:00.000Z",
        now: NOW,
      }),
    ).toBe(false);
    expect(getCampaignDeadlineState("2026-05-17T00:00:00.000Z", NOW).label).toBe(
      "Ends today",
    );
  });

  test("closes active campaigns after the deadline date has passed", () => {
    expect(
      isCampaignClosedForSubmissions({
        status: "active",
        deadline: "2026-05-15T12:00:00.000Z",
        now: NOW,
      }),
    ).toBe(true);
  });

  test.each(["draft", "pending_payment", "pending_review", "paused", "completed", "cancelled"])(
    "closes %s campaigns even when the deadline is in the future",
    (status) => {
      expect(
        isCampaignClosedForSubmissions({
          status,
          deadline: "2026-06-17T00:00:00.000Z",
          now: NOW,
        }),
      ).toBe(true);
    },
  );
});
