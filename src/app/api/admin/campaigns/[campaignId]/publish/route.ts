import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> },
) {
  const isAdmin = await checkRole("admin");
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { campaignId } = await params;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true },
  });

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true, discordAnnouncement: "disabled" });
}
