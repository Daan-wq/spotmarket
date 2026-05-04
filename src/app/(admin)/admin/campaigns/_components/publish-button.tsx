"use client";

import { useState } from "react";
import { toast } from "sonner";

export function PublishButton({ campaignId }: { campaignId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handlePublish() {
    if (state !== "idle") return;
    setState("loading");
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/publish`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to post to Discord");
        setState("idle");
        return;
      }
      setState("done");
      toast.success("Posted to Discord");
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      console.error("[PublishButton]", err);
      toast.error("Network error");
      setState("idle");
    }
  }

  const label =
    state === "loading" ? "Posting…" :
    state === "done"    ? "✓ Posted" :
    "Post to Discord";

  const bg =
    state === "done" ? "var(--success-bg)" : "var(--accent, #534AB7)";

  const color =
    state === "done" ? "var(--success-text)" : "#fff";

  return (
    <button
      onClick={handlePublish}
      disabled={state !== "idle"}
      style={{
        background: bg,
        color,
        border: "none",
        borderRadius: "6px",
        padding: "4px 10px",
        fontSize: "12px",
        fontWeight: 500,
        cursor: state === "idle" ? "pointer" : "default",
        opacity: state === "loading" ? 0.7 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
