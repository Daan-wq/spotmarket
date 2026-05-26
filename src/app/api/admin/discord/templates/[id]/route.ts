import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { jsonError, serialize } from "@/lib/admin/agency-api";
import {
  DISCORD_EMBED_AUTHOR_NAME_MAX_CHARS,
  DISCORD_EMBED_DESCRIPTION_MAX_CHARS,
  DISCORD_EMBED_FIELD_NAME_MAX_CHARS,
  DISCORD_EMBED_FIELD_VALUE_MAX_CHARS,
  DISCORD_EMBED_FOOTER_TEXT_MAX_CHARS,
  DISCORD_EMBED_MAX_FIELDS,
  DISCORD_EMBED_TITLE_MAX_CHARS,
  DISCORD_LINK_BUTTON_MAX_LABEL_CHARS,
  DISCORD_LINK_BUTTON_MAX_URL_CHARS,
  DISCORD_MAX_EMBEDS,
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

const embedFieldSchema = z.object({
  name: z.string().trim().max(DISCORD_EMBED_FIELD_NAME_MAX_CHARS),
  value: z.string().trim().max(DISCORD_EMBED_FIELD_VALUE_MAX_CHARS),
  inline: z.boolean().default(false),
});

const embedSchema = z.object({
  title: z.string().trim().max(DISCORD_EMBED_TITLE_MAX_CHARS).optional().default(""),
  url: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  description: z.string().trim().max(DISCORD_EMBED_DESCRIPTION_MAX_CHARS).optional().default(""),
  color: z.number().int().min(0).max(0xffffff).nullable().optional().default(null),
  authorName: z.string().trim().max(DISCORD_EMBED_AUTHOR_NAME_MAX_CHARS).optional().default(""),
  authorIconUrl: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  authorUrl: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  thumbnailUrl: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  imageUrl: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  footerText: z.string().trim().max(DISCORD_EMBED_FOOTER_TEXT_MAX_CHARS).optional().default(""),
  footerIconUrl: z.string().trim().optional().default("").refine((value) => !value || isHttpUrl(value), "URL must start with http:// or https://."),
  timestamp: z.union([z.boolean(), z.string(), z.null()]).optional().default(false),
  fields: z.array(embedFieldSchema).max(DISCORD_EMBED_MAX_FIELDS).default([]),
});

const updateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(["DRAFT", "TEMPLATE"]).optional(),
  messageMode: z.enum(["CONTENT", "EMBED", "CONTENT_EMBED"]).optional(),
  channelId: z.string().trim().max(64).nullable().optional(),
  content: z.string().max(2000).optional(),
  embeds: z.array(embedSchema).max(DISCORD_MAX_EMBEDS).optional(),
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
          messageMode: template.messageMode,
          contentLength: template.content.length,
          embeds: Array.isArray(template.embeds) ? template.embeds.length : 0,
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
