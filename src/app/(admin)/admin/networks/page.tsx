import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

export default async function AdminNetworksPage() {
  const [networks, connectedCount, onCampaigns] = await Promise.all([
    prisma.networkProfile.findMany({
      include: {
        user: { select: { email: true } },
        _count: { select: { members: true, applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.networkProfile.count({ where: { isApproved: true } }),
    prisma.networkProfile.count({
      where: { applications: { some: { status: { in: ["active", "approved"] } } } },
    }),
  ]);

  const totalMembers = networks.reduce((sum, n) => sum + n._count.members, 0);

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Networks"
        subtitle="Network owners who bring their creator roster to the platform"
        action={{ label: "+ Invite network", href: "#invite-network" }}
      />
      <StatCards
        stats={[
          { label: "Network partners", value: networks.length },
          { label: "Total members", value: totalMembers },
          { label: "Approved", value: connectedCount },
          { label: "On campaigns", value: onCampaigns },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Company", "Contact", "Members", "Status", ""].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {networks.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            }
            title="No network partners yet"
            description="Network owners like clipping agencies can partner with you to bring their entire creator network."
            actions={[{ label: "+ Invite network", href: "#invite-network", variant: "primary" }]}
          />
        ) : (
          <div>
            {networks.map((n, i) => (
              <div
                key={n.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-gray-900">{n.companyName}</p>
                  <p className="text-[12px] text-gray-400">{n.user.email}</p>
                </div>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{n.contactName}</p>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{n._count.members}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium whitespace-nowrap ${
                    n.isApproved ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {n.isApproved ? "Approved" : "Pending"}
                </span>
                <Link href={`/admin/networks/${n.id}`} className="text-xs text-indigo-600 hover:underline whitespace-nowrap">
                  View →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
