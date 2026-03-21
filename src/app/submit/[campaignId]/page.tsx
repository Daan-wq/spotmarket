import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SubmitPostForm } from "./submit-post-form";

interface Props {
  params: Promise<{ campaignId: string }>;
}

export default async function SubmitPostPage({ params }: Props) {
  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, status: "active" },
    select: { id: true, name: true, deadline: true },
  });
  if (!campaign) notFound();

  return <SubmitPostForm campaign={campaign} />;
}
