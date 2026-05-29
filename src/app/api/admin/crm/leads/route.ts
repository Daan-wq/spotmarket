import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(max).optional().nullable());

const leadSchema = z.object({
  brandName: z.string().trim().min(1).max(180),
  groupName: optionalText(180),
  category: optionalText(120),
  subcategory: optionalText(120),
  contactName: optionalText(120),
  contactEmail: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().email().optional().nullable()),
  contactPhone: optionalText(80),
  contactLinkedIn: optionalText(300),
  website: optionalText(300),
  source: optionalText(120),
  stage: z.enum(["LEAD", "CONTACTED", "REPLIED", "CALL_BOOKED", "CALL_DONE", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST", "NURTURE_LATER"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  owner: optionalText(120),
  lastContactedAt: optionalIsoDate,
  nextFollowUpAt: optionalIsoDate,
  estimatedValue: z.coerce.number().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  notes: optionalText(5000),
});

export async function GET() {
  try {
    await requireAuth("admin");
    const leads = await prisma.brandLead.findMany({
      orderBy: [{ leadGroup: { name: "asc" } }, { brandName: "asc" }, { updatedAt: "desc" }],
      take: 200,
      include: { leadGroup: true },
    });
    return NextResponse.json(serialize(leads));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/crm/leads]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const { groupName, ...data } = leadSchema.parse(await req.json());
    const lead = await prisma.$transaction(async (tx) => {
      const leadGroup = groupName
        ? await tx.leadGroup.upsert({
            where: { name: groupName },
            update: {},
            create: { name: groupName, owner: data.owner },
          })
        : null;

      const createdLead = await tx.brandLead.create({
        data: {
          ...data,
          leadGroupId: leadGroup?.id,
          estimatedValue: data.estimatedValue ?? 0,
          probability: data.probability ?? 0,
        },
        include: { leadGroup: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "crm.lead.create",
          entityType: "BrandLead",
          entityId: createdLead.id,
          metadata: { brandName: createdLead.brandName, groupName: leadGroup?.name ?? null },
        },
      });

      return createdLead;
    });
    return NextResponse.json(serialize(lead), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/crm/leads]");
  }
}
