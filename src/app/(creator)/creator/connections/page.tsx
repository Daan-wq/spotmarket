import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireAuth, getCreatorHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRange } from "@/lib/stats/range";
import {
  type PlatformSlug,
  PLATFORM_ALL,
  isPlatformSlug,
} from "@/lib/stats/types";
import {
  getCreatorTopStats,
  getCreatorPlatformStats,
  getCreatorConnectionStats,
  getCreatorDemographics,
  getAccountGrowth,
  getCreatorSubmissionIdsByPlatform,
  getConnectionSubmissionIds,
} from "@/lib/stats/creator";
import {
  getDailyViewsSeries,
  getYtBreakdowns,
  getStoriesActivity,
  getStoryReelCorrelations,
  getAggregateRetentionCurve,
  getFbReactionsOverTime,
} from "@/lib/stats/trends";
import { getContentRows } from "@/lib/stats/content";
import { getTimelineEvents, getPostLifts7d, type TimelineScope } from "@/lib/stats/timeline";
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
  AccountsWorkspace,
  type AccountsWorkspaceAccount,
  type SubTab,
} from "./_components/AccountsWorkspace";
import type { Scope } from "./_components/ScopeTabs";
import { AccountMetaRow } from "./_components/AccountMetaRow";
import { OverviewSubTab } from "./_components/sub-tabs/Overview";
import { ContentSubTab } from "./_components/sub-tabs/Content";
import { TimelineSubTab } from "./_components/sub-tabs/Timeline";
import { AudienceSubTab } from "./_components/sub-tabs/Audience";
import { InsightsSubTab } from "./_components/sub-tabs/Insights";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatorPageHeader } from "../_components/creator-journey";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    range?: string;
    platform?: string;
    account?: string;
    tab?: string;
  }>;
}

interface AccountInventory {
  id: string;
  username: string;
  label: string;
  followerCount: number | null;
  lastSyncedAt: string | null;
  removeButton: ReactNode;
}

type AccountsByPlatform = Record<PlatformSlug, AccountInventory[]>;

export default async function CreatorConnectionsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const range = parseRange(sp);
  const { userId: supabaseId } = await requireAuth("creator");

  const header = await getCreatorHeader(supabaseId);
  if (!header) throw new Error("User not found");
  if (!header.creatorProfile) throw new Error("Creator profile not found");

  // ── Always-needed: connection inventory ─────────────────────────────────
  const inventory = await loadInventory(header.creatorProfile.id);

  // ── Parse + validate scope ───────────────────────────────────────────────
  const rawPlatform = sp.platform;
  const rawAccount = sp.account;
  let scope: Scope = "all";
  let accountId: string | "all" = "all";

  if (rawPlatform && rawPlatform !== "all" && isPlatformSlug(rawPlatform)) {
    scope = rawPlatform;
    if (rawAccount && inventory[rawPlatform].some((a) => a.id === rawAccount)) {
      accountId = rawAccount;
    } else if (rawAccount) {
      // Stale account id — fallback to platform scope.
      const params = new URLSearchParams();
      params.set("platform", rawPlatform);
      if (range.key !== "30d") params.set("range", range.key);
      if (sp.tab && sp.tab !== "overview") params.set("tab", sp.tab);
      redirect(`/creator/connections?${params.toString()}`);
    }
  } else if (rawPlatform === "all" || !rawPlatform) {
    scope = "all";
  } else {
    // Invalid platform string
    redirect("/creator/connections");
  }

  // ── Parse sub-tab ────────────────────────────────────────────────────────
  const subTab = parseSubTab(sp.tab, scope);

  // ── Connect button JSX ───────────────────────────────────────────────────
  const connectButtons = (
    <ConnectPlatformDialog>
      <InstagramConnectButton />
      <TikTokConnectButton />
      <YoutubeConnectButton />
      <FacebookConnectButton />
    </ConnectPlatformDialog>
  );

  // ── Empty state if no connections at all ────────────────────────────────
  const totalConnections = PLATFORM_ALL.reduce(
    (s, p) => s + inventory[p].length,
    0,
  );
  if (totalConnections === 0) {
    return (
      <div className="w-full space-y-6 px-6 py-8">
        <CreatorPageHeader
          eyebrow="Account health"
          title="Accounts"
          description="Keep the pages you post from connected, verified, and ready for tracking."
          action={connectButtons}
        />
        <EmptyState
          title="No pages connected yet"
          description="Use the connect button above to choose a platform and add the first page."
          className="min-h-[260px]"
        />
      </div>
    );
  }

  // ── Active-account meta row (only when scope=platform & accountId set) ──
  let metaNode: ReactNode = null;
  if (scope !== "all" && accountId !== "all") {
    const acc = inventory[scope].find((a) => a.id === accountId);
    if (acc) {
      metaNode = (
        <AccountMetaRow
          label={acc.label}
          meta={
            acc.followerCount != null
              ? `${acc.followerCount.toLocaleString()} ${
                  scope === "yt" ? "subscribers" : "followers"
                }`
              : "No follower snapshot"
          }
          lastSyncedAt={acc.lastSyncedAt}
          removeButton={acc.removeButton}
        />
      );
    }
  }

  // ── Build tab body ───────────────────────────────────────────────────────
  const body = await renderSubTab({
    subTab,
    scope,
    accountId,
    range,
    supabaseId,
  });

  // ── Workspace inventory mapping (chips need {id, username}) ─────────────
  const accountsByPlatform: Record<PlatformSlug, AccountsWorkspaceAccount[]> = {
    ig: inventory.ig.map((a) => ({ id: a.id, username: a.username })),
    tt: inventory.tt.map((a) => ({ id: a.id, username: a.username })),
    fb: inventory.fb.map((a) => ({ id: a.id, username: a.username })),
    yt: inventory.yt.map((a) => ({ id: a.id, username: a.username })),
  };

  return (
    <div className="w-full space-y-6 px-6 py-8">
      <CreatorPageHeader
        eyebrow="Analytics"
        title="Accounts"
        description="Manage connected pages and explore performance, all in one place."
      />

      <AccountsWorkspace
        scope={scope}
        accountId={accountId}
        subTab={subTab}
        rangeKey={range.key}
        accountsByPlatform={accountsByPlatform}
        connect={connectButtons}
        meta={metaNode}
        body={body}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Inventory loader
// ────────────────────────────────────────────────────────────────────────────

async function loadInventory(creatorProfileId: string): Promise<AccountsByPlatform> {
  const [igConnections, fbConnections, ytConnections, ttConnections] = await Promise.all([
    prisma.creatorIgConnection.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorFbConnection.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorYtConnection.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.creatorTikTokConnection.findMany({
      where: { creatorProfileId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const stripAt = (s: string) => s.replace(/^@/, "");

  return {
    ig: igConnections.map((c) => {
      const handle = stripAt(c.igUsername);
      return {
        id: c.id,
        username: handle,
        label: `@${handle}`,
        followerCount: c.followerCount,
        lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
        removeButton: <RemovePageButton connectionId={c.id} label={`@${handle}`} />,
      };
    }),
    tt: ttConnections.map((c) => {
      const handle = stripAt(c.username);
      return {
        id: c.id,
        username: handle,
        label: `@${handle}`,
        followerCount: c.followerCount,
        lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
        removeButton: <RemoveTikTokPageButton connectionId={c.id} label={`@${handle}`} />,
      };
    }),
    fb: fbConnections.map((c) => ({
      id: c.id,
      username: stripAt(c.pageName).replace(/\s+/g, ""),
      label: c.pageName,
      followerCount: c.followerCount,
      lastSyncedAt: (c.lastCheckedAt ?? c.verifiedAt)?.toISOString() ?? null,
      removeButton: <RemoveFbPageButton connectionId={c.id} label={c.pageName} />,
    })),
    yt: ytConnections.map((c) => ({
      id: c.id,
      username: stripAt(c.channelName).replace(/\s+/g, ""),
      label: c.channelName,
      followerCount: c.subscriberCount,
      lastSyncedAt: c.updatedAt?.toISOString() ?? null,
      removeButton: <RemoveYtPageButton connectionId={c.id} label={c.channelName} />,
    })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-tab parser
// ────────────────────────────────────────────────────────────────────────────

function parseSubTab(raw: string | undefined, scope: Scope): SubTab {
  const allowed: SubTab[] =
    scope === "all"
      ? ["overview", "content", "timeline", "audience"]
      : ["overview", "content", "timeline", "audience", "insights"];
  const candidate = raw as SubTab | undefined;
  return candidate && allowed.includes(candidate) ? candidate : "overview";
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-tab data fetcher + renderer
// ────────────────────────────────────────────────────────────────────────────

interface RenderArgs {
  subTab: SubTab;
  scope: Scope;
  accountId: string | "all";
  range: ReturnType<typeof parseRange>;
  supabaseId: string;
}

async function renderSubTab(args: RenderArgs): Promise<ReactNode> {
  const { subTab } = args;
  if (subTab === "overview") return renderOverview(args);
  if (subTab === "content") return renderContent(args);
  if (subTab === "timeline") return renderTimeline(args);
  if (subTab === "audience") return renderAudience(args);
  if (subTab === "insights") return renderInsights(args);
  return null;
}

async function resolveSubmissionIds(args: RenderArgs): Promise<{
  ids: string[];
  byPlatform: Record<PlatformSlug, string[]>;
}> {
  const byPlatform = (await getCreatorSubmissionIdsByPlatform(args.supabaseId, args.range)) ?? {
    ig: [],
    tt: [],
    yt: [],
    fb: [],
  };
  if (args.scope === "all") {
    return { ids: PLATFORM_ALL.flatMap((p) => byPlatform[p]), byPlatform };
  }
  if (args.accountId === "all") {
    return { ids: byPlatform[args.scope], byPlatform };
  }
  const ids = await getConnectionSubmissionIds(args.supabaseId, args.scope, args.accountId);
  return { ids, byPlatform };
}

async function renderOverview(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, supabaseId } = args;

  if (scope === "all") {
    const [stats, subs] = await Promise.all([
      getCreatorTopStats(supabaseId, range),
      resolveSubmissionIds(args),
    ]);
    if (!stats) return null;
    const daily = await getDailyViewsSeries(subs.ids, range);
    return <OverviewSubTab kind="all" stats={stats} daily={daily} range={range} />;
  }

  if (accountId === "all") {
    const [stats, subs] = await Promise.all([
      getCreatorPlatformStats(supabaseId, scope, range),
      resolveSubmissionIds(args),
    ]);
    if (!stats) return null;
    const daily = await getDailyViewsSeries(subs.ids, range);
    return <OverviewSubTab kind="platform" platform={scope} stats={stats} daily={daily} range={range} />;
  }

  const [stats, subs] = await Promise.all([
    getCreatorConnectionStats(supabaseId, scope, accountId, range),
    resolveSubmissionIds(args),
  ]);
  if (!stats) return null;
  const daily = await getDailyViewsSeries(subs.ids, range);
  return <OverviewSubTab kind="account" platform={scope} stats={stats} daily={daily} range={range} />;
}

async function renderContent(args: RenderArgs): Promise<ReactNode> {
  const { scope, range } = args;
  const subs = await resolveSubmissionIds(args);

  if (scope === "all") {
    // Concatenate per-platform calls so each row carries its own platform field.
    const perPlatform = await Promise.all(
      PLATFORM_ALL.map((p) =>
        getContentRows({ submissionIds: subs.byPlatform[p], range, platform: p }),
      ),
    );
    const rows = perPlatform.flat();
    rows.sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
    return <ContentSubTab platform="ig" rows={rows} showPlatform={true} />;
  }

  const rows = await getContentRows({ submissionIds: subs.ids, range, platform: scope });
  return <ContentSubTab platform={scope} rows={rows} showPlatform={false} />;
}

async function renderTimeline(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, supabaseId } = args;
  const subs = await resolveSubmissionIds(args);

  const timelineScope: TimelineScope =
    scope === "all"
      ? { kind: "all", supabaseUserId: supabaseId }
      : accountId === "all"
        ? { kind: "platform", supabaseUserId: supabaseId, platform: scope }
        : { kind: "account", supabaseUserId: supabaseId, platform: scope, connectionId: accountId };

  const [daily, events] = await Promise.all([
    getDailyViewsSeries(subs.ids, range),
    getTimelineEvents(timelineScope, range),
  ]);

  const [lifts, correlations] = await Promise.all([
    getPostLifts7d(events),
    // Correlation callout uses the IG-only StoryReelCorrelation table. Filter by submissionIds in scope.
    getStoryReelCorrelations(subs.ids),
  ]);

  return (
    <TimelineSubTab daily={daily} events={events} lifts={lifts} correlations={correlations} />
  );
}

async function renderAudience(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, supabaseId } = args;

  if (scope === "all") {
    const follower = await getCreatorDemographics(supabaseId, null, "FOLLOWER");
    return (
      <AudienceSubTab
        accountGrowth={[]}
        follower={follower}
        engaged={null}
        showKindToggle={false}
      />
    );
  }

  const connectionId = accountId === "all" ? undefined : accountId;
  const [accountGrowth, follower, engaged] = await Promise.all([
    getAccountGrowth(supabaseId, scope, range, connectionId),
    getCreatorDemographics(supabaseId, scope, "FOLLOWER", connectionId),
    scope === "ig"
      ? getCreatorDemographics(supabaseId, "ig", "ENGAGED", connectionId)
      : Promise.resolve(null),
  ]);

  return (
    <AudienceSubTab
      accountGrowth={accountGrowth}
      follower={follower}
      engaged={engaged}
      showKindToggle={scope === "ig"}
    />
  );
}

async function renderInsights(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, supabaseId } = args;
  if (scope === "all") return null; // Should be unreachable — workspace hides the tab.

  const subs = await resolveSubmissionIds(args);

  if (scope === "yt") {
    // YT needs connection ids — derive from inventory or a single connectionId
    const ids = await resolveYtConnectionIds(supabaseId, accountId);
    const breakdowns = await getYtBreakdowns(ids, range);
    return <InsightsSubTab platform="yt" payload={{ kind: "yt", data: breakdowns }} />;
  }

  if (scope === "fb") {
    const [reactions, retention] = await Promise.all([
      getFbReactionsOverTime(subs.ids, range),
      getAggregateRetentionCurve(subs.ids, range),
    ]);
    return (
      <InsightsSubTab platform="fb" payload={{ kind: "fb", data: { reactions, retention } }} />
    );
  }

  if (scope === "ig") {
    const igConnectionIds = await resolveIgConnectionIds(supabaseId, accountId);
    const [stories, correlations] = await Promise.all([
      getStoriesActivity(igConnectionIds, range),
      getStoryReelCorrelations(subs.ids),
    ]);
    return (
      <InsightsSubTab
        platform="ig"
        payload={{ kind: "ig", data: { stories, correlations } }}
      />
    );
  }

  // tt — posting cadence. Derive from content rows.
  const rows = await getContentRows({ submissionIds: subs.ids, range, platform: "tt" });
  return <InsightsSubTab platform="tt" payload={{ kind: "tt", data: { contentRows: rows } }} />;
}

async function resolveYtConnectionIds(supabaseId: string, accountId: string | "all"): Promise<string[]> {
  if (accountId !== "all") return [accountId];
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { creatorProfile: { select: { id: true } } },
  });
  const creatorProfileId = user?.creatorProfile?.id;
  if (!creatorProfileId) return [];
  const conns = await prisma.creatorYtConnection.findMany({
    where: { creatorProfileId },
    select: { id: true },
  });
  return conns.map((c) => c.id);
}

async function resolveIgConnectionIds(supabaseId: string, accountId: string | "all"): Promise<string[]> {
  if (accountId !== "all") return [accountId];
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { creatorProfile: { select: { id: true } } },
  });
  const creatorProfileId = user?.creatorProfile?.id;
  if (!creatorProfileId) return [];
  const conns = await prisma.creatorIgConnection.findMany({
    where: { creatorProfileId },
    select: { id: true },
  });
  return conns.map((c) => c.id);
}
