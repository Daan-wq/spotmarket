import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";

export default async function AdminDashboard() {
  const [activeCampaigns, totalPages, pendingSubmissions, pendingPayouts] =
    await Promise.all([
      prisma.campaign.count({ where: { status: "active" } }),
      prisma.instagramPage.count(),
      prisma.campaignPost.count({ where: { status: "submitted" } }),
      prisma.payout.count({ where: { status: "pending" } }),
    ]);

  return (
    <div className="p-8 max-w-5xl">
      <PageHeader title="Dashboard" subtitle="Platform overview" />
      <StatCards
        stats={[
          { label: "Active campaigns", value: activeCampaigns },
          { label: "Total pages", value: totalPages },
          { label: "Pending submissions", value: pendingSubmissions },
          { label: "This week's payouts", value: pendingPayouts },
        ]}
      />
    </div>
  );
}
