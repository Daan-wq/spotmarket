import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LaunchCampaignForm } from "./campaign-form";

export const metadata = { title: "Launch a Campaign" };

export default async function LaunchPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: { creatorProfile: { select: { tronsAddress: true } } },
  });

  if (!user) redirect("/sign-in");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Launch a Campaign</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your campaign details. After submitting you&apos;ll send the budget in USDT and our team will review and activate it.
        </p>
        {!user.creatorProfile?.tronsAddress && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            You don&apos;t have a USDT wallet on file.{" "}
            <a href="/profile" className="font-medium underline">Add one in your profile</a>{" "}
            so we can refund unspent budget when your campaign ends.
          </div>
        )}
      </div>
      <LaunchCampaignForm />
    </div>
  );
}
