"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NetworkOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    website: "",
    description: "",
    networkSize: "",
    inviteCode: "",
    walletAddress: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName,
        contactName: form.contactName,
        website: form.website || undefined,
        description: form.description || undefined,
        networkSize: form.networkSize ? parseInt(form.networkSize) : undefined,
        inviteCode: form.inviteCode.toLowerCase().replace(/\s+/g, "-"),
        walletAddress: form.walletAddress || undefined,
      }),
    });

    if (res.ok) {
      router.push("/network/dashboard");
    } else {
      const d = await res.json() as { error?: string };
      setError(d.error ?? "Something went wrong");
      setLoading(false);
    }
  }

  function setField(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Set up your network</h1>
        <p className="text-gray-500 text-sm mb-6">
          You&apos;ll be reviewed by our team before going live.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company / network name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={setField("companyName")}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={setField("contactName")}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={setField("website")}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invite code <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
              <span className="bg-gray-50 px-3 py-2 text-sm text-gray-400 border-r border-gray-300">
                /join/
              </span>
              <input
                type="text"
                value={form.inviteCode}
                onChange={setField("inviteCode")}
                required
                placeholder="clippingculture"
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, hyphens only"
                className="flex-1 px-3 py-2 text-sm outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, hyphens only</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estimated creator count
            </label>
            <input
              type="number"
              value={form.networkSize}
              onChange={setField("networkSize")}
              min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={setField("description")}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crypto wallet address (optional)
            </label>
            <input
              type="text"
              value={form.walletAddress}
              onChange={setField("walletAddress")}
              placeholder="0x..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {loading ? "Submitting..." : "Apply to join"}
          </button>
        </form>
      </div>
    </div>
  );
}
