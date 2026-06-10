import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  adminFindUnique: vi.fn(),
  banFindUnique: vi.fn(),
  indicatorDeleteMany: vi.fn(),
  banUpdate: vi.fn(),
  transaction: vi.fn(),
  updateUserById: vi.fn(),
  invalidateCache: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: routeMocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.adminFindUnique },
    accountBan: {
      findUnique: routeMocks.banFindUnique,
      update: routeMocks.banUpdate,
    },
    banIndicator: { deleteMany: routeMocks.indicatorDeleteMany },
    $transaction: routeMocks.transaction,
  },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    auth: { admin: { updateUserById: routeMocks.updateUserById } },
  })),
}));
vi.mock("@/lib/ban-evasion/store", () => ({
  invalidateAccountBanCache: routeMocks.invalidateCache,
}));
vi.mock("@/lib/audit-log", () => ({ logAudit: routeMocks.logAudit }));

function request(body: unknown) {
  return new Request("https://app.test/api/admin/bans/ban-1/unban", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/bans/:id/unban", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({
      userId: "admin-supabase",
      role: "admin",
    });
    routeMocks.adminFindUnique.mockResolvedValue({ id: "admin-1" });
    routeMocks.banFindUnique.mockResolvedValue({
      id: "ban-1",
      liftedAt: null,
      user: { id: "creator-1", supabaseId: "creator-supabase" },
    });
    routeMocks.indicatorDeleteMany.mockResolvedValue({ count: 2 });
    routeMocks.banUpdate.mockResolvedValue({
      id: "ban-1",
      liftedAt: new Date(),
    });
    routeMocks.transaction.mockImplementation(async (callback) =>
      callback({
        banIndicator: { deleteMany: routeMocks.indicatorDeleteMany },
        accountBan: { update: routeMocks.banUpdate },
      }),
    );
    routeMocks.updateUserById.mockResolvedValue({ data: {}, error: null });
    routeMocks.invalidateCache.mockResolvedValue(undefined);
    routeMocks.logAudit.mockResolvedValue(undefined);
  });

  it("removes indicator values and restores Supabase access", async () => {
    const response = await POST(
      request({ liftReason: "Appeal approved after manual review" }),
      { params: Promise.resolve({ id: "ban-1" }) },
    );

    expect(response.status).toBe(200);
    expect(routeMocks.indicatorDeleteMany).toHaveBeenCalledWith({
      where: { accountBanId: "ban-1" },
    });
    expect(routeMocks.banUpdate).toHaveBeenCalledWith({
      where: { id: "ban-1" },
      data: {
        liftedAt: expect.any(Date),
        liftedByUserId: "admin-1",
        liftReason: "Appeal approved after manual review",
      },
      select: { id: true, liftedAt: true },
    });
    expect(routeMocks.updateUserById).toHaveBeenCalledWith(
      "creator-supabase",
      { ban_duration: "none" },
    );
    expect(routeMocks.invalidateCache).toHaveBeenCalledWith(
      "creator-supabase",
    );
  });
});
