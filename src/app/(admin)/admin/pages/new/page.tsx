"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a" };

export default function NewPagePage() {
  const router = useRouter();
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
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pages", {
        method: "POST",
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
        throw new Error(data.error ?? "Failed to create page");
      }
      router.push("/admin/pages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-8" style={{ color: "#0f172a" }}>Add Instagram Page</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Handle *</label>
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
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Niche</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. fitness, casino, lifestyle"
              value={form.niche}
              onChange={(e) => setForm({ ...form, niche: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Followers</label>
            <input
              type="number"
              className={inputClass}
              style={inputStyle}
              placeholder="500000"
              value={form.followerCount}
              onChange={(e) => setForm({ ...form, followerCount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Engagement %</label>
            <input
              type="number"
              step="0.1"
              className={inputClass}
              style={inputStyle}
              placeholder="3.5"
              value={form.avgEngagementRate}
              onChange={(e) => setForm({ ...form, avgEngagementRate: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Avg CPM ($)</label>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              style={inputStyle}
              placeholder="3.00"
              value={form.avgCpm}
              onChange={(e) => setForm({ ...form, avgCpm: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>
              Reliability Score (1-10)
            </label>
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
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Country</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="NL"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Contact via</label>
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
            <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Handle / Number</label>
            <input
              className={inputClass}
              style={inputStyle}
              placeholder="@username or +316..."
              value={form.communicationHandle}
              onChange={(e) => setForm({ ...form, communicationHandle: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Contact Name</label>
          <input
            className={inputClass}
            style={inputStyle}
            value={form.contactName}
            onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "#374151" }}>Notes</label>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        {error && <p className="text-sm" style={{ color: "#b91c1c" }}>{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "#4f46e5", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Saving…" : "Add Page"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#f3f4f6", color: "#374151" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
