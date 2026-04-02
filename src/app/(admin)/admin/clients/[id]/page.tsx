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
    draft:     { bg: "var(--bg-secondary)", color: "var(--text-secondary)" },
    confirmed: { bg: "var(--accent-bg)", color: "var(--accent)" },
    scheduled: { bg: "var(--accent-bg)", color: "var(--accent)" },
    live:      { bg: "var(--success-bg)", color: "var(--success)" },
    completed: { bg: "var(--success-bg)", color: "var(--success)" },
    cancelled: { bg: "var(--error-bg)", color: "var(--error-text)" },
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/admin/clients" className="text-sm mb-4 inline-block" style={{ color: "var(--text-secondary)" }}>
        ← Back to Clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>{client.name}</h1>
          {client.company && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{client.company}</p>
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
            style={{ background: "var(--bg-secondary)", color: "var(--card-foreground)" }}
          >
            Edit
          </Link>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        {[
          { label: "Contact", value: client.contactName ?? "—" },
          { label: "Email", value: client.email ?? "—" },
          { label: "Phone", value: client.phone ?? "—" },
          { label: "Country", value: client.country ?? "—" },
        ].map((item) => (
          <div key={item.label} className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{item.label}</p>
            <p className="text-sm font-medium mt-0.5 truncate" style={{ color: "var(--text-primary)" }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden mb-8" style={{ background: "var(--border)" }}>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--accent)" }}>{client.internalCampaigns.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Campaigns</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--success)" }}>${totalIn.toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Total Received</p>
        </div>
        <div className="px-5 py-4" style={{ background: "var(--bg-elevated)" }}>
          <p className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>${Number(client.totalSpent).toFixed(2)}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>Total Spent</p>
        </div>
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="rounded-xl p-4 mb-8" style={{ background: "var(--bg-primary)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>NOTES</p>
          <p className="text-sm" style={{ color: "var(--card-foreground)" }}>{client.notes}</p>
        </div>
      )}

      {/* Campaigns */}
      <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottomColor: 'var(--border)', borderBottomWidth: '1px', background: "var(--bg-elevated)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Campaigns</p>
          <Link href="/admin/internal-campaigns/new" className="text-xs" style={{ color: "var(--accent)" }}>+ New</Link>
        </div>
        {client.internalCampaigns.length === 0 ? (
          <div className="px-5 py-8 text-center" style={{ background: "var(--bg-elevated)" }}>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No campaigns yet.</p>
          </div>
        ) : (
          <div style={{ background: "var(--bg-elevated)" }}>
            {client.internalCampaigns.map((c, i) => {
              const margin = Number(c.clientPays) - Number(c.totalPageCost);
              const s = statusStyle[c.status] ?? { bg: "var(--bg-secondary)", color: "var(--text-secondary)" };
              return (
                <Link
                  key={c.id}
                  href={`/admin/internal-campaigns/${c.id}`}
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderTop: i > 0 ? `1px solid var(--bg-primary)` : undefined }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
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
