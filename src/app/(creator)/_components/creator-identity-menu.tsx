"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { Settings } from "@/components/animate-ui/icons/settings";
import { User } from "@/components/animate-ui/icons/user";
import { cn } from "@/lib/cn";

export function CreatorIdentityMenu({
  name,
  initial,
}: {
  name: string;
  initial: string;
}) {
  const pathname = usePathname();

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3 text-left transition hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">{name}</p>
          <p className="truncate text-xs text-neutral-500">Creator</p>
        </div>
        <ChevronDown className="h-4 w-4 text-neutral-400 transition group-focus-within:rotate-180 group-hover:text-neutral-950" animateOnHover />
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
          <User className="h-4 w-4" animateOnHover />
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
          <Settings className="h-4 w-4" animateOnHover />
          Settings
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950"
          >
            <LogOut className="h-4 w-4" animateOnHover />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
