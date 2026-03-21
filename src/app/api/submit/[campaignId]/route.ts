import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  igUsername: z.string().min(1),
  postUrl: z.string().url(),
});

function extractInstagramMediaId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;
  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId, status: "active" } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const member = await prisma.networkMember.findFirst({
    where: { igUsername: parsed.data.igUsername, isActive: true },
  });
  if (!member) return NextResponse.json({ error: "Instagram account not found in any network" }, { status: 404 });

  const application = await prisma.campaignApplication.findFirst({
    where: { campaignId, networkId: member.networkId, status: { in: ["approved", "active"] } },
  });
  if (!application) return NextResponse.json({ error: "Your network has not claimed this campaign" }, { status: 400 });

  const platformPostId = extractInstagramMediaId(parsed.data.postUrl);
  if (!platformPostId) return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });

  const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const post = await prisma.campaignPost.create({
    data: {
      applicationId: application.id,
      networkMemberId: member.id,
      postUrl: parsed.data.postUrl,
      platformPostId,
      platform: "instagram",
      status: "submitted",
      isApproved: false,
      autoApproveAt,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
