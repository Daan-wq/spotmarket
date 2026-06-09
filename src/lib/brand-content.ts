export const BRAND_CONTENT_SORTS = ["recent", "views", "engagement"] as const;
export type BrandContentSort = (typeof BRAND_CONTENT_SORTS)[number];

interface BrandContentSubmission {
  id: string;
  status: string;
  postUrl: string;
  thumbnailUrl: string | null;
  normalizedPlatform: string | null;
  sourcePlatform?: string | null;
  authorHandle: string | null;
  createdAt: Date | string;
  viewCount: number | null;
  claimedViews: number;
  eligibleViews: number | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  metricSnapshots: Array<{
    capturedAt: Date | string;
    viewCount: number | bigint;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  }>;
}

interface BrandContentPageOptions {
  platform: string | null | undefined;
  sort: string | null | undefined;
  page: number;
  pageSize: number;
}

export function buildBrandContentPage(
  submissions: BrandContentSubmission[],
  options: BrandContentPageOptions,
) {
  const platform = normalizePlatformFilter(options.platform);
  const sort = normalizeContentSort(options.sort);
  const pageSize = Math.max(1, Math.floor(options.pageSize));
  const projected = submissions
    .filter((submission) => submission.status === "APPROVED")
    .map(projectBrandContent)
    .filter((submission) =>
      platform === "all"
        ? true
        : submission.platform.toLowerCase() === platform.toLowerCase(),
    )
    .sort(contentSorter(sort));
  const totalPages = Math.max(1, Math.ceil(projected.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(options.page) || 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: projected.slice(start, start + pageSize),
    total: projected.length,
    page,
    totalPages,
    platform,
    sort,
  };
}

function projectBrandContent(submission: BrandContentSubmission) {
  const latest = [...submission.metricSnapshots].sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  )[0];
  const views = Number(
    latest?.viewCount
      ?? submission.viewCount
      ?? submission.claimedViews
      ?? submission.eligibleViews
      ?? 0,
  );
  const engagement =
    (latest?.likeCount ?? submission.likeCount ?? 0)
    + (latest?.commentCount ?? submission.commentCount ?? 0)
    + (latest?.shareCount ?? submission.shareCount ?? 0);

  return {
    id: submission.id,
    platform: inferPlatform(submission),
    postUrl: submission.postUrl,
    thumbnailUrl: submission.thumbnailUrl,
    publicAccount: publicAccount(submission.authorHandle, submission.postUrl),
    submittedAt: new Date(submission.createdAt).toISOString(),
    views,
    engagement,
  };
}

function contentSorter(sort: BrandContentSort) {
  if (sort === "views") {
    return (a: ReturnType<typeof projectBrandContent>, b: ReturnType<typeof projectBrandContent>) =>
      b.views - a.views || b.submittedAt.localeCompare(a.submittedAt);
  }
  if (sort === "engagement") {
    return (a: ReturnType<typeof projectBrandContent>, b: ReturnType<typeof projectBrandContent>) =>
      b.engagement - a.engagement || b.submittedAt.localeCompare(a.submittedAt);
  }
  return (a: ReturnType<typeof projectBrandContent>, b: ReturnType<typeof projectBrandContent>) =>
    b.submittedAt.localeCompare(a.submittedAt);
}

function normalizeContentSort(value: string | null | undefined): BrandContentSort {
  return BRAND_CONTENT_SORTS.includes(value as BrandContentSort)
    ? value as BrandContentSort
    : "recent";
}

function normalizePlatformFilter(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "all") return "all";
  const platform = {
    tiktok: "TikTok",
    instagram: "Instagram",
    youtube: "YouTube Shorts",
    "youtube shorts": "YouTube Shorts",
    facebook: "Facebook",
    x: "X",
  }[normalized];
  return platform ?? "all";
}

function inferPlatform(submission: BrandContentSubmission) {
  const value = submission.normalizedPlatform ?? submission.sourcePlatform;
  const label = value ? {
    INSTAGRAM: "Instagram",
    TIKTOK: "TikTok",
    YOUTUBE: "YouTube Shorts",
    YOUTUBE_SHORTS: "YouTube Shorts",
    FACEBOOK: "Facebook",
    X: "X",
  }[value.toUpperCase()] : null;
  if (label) return label;

  const host = safeUrl(submission.postUrl)?.hostname.toLowerCase() ?? "";
  if (host.includes("tiktok")) return "TikTok";
  if (host.includes("instagram")) return "Instagram";
  if (host.includes("youtube") || host.includes("youtu.be")) return "YouTube Shorts";
  if (host.includes("facebook") || host.includes("fb.watch")) return "Facebook";
  return "Onbekend";
}

function publicAccount(authorHandle: string | null, postUrl: string) {
  const handle = normalizeHandle(authorHandle) ?? handleFromUrl(postUrl);
  return handle ? `@${handle}` : "–";
}

function handleFromUrl(postUrl: string) {
  const url = safeUrl(postUrl);
  if (!url) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  if (first.startsWith("@")) return normalizeHandle(first);
  if (url.hostname.includes("instagram") && !["p", "reel", "reels", "tv"].includes(first)) {
    return normalizeHandle(first);
  }
  return null;
}

function normalizeHandle(value: string | null | undefined) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized || null;
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
