import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SubmitPageClient from "./SubmitPageClient";
import {
  campaignClosedForSubmissionsReason,
  isCampaignClosedForSubmissions,
} from "@/lib/campaign-submission-state";
import { getFirstClipOnboardingStatus } from "@/lib/first-clip-onboarding";

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
    select: { id: true, creatorProfile: { select: { id: true } } },
  });
  if (!user?.creatorProfile) notFound();
  const creatorProfileId = user.creatorProfile.id;

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, creatorProfileId },
    select: {
      id: true,
      status: true,
      campaign: {
        select: {
          name: true,
          status: true,
          deadline: true,
          startsAt: true,
          requiredHashtags: true,
          requirements: true,
          requiresApproval: true,
        },
      },
      connections: {
        where: { status: "VERIFIED" },
        select: { connectionType: true, connectionId: true },
      },
    },
  });
  if (!application) notFound();
  if (
    application.campaign.requiresApproval &&
    !["active", "approved"].includes(application.status)
  ) {
    notFound();
  }

  const verifiedConnectionKeys = new Set(
    application.connections.map(
      (connection) => `${connection.connectionType}:${connection.connectionId}`,
    ),
  );
  const filterBioVerified = <T extends { id: string }>(
    type: "IG" | "TT" | "YT" | "FB",
    rows: T[],
  ) => {
    if (!application.campaign.requiresApproval) return rows;
    return rows.filter((row) => verifiedConnectionKeys.has(`${type}:${row.id}`));
  };

  const [igConns, ttConns, ytConns, fbConns, submissions, firstClipStatus] = await Promise.all([
    prisma.creatorIgConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, igUsername: true },
    }),
    prisma.creatorTikTokConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, username: true },
    }),
    prisma.creatorYtConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, channelName: true },
    }),
    prisma.creatorFbConnection.findMany({
      where: { creatorProfileId, isVerified: true, accessToken: { not: null } },
      select: { id: true, pageName: true, pageHandle: true },
    }),
    prisma.campaignSubmission.findMany({
      where: { applicationId, status: { in: ["PENDING", "APPROVED", "FLAGGED"] } },
      select: { postUrl: true },
    }),
    getFirstClipOnboardingStatus(user.id),
  ]);

  const prefillPlatform =
    sp.platform === "ig" || sp.platform === "tt" || sp.platform === "yt" || sp.platform === "fb"
      ? sp.platform
      : null;

  return (
    <SubmitPageClient
      applicationId={applicationId}
      connections={{
        ig: filterBioVerified("IG", igConns).map((c) => ({ id: c.id, username: c.igUsername })),
        tt: filterBioVerified("TT", ttConns).map((c) => ({ id: c.id, username: c.username })),
        yt: filterBioVerified("YT", ytConns).map((c) => ({ id: c.id, username: c.channelName })),
        fb: filterBioVerified("FB", fbConns).map((c) => ({
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
      isClosedForSubmissions={isCampaignClosedForSubmissions({
        status: application.campaign.status,
        deadline: application.campaign.deadline,
      })}
      closedForSubmissionsReason={campaignClosedForSubmissionsReason({
        status: application.campaign.status,
      })}
      initialSubmittedUrls={submissions.map((s) => s.postUrl)}
      prefillUrl={sp.prefillUrl ?? null}
      prefillPlatform={prefillPlatform}
      showFirstClipHint={!firstClipStatus.firstClipSubmitted}
    />
  );
}
