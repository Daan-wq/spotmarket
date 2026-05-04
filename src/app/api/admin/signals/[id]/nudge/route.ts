import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * Nudge action for TOKEN_BROKEN signals.
 * Writes a TOKEN_BROKEN Notification for the affected creator. Subsystem E's
 * dispatcher fans this out to enabled channels.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;

    const signal = await prisma.submissionSignal.findUnique({
      where: { id },
      include: {
        submission: {
          select: {
            id: true,
            creatorId: true,
            campaign: { select: { name: true } },
          },
        },
      },
    });
    if (!signal) {
      return NextResponse.json({ error: "Signal not found" }, { status: 404 });
    }
    if (signal.type !== "TOKEN_BROKEN") {
      return NextResponse.json({ error: "Only TOKEN_BROKEN signals support nudge" }, { status: 400 });
    }

    const payload = signal.payload as Record<string, unknown> | null;
    const connectionType =
      payload && typeof payload.connectionType === "string" ? payload.connectionType : null;

    await prisma.notification.create({
      data: {
        userId: signal.submission.creatorId,
        type: "TOKEN_BROKEN",
        data: {
          signalId: signal.id,
          submissionId: signal.submission.id,
          campaignName: signal.submission.campaign?.name ?? null,
          connectionType,
          nudgedBy: userId,
          message: "Your platform connection needs to be reauthorized so we can keep tracking your submission.",
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin signal nudge] error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
