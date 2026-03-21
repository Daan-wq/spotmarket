import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: {
      networkProfile: {
        include: {
          _count: { select: { members: true } },
          applications: {
            where: { status: { in: ["approved", "active"] } },
            include: {
              campaign: { select: { name: true, creatorCpv: true } },
              _count: { select: { posts: true } },
            },
          },
        },
      },
    },
  });

  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const totalEarned = network.applications.reduce((sum, a) => sum + a.earnedAmount, 0);
  const totalPaid = network.applications.reduce((sum, a) => sum + a.paidAmount, 0);
  const unpaid = totalEarned - totalPaid;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{network.companyName}</h1>
      <p className="text-gray-500 text-sm mb-8">Network dashboard</p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <StatCard label="Members" value={network._count.members} />
        <StatCard label="Active Campaigns" value={network.applications.length} />
        <StatCard label="Unpaid Earnings" value={`€${(unpaid / 100).toFixed(2)}`} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h2>
      <div className="space-y-3">
        {network.applications.map((app) => (
          <div key={app.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">{app.campaign.name}</p>
              <p className="text-sm text-gray-500">{app._count.posts} posts</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">€{(app.earnedAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400">earned</p>
            </div>
          </div>
        ))}
        {network.applications.length === 0 && (
          <p className="text-gray-400 text-sm">No active campaigns yet.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
