import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DiscordApiError, listDiscordEmojis } from "@/lib/admin/discord";

export async function GET() {
  try {
    await requireAuth("admin");
    const emojis = await listDiscordEmojis();
    return NextResponse.json({ emojis });
  } catch (error) {
    return discordJsonError(error, "[GET /api/admin/discord/emojis]");
  }
}

function discordJsonError(error: unknown, label: string) {
  if (error instanceof Error && error.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (error instanceof DiscordApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(label, error);
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
