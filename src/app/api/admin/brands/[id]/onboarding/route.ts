import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, optionalIsoDate, serialize } from "@/lib/admin/agency-api";

const onboardingSchema = z.object({
  packageName: z.string().max(120).optional().nullable(),
  monthlyPrice: z.coerce.number().min(0).optional(),
  contractSigned: z.boolean().optional(),
  paymentReceived: z.boolean().optional(),
  kickoffCallDone: z.boolean().optional(),
  brandBriefReceived: z.boolean().optional(),
  contentExamplesReceived: z.boolean().optional(),
  driveFolderCreated: z.boolean().optional(),
  targetAudience: z.string().max(1000).optional().nullable(),
  mainProductOrService: z.string().max(1000).optional().nullable(),
  hooksAngles: z.string().max(5000).optional().nullable(),
  dosAndDonts: z.string().max(5000).optional().nullable(),
  assignedClipperIds: z.array(z.string().min(1)).optional(),
  startDate: optionalIsoDate,
  accountManager: z.string().max(120).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const onboarding = await prisma.brandOnboarding.findUnique({
      where: { brandId: id },
      include: { brand: true },
    });
    if (!onboarding) return NextResponse.json({ error: "Onboarding not found" }, { status: 404 });
    return NextResponse.json(serialize(onboarding));
  } catch (error) {
    return jsonError(error, "[GET /api/admin/brands/[id]/onboarding]");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const data = onboardingSchema.parse(await req.json());

    const onboarding = await prisma.brandOnboarding.upsert({
      where: { brandId: id },
      create: {
        brandId: id,
        ...data,
        monthlyPrice: data.monthlyPrice ?? 0,
      },
      update: data,
    });

    const complete = isComplete(onboarding);
    await prisma.brand.update({
      where: { id },
      data: { status: complete ? "ACTIVE" : "ONBOARDING" },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: "brand.onboarding.update",
        entityType: "Brand",
        entityId: id,
        metadata: { complete },
      },
    });

    return NextResponse.json(serialize({ onboarding, complete }));
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/brands/[id]/onboarding]");
  }
}

function isComplete(onboarding: {
  packageName: string | null;
  monthlyPrice: unknown;
  contractSigned: boolean;
  paymentReceived: boolean;
  kickoffCallDone: boolean;
  brandBriefReceived: boolean;
  contentExamplesReceived: boolean;
  driveFolderCreated: boolean;
  targetAudience: string | null;
  mainProductOrService: string | null;
  hooksAngles: string | null;
  dosAndDonts: string | null;
  assignedClipperIds: string[];
  startDate: Date | null;
  accountManager: string | null;
}) {
  return Boolean(
    onboarding.packageName &&
      Number(onboarding.monthlyPrice) > 0 &&
      onboarding.contractSigned &&
      onboarding.paymentReceived &&
      onboarding.kickoffCallDone &&
      onboarding.brandBriefReceived &&
      onboarding.contentExamplesReceived &&
      onboarding.driveFolderCreated &&
      onboarding.targetAudience &&
      onboarding.mainProductOrService &&
      onboarding.hooksAngles &&
      onboarding.dosAndDonts &&
      onboarding.assignedClipperIds.length > 0 &&
      onboarding.startDate &&
      onboarding.accountManager,
  );
}
