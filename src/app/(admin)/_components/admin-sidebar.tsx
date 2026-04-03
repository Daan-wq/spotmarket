"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const NAV = [
  {
    label: "OVERVIEW",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
      },
    ],
  },
  {
    label: "CAMPAIGNS",
    items: [
      {
        href: "/admin/campaigns",
        label: "All campaigns",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
      },
      {
        href: "/admin/submissions",
        label: "Submissions",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
      },
    ],
  },
  {
    label: "NETWORK",
    items: [
      {
        href: "/admin/pages",
        label: "Pages",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="6" height="10" x="3" y="3" rx="1"/><rect width="6" height="10" x="15" y="3" rx="1"/><path d="M3 17c0-1 .9-2 2-2h14c1.1 0 2 .9 2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2z"/></svg>,
      },
      {
        href: "/admin/ops-pages",
        label: "Ops Pages",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>,
      },
      {
        href: "/admin/creators",
        label: "Creators",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      },
      {
        href: "/admin/networks",
        label: "Networks",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>,
      },
    ],
  },
  {
    label: "MONEY",
    items: [
      {
        href: "/admin/payouts",
        label: "Payouts",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      },
      {
        href: "/admin/invoices",
        label: "Invoices",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
      },
    ],
  },
  {
    label: "CLIENTS",
    items: [
      {
        href: "/admin/clients",
        label: "Direct clients",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>,
      },
    ],
  },
  {
    label: "AGENCY",
    items: [
      {
        href: "/admin/scouting",
        label: "Scouting",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
      },
      {
        href: "/admin/deals",
        label: "Brand Deals",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      },
      {
        href: "/admin/agency-kpis",
        label: "Agency KPIs",
        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
      },
    ],
  },
];

interface AdminSidebarProps {
  initials: string;
  email: string;
}

export function AdminSidebar({ initials, email }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 60 : 200,
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo + collapse */}
      <div
        className="flex items-center justify-between px-3 py-5"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {!collapsed && (
          <div className="pl-1">
            <Logo variant="light" size="sm" />
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>Admin</p>
          </div>
        )}
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
      <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto">
        {NAV.map(({ label, items }) => (
          <div key={label}>
            {!collapsed && (
              <p
                className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "var(--text-muted)" }}
              >
                {label}
              </p>
            )}
            {collapsed && <div className="h-px mx-2 mb-1" style={{ background: "var(--sidebar-border)" }} />}
            {items.map(({ href, label: itemLabel, icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? itemLabel : undefined}
                  className="flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all duration-200"
                  style={{
                    padding: collapsed ? "8px" : "7px 10px",
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
                  {!collapsed && itemLabel}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 space-y-1" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div
          className="flex items-center gap-2 rounded-md"
          style={{ padding: collapsed ? "6px" : "7px 10px", justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
            style={{ background: "var(--accent)" }}
          >
            {initials}
          </div>
          {!collapsed && <p className="text-[12px] truncate" style={{ color: "var(--sidebar-item)" }}>{email}</p>}
        </div>
        <a
          href="/api/auth/signout"
          title="Log out"
          className="flex items-center gap-2.5 rounded-md text-[13px] transition-colors duration-200"
          style={{
            padding: collapsed ? "8px" : "7px 10px",
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && "Log out"}
        </a>
      </div>
    </aside>
  );
}
