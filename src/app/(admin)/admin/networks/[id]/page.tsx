import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { NetworkApprovalButtons } from "./network-approval-buttons";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminNetworkDetailPage({ params }: Props) {
  const { id } = await params;

  const network = await prisma.networkProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true } },
      members: { orderBy: { joinedAt: "desc" } },
      applications: {
        include: { campaign: { select: { name: true } } },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!network) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{network.companyName}</h1>
          <p className="text-gray-500 text-sm">
            {network.user.email} · Invite:{" "}
            <span className="font-mono">{appUrl}/join/{network.inviteCode}</span>
          </p>
        </div>
        <NetworkApprovalButtons networkId={network.id} isApproved={network.isApproved} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Members</p>
          <p className="text-xl font-bold">{network.members.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Campaigns</p>
          <p className="text-xl font-bold">{network.applications.length}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-400">Self-reported size</p>
          <p className="text-xl font-bold">{network.networkSize ?? "—"}</p>
        </div>
      </div>

      {network.description && (
        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-sm text-gray-700">
          {network.description}
        </div>
      )}

      <h2 className="font-semibold mb-4">Members ({network.members.length})</h2>
      <div className="space-y-2 mb-8">
        {network.members.map((m) => (
          <div
            key={m.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between text-sm"
          >
            <span className="font-medium">@{m.igUsername ?? "—"}</span>
            <span className="text-gray-400">
              {m.igFollowerCount?.toLocaleString() ?? "—"} followers ·{" "}
              {m.igIsConnected ? (
                <span className="text-green-600">Connected</span>
              ) : (
                <span className="text-gray-400">Pending</span>
              )}
            </span>
          </div>
        ))}
        {network.members.length === 0 && (
          <p className="text-gray-400 text-sm">No members yet.</p>
        )}
      </div>

      <h2 className="font-semibold mb-4">Campaigns ({network.applications.length})</h2>
      <div className="space-y-2">
        {network.applications.map((a) => (
          <div
            key={a.id}
            className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex justify-between text-sm"
          >
            <span>{a.campaign.name}</span>
            <span className="text-gray-400">{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
