"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "@/components/animate-ui/icons/chevron-down";
import { LogOut } from "@/components/animate-ui/icons/log-out";
import { Settings } from "@/components/animate-ui/icons/settings";
import { User } from "@/components/animate-ui/icons/user";
import { cn } from "@/lib/cn";

interface AdminIdentityMenuProps {
  initials: string;
  email: string;
}

export function AdminIdentityMenu({ initials, email }: AdminIdentityMenuProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation.adminNav");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-100/70 p-3 text-left transition hover:border-neutral-300 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-950">Admin</p>
          <p className="truncate text-xs text-neutral-500">{email}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 transition group-hover:text-neutral-950",
            open && "rotate-180 text-neutral-950",
          )}
          animateOnHover
        />
      </button>

      <div
        id={menuId}
        role="menu"
        className={cn(
          "invisible absolute bottom-[calc(100%+8px)] left-0 z-20 w-full translate-y-1 rounded-2xl border border-neutral-200 bg-white p-2 opacity-0 shadow-[0_18px_50px_rgba(0,0,0,0.12)] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
          open && "visible translate-y-0 opacity-100",
        )}
      >
        <button
          type="button"
          role="menuitem"
          disabled
          className="flex h-10 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-neutral-400"
        >
          <User className="h-4 w-4" animateOnHover />
          <span className="min-w-0 flex-1 truncate">{t("profile")}</span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-400">
            {t("profileComingSoon")}
          </span>
        </button>
        <Link
          href="/admin/settings"
          role="menuitem"
          onClick={() => setOpen(false)}
          className={cn(
            "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
            pathname.startsWith("/admin/settings")
              ? "bg-neutral-100 text-neutral-950"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
          )}
        >
          <Settings className="h-4 w-4" animateOnHover />
          {t("settings")}
        </Link>
        <form action="/api/auth/signout" method="POST" onSubmit={() => setOpen(false)}>
          <button
            type="submit"
            role="menuitem"
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-950"
          >
            <LogOut className="h-4 w-4" animateOnHover />
            {t("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}
