import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatCards } from "@/components/admin/stat-cards";
import { EmptyState } from "@/components/admin/empty-state";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminClientsPage() {
  const [clients, activeCnt] = await Promise.all([
    prisma.client.findMany({
      include: { _count: { select: { internalCampaigns: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({
      where: { internalCampaigns: { some: {} } },
    }),
  ]);

  const totalBudget = clients.reduce((sum, c) => sum + Number(c.totalSpent), 0);
  const avgSize = clients.length > 0 ? totalBudget / clients.length : 0;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Brands"
        subtitle="Business clients running campaigns through your network"
        action={{ label: "+ Add client", href: "/admin/clients/new" }}
      />
      <StatCards
        stats={[
          { label: "Total brands", value: clients.length },
          { label: "Active (have campaigns)", value: activeCnt },
          { label: "Total campaign budget", value: `$${totalBudget.toFixed(0)}` },
          { label: "Avg. campaign size", value: `$${avgSize.toFixed(0)}` },
        ]}
      />

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5 border-b border-gray-100">
          {["Name", "Contact", "Channel", "Campaigns", "Total Spent"].map((h) => (
            <p key={h} className="text-[13px] text-gray-400">{h}</p>
          ))}
        </div>

        {clients.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
              </svg>
            }
            title="No brands yet"
            description="Add your first client to start tracking their campaigns, budgets, and spending."
            actions={[{ label: "+ Add client", href: "/admin/clients/new", variant: "primary" }]}
          />
        ) : (
          <div>
            {clients.map((client, i) => (
              <div
                key={client.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-[14px] font-medium text-gray-900 hover:underline"
                  >
                    {client.name}
                  </Link>
                  {client.company && (
                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">{client.company}</p>
                  )}
                </div>
                <p className="text-[14px] text-gray-500 whitespace-nowrap">{client.contactName ?? "—"}</p>
                <div>
                  {client.communicationHandle ? (
                    <MessageButton
                      channel={client.communicationChannel as Channel}
                      handle={client.communicationHandle}
                    />
                  ) : (
                    <span className="text-[13px] text-gray-300">—</span>
                  )}
                </div>
                <p className="text-[14px] text-gray-500 text-center">{client._count.internalCampaigns}</p>
                <p className="text-[14px] font-medium text-gray-900 text-right">
                  ${Number(client.totalSpent).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
