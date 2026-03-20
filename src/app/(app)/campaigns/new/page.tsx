import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { businessProfile: true },
  });

  if (!user) redirect("/sign-in");

  // Auto-create business profile if missing
  if (!user.businessProfile) {
    await prisma.businessProfile.create({
      data: {
        userId: user.id,
        companyName: "My Company",
        isApproved: true,
      },
    });
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Create Campaign</h1>
      <CampaignForm />
    </div>
  );
}
