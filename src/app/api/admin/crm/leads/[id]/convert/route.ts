import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { createCrmAuditLog } from "../../audit";

const optionalText = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }, z.string().max(max).optional().nullable());

const convertSchema = z.object({
  niche: optionalText(120),
  website: optionalText(300),
  monthlyValue: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  accountManager: optionalText(120),
  packageName: optionalText(120),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = convertSchema.parse(await req.json().catch(() => ({})));

    const lead = await prisma.brandLead.findUnique({ where: { id } });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (lead.convertedBrandId) return NextResponse.json({ error: "Lead already converted" }, { status: 409 });

    const result = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          name: lead.brandName,
          niche: data.niche ?? lead.category,
          website: data.website ?? lead.website,
          contactName: lead.contactName,
          contactEmail: lead.contactEmail,
          owner: lead.owner,
          status: "ONBOARDING",
          monthlyValue: data.monthlyValue ?? Number(lead.estimatedValue),
          currency: data.currency ?? "EUR",
          notes: lead.notes,
        },
      });

      const onboarding = await tx.brandOnboarding.create({
        data: {
          brandId: brand.id,
          packageName: data.packageName ?? lead.subcategory,
          monthlyPrice: data.monthlyValue ?? Number(lead.estimatedValue),
          accountManager: data.accountManager ?? lead.owner,
        },
      });

      const convertedLead = await tx.brandLead.update({
        where: { id },
        data: { stage: "WON", convertedBrandId: brand.id },
      });

      await createCrmAuditLog(tx, {
        authUserId: userId,
        action: "crm.lead.convert",
        entityId: id,
        metadata: { brandId: brand.id },
      });

      return { brand, onboarding, lead: convertedLead };
    });

    return NextResponse.json(serialize(result), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/crm/leads/[id]/convert]");
  }
}
