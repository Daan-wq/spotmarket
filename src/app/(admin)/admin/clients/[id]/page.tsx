import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageButton } from "@/components/admin/message-button";

type Channel = "whatsapp" | "telegram" | "instagram" | "email" | "signal";

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      internalCampaigns: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!client) notFound();

  const totalIn = client.payments
    .filter((p) => p.direction === "in" && (p.status === "confirmed" || p.status === "sent"))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const statusStyle: Record<string, { bg: string; color: string }> = {
    draft:     { bg: "#f3f4f6", color: "#6b7280" },
    confirmed: { bg: "#eff6ff", color: "#1d4ed8" },
    scheduled: { bg: "#f5f3ff", color: "#7c3aed" },
    live:      { bg: "#f0fdf4", color: "#15803d" },
    completed: { bg: "#f0fdf4", color: "#15803d" },
    cancelled: { bg: "#fef2f2", color: "#b91c1c" },
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/clients" className="text-sm mb-4 inline-block" style={{ color: "#6b7280" }}>
        ← Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0f172a" }}>{client.name}</h1>
          {client.company && (
            <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{client.company}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {client.communicationHandle && (
            <MessageButton
              channel={client.communicationChannel as Channel}
              handle={client.communicationHandle}
            />
          )}
          <Link
            href={`/admin/clients/${id}/edit`}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "#f3f4f6", color: "#374151" }}
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        {[
          { label: "Contact", value: client.contactName ?? "—" },
          { label: "Email", value: client.email ?? "—" },
          { label: "Phone", value: client.phone ?? "—" },
          { label: "Country", value: client.country ?? "—" },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4" style={{ background: "#ffffff" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>{item.label}</p>
            <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "#0f172a" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "#e2e8f0" }}>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#4f46e5" }}>{client.internalCampaigns.length}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Campaigns</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#16a34a" }}>${totalIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Total Received</p>
        </div>
        <div className="px-5 py-4" style={{ background: "#ffffff" }}>
          <p className="text-2xl font-semibold" style={{ color: "#0f172a" }}>${Number(client.totalSpent).toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "#64748b" }}>Total Spent</p>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#94a3b8" }}>NOTES</p>
          <p className="text-sm" style={{ color: "#374151" }}>{client.notes}</p>
        </div>
      )}

      {/* Campaigns */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid #e2e8f0" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #f1f5f9", background: "#ffffff" }}>
          <p className="text-sm font-medium" style={{ color: "#0f172a" }}>Campaigns</p>
          <Link href="/admin/internal-campaigns/new" className="text-xs" style={{ color: "#4f46e5" }}>+ New</Link>
        </div>
        {client.internalCampaigns.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "#ffffff" }}>
            <p className="text-sm" style={{ color: "#94a3b8" }}>No campaigns yet.</p>
          </div>
        ) : (
          <div style={{ background: "#ffffff" }}>
            {client.internalCampaigns.map((c, i) => {
              const margin = Number(c.clientPays) - Number(c.totalPageCost);
              const s = statusStyle[c.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
              return (
                <Link
                  key={c.id}
                  href={`/admin/internal-campaigns/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderTop: i > 0 ? "1px solid #f8fafc" : undefined }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0f172a" }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      ${Number(c.clientPays).toFixed(2)} · margin ${margin.toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                    {c.status}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
