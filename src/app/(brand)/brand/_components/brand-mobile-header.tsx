"use client";

import Link from "next/link";
import { Clapperboard, FileText, LayoutDashboard } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { buildBrandPortalHref } from "@/lib/brand-report-portal";

export function BrandMobileHeader({
  brandName,
  isAdminPreview,
  defaultCampaignId,
}: {
  brandName: string;
  isAdminPreview: boolean;
  defaultCampaignId: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? defaultCampaignId;
  const navigation = [
    { href: "/brand", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/brand" },
    { href: "/brand/content", label: "Content", icon: Clapperboard, active: pathname.startsWith("/brand/content") },
    { href: "/brand/reports", label: "Rapportages", icon: FileText, active: pathname.startsWith("/brand/reports") },
  ];

  return (
    <div className="border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <Link
            href={campaignId ? buildBrandPortalHref("/brand", campaignId) : "/brand"}
            aria-label="ClipProfit brand dashboard"
            className="block w-32"
          >
            <Logo variant="light" size="fill" />
          </Link>
          <p className="mt-1 truncate text-xs text-neutral-500">
            {isAdminPreview ? "Admin preview" : brandName}
          </p>
        </div>
        <a href="/api/auth/signout" className="text-sm font-semibold text-neutral-600 hover:text-neutral-950">
          Uitloggen
        </a>
      </div>
      <nav className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={campaignId ? buildBrandPortalHref(item.href, campaignId) : item.href}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${
                item.active ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
