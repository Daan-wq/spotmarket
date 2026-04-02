import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ScoutStatus } from "@prisma/client";
import { NicheBadge } from "@/components/admin/NicheSelector";
import { updateScoutStatus } from "./actions";

const COLUMNS: { status: ScoutStatus; label: string; color: string }[] = [
  { status: "IDENTIFIED",    label: "Identified",     color: "var(--bg-secondary)" },
  { status: "CONTACTED",     label: "Contacted",      color: "var(--accent-bg)" },
  { status: "DISCOVERY_CALL",label: "Discovery Call", color: "var(--accent-bg)" },
  { status: "PROPOSAL_SENT", label: "Proposal Sent",  color: "var(--warning-bg)" },
  { status: "SIGNED",        label: "Signed ✓",       color: "var(--success-bg)" },
  { status: "REJECTED",      label: "Rejected",       color: "var(--error-bg)" },
];

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "var(--success)" : score >= 50 ? "var(--warning-text)" : "var(--error-text)";
  return (
    <div className="w-full rounded-full h-1.5 mt-1" style={{ background: "var(--muted)" }}>
      <div
        className="h-1.5 rounded-full"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
}

export default async function ScoutingPage() {
  const pages = await prisma.scoutedPage.findMany({
    orderBy: { totalScore: "desc" },
  });

  const byStatus = Object.fromEntries(
    COLUMNS.map((col) => [
      col.status,
      pages.filter((p) => p.status === col.status),
    ])
  ) as Record<ScoutStatus, typeof pages>;

  const totalSigned = byStatus.SIGNED.length;
  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((s, p) => s + p.totalScore, 0) / pages.length)
    : 0;
  const highPotential = pages.filter((p) => p.totalScore >= 70).length;

  return (
    <div className="p-8 max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Scouting Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {pages.length} scouted · {highPotential} high-potential (≥70) · {totalSigned} signed · avg score {avgScore}
          </p>
        </div>
        <Link
          href="/admin/scouting/new"
          className="text-sm px-4 py-2 rounded-lg font-medium text-white"
          style={{ background: "var(--text-primary)" }}
        >
          + Scout page
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const cards = byStatus[col.status] ?? [];
          return (
            <div key={col.status} className="flex-shrink-0 w-64">
              <div
                className="rounded-t-lg px-3 py-2 flex items-center justify-between"
                style={{ background: col.color }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--card-foreground)" }}>{col.label}</span>
                <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255, 255, 255, 0.6)', color: "var(--card-foreground)" }}>
                  {cards.length}
                </span>
              </div>

              <div className="space-y-2 mt-2 min-h-[200px]">
                {cards.map((page) => (
                  <div
                    key={page.id}
                    className="rounded-lg p-3 shadow-sm"
                    style={{ background: "var(--bg-elevated)", border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        href={`/admin/scouting/${page.id}`}
                        className="text-sm font-medium hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        @{page.instagramHandle}
                      </Link>
                      <span className="text-xs font-semibold" style={{ color: page.totalScore >= 70 ? "var(--success)" : "var(--text-muted)" }}>
                        {Math.round(page.totalScore)}
                      </span>
                    </div>

                    <ScoreBar score={page.totalScore} />

                    <div className="flex items-center gap-1.5 mt-2">
                      {page.niche && <NicheBadge niche={page.niche} />}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {page.followerCount >= 1000 ? `${(page.followerCount / 1000).toFixed(0)}K` : page.followerCount}
                      </span>
                    </div>

                    {/* Quick-advance buttons */}
                    {col.status !== "SIGNED" && col.status !== "REJECTED" && (
                      <div className="mt-2 flex gap-1">
                        {COLUMNS.filter((c) =>
                          COLUMNS.indexOf(c) === COLUMNS.indexOf(col) + 1 &&
                          c.status !== "REJECTED"
                        ).map((next) => (
                          <form key={next.status} action={updateScoutStatus.bind(null, page.id, next.status)}>
                            <button
                              type="submit"
                              className="text-[11px] px-2 py-0.5 rounded border transition-colors"
                              style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                            >
                              → {next.label}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
