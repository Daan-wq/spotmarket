import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCron } from "@/lib/cron-auth";

export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find PENDING_REVIEW submissions older than 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const pendingSubmissions = await prisma.campaignSubmission.findMany({
    where: {
      status: "PENDING_REVIEW",
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });

  // Auto-approve each
  let approved = 0;
  const now = new Date();
  for (const sub of pendingSubmissions) {
    try {
      await prisma.campaignSubmission.update({
        where: { id: sub.id },
        data: {
          status: "APPROVED",
          autoApprovedAt: now,
          payoutTriggered: true,
        },
      });
      approved++;
    } catch (err) {
      console.error(`[autopost-auto-approve] Failed to approve ${sub.id}:`, err);
    }
  }

  return NextResponse.json({
    found: pendingSubmissions.length,
    approved,
    timestamp: now.toISOString(),
  });
}
