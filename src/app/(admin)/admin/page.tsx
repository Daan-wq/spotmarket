import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KpiCard } from "@/components/admin/kpi-card";
import { CreatorScoreCell } from "@/components/admin/creator-score-cell";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = new Date();
  x.setDate(x.getDate() - n);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function loadCampaignsAtRisk() {
  // "At risk" = active, deadline within 7 days, less than 70% of goalViews captured.
  const now = new Date();
  const in7d = new Date();
  in7d.setDate(now.getDate() + 7);

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "active",
      deadline: { lte: in7d },
    },
    select: {
      id: true,
      name: true,
      goalViews: true,
      deadline: true,
      campaignSubmissions: {
        where: { status: "APPROVED" },
        select: { eligibleViews: true },
      },
    },
    take: 50,
  });

  const ranked = campaigns
    .map((c) => {
      const captured = c.campaignSubmissions.reduce((s: number, x: { eligibleViews: number | null }) => s + (x.eligibleViews ?? 0), 0);
      const goal = c.goalViews ? Number(c.goalViews) : 0;
      const pct = goal > 0 ? captured / goal : 1;
      return { id: c.id, name: c.name, deadline: c.deadline, captured, goal, pct };
    })
    .filter((c) => c.goal === 0 || c.pct < 0.7)
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  return { count: ranked.length, items: ranked };
}

async function loadSignalsToday() {
  const start = startOfDay();
  const [total, critical, tokenBroken] = await Promise.all([
    prisma.submissionSignal.count({
      where: { createdAt: { gte: start }, severity: { in: ["WARN", "CRITICAL"] } },
    }),
    prisma.submissionSignal.count({
      where: { createdAt: { gte: start }, severity: "CRITICAL" },
    }),
    prisma.submissionSignal.count({
      where: { type: "TOKEN_BROKEN", resolvedAt: null },
    }),
  ]);
  return { total, critical, tokenBroken };
}

async function loadFraudFlagged() {
  return prisma.submissionSignal.count({
    where: {
      type: { in: ["BOT_SUSPECTED", "DUPLICATE", "RATIO_ANOMALY"] },
      resolvedAt: null,
    },
  });
}

async function loadWeeklyViews() {
  // Sum eligibleViews approved in the last 7 days vs the prior 7 days.
  const start7 = daysAgo(7);
  const start14 = daysAgo(14);
  const [thisWeek, lastWeek] = await Promise.all([
    prisma.campaignSubmission.aggregate({
      where: { status: "APPROVED", reviewedAt: { gte: start7 } },
      _sum: { eligibleViews: true },
    }),
    prisma.campaignSubmission.aggregate({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: start14, lt: start7 },
      },
      _sum: { eligibleViews: true },
    }),
  ]);
  const a = thisWeek._sum.eligibleViews ?? 0;
  const b = lastWeek._sum.eligibleViews ?? 0;
  const trend = b > 0 ? ((a - b) / b) * 100 : null;
  return { thisWeek: a, lastWeek: b, trend };
}

async function loadTopCreators() {
  // Most recent score per creator. Cheap fallback if B hasn't shipped scores yet.
  const scores = await prisma.clipperPerformanceScore.findMany({
    orderBy: [{ score: "desc" }, { computedAt: "desc" }],
    take: 50,
  });
  // Dedupe to latest per creator
  const seen = new Set<string>();
  const top: typeof scores = [];
  for (const s of scores) {
    if (seen.has(s.creatorProfileId)) continue;
    seen.add(s.creatorProfileId);
    top.push(s);
    if (top.length >= 5) break;
  }
  if (top.length === 0) return [];
  const profiles = await prisma.creatorProfile.findMany({
    where: { id: { in: top.map((s) => s.creatorProfileId) } },
    select: { id: true, displayName: true, user: { select: { id: true, email: true } } },
  });
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return top.map((s) => ({
    score: s.score,
    sampleSize: s.sampleSize,
    profile: byId.get(s.creatorProfileId) ?? null,
  }));
}

async function loadOauthTokenHealth() {
  const now = new Date();
  const [igExpired, ttExpired, ytExpired, fbExpired, total] = await Promise.all([
    prisma.creatorIgConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorTikTokConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorYtConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    prisma.creatorFbConnection.count({ where: { tokenExpiresAt: { lt: now } } }),
    Promise.all([
      prisma.creatorIgConnection.count(),
      prisma.creatorTikTokConnection.count(),
      prisma.creatorYtConnection.count(),
      prisma.creatorFbConnection.count(),
    ]).then((arr) => arr.reduce((s, x) => s + x, 0)),
  ]);
  const broken = igExpired + ttExpired + ytExpired + fbExpired;
  return { broken, total };
}

export default async function AdminDashboard() {
  const [risk, signals, fraud, views, top, oauth, totals] = await Promise.all([
    loadCampaignsAtRisk(),
    loadSignalsToday(),
    loadFraudFlagged(),
    loadWeeklyViews(),
    loadTopCreators(),
    loadOauthTokenHealth(),
    Promise.all([
      prisma.creatorProfile.count(),
      prisma.campaign.count({ where: { status: "active" } }),
    ]),
  ]);
  const [creators, activeCampaigns] = totals;

  return (
    <div className="w-full p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Command center
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Live operational health — what needs your attention right now.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <KpiCard
          label="Campaigns at risk"
          value={risk.count}
          hint="active · ≤7d to deadline · <70% of goal"
          tone={risk.count > 0 ? "warning" : "default"}
          href="/admin/campaigns"
        />
        <KpiCard
          label="Signals today"
          value={signals.total}
          hint={signals.critical > 0 ? `${signals.critical} critical` : "WARN+ severity"}
          tone={signals.critical > 0 ? "danger" : signals.total > 0 ? "warning" : "default"}
          href="/admin/signals"
        />
        <KpiCard
          label="Fraud flags"
          value={fraud}
          hint="bot / duplicate / ratio · open"
          tone={fraud > 0 ? "warning" : "default"}
          href="/admin/signals?type=BOT_SUSPECTED"
        />
        <KpiCard
          label="Token broken"
          value={signals.tokenBroken}
          hint={`${oauth.broken}/${oauth.total} OAuth tokens expired`}
          tone={signals.tokenBroken > 0 || oauth.broken > 0 ? "warning" : "success"}
          href="/admin/signals?type=TOKEN_BROKEN"
        />
        <KpiCard
          label="Weekly views"
          value={views.thisWeek.toLocaleString()}
          hint={`prior 7d: ${views.lastWeek.toLocaleString()}`}
          trend={views.trend}
        />
        <KpiCard
          label="Active platform"
          value={`${activeCampaigns} / ${creators}`}
          hint="active campaigns / total creators"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Campaigns at risk
            </h2>
            <Link
              href="/admin/campaigns"
              className="text-xs underline"
              style={{ color: "var(--primary, var(--accent))" }}
            >
              All campaigns →
            </Link>
          </div>
          {risk.items.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No campaigns at risk right now.
            </p>
          ) : (
            <ul>
              {risk.items.map((c) => (
                <li
                  key={c.id}
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/campaigns/${c.id}`}
                      className="text-sm font-medium block truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {c.name}
                    </Link>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      Deadline {c.deadline.toLocaleDateString()} ·{" "}
                      {c.goal > 0
                        ? `${c.captured.toLocaleString()} / ${c.goal.toLocaleString()} views (${Math.round(
                            c.pct * 100
                          )}%)`
                        : `${c.captured.toLocaleString()} views captured (no goal set)`}
                    </p>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[11px] font-medium ml-2 shrink-0"
                    style={{ background: "var(--warning-bg)", color: "var(--warning-text)" }}
                  >
                    {c.goal > 0 ? `${Math.round((1 - c.pct) * 100)}% gap` : "no goal"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Top performing creators
            </h2>
            <Link
              href="/admin/creators"
              className="text-xs underline"
              style={{ color: "var(--primary, var(--accent))" }}
            >
              All creators →
            </Link>
          </div>
          {top.length === 0 ? (
            <p className="px-5 py-8 text-sm" style={{ color: "var(--text-secondary)" }}>
              No performance scores computed yet. Subsystem B will populate these once benchmarks run.
            </p>
          ) : (
            <ul>
              {top.map((row) => (
                <li
                  key={row.profile?.id ?? Math.random()}
                  className="px-5 py-3 flex items-center justify-between"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <Link
                      href={row.profile ? `/admin/creators/${row.profile.id}` : "#"}
                      className="text-sm font-medium block truncate"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {row.profile?.displayName ?? "Unknown creator"}
                    </Link>
                    <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                      {row.profile?.user?.email ?? "—"}
                    </p>
                  </div>
                  <CreatorScoreCell score={row.score} sampleSize={row.sampleSize} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
