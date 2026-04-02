interface StatCard {
  label: string;
  value: string | number;
}

interface StatCardsProps {
  stats: StatCard[];
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-[10px] mb-6">
      {stats.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-md px-4 py-[14px]"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
            {label}
          </p>
          <p
            className="text-[22px] font-medium mt-0.5"
            style={{ color: "var(--text-primary)" }}
          >
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}
