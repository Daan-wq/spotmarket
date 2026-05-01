"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NotificationBell } from "@/components/notification-bell";

const SEGMENT_LABELS: Record<string, string> = {
  creator: "",
  campaigns: "Discover",
  videos: "My Videos",
  dashboard: "Dashboard",
  leaderboard: "Leaderboard",
  notifications: "Notifications",
  profile: "Profile",
  contact: "Contact Brand",
  applications: "Applications",
};

interface TopBarProps {
  supabaseId: string | null;
}

export function TopBar({ supabaseId }: TopBarProps) {
  const pathname = usePathname();

  // Build breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];

  let pathSoFar = "";
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    pathSoFar += `/${seg}`;

    // Skip "creator" root
    if (seg === "creator") continue;

    // Check if this is a dynamic segment (ID)
    const label = SEGMENT_LABELS[seg];
    if (label) {
      crumbs.push({ label, href: pathSoFar });
    } else if (seg.length > 10) {
      // Likely a campaign/submission ID — try to show abbreviated
      crumbs.push({ label: seg.slice(0, 8) + "…", href: pathSoFar });
    }
  }

  return (
    <div
      className="flex items-center justify-between px-6 py-3 shrink-0"
      style={{
        borderBottom: "1px solid var(--border-default)",
        background: "var(--bg-card)",
      }}
    >
      <div className="flex items-center gap-2 text-sm">
        {/* Sidebar toggle icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
          <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />
        </svg>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1">
          {crumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <span style={{ color: "var(--text-muted)" }}>&gt;</span>}
              {i < crumbs.length - 1 ? (
                <Link
                  href={crumb.href}
                  className="transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationBell supabaseId={supabaseId} />
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          style={{
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            background: "transparent",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          Feedback
        </button>
      </div>
    </div>
  );
}
