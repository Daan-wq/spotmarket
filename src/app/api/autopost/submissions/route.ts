import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  campaignId: z.string(),
  status: z.enum(["PENDING_REVIEW", "APPROVED", "FLAGGED"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");

    const query = querySchema.parse({
      campaignId,
      status: status as "PENDING_REVIEW" | "APPROVED" | "FLAGGED" | undefined,
    });

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

    const campaign = await prisma.campaign.findUnique({
      where: { id: query.campaignId },
      select: { createdByUserId: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.createdByUserId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const submissions = await prisma.campaignSubmission.findMany({
      where: {
        campaignId: query.campaignId,
        ...(query.status && { status: query.status }),
      },
      include: {
        creator: {
          select: {
            email: true,
            creatorProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: { publishedAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      );
    }
    console.error("[submissions/route]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
