"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/cn";
import { CREATOR_NAV_ITEMS } from "./creator-nav-items";

interface CreatorSidebarProps {
  identitySlot: ReactNode;
  balanceSlot: ReactNode;
}

export function CreatorSidebar({ identitySlot, balanceSlot }: CreatorSidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation.creatorNav");

  function isActive(href: string) {
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-8 top-0 hidden h-screen w-56 flex-col py-10 lg:flex">
      <div className="mb-7 w-full">
        <motion.div
          whileHover={{ scale: 1.025 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="origin-left cursor-pointer select-none w-full max-w-full overflow-hidden"
        >
          <Link href="/creator/dashboard" aria-label={t("dashboard")} className="block w-full">
            <Logo variant="light" size="fill" />
          </Link>
        </motion.div>
        <p className="mt-1 text-xs text-neutral-500">{t("dashboard")}</p>
      </div>

      <label className="relative mb-7 block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400"
          placeholder={t("search")}
        />
      </label>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {CREATOR_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <AnimateIcon key={item.href} animateOnHover asChild>
              <Link
                href={item.href}
                data-first-clip-target={item.firstClipTarget}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-medium transition",
                  active
                    ? "bg-neutral-200 text-neutral-950"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                {t(item.labelKey)}
              </Link>
            </AnimateIcon>
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
