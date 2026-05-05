import Link from "next/link";
import { Camera, Music2, PlaySquare, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCreatorTopStats } from "@/lib/stats/creator";
import { parseRange } from "@/lib/stats/range";
import { PLATFORM_ALL } from "@/lib/stats/types";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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

  const platforms = [
    {
      key: "instagram",
      label: "Instagram",
      icon: Camera,
      accounts: igConnections.map((connection) => ({
        id: connection.id,
        label: `@${connection.igUsername}`,
        meta: followerMeta(connection.followerCount),
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        statsHref: connection.accessToken && connection.igUserId ? `/creator/stats/ig/${connection.id}` : undefined,
        remove: <RemovePageButton connectionId={connection.id} />,
      })),
      connect: <InstagramConnectButton />,
    },
    {
      key: "tiktok",
      label: "TikTok",
      icon: Music2,
      accounts: ttConnections.map((connection) => ({
        id: connection.id,
        label: connection.username.startsWith("@") ? connection.username : `@${connection.username}`,
        meta: followerMeta(connection.followerCount),
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        statsHref: connection.accessToken ? `/creator/stats/tiktok/${connection.id}` : undefined,
        remove: <RemoveTikTokPageButton connectionId={connection.id} />,
      })),
      connect: <TikTokConnectButton />,
    },
    {
      key: "youtube",
      label: "YouTube",
      icon: PlaySquare,
      accounts: ytConnections.map((connection) => ({
        id: connection.id,
        label: connection.channelName,
        meta: followerMeta(connection.subscriberCount, "subscribers"),
        lastSyncedAt: connection.updatedAt,
        statsHref: connection.accessToken ? `/creator/stats/yt/${connection.id}` : undefined,
        remove: <RemoveYtPageButton connectionId={connection.id} />,
      })),
      connect: <YoutubeConnectButton />,
    },
    {
      key: "facebook",
      label: "Facebook",
      icon: Share2,
      accounts: fbConnections.map((connection) => ({
        id: connection.id,
        label: connection.pageName,
        meta: followerMeta(connection.followerCount),
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        statsHref: connection.accessToken ? `/creator/stats/fb/${connection.id}` : undefined,
        remove: <RemoveFbPageButton connectionId={connection.id} />,
      })),
      connect: <FacebookConnectButton />,
    },
  ];

  const accounts = platforms.flatMap((platform) =>
    platform.accounts.map((account) => ({
      ...account,
      platformKey: platform.key,
      platformLabel: platform.label,
      icon: platform.icon,
    })),
  );

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Account health"
        title="Accounts"
        description="Keep the pages you post from connected, verified, and ready for tracking."
        action={
          <ConnectPlatformDialog>
            {platforms.map((platform) => (
              <div key={platform.key}>{platform.connect}</div>
            ))}
          </ConnectPlatformDialog>
        }
      />

      <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
        <CreatorSectionHeader title="Connected pages" description="Only active accounts stay visible here." />
        {accounts.length === 0 ? (
          <EmptyState
            title="No pages connected yet"
            description="Use the connect button above to choose a platform and add the first page."
            className="min-h-[220px]"
          />
        ) : (
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200">
            {accounts.map((account) => (
              <AccountRow key={`${account.platformKey}-${account.id}`} account={account} />
            ))}
          </div>
        )}
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

function AccountRow({
  account,
}: {
  account: {
    label: string;
    meta: string;
    platformLabel: string;
    icon: LucideIcon;
    lastSyncedAt: Date | null;
    statsHref?: string;
    remove: ReactNode;
  };
}) {
  const Icon = account.icon;

  return (
    <div className="flex flex-col gap-4 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-950">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-neutral-950">{account.label}</p>
            <Badge variant="neutral">{account.platformLabel}</Badge>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            {account.meta} - last synced {formatSync(account.lastSyncedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        {account.statsHref ? (
          <Link
            href={account.statsHref}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-950 transition hover:bg-neutral-50"
          >
            Stats
          </Link>
        ) : null}
        {account.remove}
      </div>
    </div>
  );
}

function followerMeta(value: number | null | undefined, label = "followers") {
  return value == null ? `No ${label} snapshot` : `${value.toLocaleString()} ${label}`;
}

function formatSync(value: Date | null) {
  if (!value) return "never";
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
