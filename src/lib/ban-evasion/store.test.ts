import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countRecentDistinctSignupsForIp,
  findActiveIndicatorMatches,
  getActiveAccountBan,
  recordAccessSignals,
} from "./store";

const mocks = vi.hoisted(() => ({
  accountBanFindFirst: vi.fn(),
  indicatorFindMany: vi.fn(),
  accessSignalUpsert: vi.fn(),
  accessSignalFindMany: vi.fn(),
  cacheGet: vi.fn(),
  cacheSetex: vi.fn(),
  cacheDel: vi.fn(),
}));

const dependencies = {
  db: {
    accountBan: { findFirst: mocks.accountBanFindFirst },
    banIndicator: { findMany: mocks.indicatorFindMany },
    accessSignal: {
      upsert: mocks.accessSignalUpsert,
      findMany: mocks.accessSignalFindMany,
    },
  },
  cache: {
    get: mocks.cacheGet,
    setex: mocks.cacheSetex,
    del: mocks.cacheDel,
  },
};

describe("ban-evasion store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cacheGet.mockResolvedValue(null);
    mocks.cacheSetex.mockResolvedValue("OK");
    mocks.accessSignalUpsert.mockResolvedValue({});
  });

  it("uses the active-account cache without querying PostgreSQL", async () => {
    mocks.cacheGet.mockResolvedValue(
      JSON.stringify({ active: true, banId: "ban-1" }),
    );

    await expect(
      getActiveAccountBan("supabase-1", dependencies),
    ).resolves.toEqual({ active: true, banId: "ban-1" });
    expect(mocks.accountBanFindFirst).not.toHaveBeenCalled();
  });

  it("falls back to PostgreSQL when Redis is unavailable", async () => {
    mocks.cacheGet.mockRejectedValue(new Error("redis unavailable"));
    mocks.accountBanFindFirst.mockResolvedValue({ id: "ban-db" });

    await expect(
      getActiveAccountBan("supabase-1", dependencies),
    ).resolves.toEqual({ active: true, banId: "ban-db" });
    expect(mocks.accountBanFindFirst).toHaveBeenCalledWith({
      where: {
        liftedAt: null,
        user: { supabaseId: "supabase-1", role: "creator" },
      },
      select: { id: true },
      orderBy: { bannedAt: "desc" },
    });
  });

  it("returns active indicator matches with their enforcement metadata", async () => {
    mocks.indicatorFindMany.mockResolvedValue([
      {
        id: "indicator-1",
        accountBanId: "ban-1",
        type: "DEVICE",
        strength: "STRONG",
        mode: "LAYERED",
      },
    ]);

    await expect(
      findActiveIndicatorMatches(
        [{ type: "DEVICE", valueHash: "v1:device" }],
        dependencies,
      ),
    ).resolves.toEqual([
      {
        id: "indicator-1",
        accountBanId: "ban-1",
        type: "DEVICE",
        strength: "STRONG",
        mode: "LAYERED",
      },
    ]);
  });

  it("records a rolling 90-day signal and marks signup observations", async () => {
    const now = new Date("2026-06-10T12:00:00.000Z");

    await recordAccessSignals(
      {
        supabaseId: "supabase-1",
        userId: "user-1",
        source: "signup",
        observations: [
          {
            type: "IP",
            valueHash: "v1:ip",
            maskedValue: "203.0.113.xxx",
          },
        ],
        now,
      },
      dependencies,
    );

    expect(mocks.accessSignalUpsert).toHaveBeenCalledWith({
      where: {
        supabaseId_type_valueHash: {
          supabaseId: "supabase-1",
          type: "IP",
          valueHash: "v1:ip",
        },
      },
      create: expect.objectContaining({
        supabaseId: "supabase-1",
        userId: "user-1",
        type: "IP",
        signupObservedAt: now,
        expiresAt: new Date("2026-09-08T12:00:00.000Z"),
      }),
      update: expect.objectContaining({
        userId: "user-1",
        signupObservedAt: now,
        lastSeenAt: now,
        expiresAt: new Date("2026-09-08T12:00:00.000Z"),
      }),
    });
  });

  it("counts distinct creator signups for an IP during the last 24 hours", async () => {
    mocks.accessSignalFindMany.mockResolvedValue([
      { supabaseId: "supabase-1" },
      { supabaseId: "supabase-2" },
      { supabaseId: "supabase-3" },
    ]);
    const now = new Date("2026-06-10T12:00:00.000Z");

    await expect(
      countRecentDistinctSignupsForIp("v1:ip", now, dependencies),
    ).resolves.toBe(3);
    expect(mocks.accessSignalFindMany).toHaveBeenCalledWith({
      where: {
        type: "IP",
        valueHash: "v1:ip",
        signupObservedAt: {
          gte: new Date("2026-06-09T12:00:00.000Z"),
        },
      },
      distinct: ["supabaseId"],
      select: { supabaseId: true },
    });
  });
});
