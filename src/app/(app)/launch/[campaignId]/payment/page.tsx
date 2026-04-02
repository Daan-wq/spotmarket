import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PaymentForm } from "./payment-form";

export const metadata = { title: "Send Payment" };

export default async function PaymentPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } });
  if (!user) redirect("/sign-in");

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
      totalBudget: true,
      goalViews: true,
      status: true,
      depositTxHash: true,
      createdByUserId: true,
    },
  });

  if (!campaign) redirect("/dashboard");
  if (campaign.createdByUserId !== user.id && user.role !== "admin") redirect("/dashboard");

  // If already past payment stage, redirect to dashboard
  if (campaign.status !== "pending_payment" && campaign.status !== "pending_review") {
    redirect("/dashboard");
  }

  const adminWallet = process.env.ADMIN_TRON_WALLET ?? null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Send Payment</h1>
        <p className="text-sm text-gray-500 mt-1">Campaign: <span className="font-medium text-gray-700">{campaign.name}</span></p>
      </div>

      <PaymentForm
        campaignId={campaign.id}
        requiredUsdt={Number(campaign.totalBudget)}
        adminWalletAddress={adminWallet}
        alreadySubmitted={campaign.status === "pending_review"}
        existingTxHash={campaign.depositTxHash ?? undefined}
      />
    </div>
  );
}
