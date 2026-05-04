"use client";

import { useState } from "react";
import { removeTikTokPage } from "../actions";

export function RemoveTikTokPageButton({ connectionId }: { connectionId: string }) {
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Remove this TikTok account?")) return;
    setLoading(true);
    try {
      await removeTikTokPage(connectionId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-xs px-2 py-1 rounded font-medium transition-opacity disabled:opacity-50"
      style={{ color: "var(--error-text)", background: "var(--error-bg)" }}
    >
      {loading ? "Removing..." : "Remove"}
    </button>
  );
}
