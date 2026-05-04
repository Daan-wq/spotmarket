import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  NotificationType,
  NotificationChannel,
} from "@prisma/client";
import { DEFAULT_CHANNELS } from "@/lib/contracts/notifications";

const NOTIFICATION_TYPES = Object.values(NotificationType) as NotificationType[];
const NOTIFICATION_CHANNELS = Object.values(NotificationChannel) as NotificationChannel[];

/**
 * GET /api/notification-rules
 * Returns the current user's NotificationRule rows merged with the
 * defaults so the settings UI can render every type.
 */
export async function GET() {
  try {
    const { userId: supabaseId } = await requireAuth("creator", "admin");
    const user = await prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const rules = await prisma.notificationRule.findMany({
      where: { userId: user.id },
    });
    const map = new Map(rules.map((r) => [r.type, r]));

    const merged = NOTIFICATION_TYPES.map((type) => {
      const existing = map.get(type);
      const defaultChannels = (DEFAULT_CHANNELS[type] ?? ["IN_APP"]) as NotificationChannel[];
      return {
        type,
        channels: existing ? (existing.channels as NotificationChannel[]) : defaultChannels,
        enabled: existing?.enabled ?? true,
        isDefault: !existing,
      };
    });

    return NextResponse.json({ rules: merged });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

/**
 * PUT /api/notification-rules
 * Body: { type: NotificationType, channels: NotificationChannel[], enabled?: boolean }
 * Upserts a single rule for the current user.
 */
export async function PUT(req: Request) {
  try {
    const { userId: supabaseId } = await requireAuth("creator", "admin");
    const user = await prisma.user.findUnique({
      where: { supabaseId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = (await req.json()) as {
      type?: string;
      channels?: string[];
      enabled?: boolean;
    };
    const type = body.type as NotificationType | undefined;
    const channels = (body.channels ?? []) as NotificationChannel[];
    const enabled = body.enabled ?? true;

    if (!type || !NOTIFICATION_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (
      !Array.isArray(channels) ||
      channels.some((c) => !NOTIFICATION_CHANNELS.includes(c))
    ) {
      return NextResponse.json({ error: "Invalid channels" }, { status: 400 });
    }

    const rule = await prisma.notificationRule.upsert({
      where: { userId_type: { userId: user.id, type } },
      create: { userId: user.id, type, channels, enabled },
      update: { channels, enabled },
    });

    return NextResponse.json({ rule });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
