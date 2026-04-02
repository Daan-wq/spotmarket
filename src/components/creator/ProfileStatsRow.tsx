interface Props {
  followerCount: number;
  engagementRate: number | string;
  topGeo: string | null;
  reach30d: number | null;
  views30d: number | null;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg px-4 py-3.5" style={{ backgroundColor: "var(--bg-secondary)" }}>
      <p className="text-[22px] font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

export function ProfileStatsRow({ followerCount, engagementRate, topGeo, reach30d, views30d }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <StatCard value={fmt(followerCount)} label="Followers" />
      <StatCard value={`${engagementRate}%`} label="Engagement" />
      <StatCard value={topGeo ?? "—"} label="Top Geo" />
      <StatCard value={fmt(reach30d)} label="Reach (30d)" />
      <StatCard value={fmt(views30d)} label="Views (30d)" />
    </div>
  );
}
