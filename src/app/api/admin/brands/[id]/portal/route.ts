import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const brandSelect = {
  id: true,
  name: true,
  contactEmail: true,
  portalEnabled: true,
  portalCreatedAt: true,
  portalCreatedBy: true,
} as const;

export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const current = await prisma.brand.findUnique({
      where: { id },
      select: brandSelect,
    });

    if (!current) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    const data: Prisma.BrandUpdateInput = current.portalEnabled
      ? {}
      : {
          portalEnabled: true,
          portalCreatedAt: new Date(),
          portalCreatedBy: userId,
        };

    const brand = await prisma.brand.update({
      where: { id },
      data,
      select: brandSelect,
    });

    if (!current.portalEnabled) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "brandPortal.create",
          entityType: "Brand",
          entityId: id,
          metadata: { brandId: id, brandName: brand.name },
        },
      });
    }

    return NextResponse.json({ brand: serialize(brand) });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/brands/[id]/portal]");
  }
}
