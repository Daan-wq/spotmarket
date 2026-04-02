type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
};

export function StatCard({ label, value, sub, subPositive }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{label}</p>
        {sub && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: subPositive ? "var(--success-bg)" : "var(--muted)",
              color: subPositive ? "var(--success-text)" : "var(--text-secondary)",
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
