"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  GraduationCap,
  Megaphone,
  Search,
  Video,
  WalletCards,
} from "lucide-react";
import { LayoutDashboard } from "@/components/animate-ui/icons/layout-dashboard";
import { Users } from "@/components/animate-ui/icons/users";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/cn";

interface CreatorSidebarProps {
  identitySlot: ReactNode;
  balanceSlot: ReactNode;
}

type NavIcon = ComponentType<SVGProps<SVGSVGElement> & { animateOnHover?: boolean }>;

const NAV: Array<{ href: string; label: string; icon: NavIcon }> = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/creator/videos", label: "Clips", icon: Video },
  { href: "/creator/payouts", label: "Payments", icon: CreditCard },
  { href: "/creator/connections", label: "Accounts", icon: WalletCards },
  { href: "/creator/course", label: "Course", icon: GraduationCap },
  { href: "/creator/referral", label: "Teams", icon: Users },
  { href: "/creator/stats", label: "Stats", icon: BarChart3 },
];

export function CreatorSidebar({ identitySlot, balanceSlot }: CreatorSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/creator/dashboard") return pathname === "/creator/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-8 top-0 hidden h-screen w-56 flex-col py-10 lg:flex">
      <div className="mb-7">
        <Logo variant="light" size="sm" />
        <p className="mt-1 text-xs text-neutral-500">Creator</p>
      </div>

      <label className="relative mb-7 block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          placeholder="Search"
        />
      </label>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition",
                active
                  ? "bg-neutral-200 text-neutral-950"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} animateOnHover />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">{balanceSlot}</div>
        {identitySlot}
      </div>
    </aside>
  );
}
