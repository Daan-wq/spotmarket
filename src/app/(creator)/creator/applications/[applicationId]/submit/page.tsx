import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SubmitPageClient from "./SubmitPageClient";

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicationId: string }>;
  searchParams: Promise<{ prefillUrl?: string; platform?: string }>;
}) {
  const { applicationId } = await params;
  const sp = await searchParams;
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { creatorProfile: { select: { id: true } } },
  });
  if (!user?.creatorProfile) notFound();
  const creatorProfileId = user.creatorProfile.id;

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, creatorProfileId },
    select: {
      campaign: {
        select: {
          name: true,
          startsAt: true,
          requiredHashtags: true,
          requirements: true,
        },
      },
    },
  });
  if (!application) notFound();

  const [igConns, ttConns, fbConns, submissions] = await Promise.all([
    prisma.creatorIgConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, igUsername: true },
    }),
    prisma.creatorTikTokConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, username: true },
    }),
    prisma.creatorFbConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, pageName: true, pageHandle: true },
    }),
    prisma.campaignSubmission.findMany({
      where: { applicationId, status: { in: ["PENDING", "APPROVED", "FLAGGED"] } },
      select: { postUrl: true },
    }),
  ]);

  const prefillPlatform =
    sp.platform === "ig" || sp.platform === "tt" || sp.platform === "fb"
      ? sp.platform
      : null;

  return (
    <SubmitPageClient
      applicationId={applicationId}
      connections={{
        ig: igConns.map((c) => ({ id: c.id, username: c.igUsername })),
        tt: ttConns.map((c) => ({ id: c.id, username: c.username })),
        fb: fbConns.map((c) => ({
          id: c.id,
          username: c.pageHandle ?? c.pageName ?? "Facebook Page",
        })),
      }}
      campaign={{
        name: application.campaign.name,
        startsAt: application.campaign.startsAt?.toISOString().slice(0, 10) ?? null,
        requiredHashtags: application.campaign.requiredHashtags,
        requirements: application.campaign.requirements ?? null,
      }}
      initialSubmittedUrls={submissions.map((s) => s.postUrl)}
      prefillUrl={sp.prefillUrl ?? null}
      prefillPlatform={prefillPlatform}
    />
  );
}
