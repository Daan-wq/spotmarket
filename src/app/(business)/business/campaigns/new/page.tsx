import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CampaignForm } from "@/app/(app)/campaigns/new/campaign-form";

export default async function NewBusinessCampaignPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { businessProfile: true },
  });

  if (!user?.businessProfile) redirect("/onboarding");

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-8" style={{ color: "#0f172a" }}>Create Campaign</h1>
      <CampaignForm />
    </div>
  );
}
