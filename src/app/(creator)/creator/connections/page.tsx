import Link from "next/link";
import { Camera, Music2, PlaySquare, Share2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressiveActionDrawer } from "@/components/ui/progressive-action-drawer";
import { InstagramConnectButton } from "./_components/instagram-connect-button";
import { FacebookConnectButton } from "./_components/facebook-connect-button";
import { YoutubeConnectButton } from "./_components/youtube-connect-button";
import { TikTokConnectButton } from "./_components/tiktok-connect-button";
import { RemovePageButton } from "./_components/remove-page-button";
import { RemoveFbPageButton } from "./_components/remove-fb-page-button";
import { RemoveYtPageButton } from "./_components/remove-yt-page-button";
import { RemoveTikTokPageButton } from "./_components/remove-tiktok-page-button";
import { CreatorPageHeader, CreatorSectionHeader, SoftStat } from "../_components/creator-journey";

export default async function PagesPage() {
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  const [igConnections, fbConnections, ytConnections, ttConnections] = await Promise.all([
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
        verified: connection.isVerified,
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        hasToken: Boolean(connection.accessToken && connection.igUserId),
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
        verified: connection.isVerified,
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        hasToken: Boolean(connection.accessToken),
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
        verified: connection.isVerified,
        lastSyncedAt: connection.updatedAt,
        hasToken: Boolean(connection.accessToken),
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
        verified: connection.isVerified,
        lastSyncedAt: connection.lastCheckedAt ?? connection.verifiedAt,
        hasToken: Boolean(connection.accessToken),
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
  const totalAccounts = accounts.length;
  const verifiedAccounts = accounts.filter((account) => account.verified).length;
  const oauthReady = accounts.filter((account) => account.hasToken).length;

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Account health"
        title="Accounts"
        description="Keep the pages you post from connected, verified, and ready for tracking."
        action={
          <ProgressiveActionDrawer
            triggerLabel="Connect your page"
            title="Choose a platform"
            description="Select the platform first, then complete the matching connection step."
            width="lg"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {platforms.map((platform) => (
                <div key={platform.key}>{platform.connect}</div>
              ))}
            </div>
          </ProgressiveActionDrawer>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SoftStat label="Connected accounts" value={String(totalAccounts)} detail="Across supported platforms" />
        <SoftStat label="Verified" value={`${verifiedAccounts}/${totalAccounts || 0}`} detail="Ready for eligibility checks" />
        <SoftStat label="Sync ready" value={String(oauthReady)} detail="OAuth token available" />
      </div>

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
    verified: boolean;
    hasToken: boolean;
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
        <Badge variant={account.verified ? "verified" : "pending"}>
          <ShieldCheck className="h-3 w-3" />
          {account.verified ? "Verified" : "Pending"}
        </Badge>
        <Badge variant={account.hasToken ? "verified" : "neutral"}>
          {account.hasToken ? "OAuth" : "Bio/manual"}
        </Badge>
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
