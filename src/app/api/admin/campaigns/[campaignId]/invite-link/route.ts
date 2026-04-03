import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { nanoid } from "nanoid";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  await requireAuth("admin");
  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await req.json();
  const maxUses = body.maxUses ? Number(body.maxUses) : null;
  const expiresInDays = body.expiresInDays ? Number(body.expiresInDays) : null;

  const token = nanoid(12);
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const link = await prisma.campaignInviteLink.create({
    data: {
      campaignId,
      token,
      maxUses,
      expiresAt,
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.clipprofit.com";

  return NextResponse.json({
    id: link.id,
    token: link.token,
    url: `${appUrl}/join/invite/${token}`,
    maxUses: link.maxUses,
    expiresAt: link.expiresAt,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  await requireAuth("admin");
  const { campaignId } = await params;

  const links = await prisma.campaignInviteLink.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(links);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  await requireAuth("admin");
  await params;

  const body = await req.json();
  const linkId = body.linkId as string;
  if (!linkId) return NextResponse.json({ error: "linkId required" }, { status: 400 });

  await prisma.campaignInviteLink.delete({ where: { id: linkId } });

  return NextResponse.json({ success: true });
}
