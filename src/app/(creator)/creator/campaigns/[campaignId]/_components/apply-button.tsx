"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApplyButton({
  campaignId,
  canApply,
}: {
  campaignId: string;
  canApply: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleApply = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/campaigns/${campaignId}/applications`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to apply");
        return;
      }

      router.push("/creator/applications");
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            background: "var(--error-bg)",
            color: "var(--error-text)",
          }}
        >
          {error}
        </div>
      )}
      <button
        onClick={handleApply}
        disabled={!canApply || loading}
        className="w-full py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: canApply ? "var(--primary)" : "var(--sidebar-hover-bg)",
          color: "#fff",
        }}
      >
        {loading ? "Applying..." : canApply ? "Apply Now" : "Cannot Apply"}
      </button>
    </div>
  );
}
