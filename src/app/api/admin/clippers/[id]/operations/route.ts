import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";

const operationsSchema = z.object({
  status: z.enum(["APPLICANT", "TRIAL_SENT", "TRIAL_SUBMITTED", "APPROVED", "ACTIVE", "PAUSED", "REMOVED"]).optional(),
  reliability: z.enum(["UNKNOWN", "LOW", "MEDIUM", "HIGH"]).optional(),
  maxClipsPerWeek: z.coerce.number().int().min(0).optional().nullable(),
  ratePerClip: z.coerce.number().min(0).optional(),
  editingStyle: z.string().max(500).optional().nullable(),
  niches: z.array(z.string().min(1).max(80)).optional(),
  assignedBrandIds: z.array(z.string().min(1)).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const profile = await prisma.clipperOperationalProfile.findUnique({
      where: { creatorProfileId: id },
      include: { creatorProfile: { select: { displayName: true, user: { select: { email: true } } } } },
    });
    if (!profile) return NextResponse.json({ error: "Operational profile not found" }, { status: 404 });
    return NextResponse.json(serialize(profile));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/clippers/[id]/operations]");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = operationsSchema.parse(await req.json());

    const existing = await prisma.creatorProfile.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });

    const profile = await prisma.clipperOperationalProfile.upsert({
      where: { creatorProfileId: id },
      create: {
        creatorProfileId: id,
        ...data,
        ratePerClip: data.ratePerClip ?? 0,
      },
      update: data,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "clipper.operations.update",
        entityType: "CreatorProfile",
        entityId: id,
        metadata: { status: profile.status, assignedBrandIds: profile.assignedBrandIds },
      },
    });

    return NextResponse.json(serialize(profile));
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/clippers/[id]/operations]");
  }
}
