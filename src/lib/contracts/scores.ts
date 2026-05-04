/**
 * Performance score + benchmark types — mirrors Prisma
 * `ClipperPerformanceScore` and `CampaignBenchmark`.
 *
 * Owner: B. Consumers: C (clipper UI), D (admin UI), E (notifications via events).
 */

export interface ClipperPerformanceScore {
  id: string;
  creatorProfileId: string;
  computedAt: Date;
  /** Composite, 0..100 */
  score: number;
  /** Component scores, all 0..100 */
  approvalRate: number;
  benchmarkRatio: number;
  trustScore: number;
  deliveryScore: number;
  audienceFit: number;
  sampleSize: number;
}

export interface CampaignBenchmark {
  id: string;
  campaignId: string;
  computedAt: Date;
  velocityP10: number;
  velocityP50: number;
  velocityP90: number;
  likeRatioP50: number;
  likeRatioP90: number;
  commentRatioP50: number;
  commentRatioP90: number;
  sampleSize: number;
  windowHours: number;
}

/** Input to viral / underperform detectors. */
export interface BenchmarkComparison {
  submissionId: string;
  campaignId: string;
  observedViewsPerHour: number;
  observedLikeRatio: number;
  observedCommentRatio: number;
  benchmark: CampaignBenchmark;
}
