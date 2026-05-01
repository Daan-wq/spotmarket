import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReviewTabs } from "./_components/review-tabs";

export default async function ReviewLayout({ children }: { children: React.ReactNode }) {
  await requireAuth("admin");

  const [videos, demographics, applications] = await Promise.all([
    prisma.campaignSubmission.count({ where: { status: "PENDING" } }),
    prisma.tikTokDemographicSubmission.count({ where: { status: "PENDING" } }),
    prisma.campaignApplication.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>Review queue</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Approve or reject creator submissions across all kinds.
        </p>
      </div>
      <ReviewTabs counts={{ videos, demographics, applications }} />
      <div>{children}</div>
    </div>
  );
}
