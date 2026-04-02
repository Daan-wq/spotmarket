import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SubmissionsList } from "./_components/submissions-list";

export const metadata = { title: "Review Submissions" };

interface Submission {
  id: string;
  creatorId: string;
  igMediaId: string;
  igPermalink: string | null;
  publishedAt: Date;
  status: string;
  reviewedAt: Date | null;
  autoApprovedAt: Date | null;
  creator: {
    email: string;
    creatorProfile: {
      displayName: string;
    } | null;
  };
}

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
  });
  if (!user) redirect("/sign-in");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      createdByUserId: true,
    },
  });

  if (!campaign) redirect("/dashboard");
  if (campaign.createdByUserId !== user.id && user.role !== "admin") {
    redirect("/dashboard");
  }

  const submissions = await prisma.campaignSubmission.findMany({
    where: { campaignId },
    select: {
      id: true,
      creatorId: true,
      igMediaId: true,
      igPermalink: true,
      publishedAt: true,
      status: true,
      reviewedAt: true,
      autoApprovedAt: true,
      creator: {
        select: {
          email: true,
          creatorProfile: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  const typedSubmissions: Submission[] = submissions.map((s) => ({
    ...s,
    status: s.status as string,
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {campaign.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Review creator submissions</p>
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Flagging a submission forfeits the creator&apos;s payout for that post. The post remains live on Instagram.
        </p>
      </div>

      <SubmissionsList submissions={typedSubmissions} />
    </div>
  );
}
