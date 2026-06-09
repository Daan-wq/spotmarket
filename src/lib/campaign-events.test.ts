import { describe, expect, it } from "vitest";
import {
  buildCampaignEventCreate,
  getCampaignEventType,
} from "@/lib/campaign-events";

describe("campaign events", () => {
  it.each([
    ["draft", "active", "STARTED"],
    ["pending_review", "active", "STARTED"],
    ["paused", "active", "RESUMED"],
    ["active", "paused", "PAUSED"],
    ["active", "completed", "COMPLETED"],
    ["paused", "completed", "COMPLETED"],
  ] as const)("maps %s -> %s to %s", (previousStatus, nextStatus, expected) => {
    expect(getCampaignEventType(previousStatus, nextStatus)).toBe(expected);
  });

  it.each([
    ["active", "active"],
    ["paused", "paused"],
    ["draft", "pending_review"],
    ["active", "cancelled"],
  ] as const)("does not record irrelevant transition %s -> %s", (previousStatus, nextStatus) => {
    expect(getCampaignEventType(previousStatus, nextStatus)).toBeNull();
  });

  it("builds a stable transition key so retries cannot create duplicate events", () => {
    const event = buildCampaignEventCreate({
      campaignId: "campaign-1",
      previousStatus: "active",
      nextStatus: "paused",
      previousUpdatedAt: new Date("2026-06-10T08:00:00.000Z"),
      occurredAt: new Date("2026-06-10T09:00:00.000Z"),
      createdByUserId: "admin-1",
    });

    expect(event).toEqual({
      campaignId: "campaign-1",
      type: "PAUSED",
      occurredAt: new Date("2026-06-10T09:00:00.000Z"),
      createdByUserId: "admin-1",
      transitionKey: "campaign-1:active:paused:2026-06-10T08:00:00.000Z",
    });
    expect(buildCampaignEventCreate({
      campaignId: "campaign-1",
      previousStatus: "active",
      nextStatus: "active",
      previousUpdatedAt: new Date("2026-06-10T08:00:00.000Z"),
    })).toBeNull();
  });
});
