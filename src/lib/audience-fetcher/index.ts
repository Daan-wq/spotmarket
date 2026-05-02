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
>;

export interface AudienceFetchResult {
  ok: boolean;
  audience: NormalizedAudience | null;
  /** When ok=false, indicates a token-broken state for the connection. */
  tokenBroken: boolean;
  reason?: string;
}
