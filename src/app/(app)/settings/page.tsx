import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PasswordForm } from "./password-form";
import { NotificationsForm } from "./notifications-form";
import { PrivacyForm } from "./privacy-form";
import { BillingSection } from "./billing-section";
import { DeleteAccountForm } from "./delete-account-form";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const params = await searchParams;

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: true },
  });

  const stripeAccountId = user?.creatorProfile?.stripeAccountId ?? null;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm mt-1 text-gray-500">Manage your account preferences and security.</p>
      </div>

      {params.stripe === "success" && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-green-500 bg-green-50">
          <p className="text-sm text-green-700">Stripe account connected successfully.</p>
        </div>
      )}
      {params.stripe === "refresh" && (
        <div className="px-4 py-3 rounded-lg border-l-[3px] border-yellow-500 bg-yellow-50">
          <p className="text-sm text-yellow-700">Stripe onboarding was interrupted. Please try connecting again.</p>
        </div>
      )}

      <PasswordForm />

      <NotificationsForm
        initialCampaignAlerts={user?.notifyCampaignAlerts ?? true}
        initialPayoutAlerts={user?.notifyPayoutAlerts ?? true}
      />

      <PrivacyForm initialPublic={user?.profilePublic ?? true} />

      <BillingSection stripeAccountId={stripeAccountId} />

      <DeleteAccountForm />
    </div>
  );
}
