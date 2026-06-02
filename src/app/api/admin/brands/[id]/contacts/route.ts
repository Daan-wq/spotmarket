import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { buildAppUrl, getAppUrlFromRequest } from "@/lib/app-url";
import {
  brandInviteExpiresAt,
  createBrandInviteToken,
  hashBrandInviteToken,
  normalizeBrandContactEmail,
} from "@/lib/brand-invites";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import { prisma } from "@/lib/prisma";

const contactSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
});

const contactInclude = {
  brand: { select: { id: true, name: true } },
  user: { select: { id: true, email: true, role: true } },
} as const;

const brandSelect = {
  id: true,
  name: true,
  contactEmail: true,
  portalEnabled: true,
  portalCreatedAt: true,
  portalCreatedBy: true,
} as const;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await requireAuth("admin");
    const { id } = await params;
    const contacts = await prisma.brandContact.findMany({
      where: { brandId: id },
      include: contactInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json({ contacts: serialize(contacts) });
  } catch (error) {
    return jsonError(error, "[GET /api/admin/brands/[id]/contacts]");
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { userId } = await requireAuth("admin");
    const { id } = await params;
    const parsed = contactSchema.parse(await req.json());
    const email = normalizeBrandContactEmail(parsed.email);
    const name = parsed.name?.trim() || null;
    const brand = await prisma.brand.findUnique({
      where: { id },
      select: brandSelect,
    });

    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    const portalBrand = brand.portalEnabled
      ? brand
      : await prisma.brand.update({
          where: { id },
          data: {
            portalEnabled: true,
            portalCreatedAt: new Date(),
            portalCreatedBy: userId,
          },
          select: brandSelect,
        });

    const token = createBrandInviteToken();
    const inviteUrl = buildAppUrl(`/brand-invite/${token}`, getAppUrlFromRequest(req));
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true },
    });
    const attachExistingUser = existingUser?.role === "brand" || existingUser?.role === "admin";
    const activateExistingAdmin = existingUser?.role === "admin";

    const contact = await prisma.brandContact.upsert({
      where: { brandId_email: { brandId: id, email } },
      create: {
        brandId: id,
        userId: attachExistingUser ? existingUser.id : null,
        email,
        name,
        status: activateExistingAdmin ? "ACTIVE" : "INVITED",
        inviteTokenHash: activateExistingAdmin ? null : hashBrandInviteToken(token),
        inviteExpiresAt: activateExistingAdmin ? null : brandInviteExpiresAt(),
        invitedBy: userId,
        acceptedAt: activateExistingAdmin ? new Date() : null,
      },
      update: {
        userId: attachExistingUser ? existingUser.id : undefined,
        name,
        status: activateExistingAdmin ? "ACTIVE" : "INVITED",
        inviteTokenHash: activateExistingAdmin ? null : hashBrandInviteToken(token),
        inviteExpiresAt: activateExistingAdmin ? null : brandInviteExpiresAt(),
        invitedBy: userId,
        invitedAt: new Date(),
        acceptedAt: activateExistingAdmin ? new Date() : null,
        revokedAt: null,
      },
      include: contactInclude,
    });

    const emailSent = false;

    await prisma.auditLog.create({
      data: {
        userId,
        action: "brandContact.invite",
        entityType: "BrandContact",
        entityId: contact.id,
        metadata: {
          brandId: id,
          email,
          emailSent,
          portalCreated: !brand.portalEnabled,
          activatedExistingAdmin: activateExistingAdmin,
        },
      },
    });

    return NextResponse.json({
      contact: serialize(contact),
      brand: serialize(portalBrand),
      inviteUrl: activateExistingAdmin ? null : inviteUrl,
      emailSent,
    }, { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/brands/[id]/contacts]");
  }
}
