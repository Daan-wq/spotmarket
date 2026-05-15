import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { contractDocumentSchema } from "@/lib/admin/final-remediation-validation";

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const documents = await prisma.contractDocument.findMany({
      where: status ? { status } : {},
      orderBy: [{ expiresAt: "asc" }, { updatedAt: "desc" }],
      include: {
        brand: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
      take: 200,
    });
    return NextResponse.json(serialize(documents));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/documents]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const parsed = contractDocumentSchema.parse(await req.json());
    const document = await prisma.contractDocument.create({
      data: {
        ...parsed,
        type: parsed.type ?? "CONTRACT",
        status: parsed.status ?? "DRAFT",
        externalUrl: parsed.externalUrl || null,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "document.create",
        entityType: "ContractDocument",
        entityId: document.id,
        metadata: { title: document.title, status: document.status },
      },
    });
    return NextResponse.json(serialize(document), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/documents]");
  }
}
