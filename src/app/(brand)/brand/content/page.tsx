import type { Prisma } from "@prisma/client";
import { Clapperboard } from "lucide-react";
import { BrandContentGrid } from "@/components/brand/brand-content-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buildBrandContentPage } from "@/lib/brand-content";
import {
  buildBrandPortalCampaignWhere,
  selectBrandPortalCampaign,
  sortBrandPortalCampaigns,
} from "@/lib/brand-report-portal";
import { getBrandPortalContext } from "@/lib/brand-auth";
import { VALID_METRIC_SNAPSHOT_WHERE } from "@/lib/metrics/valid-snapshots";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    campaignId?: string;
    platform?: string;
    sort?: string;
    page?: string;
  }>;
}

const campaignSelect = {
  id: true,
  name: true,
  status: true,
  startsAt: true,
  deadline: true,
  updatedAt: true,
} as const;

type BrandContentCampaign = Prisma.CampaignGetPayload<{ select: typeof campaignSelect }>;

export default async function BrandContentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const context = await getBrandPortalContext();
  const campaigns = sortBrandPortalCampaigns<BrandContentCampaign>(
    await prisma.campaign.findMany({
      where: buildBrandPortalCampaignWhere(context.brandIds),
      select: campaignSelect,
      orderBy: [{ updatedAt: "desc" }],
    }),
  );
  const selectedCampaign = selectBrandPortalCampaign(campaigns, params.campaignId);

  if (!selectedCampaign) {
    return (
      <EmptyState
        icon={<Clapperboard className="h-5 w-5" />}
        title="Nog geen content zichtbaar"
        description="Goedgekeurde content verschijnt hier zodra een actieve of afgeronde campagne beschikbaar is."
      />
    );
  }

  const submissions = await prisma.campaignSubmission.findMany({
    where: {
      campaignId: selectedCampaign.id,
      status: "APPROVED",
    },
    select: {
      id: true,
      status: true,
      postUrl: true,
      thumbnailUrl: true,
      normalizedPlatform: true,
      sourcePlatform: true,
      authorHandle: true,
      createdAt: true,
      viewCount: true,
      claimedViews: true,
      eligibleViews: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      metricSnapshots: {
        where: VALID_METRIC_SNAPSHOT_WHERE,
        orderBy: { capturedAt: "desc" },
        take: 1,
        select: {
          capturedAt: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
        },
      },
    },
  });
  const content = buildBrandContentPage(submissions, {
    platform: params.platform,
    sort: params.sort,
    page: Number(params.page ?? 1),
    pageSize: 24,
  });

  return (
    <BrandContentGrid
      selectedCampaignId={selectedCampaign.id}
      {...content}
    />
  );
}
