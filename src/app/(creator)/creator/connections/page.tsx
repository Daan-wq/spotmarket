import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorTopStats } from "@/lib/stats/creator";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_ALL } from "@/lib/stats/types";
import { KpiCard } from "@/components/admin/kpi-card";
import { PlatformTile } from "@/components/stats/PlatformTile";
import { TimeRangeSelector } from "@/components/stats/TimeRangeSelector";
import { ConnectPlatformDialog } from "./_components/connect-platform-dialog";
import { InstagramConnectButton } from "./_components/instagram-connect-button";
import { FacebookConnectButton } from "./_components/facebook-connect-button";
import { YoutubeConnectButton } from "./_components/youtube-connect-button";
import { TikTokConnectButton } from "./_components/tiktok-connect-button";
import { RemovePageButton } from "./_components/remove-page-button";
import { RemoveFbPageButton } from "./_components/remove-fb-page-button";
import { RemoveYtPageButton } from "./_components/remove-yt-page-button";
import { RemoveTikTokPageButton } from "./_components/remove-tiktok-page-button";
import {
  ConnectionsClient,
  type ConnectionAccount,
} from "./_components/ConnectionsClient";
import type { ConnectionPlatform } from "@/components/shared/connections/PlatformTabs";
import { CreatorPageHeader, CreatorSectionHeader } from "../_components/creator-journey";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function PagesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const [igConnections, fbConnections, ytConnections, ttConnections, stats] = await Promise.all([
    prisma.creatorIgConnection.findMany({
      where: { creatorProfileId: header.creatorProfile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorFbConnection.findMany({
      where: { creatorProfileId: header.creatorProfile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorYtConnection.findMany({
      where: { creatorProfileId: header.creatorProfile.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorTikTokConnection.findMany({
      where: { creatorProfileId: header.creatorProfile.id },
      orderBy: { createdAt: "desc" },
    }),
    getCreatorTopStats(supabaseId, range),
  ]);

  const stripAt = (s: string) => s.replace(/^@/, "");

  const accountsByPlatform: Record<ConnectionPlatform, ConnectionAccount[]> = {
    ig: igConnections.map((c): ConnectionAccount => {
      const handle = stripAt(c.igUsername);
      return {
        id: c.id,
        label: `@${handle}`,
        username: handle,
        meta: followerMeta(c.followerCount),
        lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
        statsHref:
          c.accessToken && c.igUserId
            ? `/creator/stats/ig/${c.id}`
            : undefined,
        remove: (
          <RemovePageButton connectionId={c.id} label={`@${handle}`} />
        ),
      };
    }),
    tt: ttConnections.map((c): ConnectionAccount => {
      const handle = stripAt(c.username);
      return {
        id: c.id,
        label: `@${handle}`,
        username: handle,
        meta: followerMeta(c.followerCount),
        lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
        statsHref: c.accessToken ? `/creator/stats/tiktok/${c.id}` : undefined,
        remove: (
          <RemoveTikTokPageButton connectionId={c.id} label={`@${handle}`} />
        ),
      };
    }),
    fb: fbConnections.map((c): ConnectionAccount => ({
      id: c.id,
      label: c.pageName,
      username: stripAt(c.pageName).replace(/\s+/g, ""),
      meta: followerMeta(c.followerCount),
      lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
      statsHref: c.accessToken ? `/creator/stats/fb/${c.id}` : undefined,
      remove: (
        <RemoveFbPageButton connectionId={c.id} label={c.pageName} />
      ),
    })),
    yt: ytConnections.map((c): ConnectionAccount => ({
      id: c.id,
      label: c.channelName,
      username: stripAt(c.channelName).replace(/\s+/g, ""),
      meta: followerMeta(c.subscriberCount, "subscribers"),
      lastSyncedAt: c.updatedAt?.toISOString() ?? null,
      statsHref: c.accessToken ? `/creator/stats/yt/${c.id}` : undefined,
      remove: (
        <RemoveYtPageButton connectionId={c.id} label={c.channelName} />
      ),
    })),
  };

  const connectButtons = (
    <ConnectPlatformDialog>
      <InstagramConnectButton />
      <TikTokConnectButton />
      <YoutubeConnectButton />
      <FacebookConnectButton />
    </ConnectPlatformDialog>
  );

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Account health"
        title="Accounts"
        description="Keep the pages you post from connected, verified, and ready for tracking."
      />

      <section className="space-y-3">
        <CreatorSectionHeader title="Connected pages" description="Switch platforms and accounts to manage stats and disconnects." />
        <ConnectionsClient accountsByPlatform={accountsByPlatform} connect={connectButtons} />
      </section>

      {stats && (
        <section className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CreatorSectionHeader
              title="Your performance"
              description={`${range.label} across all platforms`}
            />
            <TimeRangeSelector value={range.key} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label="Total views"
              value={stats.totalViews.value.toLocaleString()}
              trend={stats.totalViews.delta}
              hint={range.label}
            />
            <KpiCard
              label="Total followers"
              value={stats.totalFollowers.value.toLocaleString()}
              hint="Latest snapshot"
            />
            <KpiCard
              label="Engagement"
              value={stats.totalEngagement.value.toLocaleString()}
              trend={stats.totalEngagement.delta}
              hint="Likes + comments + shares"
            />
            <KpiCard
              label="Earnings"
              value={`$${stats.totalEarnings.value.toFixed(2)}`}
              trend={stats.totalEarnings.delta}
              hint={range.label}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PLATFORM_ALL.map((slug) => {
              const p = stats.byPlatform[slug];
              return (
                <PlatformTile
                  key={slug}
                  slug={slug}
                  href={`/creator/stats/${slug}${range.key !== "30d" ? `?range=${range.key}` : ""}`}
                  connectionCount={p.connectionCount}
                  followerCount={p.followerCount}
                  windowViews={p.windowViews}
                  windowEngagement={p.windowEngagement}
                  topPostTitle={p.topPost?.title}
                  topPostViews={p.topPost?.views}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function followerMeta(value: number | null | undefined, label = "followers") {
  return value == null ? `No ${label} snapshot` : `${value.toLocaleString()} ${label}`;
}
