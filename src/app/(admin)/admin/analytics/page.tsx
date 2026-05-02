import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/admin/kpi-card";

export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  const x = new Date();
  x.setDate(x.getDate() - n);
  return x;
}

export default async function AnalyticsPage() {
  const since30 = daysAgo(30);

  // CPV efficiency: total earned / total eligible views (last 30d, approved subs)
  const cpvAgg = await prisma.campaignSubmission.aggregate({
    where: { status: "APPROVED", reviewedAt: { gte: since30 } },
    _sum: { earnedAmount: true, eligibleViews: true },
  });
  const earned30 = Number(cpvAgg._sum.earnedAmount ?? 0);
  const views30 = Number(cpvAgg._sum.eligibleViews ?? 0);
  const cpv = views30 > 0 ? earned30 / views30 : 0;

  // OAuth success rate: snapshots with OAUTH_* / total snapshots over 30d
  const [oauthSucc, oauthTotal] = await Promise.all([
    prisma.metricSnapshot.count({
      where: {
        capturedAt: { gte: since30 },
        source: { in: ["OAUTH_IG", "OAUTH_TT", "OAUTH_YT", "OAUTH_FB"] },
      },
    }),
    prisma.metricSnapshot.count({ where: { capturedAt: { gte: since30 } } }),
  ]);
  const oauthRate = oauthTotal > 0 ? (oauthSucc / oauthTotal) * 100 : 0;

  // Token-broken rate: connections with expiresAt < now / total
  const now = new Date();
  const [igExp, ttExp, ytExp, fbExp, igAll, ttAll, ytAll, fbAll] = await Promise.all([
    prisma.creatorIgConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorTikTokConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorYtConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorFbConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorIgConnection.count(),
    prisma.creatorTikTokConnection.count(),
    prisma.creatorYtConnection.count(),
    prisma.creatorFbConnection.count(),
  ]);
  const tokenBroken = igExp + ttExp + ytExp + fbExp;
  const tokenTotal = igAll + ttAll + ytAll + fbAll;
  const tokenRate = tokenTotal > 0 ? (tokenBroken / tokenTotal) * 100 : 0;

  // Demographic distribution: aggregate latest AudienceSnapshots
  const audSnapshots = await prisma.audienceSnapshot.findMany({
    orderBy: { capturedAt: "desc" },
    take: 200,
  });
  const seen = new Set<string>();
  const latestByConn: typeof audSnapshots = [];
  for (const a of audSnapshots) {
    const key = `${a.connectionType}:${a.connectionId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latestByConn.push(a);
  }

  const ageBuckets: Record<string, number> = {};
  const genderTotals = { male: 0, female: 0, other: 0 };
  let genderSamples = 0;
  const countryTotals: Record<string, number> = {};
  for (const a of latestByConn) {
    const ages = (a.ageBuckets as Record<string, number>) ?? {};
    for (const [k, v] of Object.entries(ages)) {
      ageBuckets[k] = (ageBuckets[k] ?? 0) + (Number(v) || 0);
    }
    const gen = a.genderSplit as { male?: number; female?: number; other?: number } | null;
    if (gen) {
      genderTotals.male += Number(gen.male ?? 0);
      genderTotals.female += Number(gen.female ?? 0);
      genderTotals.other += Number(gen.other ?? 0);
      genderSamples += 1;
    }
    const countries = (a.topCountries as Array<{ code: string; share: number }>) ?? [];
    for (const c of countries) {
      countryTotals[c.code] = (countryTotals[c.code] ?? 0) + (Number(c.share) || 0);
    }
  }
  const ageEntries = Object.entries(ageBuckets).sort((a, b) => a[0].localeCompare(b[0]));
  const ageSum = ageEntries.reduce((s, [, v]) => s + v, 0);
  const topCountries = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const topCountrySum = topCountries.reduce((s, [, v]) => s + v, 0);
  const totalGender = genderTotals.male + genderTotals.female + genderTotals.other;

  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Platform analytics
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Trailing 30-day view of efficiency, tracking quality, and audience.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="CPV (effective)"
          value={`$${cpv.toFixed(6)}`}
          hint={`$${earned30.toFixed(0)} paid · ${views30.toLocaleString()} views`}
        />
        <KpiCard
          label="OAuth success rate"
          value={`${oauthRate.toFixed(1)}%`}
          hint={`${oauthSucc.toLocaleString()} / ${oauthTotal.toLocaleString()} snapshots`}
          tone={oauthRate < 80 ? "warning" : "success"}
        />
        <KpiCard
          label="Token broken"
          value={`${tokenRate.toFixed(1)}%`}
          hint={`${tokenBroken} / ${tokenTotal} connections`}
          tone={tokenRate > 10 ? "warning" : "default"}
        />
        <KpiCard
          label="Audience samples"
          value={latestByConn.length}
          hint="connections with latest snapshot"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Age distribution
          </h2>
          {ageEntries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No audience snapshots yet.
            </p>
          ) : (
            <div className="space-y-2">
              {ageEntries.map(([bucket, v]) => {
                const pct = ageSum > 0 ? (v / ageSum) * 100 : 0;
                return (
                  <div key={bucket}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-primary)" }}>{bucket}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <div
                        style={{ width: `${pct}%`, height: "100%", background: "var(--accent)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Gender split
          </h2>
          {genderSamples === 0 || totalGender === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No audience snapshots yet.
            </p>
          ) : (
            <div className="space-y-2">
              {(["male", "female", "other"] as const).map((k) => {
                const pct = (genderTotals[k] / totalGender) * 100;
                return (
                  <div key={k}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize" style={{ color: "var(--text-primary)" }}>{k}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--success-text)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Top countries
          </h2>
          {topCountries.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No audience snapshots yet.
            </p>
          ) : (
            <div className="space-y-2">
              {topCountries.map(([code, v]) => {
                const pct = topCountrySum > 0 ? (v / topCountrySum) * 100 : 0;
                return (
                  <div key={code}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-primary)" }}>{code}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--warning-text)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
