import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminClientsPage() {
  const clients = await prisma.client.findMany({
    include: { _count: { select: { internalCampaigns: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>Clients</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>{clients.length} clients</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="text-sm font-medium px-4 py-2 rounded-lg text-white"
          style={{ background: "#4f46e5" }}
        >
          + Add Client
        </Link>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
        <div
          className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-5 py-2.5"
          style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
        >
          {["Name", "Contact", "Channel", "Campaigns", "Total Spent"].map((h) => (
            <p key={h} className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#94a3b8" }}>
              {h}
            </p>
          ))}
        </div>

        {clients.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No clients yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {clients.map((client, i) => (
              <div
                key={client.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-4"
                style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
              >
                <div className="min-w-0">
                  <Link href={`/admin/clients/${client.id}`} className="text-sm font-medium hover:underline" style={{ color: "#0f172a" }}>
                    {client.name}
                  </Link>
                  {client.company && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "#94a3b8" }}>{client.company}</p>
                  )}
                </div>
                <p className="text-sm whitespace-nowrap" style={{ color: "#64748b" }}>
                  {client.contactName ?? "—"}
                </p>
                <div>
                  {client.communicationHandle ? (
                    <MessageButton
                      channel={client.communicationChannel as Channel}
                      handle={client.communicationHandle}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: "#9ca3af" }}>—</span>
                  )}
                </div>
                <p className="text-sm text-center" style={{ color: "#64748b" }}>
                  {client._count.internalCampaigns}
                </p>
                <p className="text-sm font-medium text-right" style={{ color: "#0f172a" }}>
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
