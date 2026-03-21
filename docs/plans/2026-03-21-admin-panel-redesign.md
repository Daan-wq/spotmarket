# Admin Panel Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the admin sidebar, add shared PageHeader/StatCards/EmptyState components, and apply them across all 9 admin pages.

**Architecture:** Shared components live in `src/components/admin/`. The sidebar nav uses a small `"use client"` component only for active-link detection via `usePathname()`. All pages remain Server Components — they just import the shared components and pass data as props.

**Tech Stack:** Next.js App Router, Tailwind CSS, Prisma, TypeScript

---

## Task 1: AdminNavLink client component

Small client component that reads `usePathname()` to apply active styles. This is the only `"use client"` code in the entire redesign.

**Files:**
- Create: `src/components/admin/admin-nav-link.tsx`

**Step 1: Create the component**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavLinkProps {
  href: string;
  label: string;
}

export function AdminNavLink({ href, label }: AdminNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="flex items-center px-[10px] py-[7px] rounded-md text-[13px] transition-colors"
      style={
        isActive
          ? { background: "#ffffff", color: "#534AB7", fontWeight: 500, border: "0.5px solid #e5e7eb" }
          : { color: "#64748b" }
      }
    >
      {label}
    </Link>
  );
}
```

**Step 2: Verify no TypeScript errors**

```bash
cd spotmarket && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 2: Update AdminLayout sidebar

Replace the old "MARKETPLACE / OPS" nav with the new grouped structure. Use `AdminNavLink` for nav items. Add user initial circle + sign out at the bottom.

**Files:**
- Modify: `src/app/(admin)/layout.tsx`

**Step 1: Rewrite layout.tsx**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminNavLink } from "@/components/admin/admin-nav-link";

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
    items: [{ href: "/admin/clients", label: "Brands" }],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user?.user_metadata?.role !== "admin") redirect("/unauthorized");

  const initials = user.email?.slice(0, 1).toUpperCase() ?? "A";

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-[200px] flex flex-col shrink-0 border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: "#534AB7" }}
            >
              S
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-none">Spotmarket</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
          {NAV.map(({ label, items }) => (
            <div key={label}>
              <p
                className="px-[10px] mb-1 text-[11px] font-semibold uppercase tracking-[0.4px]"
                style={{ color: "#94a3b8" }}
              >
                {label}
              </p>
              {items.map(({ href, label: itemLabel }) => (
                <AdminNavLink key={href} href={href} label={itemLabel} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-1">
          <div className="flex items-center gap-2 px-[10px] py-[7px]">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-medium shrink-0"
              style={{ background: "#534AB7" }}
            >
              {initials}
            </div>
            <p className="text-[12px] text-gray-500 truncate">{user.email}</p>
          </div>
          <a
            href="/api/auth/signout"
            className="flex items-center px-[10px] py-[7px] rounded-md text-[13px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            Log out
          </a>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
```

**Step 2: Verify no errors**

```bash
cd spotmarket && npx tsc --noEmit 2>&1 | head -20
```

---

## Task 3: PageHeader component

Reusable header used at the top of every admin page.

**Files:**
- Create: `src/components/admin/page-header.tsx`

**Step 1: Create the component**

```tsx
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[20px] font-medium text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-[13px] text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-[13px] text-white px-4 py-2 rounded-md"
          style={{ background: "#534AB7" }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
```

---

## Task 4: StatCards component

4-column row of metric cards shown at the top of each page.

**Files:**
- Create: `src/components/admin/stat-cards.tsx`

**Step 1: Create the component**

```tsx
interface StatCard {
  label: string;
  value: string | number;
}

interface StatCardsProps {
  stats: StatCard[];
}

export function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-[10px] mb-6">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-gray-50 rounded-md px-4 py-[14px]">
          <p className="text-[12px] text-gray-400">{label}</p>
          <p className="text-[22px] font-medium text-gray-900 mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Task 5: EmptyState component

Shown when a page has no data. Never shows "No X yet."

**Files:**
- Create: `src/components/admin/empty-state.tsx`

**Step 1: Create the component**

```tsx
import Link from "next/link";

interface EmptyStateAction {
  label: string;
  href: string;
  variant?: "primary" | "outline";
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
}

export function EmptyState({ icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <p className="text-[14px] font-medium text-gray-900 mb-1">{title}</p>
      <p className="text-[13px] text-gray-500 max-w-[340px] mb-5">{description}</p>
      {actions && actions.length > 0 && (
        <div className="flex gap-2">
          {actions.map(({ label, href, variant = "primary" }) => (
            <Link
              key={label}
              href={href}
              className={`text-[13px] px-4 py-2 rounded-md ${
                variant === "primary"
                  ? "text-white"
                  : "border border-gray-300 text-gray-600 bg-white"
              }`}
              style={variant === "primary" ? { background: "#534AB7" } : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 6: Update Dashboard (/admin)

Apply PageHeader + StatCards. Add stat for total pages alongside existing stats.

**Files:**
- Modify: `src/app/(admin)/admin/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";

export default async function AdminDashboard() {
  const [activeCampaigns, totalPages, pendingSubmissions, pendingPayouts] =
    await Promise.all([
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.instagramPage.count(),
      prisma.campaignPost.count({ where: { status: "submitted" } }),
      prisma.payout.count({ where: { status: "pending" } }),
    ]);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <StatCards
        stats={[
          { label: "Active campaigns", value: activeCampaigns },
          { label: "Total pages", value: totalPages },
          { label: "Pending submissions", value: pendingSubmissions },
          { label: "This week's payouts", value: pendingPayouts },
        ]}
      />
    </div>
  );
}
```

---

## Task 7: Update Pages (/admin/pages)

Apply PageHeader + StatCards + EmptyState. Keep existing table layout, just replace the empty state.

**Files:**
- Modify: `src/app/(admin)/admin/pages/page.tsx`

**Step 1: Rewrite the page**

Replace only the header section and empty state — keep the existing table rows logic intact.

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminPagesPage() {
  const pages = await prisma.instagramPage.findMany({
    include: { _count: { select: { internalCampaignPages: true } } },
    orderBy: { followerCount: "desc" },
  });

  const totalFollowers = pages.reduce((sum, p) => sum + p.followerCount, 0);
  const avgEngagement =
    pages.length > 0
      ? pages.reduce((sum, p) => sum + Number(p.avgEngagementRate), 0) / pages.length
      : 0;
  const onCampaigns = pages.filter((p) => p._count.internalCampaignPages > 0).length;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Pages"
        subtitle="Instagram and TikTok pages in your network"
        action={{ label: "+ Add page manually", href: "/admin/pages/new" }}
      />
      <StatCards
        stats={[
          { label: "Total pages", value: pages.length },
          {
            label: "Combined followers",
            value: totalFollowers >= 1_000_000
              ? `${(totalFollowers / 1_000_000).toFixed(1)}M`
              : totalFollowers >= 1000
              ? `${(totalFollowers / 1000).toFixed(0)}K`
              : totalFollowers,
          },
          { label: "Avg. engagement", value: `${avgEngagement.toFixed(1)}%` },
          { label: "On active campaigns", value: onCampaigns },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Handle", "Niche", "Followers", "Eng.", "CPM", "Campaigns"].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            }
            title="No pages connected yet"
            description="Add pages manually, or share your invite link so page owners can connect their Instagram via OAuth."
            actions={[
              { label: "+ Add page manually", href: "/admin/pages/new", variant: "primary" },
              { label: "Copy invite link", href: "#copy-invite", variant: "outline" },
            ]}
          />
        ) : (
          <div>
            {pages.map((page, i) => (
              <div
                key={page.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link href={`/admin/pages/${page.id}`} className="text-[14px] font-medium text-gray-900 hover:underline">
                    @{page.handle}
                  </Link>
                  {page.communicationHandle && (
                    <MessageButton
                      channel={(page.communicationChannel as Channel) || "instagram"}
                      handle={page.communicationHandle}
                    />
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                  {page.niche ?? "—"}
                </span>
                <p className="text-[14px] text-gray-900 whitespace-nowrap">
                  {page.followerCount >= 1000 ? `${(page.followerCount / 1000).toFixed(0)}K` : String(page.followerCount)}
                </p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{Number(page.avgEngagementRate).toFixed(1)}%</p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">${Number(page.avgCpm).toFixed(2)}</p>
                <p className="text-[14px] text-gray-500">{page._count.internalCampaignPages}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 8: Update Campaigns (/admin/campaigns)

Apply PageHeader + StatCards + EmptyState.

**Files:**
- Modify: `src/app/(admin)/admin/campaigns/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

const statusBadge: Record<string, { bg: string; text: string }> = {
  draft:     { bg: "bg-gray-100",   text: "text-gray-500" },
  active:    { bg: "bg-green-50",   text: "text-green-700" },
  paused:    { bg: "bg-amber-50",   text: "text-amber-700" },
  completed: { bg: "bg-gray-100",   text: "text-gray-500" },
  cancelled: { bg: "bg-red-50",     text: "text-red-700" },
};

export default async function AdminCampaignsPage() {
  const [campaigns, activeCnt, pausedCnt, completedCnt] = await Promise.all([
    prisma.campaign.findMany({
      include: {
        businessProfile: { select: { companyName: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaign.count({ where: { status: "active" } }),
    prisma.campaign.count({ where: { status: "paused" } }),
    prisma.campaign.count({ where: { status: "completed" } }),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Campaigns"
        subtitle="Manage brand campaigns and track performance"
        action={{ label: "+ Create campaign", href: "/admin/campaigns/new" }}
      />
      <StatCards
        stats={[
          { label: "Active", value: activeCnt },
          { label: "Paused", value: pausedCnt },
          { label: "Completed", value: completedCnt },
          { label: "Total", value: campaigns.length },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Campaign", "Geo", "CPV", "Deadline", "Apps", "Status", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 0 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 1 8.835-2.535m0 0A23.74 23.74 0 0 1 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m-1.394-9.98a24.407 24.407 0 0 1 1.394 9.98" />
              </svg>
            }
            title="No campaigns yet"
            description="Create your first campaign to start matching brands with your page network."
            actions={[{ label: "+ Create campaign", href: "/admin/campaigns/new", variant: "primary" }]}
          />
        ) : (
          <div>
            {campaigns.map((c, i) => {
              const badge = statusBadge[c.status] ?? statusBadge.draft;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-[12px] text-gray-400 truncate">{c.businessProfile.companyName}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 whitespace-nowrap">
                    {c.targetGeo.join(", ")}
                  </span>
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">${c.creatorCpv.toString()}</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap">{new Date(c.deadline).toLocaleDateString()}</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap text-center">{c._count.applications}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
                    {c.status}
                  </span>
                  <Link href={`/admin/campaigns/${c.id}`} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                    View →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 9: Create Submissions page (/admin/submissions)

New route. Shows `CampaignPost` records with `status: "submitted"` for review.

**Files:**
- Create: `src/app/(admin)/admin/submissions/page.tsx`

**Step 1: Create the page**

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminSubmissionsPage() {
  const [submitted, approved, rejected] = await Promise.all([
    prisma.campaignPost.findMany({
      where: { status: "submitted" },
      include: {
        application: {
          include: {
            campaign: { select: { name: true } },
            creatorProfile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.campaignPost.count({ where: { status: "approved" } }),
    prisma.campaignPost.count({ where: { status: "rejected" } }),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Submissions"
        subtitle="Post URLs submitted by creators, pending your review"
      />
      <StatCards
        stats={[
          { label: "Pending review", value: submitted.length },
          { label: "Approved", value: approved },
          { label: "Rejected", value: rejected },
          { label: "Auto-approved", value: "—" },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Creator", "Campaign", "Platform", "Submitted", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {submitted.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
            }
            title="No pending submissions"
            description="When creators submit post URLs for campaigns, they'll appear here for review. Posts auto-approve after 48 hours."
          />
        ) : (
          <div>
            {submitted.map((post, i) => (
              <div
                key={post.id}
                className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <p className="text-[14px] text-gray-900">
                  {post.application.creatorProfile?.displayName ?? "—"}
                </p>
                <p className="text-[14px] text-gray-500 truncate">{post.application.campaign.name}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap capitalize">
                  {post.platform}
                </span>
                <p className="text-[13px] text-gray-400 whitespace-nowrap">
                  {new Date(post.submittedAt).toLocaleDateString()}
                </p>
                <Link
                  href={post.postUrl}
                  target="_blank"
                  className="text-xs text-indigo-600 hover:underline whitespace-nowrap"
                >
                  View post →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 10: Update Creators (/admin/creators)

Apply PageHeader + StatCards + EmptyState.

**Files:**
- Modify: `src/app/(admin)/admin/creators/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminCreatorsPage() {
  const [creators, connectedCount, onCampaigns] = await Promise.all([
    prisma.creatorProfile.findMany({
      include: {
        user: { select: { email: true } },
        socialAccounts: {
          where: { isActive: true },
          select: { platform: true, platformUsername: true, followerCount: true, engagementRate: true },
        },
        _count: { select: { applications: true } },
      },
      orderBy: { totalFollowers: "desc" },
    }),
    prisma.creatorProfile.count({
      where: { socialAccounts: { some: { isActive: true } } },
    }),
    prisma.creatorProfile.count({
      where: { applications: { some: { status: { in: ["active", "approved"] } } } },
    }),
  ]);

  const avgFollowers =
    creators.length > 0
      ? Math.round(creators.reduce((sum, c) => sum + c.totalFollowers, 0) / creators.length)
      : 0;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Creators"
        subtitle="Individual creators who have signed up to the platform"
      />
      <StatCards
        stats={[
          { label: "Total creators", value: creators.length },
          { label: "Connected (OAuth)", value: connectedCount },
          { label: "On campaigns", value: onCampaigns },
          { label: "Avg. followers", value: avgFollowers >= 1000 ? `${(avgFollowers / 1000).toFixed(0)}K` : avgFollowers },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Creator", "Platform", "Followers", "Engagement", "Geo", "Campaigns", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {creators.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            }
            title="No creators signed up yet"
            description="Creators will appear here when they sign up and connect their Instagram accounts."
            actions={[{ label: "Copy signup link", href: "#copy-signup", variant: "outline" }]}
          />
        ) : (
          <div>
            {creators.map((c, i) => {
              const ig = c.socialAccounts.find((a) => a.platform === "instagram");
              const tt = c.socialAccounts.find((a) => a.platform === "tiktok");
              const main = ig ?? tt;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-gray-900 truncate">{c.displayName}</p>
                    <p className="text-[12px] text-gray-400 truncate">{c.user.email}</p>
                  </div>
                  <p className="text-[14px] truncate" style={{ color: main ? "#0f172a" : "#d97706" }}>
                    {main ? `@${main.platformUsername} (${main.platform})` : "Not connected"}
                  </p>
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">{c.totalFollowers.toLocaleString()}</p>
                  <p className="text-[14px] text-gray-900 whitespace-nowrap">{c.engagementRate.toString()}%</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap">{c.primaryGeo}</p>
                  <p className="text-[14px] text-gray-500 whitespace-nowrap text-center">{c._count.applications}</p>
                  <form action={`/api/creators/${c.id}/sync`} method="POST">
                    <button type="submit" className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                      Sync stats
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 11: Update Networks (/admin/networks)

Apply PageHeader + StatCards + EmptyState. Convert from `<table>` to div-grid to match other pages.

**Files:**
- Modify: `src/app/(admin)/admin/networks/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminNetworksPage() {
  const [networks, connectedCount, onCampaigns] = await Promise.all([
    prisma.networkProfile.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { members: true, applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.networkProfile.count({ where: { isApproved: true } }),
    prisma.networkProfile.count({
      where: { applications: { some: { status: { in: ["active", "approved"] } } } },
    }),
  ]);

  const totalMembers = networks.reduce((sum, n) => sum + n._count.members, 0);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Networks"
        subtitle="Network owners who bring their creator roster to the platform"
        action={{ label: "+ Invite network", href: "#invite-network" }}
      />
      <StatCards
        stats={[
          { label: "Network partners", value: networks.length },
          { label: "Total members", value: totalMembers },
          { label: "Approved", value: connectedCount },
          { label: "On campaigns", value: onCampaigns },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Company", "Contact", "Members", "Status", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {networks.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            }
            title="No network partners yet"
            description="Network owners like clipping agencies can partner with you to bring their entire creator network."
            actions={[{ label: "+ Invite network", href: "#invite-network", variant: "primary" }]}
          />
        ) : (
          <div>
            {networks.map((n, i) => (
              <div
                key={n.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-900">{n.companyName}</p>
                  <p className="text-[12px] text-gray-400">{n.user.email}</p>
                </div>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{n.contactName}</p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{n._count.members}</p>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${n.isApproved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                  {n.isApproved ? "Approved" : "Pending"}
                </span>
                <Link href={`/admin/networks/${n.id}`} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 12: Update Payouts (/admin/payouts)

Apply PageHeader + StatCards + EmptyState. Keep existing `PayoutActionsRow` logic.

**Files:**
- Modify: `src/app/(admin)/admin/payouts/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import { PayoutActionsRow } from "./payout-actions-row";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminPayoutsPage() {
  const payouts = await prisma.payout.findMany({
    include: {
      application: {
        include: {
          campaign: { select: { name: true } },
          creatorProfile: { select: { displayName: true, walletAddress: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const pending = payouts.filter((p) => p.status === "pending");
  const processing = payouts.filter((p) => p.status === "processing" || p.status === "sent");
  const done = payouts.filter((p) => p.status === "confirmed" || p.status === "failed");

  const paidThisMonth = payouts
    .filter((p) => {
      const d = new Date(p.createdAt);
      const now = new Date();
      return p.status === "confirmed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const totalPaid = payouts
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  const Section = ({ title, items, readonly = false }: { title: string; items: typeof payouts; readonly?: boolean }) => (
    <div className="rounded-lg overflow-hidden mb-4 border border-gray-200">
      <div className="px-5 py-3 border-b border-gray-100 bg-white">
        <p className="text-[13px] font-medium text-gray-900">{title}</p>
      </div>
      <div className="bg-white">
        {items.map((p) => (
          <PayoutActionsRow key={p.id} payout={p as any} readonly={readonly} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Payouts" subtitle="Review and process creator payouts" />
      <StatCards
        stats={[
          { label: "Pending review", value: pending.length },
          { label: "Processing", value: processing.length },
          { label: "Paid this month", value: `$${paidThisMonth.toFixed(2)}` },
          { label: "Total paid", value: `$${totalPaid.toFixed(2)}` },
        ]}
      />

      {payouts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200">
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
              </svg>
            }
            title="No payouts yet"
            description="Payouts are generated automatically each week based on verified views. They'll appear here for your review."
          />
        </div>
      ) : (
        <>
          {pending.length > 0 && <Section title={`Pending (${pending.length})`} items={pending} />}
          {processing.length > 0 && <Section title={`In Progress (${processing.length})`} items={processing} />}
          {done.length > 0 && <Section title={`Completed (${done.length})`} items={done} readonly />}
        </>
      )}
    </div>
  );
}
```

---

## Task 13: Update Clients (/admin/clients)

Apply PageHeader + StatCards + EmptyState. Keep existing table + MessageButton.

**Files:**
- Modify: `src/app/(admin)/admin/clients/page.tsx`

**Step 1: Rewrite the page**

```tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminClientsPage() {
  const [clients, activeCnt] = await Promise.all([
    prisma.client.findMany({
      include: { _count: { select: { internalCampaigns: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({
      where: { internalCampaigns: { some: {} } },
    }),
  ]);

  const totalBudget = clients.reduce((sum, c) => sum + Number(c.totalSpent), 0);
  const avgSize = clients.length > 0 ? totalBudget / clients.length : 0;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Brands"
        subtitle="Business clients running campaigns through your network"
        action={{ label: "+ Add client", href: "/admin/clients/new" }}
      />
      <StatCards
        stats={[
          { label: "Total brands", value: clients.length },
          { label: "Active (have campaigns)", value: activeCnt },
          { label: "Total campaign budget", value: `$${totalBudget.toFixed(0)}` },
          { label: "Avg. campaign size", value: `$${avgSize.toFixed(0)}` },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Name", "Contact", "Channel", "Campaigns", "Total Spent"].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            }
            title="No brands yet"
            description="Add your first client to start tracking their campaigns, budgets, and spending."
            actions={[{ label: "+ Add client", href: "/admin/clients/new", variant: "primary" }]}
          />
        ) : (
          <div>
            {clients.map((client, i) => (
              <div
                key={client.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="min-w-0">
                  <Link href={`/admin/clients/${client.id}`} className="text-[14px] font-medium text-gray-900 hover:underline">
                    {client.name}
                  </Link>
                  {client.company && (
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">{client.company}</p>
                  )}
                </div>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{client.contactName ?? "—"}</p>
                <div>
                  {client.communicationHandle ? (
                    <MessageButton channel={client.communicationChannel as Channel} handle={client.communicationHandle} />
                  ) : (
                    <span className="text-[13px] text-gray-300">—</span>
                  )}
                </div>
                <p className="text-[14px] text-gray-500 text-center">{client._count.internalCampaigns}</p>
                <p className="text-[14px] font-medium text-gray-900 text-right">${Number(client.totalSpent).toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Task 14: Create Invoices page (/admin/invoices)

New route stub — no invoice model exists yet, so show an empty state.

**Files:**
- Create: `src/app/(admin)/admin/invoices/page.tsx`

**Step 1: Create the stub page**

```tsx
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default function AdminInvoicesPage() {
  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Invoices"
        subtitle="Client invoices and billing records"
        action={{ label: "+ Create invoice", href: "#create-invoice" }}
      />
      <StatCards
        stats={[
          { label: "Outstanding", value: "—" },
          { label: "Paid this month", value: "—" },
          { label: "Overdue", value: "—" },
          { label: "Total billed", value: "—" },
        ]}
      />
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState
          icon={
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
          title="No invoices yet"
          description="Client invoices will appear here once the invoicing system is set up."
        />
      </div>
    </div>
  );
}
```

---

## Task 15: Final type check

Verify no TypeScript errors across all touched files.

**Step 1: Run type check**

```bash
cd spotmarket && npx tsc --noEmit 2>&1
```

Expected: no errors. If errors appear, fix them before calling done.
