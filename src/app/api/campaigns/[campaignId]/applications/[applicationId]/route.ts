import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";
import { z } from "zod";
import { Resend } from "resend";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "active", "completed"]),
  reviewNotes: z.string().max(1000).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, applicationId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
    include: {
      creatorProfile: { include: { socialAccounts: true } },
      posts: { include: { snapshots: { orderBy: { capturedAt: "desc" }, take: 1 } } },
      payouts: true,
    },
  });

  if (!application || application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.role === "creator" && application.creatorProfileId !== user.creatorProfile?.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(application);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; applicationId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, applicationId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { businessProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const isAdmin = user.role === "admin";
  const isOwner = user.businessProfile?.id === campaign.businessProfileId;
  if (!isAdmin && !isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const application = await prisma.campaignApplication.findUnique({
    where: { id: applicationId },
    include: {
      creatorProfile: {
        include: {
          user: { select: { email: true, supabaseId: true } },
          socialAccounts: { where: { isActive: true }, select: { followerCount: true, engagementRate: true } },
        },
      },
    },
  });
  if (!application || application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const igAccount = application.creatorProfile.socialAccounts[0];

  const updated = await prisma.campaignApplication.update({
    where: { id: applicationId },
    data: {
      status: parsed.data.status,
      reviewedAt: new Date(),
      reviewNotes: parsed.data.reviewNotes,
      ...(parsed.data.status === "approved" && {
        followerSnapshot: igAccount?.followerCount ?? application.followerSnapshot,
        engagementSnapshot: igAccount?.engagementRate ?? application.engagementSnapshot,
      }),
    },
  });

  const creatorUserId = application.creatorProfile.user.supabaseId;
  try {
    await broadcast(
      realtimeChannel.userNotifications(creatorUserId),
      parsed.data.status === "approved"
        ? REALTIME_EVENTS.APPLICATION_APPROVED
        : REALTIME_EVENTS.APPLICATION_REJECTED,
      { campaignId, campaignName: campaign.name, applicationId }
    );
  } catch (err) {
    console.error("Realtime broadcast failed:", err);
  }

  const creatorEmail = application.creatorProfile.user.email;
  const resend = getResend();
  if (creatorEmail && resend) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    try {
      if (parsed.data.status === "approved") {
        await resend.emails.send({
          from: "Spotmarket <noreply@spotmarket.io>",
          to: creatorEmail,
          subject: `You've been approved for: ${campaign.name}`,
          html: `
            <h2>Great news! Your application was approved.</h2>
            <p>You have been approved for the campaign: <strong>${campaign.name}</strong></p>
            <p>You can now view the campaign brief, post your content, and message the team.</p>
            <p><a href="${appUrl}/creator/campaigns">View your campaigns →</a></p>
          `,
        });
      } else if (parsed.data.status === "rejected") {
        await resend.emails.send({
          from: "Spotmarket <noreply@spotmarket.io>",
          to: creatorEmail,
          subject: `Application update for: ${campaign.name}`,
          html: `
            <h2>Application update</h2>
            <p>Your application for <strong>${campaign.name}</strong> was not selected at this time.</p>
            ${parsed.data.reviewNotes ? `<p>Note: ${parsed.data.reviewNotes}</p>` : ""}
            <p><a href="${appUrl}/creator/campaigns">Browse other campaigns →</a></p>
          `,
        });
      }
    } catch (err) {
      console.error("Email send failed:", err);
    }
  }

  if (parsed.data.status === "approved" && campaign.status === "active") {
    const creatorProfile = application.creatorProfile as any;
    if (creatorProfile.walletAddress) {
      const estimatedViews = parseFloat(campaign.totalBudget.toString()) / parseFloat(campaign.businessCpv.toString());
      const upfrontAmount = estimatedViews * parseFloat(campaign.creatorCpv.toString()) * 0.2;

      await prisma.payout.create({
        data: {
          applicationId,
          creatorProfileId: application.creatorProfileId,
          amount: upfrontAmount,
          walletAddress: creatorProfile.walletAddress,
          type: "upfront",
          status: "pending",
        },
      });
    }
  }

  return NextResponse.json(updated);
}
