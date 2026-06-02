import { NextResponse } from "next/server";
import { Resend } from "resend";
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

    const emailSent = activateExistingAdmin
      ? false
      : await sendBrandInviteEmail({
          to: email,
          brandName: brand.name,
          inviteUrl,
        });

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

async function sendBrandInviteEmail({
  to,
  brandName,
  inviteUrl,
}: {
  to: string;
  brandName: string;
  inviteUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) return false;

  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "ClipProfit <noreply@clipprofit.com>",
    to,
    subject: `Je ClipProfit rapportomgeving voor ${brandName}`,
    html: `
      <div style="background:#f7f9f9;margin:0;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:560px;margin:0 auto;">
          <div style="margin-bottom:18px;color:#010405;font-size:20px;font-weight:900;font-style:italic;line-height:1;text-transform:uppercase;">ClipProfit</div>
          <div style="background:#fff;border:1px solid #d2d9db;border-radius:20px;padding:30px;">
            <h1 style="margin:0 0 14px;color:#010405;font-size:26px;line-height:1.1;">Je rapportomgeving staat klaar</h1>
            <p style="margin:0 0 20px;color:#5a6569;font-size:15px;line-height:1.65;">Maak een wachtwoord aan om de campagnerapporten voor ${escapeHtml(brandName)} te bekijken.</p>
            <a href="${inviteUrl}" style="display:inline-block;background:#010405;color:#fff;text-decoration:none;padding:13px 22px;border-radius:999px;font-size:14px;font-weight:700;">Account activeren</a>
          </div>
        </div>
      </div>
    `,
  });

  return true;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
