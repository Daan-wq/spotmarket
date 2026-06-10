import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  adminFindUnique: vi.fn(),
  profileFindUnique: vi.fn(),
  activeBanFindFirst: vi.fn(),
  banCreate: vi.fn(),
  updateUserById: vi.fn(),
  invalidateCache: vi.fn(),
  getIdentitySignals: vi.fn(),
  collectIdentityObservations: vi.fn(),
  recordAccessSignals: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: routeMocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.adminFindUnique },
    creatorProfile: { findUnique: routeMocks.profileFindUnique },
    accountBan: {
      findFirst: routeMocks.activeBanFindFirst,
      create: routeMocks.banCreate,
    },
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: { admin: { updateUserById: routeMocks.updateUserById } },
  })),
}));
vi.mock("@/lib/ban-evasion/store", () => ({
  invalidateAccountBanCache: routeMocks.invalidateCache,
  recordAccessSignals: routeMocks.recordAccessSignals,
}));
vi.mock("@/lib/ban-evasion/identity-signals", () => ({
  getIdentitySignalsForSupabaseUser: routeMocks.getIdentitySignals,
}));
vi.mock("@/lib/ban-evasion/enforcement", () => ({
  collectIdentityObservations: routeMocks.collectIdentityObservations,
}));
vi.mock("@/lib/audit-log", () => ({ logAudit: routeMocks.logAudit }));

function request(body: unknown) {
  return new Request("https://app.test/api/admin/creators/profile-1/ban", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/creators/:id/ban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({
      userId: "admin-supabase",
      role: "admin",
    });
    routeMocks.adminFindUnique.mockResolvedValue({ id: "admin-1" });
    routeMocks.profileFindUnique.mockResolvedValue({
      id: "profile-1",
      user: {
        id: "creator-1",
        role: "creator",
        supabaseId: "creator-supabase",
      },
    });
    routeMocks.activeBanFindFirst.mockResolvedValue(null);
    routeMocks.banCreate.mockResolvedValue({
      id: "ban-1",
      reason: "Viewbotting",
      internalNote: "Repeated artificial traffic",
      bannedAt: new Date("2026-06-10T12:00:00.000Z"),
    });
    routeMocks.updateUserById.mockResolvedValue({ data: {}, error: null });
    routeMocks.invalidateCache.mockResolvedValue(undefined);
    routeMocks.getIdentitySignals.mockResolvedValue({
      userId: "creator-1",
      role: "creator",
      signals: [{ type: "DISCORD", value: "discord-1" }],
    });
    routeMocks.collectIdentityObservations.mockReturnValue([
      {
        type: "DISCORD",
        valueHash: "v1:hash",
        maskedValue: "disc...rd-1",
      },
    ]);
    routeMocks.recordAccessSignals.mockResolvedValue(undefined);
    routeMocks.logAudit.mockResolvedValue(undefined);
  });

  it("bans only the account and does not auto-select indicators", async () => {
    const response = await POST(
      request({
        reason: "Viewbotting",
        internalNote: "Repeated artificial traffic",
      }),
      { params: Promise.resolve({ id: "profile-1" }) },
    );

    expect(response.status).toBe(201);
    expect(routeMocks.banCreate).toHaveBeenCalledWith({
      data: {
        userId: "creator-1",
        reason: "Viewbotting",
        internalNote: "Repeated artificial traffic",
        bannedByUserId: "admin-1",
      },
      select: {
        id: true,
        reason: true,
        internalNote: true,
        bannedAt: true,
      },
    });
    expect(routeMocks.updateUserById).toHaveBeenCalledWith(
      "creator-supabase",
      { ban_duration: "876000h" },
    );
    expect(routeMocks.invalidateCache).toHaveBeenCalledWith(
      "creator-supabase",
    );
    expect(routeMocks.recordAccessSignals).toHaveBeenCalledWith({
      supabaseId: "creator-supabase",
      userId: "creator-1",
      source: "session",
      observations: [
        {
          type: "DISCORD",
          valueHash: "v1:hash",
          maskedValue: "disc...rd-1",
        },
      ],
    });
  });

  it("rejects a second active ban", async () => {
    routeMocks.activeBanFindFirst.mockResolvedValue({ id: "ban-existing" });

    const response = await POST(
      request({ reason: "Viewbotting" }),
      { params: Promise.resolve({ id: "profile-1" }) },
    );

    expect(response.status).toBe(409);
    expect(routeMocks.banCreate).not.toHaveBeenCalled();
  });
});
