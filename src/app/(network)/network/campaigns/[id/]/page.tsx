import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { NetworkCampaignDetail } from "./network-campaign-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function NetworkCampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      networkProfile: {
        include: { members: { where: { isActive: true } } },
      },
    },
  });
  if (!dbUser?.networkProfile) redirect("/onboarding");

  const campaign = await prisma.campaign.findUnique({
    where: { id },
  });
  if (!campaign) notFound();

  const application = await prisma.campaignApplication.findFirst({
    where: { campaignId: id, networkId: dbUser.networkProfile.id },
    include: {
      assignedMembers: { include: { member: true } },
      posts: true,
    },
  });

  return (
    <NetworkCampaignDetail
      campaign={campaign}
      application={application}
      network={dbUser.networkProfile}
      members={dbUser.networkProfile.members}
    />
  );
}
