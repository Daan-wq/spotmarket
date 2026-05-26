import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import {
  DISCORD_LINK_BUTTON_MAX_LABEL_CHARS,
  DISCORD_LINK_BUTTON_MAX_URL_CHARS,
  DISCORD_MAX_LINK_BUTTONS,
} from "@/lib/admin/discord-message-validation";
import { prisma } from "@/lib/prisma";

const buttonSchema = z.object({
  label: z.string().trim().min(1).max(DISCORD_LINK_BUTTON_MAX_LABEL_CHARS),
  url: z
    .string()
    .trim()
    .min(1)
    .max(DISCORD_LINK_BUTTON_MAX_URL_CHARS)
    .refine((value) => isHttpUrl(value), "URL must start with http:// or https://."),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(["DRAFT", "TEMPLATE"]).optional(),
  content: z.string().max(2000).optional(),
  buttons: z.array(buttonSchema).max(DISCORD_MAX_LINK_BUTTONS).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
});

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const auth = await requireAuth("admin");
    const { id } = await params;
    const admin = await prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    });
    if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

    const data = updateTemplateSchema.parse(await req.json());
    const template = await prisma.discordMessageTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedByUserId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "discord.template.update",
        entityType: "DiscordMessageTemplate",
        entityId: template.id,
        metadata: {
          kind: template.kind,
          contentLength: template.content.length,
          buttons: Array.isArray(template.buttons) ? template.buttons.length : 0,
        },
      },
    });

    return NextResponse.json({ template: serialize(template) });
  } catch (error) {
    return jsonError(error, "[PATCH /api/admin/discord/templates/:id]");
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const auth = await requireAuth("admin");
    const { id } = await params;
    const admin = await prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    });
    if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

    await prisma.discordMessageTemplate.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "discord.template.delete",
        entityType: "DiscordMessageTemplate",
        entityId: id,
        metadata: {},
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "[DELETE /api/admin/discord/templates/:id]");
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
