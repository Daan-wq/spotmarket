import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AudienceDemographics } from "@/components/creator/AudienceDemographics";
import { ProfileStatsRow } from "@/components/creator/ProfileStatsRow";
import { CampaignHistoryTable } from "./campaign-history-table";
import { PageSettingsForm } from "./page-settings-form";
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
      <ProfileStatsRow
        followerCount={page.followerCount}
        engagementRate={engagementRate}
        topGeo={topGeo}
        reach30d={page.ig30DayReach}
        views30d={page.ig30DayViews}
      />

      {/* C. Demographics */}
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

      {/* D. Campaign History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Campaign History</h2>
        <CampaignHistoryTable rows={page.campaignApplicationPages} />
      </section>

      {/* E. Recent Posts */}
      {mediaCache.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Posts</h2>
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {mediaCache.slice(0, 12).map((item) => (
              <a key={item.id} href={item.permalink} target="_blank" rel="noopener noreferrer"
                className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition">
                {item.thumbnail_url && (
                  <Image src={item.thumbnail_url} alt="" fill className="object-cover" />
                )}
              </a>
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
