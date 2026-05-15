import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getUser: vi.fn(),
  connectionFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireAuth: routeMocks.requireAuth,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: routeMocks.getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creatorFbConnection: { findUnique: routeMocks.connectionFindUnique },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn(() => "page-token"),
}));

describe("GET /api/debug/fb-posts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: { id: "creator-user" } } });
    routeMocks.connectionFindUnique.mockResolvedValue(null);
  });

  it("denies non-admin access before reading a Facebook connection", async () => {
    routeMocks.requireAuth.mockRejectedValue(new Error("Forbidden"));

    const response = await GET(
      new NextRequest("https://app.test/api/debug/fb-posts?connectionId=conn-1"),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.requireAuth).toHaveBeenCalledWith("admin");
    expect(routeMocks.connectionFindUnique).not.toHaveBeenCalled();
  });
});
