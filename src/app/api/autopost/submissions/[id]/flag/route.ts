import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const flagSchema = z.object({
  reason: z.string().nullable().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;

    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401 }
      );
    }

    const body = await req.json();
    flagSchema.parse(body);

    const submission = await prisma.campaignSubmission.findUnique({
      where: { id: submissionId },
      include: {
        campaign: {
          select: { createdByUserId: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.campaign.createdByUserId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const updated = await prisma.campaignSubmission.update({
      where: { id: submissionId },
      data: {
        status: "FLAGGED",
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
    });

    const flagCount = await prisma.campaignSubmission.count({
      where: {
        creatorId: submission.creatorId,
        campaignId: submission.campaignId,
        status: "FLAGGED",
      },
    });

    let creatorSuspended = false;
    if (flagCount >= 3) {
      creatorSuspended = true;
    }

    return NextResponse.json({
      submission: updated,
      creatorSuspended,
      flagCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    console.error("[submissions/flag]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
