import { getTranslations } from "next-intl/server";

interface Milestone {
  invites: number;
  rewardKey: string;
}

const MILESTONES: Milestone[] = [
  { invites: 1, rewardKey: "firstCommission" },
  { invites: 5, rewardKey: "recruiterBadge" },
  { invites: 10, rewardKey: "priorityFeedback" },
  { invites: 25, rewardKey: "earlyAccess" },
  { invites: 50, rewardKey: "topReferrer" },
];

interface MilestoneCardProps {
  totalInvited: number;
}

export async function MilestoneCard({ totalInvited }: MilestoneCardProps) {
  const t = await getTranslations("creator.referral.milestone");
  const next =
    MILESTONES.find((m) => m.invites > totalInvited) ??
    MILESTONES[MILESTONES.length - 1];
  const isMaxed = totalInvited >= MILESTONES[MILESTONES.length - 1].invites;
  const previousTarget =
    MILESTONES.filter((m) => m.invites <= totalInvited).pop()?.invites ?? 0;
  const range = Math.max(1, next.invites - previousTarget);
  const progress = Math.min(
    100,
    Math.max(0, ((totalInvited - previousTarget) / range) * 100),
  );
  const remaining = Math.max(0, next.invites - totalInvited);
  const reward = t(`rewards.${next.rewardKey}`);

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {isMaxed ? t("topTierReached") : t("nextMilestone")}
      </p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {isMaxed
          ? reward
          : remaining === 1
            ? t("next", { count: 1 })
            : t("next", { count: remaining })}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {isMaxed
          ? t("maxDescription", { count: MILESTONES[MILESTONES.length - 1].invites })
          : t("unlocks", { reward })}
      </p>

      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ background: "var(--muted)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "var(--accent)",
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{t("invited", { count: totalInvited })}</span>
          <span>{next.invites}</span>
        </div>
      </div>
    </div>
  );
}
