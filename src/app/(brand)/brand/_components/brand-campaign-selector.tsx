"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown } from "lucide-react";
import type { BrandPortalCampaignOption } from "@/lib/brand-report-portal";
import { buildBrandPortalHref } from "@/lib/brand-report-portal";

export function BrandCampaignSelector({
  campaigns,
  defaultCampaignId,
}: {
  campaigns: BrandPortalCampaignOption[];
  defaultCampaignId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const requestedId = searchParams.get("campaignId");
  const selected = campaigns.find((campaign) => campaign.id === requestedId)
    ?? campaigns.find((campaign) => campaign.id === defaultCampaignId)
    ?? campaigns[0];

  if (!selected) return null;

  return (
    <div className="report-studio-chrome border-b border-neutral-200 bg-white py-4 lg:sticky lg:top-0 lg:z-30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
            Geselecteerde campagne
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Deze keuze geldt voor dashboard, content en rapporten.
          </p>
        </div>
        <label className="relative block w-full sm:w-80">
          <span className="sr-only">Campagne selecteren</span>
          <select
            value={selected.id}
            disabled={isPending}
            onChange={(event) => {
              const currentParams = Object.fromEntries(searchParams.entries());
              const href = buildBrandPortalHref(pathname, event.target.value, currentParams);
              startTransition(() => router.push(href));
            }}
            className="h-12 w-full appearance-none border-0 border-b-2 border-neutral-950 bg-white px-0 pr-8 text-sm font-semibold text-neutral-950 outline-none disabled:opacity-50"
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name} - {campaign.status === "active" ? "Actief" : "Afgerond"}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        </label>
      </div>
    </div>
  );
}
