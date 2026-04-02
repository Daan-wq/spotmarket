"use client";

import { useEffect, useState } from "react";

interface Collection {
  id: string;
  name: string;
  color: string | null;
  queuedCount: number;
}

export function OverviewDashboard() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const res = await fetch("/api/collections");
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchCollections();
  }, []);

  const getQueueStatus = (count: number): { color: string; text: string } => {
    if (count === 0) return { color: "#ef4444", text: "Empty" };
    if (count < 7) return { color: "#f59e0b", text: "Low" };
    return { color: "#22c55e", text: "Good" };
  };

  const estimateDays = (count: number): string => {
    return `~${Math.ceil(count / 3 * 7)} days at 3/week`;
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "24px" }}>
        Overview
      </h1>

      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
          Collection Health
        </h2>

        {loading ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading collections...</p>
        ) : collections.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No collections yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {collections.map(collection => {
              const status = getQueueStatus(collection.queuedCount);
              return (
                <div
                  key={collection.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                  }}
                >
                  {collection.color && (
                    <div
                      style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "2px",
                        background: collection.color,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px" }}>
                      {collection.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                      {collection.queuedCount} queued • {estimateDays(collection.queuedCount)}
                    </div>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: status.color }}>
                    {collection.queuedCount === 0 ? "Empty" : status.text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        disabled
        style={{
          width: "100%",
          padding: "12px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "not-allowed",
          opacity: 0.5,
        }}
      >
        Post Now — Coming soon
      </button>
    </div>
  );
}
