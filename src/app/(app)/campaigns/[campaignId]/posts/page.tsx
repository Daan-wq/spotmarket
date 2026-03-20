import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ViewsChart } from "@/components/analytics/views-chart";
import { SubmitPostForm } from "./submit-post-form";

export default async function CampaignPostsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: { socialAccounts: { where: { isActive: true }, select: { id: true, platform: true, platformUsername: true } } },
      },
    },
  });
  if (!user?.creatorProfile) redirect("/onboarding");

  const application = await prisma.campaignApplication.findFirst({
    where: {
      campaignId,
      creatorProfileId: user.creatorProfile.id,
      status: { in: ["approved", "active", "completed"] },
    },
    include: {
      campaign: { select: { name: true, creatorCpv: true } },
      posts: {
        include: {
          snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!application) notFound();

  const allSnapshots = await prisma.viewSnapshot.findMany({
    where: { post: { applicationId: application.id } },
    orderBy: { capturedAt: "asc" },
    select: { capturedAt: true, viewsCount: true, reach: true },
  });

  const byDay: Record<string, { views: number; reach: number }> = {};
  for (const s of allSnapshots) {
    const day = s.capturedAt.toISOString().substring(0, 10);
    if (!byDay[day]) byDay[day] = { views: 0, reach: 0 };
    byDay[day].views += s.viewsCount;
    byDay[day].reach += s.reach ?? 0;
  }
  const chartData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  const totalViews = chartData.reduce((s, d) => s + d.views, 0);
  const creatorCpv = parseFloat(application.campaign.creatorCpv.toString());
  const estimatedEarnings = totalViews * creatorCpv;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/campaigns" className="text-sm text-gray-500 hover:text-gray-700">
          ← My Campaigns
        </Link>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">{application.campaign.name}</h1>
      <p className="text-sm text-gray-500 mb-6">
        CPV: ${creatorCpv.toFixed(4)} · Status: {application.status}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Views</p>
          <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Estimated Earnings</p>
          <p className="text-2xl font-bold text-indigo-600">${estimatedEarnings.toFixed(2)}</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">View Trend</h2>
          <ViewsChart data={chartData} />
        </div>
      )}

      {["approved", "active"].includes(application.status) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Submit a Post</h2>
          <SubmitPostForm
            campaignId={campaignId}
            applicationId={application.id}
            socialAccounts={user.creatorProfile.socialAccounts}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Submitted Posts</h2>
        </div>
        {application.posts.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No posts submitted yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {application.posts.map((post) => {
              const latestViews = post.snapshots[0]?.viewsCount ?? 0;
              return (
                <div key={post.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <a
                      href={post.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-indigo-600 hover:underline truncate block max-w-xs"
                    >
                      {post.postUrl}
                    </a>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(post.submittedAt).toLocaleDateString()} · {post.platform}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{latestViews.toLocaleString()} views</p>
                    <p className="text-xs text-gray-400">${(latestViews * creatorCpv).toFixed(2)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
