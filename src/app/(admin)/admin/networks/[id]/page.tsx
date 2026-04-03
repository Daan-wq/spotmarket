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
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{network.companyName}</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {network.user.email} · Invite:{" "}
            <span className="font-mono">{appUrl}/join/{network.inviteCode}</span>
          </p>
        </div>
        <NetworkApprovalButtons networkId={network.id} isApproved={network.isApproved} />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Members</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{network.members.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Campaigns</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{network.applications.length}</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: "var(--bg-secondary)" }}>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Self-reported size</p>
          <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{network.networkSize ?? "—"}</p>
        </div>
      </div>

      {network.description && (
        <div className="rounded-xl p-4 mb-8 text-sm" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
          {network.description}
        </div>
      )}

      <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Members ({network.members.length})</h2>
      <div className="space-y-2 mb-8">
        {network.members.map((m) => (
          <div
            key={m.id}
            className="border rounded-lg px-4 py-3 flex justify-between text-sm"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>@{m.igUsername ?? "—"}</span>
            <span style={{ color: "var(--text-muted)" }}>
              {m.igFollowerCount?.toLocaleString() ?? "—"} followers ·{" "}
              {m.igIsConnected ? (
                <span style={{ color: "var(--success)" }}>Connected</span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Pending</span>
              )}
            </span>
          </div>
        ))}
        {network.members.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No members yet.</p>
        )}
      </div>

      <h2 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Campaigns ({network.applications.length})</h2>
      <div className="space-y-2">
        {network.applications.map((a) => (
          <div
            key={a.id}
            className="border rounded-lg px-4 py-3 flex justify-between text-sm"
            style={{ background: "var(--bg-elevated)", borderColor: "var(--border)" }}
          >
            <span style={{ color: "var(--text-primary)" }}>{a.campaign.name}</span>
            <span style={{ color: "var(--text-muted)" }}>{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
