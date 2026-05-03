interface Milestone {
  invites: number;
  reward: string;
}

const MILESTONES: Milestone[] = [
  { invites: 1, reward: "First commission unlocked" },
  { invites: 5, reward: "Recruiter badge on your profile" },
  { invites: 10, reward: "Priority feedback on your clips" },
  { invites: 25, reward: "Early access to new campaigns" },
  { invites: 50, reward: "Top Referrer status + Discord role" },
];

interface MilestoneCardProps {
  totalInvited: number;
}

export function MilestoneCard({ totalInvited }: MilestoneCardProps) {
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

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {isMaxed ? "Top tier reached" : "Next milestone"}
      </p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {isMaxed
          ? next.reward
          : remaining === 1
            ? "1 more invite"
            : `${remaining} more invites`}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        {isMaxed
          ? `You've passed ${MILESTONES[MILESTONES.length - 1].invites} invites — thanks for spreading the word.`
          : `Unlocks: ${next.reward}.`}
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
          <span>{totalInvited} invited</span>
          <span>{next.invites}</span>
        </div>
      </div>
    </div>
  );
}
