"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-primary)" };

export default function EditPagePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState({
    handle: "",
    niche: "",
    followerCount: "",
    avgEngagementRate: "",
    avgCpm: "",
    reliabilityScore: "7",
    communicationChannel: "instagram",
    communicationHandle: "",
    contactName: "",
    country: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/pages/${id}`)
      .then((r) => r.json())
      .then((data) => {
        const p = data.page;
        if (p) {
          setForm({
            handle: p.handle ?? "",
            niche: p.niche ?? "",
            followerCount: String(p.followerCount ?? ""),
            avgEngagementRate: String(p.avgEngagementRate ?? ""),
            avgCpm: String(p.avgCpm ?? ""),
            reliabilityScore: String(p.reliabilityScore ?? "7"),
            communicationChannel: p.communicationChannel ?? "instagram",
            communicationHandle: p.communicationHandle ?? "",
            contactName: p.contactName ?? "",
            country: p.country ?? "",
            notes: p.notes ?? "",
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
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          followerCount: parseInt(form.followerCount) || 0,
          avgEngagementRate: parseFloat(form.avgEngagementRate) || 0,
          avgCpm: parseFloat(form.avgCpm) || 0,
          reliabilityScore: parseInt(form.reliabilityScore) || 7,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update page");
      }
      router.push(`/admin/ops-pages/${id}`);
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
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "var(--text-primary)" }}>Edit Page</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Handle *</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="@username"
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value.replace("@", "") })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Niche</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. fitness, casino"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Followers</label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              value={form.followerCount}
              onChange={(e) => setForm({ ...form, followerCount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Engagement %</label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              style={inputStyle}
              value={form.avgEngagementRate}
              onChange={(e) => setForm({ ...form, avgEngagementRate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Avg CPM ($)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              value={form.avgCpm}
              onChange={(e) => setForm({ ...form, avgCpm: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Reliability Score (1-10)</label>
            <input
              type="number"
              min="1"
              max="10"
              className={inputClass}
              style={inputStyle}
              value={form.reliabilityScore}
              onChange={(e) => setForm({ ...form, reliabilityScore: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Country</label>
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
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Contact via</label>
            <select
              className={inputClass}
              style={inputStyle}
              value={form.communicationChannel}
              onChange={(e) => setForm({ ...form, communicationChannel: e.target.value })}
            >
              {["instagram", "whatsapp", "telegram", "email"].map((ch) => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Handle / Number</label>
            <input
              className={inputClass}
              style={inputStyle}
              value={form.communicationHandle}
              onChange={(e) => setForm({ ...form, communicationHandle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Contact Name</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--card-foreground)" }}>Notes</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}

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
