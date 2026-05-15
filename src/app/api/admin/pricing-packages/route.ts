import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { pricingPackageSchema } from "@/lib/admin/final-remediation-validation";

export async function GET() {
  try {
    await requireAuth("admin");
    const packages = await prisma.pricingPackageTemplate.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serialize(packages));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/pricing-packages]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = pricingPackageSchema.parse(await req.json());
    const template = await prisma.pricingPackageTemplate.create({
      data: {
        ...data,
        price: data.price ?? 0,
        currency: data.currency ?? "EUR",
        platforms: data.platforms ?? [],
        creatorRatePerClip: data.creatorRatePerClip ?? 0,
        creatorCpv: data.creatorCpv ?? 0,
        businessCpv: data.businessCpv ?? 0,
        marginPercent: data.marginPercent ?? 0,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "pricingPackage.create",
        entityType: "PricingPackageTemplate",
        entityId: template.id,
        metadata: { name: template.name, price: template.price },
      },
    });
    return NextResponse.json(serialize(template), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/pricing-packages]");
  }
}
