import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

const createSubmissionSchema = z.object({
  applicationId: z.string().min(1),
  postUrl: z.string().url().optional(),
  screenshotUrl: z.string().url(),
  claimedViews: z.number().int().positive(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId, role } = await requireAuth("admin", "creator");

    let where: any = {};

    if (role === "creator") {
      const creator = await prisma.user.findUnique({
        where: { supabaseId: userId },
        select: { id: true },
      });
      if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });
      where.creatorId = creator.id;
    }

    const submissions = await prisma.campaignSubmission.findMany({
      where,
      include: {
        campaign: { select: { name: true, id: true } },
        creator: { select: { email: true } },
        application: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ submissions });
  } catch (err: any) {
    console.error("[submissions GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await requireAuth("creator");

    const body = await req.json();
    const { applicationId, postUrl, screenshotUrl, claimedViews } = createSubmissionSchema.parse(body);

    const creator = await prisma.user.findUnique({
      where: { supabaseId: userId },
      include: { creatorProfile: { include: { igConnection: true } } },
    });

    if (!creator?.creatorProfile) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    if (!creator.creatorProfile.igConnection?.isVerified) {
      return NextResponse.json({ error: "Creator IG must be verified" }, { status: 400 });
    }

    const app = await prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: true },
    });

    if (!app || app.creatorProfileId !== creator.creatorProfile.id) {
      return NextResponse.json({ error: "Application not found or unauthorized" }, { status: 404 });
    }

    const submission = await prisma.campaignSubmission.create({
      data: {
        applicationId,
        creatorId: creator.id,
        campaignId: app.campaignId,
        postUrl,
        screenshotUrl,
        claimedViews,
        status: "PENDING",
      },
      include: { campaign: true, creator: true, application: true },
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (err: any) {
    console.error("[submissions POST]", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
