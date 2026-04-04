"use client";

import { useState } from "react";

export function PublishButton({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handlePublish() {
    setState("loading");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/publish`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed");
      }
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      console.error("[PublishButton]", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const label =
    state === "loading" ? "Posting…" :
    state === "done"    ? "✓ Posted" :
    state === "error"   ? "✗ Error"  :
    "Post to Discord";

  const bg =
    state === "done"    ? "var(--success-bg)"  :
    state === "error"   ? "var(--error-bg, #fecaca)"    :
    "var(--accent, #534AB7)";

  const color =
    state === "done"    ? "var(--success-text)" :
    state === "error"   ? "var(--error-text, #dc2626)"  :
    "#fff";

  return (
    <button
      onClick={handlePublish}
      disabled={state === "loading" || state === "done"}
      style={{
        background: bg,
        color,
        border: "none",
        borderRadius: "6px",
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: 500,
        cursor: state === "loading" || state === "done" ? "default" : "pointer",
        opacity: state === "loading" ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
