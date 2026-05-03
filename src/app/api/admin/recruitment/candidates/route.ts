import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

const candidateSchema = z.object({
  name: z.string().min(1).max(160),
  source: z.string().max(120).optional().nullable(),
  contact: z.string().max(200).optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  stage: z.enum(["FOUND", "CONTACTED", "PORTFOLIO_RECEIVED", "TRIAL_SENT", "TRIAL_SUBMITTED", "APPROVED", "REJECTED", "ADDED_TO_DATABASE"]).optional(),
  contactedBy: z.string().max(120).optional().nullable(),
  trialSentAt: optionalIsoDate,
  trialDueAt: optionalIsoDate,
  trialSubmittedAt: optionalIsoDate,
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  approvedCreatorProfileId: z.string().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth("admin");
    const candidates = await prisma.clipperCandidate.findMany({
      orderBy: [{ trialDueAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serialize(candidates));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/recruitment/candidates]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = candidateSchema.parse(await req.json());
    const candidate = await prisma.clipperCandidate.create({ data });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "recruitment.candidate.create",
        entityType: "ClipperCandidate",
        entityId: candidate.id,
        metadata: { stage: candidate.stage },
      },
    });

    return NextResponse.json(serialize(candidate), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/recruitment/candidates]");
  }
}
