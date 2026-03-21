import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { MessageThread } from "./message-thread";

export default async function CampaignMessagesPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const { campaignId } = await params;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { id: true } } },
  });
  if (!user?.creatorProfile) redirect("/onboarding");

  const application = await prisma.campaignApplication.findFirst({
    where: {
      campaignId,
      creatorProfileId: user.creatorProfile.id,
      status: { in: ["approved", "active", "completed"] },
    },
  });

  if (!application) notFound();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) notFound();

  const messages = await prisma.message.findMany({
    where: { campaignId },
    include: {
      sender: {
        select: {
          id: true,
          supabaseId: true,
          role: true,
          creatorProfile: { select: { displayName: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Get campaign creator (admin) for messages
  const campaign_creator = await prisma.user.findFirst({
    where: { role: "admin" },
    select: { id: true },
  });
  const businessUserId = campaign_creator?.id || "";

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="font-semibold text-gray-900">{campaign.name}</h1>
        <p className="text-xs text-gray-500">Campaign</p>
      </div>
      <MessageThread
        campaignId={campaignId}
        currentUserId={user.id}
        recipientId={businessUserId}
        initialMessages={messages as any}
      />
    </div>
  );
}
