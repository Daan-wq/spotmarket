"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const NAV = [
  {
    href: "/advertiser/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/advertiser/campaigns",
    label: "My Campaigns",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/advertiser/submissions",
    label: "Submissions",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/advertiser/campaigns/new",
    label: "Create Campaign",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/><polyline points="3 7 12 3 21 7"/><polyline points="3 17 12 21 21 17"/><line x1="3" y1="12" x2="3" y2="7"/><line x1="21" y1="12" x2="21" y2="7"/><line x1="21" y1="12" x2="21" y2="17"/><line x1="3" y1="12" x2="3" y2="17"/>
      </svg>
    ),
  },
];

export function AdvertiserSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/advertiser/dashboard") return pathname === "/advertiser/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="w-52 flex flex-col h-screen sticky top-0 shrink-0"
      style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
    >
      <div className="px-4 py-5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <Logo variant="dark" size="sm" />
        <p className="text-xs mt-1" style={{ color: "var(--sidebar-item)" }}>Advertiser</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-250"
              style={{
                color: active ? "var(--sidebar-active-text)" : "var(--sidebar-item)",
                background: active ? "var(--sidebar-active-bg)" : "transparent",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item-hover)";
                  (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              {icon}
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full transition-all duration-250 cursor-pointer"
            style={{ color: "var(--sidebar-item)" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item-hover)";
              (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
