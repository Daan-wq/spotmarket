"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  {
    href: "/business",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/business/campaigns",
    label: "Campaigns",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: "/business/applications",
    label: "Applications",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/business/analytics",
    label: "Analytics",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

export function BusinessSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/business") return pathname === "/business";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="w-52 flex flex-col h-screen sticky top-0 shrink-0"
      style={{ background: "#0a0a0a", borderRight: "1px solid #1f2937" }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid #1f2937" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: "#6366f1", color: "#ffffff" }}
          >
            S
          </div>
          <div>
            <span className="text-white font-semibold text-sm">Spotmarket</span>
            <p className="text-xs" style={{ color: "#6b7280" }}>Business</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: active ? "#ffffff" : "#6b7280",
                background: active ? "#1f2937" : "transparent",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#d1d5db";
                  (e.currentTarget as HTMLElement).style.background = "#111827";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "#6b7280";
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

      {/* Sign out */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid #1f2937" }}>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors cursor-pointer"
            style={{ color: "#4b5563" }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "#9ca3af";
              (e.currentTarget as HTMLElement).style.background = "#111827";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "#4b5563";
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
