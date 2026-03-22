import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageCard } from "./page-card";

export default async function PagesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { supabaseId: authUser.id },
    include: {
      creatorProfile: {
        include: {
          socialAccounts: { where: { isActive: true }, orderBy: { followerCount: "desc" } },
        },
      },
    },
  });

  if (!user?.creatorProfile) redirect("/onboarding");

  const pages = user.creatorProfile.socialAccounts;
  const totalFollowers = pages.reduce((s, p) => s + p.followerCount, 0);
  const activeCampaigns = pages.reduce((s, p) => s + p.activeCampaigns, 0);
  const totalEarnings = pages.reduce((s, p) => s + p.totalEarnings, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Pages</h1>
          <p className="text-sm text-gray-500 mt-1">Connect and manage your Instagram pages</p>
        </div>
        <Link
          href="/api/auth/instagram"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Connect Page
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Pages", value: pages.length },
          { label: "Total Followers", value: totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : String(totalFollowers) },
          { label: "Active Campaigns", value: String(activeCampaigns) },
          { label: "Total Earnings", value: `€${(totalEarnings / 100).toFixed(2)}` },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Page grid */}
      {pages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="mb-4">No pages connected yet</p>
          <Link href="/api/auth/instagram" className="text-blue-600 hover:underline">
            Connect your first Instagram page
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map(page => <PageCard key={page.id} page={page} />)}
        </div>
      )}
    </div>
  );
}
