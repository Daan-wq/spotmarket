import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { ProfileStatsRow } from "@/components/creator/ProfileStatsRow";
import { CampaignHistoryTable } from "./campaign-history-table";
import { PageSettingsForm } from "./page-settings-form";
import { SyncStatsButton } from "./sync-stats-button";
import { AccountInsightsChart } from "@/components/analytics/account-insights-chart";
import type { IgDemographics, IgMediaItem } from "@/types/instagram";

export default async function PageDetailPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });
  if (!user?.creatorProfile) redirect("/onboarding");

  const page = await prisma.socialAccount.findUnique({
    where: { id: pageId, creatorProfileId: user.creatorProfile.id },
    include: {
      campaignApplicationPages: {
        include: {
          application: {
            include: {
              campaign: { select: { id: true, name: true, status: true } },
            },
          },
        },
        orderBy: { application: { appliedAt: "desc" } },
      },
      insightSnapshots: {
        orderBy: { date: "desc" },
        take: 30,
        select: {
          date: true,
          reach: true,
          views: true,
          follows: true,
          unfollows: true,
          saves: true,
          shares: true,
          profileLinksTaps: true,
          tapCall: true,
          tapEmail: true,
          tapDirection: true,
          tapBookNow: true,
          tapText: true,
          followerCount: true,
        },
      },
    },
  });

  if (!page) notFound();

  const demographics = page.igDemographics as IgDemographics | null;
  const mediaCache = (page.igMediaCache as IgMediaItem[] | null) ?? [];

  // Compute engagement rate as percentage (default to 0 if not available)
  const engagementRate = page.engagementRate ? Number(page.engagementRate) : 0;

  // Compute top geo from demographics
  const topGeo = demographics?.countries
    ? Object.entries(demographics.countries)
        .sort(([, a], [, b]) => b - a)
        .at(0)?.[0] ?? null
    : null;

  // Aggregate 30-day account insight totals
  const snapshots30d = page.insightSnapshots;
  const sum = (key: keyof typeof snapshots30d[0]) =>
    snapshots30d.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  const views30d = sum("views");
  const reach30d = sum("reach");
  const follows30d = snapshots30d.reduce((s, r) => s + (r.follows ?? 0) - (r.unfollows ?? 0), 0);
  const saves30d = sum("saves");
  const shares30d = sum("shares");
  const profileLinksTaps30d = sum("profileLinksTaps");

  // Chart data — ascending order (oldest first)
  const chartData = [...snapshots30d].reverse().map((s) => ({
    date: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    views: s.views ?? 0,
    follows: Math.max(0, (s.follows ?? 0) - (s.unfollows ?? 0)),
  }));

  return (
    <div className="p-6 max-w-4xl space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/pages" className="hover:text-gray-700">My Pages</Link>
        <span>/</span>
        <span className="text-gray-900">@{page.platformUsername}</span>
      </div>

      {/* A. Page Header */}
      <div className="flex items-start gap-4">
        {page.igProfilePicUrl ? (
          <Image src={page.igProfilePicUrl} alt="" width={64} height={64} className="rounded-full flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xl flex-shrink-0">
            {page.platformUsername?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">@{page.platformUsername}</h1>
          {page.displayLabel && <p className="text-sm text-gray-500">{page.displayLabel}</p>}
          {page.igBio && <p className="text-sm text-gray-700 mt-1 max-w-md">{page.igBio}</p>}
        </div>
      </div>

      {/* B. Stats */}
      <div className="flex items-start justify-between gap-4">
        <ProfileStatsRow
          followerCount={page.followerCount}
          engagementRate={engagementRate}
          topGeo={topGeo}
          reach30d={page.ig30DayReach}
          views30d={page.ig30DayViews}
        />
        <SyncStatsButton creatorProfileId={user.creatorProfile.id} pageId={page.id} />
      </div>

      {/* C. Account Insights */}
      {snapshots30d.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Account Insights (Last 30 Days)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { label: "Views", value: views30d.toLocaleString() },
              { label: "Reach", value: reach30d.toLocaleString() },
              { label: "Net Follows", value: follows30d.toLocaleString() },
              { label: "Saves", value: saves30d.toLocaleString() },
              { label: "Shares", value: shares30d.toLocaleString() },
              { label: "Profile Link Taps", value: profileLinksTaps30d.toLocaleString() },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <AccountInsightsChart data={chartData} />
          </div>
        </section>
      )}

      {/* D. Demographics */}
      {demographics && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Audience Demographics</h2>
          <AudienceDemographics
            demographics={demographics}
            followerCount={page.followerCount}
            updatedAt={page.igDemographicsUpdatedAt}
          />
        </section>
      )}

      {/* E. Campaign History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Campaign History</h2>
        <CampaignHistoryTable rows={page.campaignApplicationPages} />
      </section>

      {/* F. Recent Posts */}
      {mediaCache.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Posts</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {mediaCache.slice(0, 12).map((item) => (
              <Link key={item.id} href={`/pages/${pageId}/posts/${item.id}`}
                className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition block">
                {(item.thumbnail_url ?? item.media_url) ? (
                  <Image src={(item.thumbnail_url ?? item.media_url)!} alt="" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No preview</div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* F. Settings */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Page Settings</h2>
        <PageSettingsForm page={page} />
        <div className="mt-4">
          <a href="/api/auth/instagram" className="text-sm text-blue-600 hover:underline">
            Reconnect Instagram →
          </a>
        </div>
      </section>
    </div>
  );
}
