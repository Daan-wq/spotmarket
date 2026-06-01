import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, Niche } from "@prisma/client";
import { z } from "zod";
import { ratePerKToCpv } from "@/lib/campaign-edit";
import {
  ensureDiscordCampaignResources,
  removeDiscordCampaignRole,
} from "@/lib/discord-campaign-roles";
import { sendCampaignAnnouncementOnce } from "@/lib/admin/discord-campaign-announcements";

function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) => (typeof value === "bigint" ? Number(value) : value))
  );
}

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  brandId: z.string().optional().nullable(),
  pricingTemplateId: z.string().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  contentType: z.string().max(100).optional().nullable(),
  contentGuidelines: z.string().max(5000).optional().nullable(),
  requirements: z.string().max(2000).optional().nullable(),
  otherNotes: z.string().max(2000).optional().nullable(),
  pageStats: z.string().max(2000).optional().nullable(),
  minAge: z.string().max(10).optional().nullable(),
  referralLink: z.string().optional().nullable(),
  bannerUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
  bannerVideoUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
  briefAssetUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
  guidelinesUrl: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || /^https?:\/\//.test(v), "Must be a valid URL"),
  contentAssetUrls: z.array(z.string().url()).optional(),
  requiredHashtags: z.array(z.string()).optional(),
  targetCountry: z.string().optional().nullable(),
  targetCountryPercent: z.number().int().min(0).max(100).optional().nullable(),
  targetMinAge18Percent: z.number().int().min(0).max(100).optional().nullable(),
  targetMalePercent: z.number().int().min(0).max(100).optional().nullable(),
  minFollowers: z.number().int().min(0).optional(),
  minEngagementRate: z.number().min(0).max(100).optional(),
  bioRequirement: z.string().optional().nullable(),
  linkInBioRequired: z.string().optional().nullable(),
  totalBudget: z.number().positive().optional(),
  goalViews: z.number().int().positive().optional().nullable(),
  minimumPaidViews: z.number().int().min(0).optional(),
  maximumPaidViews: z.number().int().min(0).optional().nullable(),
  creatorRatePerK: z.number().min(0).optional(),
  adminMarginPerK: z.number().min(0).optional(),
  maxSlots: z.number().int().positive().optional().nullable(),
  requiresApproval: z.boolean().optional(),
  status: z.enum(["draft", "pending_payment", "pending_review", "active", "paused", "completed", "cancelled"]).optional(),
  deadline: z.string().optional().nullable(),
  startsAt: z.string().optional().nullable(),
  niche: z
    .string()
    .nullable()
    .optional()
    .transform((v) => {
      if (v == null) return v;
      const trimmed = v.trim();
      if (trimmed === "") return null;
      const first = trimmed.split(",")[0]!.trim().toUpperCase();
      return (Object.values(Niche) as string[]).includes(first) ? (first as Niche) : null;
    }),
  platforms: z.array(z.enum(["INSTAGRAM", "TIKTOK", "YOUTUBE_SHORTS", "FACEBOOK", "X"])).optional(),
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

  const {
    deadline,
    startsAt,
    platforms,
    goalViews,
    minEngagementRate,
    creatorRatePerK,
    adminMarginPerK,
    ...rest
  } = parsed.data;
  const shouldRemoveDiscordRoles =
    rest.status === "completed" || rest.status === "cancelled";
  const shouldProvisionDiscordResources = rest.status === "active";
  const discordMembers = shouldRemoveDiscordRoles
    ? await prisma.campaignApplication.findMany({
        where: { campaignId },
        select: {
          creatorProfile: {
            select: {
              user: { select: { discordId: true } },
            },
          },
        },
      })
    : [];

  const nextMinimumPaidViews =
    rest.minimumPaidViews ?? authorized.campaign.minimumPaidViews;
  const nextMaximumPaidViews =
    rest.maximumPaidViews !== undefined
      ? rest.maximumPaidViews
      : authorized.campaign.maximumPaidViews;
  if (
    nextMaximumPaidViews !== null &&
    nextMaximumPaidViews !== undefined &&
    nextMaximumPaidViews < nextMinimumPaidViews
  ) {
    return NextResponse.json(
      { error: "Maximum paid views must be blank or greater than or equal to minimum paid views" },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = { ...rest };
  if (deadline) data.deadline = new Date(deadline);
  if (startsAt !== undefined) data.startsAt = startsAt ? new Date(startsAt) : null;
  if (platforms) {
    data.platforms = platforms as Platform[];
  }
  if (goalViews !== undefined) data.goalViews = goalViews ? BigInt(goalViews) : null;
  if (minEngagementRate !== undefined) data.minEngagementRate = minEngagementRate;
  if (creatorRatePerK !== undefined || adminMarginPerK !== undefined) {
    const nextCreatorRatePerK = creatorRatePerK ?? Number(authorized.campaign.creatorCpv) * 1_000;
    const nextAdminMarginPerK = adminMarginPerK ?? Number(authorized.campaign.adminMargin) * 1_000;
    const creatorCpv = ratePerKToCpv(nextCreatorRatePerK);
    const adminMargin = ratePerKToCpv(nextAdminMarginPerK);
    data.creatorCpv = creatorCpv;
    data.adminMargin = adminMargin;
    data.businessCpv = creatorCpv + adminMargin;
  }

  try {
    let discordProvisioning:
      | {
          roleId: string;
          channelId: string;
          roleCreated: boolean;
          channelCreated: boolean;
        }
      | undefined;

    if (shouldProvisionDiscordResources) {
      discordProvisioning = await ensureDiscordCampaignResources({
        ...authorized.campaign,
        name: typeof data.name === "string" ? data.name : authorized.campaign.name,
        discordRoleId: authorized.campaign.discordRoleId,
        discordChannelId: authorized.campaign.discordChannelId,
      });
      data.discordRoleId = discordProvisioning.roleId;
      data.discordChannelId = discordProvisioning.channelId;
    }

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data,
    });

    let discordAnnouncement:
      | Awaited<ReturnType<typeof sendCampaignAnnouncementOnce>>
      | { status: "failed"; error: string }
      | undefined;

    if (shouldProvisionDiscordResources) {
      try {
        discordAnnouncement = await sendCampaignAnnouncementOnce({
          campaign: updated,
          userId: authorized.user.id,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Discord announcement failed";
        discordAnnouncement = { status: "failed", error: message };
        return NextResponse.json(
          serialize({
            ...updated,
            error: message,
            discordAnnouncement,
            discordProvisioning,
          }),
          { status: 502 },
        );
      }
    }

    let discordRoleSync:
      | { attempted: number; failed: number }
      | undefined;
    if (shouldRemoveDiscordRoles) {
      const discordIds = discordMembers
        .map((member) => member.creatorProfile?.user.discordId)
        .filter((discordId): discordId is string => !!discordId);
      let failed = 0;

      for (const discordId of discordIds) {
        try {
          await removeDiscordCampaignRole(updated, discordId);
        } catch (err) {
          failed += 1;
          console.error("[PATCH /api/campaigns] Discord role removal failed", err);
        }
      }

      discordRoleSync = { attempted: discordIds.length, failed };
    }

    return NextResponse.json(serialize({ ...updated, discordRoleSync, discordProvisioning, discordAnnouncement }));
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

  const submissionCount = await prisma.campaignSubmission.count({
    where: { campaignId },
  });
  if (submissionCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete campaign with submissions; archive or cancel it instead." },
      { status: 409 },
    );
  }

  const activeCount = await prisma.campaignApplication.count({
    where: { campaignId, status: { in: ["approved", "active"] } },
  });
  if (activeCount > 0) {
    return NextResponse.json({ error: "Cannot delete campaign with active applications" }, { status: 409 });
  }

  try {
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
