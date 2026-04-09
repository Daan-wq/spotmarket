"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyForm({ creatorProfileId }: { creatorProfileId: string }) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/bio-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          igUsername: username,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to verify");
        return;
      }

      const data = await res.json();
      setStatus(`Add this code to your Instagram bio: ${data.code}`);
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!username) {
      setError("Please enter your Instagram username");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const res = await fetch("/api/bio-verification/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igUsername: username }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Check failed");
        return;
      }

      const data = await res.json();
      if (data.verified) {
        setStatus("✓ Verification successful! Redirecting to your pages...");
        setTimeout(() => router.push("/creator/pages"), 1000);
      } else {
        setStatus("Verification not detected yet. Please make sure the code is in your bio.");
      }
    } catch (err) {
      setError("An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="rounded-lg p-6 border space-y-6"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
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

      {status && (
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--success-bg)",
            color: "var(--success-text)",
          }}
        >
          {status}
        </div>
      )}

      <div>
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Instagram Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your_username"
          className="w-full px-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
          style={{
            background: "var(--bg-primary)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <p style={{ color: "var(--text-secondary)" }} className="text-xs mt-2">
          Enter your Instagram username (without @)
        </p>
      </div>

      <div className="bg-opacity-30 p-4 rounded-lg" style={{ background: "rgba(99, 102, 241, 0.1)" }}>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm">
          <strong>How to verify:</strong>
        </p>
        <ol style={{ color: "var(--text-secondary)" }} className="text-sm space-y-1 mt-2 ml-4 list-decimal">
          <li>Enter your Instagram username above</li>
          <li>Click &quot;Start Verification&quot;</li>
          <li>We&apos;ll give you a code to add to your bio</li>
          <li>Add the code to your Instagram bio</li>
          <li>Click &quot;Check Verification&quot;</li>
        </ol>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={loading || !username}
          className="flex-1 py-3 rounded-lg font-medium transition-all disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "#fff",
          }}
        >
          {loading ? "Processing..." : "Start Verification"}
        </button>
        <button
          onClick={handleCheck}
          disabled={loading || !username}
          className="flex-1 py-3 rounded-lg font-medium transition-all border"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
        >
          {loading ? "Checking..." : "Check Verification"}
        </button>
      </div>
    </div>
  );
}
