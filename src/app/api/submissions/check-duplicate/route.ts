import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const campaignId = req.nextUrl.searchParams.get("campaignId");
    const postUrl = req.nextUrl.searchParams.get("postUrl");

    if (!campaignId || !postUrl) {
      return NextResponse.json({ isDuplicate: false });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ isDuplicate: false });

    const existing = await prisma.campaignSubmission.findFirst({
      where: {
        campaignId,
        creatorId: user.id,
        postUrl,
      },
    });

    return NextResponse.json({ isDuplicate: !!existing });
  } catch {
    return NextResponse.json({ isDuplicate: false });
  }
}
