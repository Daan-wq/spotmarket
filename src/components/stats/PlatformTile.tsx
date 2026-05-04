import Link from "next/link";
import { type PlatformSlug, PLATFORM_LABEL, PLATFORM_COLOR } from "@/lib/stats/types";

export interface PlatformTileProps {
  slug: PlatformSlug;
  href: string;
  connectionCount: number;
  followerCount: number;
  windowViews: number;
  windowEngagement: number;
  topPostTitle?: string | null;
  topPostViews?: number | null;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function PlatformTile({
  slug,
  href,
  connectionCount,
  followerCount,
  windowViews,
  windowEngagement,
  topPostTitle,
  topPostViews,
}: PlatformTileProps) {
  const label = PLATFORM_LABEL[slug];
  const color = PLATFORM_COLOR[slug];

  return (
    <Link
      href={href}
      className="block rounded-xl p-5 transition-all hover:-translate-y-0.5"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
          {label}
        </h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold"
          style={{
            background: connectionCount > 0 ? "var(--success-bg)" : "var(--bg-primary)",
            color: connectionCount > 0 ? "var(--success-text)" : "var(--text-muted)",
          }}
        >
          {connectionCount} {connectionCount === 1 ? "account" : "accounts"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Followers" value={fmt(followerCount)} />
        <Stat label="Views" value={fmt(windowViews)} />
        <Stat label="Engagement" value={fmt(windowEngagement)} />
      </div>

      {topPostTitle != null && topPostViews != null ? (
        <div
          className="text-xs pt-3 mt-1"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span className="uppercase tracking-wide text-[10px] font-semibold mr-1.5">
            Top
          </span>
          <span style={{ color: "var(--text-secondary)" }}>
            {truncate(topPostTitle, 30)}
          </span>
          <span className="float-right" style={{ color: "var(--text-primary)" }}>
            {fmt(topPostViews)} views
          </span>
        </div>
      ) : (
        <div
          className="text-xs pt-3 mt-1"
          style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          {connectionCount === 0 ? "Connect an account to start tracking" : "No posts yet in this range"}
        </div>
      )}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
