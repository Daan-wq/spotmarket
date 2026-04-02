import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, role: true, creatorProfile: { select: { id: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.creatorProfile) return NextResponse.json({ error: "Not a creator" }, { status: 403 });

    const applications = await prisma.campaignApplication.findMany({
      where: {
        creatorProfileId: user.creatorProfile.id,
        status: "approved",
      },
      include: {
        campaign: {
          select: {
            id: true,
            name: true,
            contentGuidelines: true,
            requirements: true,
            deadline: true,
            creatorCpv: true,
            bannerUrl: true,
            bannerVideoUrl: true,
            contentAssetUrls: true,
            platform: true,
            status: true,
          },
        },
      },
    });

    const result = applications
      .filter((app) => app.campaign && app.campaign.status === "active")
      .map((app) => ({
        campaign: app.campaign!,
        applicationId: app.id,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /autopost/campaigns error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
