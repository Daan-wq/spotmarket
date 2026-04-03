"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" };

export default function EditClientPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    company: "",
    communicationChannel: "whatsapp",
    communicationHandle: "",
    country: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/clients/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const c = data.client;
        if (c) {
          setForm({
            name: c.name ?? "",
            contactName: c.contactName ?? "",
            email: c.email ?? "",
            phone: c.phone ?? "",
            company: c.company ?? "",
            communicationChannel: c.communicationChannel ?? "whatsapp",
            communicationHandle: c.communicationHandle ?? "",
            country: c.country ?? "",
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
      const res = await fetch(`/api/admin/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update client");
      }
      router.push(`/admin/clients/${id}`);
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
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>Edit Client</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Name *</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Company</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Contact Name</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
            <input
              type="email"
              className={inputClass}
              style={inputStyle}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Phone</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Country</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Communication Channel</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.communicationChannel}
              onChange={(e) => setForm({ ...form, communicationChannel: e.target.value })}
            >
              {["whatsapp", "telegram", "instagram", "email", "signal"].map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Handle / Number</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="+31612345678 or @username"
              value={form.communicationHandle}
              onChange={(e) => setForm({ ...form, communicationHandle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Notes</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
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
