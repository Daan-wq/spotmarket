/**
 * Facebook audience demographics — wraps fetchFacebookPageDemographics.
 */

import type { CreatorFbConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { fetchFacebookPageDemographics } from "@/lib/facebook";
import type { AudienceFetchResult } from "./index";

export async function fetchFbAudience(
  conn: CreatorFbConnection,
): Promise<AudienceFetchResult> {
  if (!conn.accessToken || !conn.accessTokenIv || !conn.fbPageId) {
    return { ok: false, audience: null, tokenBroken: true, reason: "missing token/page" };
  }
  let token: string;
  try {
    token = decrypt(conn.accessToken, conn.accessTokenIv);
  } catch {
    return { ok: false, audience: null, tokenBroken: true, reason: "decrypt failed" };
  }

  let demographics;
  try {
    demographics = await fetchFacebookPageDemographics(conn.fbPageId, token);
  } catch (err) {
    return { ok: false, audience: null, tokenBroken: false, reason: (err as Error).message };
  }

  const ageBuckets: Record<string, number> = {};
  for (const [k, v] of Object.entries(demographics.ages ?? {})) {
    ageBuckets[k] = (v as number) / 100;
  }
  const male = (demographics.genders?.male ?? 0) / 100;
  const female = (demographics.genders?.female ?? 0) / 100;
  const totalGender = male + female;
  const genderSplit = {
    male: totalGender > 0 ? male / totalGender : 0,
    female: totalGender > 0 ? female / totalGender : 0,
    other: 0,
  };
  const topCountries = Object.entries(demographics.countries ?? {})
    .map(([code, pct]) => ({ code, share: (pct as number) / 100 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);

  return {
    ok: true,
    audience: { ageBuckets, genderSplit, topCountries, totalReach: null },
    tokenBroken: false,
  };
}
