import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ id: string; contactId: string }>;
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { userId } = await requireAuth("admin");
    const { id, contactId } = await params;
    const result = await prisma.brandContact.updateMany({
      where: { id: contactId, brandId: id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        inviteTokenHash: null,
        inviteExpiresAt: null,
      },
    });

    if (result.count === 0) return NextResponse.json({ error: "Brand contact not found" }, { status: 404 });

    const contact = await prisma.brandContact.findUnique({
      where: { id: contactId },
      include: { brand: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "brandContact.revoke",
        entityType: "BrandContact",
        entityId: contactId,
        metadata: { brandId: id },
      },
    });

    return NextResponse.json({ contact: serialize(contact) });
  } catch (error) {
    return jsonError(error, "[DELETE /api/admin/brands/[id]/contacts/[contactId]]");
  }
}
