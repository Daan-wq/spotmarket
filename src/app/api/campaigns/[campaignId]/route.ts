import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";
import { z } from "zod";
import { notifyCampaignLive } from "@/lib/discord";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
  );
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  contentGuidelines: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  referralLink: z.string().optional().nullable(),
  targetCountry: z.string().optional().nullable(),
  minEngagementRate: z.number().min(0).max(100).optional(),
  bioRequirement: z.string().optional().nullable(),
  linkInBioRequired: z.string().optional().nullable(),
  totalBudget: z.number().positive().optional(),
  goalViews: z.number().int().positive().optional().nullable(),
  maxSlots: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
  status: z.enum(["draft", "active", "paused", "completed", "cancelled"]).optional(),
  deadline: z.string().optional().nullable(),
  niche: z.string().optional().nullable(),
  platforms: z.array(z.string()).optional(),
  contentType: z.string().max(100).optional().nullable(),
  otherNotes: z.string().max(2000).optional().nullable(),
  pageStats: z.string().max(2000).optional().nullable(),
  minAge: z.string().max(10).optional().nullable(),
});

async function getAuthorizedAdmin(supabaseId: string, campaignId: string) {
  const user = await prisma.user.findUnique({
    where: { supabaseId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "admin") return null;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;
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
    include: { _count: { select: { applications: true } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true, role: true, creatorProfile: { select: { id: true } } },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "admin") {
    return NextResponse.json(serialize(campaign));
  }

  // Creator: must be active OR have an existing application
  const hasApplied = user.creatorProfile
    ? !!(await prisma.campaignApplication.findFirst({
        where: { campaignId, creatorProfileId: user.creatorProfile.id },
        select: { id: true },
      }))
    : false;

  if (campaign.status !== "active" && !hasApplied) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip sensitive financial fields for creators
  const { businessCpv: _businessCpv, totalBudget: _totalBudget, ...publicFields } = campaign;
  void _businessCpv; void _totalBudget;
  return NextResponse.json(serialize(publicFields));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campaignId } = await params;
  const authorized = await getAuthorizedAdmin(authUser.id, campaignId);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { deadline, platforms, goalViews, minEngagementRate, ...rest } = parsed.data;
  const wasActive = authorized.campaign.status !== "active" && rest.status === "active";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { ...rest };
  if (deadline) data.deadline = new Date(deadline);
  if (platforms) {
    data.platforms = platforms as Platform[];
    data.platform = (platforms[0] ?? authorized.campaign.platform) as Platform;
  }
  if (goalViews !== undefined) data.goalViews = goalViews ? BigInt(goalViews) : null;
  if (minEngagementRate !== undefined) data.minEngagementRate = minEngagementRate;

  try {
    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data,
    });

    if (wasActive) {
      await notifyCampaignLive({
        id: updated.id,
        name: updated.name,
        platform: updated.platform,
        totalBudget: Number(updated.totalBudget),
        businessCpv: Number(updated.businessCpv),
        targetCountry: updated.targetCountry,
        minEngagementRate: Number(updated.minEngagementRate),
      });
    }

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
  const authorized = await getAuthorizedAdmin(authUser.id, campaignId);
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const activeCount = await prisma.campaignApplication.count({
    where: { campaignId, status: { in: ["approved", "active"] } },
  });
  if (activeCount > 0) {
    return NextResponse.json({ error: "Cannot delete campaign with active applications" }, { status: 409 });
  }

  try {
    // Delete submissions directly linked to this campaign (avoids FK constraint on campaignId)
    await prisma.campaignSubmission.deleteMany({ where: { campaignId } });
    // Delete all applications (Payouts.applicationId is optional → SetNull on DB level)
    await prisma.campaignApplication.deleteMany({ where: { campaignId } });
    // Now safe to delete the campaign
    await prisma.campaign.delete({ where: { id: campaignId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/campaigns]", err);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
