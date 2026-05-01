"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  counts: { videos: number; demographics: number; applications: number };
}

const TABS = [
  { href: "/admin/review/videos", label: "Video submissions", key: "videos" as const },
  { href: "/admin/review/demographics", label: "TikTok demographics", key: "demographics" as const },
  { href: "/admin/review/applications", label: "Join requests", key: "applications" as const },
];

export function ReviewTabs({ counts }: Props) {
  const pathname = usePathname();

  return (
    <div
      className="flex items-center gap-1 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const count = counts[tab.key];
        return (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch
            className="px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {tab.label}
            {count > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background: isActive ? "var(--primary)" : "var(--warning-bg)",
                  color: isActive ? "#FFFFFF" : "var(--warning-text)",
                }}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
