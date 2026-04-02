import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only auto-approve posts that have been brand_approved (brand reviewed)
  // Posts still in "submitted" need brand review first — don't auto-approve those
  const postsToApprove = await prisma.campaignPost.findMany({
    where: {
      status: "brand_approved",
      autoApproveAt: { lte: new Date() },
      isFraudSuspect: false,
    },
    select: { id: true },
  });

  if (postsToApprove.length === 0) {
    return NextResponse.json({ ok: true, approved: 0 });
  }

  await prisma.campaignPost.updateMany({
    where: { id: { in: postsToApprove.map((p) => p.id) } },
    data: {
      status: "approved",
      isApproved: true,
      isAutoApproved: true,
      approvedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, approved: postsToApprove.length });
}
