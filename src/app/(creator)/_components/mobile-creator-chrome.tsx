"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/cn";
import {
  CREATOR_BOTTOM_NAV_ITEMS,
  CREATOR_NAV_ITEMS,
} from "./creator-nav-items";
import { MobileMenuCloseProvider } from "./mobile-menu-close-context";

interface MobileCreatorChromeProps {
  identitySlot: ReactNode;
  balanceSlot: ReactNode;
}

export function MobileCreatorChrome({
  identitySlot,
  balanceSlot,
}: MobileCreatorChromeProps) {
  const pathname = usePathname();
  const t = useTranslations("navigation.creatorNav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 px-3 py-3 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[520px] items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-3 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
          <Link
            href="/creator/dashboard"
            aria-label={t("dashboard")}
            className="block w-36 max-w-[55vw] overflow-hidden"
          >
            <Logo variant="light" size="fill" />
          </Link>
          <button
            type="button"
            aria-label={t("openMenu")}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm"
        >
          <button
            type="button"
            aria-label={t("closeMenu")}
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-neutral-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
              <Link
                href="/creator/dashboard"
                aria-label={t("dashboard")}
                onClick={() => setOpen(false)}
                className="block w-36 overflow-hidden"
              >
                <Logo variant="light" size="fill" />
              </Link>
              <button
                type="button"
                aria-label={t("closeMenu")}
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 transition hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-5">
              <div className="space-y-1">
                {CREATOR_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex h-12 items-center gap-3 rounded-xl px-4 text-[15px] font-semibold transition",
                        active
                          ? "bg-neutral-200 text-neutral-950"
                          : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </nav>

            <div className="space-y-3 border-t border-neutral-200 bg-neutral-50 px-4 py-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-3">
                {balanceSlot}
              </div>
              <MobileMenuCloseProvider value={() => setOpen(false)}>
                {identitySlot}
              </MobileMenuCloseProvider>
            </div>
          </aside>
        </div>
      ) : null}

      <nav
        aria-label={t("menu")}
        className="fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-[420px] grid-cols-3 gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.16)] lg:hidden"
      >
        {CREATOR_BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition",
                active
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="leading-none">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
