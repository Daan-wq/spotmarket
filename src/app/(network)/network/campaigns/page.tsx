import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function NetworkCampaignsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });
  if (!dbUser?.networkProfile) redirect("/onboarding");
  const network = dbUser.networkProfile;

  const [campaigns, myApplications] = await Promise.all([
    prisma.campaign.findMany({
      where: { status: "active", deadline: { gt: new Date() } },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.campaignApplication.findMany({
      where: { networkId: network.id },
      select: { campaignId: true, status: true },
    }),
  ]);

  const appliedIds = new Set(myApplications.map((a) => a.campaignId));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Campaign Marketplace</h1>
      <div className="grid gap-4">
        {campaigns.map((campaign) => {
          const hasClaimed = appliedIds.has(campaign.id);
          return (
            <div
              key={campaign.id}
              className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">{campaign.name}</p>
                <p className="text-sm text-gray-500">Campaign</p>
                <p className="text-sm text-gray-400 mt-1">
                  ${(Number(campaign.creatorCpv) * 1_000_000).toFixed(0)}/1M views · Deadline:{" "}
                  {new Date(campaign.deadline).toLocaleDateString()}
                </p>
              </div>
              <div>
                {hasClaimed ? (
                  <Link href={`/network/campaigns/${campaign.id}`}>
                    <span className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg">
                      Claimed →
                    </span>
                  </Link>
                ) : (
                  <Link href={`/network/campaigns/${campaign.id}`}>
                    <span className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      View &amp; Claim
                    </span>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {campaigns.length === 0 && (
          <p className="text-gray-400 text-sm">No active campaigns available.</p>
        )}
      </div>
    </div>
  );
}
