import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ContactClient } from "./_components/contact-client";

export default async function ContactBrandPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const { userId } = await requireAuth("creator");

  const user = await prisma.user.findUnique({
    where: { supabaseId: userId },
    select: { id: true },
  });
  if (!user) throw new Error("User not found");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      createdByUserId: true,
    },
  });
  if (!campaign) notFound();

  // Get creator's submissions for this campaign
  const submissions = await prisma.campaignSubmission.findMany({
    where: { campaignId, creatorId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      postUrl: true,
      status: true,
      createdAt: true,
      campaign: { select: { platform: true } },
    },
  });

  if (submissions.length === 0) {
    // Gate: no submissions yet
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto" style={{ color: "var(--text-muted)" }}>
            <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
          </svg>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>No Submissions Yet</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            You need to create content on this campaign first before contacting the brand
          </p>
          <Link
            href={`/creator/campaigns/${campaignId}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--primary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect width="15" height="14" x="1" y="5" rx="2" ry="2" />
            </svg>
            Submit a Video
          </Link>
        </div>
      </div>
    );
  }

  // Get existing messages
  const messages = await prisma.message.findMany({
    where: {
      campaignId,
      OR: [{ senderId: user.id }, { receiverId: user.id }],
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderId: true,
      content: true,
      createdAt: true,
    },
  });

  const brandName = campaign.name;
  const brandUserId = campaign.createdByUserId ?? "";

  if (!brandUserId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>No owner</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            This campaign has no owner — please contact support.
          </p>
        </div>
      </div>
    );
  }

  const submissionCards = submissions.map((s) => ({
    id: s.id,
    platform: s.campaign.platform,
    postUrl: s.postUrl,
    status: s.status,
    date: s.createdAt.toISOString(),
  }));

  const messageItems = messages.map((m) => ({
    id: m.id,
    isMe: m.senderId === user.id,
    content: m.content,
    date: m.createdAt.toISOString(),
  }));

  return (
    <ContactClient
      campaignId={campaignId}
      brandName={brandName}
      brandUserId={brandUserId}
      currentUserId={user.id}
      submissions={submissionCards}
      messages={messageItems}
    />
  );
}
