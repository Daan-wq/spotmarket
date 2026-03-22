"use client";
import { useState } from "react";
import { updatePageSettings } from "./actions";
import type { SocialAccount } from "@prisma/client";

const NICHES = ["sports", "memes", "casino", "lifestyle", "crypto", "other"];

export function PageSettingsForm({ page }: { page: Pick<SocialAccount, "id" | "niche" | "displayLabel"> }) {
  const [niche, setNiche] = useState(page.niche ?? "");
  const [displayLabel, setDisplayLabel] = useState(page.displayLabel ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updatePageSettings(page.id, {
      niche: niche || undefined,
      displayLabel: displayLabel || undefined,
    });
    setSaving(false);
  }

  return (
    <div className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Label</label>
        <input
          type="text"
          value={displayLabel}
          onChange={e => setDisplayLabel(e.target.value)}
          placeholder="e.g. Main US Sports Page"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Niche</label>
        <select
          value={niche}
          onChange={e => setNiche(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— Select niche —</option>
          {NICHES.map(n => <option key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</option>)}
        </select>
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
