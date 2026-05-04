import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/admin/kpi-card";
import { CreatorScoreCell } from "@/components/admin/creator-score-cell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ campaignId: string }>;
}

export default async function CampaignHealthPage({ params }: PageProps) {
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      campaignSubmissions: {
        select: {
          id: true,
          creatorId: true,
          status: true,
          eligibleViews: true,
          earnedAmount: true,
          velocityScore: true,
          createdAt: true,
          postUrl: true,
          creator: { select: { id: true, email: true } },
          submissionSignals: {
            where: { resolvedAt: null },
            select: { id: true, type: true, severity: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!campaign) return notFound();

  // Latest benchmark for this campaign (B may not have shipped yet)
  const benchmark = await prisma.campaignBenchmark.findFirst({
    where: { campaignId },
    orderBy: { computedAt: "desc" },
  });

  const totalEligibleViews = campaign.campaignSubmissions.reduce(
    (s, x) => s + (x.eligibleViews ?? 0),
    0
  );
  const totalEarned = campaign.campaignSubmissions.reduce(
    (s, x) => s + Number(x.earnedAmount ?? 0),
    0
  );
  const totalBudget = Number(campaign.totalBudget);
  const goalViews = campaign.goalViews ? Number(campaign.goalViews) : 0;
  const burnPct = totalBudget > 0 ? totalEarned / totalBudget : 0;
  const goalPct = goalViews > 0 ? totalEligibleViews / goalViews : 0;

  // Aggregate per creator for leaderboard
  const byCreator = new Map<
    string,
    { creatorId: string; email: string; submissions: number; views: number; earned: number; flagged: number }
  >();
  for (const s of campaign.campaignSubmissions) {
    const k = s.creatorId;
    const cur =
      byCreator.get(k) ??
      {
        creatorId: k,
        email: s.creator.email,
        submissions: 0,
        views: 0,
        earned: 0,
        flagged: 0,
      };
    cur.submissions += 1;
    cur.views += s.eligibleViews ?? 0;
    cur.earned += Number(s.earnedAmount ?? 0);
    cur.flagged += s.submissionSignals.length > 0 ? 1 : 0;
    byCreator.set(k, cur);
  }
  const leaderboard = Array.from(byCreator.values()).sort((a, b) => b.views - a.views).slice(0, 20);

  // Pull latest performance scores for those creators in one go
  const creatorProfileIds = (
    await prisma.creatorProfile.findMany({
      where: { userId: { in: leaderboard.map((l) => l.creatorId) } },
      select: { id: true, userId: true },
    })
  ).map((p) => ({ profileId: p.id, userId: p.userId }));
  const profileByUserId = new Map(creatorProfileIds.map((p) => [p.userId, p.profileId]));
  const scores = creatorProfileIds.length
    ? await prisma.clipperPerformanceScore.findMany({
        where: { creatorProfileId: { in: creatorProfileIds.map((p) => p.profileId) } },
        orderBy: { computedAt: "desc" },
      })
    : [];
  const scoreByProfileId = new Map<string, { score: number; sampleSize: number }>();
  for (const s of scores) {
    if (!scoreByProfileId.has(s.creatorProfileId)) {
      scoreByProfileId.set(s.creatorProfileId, { score: s.score, sampleSize: s.sampleSize });
    }
  }

  // Velocity distribution for chart (counts of velocityScore buckets vs benchmark)
  const buckets: { label: string; count: number; tone: "danger" | "warning" | "default" | "success" }[] = [
    { label: "Below p10 (under)", count: 0, tone: "danger" },
    { label: "p10–p50", count: 0, tone: "warning" },
    { label: "p50–p90", count: 0, tone: "default" },
    { label: "Above p90 (viral)", count: 0, tone: "success" },
  ];
  if (benchmark) {
    for (const sub of campaign.campaignSubmissions) {
      const v = sub.velocityScore;
      if (v == null) continue;
      if (v < benchmark.velocityP10) buckets[0].count += 1;
      else if (v < benchmark.velocityP50) buckets[1].count += 1;
      else if (v < benchmark.velocityP90) buckets[2].count += 1;
      else buckets[3].count += 1;
    }
  }
  const totalBucketed = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="w-full p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/campaigns" className="text-xs underline" style={{ color: "var(--text-secondary)" }}>
            ← All campaigns
          </Link>
          <h1 className="text-3xl font-bold mt-2 mb-1" style={{ color: "var(--text-primary)" }}>
            {campaign.name}
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            {campaign.status} · deadline {campaign.deadline.toLocaleDateString()} ·{" "}
            {campaign.platform.toLowerCase()}
          </p>
        </div>
        <Link
          href={`/admin/campaigns/${campaign.id}/edit`}
          className="px-3 py-1.5 rounded-md text-xs font-medium"
          style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          Edit campaign
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Budget burn"
          value={`$${totalEarned.toFixed(2)}`}
          hint={`of $${totalBudget.toFixed(2)} (${Math.round(burnPct * 100)}%)`}
          tone={burnPct > 0.9 ? "warning" : "default"}
        />
        <KpiCard
          label="Goal views"
          value={totalEligibleViews.toLocaleString()}
          hint={goalViews > 0 ? `of ${goalViews.toLocaleString()} (${Math.round(goalPct * 100)}%)` : "no goal set"}
          tone={goalViews > 0 && goalPct < 0.5 ? "warning" : "default"}
        />
        <KpiCard label="Submissions" value={campaign.campaignSubmissions.length} hint="all statuses" />
        <KpiCard
          label="Active creators"
          value={byCreator.size}
          hint="unique creators with submissions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Benchmark distribution
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Velocity scores vs campaign benchmark (views/hour)
          </p>
          {!benchmark ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)" }}>
              No benchmark computed yet — Subsystem B will populate this once enough submissions exist.
            </p>
          ) : totalBucketed === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: "var(--text-secondary)" }}>
              No velocity scores recorded yet on submissions.
            </p>
          ) : (
            <div className="space-y-2">
              {buckets.map((b) => {
                const pct = totalBucketed > 0 ? (b.count / totalBucketed) * 100 : 0;
                const color =
                  b.tone === "danger"
                    ? "var(--error-text)"
                    : b.tone === "warning"
                    ? "var(--warning-text)"
                    : b.tone === "success"
                    ? "var(--success-text)"
                    : "var(--accent)";
                return (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-primary)" }}>{b.label}</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {b.count} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "var(--bg-primary)" }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: color,
                          transition: "width 200ms",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] mt-3" style={{ color: "var(--text-muted, var(--text-secondary))" }}>
                p10 {benchmark.velocityP10.toFixed(1)} · p50 {benchmark.velocityP50.toFixed(1)} · p90{" "}
                {benchmark.velocityP90.toFixed(1)} v/h · n={benchmark.sampleSize}
              </p>
            </div>
          )}
        </section>

        <section
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Budget burn-down
          </h2>
          <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
            Earnings paid vs total budget; views captured vs goal
          </p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-primary)" }}>Budget</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  ${totalEarned.toFixed(0)} / ${totalBudget.toFixed(0)}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div
                  style={{
                    width: `${Math.min(100, burnPct * 100)}%`,
                    height: "100%",
                    background: burnPct > 0.9 ? "var(--error-text)" : "var(--accent)",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "var(--text-primary)" }}>Goal views</span>
                <span style={{ color: "var(--text-secondary)" }}>
                  {totalEligibleViews.toLocaleString()} /{" "}
                  {goalViews > 0 ? goalViews.toLocaleString() : "—"}
                </span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
                <div
                  style={{
                    width: `${Math.min(100, goalPct * 100)}%`,
                    height: "100%",
                    background: "var(--success-text)",
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section
        className="rounded-xl overflow-hidden mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Creator leaderboard
          </h2>
        </div>
        {leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            No submissions yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Creator</th>
                <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Score</th>
                <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Submissions</th>
                <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Eligible views</th>
                <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Earned</th>
                <th className="px-5 py-3 text-right text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Flagged</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((c) => {
                const profileId = profileByUserId.get(c.creatorId);
                const score = profileId ? scoreByProfileId.get(profileId) : null;
                return (
                  <tr key={c.creatorId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="px-5 py-3 text-sm" style={{ color: "var(--text-primary)" }}>
                      {profileId ? (
                        <Link href={`/admin/creators/${profileId}`} className="underline">
                          {c.email}
                        </Link>
                      ) : (
                        c.email
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <CreatorScoreCell score={score?.score ?? null} sampleSize={score?.sampleSize ?? null} />
                    </td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {c.submissions}
                    </td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {c.views.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums" style={{ color: "var(--text-primary)" }}>
                      ${c.earned.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right tabular-nums" style={{ color: c.flagged > 0 ? "var(--warning-text)" : "var(--text-secondary)" }}>
                      {c.flagged}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Submission feed
          </h2>
        </div>
        <ul>
          {campaign.campaignSubmissions.slice(0, 30).map((s) => (
            <li
              key={s.id}
              className="px-5 py-3 flex items-center justify-between gap-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="min-w-0">
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                  <span className="font-medium">{s.creator.email}</span>
                  <span className="ml-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {s.createdAt.toLocaleString()}
                  </span>
                </p>
                {s.submissionSignals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {s.submissionSignals.map((sig) => (
                      <span
                        key={sig.id}
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium uppercase"
                        style={{
                          background: sig.severity === "CRITICAL" ? "var(--error-bg)" : "var(--warning-bg)",
                          color: sig.severity === "CRITICAL" ? "var(--error-text)" : "var(--warning-text)",
                        }}
                      >
                        {sig.type.replaceAll("_", " ").toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  {(s.eligibleViews ?? 0).toLocaleString()} v
                </span>
                <span className="text-xs tabular-nums" style={{ color: "var(--text-secondary)" }}>
                  ${Number(s.earnedAmount ?? 0).toFixed(2)}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    background:
                      s.status === "APPROVED"
                        ? "var(--success-bg)"
                        : s.status === "REJECTED"
                        ? "var(--error-bg)"
                        : "var(--warning-bg)",
                    color:
                      s.status === "APPROVED"
                        ? "var(--success-text)"
                        : s.status === "REJECTED"
                        ? "var(--error-text)"
                        : "var(--warning-text)",
                  }}
                >
                  {s.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
