"use client";

import { useState } from "react";

export function PrivacyForm({ initialPublic }: { initialPublic: boolean }) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle(value: boolean) {
    setIsPublic(value);
    setLoading(true);
    setSaved(false);
    await fetch("/api/settings/privacy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profilePublic: value }),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Privacy</h2>
      <p className="text-sm text-gray-500 mb-4">Control who can see your profile and activity.</p>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Public profile</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isPublic
              ? "Your profile is visible to everyone."
              : "Your profile is private — only you can see it."}
          </p>
        </div>
        <button
          onClick={() => toggle(!isPublic)}
          disabled={loading}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
          style={{ background: isPublic ? "#4f46e5" : "#d1d5db" }}
          aria-checked={isPublic}
          role="switch"
        >
          <span
            className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
            style={{ transform: isPublic ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
      </div>

      {saved && <p className="text-xs text-green-600 mt-2">Saved.</p>}
    </div>
  );
}
