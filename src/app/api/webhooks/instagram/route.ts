/**
 * Instagram webhook receiver.
 *
 * GET handles the Meta verification handshake (hub.mode=subscribe).
 * POST is the live event delivery — Meta posts JSON when subscribed fields
 * change. We verify the X-Hub-Signature-256 against the app secret, then
 * dispatch story-related events into the same `pollStoriesForConnection`
 * pipeline so DB shape stays consistent with the cron path.
 *
 * To activate: register the callback URL in the Meta app dashboard, subscribe
 * the IG Business Account to the `media` field, and set
 * `INSTAGRAM_WEBHOOK_VERIFY_TOKEN` + `INSTAGRAM_APP_SECRET`.
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pollStoriesForConnection } from "@/lib/stories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const verifyToken = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && verifyToken === expected && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  if (!verifySignature(req, body)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(body) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Collect every IG user id mentioned in the entries so we can re-poll their
  // active stories in a single pass.
  const igUserIds = new Set<string>();
  for (const entry of event.entry ?? []) {
    if (entry.id) igUserIds.add(entry.id);
  }

  let triggered = 0;
  for (const igUserId of igUserIds) {
    const conn = await prisma.creatorIgConnection.findFirst({
      where: { igUserId, accessToken: { not: null } },
    });
    if (!conn) continue;
    await pollStoriesForConnection(conn);
    triggered++;
  }

  return NextResponse.json({ ok: true, triggered });
}

function verifySignature(req: NextRequest, rawBody: string): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return false;
  const sigHeader = req.headers.get("x-hub-signature-256");
  if (!sigHeader || !sigHeader.startsWith("sha256=")) return false;
  const provided = sigHeader.slice("sha256=".length);
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

interface WebhookEntry {
  id?: string;
  changes?: Array<{ field?: string; value?: unknown }>;
}

interface WebhookEvent {
  object?: string;
  entry?: WebhookEntry[];
}
