import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ScheduleGrid } from "./_components/schedule-grid";

export default async function SchedulePage() {
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
            select: { id: true, platformUsername: true },
          },
          applications: {
            where: { status: "approved" },
            include: {
              campaign: {
                select: { id: true, name: true, bannerUrl: true, status: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user?.creatorProfile) redirect("/onboarding");

  const campaigns = (user.creatorProfile.applications ?? [])
    .filter((a: { campaign: { status: string } | null }) => a.campaign && a.campaign.status === "active")
    .map((a: { campaign: { id: string; name: string; bannerUrl: string | null } }) => a.campaign);

  return (
    <ScheduleGrid
      igAccounts={JSON.parse(JSON.stringify(user.creatorProfile.socialAccounts))}
      campaigns={JSON.parse(JSON.stringify(campaigns))}
    />
  );
}
