import { NextResponse } from "next/server";
import { getCachedAuthUser } from "@/lib/auth";

interface FeedbackBody {
  type: "bug" | "feature";
  description?: string;
  title?: string;
  severity?: "low" | "medium" | "high";
  category?: string;
  pageUrl?: string;
  userAgent?: string;
  viewport?: string;
}

const MAX_DESCRIPTION = 2000;
const MAX_TITLE = 120;

export async function POST(req: Request) {
  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.type !== "bug" && body.type !== "feature") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const description = (body.description ?? "").trim().slice(0, MAX_DESCRIPTION);
  const title = (body.title ?? "").trim().slice(0, MAX_TITLE);

  if (body.type === "bug" && description.length === 0) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (body.type === "feature" && (title.length === 0 || description.length === 0)) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const user = await getCachedAuthUser();

  const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK_URL ?? process.env.DISCORD_DEALS_WEBHOOK_URL;

  if (webhookUrl) {
    const payload = buildDiscordPayload({
      type: body.type,
      title,
      description,
      severity: body.severity,
      category: body.category,
      pageUrl: body.pageUrl,
      userAgent: body.userAgent,
      viewport: body.viewport,
      userEmail: user?.email ?? null,
      userId: user?.id ?? null,
    });
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[feedback] Discord webhook failed", err);
    }
  } else {
    // No webhook configured — at least log so it's visible in dev/server logs.
    console.info("[feedback] received", {
      type: body.type,
      title,
      description,
      severity: body.severity,
      category: body.category,
      pageUrl: body.pageUrl,
      userId: user?.id ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

function buildDiscordPayload(args: {
  type: "bug" | "feature";
  title: string;
  description: string;
  severity?: string;
  category?: string;
  pageUrl?: string;
  userAgent?: string;
  viewport?: string;
  userEmail: string | null;
  userId: string | null;
}) {
  const isBug = args.type === "bug";
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];
  if (args.title) fields.push({ name: "Title", value: args.title.slice(0, 256) });
  fields.push({
    name: isBug ? "Bug" : "Feature",
    value: args.description.slice(0, 1024),
  });
  if (args.severity) fields.push({ name: "Severity", value: args.severity, inline: true });
  if (args.category) fields.push({ name: "Category", value: args.category, inline: true });
  if (args.pageUrl) fields.push({ name: "Page", value: args.pageUrl, inline: false });
  if (args.userEmail || args.userId) {
    fields.push({
      name: "User",
      value: `${args.userEmail ?? "anon"}${args.userId ? ` (${args.userId})` : ""}`,
      inline: false,
    });
  }
  if (args.userAgent) {
    fields.push({ name: "Browser", value: args.userAgent.slice(0, 1024), inline: false });
  }
  if (args.viewport) fields.push({ name: "Viewport", value: args.viewport, inline: true });

  return {
    embeds: [
      {
        title: isBug ? "🐛 Bug report" : "💡 Feature request",
        color: isBug ? 0xef4444 : 0x6366f1,
        fields,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}
