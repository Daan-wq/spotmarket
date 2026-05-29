import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { leadCreateSchema } from "./schema";

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
    const { groupName, ...data } = leadCreateSchema.parse(await req.json());
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
