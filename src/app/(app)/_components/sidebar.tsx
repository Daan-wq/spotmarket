"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    ),
  },
  {
    href: "/pages",
    label: "My Pages",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="6" height="10" x="3" y="3" rx="1"/><rect width="6" height="10" x="15" y="3" rx="1"/>
        <path d="M3 17c0-1 .9-2 2-2h14c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z"/>
      </svg>
    ),
  },
  {
    href: "/earnings",
    label: "Earnings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/autopost",
    label: "AutoPost",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z"/>
      </svg>
    ),
  },
  {
    href: "/launch",
    label: "Launch Campaign",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14"/><path d="M5 12l7-7 7 7"/>
      </svg>
    ),
  },
  {
    href: "/referral",
    label: "Referral",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 60 : 208,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-4 py-5"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {!collapsed && <Logo variant="dark" size="sm" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-7 h-7 rounded-md transition-colors cursor-pointer shrink-0"
          style={{ color: "var(--sidebar-item)" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? (
              <><path d="M13 17l5-5-5-5"/><path d="M6 17l5-5-5-5"/></>
            ) : (
              <><path d="M11 17l-5-5 5-5"/><path d="M18 17l-5-5 5-5"/></>
            )}
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                padding: collapsed ? "8px" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
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
              <span className="shrink-0">{icon}</span>
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <Link
          href="/settings"
          title="Settings"
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
          style={{
            color: pathname === "/settings" ? "var(--sidebar-active-text)" : "var(--sidebar-item)",
            background: pathname === "/settings" ? "var(--sidebar-active-bg)" : "transparent",
          }}
          onMouseEnter={e => {
            if (pathname !== "/settings") {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item-hover)";
              (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
            }
          }}
          onMouseLeave={e => {
            if (pathname !== "/settings") {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            title="Sign out"
            className="flex items-center gap-2.5 rounded-lg text-sm font-medium w-full transition-all duration-200 cursor-pointer"
            style={{
              padding: collapsed ? "8px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "var(--sidebar-item)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item-hover)";
              (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = "var(--sidebar-item)";
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && "Sign out"}
          </button>
        </form>
      </div>
    </aside>
  );
}
