"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" };

interface Client { id: string; name: string }
interface Page { id: string; handle: string }
interface Campaign { id: string; name: string }
interface Network { id: string; platform: string; accountLabel: string }

export default function NewPaymentPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);

  const [form, setForm] = useState({
    direction: "in",
    amount: "",
    currency: "USD",
    status: "pending",
    clientId: "",
    pageId: "",
    internalCampaignId: "",
    paymentNetworkId: "",
    dueDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((d) => setClients(d.clients ?? []));
    fetch("/api/admin/pages").then((r) => r.json()).then((d) => setPages(d.pages ?? []));
    fetch("/api/admin/internal-campaigns").then((r) => r.json()).then((d) => setCampaigns(d.campaigns ?? []));
    fetch("/api/admin/finances/networks").then((r) => r.json()).then((d) => setNetworks(d.networks ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/finances/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount) || 0,
          clientId: form.clientId || undefined,
          pageId: form.pageId || undefined,
          internalCampaignId: form.internalCampaignId || undefined,
          paymentNetworkId: form.paymentNetworkId || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to log payment");
      }
      router.push("/admin/finances");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>Log Payment</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Direction *</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value })}
            >
              <option value="in">In (received)</option>
              <option value="out">Out (paid)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Amount *</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Status</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["pending", "sent", "confirmed", "failed"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Client</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            >
              <option value="">None</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Campaign</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.internalCampaignId}
              onChange={(e) => setForm({ ...form, internalCampaignId: e.target.value })}
            >
              <option value="">None</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Page (if paying out)</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.pageId}
              onChange={(e) => setForm({ ...form, pageId: e.target.value })}
            >
              <option value="">None</option>
              {pages.map((p) => <option key={p.id} value={p.id}>@{p.handle}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Payment Network</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.paymentNetworkId}
              onChange={(e) => setForm({ ...form, paymentNetworkId: e.target.value })}
            >
              <option value="">None</option>
              {networks.map((n) => (
                <option key={n.id} value={n.id}>{n.platform} — {n.accountLabel}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Due Date</label>
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Notes</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "var(--error-text)" }}>{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "var(--accent)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Saving…" : "Log Payment"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: "var(--bg-secondary)", color: "var(--card-foreground)" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
