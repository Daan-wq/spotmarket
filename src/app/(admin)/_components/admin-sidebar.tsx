"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV = [
  {
    label: "OVERVIEW",
    items: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    label: "CAMPAIGNS",
    items: [
      { href: "/admin/campaigns", label: "All campaigns" },
      { href: "/admin/submissions", label: "Submissions" },
    ],
  },
  {
    label: "NETWORK",
    items: [
      { href: "/admin/pages", label: "Pages" },
      { href: "/admin/ops-pages", label: "Internal Ops Pages" },
      { href: "/admin/creators", label: "Creators" },
      { href: "/admin/networks", label: "Networks" },
    ],
  },
  {
    label: "MONEY",
    items: [
      { href: "/admin/payouts", label: "Payouts" },
      { href: "/admin/invoices", label: "Invoices" },
    ],
  },
  {
    label: "CLIENTS",
    items: [
      { href: "/admin/clients", label: "Direct clients" },
    ],
  },
  {
    label: "AGENCY",
    items: [
      { href: "/admin/scouting", label: "Scouting" },
      { href: "/admin/deals", label: "Brand Deals" },
      { href: "/admin/agency-kpis", label: "Agency KPIs" },
    ],
  },
];

interface AdminSidebarProps {
  initials: string;
  email: string;
}

export function AdminSidebar({ initials, email }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside
      className="w-[200px] flex flex-col shrink-0"
      style={{
        background: "var(--bg-elevated)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid var(--muted)" }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-semibold"
            style={{ background: "var(--accent)" }}
          >
            €
          </div>
          <div>
            <p className="text-sm font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
              €lipProfit
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {NAV.map(({ label, items }) => (
          <div key={label}>
            <p
              className="px-[10px] mb-1 text-[11px] font-semibold uppercase tracking-[0.4px]"
              style={{ color: "var(--text-muted)" }}
            >
              {label}
            </p>
            {items.map(({ href, label: itemLabel }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="block px-[10px] py-[7px] rounded-md text-[13px] font-medium transition-all duration-250"
                  style={{
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    background: active ? "var(--accent-muted)" : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                    }
                  }}
                >
                  {itemLabel}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 space-y-1" style={{ borderTop: "1px solid var(--muted)" }}>
        <div className="flex items-center gap-2 px-[10px] py-[7px]">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
            style={{ background: "var(--accent)" }}
          >
            {initials}
          </div>
          <p className="text-[12px] truncate" style={{ color: "var(--text-secondary)" }}>{email}</p>
        </div>
        <a
          href="/api/auth/signout"
          className="flex items-center px-[10px] py-[7px] rounded-md text-[13px] transition-colors duration-250"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          Log out
        </a>
      </div>
    </aside>
  );
}
