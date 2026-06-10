import { beforeEach, describe, expect, it, vi } from "vitest";

const cronMocks = vi.hoisted(() => ({
  verifyCron: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  verifyCron: cronMocks.verifyCron,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessSignal: {
      deleteMany: cronMocks.deleteMany,
    },
  },
}));

import { GET } from "./route";

describe("prune-ban-signals cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cronMocks.verifyCron.mockReturnValue(true);
    cronMocks.deleteMany.mockResolvedValue({ count: 12 });
  });

  it("rejects unauthorized requests", async () => {
    cronMocks.verifyCron.mockReturnValue(false);

    const response = await GET(
      new Request("https://clipprofit.com/api/cron/prune-ban-signals"),
    );

    expect(response.status).toBe(401);
    expect(cronMocks.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes only expired observations", async () => {
    const response = await GET(
      new Request("https://clipprofit.com/api/cron/prune-ban-signals"),
    );

    expect(response.status).toBe(200);
    expect(cronMocks.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: expect.any(Date) } },
    });
    expect(await response.json()).toEqual({ ok: true, deleted: 12 });
  });
});
