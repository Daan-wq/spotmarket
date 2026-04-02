import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PostReviewCard } from "@/components/brand/post-review-card";

export default async function BrandReviewPage({
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
    include: { advertiserProfile: { select: { id: true } } },
  });

  if (!user || user.role !== "advertiser" || !user.advertiserProfile) {
    redirect("/");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, advertiserId: user.advertiserProfile.id },
    select: { id: true, name: true },
  });

  if (!campaign) redirect("/advertiser/campaigns");

  const posts = await prisma.campaignPost.findMany({
    where: { application: { campaignId } },
    include: {
      application: {
        include: {
          creatorProfile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      socialAccount: { select: { platformUsername: true, followerCount: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { author: { select: { email: true, role: true } } },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const pending = posts.filter((p) => p.status === "submitted");
  const reviewed = posts.filter((p) => p.status !== "submitted");

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
        Review Submissions
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {campaign.name} — {pending.length} pending review
      </p>

      {pending.length === 0 && reviewed.length === 0 && (
        <div className="rounded-xl px-6 py-16 text-center" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No submissions yet.</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Pending Review ({pending.length})
          </h2>
          <div className="space-y-4">
            {pending.map((post) => (
              <PostReviewCard key={post.id} post={post} campaignId={campaignId} />
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            Reviewed ({reviewed.length})
          </h2>
          <div className="space-y-4">
            {reviewed.map((post) => (
              <PostReviewCard key={post.id} post={post} campaignId={campaignId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
