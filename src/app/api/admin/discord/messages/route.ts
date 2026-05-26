import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  DiscordApiError,
  discordMessageUrl,
  flattenDiscordChannels,
  listDiscordChannels,
  sendDiscordMessage,
  validateDiscordMessageInput,
} from "@/lib/admin/discord";
import type { DiscordLinkButton } from "@/lib/admin/discord-message-validation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth("admin");
    const admin = await prisma.user.findUnique({
      where: { supabaseId: auth.userId },
      select: { id: true, email: true },
    });
    if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 404 });

    const formData = await req.formData();
    const channelId = String(formData.get("channelId") ?? "").trim();
    const content = String(formData.get("content") ?? "");
    const templateId = String(formData.get("templateId") ?? "").trim() || null;
    const buttons = parseButtons(formData.get("buttons"));
    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    const validationError = validateDiscordMessageInput({ channelId, content, files, buttons });
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const channelGroups = await listDiscordChannels();
    const channel = flattenDiscordChannels(channelGroups).find((item) => item.id === channelId);
    if (!channel) return NextResponse.json({ error: "Choose a valid Discord channel." }, { status: 400 });

    const sent = await sendDiscordMessage({ channelId, content, files, buttons });
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "discord.message.send",
        entityType: "DiscordMessage",
        entityId: sent.id,
        metadata: {
          channelId,
          channelName: channel.name,
          templateId,
          contentLength: content.length,
          buttons: buttons.map((button) => ({
            label: button.label,
            url: button.url,
          })),
          attachments: files.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: {
        id: sent.id,
        channelId: sent.channelId,
        url: discordMessageUrl(sent.channelId, sent.id),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof DiscordApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/admin/discord/messages]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function parseButtons(value: FormDataEntryValue | null): DiscordLinkButton[] {
  if (typeof value !== "string" || !value.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    throw new DiscordApiError("Invalid Discord button payload.", 400);
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => {
    if (!item || typeof item !== "object") return { label: "", url: "" };
    const record = item as Record<string, unknown>;
    return {
      label: typeof record.label === "string" ? record.label : "",
      url: typeof record.url === "string" ? record.url : "",
    };
  });
}
