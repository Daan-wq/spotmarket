"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateReportButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleGenerate() {
    setLoading(true);
    await fetch(`/api/campaigns/${campaignId}/report`, { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
    >
      {loading ? "Generating..." : "Generate Report"}
    </button>
  );
}
