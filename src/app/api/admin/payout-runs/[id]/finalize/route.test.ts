import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  payoutRunUpdate: vi.fn(),
  auditLogCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payoutRun: { update: routeMocks.payoutRunUpdate },
    auditLog: { create: routeMocks.auditLogCreate },
  },
}));

const params = { params: Promise.resolve({ id: "run-1" }) };

describe("POST /api/admin/payout-runs/[id]/finalize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({ userId: "admin-user-1" });
  });

  it("returns gone without finalizing payout runs", async () => {
    const response = await POST(new Request("https://app.test/api/admin/payout-runs/run-1/finalize"), params);

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error: "Payout runs are disabled. Use manual creator payout requests.",
    });
    expect(routeMocks.payoutRunUpdate).not.toHaveBeenCalled();
    expect(routeMocks.auditLogCreate).not.toHaveBeenCalled();
  });
});
