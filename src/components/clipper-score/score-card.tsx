/**
 * Performance Score widget — Subsystem C.
 *
 * Reads the latest `ClipperPerformanceScore` row for a creator profile.
 * Computation owned by Subsystem B; this is presentation only.
 *
 * Falls back to an empty state if no score row exists yet (e.g. before B ships
 * or for new clippers without enough sample size).
 */

import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { ClipperPerformanceScore } from "@/lib/contracts";
import type { Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/admin/agency-format";

interface ScoreCardProps {
  creatorProfileId: string;
  /** "compact" hides the component breakdown. */
  variant?: "full" | "compact";
  className?: string;
}

const COMPONENT_LABELS: Array<{
  key: keyof ClipperPerformanceScore;
  translationKey: string;
}> = [
  { key: "approvalRate", translationKey: "approvalRate" },
  { key: "benchmarkRatio", translationKey: "benchmarkRatio" },
  { key: "trustScore", translationKey: "trustScore" },
  { key: "deliveryScore", translationKey: "deliveryScore" },
  { key: "audienceFit", translationKey: "audienceFit" },
];

type TierKey = "top" | "strong" | "steady" | "building";

function tierFor(score: number): { key: TierKey; color: string } {
  if (score >= 80) return { key: "top", color: "#22c55e" };
  if (score >= 60) return { key: "strong", color: "#3b82f6" };
  if (score >= 40) return { key: "steady", color: "#f59e0b" };
  return { key: "building", color: "#94a3b8" };
}

export async function ScoreCard({
  creatorProfileId,
  variant = "full",
  className,
}: ScoreCardProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.creator.score");
  // Read latest score row for this creator. Subsystem B writes these rows.
  // Until B ships, the table will be empty — fall through to empty state.
  const row = await prisma.clipperPerformanceScore.findFirst({
    where: { creatorProfileId },
    orderBy: { computedAt: "desc" },
  });

  if (!row) {
    return (
      <div
        className={className}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <ScoreIcon />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h3>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("emptyBody")}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {t("emptyDetail")}
        </p>
      </div>
    );
  }

  const score = Math.round(row.score);
  const tier = tierFor(score);

  return (
    <div
      className={className}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScoreIcon />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("title")}
          </h3>
        </div>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${tier.color}22`, color: tier.color }}
        >
          {t(`tiers.${tier.key}`)}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-4xl font-bold" style={{ color: tier.color }}>
          {score}
        </span>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          / 100
        </span>
      </div>
      <ScoreBar value={score} color={tier.color} />

      {variant === "full" && (
        <div className="mt-4 space-y-2">
          {COMPONENT_LABELS.map((c) => {
            const v = Math.round(Number(row[c.key]) || 0);
            return (
              <div key={c.key} className="flex items-center gap-3">
                <span
                  className="text-xs flex-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t(`components.${c.translationKey}`)}
                </span>
                <div
                  style={{
                    width: 80,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--bg-secondary)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, v))}%`,
                      height: "100%",
                      background: tier.color,
                    }}
                  />
                </div>
                <span
                  className="text-xs font-medium tabular-nums"
                  style={{ width: 32, textAlign: "right", color: "var(--text-primary)" }}
                >
                  {v}
                </span>
              </div>
            );
          })}
          <p className="text-xs pt-2" style={{ color: "var(--text-muted)" }}>
            {t("sampleUpdated", {
              sampleSize: row.sampleSize,
              date: formatDate(row.computedAt, locale),
            })}
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: 8,
        borderRadius: 999,
        background: "var(--bg-secondary)",
        overflow: "hidden",
        marginTop: 4,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          background: color,
          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}

function ScoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: "var(--text-muted)" }}
    >
      <path d="M12 2v4" />
      <path d="m6.41 6.41 2.83 2.83" />
      <path d="M2 12h4" />
      <path d="m6.41 17.59 2.83-2.83" />
      <path d="M12 18v4" />
      <path d="m17.59 17.59-2.83-2.83" />
      <path d="M22 12h-4" />
      <path d="m17.59 6.41-2.83 2.83" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
