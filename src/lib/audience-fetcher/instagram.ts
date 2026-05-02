/**
 * Instagram audience demographics — wraps fetchDemographicSnapshots and maps
 * the legacy IgDemographics into the AudienceSnapshot contract shape.
 */

import type { CreatorIgConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { fetchDemographicSnapshots } from "@/lib/instagram";
import type { AudienceFetchResult } from "./index";

export async function fetchIgAudience(
  conn: CreatorIgConnection,
): Promise<AudienceFetchResult> {
  if (!conn.accessToken || !conn.accessTokenIv || !conn.igUserId) {
    return { ok: false, audience: null, tokenBroken: true, reason: "missing token/userId" };
  }
  let token: string;
  try {
    token = decrypt(conn.accessToken, conn.accessTokenIv);
  } catch {
    return { ok: false, audience: null, tokenBroken: true, reason: "decrypt failed" };
  }

  let result: Awaited<ReturnType<typeof fetchDemographicSnapshots>>;
  try {
    result = await fetchDemographicSnapshots(conn.igUserId, token);
  } catch (err) {
    const msg = (err as Error).message?.toLowerCase() ?? "";
    return {
      ok: false,
      audience: null,
      tokenBroken: msg.includes("oauth") || msg.includes("token"),
      reason: (err as Error).message,
    };
  }

  const { legacyJson } = result;
  const ageTotal = Object.values(legacyJson.ages ?? {}).reduce((s, v) => s + v, 0);
  const ageBuckets: Record<string, number> = {};
  if (ageTotal > 0) {
    for (const [k, v] of Object.entries(legacyJson.ages ?? {})) {
      ageBuckets[k] = v / ageTotal;
    }
  }

  const { male = 0, female = 0, unknown = 0 } = legacyJson.genders ?? {};
  const totalGender = male + female + unknown;
  const genderSplit =
    totalGender > 0
      ? { male: male / totalGender, female: female / totalGender, other: unknown / totalGender }
      : { male: 0, female: 0, other: 0 };

  const countryTotal = Object.values(legacyJson.countries ?? {}).reduce((s, v) => s + v, 0);
  const topCountries = Object.entries(legacyJson.countries ?? {})
    .map(([code, n]) => ({ code, share: countryTotal > 0 ? n / countryTotal : 0 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);

  return {
    ok: true,
    audience: {
      ageBuckets,
      genderSplit,
      topCountries,
      totalReach: null,
    },
    tokenBroken: false,
  };
}
