"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type VerifyPlatform = "instagram" | "tiktok" | "facebook";

const COPY: Record<VerifyPlatform, { handleLabel: string; handleHint: string; bioLocation: string }> = {
  instagram: {
    handleLabel: "Instagram Username",
    handleHint: "Enter your Instagram username (without @)",
    bioLocation: "your Instagram bio",
  },
  tiktok: {
    handleLabel: "TikTok Username",
    handleHint: "Enter your TikTok username (without @)",
    bioLocation: "your TikTok bio",
  },
  facebook: {
    handleLabel: "Facebook Page Handle",
    handleHint: "Enter the part after facebook.com/ (e.g. for facebook.com/myclips, enter \"myclips\")",
    bioLocation: "your Facebook Page bio (the 'About' section)",
  },
};

interface VerifyFormProps {
  platform: VerifyPlatform;
  // creatorProfileId is kept for backwards-compat with existing callers; not used here.
  creatorProfileId?: string;
}

export function VerifyForm({ platform }: VerifyFormProps) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const copy = COPY[platform];

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/bio-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start verification");
        return;
      }
      setCode(data.code);
      setStatus(`Add this code to ${copy.bioLocation}, then click "Check Verification".`);
    } catch (err) {
      setError("Network error — please try again");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheck() {
    if (!username) {
      setError(`Please enter ${copy.handleLabel.toLowerCase()}`);
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/bio-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Check failed");
        return;
      }
      if (data.verified) {
        setStatus("✓ Verification successful! Redirecting to your pages...");
        setTimeout(() => router.push("/creator/pages"), 800);
      } else {
        setError(data.error || `Code not detected in ${copy.bioLocation}. Make sure your account is public and the code is saved.`);
      }
    } catch (err) {
      setError("Network error — please try again");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-lg p-6 border space-y-6"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
    >
      {error && (
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--error-bg)", color: "var(--error-text)" }}
        >
          {error}
        </div>
      )}

      {status && (
        <div
          className="p-4 rounded-lg"
          style={{ background: "var(--success-bg)", color: "var(--success-text)" }}
        >
          {status}
        </div>
      )}

      <form onSubmit={handleStart} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
            {copy.handleLabel}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your_handle"
            required
            className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{
              background: "var(--bg-primary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
          <p style={{ color: "var(--text-secondary)" }} className="text-xs mt-2">
            {copy.handleHint}
          </p>
        </div>

        {code && (
          <div className="p-4 rounded-lg" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
              Your verification code:
            </p>
            <p className="text-xl font-mono font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
              {code}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-secondary)" }}>
              Paste this anywhere in {copy.bioLocation}, then click "Check Verification".
            </p>
          </div>
        )}

        <div className="rounded-lg p-4" style={{ background: "rgba(99, 102, 241, 0.06)" }}>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm">
            <strong>How to verify:</strong>
          </p>
          <ol style={{ color: "var(--text-secondary)" }} className="text-sm space-y-1 mt-2 ml-4 list-decimal">
            <li>Enter your handle above</li>
            <li>Click "Start Verification" to get a code</li>
            <li>Add the code to {copy.bioLocation}</li>
            <li>Save your bio</li>
            <li>Click "Check Verification"</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || !username}
            className="flex-1 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
            style={{ background: "var(--primary)", color: "#fff" }}
          >
            {loading ? "Processing..." : code ? "Regenerate Code" : "Start Verification"}
          </button>
          <button
            type="button"
            onClick={handleCheck}
            disabled={loading || !username}
            className="flex-1 py-3 rounded-lg font-medium transition-all border"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          >
            {loading ? "Checking..." : "Check Verification"}
          </button>
        </div>
      </form>
    </div>
  );
}
