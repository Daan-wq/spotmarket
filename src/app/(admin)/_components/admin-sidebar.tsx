"use client";

import { memo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  description?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/admin", label: "Dashboard", icon: "📊" },
      { href: "/admin/signals", label: "Signals", icon: "🚨", description: "WARN+ alerts inbox" },
      { href: "/admin/analytics", label: "Analytics", icon: "📈", description: "CPV, OAuth, demographics" },
    ],
  },
  {
    label: "USERS",
    items: [
      { href: "/admin/creators", label: "Creators", icon: "👥" },
    ],
  },
  {
    label: "CAMPAIGNS",
    items: [
      { href: "/admin/campaigns", label: "All Campaigns", icon: "🎯" },
      { href: "/admin/submissions", label: "Submissions", icon: "📤" },
      { href: "/admin/review/videos", label: "Video review", icon: "🎬", description: "Logo verification queue" },
      { href: "/admin/tiktok-demographics", label: "TT demographics", icon: "📊", description: "Creator-submitted TikTok audience" },
    ],
  },
  {
    label: "NETWORK",
    items: [
      { href: "/admin/networks", label: "Networks", icon: "🌐", description: "Referrers & revenue share" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin/payouts", label: "Payouts", icon: "💰", description: "Creator payment processing" },
      { href: "/admin/withdrawals", label: "Withdrawals", icon: "🏦", description: "USDT withdrawal requests" },
    ],
  },
];

interface AdminSidebarProps {
  initials: string;
  email: string;
}

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: string;
  description?: string;
  active: boolean;
  pending: boolean;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}

const SidebarLink = memo(function SidebarLink({
  href,
  label,
  icon,
  description,
  active,
  pending,
  collapsed,
  onNavigate,
}: SidebarLinkProps) {
  // Show active styling instantly when user clicks, even before route resolves
  const showActive = active || pending;
  return (
    <Link
      prefetch
      href={href}
      onClick={(e) => {
        // Intercept to trigger optimistic active-state via useTransition in parent
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
          e.preventDefault();
          onNavigate(href);
        }
      }}
      className="flex items-center gap-2.5 rounded-md text-[13px] font-medium transition-all"
      style={{
        padding: collapsed ? "8px" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: showActive ? "var(--sidebar-active-text)" : "var(--sidebar-item)",
        background: showActive ? "var(--sidebar-active-bg)" : "transparent",
        opacity: pending && !active ? 0.7 : 1,
      }}
    >
      <span>{icon}</span>
      {!collapsed && (
        <div className="flex flex-col gap-0.5">
          <span>{label}</span>
          {description && (
            <span
              className="text-[10px]"
              style={{
                color: "var(--text-muted, var(--text-secondary))",
                lineHeight: "1.2",
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}
    </Link>
  );
});

export function AdminSidebar({ initials, email }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  function handleNavigate(href: string) {
    if (isActive(href)) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }

  // Reset pending indicator once navigation completes
  if (!isPending && pendingHref && pathname.startsWith(pendingHref)) {
    queueMicrotask(() => setPendingHref(null));
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
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

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
            {items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                description={item.description}
                active={isActive(item.href)}
                pending={pendingHref === item.href && isPending}
                collapsed={collapsed}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 space-y-1" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2 rounded-md" style={{ padding: "7px 10px" }}>
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
          className="flex items-center gap-2.5 rounded-md text-[13px] transition-colors"
          style={{
            padding: collapsed ? "8px" : "7px 10px",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "var(--sidebar-item)",
          }}
        >
          <span>↪</span>
          {!collapsed && "Log out"}
        </a>
      </div>
    </aside>
  );
}
