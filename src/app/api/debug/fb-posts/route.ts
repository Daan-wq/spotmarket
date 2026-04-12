import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(req: NextRequest) {
  // Auth check
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "missing connectionId" }, { status: 400 });

  const conn = await prisma.creatorFbConnection.findUnique({
    where: { id: connectionId },
    select: { fbPageId: true, accessToken: true, accessTokenIv: true, pageName: true },
  });
  if (!conn) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  const accessToken = decrypt(conn.accessToken!, conn.accessTokenIv!);
  const pageId = conn.fbPageId;

  const fields = "id,message,type,permalink_url,created_time,reactions.summary(true),comments.summary(true),shares";
  const videoFields = "id,description,permalink_url,created_time,reactions.summary(true),comments.summary(true),shares";

  const [feedRes, videosRes, reelsRes] = await Promise.all([
    fetch(`${GRAPH_BASE}/${pageId}/feed?fields=${fields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/videos?fields=${videoFields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/video_reels?fields=${videoFields}&limit=10&access_token=${accessToken}`),
  ]);

  const [feedText, videosText, reelsText] = await Promise.all([
    feedRes.text(),
    videosRes.text(),
    reelsRes.text(),
  ]);

  return NextResponse.json({
    pageId,
    pageName: conn.pageName,
    tokenPreview: accessToken.slice(0, 20) + "...",
    feed: { status: feedRes.status, body: JSON.parse(feedText) },
    videos: { status: videosRes.status, body: JSON.parse(videosText) },
    reels: { status: reelsRes.status, body: JSON.parse(reelsText) },
  });
}
