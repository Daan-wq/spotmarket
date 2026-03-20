"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface SocialAccount {
  id: string;
  platform: string;
  platformUsername: string;
}

export function SubmitPostForm({
  campaignId,
  applicationId,
  socialAccounts,
}: {
  campaignId: string;
  applicationId: string;
  socialAccounts: SocialAccount[];
}) {
  const router = useRouter();
  const [postUrl, setPostUrl] = useState("");
  const [socialAccountId, setSocialAccountId] = useState(socialAccounts[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(
      `/api/campaigns/${campaignId}/applications/${applicationId}/posts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl, socialAccountId }),
      }
    );

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    setPostUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {socialAccounts.length > 1 && (
        <select
          value={socialAccountId}
          onChange={(e) => setSocialAccountId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {socialAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              @{a.platformUsername} ({a.platform})
            </option>
          ))}
        </select>
      )}

      <input
        type="url"
        value={postUrl}
        onChange={(e) => setPostUrl(e.target.value)}
        placeholder="https://www.instagram.com/p/..."
        required
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading || !postUrl}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Submitting..." : "Submit Post"}
      </button>
    </form>
  );
}
