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

const templateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["DRAFT", "TEMPLATE"]).default("DRAFT"),
  content: z.string().max(2000),
  buttons: z.array(buttonSchema).max(DISCORD_MAX_LINK_BUTTONS).default([]),
  tags: z.array(z.string().trim().min(1).max(32)).max(12).default([]),
});

export async function GET(req: Request) {
  try {
    await requireAuth("admin");
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const kind = url.searchParams.get("kind");
    const tag = url.searchParams.get("tag")?.trim();

    const templates = await prisma.discordMessageTemplate.findMany({
      where: {
        ...(kind === "DRAFT" || kind === "TEMPLATE" ? { kind } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { content: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        createdBy: { select: { email: true } },
        updatedBy: { select: { email: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });

    return NextResponse.json({ templates: serialize(templates) });
  } catch (error) {
    return jsonError(error, "[GET /api/admin/discord/templates]");
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth("admin");
    const admin = await prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true },
    });
    if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

    const data = templateSchema.parse(await req.json());
    const template = await prisma.discordMessageTemplate.create({
      data: {
        ...data,
        createdByUserId: admin.id,
        updatedByUserId: admin.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "discord.template.create",
        entityType: "DiscordMessageTemplate",
        entityId: template.id,
        metadata: { kind: template.kind, contentLength: template.content.length, buttons: data.buttons.length },
      },
    });

    return NextResponse.json({ template: serialize(template) }, { status: 201 });
  } catch (error) {
    return jsonError(error, "[POST /api/admin/discord/templates]");
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
