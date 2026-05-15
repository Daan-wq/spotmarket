import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { sopSchema } from "../route";

const patchSchema = sopSchema.partial();

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const doc = await prisma.sopDocument.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "SOP not found" }, { status: 404 });
    return NextResponse.json(serialize(doc));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/sops/[id]]");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = patchSchema.parse(await req.json());
    const doc = await prisma.sopDocument.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "sop.update",
        entityType: "SopDocument",
        entityId: id,
        metadata: { status: doc.status, nextReviewAt: doc.nextReviewAt },
      },
    });
    return NextResponse.json(serialize(doc));
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/sops/[id]]");
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    await prisma.sopDocument.update({ where: { id }, data: { status: "ARCHIVED" } });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "sop.archive",
        entityType: "SopDocument",
        entityId: id,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return jsonError(error, "[DELETE /api/admin/sops/[id]]");
  }
}
