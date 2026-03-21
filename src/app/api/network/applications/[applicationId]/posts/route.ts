import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const postSchema = z.object({
  memberId: z.string(),
  postUrl: z.string().url(),
});

function extractInstagramMediaId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}

export async function POST(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await params;
  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const application = await prisma.campaignApplication.findFirst({
    where: { id: applicationId, networkId: dbUser.networkProfile.id },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.networkMember.findFirst({
    where: { id: parsed.data.memberId, networkId: dbUser.networkProfile.id },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const platformPostId = extractInstagramMediaId(parsed.data.postUrl);
  if (!platformPostId) return NextResponse.json({ error: "Invalid Instagram URL" }, { status: 400 });

  const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const post = await prisma.campaignPost.create({
    data: {
      applicationId,
      networkMemberId: parsed.data.memberId,
      postUrl: parsed.data.postUrl,
      platformPostId,
      platform: "instagram",
      status: "submitted",
      isApproved: false,
      autoApproveAt,
    },
  });

  return NextResponse.json({ post }, { status: 201 });
}
