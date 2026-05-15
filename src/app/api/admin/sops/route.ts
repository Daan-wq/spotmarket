import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

export const sopSchema = z.object({
  title: z.string().min(1).max(180),
  category: z.enum(["SALES", "BRAND_ONBOARDING", "CLIPPER_RECRUITMENT", "PRODUCTION", "QC", "PAYOUTS", "REPORTING"]),
  status: z.enum(["DRAFT", "ACTIVE", "NEEDS_REVIEW", "ARCHIVED"]).optional(),
  owner: z.string().max(120).optional().nullable(),
  summary: z.string().max(1000).optional().nullable(),
  body: z.string().min(1).max(50000),
  lastReviewedAt: optionalIsoDate,
  nextReviewAt: optionalIsoDate,
});

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category");
    const docs = await prisma.sopDocument.findMany({
      where: {
        ...(category ? { category: category as never } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { summary: { contains: q, mode: "insensitive" } },
                { body: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ nextReviewAt: "asc" }, { updatedAt: "desc" }],
      take: 200,
    });
    return NextResponse.json(serialize(docs));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/sops]");
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await requireAuth("admin");
    const data = sopSchema.parse(await req.json());
    const doc = await prisma.sopDocument.create({ data });
    await prisma.auditLog.create({
      data: {
        userId,
        action: "sop.create",
        entityType: "SopDocument",
        entityId: doc.id,
        metadata: { category: doc.category, status: doc.status },
      },
    });
    return NextResponse.json(serialize(doc), { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/sops]");
  }
}
