import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkEarningsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });
  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const [applications, payouts] = await Promise.all([
    prisma.campaignApplication.findMany({
      where: { networkId: network.id },
      include: { campaign: { select: { name: true } } },
    }),
    prisma.payout.findMany({
      where: { networkId: network.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalEarned = applications.reduce((s, a) => s + a.earnedAmount, 0);
  const totalPaid = applications.reduce((s, a) => s + a.paidAmount, 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Earnings</h1>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Earned</p>
          <p className="text-2xl font-bold">€{(totalEarned / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold">€{(totalPaid / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Unpaid Balance</p>
          <p className="text-2xl font-bold text-blue-600">
            €{((totalEarned - totalPaid) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">By Campaign</h2>
      <div className="space-y-3 mb-10">
        {applications.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between"
          >
            <p className="font-medium">{a.campaign.name}</p>
            <div className="text-right">
              <p className="font-semibold">€{(a.earnedAmount / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-400">€{(a.paidAmount / 100).toFixed(2)} paid</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-4">Payout History</h2>
      <div className="space-y-3">
        {payouts.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between"
          >
            <div>
              <p className="font-medium">€{Number(p.amount).toFixed(2)}</p>
              <p className="text-xs text-gray-400">
                {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                p.status === "confirmed"
                  ? "bg-green-100 text-green-700"
                  : p.status === "sent"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {p.status}
            </span>
          </div>
        ))}
        {payouts.length === 0 && (
          <p className="text-gray-400 text-sm">No payouts yet.</p>
        )}
      </div>
    </div>
  );
}
