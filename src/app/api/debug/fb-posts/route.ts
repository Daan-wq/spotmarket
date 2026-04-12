import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

const GRAPH_BASE = "https://graph.facebook.com/v25.0";

export async function GET(req: NextRequest) {
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

  const fields = "id,message,story,status_type,permalink_url,created_time,full_picture,attachments";
  const videoFields = "id,description,title,permalink_url,created_time";

  const [pageCheckRes, publishedPostsRes, postsOnlyRes, feedRes, videosRes, reelsRes] = await Promise.all([
    fetch(`${GRAPH_BASE}/${pageId}?fields=id,name,fan_count&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/published_posts?fields=${fields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/posts?fields=${fields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/feed?fields=${fields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/videos?fields=${videoFields}&limit=10&access_token=${accessToken}`),
    fetch(`${GRAPH_BASE}/${pageId}/video_reels?fields=${videoFields}&limit=10&access_token=${accessToken}`),
  ]);

  const [pageCheckText, publishedText, postsOnlyText, feedText, videosText, reelsText] = await Promise.all([
    pageCheckRes.text(),
    publishedPostsRes.text(),
    postsOnlyRes.text(),
    feedRes.text(),
    videosRes.text(),
    reelsRes.text(),
  ]);

  const parse = (t: string) => { try { return JSON.parse(t); } catch { return { raw: t }; } };

  const pageCheck = { status: pageCheckRes.status, body: parse(pageCheckText) };
  const publishedPosts = { status: publishedPostsRes.status, body: parse(publishedText), count: parse(publishedText).data?.length ?? 0 };
  const posts = { status: postsOnlyRes.status, body: parse(postsOnlyText), count: parse(postsOnlyText).data?.length ?? 0 };
  const feed = { status: feedRes.status, body: parse(feedText), count: parse(feedText).data?.length ?? 0 };
  const videos = { status: videosRes.status, body: parse(videosText), count: parse(videosText).data?.length ?? 0 };
  const reels = { status: reelsRes.status, body: parse(reelsText), count: parse(reelsText).data?.length ?? 0 };

  let hint: string | null = null;
  if (publishedPosts.count === 0 && feed.count === 0 && posts.count === 0) {
    hint =
      "No posts returned. If any edge has an error with code 12 (deprecated), the fields string still references deprecated fields. " +
      "If errors are permission-related, the FB user must be added as Tester in Meta App Dashboard → App Roles and re-run OAuth to get a new token.";
  }

  return NextResponse.json({
    pageId,
    pageName: conn.pageName,
    tokenPreview: accessToken.slice(0, 20) + "...",
    hint,
    pageCheck,
    publishedPosts,
    posts,
    feed,
    videos,
    reels,
  });
}
