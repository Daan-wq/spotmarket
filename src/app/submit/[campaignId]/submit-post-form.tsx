"use client";

import { useState } from "react";

interface Props {
  campaign: { id: string; name: string; deadline: Date };
}

export function SubmitPostForm({ campaign }: Props) {
  const [igUsername, setIgUsername] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch(`/api/submit/${campaign.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ igUsername, postUrl }),
    });
    if (res.ok) {
      setStatus("success");
    } else {
      const d = await res.json() as { error?: string };
      setErrorMsg(d.error ?? "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold">Post submitted!</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your post is being reviewed. You&apos;ll earn once it&apos;s approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-bold mb-1">{campaign.name}</h1>
        <p className="text-sm text-gray-400 mb-6">Submit your post for this campaign</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram username
            </label>
            <input
              type="text"
              value={igUsername}
              onChange={(e) => setIgUsername(e.target.value.replace("@", ""))}
              placeholder="yourhandle"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Post URL</label>
            <input
              type="url"
              value={postUrl}
              onChange={(e) => setPostUrl(e.target.value)}
              placeholder="https://instagram.com/p/..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          {status === "error" && <p className="text-red-500 text-sm">{errorMsg}</p>}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium disabled:opacity-50"
          >
            {status === "loading" ? "Submitting..." : "Submit Post"}
          </button>
        </form>
      </div>
    </div>
  );
}
