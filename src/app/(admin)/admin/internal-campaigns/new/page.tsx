"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" };

interface Client { id: string; name: string }
interface Page { id: string; handle: string; followerCount: number; avgCpm: number }
interface SelectedPage { pageId: string; handle: string; cost: string }

export default function NewInternalCampaignPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPages, setSelectedPages] = useState<SelectedPage[]>([]);
  const [form, setForm] = useState({
    clientId: "",
    name: "",
    clientPays: "",
    adContentUrl: "",
    adCaption: "",
    adLink: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/clients").then((r) => r.json()).then((d) => setClients(d.clients ?? []));
    fetch("/api/admin/pages").then((r) => r.json()).then((d) => setPages(d.pages ?? []));
  }, []);

  const totalCost = selectedPages.reduce((sum, p) => sum + (parseFloat(p.cost) || 0), 0);
  const margin = (parseFloat(form.clientPays) || 0) - totalCost;

  function addPage(page: Page) {
    if (selectedPages.find((p) => p.pageId === page.id)) return;
    setSelectedPages([...selectedPages, {
      pageId: page.id,
      handle: page.handle,
      cost: Number(page.avgCpm).toFixed(2),
    }]);
  }

  function removePage(pageId: string) {
    setSelectedPages(selectedPages.filter((p) => p.pageId !== pageId));
  }

  function updatePageCost(pageId: string, cost: string) {
    setSelectedPages(selectedPages.map((p) => p.pageId === pageId ? { ...p, cost } : p));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/internal-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientPays: parseFloat(form.clientPays) || 0,
          pages: selectedPages.map((p) => ({ pageId: p.pageId, cost: parseFloat(p.cost) || 0 })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create campaign");
      }
      router.push("/admin/internal-campaigns");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>New Internal Campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Client *</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              required
            >
              <option value="">Select client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Campaign Name *</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. Casino Promo March"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Client Pays ($) *</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              placeholder="500.00"
              value={form.clientPays}
              onChange={(e) => setForm({ ...form, clientPays: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Ad Link</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="https://…"
              value={form.adLink}
              onChange={(e) => setForm({ ...form, adLink: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Start Date</label>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>End Date</label>
            <input
              type="date"
              className={inputClass}
              style={inputStyle}
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Ad Content URL</label>
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Drive link, Dropbox, etc."
            value={form.adContentUrl}
            onChange={(e) => setForm({ ...form, adContentUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Ad Caption</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            placeholder="Caption for the posts…"
            value={form.adCaption}
            onChange={(e) => setForm({ ...form, adCaption: e.target.value })}
          />
        </div>

        {/* Page selection */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: "var(--card-foreground)" }}>Instagram Pages</label>
          <div className="rounded-lg overflow-hidden mb-2" style={{ border: "1px solid var(--border)", maxHeight: 200, overflowY: "auto" }}>
            {pages.map((page, i) => {
              const isSelected = selectedPages.some((p) => p.pageId === page.id);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => isSelected ? removePage(page.id) : addPage(page)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{
                    borderTop: i > 0 ? "1px solid var(--bg-primary)" : undefined,
                    background: isSelected ? "var(--success-bg)" : "var(--bg-elevated)",
                  }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>@{page.handle}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {(page.followerCount / 1000).toFixed(0)}K · avg CPM ${Number(page.avgCpm).toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={isSelected ? { background: "var(--success)", color: "var(--success-bg)" } : { background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                  >
                    {isSelected ? "Added" : "+ Add"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected pages with costs */}
          {selectedPages.length > 0 && (
            <div className="space-y-2">
              {selectedPages.map((p) => (
                <div key={p.pageId} className="flex items-center gap-3">
                  <p className="text-sm flex-1" style={{ color: "var(--text-primary)" }}>@{p.handle}</p>
                  <div className="w-28">
                    <input
                      type="number"
                      step="0.01"
                      className={inputClass}
                      style={{ ...inputStyle, paddingTop: 6, paddingBottom: 6 }}
                      value={p.cost}
                      onChange={(e) => updatePageCost(p.pageId, e.target.value)}
                      placeholder="Cost"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removePage(p.pageId)}
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2" style={{ borderTopColor: 'var(--border)', borderTopWidth: '1px' }}>
                <p className="text-xs font-medium" style={{ color: "var(--card-foreground)" }}>
                  Total cost: <span style={{ color: "var(--text-primary)" }}>${totalCost.toFixed(2)}</span>
                </p>
                <p className="text-xs font-medium" style={{ color: "var(--card-foreground)" }}>
                  Margin:{" "}
                  <span style={{ color: margin >= 0 ? "var(--success)" : "var(--error-text)", fontWeight: 600 }}>
                    ${margin.toFixed(2)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Notes</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
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
            {loading ? "Creating…" : "Create Campaign"}
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
