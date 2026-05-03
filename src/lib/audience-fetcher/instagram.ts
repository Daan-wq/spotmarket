/**
 * Instagram audience demographics — wraps fetchDemographicSnapshots and emits
 * BOTH `FOLLOWER` and `ENGAGED` variants so the demographics cron can persist
 * one AudienceSnapshot per audience kind.
 */

import type { CreatorIgConnection } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { fetchDemographicSnapshots, type DemographicRow } from "@/lib/instagram";
import type {
  AudienceFetchResult,
  AudienceVariant,
  NormalizedAudience,
} from "./index";

const AGE_KEYS = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

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

  const followerRows = result.rows.filter((r) => r.demographicType === "FOLLOWER");
  const engagedRows = result.rows.filter((r) => r.demographicType === "ENGAGED");

  const variants: AudienceVariant[] = [];
  const followerAudience = normalize(followerRows);
  if (followerAudience) {
    variants.push({
      kind: "FOLLOWER",
      audience: followerAudience,
      raw: { demographicType: "FOLLOWER", rows: followerRows },
    });
  }
  const engagedAudience = normalize(engagedRows);
  if (engagedAudience) {
    variants.push({
      kind: "ENGAGED",
      audience: engagedAudience,
      raw: { demographicType: "ENGAGED", rows: engagedRows },
    });
  }

  if (variants.length === 0) {
    return { ok: false, audience: null, tokenBroken: false, reason: "no demographic data returned" };
  }

  return {
    ok: true,
    audience: followerAudience ?? engagedAudience,
    variants,
    tokenBroken: false,
  };
}

function normalize(rows: DemographicRow[]): NormalizedAudience | null {
  if (rows.length === 0) return null;

  const ages: Record<string, number> = {};
  const genders: Record<string, number> = {};
  const countries: Record<string, number> = {};
  const cities: Record<string, number> = {};

  for (const r of rows) {
    if (r.breakdownKey === "age") ages[r.breakdownValue] = (ages[r.breakdownValue] ?? 0) + r.value;
    else if (r.breakdownKey === "gender") genders[r.breakdownValue] = (genders[r.breakdownValue] ?? 0) + r.value;
    else if (r.breakdownKey === "country") countries[r.breakdownValue] = (countries[r.breakdownValue] ?? 0) + r.value;
    else if (r.breakdownKey === "city") cities[r.breakdownValue] = (cities[r.breakdownValue] ?? 0) + r.value;
  }

  // Age buckets normalized to fractional shares
  const ageTotal = Object.values(ages).reduce((s, v) => s + v, 0);
  const ageBuckets: Record<string, number> = {};
  if (ageTotal > 0) {
    for (const k of AGE_KEYS) {
      if (ages[k] != null) ageBuckets[k] = ages[k] / ageTotal;
    }
    // capture any non-canonical age keys too (defensive: API may return unexpected buckets)
    for (const k of Object.keys(ages)) {
      if (ageBuckets[k] == null) ageBuckets[k] = ages[k] / ageTotal;
    }
  }

  const male = genders["M"] ?? genders["male"] ?? 0;
  const female = genders["F"] ?? genders["female"] ?? 0;
  const unknown = genders["U"] ?? genders["unknown"] ?? 0;
  const totalGender = male + female + unknown;
  const genderSplit =
    totalGender > 0
      ? { male: male / totalGender, female: female / totalGender, other: unknown / totalGender }
      : { male: 0, female: 0, other: 0 };

  const countryTotal = Object.values(countries).reduce((s, v) => s + v, 0);
  const topCountries = Object.entries(countries)
    .map(([code, n]) => ({ code, share: countryTotal > 0 ? n / countryTotal : 0 }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 10);

  const cityTotal = Object.values(cities).reduce((s, v) => s + v, 0);
  const cityShares: Record<string, number> = {};
  if (cityTotal > 0) {
    const top = Object.entries(cities)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);
    for (const [name, n] of top) cityShares[name] = n / cityTotal;
  }

  return {
    ageBuckets,
    genderSplit,
    topCountries,
    totalReach: null,
    cities: Object.keys(cityShares).length > 0 ? cityShares : undefined,
  };
}
