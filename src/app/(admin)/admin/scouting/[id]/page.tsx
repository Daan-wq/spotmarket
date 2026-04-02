import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NicheBadge } from "@/components/admin/NicheSelector";
import { updateScoutStatus, rejectScoutedPage } from "../actions";
import { ScoutStatus } from "@prisma/client";

const STATUS_ORDER: ScoutStatus[] = [
  "IDENTIFIED", "CONTACTED", "DISCOVERY_CALL", "PROPOSAL_SENT", "SIGNED",
];


export default async function ScoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const page = await prisma.scoutedPage.findUnique({ where: { id } });
  if (!page) notFound();

  const currentStep = page.status === "REJECTED" ? -1 : STATUS_ORDER.indexOf(page.status);
  const scoreColor = page.totalScore >= 70 ? "var(--success)" : page.totalScore >= 50 ? "var(--warning-text)" : "var(--error-text)";

  return (
    <div className="p-8 max-w-3xl">
      <Link href="/admin/scouting" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Scouting Pipeline
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>@{page.instagramHandle}</h1>
          <div className="flex items-center gap-2 mt-1">
            {page.niche && <NicheBadge niche={page.niche} />}
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {page.followerCount >= 1000 ? `${(page.followerCount / 1000).toFixed(0)}K` : page.followerCount} followers
            </span>
          </div>
        </div>
        <div
          className="text-right rounded-xl px-5 py-3"
          style={{ background: "var(--bg-primary)", border: `2px solid ${scoreColor}` }}
        >
          <p className="text-3xl font-bold" style={{ color: scoreColor }}>{Math.round(page.totalScore)}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>/ 100 score</p>
        </div>
      </div>

      {/* Progress tracker */}
      {page.status !== "REJECTED" && (
        <div className="flex items-center gap-0 mb-8">
          {STATUS_ORDER.map((s, i) => {
            const done = i <= currentStep;
            const current = i === currentStep;
            return (
              <div key={s} className="flex items-center flex-1">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2"
                  style={{
                    background: done ? "var(--text-primary)" : "var(--bg-primary)",
                    color: done ? "#fff" : "var(--text-muted)",
                    borderColor: current ? "var(--text-primary)" : done ? "var(--text-primary)" : "var(--border)",
                  }}
                >
                  {done && !current ? "✓" : i + 1}
                </div>
                {i < STATUS_ORDER.length - 1 && (
                  <div className="flex-1 h-0.5 mx-1" style={{ background: done ? "var(--text-primary)" : "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score breakdown */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Scorecard Breakdown</p>
        </div>
        <div style={{ borderColor: 'var(--border)' }}>
          {[
            { label: "Engagement Rate", weight: "30%", value: `${page.engagementRate}%`, raw: page.engagementRate, max: 5 },
            { label: "Monthly Growth", weight: "25%", value: `${page.monthlyGrowthPct}%/month`, raw: page.monthlyGrowthPct, max: 10 },
            { label: "Content Frequency", weight: "15%", value: `${page.contentFreqPerWeek}x/week`, raw: page.contentFreqPerWeek, max: 7 },
            { label: "Authenticity", weight: "10%", value: `${page.authenticityScore}/100`, raw: page.authenticityScore, max: 100 },
          ].map((row) => {
            const pct = Math.min((row.raw / row.max) * 100, 100);
            return (
              <div key={row.label} className="px-5 py-3 flex items-center gap-4 border-b" style={{ background: "var(--bg-elevated)", borderColor: 'var(--border)' }}>
                <div className="w-40 flex-shrink-0">
                  <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{row.label}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{row.weight} gewicht</p>
                </div>
                <div className="flex-1">
                  <div className="w-full rounded-full h-1.5" style={{ background: "var(--muted)" }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct >= 70 ? "var(--success)" : pct >= 40 ? "var(--warning-text)" : "var(--error-text)" }} />
                  </div>
                </div>
                <p className="text-sm font-medium w-20 text-right" style={{ color: "var(--card-foreground)" }}>{row.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {page.notes && (
        <div className="rounded-xl p-4 mb-6" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>NOTITIES</p>
          <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{page.notes}</p>
        </div>
      )}

      {/* Actions */}
      {page.status !== "SIGNED" && page.status !== "REJECTED" && (
        <div className="flex gap-3">
          {currentStep < STATUS_ORDER.length - 1 && (
            <form action={updateScoutStatus.bind(null, page.id, STATUS_ORDER[currentStep + 1])}>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: "var(--text-primary)" }}
              >
                → Volgende stap: {STATUS_ORDER[currentStep + 1].replace("_", " ")}
              </button>
            </form>
          )}
          <form action={rejectScoutedPage.bind(null, page.id, "Handmatig afgewezen")}>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
            >
              Afwijzen
            </button>
          </form>
        </div>
      )}

      {page.status === "REJECTED" && (
        <div className="rounded-xl px-5 py-4" style={{ background: "var(--error-bg)", border: "1px solid var(--error-text)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--error-text)" }}>Afgewezen</p>
          {page.rejectedReason && (
            <p className="text-sm mt-0.5" style={{ color: "var(--error-text)" }}>{page.rejectedReason}</p>
          )}
        </div>
      )}

      {page.status === "SIGNED" && (
        <div className="rounded-xl px-5 py-4" style={{ background: "var(--success-bg)", border: "1px solid var(--success)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
            ✓ Getekend op {page.signedAt ? new Date(page.signedAt).toLocaleDateString("nl-NL") : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
