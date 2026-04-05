"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";

export default function SubmitPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [formData, setFormData] = useState({
    postUrl: "",
    screenshotUrl: "",
    claimedViews: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const claimedViews = parseInt(formData.claimedViews, 10);
      if (isNaN(claimedViews) || claimedViews < 0) {
        setError("Please enter a valid number of views");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          postUrl: formData.postUrl || null,
          screenshotUrl: formData.screenshotUrl,
          claimedViews,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit");
        return;
      }

      router.push(`/creator/applications/${applicationId}`);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        Submit Views
      </h1>

      <div
        className="rounded-lg p-6 border"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="p-4 rounded-lg"
              style={{
                background: "var(--error-bg)",
                color: "var(--error-text)",
              }}
            >
              {error}
            </div>
          )}

          {/* Post URL */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Post URL (Optional)
            </label>
            <input
              type="url"
              name="postUrl"
              value={formData.postUrl}
              onChange={handleChange}
              placeholder="https://instagram.com/p/..."
              className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Screenshot URL */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Screenshot URL
            </label>
            <input
              type="url"
              name="screenshotUrl"
              value={formData.screenshotUrl}
              onChange={handleChange}
              placeholder="https://example.com/screenshot.png"
              required
              className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p style={{ color: "var(--text-secondary)" }} className="text-xs mt-2">
              Provide a URL to your screenshot showing the views count
            </p>
          </div>

          {/* Claimed Views */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Claimed Views
            </label>
            <input
              type="number"
              name="claimedViews"
              value={formData.claimedViews}
              onChange={handleChange}
              placeholder="0"
              required
              min="0"
              className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                background: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
              style={{
                background: "var(--primary)",
                color: "#fff",
              }}
            >
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 rounded-lg font-medium transition-all border"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
