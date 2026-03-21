import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postsToApprove = await prisma.campaignPost.findMany({
    where: {
      status: "submitted",
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
