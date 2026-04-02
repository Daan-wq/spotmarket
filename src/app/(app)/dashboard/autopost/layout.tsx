"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const TABS = [
  {
    href: "/dashboard/autopost",
    label: "Overview",
    exact: true,
    description: "Create a one-off post — upload content, write a caption, and publish immediately or at a set time.",
  },
  {
    href: "/dashboard/autopost/schedule",
    label: "Schedule",
    description: "Define when to post automatically. Each slot sets a day, time, and timezone. The worker picks the next item from your storage and posts it when the slot fires.",
  },
  {
    href: "/dashboard/autopost/buffer",
    label: "Storage",
    description: "Your content queue. Upload reels, videos, photos, stories, and carousels here. When a scheduled slot fires, it pulls the next item in order and posts it.",
  },
  {
    href: "/dashboard/autopost/log",
    label: "Log",
    description: "History of every post that went out — timestamp, content type, status, and which schedule slot triggered it.",
  },
  {
    href: "/dashboard/autopost/settings",
    label: "Settings",
    description: "Auto-fill your storage without manual uploads. Connect a local folder (browser sync) or pair a phone/desktop agent to push content directly.",
  },
];

export default function AutoPostLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const activeTab = TABS.find((tab) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex",
        gap: "0",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        padding: "0 16px",
        flexShrink: 0,
      }}>
        {TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 500,
                color: isActive ? "var(--accent)" : "var(--text-secondary)",
                textDecoration: "none",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                marginBottom: "-1px",
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <div style={{ padding: "8px 16px", fontSize: "12px", color: "var(--text-muted)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
        Select a page to manage in the Schedule and Log tabs
      </div>
      {activeTab?.description && (
        <div style={{
          padding: "10px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-primary)",
          fontSize: "12px",
          color: "var(--text-muted)",
          flexShrink: 0,
        }}>
          {activeTab.description}
        </div>
      )}
      <div style={{ flex: 1, overflow: "auto" }}>
        {children}
      </div>
    </div>
  );
}
