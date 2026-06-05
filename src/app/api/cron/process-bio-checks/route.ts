import { NextRequest, NextResponse } from "next/server";
import { verifyCron } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { runSubmissionBioCheck } from "@/lib/campaign-bio-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await prisma.campaignSubmission.findMany({
    where: {
      status: "PENDING",
      bioCheckStatus: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  for (const submission of pending) {
    try {
      await runSubmissionBioCheck(submission.id);
      succeeded += 1;
    } catch (err) {
      failed += 1;
      console.error("[process-bio-checks]", err);
    }
  }

  return NextResponse.json({ processed: pending.length, succeeded, failed });
}
