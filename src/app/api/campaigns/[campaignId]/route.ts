import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
  );
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  contentGuidelines: z.string().max(5000).optional(),
  status: z.enum(["draft", "active", "paused", "completed", "cancelled"]).optional(),
  deadline: z.string().datetime().optional(),
});

async function getAuthorizedUser(supabaseId: string, campaignId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
  });
  if (!user) return null;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;
  const isAdmin = user.role === "admin";
  if (!isAdmin) return null;
  return { user, campaign };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { _count: { select: { applications: true } }, report: true },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serialize(campaign));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const authorized = await getAuthorizedUser(authUser.id, campaignId);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { deadline, ...rest } = parsed.data;
  try {
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { ...rest, ...(deadline && { deadline: new Date(deadline) }) },
    });
    return NextResponse.json(serialize(updated));
  } catch (err) {
    console.error("[PATCH /api/campaigns]", err);
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const authorized = await getAuthorizedUser(authUser.id, campaignId);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const activeCount = await prisma.campaignApplication.count({
    where: { campaignId, status: { in: ["approved", "active"] } },
  });
  if (activeCount > 0) {
    return NextResponse.json({ error: "Cannot delete campaign with active applications" }, { status: 409 });
  }

  await prisma.campaign.delete({ where: { id: campaignId } });
  return new NextResponse(null, { status: 204 });
}
