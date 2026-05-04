/**
 * Domain events published on the event bus by Subsystem A.
 *
 * Producers: Subsystem A (tracking foundation).
 * Consumers: B (intelligence), C (clipper UI), D (admin UI), E (notifications).
 *
 * Event names use dotted lowercase: `<entity>.<action>` form.
 * Payloads are flat where possible — receivers re-fetch from Prisma when they
 * need the full record. The event itself is a notification + minimal pointers.
 */

import type { SignalSeverity, SignalType } from "./signals";

export type DomainEventType =
  | "submission.created"
  | "submission.metrics.updated"
  | "submission.flagged"
  | "submission.demographics.refreshed"
  // Published by Subsystem B (declared here to keep names locked)
  | "submission.viral"
  | "submission.underperform"
  | "clipper.score.recomputed"
  | "campaign.benchmark.recomputed";

export interface SubmissionCreatedEvent {
  type: "submission.created";
  submissionId: string;
  campaignId: string;
  creatorId: string;
  sourcePlatform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE_SHORTS" | "FACEBOOK";
  occurredAt: string; // ISO timestamp
}

export interface SubmissionMetricsUpdatedEvent {
  type: "submission.metrics.updated";
  submissionId: string;
  snapshotId: string;
  deltaViews: number;
  cumulativeViews: number;
  occurredAt: string;
}

export interface SubmissionFlaggedEvent {
  type: "submission.flagged";
  submissionId: string;
  signal: SignalType;
  severity: SignalSeverity;
  signalId: string;
  occurredAt: string;
}

export interface SubmissionDemographicsRefreshedEvent {
  type: "submission.demographics.refreshed";
  connectionId: string;
  connectionType: "IG" | "TT" | "YT" | "FB";
  snapshotId: string;
  occurredAt: string;
}

export interface SubmissionViralEvent {
  type: "submission.viral";
  submissionId: string;
  campaignId: string;
  creatorId: string;
  benchmarkRatio: number; // viewsPerHour / campaign p90
  occurredAt: string;
}

export interface SubmissionUnderperformEvent {
  type: "submission.underperform";
  submissionId: string;
  campaignId: string;
  creatorId: string;
  weakDimensions: Array<"views" | "likeRatio" | "commentRatio" | "watchTime">;
  occurredAt: string;
}

export interface ClipperScoreRecomputedEvent {
  type: "clipper.score.recomputed";
  creatorProfileId: string;
  scoreId: string;
  score: number;
  occurredAt: string;
}

export interface CampaignBenchmarkRecomputedEvent {
  type: "campaign.benchmark.recomputed";
  campaignId: string;
  benchmarkId: string;
  occurredAt: string;
}

export type DomainEvent =
  | SubmissionCreatedEvent
  | SubmissionMetricsUpdatedEvent
  | SubmissionFlaggedEvent
  | SubmissionDemographicsRefreshedEvent
  | SubmissionViralEvent
  | SubmissionUnderperformEvent
  | ClipperScoreRecomputedEvent
  | CampaignBenchmarkRecomputedEvent;

/** Type guard for narrowing on `event.type`. */
export function isDomainEventOf<T extends DomainEvent["type"]>(
  event: DomainEvent,
  type: T
): event is Extract<DomainEvent, { type: T }> {
  return event.type === type;
}

/** Redis pub/sub channel name. Single channel; consumers filter by `event.type`. */
export const EVENT_BUS_CHANNEL = "clipprofit:domain-events";
