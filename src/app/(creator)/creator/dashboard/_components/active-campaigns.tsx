import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import PlatformIcon from "@/components/shared/PlatformIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrencyPrecise, formatShortDate } from "@/lib/admin/agency-format";
import { CreatorSectionHeader } from "../../_components/creator-journey";
import { getCreatorActiveCampaigns } from "../_data";

export async function ActiveCampaigns({ profileId }: { profileId: string }) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("dashboard.creator.activeCampaigns");
  const sharedT = await getTranslations("dashboard.shared");
  const rows = await getCreatorActiveCampaigns(profileId);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <CreatorSectionHeader
        title={t("title")}
        description={t("description")}
      />
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
          <p className="font-semibold text-neutral-950">{t("emptyTitle")}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {t("emptyDescription")}
          </p>
          <Link
            href="/creator/campaigns"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.16)] hover:bg-neutral-800"
          >
            {t("browse")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {rows.map((application) => (
            <Link
              key={application.id}
              href={`/creator/campaigns/${application.campaign.id}`}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-300 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold text-neutral-950">
                  {application.campaign.name}
                </p>
                <Badge
                  variant={application.status === "active" ? "verified" : "neutral"}
                >
                  {sharedT(`statuses.application.${application.status}`)}
                </Badge>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-neutral-500">
                <span>
                  {formatCurrencyPrecise(Number(application.campaign.creatorCpv) * 1000, "EUR", locale)}{" "}
                  {sharedT("units.cpm")}
                </span>
                {application.campaign.platforms.length > 0 && (
                  <span className="flex items-center gap-1">
                    {application.campaign.platforms.map((p) => (
                      <PlatformIcon key={p} platform={p} size={14} />
                    ))}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                {t("due", { date: formatShortDate(application.campaign.deadline, locale) })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function ActiveCampaignsSkeleton() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
      <Skeleton className="mb-5 h-4 w-40" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-32" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}
