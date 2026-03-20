import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  // Ensure admin has a business profile (used as campaign owner in MVP)
  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { businessProfile: true },
  });

  if (!user) redirect("/sign-in");

  // Auto-create business profile for admin if missing
  let businessProfileId = user.businessProfile?.id;
  if (!businessProfileId) {
    const bp = await prisma.businessProfile.create({
      data: {
        userId: user.id,
        companyName: "Admin",
        isApproved: true,
      },
    });
    businessProfileId = bp.id;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Campaign</h1>
      <CampaignForm />
    </div>
  );
}
