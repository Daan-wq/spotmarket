import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

const leadSchema = z.object({
  brandName: z.string().min(1).max(180),
  contactName: z.string().max(120).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  source: z.string().max(120).optional().nullable(),
  stage: z.enum(["LEAD", "CONTACTED", "REPLIED", "CALL_BOOKED", "CALL_DONE", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "NURTURE_LATER"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  owner: z.string().max(120).optional().nullable(),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export async function GET() {
  try {
    await requireAuth("admin");
    const leads = await prisma.brandLead.findMany({
      orderBy: [{ nextFollowUpAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serialize(leads));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/crm/leads]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = leadSchema.parse(await req.json());
    const lead = await prisma.brandLead.create({
      data: {
        ...data,
        estimatedValue: data.estimatedValue ?? 0,
        probability: data.probability ?? 0,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "crm.lead.create",
        entityType: "BrandLead",
        entityId: lead.id,
        metadata: { brandName: lead.brandName },
      },
    });
    return NextResponse.json(serialize(lead), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/crm/leads]");
  }
}
