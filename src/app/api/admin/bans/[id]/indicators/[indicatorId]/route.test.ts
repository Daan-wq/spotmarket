import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  adminFindUnique: vi.fn(),
  indicatorFindFirst: vi.fn(),
  indicatorDelete: vi.fn(),
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAuth: routeMocks.requireAuth }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.adminFindUnique },
    banIndicator: {
      findFirst: routeMocks.indicatorFindFirst,
      delete: routeMocks.indicatorDelete,
    },
  },
}));
vi.mock("@/lib/audit-log", () => ({ logAudit: routeMocks.logAudit }));

describe("DELETE /api/admin/bans/:id/indicators/:indicatorId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireAuth.mockResolvedValue({
      userId: "admin-supabase",
      role: "admin",
    });
    routeMocks.adminFindUnique.mockResolvedValue({ id: "admin-1" });
    routeMocks.indicatorFindFirst.mockResolvedValue({
      id: "indicator-1",
      type: "DEVICE",
    });
    routeMocks.indicatorDelete.mockResolvedValue({});
    routeMocks.logAudit.mockResolvedValue(undefined);
  });

  it("removes the selected active indicator value", async () => {
    const response = await DELETE(new Request("https://app.test"), {
      params: Promise.resolve({
        id: "ban-1",
        indicatorId: "indicator-1",
      }),
    });

    expect(response.status).toBe(200);
    expect(routeMocks.indicatorDelete).toHaveBeenCalledWith({
      where: { id: "indicator-1" },
    });
  });
});
