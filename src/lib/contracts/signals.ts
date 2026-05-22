/**
 * Submission signal types — mirrors Prisma `SubmissionSignal`.
 *
 * Producers: A (velocity, ratio, bot, duplicate, token-broken),
 *            D (logo-missing, set by admin manual review).
 * Consumers: B (downstream signals), D (admin signals inbox), E (notifications).
 */

export type SignalType =
  | "VELOCITY_SPIKE"
  | "VELOCITY_DROP"
  | "RATIO_ANOMALY"
  | "BOT_SUSPECTED"
  | "LOGO_MISSING"
  | "DUPLICATE"
  | "TOKEN_BROKEN";

export type SignalSeverity = "INFO" | "WARN" | "CRITICAL";

export interface SignalPayloadBase {
  reason: string;
}

export interface VelocityPayload extends SignalPayloadBase {
  viewsPerHour: number;
  rolling7dMean: number;
  spikeMultiplier: number;
}

export interface RatioPayload extends SignalPayloadBase {
  ratio: "like" | "comment" | "share";
  observed: number;
  expected: number;
}

export interface DuplicatePayload extends SignalPayloadBase {
  duplicateOfSubmissionId: string;
  matchType: "url" | "url+handle";
}

export interface TokenBrokenPayload extends SignalPayloadBase {
  connectionType: "IG" | "TT" | "YT" | "FB";
  connectionId: string;
}

export type AntiBotConfidence = "LOW" | "MEDIUM" | "HIGH";

export type AntiBotEvidenceKind =
  | "VELOCITY_ANOMALY"
  | "ENGAGEMENT_COLLAPSE"
  | "RATIO_ANOMALY"
  | "ACCOUNT_PLAUSIBILITY";

export interface AntiBotEvidence {
  kind: AntiBotEvidenceKind;
  label: string;
  points: number;
  metrics?: Record<string, number | string | null>;
}

export interface AntiBotPayload extends SignalPayloadBase {
  riskScore: number;
  confidence: AntiBotConfidence;
  reasons: string[];
  evidence: AntiBotEvidence[];
  evaluatedAt: string;
  version: "anti-bot-v1";
}

export type SignalPayload =
  | VelocityPayload
  | RatioPayload
  | DuplicatePayload
  | TokenBrokenPayload
  | AntiBotPayload
  | SignalPayloadBase;

export interface SubmissionSignal {
  id: string;
  submissionId: string;
  type: SignalType;
  severity: SignalSeverity;
  payload: SignalPayload;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}
