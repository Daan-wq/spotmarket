import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatorYtConnection } from "@prisma/client";

const tokenMock = vi.fn();
const upsertMock = vi.fn();
const recordRawMock = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fetchSpy: any;

vi.mock("@/lib/token-refresh", () => ({
  getFreshYoutubeAccessToken: (...a: unknown[]) => tokenMock(...a),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    ytDailyChannelInsight: { upsert: (...a: unknown[]) => upsertMock(...a) },
  },
}));
vi.mock("@/lib/metrics/raw-storage", () => ({
  recordRawApiResponse: (...a: unknown[]) => recordRawMock(...a),
}));

import { pollYtAnalyticsForConnection } from "./yt-analytics";

function conn(): CreatorYtConnection {
  return {
    id: "conn_yt",
    channelId: "UC_test",
  } as unknown as CreatorYtConnection;
}

beforeEach(() => {
  tokenMock.mockReset();
  upsertMock.mockReset();
  recordRawMock.mockReset();
  fetchSpy = vi.spyOn(globalThis, "fetch");
  tokenMock.mockResolvedValue("yt_token");
  upsertMock.mockResolvedValue({ id: "row_1" });
  recordRawMock.mockResolvedValue(undefined);
});

afterEach(() => {
  fetchSpy.mockRestore();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("pollYtAnalyticsForConnection", () => {
  it("upserts one row per day with all metric values + extra dimension breakdowns", async () => {
    // First call: daily metrics
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({
        rows: [
          ["2026-04-29", 1500, 2400, 96, 0.65, 25, 3, 80, 12, 6, 100, 50],
          ["2026-04-30", 2200, 3300, 90, 0.6, 35, 1, 110, 15, 8, 200, 70],
        ],
      }),
    );
    // 5 breakdowns
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ rows: [["YT_SEARCH", 8000], ["BROWSE", 4000], ["EXTERNAL", 2000]] }),
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse({ rows: [["WATCH", 12000], ["MOBILE", 4000]] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ rows: [["DESKTOP", 5000], ["MOBILE", 11000]] }));
    fetchSpy.mockResolvedValueOnce(jsonResponse({ rows: [["SHORTS", 12000], ["VIDEO_ON_DEMAND", 4000]] }));
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ rows: [["SUBSCRIBED", 6000], ["UNSUBSCRIBED", 10000]] }),
    );

    const r = await pollYtAnalyticsForConnection(conn());
    expect(r.ok).toBe(true);
    expect(r.rowsUpserted).toBe(2);
    expect(upsertMock).toHaveBeenCalledTimes(2);

    const firstCall = upsertMock.mock.calls[0][0];
    expect(firstCall.where).toEqual({
      connectionId_date: { connectionId: "conn_yt", date: new Date("2026-04-29T00:00:00.000Z") },
    });
    expect(firstCall.create.views).toBe(BigInt(1500));
    expect(firstCall.create.estimatedMinutesWatched).toBe(2400);
    expect(firstCall.create.averageViewPercentage).toBe(0.65);
    expect(firstCall.create.subscribersGained).toBe(25);
    expect(firstCall.create.likes).toBe(80);
    expect(firstCall.create.redViews).toBe(BigInt(100));
    expect(firstCall.create.estimatedRedMinutesWatched).toBe(50);

    const traffic = firstCall.create.trafficSourceBreakdown as Record<string, number>;
    expect(traffic.YT_SEARCH).toBeCloseTo(0.5714, 3);
    expect(traffic.BROWSE).toBeCloseTo(0.2857, 3);

    const content = firstCall.create.contentTypeBreakdown as Record<string, number>;
    expect(content.SHORTS).toBeCloseTo(0.75);
    expect(content.VIDEO_ON_DEMAND).toBeCloseTo(0.25);

    expect(recordRawMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionType: "YT",
        connectionId: "conn_yt",
        endpoint: "youtube.analytics.daily",
      }),
    );
  });

  it("returns ok:false with reason when no daily rows", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ rows: [] }));
    const r = await pollYtAnalyticsForConnection(conn());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no analytics rows");
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns ok:false when token refresh fails", async () => {
    tokenMock.mockResolvedValue(null);
    const r = await pollYtAnalyticsForConnection(conn());
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("no token");
  });
});
