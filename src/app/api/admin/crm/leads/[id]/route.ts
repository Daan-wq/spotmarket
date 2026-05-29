import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { leadUpdateSchema } from "../schema";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const { groupName, ...data } = leadUpdateSchema.parse(await req.json());

    const lead = await prisma.$transaction(async (tx) => {
      const existingLead = await tx.brandLead.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existingLead) return null;

      const leadGroup =
        groupName === undefined
          ? undefined
          : groupName
            ? await tx.leadGroup.upsert({
                where: { name: groupName },
                update: {},
                create: { name: groupName, owner: data.owner ?? undefined },
              })
            : null;

      const updatedLead = await tx.brandLead.update({
        where: { id },
        data: {
          ...data,
          ...(groupName !== undefined ? { leadGroupId: leadGroup?.id ?? null } : {}),
        },
        include: { leadGroup: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: "crm.lead.update",
          entityType: "BrandLead",
          entityId: updatedLead.id,
          metadata: { brandName: updatedLead.brandName, groupName: updatedLead.leadGroup?.name ?? null },
        },
      });

      return updatedLead;
    });

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    return NextResponse.json(serialize(lead));
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/crm/leads/[id]]");
  }
}
