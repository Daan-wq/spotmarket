import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { TopHeader } from "@/components/dashboard/top-header";
import { AutoPostClient } from "./_components/autopost-client";

export default async function AutoPostPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: {
            where: { platform: "instagram", isActive: true },
            select: {
              id: true,
              platformUsername: true,
              platformUserId: true,
              followerCount: true,
            },
          },
          applications: {
            where: { status: "approved" },
            include: {
              campaign: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  bannerUrl: true,
                  bannerVideoUrl: true,
                  contentGuidelines: true,
                  requirements: true,
                  contentAssetUrls: true,
                  deadline: true,
                  creatorCpv: true,
                  platform: true,
                  contentType: true,
                  status: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.creatorProfile) redirect("/onboarding");

  // Filter to only apps where campaign is active
  const activeCampaigns = (user.creatorProfile.applications ?? [])
    .filter(app => app.campaign && app.campaign?.status === "active")
    .map(app => ({
      applicationId: app.id,
      campaign: app.campaign!,
    }));

  const igAccounts = user.creatorProfile.socialAccounts;

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-primary)" }}>
      <TopHeader title="AutoPost" userId={authUser.id} />
      <div className="flex-1 overflow-hidden">
        <AutoPostClient
          campaigns={JSON.parse(JSON.stringify(activeCampaigns))}
          igAccounts={JSON.parse(JSON.stringify(igAccounts))}
          userId={user.id}
        />
      </div>
    </div>
  );
}
