import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { broadcast, realtimeChannel, REALTIME_EVENTS } from "@/lib/realtime";

const commentSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; postId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 50);

  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: { id: true, email: true, role: true } },
    },
  });

  return NextResponse.json({
    comments,
    nextCursor: comments.length === limit ? comments[comments.length - 1].id : null,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ campaignId: string; postId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId, postId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Verify post exists and belongs to this campaign
  const post = await prisma.campaignPost.findUnique({
    where: { id: postId },
    include: { application: { select: { campaignId: true, creatorProfileId: true } } },
  });

  if (!post || post.application.campaignId !== campaignId) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const comment = await prisma.postComment.create({
    data: {
      postId,
      authorId: user.id,
      content: parsed.data.content,
    },
    include: { author: { select: { id: true, email: true, role: true } } },
  });

  try {
    await broadcast(
      realtimeChannel.post(postId),
      REALTIME_EVENTS.POST_COMMENT_ADDED,
      { postId, campaignId, commentId: comment.id, authorRole: user.role }
    );
  } catch {
    // Non-critical
  }

  return NextResponse.json(comment, { status: 201 });
}
