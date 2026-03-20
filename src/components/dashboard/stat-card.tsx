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
      style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "#6b7280" }}>{label}</p>
        {sub && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: subPositive ? "#f0fdf4" : "#f3f4f6",
              color: subPositive ? "#15803d" : "#6b7280",
            }}
          >
            {sub}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight" style={{ color: "#111827" }}>
        {value}
      </p>
    </div>
  );
}
