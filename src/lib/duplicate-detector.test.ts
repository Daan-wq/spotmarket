import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the prisma client before importing the module under test.
const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignSubmission: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { findDuplicate } from "./duplicate-detector";

beforeEach(() => {
  mockFindFirst.mockReset();
  mockFindMany.mockReset();
});

describe("findDuplicate", () => {
  it("returns null when no match", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockFindMany.mockResolvedValueOnce([]);
    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@alice/video/12345",
    });
    expect(dup).toBeNull();
  });

  it("matches exact URL", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "sub-1",
      campaignId: "c1",
      creatorId: "u1",
    });
    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@alice/video/12345",
    });
    expect(dup?.matchType).toBe("url");
    expect(dup?.submissionId).toBe("sub-1");
  });

  it("matches on postId + handle when URL form differs", async () => {
    mockFindFirst.mockResolvedValueOnce(null); // exact url miss
    mockFindMany.mockResolvedValueOnce([
      {
        id: "sub-2",
        campaignId: "c1",
        creatorId: "u1",
        postUrl: "https://tiktok.com/@alice/video/12345?_r=1",
      },
    ]);
    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@alice/video/12345",
    });
    expect(dup?.matchType).toBe("url+handle");
  });

  it("does not match when handle differs", async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    mockFindMany.mockResolvedValueOnce([]); // detector queries by handle so empty
    const dup = await findDuplicate({
      postUrl: "https://www.tiktok.com/@bob/video/99999",
    });
    expect(dup).toBeNull();
  });
});
