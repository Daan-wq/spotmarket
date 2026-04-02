"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" };

const STATUSES = ["draft", "confirmed", "scheduled", "live", "completed", "cancelled"];

export default function EditInternalCampaignPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    name: "",
    status: "draft",
    clientPays: "",
    adContentUrl: "",
    adCaption: "",
    adLink: "",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/internal-campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const c = data.campaign;
        if (c) {
          setForm({
            name: c.name ?? "",
            status: c.status ?? "draft",
            clientPays: String(c.clientPays ?? ""),
            adContentUrl: c.adContentUrl ?? "",
            adCaption: c.adCaption ?? "",
            adLink: c.adLink ?? "",
            startDate: c.startDate ? c.startDate.slice(0, 10) : "",
            endDate: c.endDate ? c.endDate.slice(0, 10) : "",
            notes: c.notes ?? "",
          });
        }
        setFetching(false);
      });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/internal-campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          clientPays: parseFloat(form.clientPays) || 0,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update campaign");
      }
      router.push(`/admin/internal-campaigns/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <div className="p-8"><p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p></div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>Edit Campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Campaign Name *</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Status</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
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
            value={form.adContentUrl}
            onChange={(e) => setForm({ ...form, adContentUrl: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Ad Caption</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={form.adCaption}
            onChange={(e) => setForm({ ...form, adCaption: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Notes</label>
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
            {loading ? "Saving…" : "Save Changes"}
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
