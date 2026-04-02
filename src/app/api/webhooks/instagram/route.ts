import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Instagram webhook handler for story insights.
 *
 * After deploy, register at Meta Developer Console:
 *   Callback URL: https://<domain>/api/webhooks/instagram
 *   Verify Token: INSTAGRAM_WEBHOOK_VERIFY_TOKEN (env var)
 *   Subscribed fields: story_insights
 *
 * Stories expire after 24 hours — webhook is the only way to capture story stats before expiry.
 */

// ─── GET: webhook verification ───────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ─── Webhook signature verification ─────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET;
  if (!secret) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const expected = `sha256=${hash}`;

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ─── POST: receive story insight events ──────────────────────────────────────

interface StoryInsightsValue {
  media_id: string;
  ig_user_id: string;
  impressions?: number;
  reach?: number;
  taps_forward?: number;
  taps_back?: number;
  exits?: number;
  replies?: number;
  shares?: number;
  follows?: number;
  profile_visits?: number;
}

interface WebhookEntry {
  id: string;
  time: number;
  changes: { field: string; value: StoryInsightsValue }[];
}

export async function POST(req: Request) {
  try {
    // Verify webhook signature from Meta
    const signature = req.headers.get("x-hub-signature-256");
    if (!signature) {
      console.warn("[webhook/instagram] Missing x-hub-signature-256 header");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await req.text();

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[webhook/instagram] Signature verification failed");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = JSON.parse(rawBody) as { object: string; entry: WebhookEntry[] };

    // Only handle instagram_business_account object
    if (body.object !== "instagram") {
      return NextResponse.json({ ok: true });
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "story_insights") continue;

        const v = change.value;
        const { media_id: igMediaId, ig_user_id: igUserId } = v;
        if (!igMediaId || !igUserId) continue;

        // Find the SocialAccount by Instagram user ID
        const account = await prisma.socialAccount.findUnique({
          where: { platformUserId: igUserId },
          select: { id: true },
        });
        if (!account) continue;

        // Upsert MediaInsightSnapshot for STORY type
        // The webhook payload uses v17 field names — map to v25 equivalents:
        //   impressions/reach (v17) → views/reach (v25)
        //   taps_forward → navigationForward, taps_back → navigationBack
        //   exits → navigationExit
        await prisma.mediaInsightSnapshot.upsert({
          where: { igMediaId },
          create: {
            socialAccountId: account.id,
            igMediaId,
            mediaType: "STORY",
            views: v.impressions ?? null,
            reach: v.reach ?? null,
            shares: v.shares ?? null,
            follows: v.follows ?? null,
            profileVisits: v.profile_visits ?? null,
            replies: v.replies ?? null,
            navigationForward: v.taps_forward ?? null,
            navigationBack: v.taps_back ?? null,
            navigationExit: v.exits ?? null,
          },
          update: {
            fetchedAt: new Date(),
            views: v.impressions ?? null,
            reach: v.reach ?? null,
            shares: v.shares ?? null,
            follows: v.follows ?? null,
            profileVisits: v.profile_visits ?? null,
            replies: v.replies ?? null,
            navigationForward: v.taps_forward ?? null,
            navigationBack: v.taps_back ?? null,
            navigationExit: v.exits ?? null,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/instagram] Processing error:", err);
    // Return 500 so Meta retries on real errors
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
