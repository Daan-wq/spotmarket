import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth("creator");

    const user = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: { include: { igConnection: { include: { bioVerifications: { orderBy: { createdAt: "desc" }, take: 1 } } } } } },
    });

    if (!user?.creatorProfile?.igConnection) {
      return NextResponse.json({ status: "pending", verified: false });
    }

    const conn = user.creatorProfile.igConnection;
    const bio = conn.bioVerifications[0];

    if (bio) {
      await prisma.bioVerification.update({
        where: { id: bio.id },
        data: { lastCheckedAt: new Date() },
      });
    }

    return NextResponse.json({
      status: bio?.status?.toLowerCase() || "pending",
      verified: conn.isVerified,
      igUsername: conn.igUsername,
    });
  } catch (err: any) {
    console.error("[bio-verification check]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
