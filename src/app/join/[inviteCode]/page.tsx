import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JoinPageClient } from "./join-page-client";

interface Props {
  params: Promise<{ inviteCode: string }>;
}

export default async function JoinPage({ params }: Props) {
  const { inviteCode } = await params;

  const network = await prisma.networkProfile.findUnique({
    where: { inviteCode, isApproved: true },
    select: { id: true, companyName: true, description: true },
  });

  if (!network) notFound();

  return <JoinPageClient network={network} inviteCode={inviteCode} />;
}
