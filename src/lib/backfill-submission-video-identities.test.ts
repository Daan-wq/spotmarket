import { describe, expect, it } from "vitest";
import { planSubmissionVideoIdentityBackfill } from "./backfill-submission-video-identities";

function row(overrides: Partial<Parameters<typeof planSubmissionVideoIdentityBackfill>[0][number]>) {
  return {
    id: "submission-1",
    applicationId: "application-1",
    postUrl: "https://www.youtube.com/shorts/abc_DEF-123",
    status: "PENDING",
    earnedAmount: 0,
    settledAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    payoutRunItems: [],
    ...overrides,
  } as Parameters<typeof planSubmissionVideoIdentityBackfill>[0][number];
}

describe("planSubmissionVideoIdentityBackfill", () => {
  it("keeps the oldest submission canonical and separates locked duplicates", () => {
    const plan = planSubmissionVideoIdentityBackfill([
      row({
        id: "newer",
        postUrl: "https://youtu.be/abc_DEF-123",
        createdAt: new Date("2026-05-02T00:00:00.000Z"),
      }),
      row({
        id: "oldest",
        postUrl: "https://www.youtube.com/watch?v=abc_DEF-123",
        createdAt: new Date("2026-05-01T00:00:00.000Z"),
      }),
      row({
        id: "locked",
        postUrl: "https://www.youtube.com/shorts/abc_DEF-123",
        settledAt: new Date("2026-05-03T00:00:00.000Z"),
        createdAt: new Date("2026-05-03T00:00:00.000Z"),
      }),
    ]);

    expect(plan.canonicalRows.map((item) => item.id)).toEqual(["oldest"]);
    expect(plan.rejectableDuplicates.map((item) => item.id)).toEqual(["newer"]);
    expect(plan.lockedDuplicates.map((item) => item.id)).toEqual(["locked"]);
    expect(plan.duplicateGroups[0]).toEqual(
      expect.objectContaining({
        key: "YOUTUBE:abc_DEF-123",
        canonical: expect.objectContaining({ id: "oldest" }),
      }),
    );
  });

  it("reports unparseable rows without planning updates", () => {
    const plan = planSubmissionVideoIdentityBackfill([
      row({ id: "shortlink", postUrl: "https://vm.tiktok.com/ZMabc123/" }),
    ]);

    expect(plan.canonicalRows).toEqual([]);
    expect(plan.unparseable.map((item) => item.id)).toEqual(["shortlink"]);
  });
});
