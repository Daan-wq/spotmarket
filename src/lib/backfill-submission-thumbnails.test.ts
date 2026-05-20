import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfillSubmissionThumbnails } from "./backfill-submission-thumbnails";

const backfillMocks = vi.hoisted(() => ({
  submissionFindMany: vi.fn(),
  resolveStableSubmissionThumbnail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaignSubmission: {
      findMany: backfillMocks.submissionFindMany,
    },
  },
}));

vi.mock("@/lib/clip-thumbnail", () => ({
  resolveStableSubmissionThumbnail: backfillMocks.resolveStableSubmissionThumbnail,
  isUnstableProviderThumbnailUrl: (url: string | null | undefined) =>
    Boolean(url?.includes("tiktokcdn") || url?.includes("cdninstagram.com")),
}));

describe("backfillSubmissionThumbnails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reprocesses missing and provider CDN thumbnails through the stable resolver", async () => {
    backfillMocks.submissionFindMany.mockResolvedValue([
      {
        id: "submission-missing",
        postUrl: "https://www.tiktok.com/@creator/video/1",
        thumbnailUrl: null,
        mediaType: "video",
        creatorId: "creator-1",
      },
      {
        id: "submission-stale",
        postUrl: "https://www.instagram.com/p/ABC123/",
        thumbnailUrl: "https://scontent.cdninstagram.com/stale.jpg",
        mediaType: "image",
        creatorId: "creator-2",
      },
    ]);
    backfillMocks.resolveStableSubmissionThumbnail
      .mockResolvedValueOnce({
        thumbnailUrl:
          "https://project.supabase.co/storage/v1/object/public/creator-media-cache/tt/conn/1.jpg",
        mediaType: "video",
      })
      .mockResolvedValueOnce({ thumbnailUrl: null, mediaType: "image" });

    const result = await backfillSubmissionThumbnails({ limit: 25 });

    expect(backfillMocks.submissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
      }),
    );
    expect(backfillMocks.resolveStableSubmissionThumbnail).toHaveBeenCalledTimes(2);
    expect(backfillMocks.resolveStableSubmissionThumbnail).toHaveBeenCalledWith({
      postUrl: "https://www.instagram.com/p/ABC123/",
      creatorId: "creator-2",
      candidateThumbnailUrl: "https://scontent.cdninstagram.com/stale.jpg",
      candidateMediaType: "image",
      submissionId: "submission-stale",
    });
    expect(result).toEqual({
      scanned: 2,
      resolved: 1,
      unresolved: ["submission-stale"],
      skipped: [],
    });
  });
});
