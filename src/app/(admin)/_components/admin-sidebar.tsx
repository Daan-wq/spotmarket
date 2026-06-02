"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { BarChart3, Search } from "lucide-react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Banknote } from "@/components/animate-ui/icons/banknote";
import { BookOpen } from "@/components/animate-ui/icons/book-open";
import { BriefcaseBusiness } from "@/components/animate-ui/icons/briefcase-business";
import { FileText } from "@/components/animate-ui/icons/file-text";
import { GitPullRequestArrow } from "@/components/animate-ui/icons/git-pull-request-arrow";
import { ListChecks } from "@/components/animate-ui/icons/list-checks";
import { ShieldCheck } from "@/components/animate-ui/icons/shield-check";
import { ClipboardCheck } from "@/components/animate-ui/icons/clipboard-check";
import { Gauge } from "@/components/animate-ui/icons/gauge";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { Send } from "@/components/animate-ui/icons/send";
import { Sparkles } from "@/components/animate-ui/icons/sparkles";
import { Users } from "@/components/animate-ui/icons/users";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/cn";

type NavIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

interface NavItem {
  href: string;
  labelKey: string;
  icon: NavIcon;
  description?: string;
  hiddenFromSidebar?: boolean;
}

const NAV: Array<{ labelKey: string; items: NavItem[] }> = [
  {
    labelKey: "operate",
    items: [
      { href: "/admin", labelKey: "commandCenter", icon: LayoutDashboard },
      { href: "/admin/campaigns", labelKey: "campaigns", icon: Send },
      { href: "/admin/referrals", labelKey: "referrals", icon: Users },
      { href: "/admin/clippers", labelKey: "clippers", icon: Users },
      { href: "/admin/production", labelKey: "production", icon: GitPullRequestArrow, hiddenFromSidebar: true },
      { href: "/admin/review", labelKey: "clipReview", icon: ClipboardCheck },
    ],
  },
  {
    labelKey: "delivery",
    items: [
      { href: "/admin/crm", labelKey: "leads", icon: BriefcaseBusiness },
      { href: "/admin/brands", labelKey: "brands", icon: FileText },
      { href: "/admin/discord", labelKey: "discord", icon: Send },
      { href: "/admin/recruitment", labelKey: "recruitment", icon: Sparkles, hiddenFromSidebar: true },
      { href: "/admin/brand-portals", labelKey: "brandPortals", icon: ShieldCheck },
      { href: "/admin/onboarding", labelKey: "onboarding", icon: ListChecks, hiddenFromSidebar: true },
    ],
  },
  {
    labelKey: "control",
    items: [
      { href: "/admin/payouts", labelKey: "payouts", icon: Banknote },
      { href: "/admin/pricing", labelKey: "pricing", icon: FileText, hiddenFromSidebar: true },
      { href: "/admin/documents", labelKey: "documents", icon: ClipboardCheck, hiddenFromSidebar: true },
      { href: "/admin/reports", labelKey: "reports", icon: Gauge },
      { href: "/admin/site-analytics", labelKey: "siteAnalytics", icon: BarChart3 },
      { href: "/admin/sops", labelKey: "guides", icon: BookOpen, hiddenFromSidebar: true },
      { href: "/admin/signals", labelKey: "signals", icon: ShieldCheck },
    ],
  },
];

interface AdminSidebarProps {
  initials: string;
  email: string;
}

export function AdminSidebar({ initials, email }: AdminSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation.adminNav");

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    if (href === "/admin/review") return pathname.startsWith("/admin/review") || pathname.startsWith("/admin/tiktok-demographics");
    if (href === "/admin/clippers") return pathname.startsWith("/admin/clippers") || pathname.startsWith("/admin/creators");
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-8 top-0 hidden h-screen w-56 flex-col py-10 lg:flex">
      <div className="mb-7">
        <motion.div
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="origin-left cursor-pointer select-none"
        >
          <Link href="/admin" aria-label={t("commandCenter")} className="block">
            <Logo variant="light" size="fill" />
          </Link>
        </motion.div>
        <p className="mt-1 text-xs text-neutral-500">Admin</p>
      </div>

      <label className="relative mb-7 block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          placeholder={t("search")}
        />
      </label>

      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {NAV.map((section) => (
          <div key={section.labelKey}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
              {t(section.labelKey)}
            </p>
            <div className="space-y-1">
              {section.items.filter((item) => !item.hiddenFromSidebar).map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <AnimateIcon key={item.href} animateOnHover asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition",
                        active
                          ? "bg-neutral-200 text-neutral-950"
                          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </Link>
                  </AnimateIcon>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-neutral-950">Admin</p>
            <p className="truncate text-xs text-neutral-500">{email}</p>
          </div>
        </div>
        <a href="/api/auth/signout" className="block px-2 text-sm font-medium text-neutral-500 hover:text-neutral-950">
          {t("signOut")}
        </a>
      </div>
    </aside>
  );
}
