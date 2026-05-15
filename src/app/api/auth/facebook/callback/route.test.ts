import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const routeMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  userFindUnique: vi.fn(),
  connectionFindUnique: vi.fn(),
  connectionUpdate: vi.fn(),
  connectionCreate: vi.fn(),
  connectionDeleteMany: vi.fn(),
  exchangeFbCodeForToken: vi.fn(),
  fetchUserPages: vi.fn(),
  fetchFacebookPageProfile: vi.fn(),
  fetchFacebookUserId: vi.fn(),
  encrypt: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser: routeMocks.getUser },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    creatorFbConnection: {
      findUnique: routeMocks.connectionFindUnique,
      update: routeMocks.connectionUpdate,
      create: routeMocks.connectionCreate,
      deleteMany: routeMocks.connectionDeleteMany,
    },
  },
}));

vi.mock("@/lib/facebook", () => ({
  REQUIRED_FB_SCOPES: [
    "public_profile",
    "pages_show_list",
    "pages_read_engagement",
    "pages_read_user_content",
    "read_insights",
  ],
  exchangeFbCodeForToken: routeMocks.exchangeFbCodeForToken,
  fetchUserPages: routeMocks.fetchUserPages,
  fetchFacebookPageProfile: routeMocks.fetchFacebookPageProfile,
  fetchFacebookUserId: routeMocks.fetchFacebookUserId,
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: routeMocks.encrypt,
}));

function state(returnTo = "/creator/connections") {
  return Buffer.from(JSON.stringify({ returnTo, sub: "supabase-user-1" })).toString("base64url");
}

function callbackRequest(url: string) {
  return new NextRequest(url);
}

describe("GET /api/auth/facebook/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getUser.mockResolvedValue({ data: { user: { id: "supabase-user-1" } } });
    routeMocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      creatorProfile: { id: "creator-profile-1" },
    });
    routeMocks.exchangeFbCodeForToken.mockResolvedValue({
      accessToken: "user-token",
      expiresIn: 3600,
      grantedScopes: [
        "public_profile",
        "pages_show_list",
        "pages_read_engagement",
        "pages_read_user_content",
        "read_insights",
      ],
    });
    routeMocks.fetchFacebookUserId.mockResolvedValue("fb-user-1");
    routeMocks.connectionFindUnique.mockResolvedValue(null);
    routeMocks.encrypt.mockImplementation((token: string) => ({
      ciphertext: `encrypted:${token}`,
      iv: `iv:${token}`,
    }));
  });

  it("stores every authorized Facebook Page from one OAuth grant", async () => {
    routeMocks.fetchUserPages.mockResolvedValue([
      { id: "page-1", name: "Page One", accessToken: "page-token-1" },
      { id: "page-2", name: "Page Two", accessToken: "page-token-2" },
    ]);
    routeMocks.fetchFacebookPageProfile
      .mockResolvedValueOnce({
        id: "page-1",
        name: "Page One",
        username: "pageone",
        followerCount: 100,
        profilePictureUrl: "https://cdn.test/page-1.jpg",
      })
      .mockResolvedValueOnce({
        id: "page-2",
        name: "Page Two",
        username: "pagetwo",
        followerCount: 200,
        profilePictureUrl: "https://cdn.test/page-2.jpg",
      });

    const response = await GET(
      callbackRequest(`https://app.test/api/auth/facebook/callback?code=ok&state=${state()}`),
    );

    expect(response.headers.get("location")).toBe("https://app.test/creator/connections?facebook=linked");
    expect(routeMocks.connectionCreate).toHaveBeenCalledTimes(2);
    expect(routeMocks.connectionCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          creatorProfileId: "creator-profile-1",
          fbPageId: "page-1",
          fbUserId: "fb-user-1",
          pageName: "Page One",
          pageHandle: "pageone",
          accessToken: "encrypted:page-token-1",
          accessTokenIv: "iv:page-token-1",
          isVerified: true,
          verifiedAt: expect.any(Date),
        }),
      }),
    );
    expect(routeMocks.connectionCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          fbPageId: "page-2",
          pageName: "Page Two",
          pageHandle: "pagetwo",
          accessToken: "encrypted:page-token-2",
          accessTokenIv: "iv:page-token-2",
        }),
      }),
    );
    expect(routeMocks.connectionDeleteMany).toHaveBeenCalledWith({
      where: {
        creatorProfileId: "creator-profile-1",
        fbUserId: "fb-user-1",
        fbPageId: { notIn: ["page-1", "page-2"] },
      },
    });
  });

  it("redirects with fb_no_pages when Meta returns no authorized Pages", async () => {
    routeMocks.fetchUserPages.mockResolvedValue([]);

    const response = await GET(
      callbackRequest(`https://app.test/api/auth/facebook/callback?code=ok&state=${state()}`),
    );

    expect(response.headers.get("location")).toBe("https://app.test/creator/connections?error=fb_no_pages");
    expect(routeMocks.connectionCreate).not.toHaveBeenCalled();
    expect(routeMocks.connectionUpdate).not.toHaveBeenCalled();
    expect(routeMocks.connectionDeleteMany).not.toHaveBeenCalled();
  });
});
