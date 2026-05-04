"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  User,
  Users,
  Video,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/cn";

interface CreatorSidebarProps {
  userName: string;
  balanceSlot: ReactNode;
}

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/creator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/creator/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/creator/videos", label: "Clips", icon: Video },
  { href: "/creator/payouts", label: "Payments", icon: CreditCard },
  { href: "/creator/connections", label: "Accounts", icon: WalletCards },
  { href: "/creator/course", label: "Course", icon: GraduationCap },
  { href: "/creator/referral", label: "Teams", icon: Users },
  { href: "/creator/stats", label: "Stats", icon: BarChart3 },
];

export function CreatorSidebar({ userName, balanceSlot }: CreatorSidebarProps) {
  const pathname = usePathname();
  const initial = userName.charAt(0).toUpperCase() || "C";

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
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">{balanceSlot}</div>
        <div className="group relative">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3 text-left transition hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-950">{userName}</p>
              <p className="truncate text-xs text-neutral-500">Creator</p>
            </div>
            <ChevronDown className="h-4 w-4 text-neutral-400 transition group-focus-within:rotate-180 group-hover:text-neutral-950" />
          </button>

          <div className="invisible absolute bottom-[calc(100%+8px)] left-0 z-20 w-full translate-y-1 rounded-2xl border border-neutral-200 bg-white p-2 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.12)] transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
            <Link
              href="/creator/profile"
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                pathname.startsWith("/creator/profile")
                  ? "bg-neutral-100 text-neutral-950"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              href="/creator/settings"
              className={cn(
                "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                pathname.startsWith("/creator/settings")
                  ? "bg-neutral-100 text-neutral-950"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}
