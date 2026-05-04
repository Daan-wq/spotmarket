/**
 * Audience demographics auto-pull.
 *
 * Owner: A. Per-platform fetchers normalize demographics into the contract
 * shape (`AudienceSnapshot.ageBuckets`, `genderSplit`, `topCountries`) so
 * the cron `poll-demographics` can write them uniformly.
 */

export { fetchIgAudience } from "./instagram";
export { fetchTtAudience } from "./tiktok";
export { fetchYtAudience } from "./youtube";
export { fetchFbAudience } from "./facebook";

import type { AudienceSnapshot } from "@/lib/contracts/metrics";

export type NormalizedAudience = Pick<
  AudienceSnapshot,
  "ageBuckets" | "genderSplit" | "topCountries" | "totalReach"
> & {
  /** Optional city → share map (top 25). */
  cities?: Record<string, number>;
};

export type AudienceKind = "FOLLOWER" | "ENGAGED";

export interface AudienceVariant {
  kind: AudienceKind;
  audience: NormalizedAudience;
  /** Raw API payload for archival via RawApiResponse. */
  raw?: unknown;
}

export interface AudienceFetchResult {
  ok: boolean;
  /** Primary audience (kept for backward compat — equals the FOLLOWER variant when present). */
  audience: NormalizedAudience | null;
  /** All variants returned by the platform. IG returns FOLLOWER + ENGAGED. */
  variants?: AudienceVariant[];
  /** When ok=false, indicates a token-broken state for the connection. */
  tokenBroken: boolean;
  reason?: string;
}
