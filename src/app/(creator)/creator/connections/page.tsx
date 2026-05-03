import Link from "next/link";
import { Camera, Music2, PlaySquare, RefreshCw, Share2, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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

  const cards = [
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
      permissions: "Bio verification and OAuth stats when connected",
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
      permissions: "OAuth connection, metrics sync, and demographic proof",
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
      permissions: "OAuth connection and Shorts analytics",
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
      permissions: "Page OAuth and performance sync",
    },
    {
      key: "x",
      label: "X",
      icon: RefreshCw,
      accounts: [],
      connect: <button className="h-11 rounded-xl border border-neutral-200 bg-neutral-100 px-4 text-sm font-semibold text-neutral-400" disabled>Coming later</button>,
      permissions: "Planned platform card; no connector is implemented yet",
    },
  ];

  const totalAccounts = cards.reduce((sum, card) => sum + card.accounts.length, 0);
  const verifiedAccounts = cards.reduce((sum, card) => sum + card.accounts.filter((account) => account.verified).length, 0);
  const oauthReady = cards.reduce((sum, card) => sum + card.accounts.filter((account) => account.hasToken).length, 0);

  return (
    <div className="w-full space-y-8 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Account health"
        title="Accounts"
        description="Connect the pages you actually post from. Verification, sync health, permissions, and reconnect actions stay visible per platform."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SoftStat label="Connected accounts" value={String(totalAccounts)} detail="Across supported platforms" />
        <SoftStat label="Verified" value={`${verifiedAccounts}/${totalAccounts || 0}`} detail="Ready for eligibility checks" />
        <SoftStat label="Sync ready" value={String(oauthReady)} detail="OAuth token available" />
      </div>

      <section>
        <CreatorSectionHeader title="Platform cards" description="Use these cards to connect, verify, reconnect, or remove platform accounts." />
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {cards.map((card) => (
            <PlatformCard key={card.key} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PlatformCard({
  card,
}: {
  card: {
    label: string;
    icon: LucideIcon;
    permissions: string;
    connect: ReactNode;
    accounts: Array<{
      id: string;
      label: string;
      meta: string;
      verified: boolean;
      lastSyncedAt: Date | null;
      hasToken: boolean;
      statsHref?: string;
      remove: ReactNode;
    }>;
  };
}) {
  const Icon = card.icon;
  const verified = card.accounts.filter((account) => account.verified).length;
  const syncReady = card.accounts.filter((account) => account.hasToken).length;

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-950">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">{card.label}</h2>
            <p className="text-sm text-neutral-500">{card.permissions}</p>
          </div>
        </div>
        {card.connect}
      </header>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat label="Accounts" value={String(card.accounts.length)} />
        <MiniStat label="Verified" value={String(verified)} />
        <MiniStat label="Sync" value={String(syncReady)} />
      </div>

      <div className="mt-5 space-y-3">
        {card.accounts.length === 0 ? (
          <EmptyState
            title={`No ${card.label} account`}
            description="Connect this platform when you use it for campaign submissions."
            className="min-h-[180px]"
          />
        ) : (
          card.accounts.map((account) => (
            <div key={account.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                {account.statsHref ? (
                  <Link href={account.statsHref} className="font-semibold text-neutral-950 underline-offset-2 hover:underline">
                    {account.label}
                  </Link>
                ) : (
                  <p className="font-semibold text-neutral-950">{account.label}</p>
                )}
                <p className="mt-1 text-xs text-neutral-500">{account.meta} · last synced {formatSync(account.lastSyncedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={account.verified ? "verified" : "pending"}>
                  <ShieldCheck className="h-3 w-3" />
                  {account.verified ? "Verified" : "Pending"}
                </Badge>
                <Badge variant={account.hasToken ? "verified" : "neutral"}>{account.hasToken ? "OAuth" : "Bio/manual"}</Badge>
                {account.remove}
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-neutral-950">{value}</p>
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
