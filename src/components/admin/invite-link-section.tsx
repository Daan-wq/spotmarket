"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface InviteLink {
  id: string;
  token: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export function InviteLinkSection({
  campaignId,
  initialLinks,
}: {
  campaignId: string;
  initialLinks: InviteLink[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function generateLink() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxUses: maxUses ? Number(maxUses) : undefined,
          expiresInDays: expiresInDays === "0" ? undefined : Number(expiresInDays),
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setMaxUses("");
        router.refresh();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function deleteLink(linkId: string) {
    await fetch(`/api/admin/campaigns/${campaignId}/invite-link`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    });
    router.refresh();
  }

  function copyLink(token: string) {
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(`${appUrl}/join/invite/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mb-8 rounded-xl" style={{ border: "1px solid var(--border)", background: "var(--bg-elevated)" }}>
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Invite Links</p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {showForm ? "Cancel" : "+ Generate Link"}
        </button>
      </div>

      {showForm && (
        <div className="px-5 py-4 flex gap-3 items-end" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Max uses</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="px-2 py-1.5 rounded text-xs w-24"
              style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Expires</label>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className="px-2 py-1.5 rounded text-xs cursor-pointer"
              style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="0">Never</option>
            </select>
          </div>
          <button
            onClick={generateLink}
            disabled={generating}
            className="px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-50 cursor-pointer"
            style={{ background: "var(--accent)" }}
          >
            {generating ? "..." : "Generate"}
          </button>
        </div>
      )}

      {initialLinks.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>No invite links yet. Generate one to share with creators.</p>
        </div>
      ) : (
        <div>
          {initialLinks.map((link, i) => {
            const isExpired = link.expiresAt && new Date(link.expiresAt) < new Date();
            const isMaxed = link.maxUses !== null && link.usesCount >= link.maxUses;
            return (
              <div
                key={link.id}
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                <div className="flex items-center gap-3">
                  <code className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                    ...{link.token.slice(-8)}
                  </code>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {link.usesCount}/{link.maxUses ?? "\u221e"} uses
                  </span>
                  {link.expiresAt && (
                    <span className="text-xs" style={{ color: isExpired ? "var(--error-text)" : "var(--text-muted)" }}>
                      {isExpired ? "Expired" : `Expires ${new Date(link.expiresAt).toLocaleDateString()}`}
                    </span>
                  )}
                  {isMaxed && <span className="text-xs" style={{ color: "var(--warning-text)" }}>Max reached</span>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(link.token)}
                    className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                  >
                    {copied === link.token ? "Copied!" : "Copy"}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="text-xs px-2 py-1 rounded cursor-pointer"
                    style={{ color: "var(--error-text)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
