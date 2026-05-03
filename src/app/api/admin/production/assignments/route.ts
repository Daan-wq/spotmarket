import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

const assignmentSchema = z.object({
  campaignId: z.string().min(1),
  brandId: z.string().optional().nullable(),
  creatorProfileId: z.string().optional().nullable(),
  contentAngle: z.string().max(1000).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  assignedAt: optionalIsoDate,
  dueAt: optionalIsoDate,
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "NEEDS_REVISION", "APPROVED", "POSTED", "REJECTED", "PAID"]).optional(),
  revisionNotes: z.string().max(5000).optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth("admin");
    const assignments = await prisma.productionAssignment.findMany({
      orderBy: [{ dueAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serialize(assignments));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/production/assignments]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = assignmentSchema.parse(await req.json());

    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId },
      select: { id: true, brandId: true },
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

    const assignment = await prisma.productionAssignment.create({
      data: {
        campaignId: data.campaignId,
        brandId: data.brandId ?? campaign.brandId,
        creatorProfileId: data.creatorProfileId,
        contentAngle: data.contentAngle,
        sourceUrl: data.sourceUrl,
        assignedAt: data.assignedAt ?? new Date(),
        dueAt: data.dueAt,
        status: data.status ?? "NOT_STARTED",
        revisionNotes: data.revisionNotes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "production.assignment.create",
        entityType: "ProductionAssignment",
        entityId: assignment.id,
        metadata: { campaignId: assignment.campaignId, creatorProfileId: assignment.creatorProfileId },
      },
    });

    return NextResponse.json(serialize(assignment), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/production/assignments]");
  }
}
