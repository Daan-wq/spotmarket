import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProfileStatsRow } from "@/components/creator/ProfileStatsRow";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { RecentPostsGrid } from "@/components/creator/RecentPostsGrid";
import { CampaignMatchCard } from "@/components/creator/CampaignMatchCard";
import { RefreshButton } from "@/components/creator/RefreshButton";
import type { IgDemographics, IgMediaItem } from "@/types/instagram";

export default async function AdminCreatorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const { id } = await params;
  const { campaignId } = await searchParams;

  const [creator, campaign] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        socialAccounts: { where: { isActive: true } },
        _count: { select: { applications: true } },
      },
    }),
    campaignId ? prisma.campaign.findUnique({ where: { id: campaignId } }) : Promise.resolve(null),
  ]);

  if (!creator) notFound();

  const igAccount = creator.socialAccounts.find((a) => a.platform === "instagram");
  const demographics = (igAccount?.igDemographics as IgDemographics | null) ?? null;
  const mediaCache = (igAccount?.igMediaCache as IgMediaItem[] | null) ?? null;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/creators" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
          ← Creators
        </Link>
        {campaign && (
          <>
            <span style={{ color: "var(--border)" }}>/</span>
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>{campaign.name}</span>
          </>
        )}
      </div>

      <div className="rounded-xl border p-5" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {igAccount?.igProfilePicUrl || creator.avatarUrl ? (
              <Image
                src={(igAccount?.igProfilePicUrl ?? creator.avatarUrl) as string}
                alt={creator.displayName}
                width={56}
                height={56}
                unoptimized
                className="rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {creator.displayName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{creator.displayName}</p>
              {igAccount && <p className="text-sm" style={{ color: "var(--text-muted)" }}>@{igAccount.platformUsername}</p>}
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{creator.user.email}</p>
              {igAccount?.igBio && (
                <p className="text-xs mt-1 max-w-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>{igAccount.igBio}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <RefreshButton creatorId={creator.id} />
            {igAccount?.lastSyncedAt && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                Synced {new Date(igAccount.lastSyncedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {igAccount && (
        <ProfileStatsRow
          followerCount={creator.totalFollowers}
          engagementRate={Number(creator.engagementRate).toFixed(2)}
          topGeo={creator.topCountry ?? creator.primaryGeo}
          reach30d={igAccount.ig30DayReach}
          views30d={igAccount.ig30DayViews}
        />
      )}

      {campaign && <CampaignMatchCard profile={creator} campaign={campaign} />}

      <AudienceDemographics
        demographics={demographics}
        followerCount={creator.totalFollowers}
        updatedAt={igAccount?.igDemographicsUpdatedAt}
      />

      <RecentPostsGrid mediaCache={mediaCache} />

      <div className="rounded-xl border p-4 grid grid-cols-2 gap-3 text-sm" style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Campaigns</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{creator._count.applications}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Verified</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{creator.isVerified ? "Yes" : "No"}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Primary Geo</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{creator.primaryGeo}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Joined</p>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{new Date(creator.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
