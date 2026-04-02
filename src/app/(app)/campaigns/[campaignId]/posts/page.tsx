import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ViewsChart } from "@/components/analytics/views-chart";
import { SubmitPostForm } from "./submit-post-form";
import { PostFeedbackPanel } from "@/components/posts/post-feedback-panel";

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
        include: { socialAccounts: { where: { isActive: true }, select: { id: true, platform: true, platformUsername: true, igMediaCache: true } } },
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
        ${(creatorCpv * 1_000_000).toFixed(0)}/1M views · Status: {application.status}
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
              const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                submitted:       { bg: "#fffbeb", text: "#92400e", label: "Awaiting Brand Review" },
                brand_approved:  { bg: "#dbeafe", text: "#1d4ed8", label: "Brand Approved · Admin Review" },
                brand_rejected:  { bg: "#fef2f2", text: "#b91c1c", label: "Brand Declined" },
                approved:        { bg: "#f0fdf4", text: "#15803d", label: "Approved · Earning" },
                rejected:        { bg: "#fef2f2", text: "#b91c1c", label: "Rejected" },
              };
              const s = statusMap[post.status] ?? statusMap.submitted;

              return (
                <div key={post.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
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

                  {/* Status badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </span>
                  </div>

                  {/* Status timeline */}
                  <div className="mt-2 flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className={post.status !== "submitted" ? "font-medium text-green-600" : "font-medium text-amber-600"}>
                      Submitted
                    </span>
                    <span>→</span>
                    <span className={
                      ["brand_approved", "approved"].includes(post.status) ? "font-medium text-green-600" :
                      post.status === "brand_rejected" ? "font-medium text-red-600" : ""
                    }>
                      Brand Review
                    </span>
                    <span>→</span>
                    <span className={
                      post.status === "approved" ? "font-medium text-green-600" :
                      post.status === "rejected" ? "font-medium text-red-600" : ""
                    }>
                      {post.status === "approved" ? "Approved" : post.status === "rejected" ? "Rejected" : "Final Review"}
                    </span>
                  </div>

                  {/* Actions for declined posts */}
                  {post.status === "brand_rejected" && (
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/campaigns/${campaignId}/messages`}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium"
                        style={{ background: "var(--muted)", color: "var(--text-primary)" }}
                      >
                        Contact Brand
                      </Link>
                    </div>
                  )}

                  <PostFeedbackPanel
                    postId={post.id}
                    campaignId={campaignId}
                    status={post.status}
                    brandDeclineReason={post.brandDeclineReason ?? null}
                    adminDeclineReason={post.adminDeclineReason ?? null}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
