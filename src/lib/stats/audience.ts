import type { AudienceSnapshot, AudienceKind } from "@prisma/client";
import type { AgeBuckets, AggregatedDemographics, CountryShare, GenderSplit } from "./types";

/**
 * Aggregate a list of latest-per-connection AudienceSnapshots into a single
 * demographic distribution. Bucketed values are summed (since each snapshot
 * already represents the share-of-100 on its own connection, summing produces
 * a fleet-weighted distribution which is what we want for tiles/cards).
 *
 * `kind` is optional — when set, only snapshots matching that AudienceKind are
 * used. When omitted, all snapshots are aggregated regardless of kind.
 */
export function aggregateAudience(
  snapshots: AudienceSnapshot[],
  kind?: AudienceKind,
): AggregatedDemographics {
  const filtered = kind ? snapshots.filter((s) => s.kind === kind) : snapshots;

  const ageBuckets: AgeBuckets = {};
  const genderTotals: Required<GenderSplit> = { male: 0, female: 0, other: 0 };
  const countryTotals: Record<string, number> = {};

  for (const snap of filtered) {
    const ages = (snap.ageBuckets as AgeBuckets | null) ?? {};
    for (const [bucket, value] of Object.entries(ages)) {
      const v = Number(value) || 0;
      ageBuckets[bucket] = (ageBuckets[bucket] ?? 0) + v;
    }
    const gender = (snap.genderSplit as GenderSplit | null) ?? {};
    genderTotals.male += Number(gender.male ?? 0);
    genderTotals.female += Number(gender.female ?? 0);
    genderTotals.other += Number(gender.other ?? 0);

    const countries = (snap.topCountries as CountryShare[] | null) ?? [];
    for (const c of countries) {
      const share = Number(c.share) || 0;
      countryTotals[c.code] = (countryTotals[c.code] ?? 0) + share;
    }
  }

  const topCountries: CountryShare[] = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([code, share]) => ({ code, share }));

  return {
    ageBuckets,
    genderSplit: genderTotals,
    topCountries,
    sampleCount: filtered.length,
  };
}

/**
 * Pick the latest snapshot per (connectionType, connectionId) pair. Input must
 * already be ordered by capturedAt desc.
 */
export function latestPerConnection(snapshots: AudienceSnapshot[]): AudienceSnapshot[] {
  const seen = new Set<string>();
  const out: AudienceSnapshot[] = [];
  for (const snap of snapshots) {
    const key = `${snap.connectionType}:${snap.connectionId}:${snap.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(snap);
  }
  return out;
}
