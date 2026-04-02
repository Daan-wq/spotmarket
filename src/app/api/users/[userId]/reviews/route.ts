import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

type Params = { params: Promise<{ userId: string }> };

const reviewSchema = z.object({
  campaignId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await params;

  const reviews = await prisma.review.findMany({
    where: { revieweeId: userId },
    include: {
      reviewer: {
        select: {
          id: true,
          creatorProfile: { select: { displayName: true, avatarUrl: true } },
        },
      },
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}

export async function POST(req: Request, { params }: Params) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId: revieweeId } = await params;

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { campaignId, rating, text } = parsed.data;

  const reviewer = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { creatorProfile: { select: { displayName: true } } },
  });
  if (!reviewer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (reviewer.id === revieweeId) return NextResponse.json({ error: "Cannot review yourself" }, { status: 400 });

  // Validate campaign is completed
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, name: true, status: true, createdByUserId: true },
  });
  if (!campaign || campaign.status !== "completed") {
    return NextResponse.json({ error: "Campaign must be completed before leaving a review" }, { status: 400 });
  }

  // Validate reviewer involvement
  const isLauncher = campaign.createdByUserId === reviewer.id;
  const isCreator = await prisma.campaignApplication.findFirst({
    where: {
      campaignId,
      creatorProfile: { userId: reviewer.id },
      status: { in: ["completed", "active"] },
    },
    select: { id: true },
  });
  if (!isLauncher && !isCreator) {
    return NextResponse.json({ error: "You must have participated in this campaign to leave a review" }, { status: 403 });
  }

  try {
    const review = await prisma.review.create({
      data: { reviewerId: reviewer.id, revieweeId, campaignId, rating, text },
    });

    const reviewerName = reviewer.creatorProfile?.displayName ?? reviewer.email;
    await createNotification(revieweeId, "REVIEW_RECEIVED", {
      reviewerId: reviewer.id,
      reviewerName,
      campaignId,
      campaignName: campaign.name,
      rating,
    });

    return NextResponse.json({ review }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "You have already reviewed this person for this campaign" }, { status: 409 });
  }
}
