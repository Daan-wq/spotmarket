import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autopostRenderQueue } from "@/lib/queue-client";
import { verifyCron } from "@/lib/cron-auth";

export async function POST(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all PENDING scheduled posts where scheduledAt <= now
  const now = new Date();
  const pendingPosts = await prisma.scheduledPost.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: now },
    },
    select: { id: true },
  });

  // For each: update status to RENDERING and enqueue RENDER job
  let enqueued = 0;
  for (const post of pendingPosts) {
    try {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: { status: "RENDERING" },
      });
      await autopostRenderQueue.add("render", { scheduledPostId: post.id });
      enqueued++;
    } catch (err) {
      console.error(`[autopost-scheduler] Failed to enqueue ${post.id}:`, err);
    }
  }

  return NextResponse.json({
    found: pendingPosts.length,
    enqueued,
    timestamp: now.toISOString(),
  });
}
