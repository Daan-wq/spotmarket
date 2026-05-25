import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignSubmission: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
  },
}));

import { findDuplicate } from "./duplicate-detector";

beforeEach(() => {
  mockFindFirst.mockReset();
});

describe("findDuplicate", () => {
  it("matches globally by normalized platform video identity", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "sub-1",
      campaignId: "campaign-a",
      creatorId: "creator-a",
    });

    const dup = await findDuplicate({
      postUrl: "https://www.youtube.com/shorts/abc_DEF-123",
    });

    expect(dup).toEqual({
      submissionId: "sub-1",
      campaignId: "campaign-a",
      creatorId: "creator-a",
      matchType: "platform_video_id",
    });
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          normalizedPlatform: "YOUTUBE",
          platformVideoId: "abc_DEF-123",
        }),
      }),
    );
  });

  it("does not restrict identity matches to a campaign", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "sub-2",
      campaignId: "other-campaign",
      creatorId: "other-creator",
    });

    const dup = await findDuplicate({
      campaignId: "current-campaign",
      postUrl: "https://youtu.be/abc_DEF-123",
    });

    expect(dup?.submissionId).toBe("sub-2");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ campaignId: "current-campaign" }),
      }),
    );
  });

  it("falls back to exact URL only for legacy rows without identity", async () => {
    mockFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "legacy-sub",
        campaignId: "campaign-a",
        creatorId: "creator-a",
      });

    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@alice/video/12345",
    });

    expect(dup?.matchType).toBe("url");
    expect(dup?.submissionId).toBe("legacy-sub");
    expect(mockFindFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          postUrl: "https://www.tiktok.com/@alice/video/12345",
          OR: [{ normalizedPlatform: null }, { platformVideoId: null }],
        }),
      }),
    );
  });

  it("returns null when neither identity nor legacy URL matches", async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@alice/video/12345",
    });

    expect(dup).toBeNull();
  });
});
