"use client";

import EarningsCard from "@/components/shared/EarningsCard";
import {
  SubmittedClipsList,
  type SubmittedClipData,
} from "@/components/submissions/submitted-clips-list";
import {
  CreatorPageHeader,
  SoftStat,
} from "../../_components/creator-journey";
import { formatNumber } from "@/lib/i18n-format";
import { useLocale, useTranslations } from "next-intl";

interface VideosClientProps {
  videos: SubmittedClipData[];
  statusCounts: Record<string, number>;
  totalEarned: number;
}

export function VideosClient({
  videos,
  statusCounts,
  totalEarned,
}: VideosClientProps) {
  const locale = useLocale();
  const t = useTranslations("creator.videos.page");
  const listT = useTranslations("creator.videos.list");
  const sharedT = useTranslations("creator.shared");
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const hasUnsettled = videos.some((v) => v.status !== "APPROVED");

  return (
    <div className="w-full space-y-6 md:space-y-8 md:px-6 md:py-8">
      <CreatorPageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <section>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          <SoftStat
            label={t("totalClips")}
            value={formatNumber(videos.length, locale)}
            detail={t("allSubmissions")}
          />
          <SoftStat
            label={t("totalViews")}
            value={formatNumber(totalViews, locale)}
            detail={t("trackedOrClaimed")}
          />
          <div className="col-span-2 md:col-span-1">
            <EarningsCard
              amount={totalEarned}
              disclaimer={
                hasUnsettled
                  ? t("unsettledDisclaimer")
                  : null
              }
            />
          </div>
        </div>

        <div className="mt-6">
          <SubmittedClipsList
            videos={videos}
            statusCounts={statusCounts}
            mode="creator"
            detailBasePath="/creator/videos"
            emptyState={{
              title: listT("noClipsYet"),
              description: listT("noClipsDescription"),
              primaryCta: { label: sharedT("actions.browseCampaigns"), href: "/creator/campaigns" },
              secondaryCta: { label: sharedT("actions.connectAccount"), href: "/creator/connections" },
            }}
          />
        </div>
      </section>
    </div>
  );
}
