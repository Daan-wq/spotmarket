import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function NetworkMembersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { networkProfile: true },
  });

  const network = dbUser?.networkProfile;
  if (!network) redirect("/onboarding");

  const members = await prisma.networkMember.findMany({
    where: { networkId: network.id },
    orderBy: { joinedAt: "desc" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Members</h1>
        <div className="bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded-lg">
          Invite link:{" "}
          <span className="font-mono font-semibold">
            {appUrl}/join/{network.inviteCode}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Username</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Followers</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Connected</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  @{m.igUsername ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {m.igFollowerCount?.toLocaleString() ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.igIsConnected
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {m.igIsConnected ? "Connected" : "Pending"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(m.joinedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No members yet. Share your invite link to get started.
          </div>
        )}
      </div>
    </div>
  );
}
