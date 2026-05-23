import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/i18n/routing";
import { formatNumber, formatShortDate } from "@/lib/i18n-format";
import { parseRange } from "@/lib/stats/range";
import {
  type CreatorStatsScope,
  getAccountGrowthForScope,
  getConnectionSubmissionIdsForScope,
  getCreatorConnectionStatsForScope,
  getCreatorDemographicsForScope,
  getCreatorPlatformStatsForScope,
  getCreatorSubmissionIdsByPlatformForScope,
  getCreatorTopStatsForScope,
} from "@/lib/stats/creator";
import {
  type PlatformSlug,
  PLATFORM_ALL,
  isPlatformSlug,
} from "@/lib/stats/types";
import {
  getDailyViewsSeries,
  getYtBreakdowns,
  getStoriesActivity,
  getStoryReelCorrelations,
  getAggregateRetentionCurve,
  getFbReactionsOverTime,
} from "@/lib/stats/trends";
import { getContentRows, getMergedContentRows, type OauthConnectionInput } from "@/lib/stats/content";
import { listCreatorApplications } from "@/lib/creator/applications";
import {
  getTimelineEventsForScope,
  getPostLifts7d,
  type TimelineFilter,
} from "@/lib/stats/timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { CreatorPageHeader } from "@/app/(creator)/creator/_components/creator-journey";
import { ConnectPlatformDialog } from "@/app/(creator)/creator/connections/_components/connect-platform-dialog";
import { InstagramConnectButton } from "@/app/(creator)/creator/connections/_components/instagram-connect-button";
import { FacebookConnectButton } from "@/app/(creator)/creator/connections/_components/facebook-connect-button";
import { YoutubeConnectButton } from "@/app/(creator)/creator/connections/_components/youtube-connect-button";
import { TikTokConnectButton } from "@/app/(creator)/creator/connections/_components/tiktok-connect-button";
import { RemovePageButton } from "@/app/(creator)/creator/connections/_components/remove-page-button";
import { RemoveFbPageButton } from "@/app/(creator)/creator/connections/_components/remove-fb-page-button";
import { RemoveYtPageButton } from "@/app/(creator)/creator/connections/_components/remove-yt-page-button";
import { RemoveTikTokPageButton } from "@/app/(creator)/creator/connections/_components/remove-tiktok-page-button";
import {
  AccountsWorkspace,
  type AccountsWorkspaceAccount,
  type SubTab,
} from "@/app/(creator)/creator/connections/_components/AccountsWorkspace";
import type { Scope } from "@/app/(creator)/creator/connections/_components/ScopeTabs";
import { AccountMetaRow } from "@/app/(creator)/creator/connections/_components/AccountMetaRow";
import { OverviewSubTab } from "@/app/(creator)/creator/connections/_components/sub-tabs/Overview";
import { ContentSubTab } from "@/app/(creator)/creator/connections/_components/sub-tabs/Content";
import { TimelineSubTab } from "@/app/(creator)/creator/connections/_components/sub-tabs/Timeline";
import { AudienceSubTab } from "@/app/(creator)/creator/connections/_components/sub-tabs/Audience";
import { InsightsSubTab } from "@/app/(creator)/creator/connections/_components/sub-tabs/Insights";
import { getSocialAccountSummariesForProfile } from "@/lib/social-account-summary";

export interface AccountsAnalyticsSearchParams {
  range?: string;
  platform?: string;
  account?: string;
  tab?: string;
}

interface AccountsAnalyticsWorkspaceProps {
  mode: "creator" | "admin";
  basePath: string;
  profileScope: CreatorStatsScope;
  searchParams: AccountsAnalyticsSearchParams;
  connectWarningPreferences?: {
    facebookPage: boolean;
    instagramProfessional: boolean;
  };
  showHeader?: boolean;
}

interface AccountInventory {
  id: string;
  username: string;
  label: string;
  audienceCount: number | null;
  countLabel: "followers" | "subscribers";
  accountRefreshStatus: string;
  lastSuccessfulRefreshAt: string | null;
  lastRefreshErrorMessage: string | null;
  removeButton?: ReactNode;
}

type AccountsByPlatform = Record<PlatformSlug, AccountInventory[]>;

export async function AccountsAnalyticsWorkspace({
  mode,
  basePath,
  profileScope,
  searchParams,
  connectWarningPreferences,
  showHeader = true,
}: AccountsAnalyticsWorkspaceProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("creator.connections");
  const range = parseRange(searchParams);
  const inventory = await loadInventory(profileScope.creatorProfileId, mode);
  const { scope, accountId } = resolveScope(searchParams, inventory, range.key, basePath);
  const subTab = parseSubTab(searchParams.tab, scope, accountId);
  const readOnly = mode === "admin";
  const warningActions = {
    continueLabel: t("connectWarning.continue"),
    doNotWarnLabel: t("connectWarning.doNotWarn"),
    cancelLabel: t("connectWarning.cancel"),
    saveErrorLabel: t("connectWarning.saveError"),
  };

  const connectButtons = mode === "creator" ? (
    <ConnectPlatformDialog>
      <InstagramConnectButton
        dismissed={connectWarningPreferences?.instagramProfessional ?? false}
        warningCopy={{
          title: t("connectWarning.instagram.title"),
          description: t("connectWarning.instagram.description"),
          ...warningActions,
        }}
      />
      <TikTokConnectButton />
      <YoutubeConnectButton />
      <FacebookConnectButton
        dismissed={connectWarningPreferences?.facebookPage ?? false}
        warningCopy={{
          title: t("connectWarning.facebook.title"),
          description: t("connectWarning.facebook.description"),
          ...warningActions,
        }}
      />
    </ConnectPlatformDialog>
  ) : undefined;

  const totalConnections = PLATFORM_ALL.reduce(
    (sum, platform) => sum + inventory[platform].length,
    0,
  );

  if (totalConnections === 0) {
    return (
      <div className="w-full space-y-6">
        {showHeader ? (
          <CreatorPageHeader
            eyebrow={t("page.emptyEyebrow")}
            title={t("page.emptyTitle")}
            description={t("page.emptyDescription")}
            action={connectButtons}
          />
        ) : null}
        <EmptyState
          title={mode === "admin" ? t("page.noAdminAccountsTitle") : t("page.noPagesTitle")}
          description={
            mode === "admin"
              ? t("page.noAdminAccountsDescription")
              : t("page.noPagesDescription")
          }
          className="min-h-[260px]"
        />
      </div>
    );
  }

  let metaNode: ReactNode = null;
  if (scope !== "all" && accountId !== "all") {
    const acc = inventory[scope].find((a) => a.id === accountId);
    if (acc) {
      metaNode = (
        <AccountMetaRow
          label={acc.label}
          meta={
            acc.audienceCount != null
              ? acc.countLabel === "subscribers"
                ? t("page.metaSubscribers", { count: formatNumber(acc.audienceCount, locale) })
                : t("page.metaFollowers", { count: formatNumber(acc.audienceCount, locale) })
              : t("page.noFollowerSnapshot")
          }
          lastSyncedText={t("page.lastSynced", {
            date: acc.lastSuccessfulRefreshAt
              ? formatShortDate(acc.lastSuccessfulRefreshAt, locale)
              : t("page.neverSynced"),
          })}
          refreshStatus={acc.accountRefreshStatus}
          lastSuccessfulRefreshAt={acc.lastSuccessfulRefreshAt}
          lastRefreshErrorMessage={acc.lastRefreshErrorMessage}
          removeButton={acc.removeButton}
        />
      );
    }
  }

  const body = await renderSubTab({
    subTab,
    scope,
    accountId,
    range,
    inventory,
    profileScope,
    basePath,
    readOnly,
  });

  const accountsByPlatform: Record<PlatformSlug, AccountsWorkspaceAccount[]> = {
    ig: inventory.ig.map((a) => ({ id: a.id, username: a.username })),
    tt: inventory.tt.map((a) => ({ id: a.id, username: a.username })),
    fb: inventory.fb.map((a) => ({ id: a.id, username: a.username })),
    yt: inventory.yt.map((a) => ({ id: a.id, username: a.username })),
  };

  return (
    <div className="w-full space-y-6">
      {showHeader ? (
        <CreatorPageHeader
          eyebrow={t("page.headerEyebrow")}
          title={t("page.headerTitle")}
          description={t("page.headerDescription")}
        />
      ) : null}

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

async function loadInventory(
  creatorProfileId: string,
  mode: "creator" | "admin",
): Promise<AccountsByPlatform> {
  const stripAt = (s: string) => s.replace(/^@/, "");
  const canMutate = mode === "creator";
  const accounts = await getSocialAccountSummariesForProfile(creatorProfileId);

  return {
    ig: accounts.ig.map((c) => {
      const handle = stripAt(c.handle ?? c.label);
      return {
        id: c.id,
        username: handle,
        label: c.label,
        audienceCount: c.audienceCount,
        countLabel: c.countLabel,
        accountRefreshStatus: c.accountRefreshStatus,
        lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt?.toISOString() ?? null,
        lastRefreshErrorMessage: c.lastRefreshErrorMessage,
        removeButton: canMutate ? <RemovePageButton connectionId={c.id} label={`@${handle}`} /> : undefined,
      };
    }),
    tt: accounts.tt.map((c) => {
      const handle = stripAt(c.handle ?? c.label);
      return {
        id: c.id,
        username: handle,
        label: c.label,
        audienceCount: c.audienceCount,
        countLabel: c.countLabel,
        accountRefreshStatus: c.accountRefreshStatus,
        lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt?.toISOString() ?? null,
        lastRefreshErrorMessage: c.lastRefreshErrorMessage,
        removeButton: canMutate ? <RemoveTikTokPageButton connectionId={c.id} label={`@${handle}`} /> : undefined,
      };
    }),
    fb: accounts.fb.map((c) => ({
      id: c.id,
      username: stripAt(c.label).replace(/\s+/g, ""),
      label: c.label,
      audienceCount: c.audienceCount,
      countLabel: c.countLabel,
      accountRefreshStatus: c.accountRefreshStatus,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt?.toISOString() ?? null,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
      removeButton: canMutate ? <RemoveFbPageButton connectionId={c.id} label={c.label} /> : undefined,
    })),
    yt: accounts.yt.map((c) => ({
      id: c.id,
      username: stripAt(c.label).replace(/\s+/g, ""),
      label: c.label,
      audienceCount: c.audienceCount,
      countLabel: c.countLabel,
      accountRefreshStatus: c.accountRefreshStatus,
      lastSuccessfulRefreshAt: c.lastSuccessfulRefreshAt?.toISOString() ?? null,
      lastRefreshErrorMessage: c.lastRefreshErrorMessage,
      removeButton: canMutate ? <RemoveYtPageButton connectionId={c.id} label={c.label} /> : undefined,
    })),
  };
}

function resolveScope(
  searchParams: AccountsAnalyticsSearchParams,
  inventory: AccountsByPlatform,
  rangeKey: string,
  basePath: string,
): { scope: Scope; accountId: string | "all" } {
  const rawPlatform = searchParams.platform;
  const rawAccount = searchParams.account;

  if (rawPlatform && rawPlatform !== "all" && isPlatformSlug(rawPlatform)) {
    if (rawAccount && inventory[rawPlatform].some((a) => a.id === rawAccount)) {
      return { scope: rawPlatform, accountId: rawAccount };
    }
    if (rawAccount) {
      const params = new URLSearchParams();
      params.set("platform", rawPlatform);
      if (rangeKey !== "30d") params.set("range", rangeKey);
      if (searchParams.tab && searchParams.tab !== "overview") params.set("tab", searchParams.tab);
      redirect(`${basePath}?${params.toString()}`);
    }
    return { scope: rawPlatform, accountId: "all" };
  }

  if (rawPlatform === "all" || !rawPlatform) {
    return { scope: "all", accountId: "all" };
  }

  redirect(basePath);
}

function parseSubTab(
  raw: string | undefined,
  scope: Scope,
  accountId: string | "all",
): SubTab {
  const isIndividualAccount = scope !== "all" && accountId !== "all";
  const allowed: SubTab[] = isIndividualAccount
    ? ["overview", "content", "timeline", "audience", "insights"]
    : scope === "all"
      ? ["overview", "content", "timeline"]
      : ["overview", "content", "timeline", "insights"];
  const candidate = raw as SubTab | undefined;
  return candidate && allowed.includes(candidate) ? candidate : "overview";
}

interface RenderArgs {
  subTab: SubTab;
  scope: Scope;
  accountId: string | "all";
  range: ReturnType<typeof parseRange>;
  inventory: AccountsByPlatform;
  profileScope: CreatorStatsScope;
  basePath: string;
  readOnly: boolean;
}

async function renderSubTab(args: RenderArgs): Promise<ReactNode> {
  if (args.subTab === "overview") return renderOverview(args);
  if (args.subTab === "content") return renderContent(args);
  if (args.subTab === "timeline") return renderTimeline(args);
  if (args.subTab === "audience") return renderAudience(args);
  if (args.subTab === "insights") return renderInsights(args);
  return null;
}

async function resolveSubmissionIds(args: RenderArgs): Promise<{
  ids: string[];
  byPlatform: Record<PlatformSlug, string[]>;
}> {
  const byPlatform = await getCreatorSubmissionIdsByPlatformForScope(args.profileScope, args.range);
  if (args.scope === "all") {
    return { ids: PLATFORM_ALL.flatMap((p) => byPlatform[p]), byPlatform };
  }
  if (args.accountId === "all") {
    return { ids: byPlatform[args.scope], byPlatform };
  }
  const ids = await getConnectionSubmissionIdsForScope(args.profileScope, args.scope, args.accountId);
  return { ids, byPlatform };
}

async function renderOverview(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, inventory, profileScope, basePath } = args;

  if (scope === "all") {
    const [stats, subs] = await Promise.all([
      getCreatorTopStatsForScope(profileScope, range),
      resolveSubmissionIds(args),
    ]);
    const daily = await getDailyViewsSeries(subs.ids, range);
    const connections = PLATFORM_ALL.flatMap((p) =>
      inventory[p].map((a) => ({
        id: a.id,
        label: a.label,
        followerCount: a.audienceCount,
        lastSyncedAt: a.lastSuccessfulRefreshAt,
        platform: p,
        accountRefreshStatus: a.accountRefreshStatus,
        lastRefreshErrorMessage: a.lastRefreshErrorMessage,
        countLabel: a.countLabel,
      })),
    );
    return (
      <OverviewSubTab
        kind="all"
        stats={stats}
        daily={daily}
        range={range}
        connections={connections}
        basePath={basePath}
      />
    );
  }

  if (accountId === "all") {
    const [stats, subs] = await Promise.all([
      getCreatorPlatformStatsForScope(profileScope, scope, range),
      resolveSubmissionIds(args),
    ]);
    const daily = await getDailyViewsSeries(subs.ids, range);
    return (
      <OverviewSubTab
        kind="platform"
        platform={scope}
        stats={stats}
        daily={daily}
        range={range}
        basePath={basePath}
      />
    );
  }

  const [stats, subs] = await Promise.all([
    getCreatorConnectionStatsForScope(profileScope, scope, accountId, range),
    resolveSubmissionIds(args),
  ]);
  if (!stats) return null;
  const daily = await getDailyViewsSeries(subs.ids, range);
  return <OverviewSubTab kind="account" platform={scope} stats={stats} daily={daily} range={range} />;
}

async function renderContent(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, inventory, profileScope, readOnly } = args;
  const subs = await resolveSubmissionIds(args);
  const applications = readOnly
    ? []
    : (await listCreatorApplications(profileScope.creatorProfileId)).map((a) => ({
        applicationId: a.applicationId,
        campaignName: a.campaignName,
        status: a.status,
        closedForSubmissions: a.closedForSubmissions,
        closedForSubmissionsReason: a.closedForSubmissionsReason,
      }));

  function connsFor(p: "ig" | "tt" | "fb"): OauthConnectionInput[] {
    const list = inventory[p];
    if (accountId !== "all") {
      return list.some((a) => a.id === accountId)
        ? [{ platform: p, connectionId: accountId }]
        : [];
    }
    return list.map((a) => ({ platform: p, connectionId: a.id }));
  }

  if (scope === "all") {
    const perPlatform = await Promise.all(
      PLATFORM_ALL.map((p) => {
        if (p === "yt") {
          return getContentRows({ submissionIds: subs.byPlatform[p], range, platform: p });
        }
        return getMergedContentRows({
          submissionIds: subs.byPlatform[p],
          range,
          platform: p,
          connections: connsFor(p),
        });
      }),
    );
    const rows = perPlatform.flat();
    rows.sort((a, b) => {
      const at = (a.postedAt ?? a.capturedAt).getTime();
      const bt = (b.postedAt ?? b.capturedAt).getTime();
      return bt - at;
    });
    return (
      <ContentSubTab
        platform="ig"
        rows={rows}
        showPlatform={true}
        applications={applications}
        readOnly={readOnly}
      />
    );
  }

  if (scope === "yt") {
    const rows = await getContentRows({ submissionIds: subs.ids, range, platform: "yt" });
    return (
      <ContentSubTab
        platform="yt"
        rows={rows}
        showPlatform={false}
        applications={applications}
        readOnly={readOnly}
      />
    );
  }

  const rows = await getMergedContentRows({
    submissionIds: subs.ids,
    range,
    platform: scope,
    connections: connsFor(scope),
  });
  return (
    <ContentSubTab
      platform={scope}
      rows={rows}
      showPlatform={false}
      applications={applications}
      readOnly={readOnly}
    />
  );
}

async function renderTimeline(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, profileScope } = args;
  const subs = await resolveSubmissionIds(args);

  const timelineScope: TimelineFilter =
    scope === "all"
      ? { kind: "all" }
      : accountId === "all"
        ? { kind: "platform", platform: scope }
        : { kind: "account", platform: scope, connectionId: accountId };

  const [daily, events] = await Promise.all([
    getDailyViewsSeries(subs.ids, range),
    getTimelineEventsForScope(profileScope, timelineScope, range),
  ]);

  const [lifts, correlations] = await Promise.all([
    getPostLifts7d(events),
    getStoryReelCorrelations(subs.ids),
  ]);

  return <TimelineSubTab daily={daily} events={events} lifts={lifts} correlations={correlations} />;
}

async function renderAudience(args: RenderArgs): Promise<ReactNode> {
  const { scope, accountId, range, profileScope } = args;

  if (scope === "all") {
    const follower = await getCreatorDemographicsForScope(profileScope, null, "FOLLOWER");
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
    getAccountGrowthForScope(profileScope, scope, range, connectionId),
    getCreatorDemographicsForScope(profileScope, scope, "FOLLOWER", connectionId),
    scope === "ig"
      ? getCreatorDemographicsForScope(profileScope, "ig", "ENGAGED", connectionId)
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
  const { scope, accountId, range, profileScope } = args;
  if (scope === "all") return null;

  const subs = await resolveSubmissionIds(args);

  if (scope === "yt") {
    const ids = await resolveYtConnectionIds(profileScope.creatorProfileId, accountId);
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
    const igConnectionIds = await resolveIgConnectionIds(profileScope.creatorProfileId, accountId);
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

  const rows = await getContentRows({ submissionIds: subs.ids, range, platform: "tt" });
  return <InsightsSubTab platform="tt" payload={{ kind: "tt", data: { contentRows: rows } }} />;
}

async function resolveYtConnectionIds(
  creatorProfileId: string,
  accountId: string | "all",
): Promise<string[]> {
  if (accountId !== "all") return [accountId];
  const conns = await prisma.creatorYtConnection.findMany({
    where: { creatorProfileId },
    select: { id: true },
  });
  return conns.map((c) => c.id);
}

async function resolveIgConnectionIds(
  creatorProfileId: string,
  accountId: string | "all",
): Promise<string[]> {
  if (accountId !== "all") return [accountId];
  const conns = await prisma.creatorIgConnection.findMany({
    where: { creatorProfileId },
    select: { id: true },
  });
  return conns.map((c) => c.id);
}
